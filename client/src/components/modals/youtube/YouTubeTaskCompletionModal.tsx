import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import {
  Youtube,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Heart,
  UserPlus,
  Share2,
  MessageSquare,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface YouTubeTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
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

  const settings = task.customSettings as any;
  const taskType = task.taskType as string;

  // Check if user has connected YouTube OAuth
  const checkYouTubeConnection = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/youtube/status');
      const data = await response.json();
      setNeedsOAuth(!data.connected);
      return data.connected;
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
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });

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
  const handleConnectYouTube = () => {
    window.open('/api/auth/youtube/connect', '_blank');
    // Poll for connection status
    const pollInterval = setInterval(async () => {
      const connected = await checkYouTubeConnection();
      if (connected) {
        clearInterval(pollInterval);
        toast({
          title: "YouTube Connected!",
          description: "You can now verify YouTube tasks automatically",
        });
      }
    }, 2000);
  };

  // Get task-specific instructions and UI
  const getTaskContent = () => {
    const videoUrl = settings?.videoUrl || settings?.contentUrl;
    const channelUrl = settings?.channelUrl;
    const channelName = settings?.channelName;
    const requiredText = settings?.requiredText;

    switch (taskType) {
      case 'youtube_subscribe':
        return {
          icon: <UserPlus className="w-6 h-6 text-red-500" />,
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
          icon: <Heart className="w-6 h-6 text-red-500" />,
          title: "Like Video",
          description: "Like the specified video to earn points",
          targetUrl: videoUrl,
          actionText: "Open Video",
          supportsOAuth: true,
        };

      case 'youtube_comment':
        return {
          icon: <MessageSquare className="w-6 h-6 text-red-500" />,
          title: "Comment on Video",
          description: "Leave a comment on the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video",
          supportsOAuth: true,
          requiresComment: true,
          requiredText,
        };

      case 'youtube_share':
        return {
          icon: <Share2 className="w-6 h-6 text-red-500" />,
          title: "Share Video",
          description: "Share the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video",
          supportsOAuth: false,
        };

      default:
        return {
          icon: <Youtube className="w-6 h-6 text-red-500" />,
          title: "Complete YouTube Task",
          description: task.description || "Complete the required YouTube action",
          targetUrl: videoUrl || channelUrl,
          actionText: "Open YouTube",
          supportsOAuth: false,
        };
    }
  };

  const content = getTaskContent();

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-2">
          {content.icon}
          <DialogTitle>{content.title}</DialogTitle>
        </div>
        <DialogDescription>{content.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* OAuth Connection (if needed) */}
        {content.supportsOAuth && (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                Connect your YouTube account for instant verification
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleConnectYouTube}
              variant="outline"
              className="w-full"
            >
              <Youtube className="w-4 h-4 mr-2" />
              Connect YouTube Account
            </Button>
          </div>
        )}

        {/* Step 1: Go to YouTube */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Step 1: Complete the action</h4>
          {content.targetUrl && (
            <Button
              onClick={() => window.open(content.targetUrl!, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {content.actionText}
            </Button>
          )}

          {content.requiresComment && content.requiredText && (
            <div className="space-y-2">
              <Label>Suggested Comment:</Label>
              <Textarea
                value={content.requiredText}
                readOnly
                rows={2}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You can customize this or use your own comment
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Verify */}
        {content.supportsOAuth ? (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Step 2: Verify</h4>
            <Alert>
              <AlertDescription>
                {needsOAuth
                  ? "Connect YouTube account above for automatic verification"
                  : "Click 'Verify Task' below after completing the action"}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Step 2: Provide proof</h4>
            <div className="space-y-2">
              <Label>Proof URL (optional):</Label>
              <Input
                placeholder="Paste your share link or screenshot URL"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Points Reward Display */}
        <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reward:</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              +{task.pointsToReward || 0} points
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="flex-1"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify Task
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
