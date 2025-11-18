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
  Twitter,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Heart,
  Repeat2,
  MessageSquare,
  Hash,
  UserPlus,
  Copy,
  Check,
  Link as LinkIcon,
  XCircle,
  Trophy,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";

interface TwitterTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
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
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });

      // Handle verification success or failure (API-first verification = immediate result)
      if (data.verified && data.success) {
        toast({
          title: "🎉 Task Completed!",
          description: `Congratulations! You earned ${data.pointsAwarded || task.pointsToReward || 0} points!`,
          duration: 5000,
        });
        onSuccess();
        onClose();
      }
      // Handle verification failure
      else {
        toast({
          title: "Verification Failed",
          description: data.message || "Make sure you have completed the task using the applicable connected account. Please try again...",
          variant: "destructive",
          duration: 6000,
        });
        // Don't close modal on failure - let user retry
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

  // Get task-specific instructions and UI
  const getTaskContent = () => {
    const username = settings?.username || settings?.handle;
    const contentUrl = settings?.contentUrl || settings?.tweetUrl;
    const requiredText = settings?.requiredText;
    const hashtags = settings?.requiredHashtags || settings?.hashtags || [];
    const mentions = settings?.requiredMentions || [];

    switch (taskType) {
      case 'twitter_follow':
        const profileUrl = username
          ? `https://twitter.com/${username.replace('@', '')}`
          : null;

        return {
          icon: <UserPlus className="w-6 h-6 text-blue-500" />,
          title: "Follow on Twitter",
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : "Follow the required account on Twitter",
          instructions: (
            <div className="space-y-4">
              {profileUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(profileUrl, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Follow @{username.replace('@', '')}
                  </Button>
                </div>
              )}
              <Alert>
                <AlertDescription>
                  After following, click "Verify" below to confirm
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresProof: false,
        };

      case 'twitter_like':
        return {
          icon: <Heart className="w-6 h-6 text-pink-500" />,
          title: "Like Tweet",
          description: "Like the specified tweet to earn points",
          instructions: (
            <div className="space-y-4">
              {contentUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(contentUrl, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Tweet
                  </Button>
                </div>
              )}
              <Alert>
                <AlertDescription>
                  After liking the tweet, click "Verify" below
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresProof: false,
        };

      case 'twitter_retweet':
        return {
          icon: <Repeat2 className="w-6 h-6 text-green-500" />,
          title: "Retweet",
          description: "Retweet the specified post",
          instructions: (
            <div className="space-y-4">
              {contentUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(contentUrl, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Tweet to Retweet
                  </Button>
                </div>
              )}
              <Alert>
                <AlertDescription>
                  After retweeting, click "Verify" below
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresProof: false,
        };

      case 'twitter_quote_tweet':
        const quoteUrl = contentUrl
          ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(requiredText || '')}&url=${encodeURIComponent(contentUrl)}`
          : null;

        return {
          icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
          title: "Quote Tweet",
          description: "Quote tweet with your own comment",
          instructions: (
            <div className="space-y-4">
              {requiredText && (
                <div className="space-y-2">
                  <Label>Required Text (copy this):</Label>
                  <div className="relative">
                    <Textarea
                      value={requiredText}
                      readOnly
                      className="pr-10"
                      rows={3}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(requiredText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {quoteUrl && (
                <Button
                  onClick={() => window.open(quoteUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Quote Tweet
                </Button>
              )}

              <div className="space-y-2">
                <Label>Paste your quote tweet URL:</Label>
                <Input
                  placeholder="https://twitter.com/username/status/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>
            </div>
          ),
          requiresProof: true,
        };

      case 'twitter_mention':
      case 'twitter_include_name':
        const mentionText = `@${username?.replace('@', '')} ${requiredText || ''}`.trim();
        const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(mentionText)}`;

        return {
          icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
          title: "Mention on Twitter",
          description: `Create a tweet mentioning @${username?.replace('@', '')}`,
          instructions: (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tweet Template (copy this):</Label>
                <div className="relative">
                  <Textarea
                    value={mentionText}
                    readOnly
                    rows={3}
                    className="pr-10"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(mentionText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => window.open(tweetIntentUrl, '_blank')}
                className="w-full"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Tweet This
              </Button>

              <div className="space-y-2">
                <Label>Paste your tweet URL:</Label>
                <Input
                  placeholder="https://twitter.com/username/status/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>
            </div>
          ),
          requiresProof: true,
        };

      case 'twitter_hashtag_post':
        const hashtagText = hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ');
        const hashtagTweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(hashtagText + (requiredText ? ' ' + requiredText : ''))}`;

        return {
          icon: <Hash className="w-6 h-6 text-blue-500" />,
          title: "Tweet with Hashtags",
          description: `Create a tweet with the required hashtags`,
          instructions: (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Required Hashtags:</Label>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => window.open(hashtagTweetUrl, '_blank')}
                className="w-full"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Tweet with Hashtags
              </Button>

              <div className="space-y-2">
                <Label>Paste your tweet URL:</Label>
                <Input
                  placeholder="https://twitter.com/username/status/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>
            </div>
          ),
          requiresProof: true,
        };

      case 'twitter_include_bio':
        return {
          icon: <UserPlus className="w-6 h-6 text-blue-500" />,
          title: "Update Twitter Bio",
          description: `Add "${requiredText}" to your Twitter bio`,
          instructions: (
            <div className="space-y-4">
              {requiredText && (
                <div className="space-y-2">
                  <Label>Add this to your bio:</Label>
                  <div className="relative">
                    <Input
                      value={requiredText}
                      readOnly
                      className="pr-10"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-0 right-0 h-full"
                      onClick={() => {
                        navigator.clipboard.writeText(requiredText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => window.open('https://twitter.com/settings/profile', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Edit Twitter Profile
              </Button>

              <Alert>
                <AlertDescription>
                  After updating your bio, click "Verify" below
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresProof: false,
        };

      default:
        return {
          icon: <Twitter className="w-6 h-6 text-blue-500" />,
          title: "Complete Twitter Task",
          description: task.description || "Complete the required Twitter action",
          instructions: (
            <Alert>
              <AlertDescription>
                Complete the task on Twitter, then click Verify
              </AlertDescription>
            </Alert>
          ),
          requiresProof: false,
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
        {/* Connection Status Banner */}
        {!isConnected ? (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Connect Your X Account
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Connect your X (Twitter) account to enable automatic verification and make completing tasks easier.
                </p>
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect X Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Alert>
        ) : (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Connected as <span className="font-semibold">@{userInfo?.username}</span>
              </p>
            </div>
          </Alert>
        )}

        {/* Task Instructions */}
        {content.instructions}

        {/* Task Summary Card */}
        <div className="p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200/50 dark:border-purple-800/50 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  {content.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {task.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {formatTaskType(taskType)}
                  </p>
                </div>
              </div>
            </div>

            {/* Reward Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-md">
              <Trophy className="w-5 h-5 text-white" />
              <div className="text-right">
                <div className="text-xs font-medium text-yellow-50">Reward</div>
                <div className="text-lg font-bold text-white">
                  +{task.pointsToReward || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (content.requiresProof && !proofUrl)}
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
