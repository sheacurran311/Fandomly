import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { socialConnections, syncPreferences } from '@shared/schema';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { platformPointsService } from '../../services/points/platform-points-service';

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
      where: eq(socialConnections.userId, userId),
    });

    // Return connections without sensitive tokens
    const sanitizedConnections = connections.map(conn => ({
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
        eq(socialConnections.platform, platform)
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
      }
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

    // Check if connection already exists
    const existingConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform)
      ),
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
    } else {
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

      // Award platform points for new social connection
      try {
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
        console.log(`[Social Connection] Awarded ${SOCIAL_CONNECTION_POINTS} points to user ${userId} for connecting ${platform}`);
      } catch (pointsError) {
        console.error(`[Social Connection] Error awarding points:`, pointsError);
        // Don't fail the connection if points award fails
      }

      // Auto-create sync preferences for new connection (enabled by default)
      try {
        const existingSyncPref = await db.query.syncPreferences.findFirst({
          where: and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platform)
          ),
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

    // Also sync to old storage system for backwards compatibility
    try {
      const { storage } = await import('../../core/storage');
      const { users } = await import('@shared/schema');
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (user && (user as any).dynamicUserId) {
        // Create accountData format expected by storage system
        // Note: Instagram stores followers as profileData.followers (plain number)
        const resolvedFollowers = profileData?.public_metrics?.followers_count || profileData?.follower_count || profileData?.followers_count || profileData?.followers?.total || (typeof profileData?.followers === 'number' ? profileData.followers : 0);
        const resolvedFollowing = profileData?.public_metrics?.following_count || profileData?.following_count || (typeof profileData?.following === 'number' ? profileData.following : 0);
        const accountData = {
          user: {
            id: platformUserId,
            username: platformUsername,
            name: platformDisplayName,
            followersCount: resolvedFollowers,
            followingCount: resolvedFollowing,
            ...profileData
          },
          id: platformUserId,
          username: platformUsername,
          name: platformDisplayName,
          displayName: platformDisplayName,
          followersCount: resolvedFollowers,
          followingCount: resolvedFollowing,
        };
        await storage.saveSocialAccount((user as any).dynamicUserId, platform, accountData);
        console.log(`[Social Connection POST] Also saved ${platform} to old storage system`);
      }
    } catch (syncError) {
      console.error(`[Social Connection POST] Error syncing to old storage system:`, syncError);
      // Don't fail the request if sync fails
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
      pointsAwarded: !existingConnection ? SOCIAL_CONNECTION_POINTS : 0,
      isNewConnection: !existingConnection,
    });
  } catch (error) {
    console.error('Error saving social connection:', error);
    res.status(500).json({ error: 'Failed to save social connection' });
  }
});

/**
 * POST /api/social-connections/disconnect
 * Disconnect a social platform (supports both JWT and x-dynamic-user-id auth)
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

    // Remove from socialConnections table (primary - source of truth)
    await db
      .delete(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, platformLower)
        )
      );

    // Disable sync preferences (keep record for audit, just disable)
    try {
      await db
        .update(syncPreferences)
        .set({ syncEnabled: false, nextSyncAt: null, syncStatus: 'idle' })
        .where(
          and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platformLower)
          )
        );
    } catch (syncPrefError) {
      console.error(`[Social Disconnect] Error updating sync preferences:`, syncPrefError);
    }

    // Also remove from old storage system for consistency
    try {
      const { storage } = await import('../../core/storage');
      const { users } = await import('@shared/schema');
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (user && (user as any).dynamicUserId) {
        await storage.removeSocialAccount((user as any).dynamicUserId, platformLower);
        console.log(`[Social Disconnect] Also removed ${platformLower} from old storage system`);
      }
    } catch (syncError) {
      console.error(`[Social Disconnect] Error removing from old storage system:`, syncError);
      // Don't fail - socialConnections table is the source of truth
    }

    console.log(`[Social Disconnect] Successfully disconnected ${platformLower} for user ${userId}`);
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

    // Remove from socialConnections table
    await db
      .delete(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, platform)
        )
      );

    // Also remove from old storage system for consistency
    try {
      const { storage } = await import('../../core/storage');
      const { users } = await import('@shared/schema');
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (user && (user as any).dynamicUserId) {
        await storage.removeSocialAccount((user as any).dynamicUserId, platform);
        console.log(`[Social Connection DELETE] Also removed ${platform} from old storage system`);
      }
    } catch (syncError) {
      console.error(`[Social Connection DELETE] Error removing from old storage system:`, syncError);
      // Don't fail the request if sync fails
    }

    res.json({ success: true, message: `${platform} disconnected successfully` });
  } catch (error) {
    console.error('Error disconnecting social connection:', error);
    res.status(500).json({ error: 'Failed to disconnect social connection' });
  }
});

export default router;
