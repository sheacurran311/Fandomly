/**
 * Facebook Sync Service
 * 
 * Syncs page metrics and post data from the Facebook Graph API.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const FB_API_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookSyncService implements PlatformSyncService {
  platform = 'facebook';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get user's pages
      const pagesRes = await fetch(
        `${FB_API_BASE}/me/accounts?fields=id,name,fan_count,followers_count&access_token=${accessToken}`
      );

      if (!pagesRes.ok) {
        const err = await pagesRes.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${pagesRes.status}` };
      }

      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];

      // Aggregate across all pages
      let totalFollowers = 0;
      let totalFans = 0;
      const pageDetails: any[] = [];

      for (const page of pages) {
        totalFollowers += page.followers_count || 0;
        totalFans += page.fan_count || 0;
        pageDetails.push({
          id: page.id,
          name: page.name,
          followers: page.followers_count || 0,
          fans: page.fan_count || 0,
        });
      }

      // Try to get page insights for the primary page
      let impressions = 0;
      let reach = 0;
      let engagedUsers = 0;
      if (pages.length > 0) {
        try {
          const pageToken = pages[0].access_token || accessToken;
          const insightsRes = await fetch(
            `${FB_API_BASE}/${pages[0].id}/insights?metric=page_impressions,page_engaged_users,page_views_total&period=day&access_token=${pageToken}`
          );
          if (insightsRes.ok) {
            const insights = await insightsRes.json();
            for (const metric of insights.data || []) {
              const val = metric.values?.[0]?.value || 0;
              if (metric.name === 'page_impressions') impressions = val;
              if (metric.name === 'page_engaged_users') engagedUsers = val;
              if (metric.name === 'page_views_total') reach = val;
            }
          }
        } catch {
          // Insights may not be available
        }
      }

      return {
        success: true,
        data: {
          followers: totalFollowers || totalFans,
          platformSpecific: {
            totalPages: pages.length,
            pageDetails,
            impressions,
            reach,
            engagedUsers,
          },
        },
      };
    } catch (error: any) {
      console.error('[FacebookSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get pages first
      const pagesRes = await fetch(
        `${FB_API_BASE}/me/accounts?fields=id,access_token&access_token=${accessToken}`
      );
      if (!pagesRes.ok) {
        return { success: false, error: 'Failed to get pages' };
      }

      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];

      if (pages.length === 0) {
        return { success: true, items: [] };
      }

      const pageToken = pages[0].access_token || accessToken;
      const pageId = pages[0].id;

      // Get posts from primary page
      const postsRes = await fetch(
        `${FB_API_BASE}/${pageId}/posts?fields=id,message,created_time,permalink_url,type,full_picture,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${pageToken}`
      );

      if (!postsRes.ok) {
        return { success: false, error: 'Failed to get posts' };
      }

      const postsData = await postsRes.json();
      const posts = postsData.data || [];

      return {
        success: true,
        items: posts.map((post: any) => ({
          platformContentId: post.id,
          contentType: 'post',
          title: post.message?.substring(0, 100) || 'Post',
          description: post.message,
          url: post.permalink_url,
          thumbnailUrl: post.full_picture,
          publishedAt: post.created_time ? new Date(post.created_time) : undefined,
          rawData: {
            type: post.type,
            shares_count: post.shares?.count || 0,
            likes_count: post.likes?.summary?.total_count || 0,
            comments_count: post.comments?.summary?.total_count || 0,
          },
        })),
      };
    } catch (error: any) {
      console.error('[FacebookSync] Content list error:', error);
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
          const res = await fetch(
            `${FB_API_BASE}/${contentId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${accessToken}`
          );
          if (res.ok) {
            const data = await res.json();
            metrics.push({
              platformContentId: contentId,
              likes: data.reactions?.summary?.total_count || data.likes?.summary?.total_count || 0,
              comments: data.comments?.summary?.total_count || 0,
              shares: data.shares?.count || 0,
            });
          }
        } catch {
          // Skip individual failures
        }
      }

      return { success: true, metrics };
    } catch (error: any) {
      console.error('[FacebookSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const facebookSync = new FacebookSyncService();
