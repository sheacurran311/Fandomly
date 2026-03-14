/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import type { Express, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { socialConnections, platformPointsTransactions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { platformPointsService } from '../../services/points/platform-points-service';
import {
  getAppleMusicDeveloperToken,
  isAppleMusicConfigured,
  appleMusicFetch,
} from '../../services/apple-music/apple-music-auth';

// Points awarded for connecting a social account
const SOCIAL_CONNECTION_POINTS = 500;

export function registerAppleMusicRoutes(app: Express) {
  // ==========================================================================
  // APPLE MUSIC ROUTES
  // ==========================================================================

  /**
   * GET /api/social/apple-music/developer-token
   * Returns a developer JWT for client-side MusicKit JS initialization.
   * No auth required — the developer token is a public project identifier.
   */
  app.get('/api/social/apple-music/developer-token', (req: Request, res: Response) => {
    try {
      if (!isAppleMusicConfigured()) {
        return res.status(503).json({ error: 'Apple Music is not configured' });
      }
      const token = getAppleMusicDeveloperToken();
      res.json({ token });
    } catch (error: any) {
      console.error('[Apple Music] Developer token error:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate developer token' });
    }
  });

  /**
   * POST /api/social/apple-music/connect
   * Saves the MusicKit user token after client-side authorization.
   * Body: { musicUserToken: string, userStorefront?: string }
   */
  app.post(
    '/api/social/apple-music/connect',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = (req as any).user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { musicUserToken, userStorefront } = req.body;
        if (!musicUserToken) {
          return res.status(400).json({ error: 'musicUserToken is required' });
        }

        // Verify the token works by fetching storefront
        const storefrontRes = await appleMusicFetch('/me/storefront', musicUserToken);
        let storefrontData: any = null;
        if (storefrontRes.ok) {
          storefrontData = await storefrontRes.json();
        }

        const storefront = storefrontData?.data?.[0];

        // Check for existing connection
        const existing = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'apple_music')
          ),
        });

        const connectionData = {
          accessToken: musicUserToken,
          refreshToken: null,
          tokenExpiresAt: null, // Apple MusicKit user tokens don't have a predictable expiry
          platformUserId: storefront?.id || userStorefront || 'unknown',
          platformUsername: storefront?.attributes?.name || 'Apple Music User',
          platformDisplayName: storefront?.attributes?.name || 'Apple Music User',
          profileData: {
            storefront: storefront?.id || userStorefront,
            storefrontName: storefront?.attributes?.name,
          },
          isActive: true,
          lastSyncedAt: new Date(),
        };

        let connection;
        let isNewConnection = false;

        if (existing) {
          [connection] = await db
            .update(socialConnections)
            .set(connectionData)
            .where(eq(socialConnections.id, existing.id))
            .returning();
        } else {
          isNewConnection = true;
          [connection] = await db
            .insert(socialConnections)
            .values({
              userId,
              platform: 'apple_music',
              ...connectionData,
              connectedAt: new Date(),
            })
            .returning();

          // Award points for new connection
          try {
            // Check if points were already awarded
            const existingReward = await db.query.platformPointsTransactions.findFirst({
              where: and(
                eq(platformPointsTransactions.userId, userId),
                eq(platformPointsTransactions.source, 'social_connection_reward'),
                sql`${platformPointsTransactions.metadata}->>'platform' = 'apple_music'`
              ),
            });

            if (!existingReward) {
              await platformPointsService.awardPoints(
                userId,
                SOCIAL_CONNECTION_POINTS,
                'social_connection_reward',
                { platform: 'apple_music', connectionId: connection.id }
              );
            }
          } catch (pointsErr) {
            console.warn('[Apple Music] Points award error (non-fatal):', pointsErr);
          }
        }

        console.log(
          `[Apple Music] ${isNewConnection ? 'Connected' : 'Updated'} for user ${userId}`
        );

        res.json({
          success: true,
          connection,
          isNewConnection,
          pointsAwarded: isNewConnection ? SOCIAL_CONNECTION_POINTS : 0,
        });
      } catch (error: any) {
        console.error('[Apple Music] Connect error:', error);
        res.status(500).json({ error: 'Failed to save Apple Music connection' });
      }
    }
  );

  /**
   * GET /api/social/apple-music/search/artists
   * Search Apple Music catalog for artists. Used by creators when setting up tasks.
   */
  app.get(
    '/api/social/apple-music/search/artists',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { query, storefront = 'us' } = req.query;
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'query parameter is required' });
        }

        const response = await appleMusicFetch(
          `/catalog/${storefront}/search?types=artists&term=${encodeURIComponent(query)}&limit=10`
        );

        if (!response.ok) {
          return res.status(response.status).json({ error: 'Apple Music search failed' });
        }

        const data = await response.json();
        const artists = (data.results?.artists?.data || []).map((a: any) => ({
          id: a.id,
          name: a.attributes?.name,
          url: a.attributes?.url,
          artwork: a.attributes?.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300'),
          genreNames: a.attributes?.genreNames,
        }));

        res.json({ results: artists });
      } catch (error: any) {
        console.error('[Apple Music] Artist search error:', error);
        res.status(500).json({ error: 'Failed to search artists' });
      }
    }
  );

  /**
   * GET /api/social/apple-music/search/songs
   * Search Apple Music catalog for songs.
   */
  app.get(
    '/api/social/apple-music/search/songs',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { query, storefront = 'us' } = req.query;
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'query parameter is required' });
        }

        const response = await appleMusicFetch(
          `/catalog/${storefront}/search?types=songs&term=${encodeURIComponent(query)}&limit=10`
        );

        if (!response.ok) {
          return res.status(response.status).json({ error: 'Apple Music search failed' });
        }

        const data = await response.json();
        const songs = (data.results?.songs?.data || []).map((s: any) => ({
          id: s.id,
          name: s.attributes?.name,
          artistName: s.attributes?.artistName,
          albumName: s.attributes?.albumName,
          url: s.attributes?.url,
          artwork: s.attributes?.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300'),
          durationInMillis: s.attributes?.durationInMillis,
        }));

        res.json({ results: songs });
      } catch (error: any) {
        console.error('[Apple Music] Song search error:', error);
        res.status(500).json({ error: 'Failed to search songs' });
      }
    }
  );

  /**
   * GET /api/social/apple-music/search/albums
   * Search Apple Music catalog for albums.
   */
  app.get(
    '/api/social/apple-music/search/albums',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { query, storefront = 'us' } = req.query;
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'query parameter is required' });
        }

        const response = await appleMusicFetch(
          `/catalog/${storefront}/search?types=albums&term=${encodeURIComponent(query)}&limit=10`
        );

        if (!response.ok) {
          return res.status(response.status).json({ error: 'Apple Music search failed' });
        }

        const data = await response.json();
        const albums = (data.results?.albums?.data || []).map((a: any) => ({
          id: a.id,
          name: a.attributes?.name,
          artistName: a.attributes?.artistName,
          url: a.attributes?.url,
          artwork: a.attributes?.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300'),
          trackCount: a.attributes?.trackCount,
          releaseDate: a.attributes?.releaseDate,
        }));

        res.json({ results: albums });
      } catch (error: any) {
        console.error('[Apple Music] Album search error:', error);
        res.status(500).json({ error: 'Failed to search albums' });
      }
    }
  );
}
