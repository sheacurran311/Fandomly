/**
 * Spotify Sync Service
 * 
 * Syncs artist profile and top tracks from Spotify Web API.
 * Note: Spotify for Artists analytics are NOT exposed via public API.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export class SpotifySyncService implements PlatformSyncService {
  platform = 'spotify';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get current user profile
      const profileRes = await fetch(
        `${SPOTIFY_API_BASE}/me`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!profileRes.ok) {
        return { success: false, error: `HTTP ${profileRes.status}` };
      }

      const profile = await profileRes.json();

      // If user is also an artist, try to get artist profile
      let artistFollowers = 0;
      let popularity = 0;
      let artistId = '';
      
      // Check if profile data has an artist ID
      const profileData = connection.profileData as any;
      if (profileData?.artistId) {
        artistId = profileData.artistId;
      }

      if (artistId) {
        try {
          const artistRes = await fetch(
            `${SPOTIFY_API_BASE}/artists/${artistId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );
          if (artistRes.ok) {
            const artist = await artistRes.json();
            artistFollowers = artist.followers?.total || 0;
            popularity = artist.popularity || 0;
          }
        } catch { /* ignore */ }
      }

      return {
        success: true,
        data: {
          followers: artistFollowers || profile.followers?.total || 0,
          platformSpecific: {
            product: profile.product, // 'premium', 'free', etc.
            country: profile.country,
            popularity,
            artistId,
          },
        },
      };
    } catch (error: any) {
      console.error('[SpotifySync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      const profileData = connection.profileData as any;
      const artistId = profileData?.artistId;

      if (!artistId) {
        // Non-artist users: get their top tracks as content
        const topRes = await fetch(
          `${SPOTIFY_API_BASE}/me/top/tracks?time_range=short_term&limit=20`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        
        if (!topRes.ok) {
          return { success: true, items: [] };
        }

        const topData = await topRes.json();
        return {
          success: true,
          items: (topData.items || []).map((track: any) => ({
            platformContentId: track.id,
            contentType: 'track',
            title: track.name,
            description: `${track.artists?.map((a: any) => a.name).join(', ')} - ${track.album?.name}`,
            url: track.external_urls?.spotify,
            thumbnailUrl: track.album?.images?.[0]?.url,
            publishedAt: track.album?.release_date ? new Date(track.album.release_date) : undefined,
            rawData: { popularity: track.popularity, duration_ms: track.duration_ms },
          })),
        };
      }

      // Artist: get top tracks
      const topTracksRes = await fetch(
        `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!topTracksRes.ok) {
        return { success: true, items: [] };
      }

      const data = await topTracksRes.json();

      return {
        success: true,
        items: (data.tracks || []).map((track: any) => ({
          platformContentId: track.id,
          contentType: 'track',
          title: track.name,
          description: `${track.artists?.map((a: any) => a.name).join(', ')} - ${track.album?.name}`,
          url: track.external_urls?.spotify,
          thumbnailUrl: track.album?.images?.[0]?.url,
          publishedAt: track.album?.release_date ? new Date(track.album.release_date) : undefined,
          rawData: { popularity: track.popularity, duration_ms: track.duration_ms },
        })),
      };
    } catch (error: any) {
      console.error('[SpotifySync] Content list error:', error);
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

      const ids = contentIds.slice(0, 50).join(',');
      const res = await fetch(
        `${SPOTIFY_API_BASE}/tracks?ids=${ids}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        return { success: false, error: 'Failed to fetch tracks' };
      }

      const data = await res.json();

      return {
        success: true,
        metrics: (data.tracks || []).map((track: any) => ({
          platformContentId: track.id,
          platformSpecific: {
            popularity: track.popularity,
            duration_ms: track.duration_ms,
            explicit: track.explicit,
          },
        })),
      };
    } catch (error: any) {
      console.error('[SpotifySync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const spotifySync = new SpotifySyncService();
