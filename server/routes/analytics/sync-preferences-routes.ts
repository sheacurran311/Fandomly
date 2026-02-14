/**
 * Sync Preferences API Routes
 * 
 * Allows creators to control which platforms sync analytics data,
 * view sync status, and trigger manual syncs.
 */

import { Express, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { syncActionLimiter, analyticsLimiter } from '../../middleware/rate-limit';
import { db } from '../../db';
import { syncPreferences, socialConnections } from '@shared/schema';

export function registerSyncPreferencesRoutes(app: Express) {
  /**
   * GET /api/sync-preferences
   * Get all sync preferences for the authenticated user
   */
  app.get(
    '/api/sync-preferences',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'User ID required' });
        }

        const prefs = await db.query.syncPreferences.findMany({
          where: eq(syncPreferences.userId, userId),
        });

        // Also fetch connected platforms to show which ones could have sync prefs
        const connections = await db.query.socialConnections.findMany({
          where: eq(socialConnections.userId, userId),
        });

        const connectedPlatforms = connections.map(c => c.platform);

        res.json({
          preferences: prefs,
          connectedPlatforms,
        });
      } catch (error) {
        console.error('Error fetching sync preferences:', error);
        res.status(500).json({ error: 'Failed to fetch sync preferences' });
      }
    }
  );

  /**
   * GET /api/sync-preferences/:platform
   * Get sync preference for a specific platform
   */
  app.get(
    '/api/sync-preferences/:platform',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        const { platform } = req.params;
        if (!userId) {
          return res.status(401).json({ error: 'User ID required' });
        }

        const pref = await db.query.syncPreferences.findFirst({
          where: and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platform)
          ),
        });

        if (!pref) {
          return res.json({ exists: false, platform });
        }

        res.json({ exists: true, preference: pref });
      } catch (error) {
        console.error('Error fetching sync preference:', error);
        res.status(500).json({ error: 'Failed to fetch sync preference' });
      }
    }
  );

  /**
   * PUT /api/sync-preferences/:platform
   * Update sync preferences for a platform (toggle sync, change frequency)
   */
  app.put(
    '/api/sync-preferences/:platform',
    authenticateUser,
    syncActionLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        const { platform } = req.params;
        const { syncEnabled, syncFrequencyMinutes } = req.body;

        if (!userId) {
          return res.status(401).json({ error: 'User ID required' });
        }

        // Validate frequency if provided
        if (syncFrequencyMinutes !== undefined) {
          const freq = Number(syncFrequencyMinutes);
          if (isNaN(freq) || freq < 15 || freq > 1440) {
            return res.status(400).json({ error: 'Sync frequency must be between 15 and 1440 minutes' });
          }
        }

        const existing = await db.query.syncPreferences.findFirst({
          where: and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platform)
          ),
        });

        if (existing) {
          const updateData: Record<string, any> = {};
          if (syncEnabled !== undefined) updateData.syncEnabled = syncEnabled;
          if (syncFrequencyMinutes !== undefined) updateData.syncFrequencyMinutes = Number(syncFrequencyMinutes);
          
          // If enabling sync, schedule next sync
          if (syncEnabled === true) {
            const freq = syncFrequencyMinutes || existing.syncFrequencyMinutes || 60;
            updateData.nextSyncAt = new Date(Date.now() + freq * 60 * 1000);
            updateData.syncStatus = 'idle';
            updateData.errorMessage = null;
          }
          // If disabling sync, clear next sync
          if (syncEnabled === false) {
            updateData.nextSyncAt = null;
            updateData.syncStatus = 'idle';
          }

          const [updated] = await db
            .update(syncPreferences)
            .set(updateData)
            .where(eq(syncPreferences.id, existing.id))
            .returning();

          res.json({ success: true, preference: updated });
        } else {
          // Create new preference
          const freq = syncFrequencyMinutes || 60;
          const [created] = await db
            .insert(syncPreferences)
            .values({
              userId,
              platform,
              syncEnabled: syncEnabled !== false,
              syncFrequencyMinutes: freq,
              nextSyncAt: syncEnabled !== false ? new Date(Date.now() + freq * 60 * 1000) : null,
              syncStatus: 'idle',
            })
            .returning();

          res.json({ success: true, preference: created });
        }
      } catch (error) {
        console.error('Error updating sync preference:', error);
        res.status(500).json({ error: 'Failed to update sync preference' });
      }
    }
  );

  /**
   * POST /api/sync-preferences/:platform/sync-now
   * Trigger an immediate sync for a platform
   */
  app.post(
    '/api/sync-preferences/:platform/sync-now',
    authenticateUser,
    syncActionLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        const { platform } = req.params;

        if (!userId) {
          return res.status(401).json({ error: 'User ID required' });
        }

        // Check that the user has a social connection for this platform
        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, platform)
          ),
        });

        if (!connection) {
          return res.status(404).json({ error: `No ${platform} connection found` });
        }

        // Update sync preference to trigger immediate sync
        const existing = await db.query.syncPreferences.findFirst({
          where: and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platform)
          ),
        });

        if (existing) {
          await db
            .update(syncPreferences)
            .set({
              nextSyncAt: new Date(), // Schedule for now
              syncStatus: 'idle',
            })
            .where(eq(syncPreferences.id, existing.id));
        } else {
          // Create sync pref and schedule immediately
          await db
            .insert(syncPreferences)
            .values({
              userId,
              platform,
              syncEnabled: true,
              syncFrequencyMinutes: 60,
              nextSyncAt: new Date(),
              syncStatus: 'idle',
            });
        }

        res.json({ success: true, message: `Sync queued for ${platform}` });
      } catch (error) {
        console.error('Error triggering sync:', error);
        res.status(500).json({ error: 'Failed to trigger sync' });
      }
    }
  );
}
