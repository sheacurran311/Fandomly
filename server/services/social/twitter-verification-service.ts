/**
 * Twitter/X API Verification Service
 * 
 * Provides automated verification for Twitter-based tasks:
 * - Follow verification
 * - Like verification  
 * - Retweet verification
 * - Quote tweet verification
 * 
 * API Documentation:
 * - Follows: https://docs.x.com/x-api/users/get-following
 * - Likes: https://docs.x.com/x-api/users/get-liked-posts
 * - Retweets: https://docs.x.com/x-api/posts/get-reposted-by
 * - Quotes: https://docs.x.com/x-api/posts/get-quoted-posts
 * - User Posts: https://docs.x.com/x-api/users/get-posts
 */

import { storage } from '../../core/storage';

interface TwitterTokenBundle {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ url: string; expanded_url: string }>;
  };
}

interface VerificationResult {
  verified: boolean;
  data?: any;
  error?: string;
}

export class TwitterVerificationService {
  private static readonly BASE_URL = 'https://api.x.com/2';
  
  /**
   * Get valid access token for a user, refreshing if needed
   */
  private static async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const tokenBundle = await storage.getSocialTokenBundle(userId, 'twitter') as TwitterTokenBundle | null;
      
      if (!tokenBundle?.access_token) {
        console.log('[Twitter Verify] No access token found for user:', userId);
        return null;
      }

      // Check if token is expired
      const now = Date.now();
      if (tokenBundle.expires_at && tokenBundle.expires_at < now) {
        console.log('[Twitter Verify] Token expired, attempting refresh');
        
        if (!tokenBundle.refresh_token) {
          console.log('[Twitter Verify] No refresh token available');
          return null;
        }

        // Refresh the token
        const refreshed = await this.refreshAccessToken(tokenBundle.refresh_token);
        if (refreshed) {
          // Save new token bundle
          await storage.saveSocialTokenBundle(userId, 'twitter', {
            ...refreshed,
            received_at: Date.now(),
            expires_at: Date.now() + (refreshed.expires_in - 60) * 1000
          });
          return refreshed.access_token;
        }
        
        return null;
      }

