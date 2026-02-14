/**
 * Twitch Sync Service
 * 
 * Syncs channel stats (followers, subscribers) and stream data from Twitch Helix API.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

export class TwitchSyncService implements PlatformSyncService {
  platform = 'twitch';

  private getHeaders(accessToken: string) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID || '',
    };
  }

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      const broadcasterId = connection.platformUserId;
      if (!accessToken || !broadcasterId) {
        return { success: false, error: 'Missing credentials' };
      }

      const headers = this.getHeaders(accessToken);

      // Fetch follower count
      let followers = 0;
      try {
        const followerRes = await fetch(
          `${TWITCH_API_BASE}/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
          { headers }
        );
        if (followerRes.ok) {
          const data = await followerRes.json();
          followers = data.total || 0;
        }
      } catch { /* ignore */ }

      // Fetch subscriber count
      let subscribers = 0;
      try {
        const subRes = await fetch(
          `${TWITCH_API_BASE}/subscriptions?broadcaster_id=${broadcasterId}&first=1`,
          { headers }
        );
        if (subRes.ok) {
          const data = await subRes.json();
          subscribers = data.total || 0;
        }
      } catch { /* ignore */ }

      // Check if currently live
      let isLive = false;
      let currentViewers = 0;
      try {
        const streamRes = await fetch(
          `${TWITCH_API_BASE}/streams?user_id=${broadcasterId}`,
          { headers }
        );
        if (streamRes.ok) {
          const data = await streamRes.json();
          if (data.data?.length > 0) {
            isLive = true;
            currentViewers = data.data[0].viewer_count || 0;
          }
        }
      } catch { /* ignore */ }

      return {
        success: true,
        data: {
          followers,
          subscribers,
          platformSpecific: {
            isLive,
            currentViewers,
          },
        },
      };
    } catch (error: any) {
      console.error('[TwitchSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      const broadcasterId = connection.platformUserId;
      if (!accessToken || !broadcasterId) {
        return { success: false, error: 'Missing credentials' };
      }

      const headers = this.getHeaders(accessToken);

      // Get recent videos (VODs, highlights, uploads)
      const videosRes = await fetch(
        `${TWITCH_API_BASE}/videos?user_id=${broadcasterId}&first=20&type=all`,
        { headers }
      );

      if (!videosRes.ok) {
        return { success: false, error: 'Failed to fetch videos' };
      }

      const data = await videosRes.json();
      const videos = data.data || [];

      return {
        success: true,
        items: videos.map((video: any) => ({
          platformContentId: video.id,
          contentType: video.type === 'archive' ? 'stream' : 'video',
          title: video.title,
          description: video.description,
          url: video.url,
          thumbnailUrl: video.thumbnail_url?.replace('%{width}', '320').replace('%{height}', '180'),
          publishedAt: video.created_at ? new Date(video.created_at) : undefined,
          rawData: {
            duration: video.duration,
            view_count: video.view_count,
            language: video.language,
            type: video.type,
          },
        })),
      };
    } catch (error: any) {
      console.error('[TwitchSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(userId: string, connection: SocialConnection, contentIds: string[]): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      const headers = this.getHeaders(accessToken);
      const metrics = [];

      // Twitch video API can fetch multiple at once
      const ids = contentIds.slice(0, 20).map(id => `id=${id}`).join('&');
      const res = await fetch(
        `${TWITCH_API_BASE}/videos?${ids}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        for (const video of data.data || []) {
          metrics.push({
            platformContentId: video.id,
            views: video.view_count || 0,
            platformSpecific: {
              duration: video.duration,
              type: video.type,
            },
          });
        }
      }

      return { success: true, metrics };
    } catch (error: any) {
      console.error('[TwitchSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const twitchSync = new TwitchSyncService();
