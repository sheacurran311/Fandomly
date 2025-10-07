/**
 * Creator Tweets Feed Widget
 * 
 * Displays a creator's 5 most recent tweets
 * Fans can interact directly with the tweets
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Repeat2, MessageCircle, ExternalLink, Twitter, Loader2 } from "lucide-react";
import { useCreatorTweets } from "@/hooks/useTwitterVerification";
import { formatDistanceToNow } from "date-fns";

interface CreatorTweetsFeedProps {
  creatorUrl: string;
  creatorName: string;
  limit?: number;
}

export default function CreatorTweetsFeed({
  creatorUrl,
  creatorName,
  limit = 5,
}: CreatorTweetsFeedProps) {
  const { data: tweets, isLoading, error } = useCreatorTweets(creatorUrl, limit);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            Latest from {creatorName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            Latest from {creatorName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">
            Unable to load tweets. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!tweets || tweets.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            Latest from {creatorName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">
            No tweets available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Twitter className="h-5 w-5 text-[#1DA1F2]" />
          Latest from {creatorName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tweets.map((tweet) => (
          <div
            key={tweet.id}
            className="bg-white/5 rounded-lg p-4 space-y-3 hover:bg-white/10 transition-colors"
          >
            {/* Tweet Text */}
            <p className="text-white whitespace-pre-wrap leading-relaxed">
              {tweet.text}
            </p>

            {/* Hashtags */}
            {tweet.entities?.hashtags && tweet.entities.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tweet.entities.hashtags.map((hashtag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-brand-primary/50 text-brand-primary"
                  >
                    #{hashtag.tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tweet Metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              {/* Engagement Metrics */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                {tweet.public_metrics && (
                  <>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{tweet.public_metrics.reply_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat2 className="h-4 w-4" />
                      <span>{tweet.public_metrics.retweet_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{tweet.public_metrics.like_count || 0}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Time */}
              {tweet.created_at && (
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => window.open(
                  `https://twitter.com/intent/like?tweet_id=${tweet.id}`,
                  '_blank'
                )}
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 hover:bg-pink-500/20 hover:text-pink-400 hover:border-pink-500/50"
              >
                <Heart className="h-4 w-4 mr-2" />
                Like
              </Button>
              <Button
                onClick={() => window.open(
                  `https://twitter.com/intent/retweet?tweet_id=${tweet.id}`,
                  '_blank'
                )}
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/50"
              >
                <Repeat2 className="h-4 w-4 mr-2" />
                Retweet
              </Button>
              <Button
                onClick={() => window.open(
                  `https://twitter.com/i/web/status/${tweet.id}`,
                  '_blank'
                )}
                variant="outline"
                size="sm"
                className="border-white/20 hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* View All Link */}
        <div className="pt-2 text-center">
          <Button
            onClick={() => window.open(
              `https://twitter.com/${creatorUrl}`,
              '_blank'
            )}
            variant="ghost"
            className="text-brand-primary hover:text-brand-primary/80"
          >
            View all tweets on Twitter
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

