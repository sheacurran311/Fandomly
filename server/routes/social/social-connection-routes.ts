import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  socialConnections,
  syncPreferences,
  platformPointsTransactions,
  users,
} from '@shared/schema';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { platformPointsService } from '../../services/points/platform-points-service';
import { onReputationSignalChanged } from '../../services/reputation/reputation-event-handler';
import { getSocialMultiplierService } from '../../services/social/social-multiplier-service';
import { enforceSubscriptionLimitForUser } from '../../services/subscription-limit-service';

const router = Router();

// Points awarded for connecting a social account
const SOCIAL_CONNECTION_POINTS = 500;

/**
 * GET /api/social-connections
 * Get all social connections for the authenticated user
 */
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const connections = await db.query.socialConnections.findMany({
      where: and(eq(socialConnections.userId, userId), eq(socialConnections.isActive, true)),
    });

    // Return connections without sensitive tokens
    const sanitizedConnections = connections.map((conn) => ({
      id: conn.id,
      platform: conn.platform,
      platformUserId: conn.platformUserId,
      platformUsername: conn.platformUsername,
      platformDisplayName: conn.platformDisplayName,
      profileData: conn.profileData,
      connectedAt: conn.connectedAt,
      lastSyncedAt: conn.lastSyncedAt,
      isActive: conn.isActive,
    }));

    res.json({ connections: sanitizedConnections });
  } catch (error) {
    console.error('Error fetching social connections:', error);
    res.status(500).json({ error: 'Failed to fetch social connections' });
  }
});

/**
 * GET /api/social-connections/:platform
 * Get a specific platform connection for the authenticated user
 */
router.get('/:platform', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const platform = req.params.platform;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const connection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.isActive, true)
      ),
    });

    if (!connection) {
      return res.json({ connected: false });
    }

    // Return connection without sensitive tokens
    res.json({
      connected: true,
      connection: {
        id: connection.id,
        platform: connection.platform,
        platformUserId: connection.platformUserId,
        platformUsername: connection.platformUsername,
        platformDisplayName: connection.platformDisplayName,
        profileData: connection.profileData,
        connectedAt: connection.connectedAt,
        lastSyncedAt: connection.lastSyncedAt,
        isActive: connection.isActive,
      },
    });
  } catch (error) {
    console.error('Error fetching social connection:', error);
    res.status(500).json({ error: 'Failed to fetch social connection' });
  }
});

/**
 * POST /api/social-connections
 * Create or update a social connection
 */
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const {
      platform,
      platformUserId,
      platformUsername,
      platformDisplayName,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      profileData,
    } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    let pointsActuallyAwarded = 0;

    // Check if connection already exists
    const existingConnection = await db.query.socialConnections.findFirst({
      where: and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platform)),
    });

    let savedConnection;
    if (existingConnection) {
      // Update existing connection
      const [updated] = await db
        .update(socialConnections)
        .set({
          platformUserId,
          platformUsername,
          platformDisplayName,
          accessToken,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          profileData,
          lastSyncedAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, existingConnection.id))
        .returning();

      savedConnection = updated;

      // Notify reputation system of reconnection (non-blocking)
      onReputationSignalChanged(userId, 'socialConnections');

      // Update social multiplier on FanStaking contract (non-blocking)
      const multiplierService = getSocialMultiplierService();
      if (multiplierService) {
        multiplierService.syncUserMultiplier(userId).catch((err) => {
          console.error(`[Social Connection] Failed to sync multiplier for user ${userId}:`, err);
        });
      }
    } else {
      // Check subscription limit for new social connections (creators only)
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user?.currentTenantId) {
        try {
          await enforceSubscriptionLimitForUser(
            user.currentTenantId,
            'socialConnections',
            req.user?.role
          );
        } catch (limitErr: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((limitErr as any).code === 'LIMIT_EXCEEDED') {
            return res.status(403).json({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              error: (limitErr as any).message,
              code: 'LIMIT_EXCEEDED',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              details: (limitErr as any).details,
            });
          }
          throw limitErr;
        }
      }

      // Create new connection
      const [newConnection] = await db
        .insert(socialConnections)
        .values({
          userId,
          platform,
          platformUserId,
          platformUsername,
          platformDisplayName,
          accessToken,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          profileData,
          lastSyncedAt: new Date(),
          isActive: true,
        })
        .returning();

      savedConnection = newConnection;

      // Notify reputation system of new connection (non-blocking)
      onReputationSignalChanged(userId, 'socialConnections');

      // Update social multiplier on FanStaking contract (non-blocking)
      const multiplierService = getSocialMultiplierService();
      if (multiplierService) {
        multiplierService.syncUserMultiplier(userId).catch((err) => {
          console.error(`[Social Connection] Failed to sync multiplier for user ${userId}:`, err);
        });
      }

      // Award platform points for new social connection (one-time per platform)
      // Check transaction history to prevent exploit via disconnect/reconnect
      try {
        const existingReward = await db.query.platformPointsTransactions.findFirst({
          where: and(
            eq(platformPointsTransactions.userId, userId),
            eq(platformPointsTransactions.source, 'social_connection_reward'),
            sql`metadata->>'platform' = ${platform}`
          ),
        });

        if (!existingReward) {
          await platformPointsService.awardPoints(
            userId,
            SOCIAL_CONNECTION_POINTS,
            'social_connection_reward',
            {
              platform,
              platformUsername,
              connectionId: newConnection.id,
            }
          );
          pointsActuallyAwarded = SOCIAL_CONNECTION_POINTS;
          console.log(
            `[Social Connection] Awarded ${SOCIAL_CONNECTION_POINTS} points to user ${userId} for connecting ${platform}`
          );
        } else {
          console.log(
            `[Social Connection] User ${userId} already received points for ${platform} - skipping (disconnect/reconnect protection)`
          );
        }
      } catch (pointsError) {
        console.error(`[Social Connection] Error awarding points:`, pointsError);
        // Don't fail the connection if points award fails
      }

      // Auto-create sync preferences for new connection (enabled by default)
      try {
        const existingSyncPref = await db.query.syncPreferences.findFirst({
          where: and(eq(syncPreferences.userId, userId), eq(syncPreferences.platform, platform)),
        });
        if (!existingSyncPref) {
          await db.insert(syncPreferences).values({
            userId,
            platform,
            syncEnabled: true,
            syncFrequencyMinutes: 60,
            nextSyncAt: new Date(Date.now() + 5 * 60 * 1000), // First sync in 5 minutes
            syncStatus: 'idle',
          });
          console.log(`[Social Connection] Created sync preference for ${platform} user ${userId}`);
        }
      } catch (syncPrefError) {
        console.error(`[Social Connection] Error creating sync preference:`, syncPrefError);
        // Don't fail the connection if sync pref creation fails
      }
    }

    return res.json({
      success: true,
      connection: {
        id: savedConnection.id,
        platform: savedConnection.platform,
        platformUsername: savedConnection.platformUsername,
        platformDisplayName: savedConnection.platformDisplayName,
        profileData: savedConnection.profileData,
      },
      pointsAwarded: pointsActuallyAwarded,
      isNewConnection: !existingConnection,
    });
  } catch (error) {
    console.error('Error saving social connection:', error);
    res.status(500).json({ error: 'Failed to save social connection' });
  }
});

