/**
 * TikTok Sync Service
 * 
 * Syncs account metrics and video data from TikTok API.
 * Note: TikTok's API access is more restricted; this uses available endpoints.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokSyncService implements PlatformSyncService {
  platform = 'tiktok';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      const response = await fetch(
        `${TIKTOK_API_BASE}/user/info/?fields=follower_count,following_count,likes_count,video_count,display_name,avatar_url`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const user = data.data?.user;

      if (!user) {
        return { success: false, error: 'No user data returned' };
      }

      return {
        success: true,
        data: {
          followers: user.follower_count || 0,
          following: user.following_count || 0,
          totalPosts: user.video_count || 0,
          totalLikes: user.likes_count || 0,
          platformSpecific: {
            displayName: user.display_name,
          },
        },
      };
    } catch (error: any) {
      console.error('[TikTokSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // TikTok's video list endpoint
      const response = await fetch(
        `${TIKTOK_API_BASE}/video/list/?fields=id,title,create_time,cover_image_url,share_url,duration,like_count,comment_count,share_count,view_count`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_count: 20 }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const videos = data.data?.videos || [];

      return {
        success: true,
        items: videos.map((video: any) => ({
          platformContentId: video.id,
          contentType: 'video',
          title: video.title || 'TikTok video',
          url: video.share_url,
          thumbnailUrl: video.cover_image_url,
          publishedAt: video.create_time ? new Date(video.create_time * 1000) : undefined,
          rawData: {
            duration: video.duration,
            like_count: video.like_count,
            comment_count: video.comment_count,
            share_count: video.share_count,
            view_count: video.view_count,
          },
        })),
      };
    } catch (error: any) {
      console.error('[TikTokSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(userId: string, connection: SocialConnection, contentIds: string[]): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // TikTok query video endpoint
      const response = await fetch(
        `${TIKTOK_API_BASE}/video/query/?fields=id,like_count,comment_count,share_count,view_count`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: { video_ids: contentIds.slice(0, 20) },
          }),
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch video metrics' };
      }

      const data = await response.json();
      const videos = data.data?.videos || [];

      return {
        success: true,
        metrics: videos.map((video: any) => ({
          platformContentId: video.id,
          views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
        })),
      };
    } catch (error: any) {
      console.error('[TikTokSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const tiktokSync = new TikTokSyncService();
