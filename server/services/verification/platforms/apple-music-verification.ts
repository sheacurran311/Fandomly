/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Apple Music Verification Service
 *
 * T1 (API) Verification for Apple Music tasks using the user's library endpoints.
 *
 * Apple Music API library endpoints:
 *   GET /v1/me/library/artists?filter[catalogId]=xxx  -- check artist in library
 *   GET /v1/me/library/songs?filter[catalogId]=xxx    -- check track in library
 *   GET /v1/me/library/albums?filter[catalogId]=xxx   -- check album in library
 *   GET /v1/me/library/playlists                      -- check playlist (iterate)
 *
 * All requests require:
 *   - Authorization: Bearer <developer-token>
 *   - Music-User-Token: <user-token>
 *
 * Apple Music user tokens do NOT have refresh tokens. If expired, the user
 * must re-authorize via MusicKit JS on the client.
 */

import { db } from '@db';
import { socialConnections } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { appleMusicFetch } from '../../apple-music/apple-music-auth';

export interface AppleMusicVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AppleMusicVerificationParams {
  fanUserId: string;
  taskType: string;
  taskSettings: {
    artistId?: string;
    trackId?: string;
    albumId?: string;
    playlistId?: string;
  };
}

class AppleMusicVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: AppleMusicVerificationParams): Promise<AppleMusicVerificationResult> {
    const { fanUserId, taskType, taskSettings } = params;

    try {
      // Get fan's Apple Music connection
      const fanConnection = await this.getFanAppleMusicConnection(fanUserId);

      if (!fanConnection || !fanConnection.accessToken) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'Fan has not connected their Apple Music account',
          metadata: { requiresAppleMusicConnection: true },
        };
      }

      // Route to specific verification
      switch (taskType) {
        case 'apple_music_favorite_artist':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'artists',
            taskSettings.artistId,
            'Artist library add'
          );

        case 'apple_music_add_track':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'songs',
            taskSettings.trackId,
            'Track library add'
          );

        case 'apple_music_add_album':
          return await this.verifyLibraryContains(
            fanConnection.accessToken,
            'albums',
            taskSettings.albumId,
            'Album library add'
          );

        case 'apple_music_add_playlist':
          return await this.verifyPlaylistInLibrary(
            fanConnection.accessToken,
            taskSettings.playlistId,
            'Playlist library add'
          );

        case 'apple_music_listen':
          // T2 — requires manual review, no API for play history
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: 'Listen verification requires manual review',
            metadata: {
              verificationTier: 'T2',
              verificationMethod: 'manual',
              trackId: taskSettings.trackId,
            },
          };

        default:
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: `Unknown Apple Music task type: ${taskType}`,
          };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Apple Music verification failed';
      console.error('[AppleMusicVerification] Error:', error);
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
   * Verify an item exists in the user's Apple Music library via catalogId filter.
   *
   * Apple Music library endpoints support filter[catalogId] for artists, songs, and albums.
   * Returns data.data array — non-empty means the item is in the library.
   */
  private async verifyLibraryContains(
    userToken: string,
    resourceType: 'artists' | 'songs' | 'albums',
    catalogId: string | undefined,
    label: string
  ): Promise<AppleMusicVerificationResult> {
    if (!catalogId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `No ${resourceType} ID provided`,
      };
    }

    const response = await appleMusicFetch(
      `/me/library/${resourceType}?filter[catalogId]=${encodeURIComponent(catalogId)}`,
      userToken
    );

    if (response.status === 401 || response.status === 403) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Apple Music token expired. Please reconnect your Apple Music account.',
        metadata: { tokenExpired: true },
      };
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[AppleMusicVerification] ${label} check failed:`, error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `Failed to check ${label.toLowerCase()} status`,
        metadata: { apiError: error },
      };
    }

    const data = await response.json();
    const isInLibrary = Array.isArray(data.data) && data.data.length > 0;

    return {
      verified: isInLibrary,
      requiresManualReview: false,
      confidence: 'high',
      reason: isInLibrary ? `${label} verified via API` : `${label} not confirmed`,
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        catalogId,
        resourceType,
        isInLibrary,
      },
    };
  }

  /**
   * Verify a playlist is in the user's Apple Music library.
   *
   * Apple Music library playlists do NOT support filter[catalogId],
   * so we fetch the list and check for a matching catalog playlist ID
   * in the attributes or relationships.
   */
  private async verifyPlaylistInLibrary(
    userToken: string,
    playlistId: string | undefined,
    label: string
  ): Promise<AppleMusicVerificationResult> {
    if (!playlistId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No playlist ID provided',
      };
    }

    // Fetch user's library playlists (paginate up to 100)
    const response = await appleMusicFetch(`/me/library/playlists?limit=100`, userToken);

    if (response.status === 401 || response.status === 403) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Apple Music token expired. Please reconnect your Apple Music account.',
        metadata: { tokenExpired: true },
      };
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[AppleMusicVerification] ${label} check failed:`, error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `Failed to check ${label.toLowerCase()} status`,
        metadata: { apiError: error },
      };
    }

    const data = await response.json();
    const playlists = data.data || [];

    // Check if any library playlist has a matching catalog ID
    const found = playlists.some(
      (p: any) =>
        p.attributes?.playParams?.catalogId === playlistId ||
        p.attributes?.playParams?.globalId === playlistId ||
        p.id === playlistId
    );

    return {
      verified: found,
      requiresManualReview: false,
      confidence: found ? 'high' : 'medium',
      reason: found ? `${label} verified via API` : `${label} not confirmed`,
      metadata: {
        verificationTier: 'T1',
        verificationMethod: 'api',
        playlistId,
        isInLibrary: found,
      },
    };
  }

  /**
   * Get fan's Apple Music connection
   */
  private async getFanAppleMusicConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'apple_music'),
        eq(socialConnections.isActive, true)
      ),
    });
  }
}

// Export singleton
export const appleMusicVerification = new AppleMusicVerificationService();
