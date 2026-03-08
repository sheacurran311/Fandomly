/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Apple Music Sync Service
 *
 * Syncs library data from Apple Music API.
 * Note: Apple Music does not expose follower counts or play counts via public API.
 */

import type { SocialConnection } from '@shared/schema';
import type {
  PlatformSyncService,
  AccountMetricsResult,
  ContentListResult,
  ContentMetricsResult,
} from './types';
import { appleMusicFetch } from '../../apple-music/apple-music-auth';

function _mapSongToContentItem(song: any) {
  return {
    platformContentId: song.id,
    contentType: 'track' as const,
    title: song.attributes?.name,
    description: `${song.attributes?.artistName} - ${song.attributes?.albumName}`,
    url: song.attributes?.url,
    thumbnailUrl: song.attributes?.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300'),
    publishedAt: song.attributes?.releaseDate ? new Date(song.attributes.releaseDate) : undefined,
    rawData: {
      durationInMillis: song.attributes?.durationInMillis,
      genreNames: song.attributes?.genreNames,
    },
  };
}

export class AppleMusicSyncService implements PlatformSyncService {
  platform = 'apple_music';

  async syncAccountMetrics(
    userId: string,
    connection: SocialConnection
  ): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Apple Music doesn't expose follower counts for users.
      // Fetch storefront info as a basic profile check.
      const storefrontRes = await appleMusicFetch('/me/storefront', accessToken);

      if (!storefrontRes.ok) {
        return { success: false, error: `HTTP ${storefrontRes.status}` };
      }

      const storefrontData = await storefrontRes.json();
      const storefront = storefrontData.data?.[0];

      return {
        success: true,
        data: {
          platformSpecific: {
            storefront: storefront?.id,
            storefrontName: storefront?.attributes?.name,
          },
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AppleMusicSync] Account metrics error:', error);
      return { success: false, error: message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Fetch recently added songs from library
      const res = await appleMusicFetch('/me/library/recently-added?limit=10', accessToken);

      if (!res.ok) {
        return { success: true, items: [] };
      }

      const data = await res.json();
      const items = (data.data || [])
        .filter((item: any) => item.type === 'library-songs' || item.type === 'library-albums')
        .map((item: any) => ({
          platformContentId: item.id,
          contentType: item.type === 'library-songs' ? 'track' : 'album',
          title: item.attributes?.name,
          description: item.attributes?.artistName,
          url: item.attributes?.url,
          thumbnailUrl: item.attributes?.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300'),
          rawData: item.attributes,
        }));

      return { success: true, items };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AppleMusicSync] Content list error:', error);
      return { success: false, error: message };
    }
  }

  async syncContentMetrics(
    userId: string,
    connection: SocialConnection,
    contentIds: string[]
  ): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      if (contentIds.length === 0) {
        return { success: true, metrics: [] };
      }

      // Apple Music doesn't expose play counts via public API.
      // Fetch catalog metadata for each song as basic metric data.
      const profileData = connection.profileData as any;
      const storefront = profileData?.storefront || 'us';

      const metrics = [];
      for (const id of contentIds.slice(0, 20)) {
        try {
          const res = await appleMusicFetch(
            `/catalog/${storefront}/songs/${encodeURIComponent(id)}`,
            accessToken
          );
          if (res.ok) {
            const data = await res.json();
            const song = data.data?.[0];
            if (song) {
              metrics.push({
                platformContentId: song.id,
                platformSpecific: {
                  durationInMillis: song.attributes?.durationInMillis,
                  genreNames: song.attributes?.genreNames,
                  isrc: song.attributes?.isrc,
                },
              });
            }
          }
        } catch {
          /* skip individual track errors */
        }
      }

      return { success: true, metrics };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AppleMusicSync] Content metrics error:', error);
      return { success: false, error: message };
    }
  }
}

export const appleMusicSync = new AppleMusicSyncService();
