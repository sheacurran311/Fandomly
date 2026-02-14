import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import {
  ExternalLink,
  CheckCircle2,
  Heart,
  Repeat2,
  MessageSquare,
  Hash,
  UserPlus,
  Copy,
  Check,
  Twitter,
} from "lucide-react";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import TaskCompletionModalLayout, {
  ConnectionStatusBanner,
  ModalHint,
  ProofSection,
} from "../TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface TwitterTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
}

export default function TwitterTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: TwitterTaskCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [copied, setCopied] = useState(false);

  const settings = task.customSettings as any;
  const taskType = task.taskType as string;

  // Twitter connection status
  const { isConnected, isConnecting, connect, userInfo } = useTwitterConnection();

  // Helper to format task type
  const formatTaskType = (type: string) => {
    return type
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Task';
  };

  // Submit task completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const endpoint = completionId
        ? `/api/task-completions/${completionId}/verify`
        : `/api/tasks/${task.id}/complete`;

      const response = await apiRequest('POST', endpoint, {
        platform: 'twitter',
        taskType: task.taskType,
        proofData: {
          url: proofUrl,
          text: proofText,
        },
        targetData: settings,
      });

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

      if (data.verified && data.success) {
        toast({
          title: "Task Completed!",
          description: `Congratulations! You earned ${data.pointsAwarded || task.pointsToReward || 0} points!`,
          duration: 5000,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Make sure you have completed the task using the applicable connected account. Please try again...",
          variant: "destructive",
          duration: 6000,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get task-specific content
  const getTaskContent = () => {
    const username = settings?.username || settings?.handle;
    const contentUrl = settings?.contentUrl || settings?.tweetUrl;
    const requiredText = settings?.requiredText;
    const hashtags = settings?.requiredHashtags || settings?.hashtags || [];

    switch (taskType) {
      case 'twitter_follow': {
        const profileUrl = username
          ? `https://twitter.com/${username.replace('@', '')}`
          : null;
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: "Follow on Twitter",
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : "Follow the required account on Twitter",
          actionUrl: profileUrl,
          actionLabel: `Follow @${username?.replace('@', '') || 'account'}`,
          requiresProof: false,
          steps: [
            { label: "Connect" },
            { label: "Follow" },
            { label: "Verify" },
          ],
          currentStep: isConnected ? 1 : 0,
        };
      }

      case 'twitter_like':
        return {
          icon: <Heart className="h-5 w-5" />,
          title: "Like Tweet",
          description: "Like the specified tweet to earn points",
          actionUrl: contentUrl,
          actionLabel: "Open Tweet to Like",
          requiresProof: false,
          steps: [
            { label: "Connect" },
            { label: "Like" },
            { label: "Verify" },
          ],
          currentStep: isConnected ? 1 : 0,
        };

      case 'twitter_retweet':
        return {
          icon: <Repeat2 className="h-5 w-5" />,
          title: "Retweet",
          description: "Retweet the specified post",
          actionUrl: contentUrl,
          actionLabel: "Open Tweet to Retweet",
          requiresProof: false,
          steps: [
            { label: "Connect" },
            { label: "Retweet" },
            { label: "Verify" },
          ],
          currentStep: isConnected ? 1 : 0,
        };

      case 'twitter_quote_tweet': {
        const quoteUrl = contentUrl
          ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(requiredText || '')}&url=${encodeURIComponent(contentUrl)}`
          : null;
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          title: "Quote Tweet",
          description: "Quote tweet with your own comment",
          actionUrl: quoteUrl,
          actionLabel: "Quote Tweet",
          requiresProof: true,
          requiredText,
          steps: [
            { label: "Tweet" },
            { label: "Proof" },
            { label: "Verify" },
          ],
          currentStep: 0,
        };
      }

      case 'twitter_mention':
      case 'twitter_include_name': {
        const mentionText = `@${username?.replace('@', '')} ${requiredText || ''}`.trim();
        const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(mentionText)}`;
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          title: "Mention on Twitter",
          description: `Create a tweet mentioning @${username?.replace('@', '')}`,
          actionUrl: tweetIntentUrl,
          actionLabel: "Tweet This",
          requiresProof: true,
          requiredText: mentionText,
          steps: [
            { label: "Tweet" },
            { label: "Proof" },
            { label: "Verify" },
          ],
          currentStep: 0,
        };
      }

      case 'twitter_hashtag_post': {
        const hashtagText = hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ');
        const hashtagTweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(hashtagText + (requiredText ? ' ' + requiredText : ''))}`;
        return {
          icon: <Hash className="h-5 w-5" />,
          title: "Tweet with Hashtags",
          description: "Create a tweet with the required hashtags",
          actionUrl: hashtagTweetUrl,
          actionLabel: "Tweet with Hashtags",
          requiresProof: true,
          hashtags,
          steps: [
            { label: "Tweet" },
            { label: "Proof" },
            { label: "Verify" },
          ],
          currentStep: 0,
        };
      }

      case 'twitter_include_bio':
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: "Update Twitter Bio",
          description: `Add "${requiredText}" to your Twitter bio`,
          actionUrl: 'https://twitter.com/settings/profile',
          actionLabel: "Edit Twitter Profile",
          requiresProof: false,
          requiredText,
          steps: [
            { label: "Connect" },
            { label: "Update" },
            { label: "Verify" },
          ],
          currentStep: isConnected ? 1 : 0,
        };

      default:
        return {
          icon: <Twitter className="h-5 w-5" />,
          title: "Complete Twitter Task",
          description: task.description || "Complete the required Twitter action",
          actionUrl: null,
          actionLabel: "Open Twitter",
          requiresProof: false,
          steps: [
            { label: "Action" },
            { label: "Verify" },
          ],
          currentStep: 0,
        };
    }
  };

  const content = getTaskContent();

  return (
    <TaskCompletionModalLayout
      platform="twitter"
      icon={content.icon}
      taskName={content.title}
      taskDescription={content.description}
      pointsReward={task.pointsToReward || 0}
      steps={content.steps}
      currentStep={content.currentStep}
      onCancel={onClose}
      onSubmit={() => submitMutation.mutate()}
      submitLabel="Verify Task"
      isSubmitting={submitMutation.isPending}
      canSubmit={!content.requiresProof || !!proofUrl}
    >
      {/* Connection Status */}
      <ConnectionStatusBanner
        isConnected={isConnected}
        isConnecting={isConnecting}
        onConnect={connect}
        platformName="X (Twitter)"
        connectedUsername={userInfo?.username}
      />

      {/* Action Button */}
      {content.actionUrl && (
        <Button
          onClick={() => window.open(content.actionUrl!, '_blank')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {content.actionLabel}
        </Button>
      )}

      {/* Required Text / Template (for quote tweet, mention, bio, hashtag) */}
      {content.requiredText && (
        <ProofSection title="Required Text">
          <div className="relative">
            <Textarea
              value={content.requiredText}
              readOnly
              className="pr-10 bg-white/5 border-white/10 text-white/80 resize-none"
              rows={2}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-7 w-7 p-0 text-white/40 hover:text-white"
              onClick={() => handleCopy(content.requiredText!)}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </ProofSection>
      )}

      {/* Hashtag Display */}
      {content.hashtags && content.hashtags.length > 0 && (
        <ProofSection title="Required Hashtags">
          <div className="flex flex-wrap gap-2">
            {content.hashtags.map((tag: string, i: number) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        </ProofSection>
      )}

      {/* Proof URL Input (for tasks that need it) */}
      {content.requiresProof && (
        <ProofSection title="Your Proof">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Paste your tweet URL</Label>
            <Input
              placeholder="https://twitter.com/username/status/..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </ProofSection>
      )}

      {/* Verification hint */}
      {!content.requiresProof && (
        <ModalHint>
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>After completing the action, click "Verify Task" below to confirm</span>
        </ModalHint>
      )}
    </TaskCompletionModalLayout>
  );
}
