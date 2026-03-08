/**
 * Spotify Sync Service
 *
 * Syncs artist profile and top tracks from Spotify Web API.
 * Note: Spotify for Artists analytics are NOT exposed via public API.
 *
 * Updated for Spotify's February 2026 API changes:
 *   - GET /artists/{id}/top-tracks → REMOVED (use /me/top/tracks for all users)
 *   - GET /tracks?ids=             → REMOVED (use GET /tracks/{id} per-track)
 *   - `popularity` field removed from track/artist objects
 */

import type { SocialConnection } from '@shared/schema';
import type {
  PlatformSyncService,
  AccountMetricsResult,
  ContentListResult,
  ContentMetricsResult,
} from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTrackToContentItem(track: any) {
  return {
    platformContentId: track.id,
    contentType: 'track' as const,
    title: track.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    description: `${track.artists?.map((a: any) => a.name).join(', ')} - ${track.album?.name}`,
    url: track.external_urls?.spotify,
    thumbnailUrl: track.album?.images?.[0]?.url,
    publishedAt: track.album?.release_date ? new Date(track.album.release_date) : undefined,
    rawData: { duration_ms: track.duration_ms },
  };
}

export class SpotifySyncService implements PlatformSyncService {
  platform = 'spotify';

  async syncAccountMetrics(
    userId: string,
    connection: SocialConnection
  ): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // GET /me is still available
      const profileRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        return { success: false, error: `HTTP ${profileRes.status}` };
      }

      const profile = await profileRes.json();

      // If user is also an artist, try to get artist profile
      // GET /artists/{id} is still available
      let artistFollowers = 0;
      let artistId = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileData = connection.profileData as any;
      if (profileData?.artistId) {
        artistId = profileData.artistId;
      }

      if (artistId) {
        try {
          const artistRes = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (artistRes.ok) {
            const artist = await artistRes.json();
            artistFollowers = artist.followers?.total || 0;
            // Note: `popularity` field removed in Feb 2026 API changes
          }
        } catch {
          /* ignore */
        }
      }

      return {
        success: true,
        data: {
          followers: artistFollowers || profile.followers?.total || 0,
          platformSpecific: {
            artistId,
          },
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SpotifySync] Account metrics error:', error);
      return { success: false, error: message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // GET /me/top/tracks is still available for all users.
      // The old GET /artists/{id}/top-tracks is REMOVED in Feb 2026.
      // Use /me/top/tracks for both artist and non-artist users.
      const topRes = await fetch(
        `${SPOTIFY_API_BASE}/me/top/tracks?time_range=short_term&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!topRes.ok) {
        return { success: true, items: [] };
      }

      const topData = await topRes.json();
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (topData.items || []).map((track: any) => mapTrackToContentItem(track)),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SpotifySync] Content list error:', error);
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

      // The batch endpoint GET /tracks?ids= is REMOVED in Feb 2026.
      // Fetch individual tracks via GET /tracks/{id} (still available).
      const metrics = [];
      for (const id of contentIds.slice(0, 20)) {
        try {
          const res = await fetch(`${SPOTIFY_API_BASE}/tracks/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const track = await res.json();
            metrics.push({
              platformContentId: track.id,
              platformSpecific: {
                duration_ms: track.duration_ms,
                explicit: track.explicit,
              },
            });
          }
        } catch {
          /* skip individual track errors */
        }
      }

      return { success: true, metrics };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SpotifySync] Content metrics error:', error);
      return { success: false, error: message };
    }
  }
}

export const spotifySync = new SpotifySyncService();
