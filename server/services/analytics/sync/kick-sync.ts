/**
 * Kick Sync Service
 * 
 * Syncs channel data and stream info from Kick API.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const KICK_API_BASE = 'https://api.kick.com/apis';

export class KickSyncService implements PlatformSyncService {
  platform = 'kick';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      const channelId = connection.platformUserId;
      if (!accessToken || !channelId) {
        return { success: false, error: 'Missing credentials' };
      }

      // Get channel info
      const channelRes = await fetch(
        `${KICK_API_BASE}/channels/${channelId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!channelRes.ok) {
        return { success: false, error: `HTTP ${channelRes.status}` };
      }

      const channel = await channelRes.json();

      // Check if live
      let isLive = false;
      let viewers = 0;
      try {
        const streamRes = await fetch(
          `${KICK_API_BASE}/livestreams?channel_id=${channelId}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (streamRes.ok) {
          const streamData = await streamRes.json();
          if (streamData.data?.length > 0) {
            isLive = true;
            viewers = streamData.data[0].viewer_count || 0;
          }
        }
      } catch { /* ignore */ }

      return {
        success: true,
        data: {
          followers: channel.data?.followers_count || channel.followers_count || 0,
          subscribers: channel.data?.subscriber_count || 0,
          platformSpecific: {
            isLive,
            currentViewers: viewers,
            verified: channel.data?.verified || false,
          },
        },
      };
    } catch (error: any) {
      console.error('[KickSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    // Kick's VOD/clip endpoints are limited; return empty for now
    return { success: true, items: [] };
  }

  async syncContentMetrics(_userId: string, _connection: SocialConnection, _contentIds: string[]): Promise<ContentMetricsResult> {
    return { success: true, metrics: [] };
  }
}

export const kickSync = new KickSyncService();
