import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { socialConnections } from '@shared/schema';
import { authenticateUser, AuthenticatedRequest } from './middleware/rbac';

const router = Router();

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
    }

    // Also sync to old storage system for backwards compatibility
    try {
      const { storage } = await import('./storage');
      const user = await db.query.users.findFirst({
        where: eq(socialConnections.userId, userId)
      });
      if (user && (user as any).dynamicUserId) {
        // Create accountData format expected by storage system
        const accountData = {
          user: {
            id: platformUserId,
            username: platformUsername,
            name: platformDisplayName,
            ...profileData
          },
          id: platformUserId,
          username: platformUsername,
          name: platformDisplayName,
          displayName: platformDisplayName,
          followersCount: profileData?.follower_count || profileData?.followers_count || profileData?.followers?.total || 0,
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
      }
    });
  } catch (error) {
    console.error('Error saving social connection:', error);
    res.status(500).json({ error: 'Failed to save social connection' });
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
      const { storage } = await import('./storage');
      const user = await db.query.users.findFirst({
        where: eq(socialConnections.userId, userId)
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
