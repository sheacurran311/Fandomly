/**
 * Twitter/X Sync Service
 * 
 * Syncs account metrics (followers, tweets) and content metrics (likes, retweets, views)
 * from the Twitter API v2.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

export class TwitterSyncService implements PlatformSyncService {
  platform = 'twitter';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      const platformUserId = connection.platformUserId;
      if (!platformUserId) {
        return { success: false, error: 'No platform user ID' };
      }

      const response = await fetch(
        `${TWITTER_API_BASE}/users/${platformUserId}?user.fields=public_metrics,description,profile_image_url`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const metrics = data.data?.public_metrics;

      if (!metrics) {
        return { success: false, error: 'No metrics in response' };
      }

      return {
        success: true,
        data: {
          followers: metrics.followers_count || 0,
          following: metrics.following_count || 0,
          totalPosts: metrics.tweet_count || 0,
          platformSpecific: {
            listed_count: metrics.listed_count || 0,
            like_count: metrics.like_count || 0,
          },
        },
      };
    } catch (error: any) {
      console.error('[TwitterSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      const platformUserId = connection.platformUserId;
      if (!accessToken || !platformUserId) {
        return { success: false, error: 'Missing credentials' };
      }

      const response = await fetch(
        `${TWITTER_API_BASE}/users/${platformUserId}/tweets?max_results=20&tweet.fields=created_at,public_metrics,text,entities&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const tweets = data.data || [];

      return {
        success: true,
        items: tweets.map((tweet: any) => ({
          platformContentId: tweet.id,
          contentType: 'post',
          title: tweet.text?.substring(0, 100),
          description: tweet.text,
          url: `https://x.com/i/status/${tweet.id}`,
          publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
          rawData: { public_metrics: tweet.public_metrics, entities: tweet.entities },
        })),
      };
    } catch (error: any) {
      console.error('[TwitterSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(userId: string, connection: SocialConnection, contentIds: string[]): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      if (contentIds.length === 0) {
        return { success: true, metrics: [] };
      }

      const ids = contentIds.slice(0, 100).join(',');
      const response = await fetch(
        `${TWITTER_API_BASE}/tweets?ids=${ids}&tweet.fields=public_metrics,non_public_metrics,organic_metrics`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const tweets = data.data || [];

      return {
        success: true,
        metrics: tweets.map((tweet: any) => {
          const pub = tweet.public_metrics || {};
          const nonPub = tweet.non_public_metrics || {};
          return {
            platformContentId: tweet.id,
            likes: pub.like_count || 0,
            comments: pub.reply_count || 0,
            shares: pub.retweet_count || 0,
            views: pub.impression_count || nonPub.impression_count || 0,
            platformSpecific: {
              quote_count: pub.quote_count || 0,
              bookmark_count: pub.bookmark_count || 0,
              url_link_clicks: nonPub.url_link_clicks || 0,
              user_profile_clicks: nonPub.user_profile_clicks || 0,
            },
          };
        }),
      };
    } catch (error: any) {
      console.error('[TwitterSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const twitterSync = new TwitterSyncService();