      return tokenBundle.access_token;
    } catch (error) {
      console.error('[Twitter Verify] Error getting access token:', error);
      return null;
    }
  }

  /**
   * Refresh Twitter access token using refresh token
   */
  private static async refreshAccessToken(refreshToken: string): Promise<any> {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Twitter credentials not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basic}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Twitter Verify] Token refresh failed:', error);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Make authenticated request to Twitter API
   */
  private static async makeTwitterRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>
  ): Promise<T | null> {
    try {
      const url = new URL(`${this.BASE_URL}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Twitter API] Request failed:', response.status, error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Twitter API] Request error:', error);
      return null;
    }
  }

  /**
   * Get Twitter user ID from username
   */
  static async getUserByUsername(username: string, accessToken: string): Promise<TwitterUser | null> {
    const cleanUsername = username.replace('@', '');
    const data = await this.makeTwitterRequest<{ data: TwitterUser }>(
      `/users/by/username/${cleanUsername}`,
      accessToken,
      { 'user.fields': 'public_metrics,verified,profile_image_url' }
    );
    return data?.data || null;
  }

  /**
   * Verify if a user follows another user
   * Endpoint: GET /2/users/{id}/following
   * Docs: https://docs.x.com/x-api/users/get-following
   */
  static async verifyFollow(
    fanUserId: string,
    creatorTwitterHandle: string
  ): Promise<VerificationResult> {
    try {
      const accessToken = await this.getValidAccessToken(fanUserId);
      if (!accessToken) {
        return { verified: false, error: 'Twitter account not connected' };
      }

      // Get fan's Twitter user data
      const accounts = await storage.getSocialAccounts(fanUserId);
      const fanTwitterData = accounts?.find((a: { platform?: string }) => a.platform === 'twitter');
      if (!fanTwitterData?.platformUserId) {
        return { verified: false, error: 'Twitter user ID not found' };
      }

      // Get creator's Twitter user ID from username
      const creatorTwitterUser = await this.getUserByUsername(creatorTwitterHandle, accessToken);
      if (!creatorTwitterUser) {
        return { verified: false, error: 'Creator Twitter account not found' };
      }

      // Check if fan is following creator
      const response = await this.makeTwitterRequest<{ data?: TwitterUser[]; meta?: any }>(
        `/users/${fanTwitterData.platformUserId}/following`,
        accessToken,
        { 
          'max_results': '1000',
          'user.fields': 'id,username'
        }
      );

      if (!response?.data) {
        return { verified: false, error: 'Failed to fetch following list' };
      }

      const isFollowing = response.data.some(
        (user: TwitterUser) => user.id === creatorTwitterUser.id
      );

      return {
        verified: isFollowing,
        data: {
          fanTwitterId: fanTwitterData.platformUserId,
          creatorTwitterId: creatorTwitterUser.id,
          creatorUsername: creatorTwitterUser.username,
        }
      };
    } catch (error) {
      console.error('[Twitter Verify] Follow verification error:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Verify if a user liked a specific tweet
   * Endpoint: GET /2/users/{id}/liked_tweets
   * Docs: https://docs.x.com/x-api/users/get-liked-posts
   */
  static async verifyLike(
    fanUserId: string,
    tweetId: string
  ): Promise<VerificationResult> {
    try {
      const accessToken = await this.getValidAccessToken(fanUserId);
      if (!accessToken) {
        return { verified: false, error: 'Twitter account not connected' };
      }

      const accounts = await storage.getSocialAccounts(fanUserId);
      const fanTwitterData = accounts?.find((a: { platform?: string }) => a.platform === 'twitter');
      if (!fanTwitterData?.platformUserId) {
        return { verified: false, error: 'Twitter user ID not found' };
      }

      // Check user's liked tweets
      const response = await this.makeTwitterRequest<{ data?: TwitterTweet[] }>(
        `/users/${fanTwitterData.platformUserId}/liked_tweets`,
        accessToken,
        { 
          'max_results': '100',
          'tweet.fields': 'id,created_at'
        }
      );

      if (!response?.data) {
        return { verified: false, error: 'Failed to fetch liked tweets' };
      }

      const hasLiked = response.data.some((tweet: TwitterTweet) => tweet.id === tweetId);

      return {
        verified: hasLiked,
        data: {
          tweetId,
          fanTwitterId: fanTwitterData.platformUserId,
        }
      };
    } catch (error) {
      console.error('[Twitter Verify] Like verification error:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Verify if a user retweeted a specific tweet
   * Endpoint: GET /2/tweets/{id}/retweeted_by
   * Docs: https://docs.x.com/x-api/posts/get-reposted-by
   */
  static async verifyRetweet(
    fanUserId: string,
    tweetId: string
  ): Promise<VerificationResult> {
    try {
      const accessToken = await this.getValidAccessToken(fanUserId);
      if (!accessToken) {
        return { verified: false, error: 'Twitter account not connected' };
      }

      const accounts = await storage.getSocialAccounts(fanUserId);
      const fanTwitterData = accounts?.find((a: { platform?: string }) => a.platform === 'twitter');
      if (!fanTwitterData?.platformUserId) {
        return { verified: false, error: 'Twitter user ID not found' };
      }

      // Get list of users who retweeted this tweet
      const response = await this.makeTwitterRequest<{ data?: TwitterUser[] }>(
        `/tweets/${tweetId}/retweeted_by`,
        accessToken,
        { 
          'max_results': '100',
          'user.fields': 'id,username'
        }
      );

      if (!response?.data) {
        return { verified: false, error: 'Failed to fetch retweet data' };
      }

      const hasRetweeted = response.data.some(
        (user: TwitterUser) => user.id === fanTwitterData.platformUserId
      );

      return {
        verified: hasRetweeted,
        data: {
          tweetId,
          fanTwitterId: fanTwitterData.platformUserId,
        }
      };
    } catch (error) {
      console.error('[Twitter Verify] Retweet verification error:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Verify if a user quote tweeted a specific tweet
   * Endpoint: GET /2/tweets/{id}/quote_tweets
   * Docs: https://docs.x.com/x-api/posts/get-quoted-posts
   */
  static async verifyQuoteTweet(
    fanUserId: string,
    tweetId: string
  ): Promise<VerificationResult> {
    try {
      const accessToken = await this.getValidAccessToken(fanUserId);
      if (!accessToken) {
        return { verified: false, error: 'Twitter account not connected' };
      }

      const accounts = await storage.getSocialAccounts(fanUserId);
      const fanTwitterData = accounts?.find((a: { platform?: string }) => a.platform === 'twitter');
      if (!fanTwitterData?.platformUserId) {
        return { verified: false, error: 'Twitter user ID not found' };
      }

      // Get quote tweets for this tweet
      const response = await this.makeTwitterRequest<{ data?: TwitterTweet[] }>(
        `/tweets/${tweetId}/quote_tweets`,
        accessToken,
        { 
          'max_results': '100',
          'tweet.fields': 'author_id,created_at'
        }
      );

      if (!response?.data) {
        return { verified: false, error: 'Failed to fetch quote tweets' };
      }

      const hasQuoted = response.data.some(
        (tweet: TwitterTweet) => tweet.author_id === fanTwitterData.platformUserId
      );

      return {
        verified: hasQuoted,
        data: {
          tweetId,
          fanTwitterId: fanTwitterData.platformUserId,
        }
      };
    } catch (error) {
      console.error('[Twitter Verify] Quote tweet verification error:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Get user's recent tweets
   * Endpoint: GET /2/users/{id}/tweets
   * Docs: https://docs.x.com/x-api/users/get-posts
   */
  static async getUserTweets(
    userId: string,
    maxResults: number = 5
  ): Promise<TwitterTweet[]> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        console.log('[Twitter] No access token for user:', userId);
        return [];
      }

      const accounts = await storage.getSocialAccounts(userId);
      const twitterData = accounts?.find((a: { platform?: string }) => a.platform === 'twitter');
      if (!twitterData?.platformUserId) {
        console.log('[Twitter] No Twitter user ID found');
        return [];
      }

      const response = await this.makeTwitterRequest<{ data?: TwitterTweet[] }>(
        `/users/${twitterData.platformUserId}/tweets`,
        accessToken,
        { 
          'max_results': maxResults.toString(),
          'tweet.fields': 'created_at,public_metrics,entities',
          'exclude': 'retweets,replies' // Only get original tweets
        }
      );

      return response?.data || [];
    } catch (error) {
      console.error('[Twitter] Error fetching user tweets:', error);
      return [];
    }
  }

  /**
   * Get tweet details by ID
   */
  static async getTweetById(
    userId: string,
    tweetId: string
  ): Promise<TwitterTweet | null> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        return null;
      }

      const response = await this.makeTwitterRequest<{ data?: TwitterTweet }>(
        `/tweets/${tweetId}`,
        accessToken,
        { 
          'tweet.fields': 'created_at,public_metrics,entities,author_id',
          'expansions': 'author_id',
          'user.fields': 'username,name,profile_image_url,verified'
        }
      );

      return response?.data || null;
    } catch (error) {
      console.error('[Twitter] Error fetching tweet:', error);
      return null;
    }
  }

  /**
   * Extract tweet ID from various URL formats
   */
  static extractTweetId(tweetUrl: string): string | null {
    try {
      // Handle formats:
      // - https://twitter.com/user/status/1234567890
      // - https://x.com/user/status/1234567890
      // - Just the ID: 1234567890
      
      if (/^\d+$/.test(tweetUrl)) {
        return tweetUrl;
      }

      const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Verify task completion based on task type
   */
  static async verifyTaskCompletion(
    fanUserId: string,
    taskType: string,
    taskSettings: any
  ): Promise<VerificationResult> {
    switch (taskType) {
      case 'twitter_follow':
        if (!taskSettings.handle) {
          return { verified: false, error: 'Twitter handle not specified' };
        }
        return await this.verifyFollow(fanUserId, taskSettings.handle);

      case 'twitter_like':
        if (!taskSettings.tweetUrl && !taskSettings.url) {
          return { verified: false, error: 'Tweet URL not specified' };
        }
        const likeTweetId = this.extractTweetId(taskSettings.tweetUrl || taskSettings.url);
        if (!likeTweetId) {
          return { verified: false, error: 'Invalid tweet URL' };
        }
        return await this.verifyLike(fanUserId, likeTweetId);

      case 'twitter_retweet':
        if (!taskSettings.tweetUrl && !taskSettings.url) {
          return { verified: false, error: 'Tweet URL not specified' };
        }
        const retweetId = this.extractTweetId(taskSettings.tweetUrl || taskSettings.url);
        if (!retweetId) {
          return { verified: false, error: 'Invalid tweet URL' };
        }
        return await this.verifyRetweet(fanUserId, retweetId);

      case 'twitter_mention':
      case 'twitter_include_name':
      case 'twitter_include_bio':
      case 'twitter_hashtag_post':
        // These require checking user's tweets for content, which needs different approach
        return { verified: false, error: 'Manual verification required for this task type' };

      default:
        return { verified: false, error: `Unsupported task type: ${taskType}` };
    }
  }
}

