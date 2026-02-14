/**
 * Instagram Sync Service
 * 
 * Syncs account metrics and content from the Instagram Graph API.
 * Requires Business/Creator account connected via Facebook.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const IG_API_BASE = 'https://graph.facebook.com/v19.0';

export class InstagramSyncService implements PlatformSyncService {
  platform = 'instagram';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      const igUserId = connection.platformUserId;
      if (!accessToken || !igUserId) {
        return { success: false, error: 'Missing credentials' };
      }

      // Fetch basic account info
      const profileRes = await fetch(
        `${IG_API_BASE}/${igUserId}?fields=followers_count,follows_count,media_count,username,name&access_token=${accessToken}`
      );

      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${profileRes.status}` };
      }

      const profile = await profileRes.json();

      // Try to fetch account insights (may require page-level token)
      let impressions = 0;
      let reach = 0;
      let profileViews = 0;
      try {
        const insightsRes = await fetch(
          `${IG_API_BASE}/${igUserId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`
        );
        if (insightsRes.ok) {
          const insights = await insightsRes.json();
          for (const metric of insights.data || []) {
            const val = metric.values?.[0]?.value || 0;
            if (metric.name === 'impressions') impressions = val;
            if (metric.name === 'reach') reach = val;
            if (metric.name === 'profile_views') profileViews = val;
          }
        }
      } catch {
        // Insights may not be available for all account types
      }

      return {
        success: true,
        data: {
          followers: profile.followers_count || 0,
          following: profile.follows_count || 0,
          totalPosts: profile.media_count || 0,
          platformSpecific: {
            impressions,
            reach,
            profileViews,
          },
        },
      };
    } catch (error: any) {
      console.error('[InstagramSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      const igUserId = connection.platformUserId;
      if (!accessToken || !igUserId) {
        return { success: false, error: 'Missing credentials' };
      }

      const response = await fetch(
        `${IG_API_BASE}/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,like_count,comments_count&limit=25&access_token=${accessToken}`
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const media = data.data || [];

      return {
        success: true,
        items: media.map((item: any) => ({
          platformContentId: item.id,
          contentType: (item.media_type || 'IMAGE').toLowerCase() === 'video' ? 'video' :
                       (item.media_type || '').toLowerCase() === 'carousel_album' ? 'post' : 'post',
          title: item.caption?.substring(0, 100) || '',
          description: item.caption,
          url: item.permalink,
          thumbnailUrl: item.thumbnail_url || item.media_url,
          publishedAt: item.timestamp ? new Date(item.timestamp) : undefined,
          rawData: { media_type: item.media_type, like_count: item.like_count, comments_count: item.comments_count },
        })),
      };
    } catch (error: any) {
      console.error('[InstagramSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(userId: string, connection: SocialConnection, contentIds: string[]): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      const metrics = [];
      for (const contentId of contentIds.slice(0, 25)) {
        try {
          // Basic metrics
          const basicRes = await fetch(
            `${IG_API_BASE}/${contentId}?fields=like_count,comments_count&access_token=${accessToken}`
          );
          
          let basicData: any = {};
          if (basicRes.ok) {
            basicData = await basicRes.json();
          }

          // Insights (may fail for some media types)
          let insightsData: any = {};
          try {
            const insightsRes = await fetch(
              `${IG_API_BASE}/${contentId}/insights?metric=impressions,reach,saved,engagement&access_token=${accessToken}`
            );
            if (insightsRes.ok) {
              const insights = await insightsRes.json();
              for (const m of insights.data || []) {
                insightsData[m.name] = m.values?.[0]?.value || 0;
              }
            }
          } catch {
            // Insights may not be available
          }

          metrics.push({
            platformContentId: contentId,
            likes: basicData.like_count || 0,
            comments: basicData.comments_count || 0,
            impressions: insightsData.impressions || 0,
            reach: insightsData.reach || 0,
            saves: insightsData.saved || 0,
            platformSpecific: {
              engagement: insightsData.engagement || 0,
            },
          });
        } catch {
          // Skip individual failures
        }
      }

      return { success: true, metrics };
    } catch (error: any) {
      console.error('[InstagramSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const instagramSync = new InstagramSyncService();