/**
 * POST /api/social-connections/disconnect
 * Disconnect a social platform
 * Use this when platform is in request body - consistent with profile/fan pages
 */
router.post('/disconnect', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { platform } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: 'platform is required in request body' });
    }

    const platformLower = platform.toLowerCase();

    // Soft-delete: mark inactive instead of removing (preserves history for limit counting)
    await db
      .update(socialConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platformLower))
      );

    // Disable sync preferences (keep record for audit, just disable)
    try {
      await db
        .update(syncPreferences)
        .set({ syncEnabled: false, nextSyncAt: null, syncStatus: 'idle' })
        .where(
          and(eq(syncPreferences.userId, userId), eq(syncPreferences.platform, platformLower))
        );
    } catch (syncPrefError) {
      console.error(`[Social Disconnect] Error updating sync preferences:`, syncPrefError);
    }

    // Update social multiplier on FanStaking contract (non-blocking)
    const multiplierService = getSocialMultiplierService();
    if (multiplierService) {
      multiplierService.syncUserMultiplier(userId).catch((err) => {
        console.error(`[Social Disconnect] Failed to sync multiplier for user ${userId}:`, err);
      });
    }

    console.log(
      `[Social Disconnect] Successfully disconnected ${platformLower} for user ${userId}`
    );
    res.json({ success: true, message: `${platformLower} account disconnected successfully` });
  } catch (error) {
    console.error('Error disconnecting social connection:', error);
    res.status(500).json({ error: 'Failed to disconnect social connection' });
  }
});

/**
 * DELETE /api/social-connections/:platform
 * Disconnect a social platform
 */
router.delete('/:platform', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const platform = req.params.platform;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Soft-delete: mark inactive instead of removing (preserves history for limit counting)
    await db
      .update(socialConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platform)));

    // Update social multiplier on FanStaking contract (non-blocking)
    const multiplierService = getSocialMultiplierService();
    if (multiplierService) {
      multiplierService.syncUserMultiplier(userId).catch((err) => {
        console.error(`[Social Disconnect] Failed to sync multiplier for user ${userId}:`, err);
      });
    }

    res.json({ success: true, message: `${platform} disconnected successfully` });
  } catch (error) {
    console.error('Error disconnecting social connection:', error);
    res.status(500).json({ error: 'Failed to disconnect social connection' });
  }
});

/**
 * POST /api/social-connections/instagram/handle
 * Save Instagram handle for fans (no OAuth required)
 * Instagram API only supports Business accounts, so fans provide their handle manually
 */
