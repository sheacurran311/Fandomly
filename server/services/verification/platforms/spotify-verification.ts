/**
 * Spotify Verification Service
 * 
 * T1 (API) Verification for Spotify tasks:
 * - Artist follows: GET /v1/me/following/contains?type=artist&ids={artistId}
 * - Playlist follows: GET /v1/playlists/{id}/followers/contains?ids={userId}
 * - Saved tracks: GET /v1/me/tracks/contains?ids={trackId}
 * - Saved albums: GET /v1/me/albums/contains?ids={albumId}
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
  metadata?: Record<string, any>;
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
            reason: 'Failed to refresh Spotify access token. Please reconnect your Spotify account.',
            metadata: { tokenRefreshFailed: true },
          };
        }
      }

      // Route to specific verification method
      switch (taskType) {
        case 'spotify_follow':
          return await this.verifyArtistFollow(fanConnection.accessToken, taskSettings.artistId);
          
        case 'spotify_playlist':
          return await this.verifyPlaylistFollow(
            fanConnection.accessToken, 
            fanConnection.platformUserId,
            taskSettings.playlistId
          );
          
        case 'spotify_save_track':
          return await this.verifySavedTrack(fanConnection.accessToken, taskSettings.trackId);
          
        case 'spotify_album':
        case 'spotify_save_album':
          return await this.verifySavedAlbum(fanConnection.accessToken, taskSettings.albumId);
          
        default:
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: `Unknown Spotify task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      console.error('[SpotifyVerification] Error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: error.message || 'Spotify verification failed',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify artist follow
   * API: GET /v1/me/following/contains?type=artist&ids={artistId}
   */
  async verifyArtistFollow(accessToken: string, artistId?: string): Promise<SpotifyVerificationResult> {
    if (!artistId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No artist ID provided',
      };
    }

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following/contains?type=artist&ids=${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SpotifyVerification] Artist follow check failed:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Failed to check artist follow status',
        metadata: { apiError: error },
      };
    }

    const [isFollowing] = await response.json();
    
    return {
      verified: isFollowing === true,
      requiresManualReview: false,
      confidence: 'high',
      reason: isFollowing ? 'Artist follow verified via API' : 'Not following the artist',
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        artistId,
        isFollowing,
      },
    };
  }

  /**
   * Verify playlist follow
   * API: GET /v1/playlists/{id}/followers/contains?ids={userId}
   */
  async verifyPlaylistFollow(
    accessToken: string, 
    fanSpotifyUserId: string | null,
    playlistId?: string
  ): Promise<SpotifyVerificationResult> {
    if (!playlistId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No playlist ID provided',
      };
    }

    if (!fanSpotifyUserId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Fan Spotify user ID not available',
      };
    }

    const response = await fetch(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/followers/contains?ids=${fanSpotifyUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SpotifyVerification] Playlist follow check failed:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Failed to check playlist follow status',
        metadata: { apiError: error },
      };
    }

    const [isFollowing] = await response.json();
    
    return {
      verified: isFollowing === true,
      requiresManualReview: false,
      confidence: 'high',
      reason: isFollowing ? 'Playlist follow verified via API' : 'Not following the playlist',
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        playlistId,
        isFollowing,
      },
    };
  }

  /**
   * Verify saved track
   * API: GET /v1/me/tracks/contains?ids={trackId}
   */
  async verifySavedTrack(accessToken: string, trackId?: string): Promise<SpotifyVerificationResult> {
    if (!trackId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No track ID provided',
      };
    }

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/tracks/contains?ids=${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SpotifyVerification] Saved track check failed:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Failed to check saved track status',
        metadata: { apiError: error },
      };
    }

    const [isSaved] = await response.json();
    
    return {
      verified: isSaved === true,
      requiresManualReview: false,
      confidence: 'high',
      reason: isSaved ? 'Track save verified via API' : 'Track not saved',
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        trackId,
        isSaved,
      },
    };
  }

  /**
   * Verify saved album
   * API: GET /v1/me/albums/contains?ids={albumId}
   */
  async verifySavedAlbum(accessToken: string, albumId?: string): Promise<SpotifyVerificationResult> {
    if (!albumId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No album ID provided',
      };
    }

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/albums/contains?ids=${albumId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SpotifyVerification] Saved album check failed:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Failed to check saved album status',
        metadata: { apiError: error },
      };
    }

    const [isSaved] = await response.json();
    
    return {
      verified: isSaved === true,
      requiresManualReview: false,
      confidence: 'high',
      reason: isSaved ? 'Album save verified via API' : 'Album not saved',
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        albumId,
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
        eq(socialConnections.isActive, true),
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
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
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
