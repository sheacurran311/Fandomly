import { TwitterApi } from 'twitter-api-v2';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractContentId } from '../../middleware/upload';

export interface TwitterVerificationRequest {
  userId: number;
  taskType: string;
  proofUrl?: string;
  taskSettings: {
    username?: string; // Target account to follow/interact with
    handle?: string; // Legacy field
    contentUrl?: string; // Tweet URL to interact with
    tweetUrl?: string; // Legacy field
    requiredText?: string;
    requiredHashtags?: string[];
    requiredMentions?: string[];
  };
}

export interface TwitterVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Twitter API Verification Service
 *
 * Uses Twitter API v2 to verify:
 * - Follow relationships
 * - Tweet likes
 * - Retweets
 * - Tweet content (hashtags, mentions, text)
 * - User bio content
 */
export class TwitterVerificationService {
  private apiKey: string;
  private apiSecret: string;
  private bearerToken: string;

  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY || '';
    this.apiSecret = process.env.TWITTER_API_SECRET || '';
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';

    if (!this.bearerToken) {
      console.warn('Twitter Bearer Token not configured. Twitter verification will not work.');
    }
  }

  /**
   * Get Twitter client for app-level access (read-only)
   */
  private getAppClient(): TwitterApi {
    return new TwitterApi(this.bearerToken);
  }

  /**
   * Get Twitter client for user-level access (requires OAuth)
   */
  private async getUserClient(userId: number): Promise<TwitterApi | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.twitter_oauth_token || !user?.twitter_oauth_secret) {
      return null;
    }

    return new TwitterApi({
      appKey: this.apiKey,
      appSecret: this.apiSecret,
      accessToken: user.twitter_oauth_token,
      accessSecret: user.twitter_oauth_secret,
    });
  }

  /**
   * Main verification entry point
   */
  async verify(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { taskType } = request;

    try {
      switch (taskType) {
        case 'twitter_follow':
          return await this.verifyFollow(request);

        case 'twitter_like':
          return await this.verifyLike(request);

        case 'twitter_retweet':
          return await this.verifyRetweet(request);

        case 'twitter_quote_tweet':
        case 'twitter_mention':
        case 'twitter_include_name':
        case 'twitter_hashtag_post':
          return await this.verifyTweetContent(request);

        case 'twitter_include_bio':
          return await this.verifyBioContent(request);

        default:
          return {
            verified: false,
            requiresManualReview: false,
            reason: `Unknown task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      console.error('Twitter verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Twitter API error',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify user follows target account
   */
  private async verifyFollow(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { userId, taskSettings } = request;
    const targetUsername = this.normalizeUsername(taskSettings.username || taskSettings.handle);

    if (!targetUsername) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Target username not specified',
      };
    }

    // Get user's Twitter client (requires OAuth)
    const userClient = await this.getUserClient(userId);

    if (!userClient) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Twitter account not connected. Please connect your Twitter account.',
      };
    }

    try {
      // Get user's Twitter ID
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.twitter_user_id) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Twitter user ID not found',
        };
      }

      // Look up target user
      const targetUser = await userClient.v2.userByUsername(targetUsername);

      if (!targetUser.data) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: `Target user @${targetUsername} not found`,
        };
      }

      // Check if user follows target
      const following = await userClient.v2.following(user.twitter_user_id, {
        max_results: 1000,
      });

      const followsTarget = following.data?.some(
        followedUser => followedUser.id === targetUser.data.id
      );

      if (followsTarget) {
        return {
          verified: true,
          requiresManualReview: false,
          reason: `Verified: Following @${targetUsername}`,
          metadata: {
            targetUsername,
            targetUserId: targetUser.data.id,
          },
        };
      }

      return {
        verified: false,
        requiresManualReview: false,
        reason: `Not following @${targetUsername}`,
      };
    } catch (error: any) {
      console.error('Twitter follow verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Failed to verify follow',
      };
    }
  }

  /**
   * Verify user liked a tweet
   */
  private async verifyLike(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { userId, taskSettings } = request;
    const tweetUrl = taskSettings.contentUrl || taskSettings.tweetUrl;

    if (!tweetUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Tweet URL not specified',
      };
    }

    const tweetId = extractContentId(tweetUrl, 'twitter');

    if (!tweetId) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Invalid tweet URL',
      };
    }

    const userClient = await this.getUserClient(userId);

    if (!userClient) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Twitter account not connected',
      };
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.twitter_user_id) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Twitter user ID not found',
        };
      }

      // Get user's liked tweets
      const likedTweets = await userClient.v2.userLikedTweets(user.twitter_user_id, {
        max_results: 100,
      });

      const hasLiked = likedTweets.data?.some(tweet => tweet.id === tweetId);

      if (hasLiked) {
        return {
          verified: true,
          requiresManualReview: false,
          reason: 'Verified: Tweet liked',
          metadata: { tweetId },
        };
      }

      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Tweet not liked',
      };
    } catch (error: any) {
      console.error('Twitter like verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Failed to verify like',
      };
    }
  }

  /**
   * Verify user retweeted a tweet
   */
  private async verifyRetweet(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { userId, taskSettings } = request;
    const tweetUrl = taskSettings.contentUrl || taskSettings.tweetUrl;

    if (!tweetUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Tweet URL not specified',
      };
    }

    const tweetId = extractContentId(tweetUrl, 'twitter');

    if (!tweetId) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Invalid tweet URL',
      };
    }

    const appClient = this.getAppClient();

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.twitter_user_id) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Twitter user ID not found',
        };
      }

      // Get users who retweeted the tweet
      const retweeters = await appClient.v2.tweetRetweetedBy(tweetId, {
        max_results: 100,
      });

      const hasRetweeted = retweeters.data?.some(retweeter => retweeter.id === user.twitter_user_id);

      if (hasRetweeted) {
        return {
          verified: true,
          requiresManualReview: false,
          reason: 'Verified: Tweet retweeted',
          metadata: { tweetId },
        };
      }

      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Tweet not retweeted',
      };
    } catch (error: any) {
      console.error('Twitter retweet verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Failed to verify retweet',
      };
    }
  }

  /**
   * Verify tweet content (for quote tweets, mentions, hashtags)
   */
  private async verifyTweetContent(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { proofUrl, taskSettings } = request;

    if (!proofUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Proof URL required for this task type',
      };
    }

    const tweetId = extractContentId(proofUrl, 'twitter');

    if (!tweetId) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Invalid tweet URL',
      };
    }

    const appClient = this.getAppClient();

    try {
      // Fetch tweet with entities
      const tweet = await appClient.v2.singleTweet(tweetId, {
        'tweet.fields': ['text', 'entities'],
      });

      if (!tweet.data) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Tweet not found',
        };
      }

      const tweetText = tweet.data.text.toLowerCase();
      const entities = tweet.data.entities;

      // Check required text
      if (taskSettings.requiredText) {
        const requiredText = taskSettings.requiredText.toLowerCase();
        if (!tweetText.includes(requiredText)) {
          return {
            verified: false,
            requiresManualReview: false,
            reason: `Tweet must contain: "${taskSettings.requiredText}"`,
          };
        }
      }

      // Check required hashtags
      if (taskSettings.requiredHashtags && taskSettings.requiredHashtags.length > 0) {
        const tweetHashtags = entities?.hashtags?.map(h => h.tag.toLowerCase()) || [];

        for (const required of taskSettings.requiredHashtags) {
          const normalizedHashtag = required.toLowerCase().replace(/^#/, '');
          if (!tweetHashtags.includes(normalizedHashtag)) {
            return {
              verified: false,
              requiresManualReview: false,
              reason: `Tweet must include hashtag: #${normalizedHashtag}`,
            };
          }
        }
      }

      // Check required mentions
      if (taskSettings.requiredMentions && taskSettings.requiredMentions.length > 0) {
        const tweetMentions = entities?.mentions?.map(m => m.username.toLowerCase()) || [];

        for (const required of taskSettings.requiredMentions) {
          const normalizedMention = required.toLowerCase().replace(/^@/, '');
          if (!tweetMentions.includes(normalizedMention)) {
            return {
              verified: false,
              requiresManualReview: false,
              reason: `Tweet must mention: @${normalizedMention}`,
            };
          }
        }
      }

      return {
        verified: true,
        requiresManualReview: false,
        reason: 'Verified: Tweet content matches requirements',
        metadata: {
          tweetId,
          tweetText: tweet.data.text,
        },
      };
    } catch (error: any) {
      console.error('Twitter content verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Failed to verify tweet content',
      };
    }
  }

  /**
   * Verify user bio contains required text
   */
  private async verifyBioContent(request: TwitterVerificationRequest): Promise<TwitterVerificationResult> {
    const { userId, taskSettings } = request;

    if (!taskSettings.requiredText) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Required bio text not specified',
      };
    }

    const userClient = await this.getUserClient(userId);

    if (!userClient) {
      return {
        verified: false,
        requiresManualReview: false,
        reason: 'Twitter account not connected',
      };
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.twitter_user_id) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Twitter user ID not found',
        };
      }

      // Get user profile
      const profile = await userClient.v2.user(user.twitter_user_id, {
        'user.fields': ['description'],
      });

      if (!profile.data) {
        return {
          verified: false,
          requiresManualReview: false,
          reason: 'Twitter profile not found',
        };
      }

      const bio = (profile.data.description || '').toLowerCase();
      const requiredText = taskSettings.requiredText.toLowerCase();

      if (bio.includes(requiredText)) {
        return {
          verified: true,
          requiresManualReview: false,
          reason: 'Verified: Bio contains required text',
          metadata: {
            requiredText: taskSettings.requiredText,
          },
        };
      }

      return {
        verified: false,
        requiresManualReview: false,
        reason: `Bio must contain: "${taskSettings.requiredText}"`,
      };
    } catch (error: any) {
      console.error('Twitter bio verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        reason: error.message || 'Failed to verify bio',
      };
    }
  }

  /**
   * Normalize Twitter username
   */
  private normalizeUsername(username?: string): string {
    if (!username) return '';
    return username.toLowerCase().replace(/^@/, '').trim();
  }

  /**
   * Check if Twitter API is configured
   */
  public isConfigured(): boolean {
    return !!this.bearerToken && !!this.apiKey && !!this.apiSecret;
  }
}

// Export singleton instance
export const twitterVerification = new TwitterVerificationService();
