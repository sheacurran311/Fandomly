import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { socialManager } from "@/lib/social-integrations";
import type { Task } from "@shared/schema";
import {
  Youtube,
  ExternalLink,
  CheckCircle2,
  Heart,
  UserPlus,
  Share2,
  MessageSquare,
} from "lucide-react";
import TaskCompletionModalLayout, {
  ConnectionStatusBanner,
  ModalHint,
  ProofSection,
} from "../TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface YouTubeTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
}

export default function YouTubeTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: YouTubeTaskCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");
  const [commentText, setCommentText] = useState("");
  const [needsOAuth, setNeedsOAuth] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const settings = task.customSettings as any;
  const taskType = task.taskType as string;

  // Check if user has connected YouTube
  useEffect(() => {
    checkYouTubeConnection();
  }, []);

  const checkYouTubeConnection = async () => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected } = await getSocialConnection('youtube');
      setNeedsOAuth(!connected);
      return connected;
    } catch {
      setNeedsOAuth(true);
      return false;
    }
  };

  // Submit task completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const endpoint = completionId
        ? `/api/task-completions/${completionId}/verify`
        : `/api/tasks/${task.id}/complete`;

      const response = await apiRequest('POST', endpoint, {
        platform: 'youtube',
        taskType: task.taskType,
        proofData: {
          url: proofUrl,
          comment: commentText,
        },
        targetData: settings,
      });

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

      toast({
        title: "Task Verified!",
        description: data.verified
          ? "Your task has been verified automatically"
          : "Your task is being reviewed",
      });

      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Handle YouTube OAuth connection
  const handleConnectYouTube = async () => {
    try {
      setIsConnecting(true);
      const youtubeAPI = socialManager['youtube'];
      const result = await youtubeAPI.secureLogin();

      if (result.success) {
        setNeedsOAuth(false);
        toast({
          title: "YouTube Connected!",
          description: result.channelName
            ? `Connected ${result.channelName}. You can now verify YouTube tasks automatically.`
            : "You can now verify YouTube tasks automatically",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect YouTube. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('YouTube connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "An error occurred while connecting YouTube.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Get task-specific content
  const getTaskContent = () => {
    const videoUrl = settings?.videoUrl || settings?.contentUrl;
    const channelUrl = settings?.channelUrl;
    const channelName = settings?.channelName;
    const requiredText = settings?.requiredText;

    switch (taskType) {
      case 'youtube_subscribe':
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: "Subscribe to Channel",
          description: channelName
            ? `Subscribe to ${channelName} to complete this task`
            : "Subscribe to the required YouTube channel",
          targetUrl: channelUrl,
          actionText: "Subscribe to Channel",
          supportsOAuth: true,
        };

      case 'youtube_like':
        return {
          icon: <Heart className="h-5 w-5" />,
          title: "Like Video",
          description: "Like the specified video to earn points",
          targetUrl: videoUrl,
          actionText: "Open Video to Like",
          supportsOAuth: true,
        };

      case 'youtube_comment':
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          title: "Comment on Video",
          description: "Leave a comment on the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video to Comment",
          supportsOAuth: true,
          requiresComment: true,
          requiredText,
        };

      case 'youtube_share':
        return {
          icon: <Share2 className="h-5 w-5" />,
          title: "Share Video",
          description: "Share the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video to Share",
          supportsOAuth: false,
        };

      default:
        return {
          icon: <Youtube className="h-5 w-5" />,
          title: "Complete YouTube Task",
          description: task.description || "Complete the required YouTube action",
          targetUrl: videoUrl || channelUrl,
          actionText: "Open YouTube",
          supportsOAuth: false,
        };
    }
  };

  const content = getTaskContent();
  const isYTConnected = !needsOAuth;

  const steps = content.supportsOAuth
    ? [{ label: "Connect" }, { label: "Action" }, { label: "Verify" }]
    : [{ label: "Action" }, { label: "Proof" }, { label: "Submit" }];

  const currentStep = content.supportsOAuth
    ? (isYTConnected ? 1 : 0)
    : 0;

  return (
    <TaskCompletionModalLayout
      platform="youtube"
      icon={content.icon}
      taskName={content.title}
      taskDescription={content.description}
      pointsReward={task.pointsToReward || 0}
      steps={steps}
      currentStep={currentStep}
      onCancel={onClose}
      onSubmit={() => submitMutation.mutate()}
      submitLabel="Verify Task"
      isSubmitting={submitMutation.isPending}
      canSubmit={true}
    >
      {/* OAuth Connection (if supported) */}
      {content.supportsOAuth && (
        <ConnectionStatusBanner
          isConnected={isYTConnected}
          isConnecting={isConnecting}
          onConnect={handleConnectYouTube}
          platformName="YouTube"
        />
      )}

      {/* Action Button */}
      {content.targetUrl && (
        <Button
          onClick={() => window.open(content.targetUrl!, '_blank')}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {content.actionText}
        </Button>
      )}

      {/* Comment Template (for comment tasks) */}
      {content.requiresComment && content.requiredText && (
        <ProofSection title="Suggested Comment">
          <Textarea
            value={content.requiredText}
            readOnly
            rows={2}
            className="bg-white/5 border-white/10 text-white/80 resize-none text-sm"
          />
          <p className="text-xs text-white/30">
            You can customize this or use your own comment
          </p>
        </ProofSection>
      )}

      {/* Proof URL (for non-OAuth tasks) */}
      {!content.supportsOAuth && (
        <ProofSection title="Your Proof">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Proof URL (optional)</Label>
            <Input
              placeholder="Paste your share link or screenshot URL"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </ProofSection>
      )}

      {/* Verification hint */}
      {content.supportsOAuth && (
        <ModalHint>
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {needsOAuth
              ? "Connect YouTube above for automatic verification, or complete the action and verify manually"
              : "Click \"Verify Task\" below after completing the action"}
          </span>
        </ModalHint>
      )}
    </TaskCompletionModalLayout>
  );
}