router.post('/instagram/handle', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    let { handle } = req.body;

    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Instagram handle is required' });
    }

    // Strip leading @ if present
    handle = handle.trim();
    if (handle.startsWith('@')) {
      handle = handle.substring(1);
    }

    // Validate Instagram handle format: 1-30 characters, alphanumeric + underscores + periods
    const instagramHandleRegex = /^[a-zA-Z0-9._]{1,30}$/;
    if (!instagramHandleRegex.test(handle)) {
      return res.status(400).json({
        error:
          'Invalid Instagram handle. Must be 1-30 characters with only letters, numbers, underscores, and periods.',
      });
    }

    let pointsActuallyAwarded = 0;

    // Check if connection already exists
    const existingConnection = await db.query.socialConnections.findFirst({
      where: and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'instagram')),
    });

    let savedConnection;
    if (existingConnection) {
      // Update existing connection
      const [updated] = await db
        .update(socialConnections)
        .set({
          platformUsername: handle,
          platformDisplayName: handle,
          platformUserId: handle, // Use handle as ID since we don't have OAuth
          lastSyncedAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, existingConnection.id))
        .returning();

      savedConnection = updated;

      // Notify reputation system of reconnection (non-blocking)
      onReputationSignalChanged(userId, 'socialConnections');

      // Update social multiplier on FanStaking contract (non-blocking)
      const multiplierService = getSocialMultiplierService();
      if (multiplierService) {
        multiplierService.syncUserMultiplier(userId).catch((err) => {
          console.error(`[Social Connection] Failed to sync multiplier for user ${userId}:`, err);
        });
      }
    } else {
      // Create new connection
      const [newConnection] = await db
        .insert(socialConnections)
        .values({
          userId,
          platform: 'instagram',
          platformUserId: handle, // Use handle as ID since we don't have OAuth
          platformUsername: handle,
          platformDisplayName: handle,
          lastSyncedAt: new Date(),
          isActive: true,
        })
        .returning();

      savedConnection = newConnection;

      // Notify reputation system of new connection (non-blocking)
      onReputationSignalChanged(userId, 'socialConnections');

      // Update social multiplier on FanStaking contract (non-blocking)
      const multiplierService = getSocialMultiplierService();
      if (multiplierService) {
        multiplierService.syncUserMultiplier(userId).catch((err) => {
          console.error(`[Social Connection] Failed to sync multiplier for user ${userId}:`, err);
        });
      }

      // Award platform points for new social connection (one-time per platform)
      try {
        const existingReward = await db.query.platformPointsTransactions.findFirst({
          where: and(
            eq(platformPointsTransactions.userId, userId),
            eq(platformPointsTransactions.source, 'social_connection_reward'),
            sql`metadata->>'platform' = 'instagram'`
          ),
        });

        if (!existingReward) {
          await platformPointsService.awardPoints(
            userId,
            SOCIAL_CONNECTION_POINTS,
            'social_connection_reward',
            {
              platform: 'instagram',
              platformUsername: handle,
              connectionId: newConnection.id,
            }
          );
          pointsActuallyAwarded = SOCIAL_CONNECTION_POINTS;
          console.log(
            `[Social Connection] Awarded ${SOCIAL_CONNECTION_POINTS} points to user ${userId} for connecting instagram`
          );
        } else {
          console.log(
            `[Social Connection] User ${userId} already received points for instagram - skipping (disconnect/reconnect protection)`
          );
        }
      } catch (pointsError) {
        console.error(`[Social Connection] Error awarding points:`, pointsError);
        // Don't fail the connection if points award fails
      }

      // Auto-create sync preferences for new connection (disabled for manual handles)
      try {
        const existingSyncPref = await db.query.syncPreferences.findFirst({
          where: and(eq(syncPreferences.userId, userId), eq(syncPreferences.platform, 'instagram')),
        });
        if (!existingSyncPref) {
          await db.insert(syncPreferences).values({
            userId,
            platform: 'instagram',
            syncEnabled: false, // Disabled for manual handles
            syncFrequencyMinutes: 60,
            syncStatus: 'idle',
          });
          console.log(`[Social Connection] Created sync preference for instagram user ${userId}`);
        }
      } catch (syncPrefError) {
        console.error(`[Social Connection] Error creating sync preference:`, syncPrefError);
        // Don't fail the connection if sync pref creation fails
      }
    }

    return res.json({
      success: true,
      connection: {
        id: savedConnection.id,
        platform: savedConnection.platform,
        platformUsername: savedConnection.platformUsername,
        platformDisplayName: savedConnection.platformDisplayName,
        profileData: savedConnection.profileData,
      },
      pointsAwarded: pointsActuallyAwarded,
      isNewConnection: !existingConnection,
    });
  } catch (error) {
    console.error('Error saving Instagram handle:', error);
    res.status(500).json({ error: 'Failed to save Instagram handle' });
  }
});

export default router;
