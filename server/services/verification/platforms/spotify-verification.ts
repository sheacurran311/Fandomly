/**
 * Spotify Verification Service
 *
 * T1 (API) Verification for Spotify tasks using the unified library/contains endpoint.
 *
 * As of Spotify's February 2026 API changes, all per-type /contains endpoints are removed:
 *   - GET /me/following/contains          → REMOVED
 *   - GET /playlists/{id}/followers/contains → REMOVED
 *   - GET /me/tracks/contains             → REMOVED
 *   - GET /me/albums/contains             → REMOVED
 *
 * Replaced by a single unified endpoint:
 *   GET /me/library/contains?uris=spotify:artist:xxx,spotify:track:yyy
 *
 * Supports: tracks, albums, episodes, shows, audiobooks, artists, users, playlists
 * Scopes required: user-library-read, user-follow-read, playlist-read-private
 * Max 40 URIs per request.
 */

import { db } from '@db';
import { socialConnections } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

// Spotify API base URL
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SpotifyVerificationParams {
  fanUserId: string;
  taskType: string;
  taskSettings: {
    artistId?: string;
    playlistId?: string;
    trackId?: string;
    albumId?: string;
    creatorUserId?: string;
  };
}

class SpotifyVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: SpotifyVerificationParams): Promise<SpotifyVerificationResult> {
    const { fanUserId, taskType, taskSettings } = params;

    try {
      // Get fan's Spotify connection
      const fanConnection = await this.getFanSpotifyConnection(fanUserId);

      if (!fanConnection || !fanConnection.accessToken) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'Fan has not connected their Spotify account',
          metadata: { requiresSpotifyConnection: true },
        };
      }

      // Check if token needs refresh
      if (this.isTokenExpired(fanConnection.tokenExpiresAt)) {
        const refreshed = await this.refreshAccessToken(fanConnection);
        if (!refreshed) {
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason:
              'Failed to refresh Spotify access token. Please reconnect your Spotify account.',
            metadata: { tokenRefreshFailed: true },
          };
        }
      }

      // Route to specific verification — all use the unified /me/library/contains endpoint
      switch (taskType) {
        case 'spotify_follow':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'artist',
            taskSettings.artistId,
            'Artist follow'
          );

        case 'spotify_playlist':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'playlist',
            taskSettings.playlistId,
            'Playlist save'
          );

        case 'spotify_save_track':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'track',
            taskSettings.trackId,
            'Track save'
          );

        case 'spotify_album':
        case 'spotify_save_album':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'album',
            taskSettings.albumId,
            'Album save'
          );

        default:
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: `Unknown Spotify task type: ${taskType}`,
          };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Spotify verification failed';
      console.error('[SpotifyVerification] Error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: message,
        metadata: { error: message },
      };
    }
  }

  /**
   * Unified verification via GET /me/library/contains
   *
   * This single endpoint replaces the four legacy per-type /contains endpoints.
   * It accepts Spotify URIs (spotify:artist:xxx, spotify:track:yyy, etc.)
   * and returns an array of booleans.
   */
  private async verifyLibraryContains(
    accessToken: string,
    itemType: 'artist' | 'track' | 'album' | 'playlist',
    itemId: string | undefined,
    label: string
  ): Promise<SpotifyVerificationResult> {
    if (!itemId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `No ${itemType} ID provided`,
      };
    }

    const uri = `spotify:${itemType}:${itemId}`;
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/library/contains?uris=${encodeURIComponent(uri)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[SpotifyVerification] ${label} check failed:`, error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `Failed to check ${label.toLowerCase()} status`,
        metadata: { apiError: error },
      };
    }

    const [isSaved] = await response.json();

    return {
      verified: isSaved === true,
      requiresManualReview: false,
      confidence: 'high',
      reason: isSaved ? `${label} verified via API` : `${label} not confirmed`,
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        [`${itemType}Id`]: itemId,
        uri,
        isSaved,
      },
    };
  }

  /**
   * Get fan's Spotify connection
   */
  private async getFanSpotifyConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'spotify'),
        eq(socialConnections.isActive, true)
      ),
    });
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    // Add 5 minute buffer
    return new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000;
  }

  /**
   * Refresh access token
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async refreshAccessToken(connection: any): Promise<boolean> {
    if (!connection.refreshToken) {
      return false;
    }

    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('[SpotifyVerification] Missing Spotify credentials');
        return false;
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
        }),
      });

      if (!response.ok) {
        console.error('[SpotifyVerification] Token refresh failed:', await response.text());
        return false;
      }

      const data = await response.json();

      // Update connection with new tokens
      await db
        .update(socialConnections)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, connection.id));

      return true;
    } catch (error) {
      console.error('[SpotifyVerification] Token refresh error:', error);
      return false;
    }
  }
}

// Export singleton
export const spotifyVerification = new SpotifyVerificationService();
