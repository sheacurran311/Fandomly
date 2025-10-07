/**
 * Tweet Embed Widget
 * 
 * Displays a tweet with like/retweet buttons and real-time verification
 * Creators can embed specific tweets for fans to interact with
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Repeat2, MessageCircle, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useVerifyTwitterTask } from "@/hooks/useTwitterVerification";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface TweetEmbedWidgetProps {
  tweetId: string;
  tweetUrl: string;
  taskId: string;
  taskType: 'twitter_like' | 'twitter_retweet';
  points: number;
  text?: string;
  authorName?: string;
  authorUsername?: string;
  authorImage?: string;
  createdAt?: string;
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

export default function TweetEmbedWidget({
  tweetId,
  tweetUrl,
  taskId,
  taskType,
  points,
  text,
  authorName,
  authorUsername,
  authorImage,
  createdAt,
  metrics,
}: TweetEmbedWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCompleted, setIsCompleted] = useState(false);
  const verifyTask = useVerifyTwitterTask();

  const handleVerify = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to complete tasks",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await verifyTask.mutateAsync({
        taskId,
        taskType,
        taskSettings: {
          url: tweetUrl,
          tweetUrl,
        },
      });

      if (result.verified) {
        setIsCompleted(true);
        toast({
          title: "✅ Task Completed!",
          description: result.alreadyCompleted 
            ? "You've already completed this task!"
            : `Congratulations! You earned ${points} points!`,
        });
      } else {
        toast({
          title: "Not Verified",
          description: result.message || "Please complete the action on Twitter first",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const actionLabel = taskType === 'twitter_like' ? 'Like' : 'Retweet';
  const ActionIcon = taskType === 'twitter_like' ? Heart : Repeat2;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <ActionIcon className="h-5 w-5 text-brand-primary" />
            {actionLabel} & Earn {points} Points
          </CardTitle>
          <Badge variant="outline" className="border-brand-primary text-brand-primary">
            +{points} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tweet Preview */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          {/* Author Info */}
          {(authorName || authorUsername) && (
            <div className="flex items-center gap-3">
              {authorImage && (
                <img
                  src={authorImage}
                  alt={authorName || authorUsername || 'User'}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                {authorName && (
                  <p className="font-semibold text-white">{authorName}</p>
                )}
                {authorUsername && (
                  <p className="text-sm text-gray-400">@{authorUsername}</p>
                )}
              </div>
            </div>
          )}

          {/* Tweet Text */}
          {text && (
            <p className="text-white whitespace-pre-wrap">{text}</p>
          )}

          {/* Tweet Metrics */}
          {metrics && (
            <div className="flex items-center gap-4 text-sm text-gray-400 pt-2 border-t border-white/10">
              {metrics.replies !== undefined && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {metrics.replies}
                </div>
              )}
              {metrics.retweets !== undefined && (
                <div className="flex items-center gap-1">
                  <Repeat2 className="h-4 w-4" />
                  {metrics.retweets}
                </div>
              )}
              {metrics.likes !== undefined && (
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {metrics.likes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => window.open(tweetUrl, '_blank')}
            variant="outline"
            className="flex-1 border-white/20 hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {actionLabel} on Twitter
          </Button>

          <Button
            onClick={handleVerify}
            disabled={verifyTask.isPending || isCompleted}
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
          >
            {verifyTask.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </>
            ) : (
              `Verify & Earn ${points}`
            )}
          </Button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-gray-400 text-center">
          {actionLabel} the tweet on Twitter, then click verify to instantly earn your reward
        </p>
      </CardContent>
    </Card>
  );
}

