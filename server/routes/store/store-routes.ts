/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { taskCompletions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export function registerStoreRoutes(app: Express) {
  app.get('/api/store/:creatorUrl', async (req, res) => {
    try {
      const { creatorUrl } = req.params;

      // Skip reserved routes
      if (creatorUrl === 'admin-dashboard' || creatorUrl.startsWith('admin-')) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Find creator by username (slug)
      const user = await storage.getUserByUsername(creatorUrl);
      if (!user || user.userType !== 'creator') {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get creator data
      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get tenant data
      const tenant = await storage.getTenant(creator.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Get published campaigns only
      const allCampaigns = await storage.getCampaignsByCreator(creator.id);
      const campaigns = allCampaigns.filter((c: any) => c.status === 'active');

      // Get rewards (future implementation)
      const rewards: any[] = [];

      // Get fan count - count unique fans following this creator
      const tenantMembers = await storage.getTenantMembers(tenant.id);
      const fanCount = tenantMembers.length;

      // Calculate total completed task completions for this creator's tenant
      const [storeStats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(taskCompletions)
        .where(
          and(eq(taskCompletions.tenantId, tenant.id), eq(taskCompletions.status, 'completed'))
        );
      const totalRewards = storeStats?.count || 0;

      res.json({
        creator: {
          ...creator,
          user: {
            username: user.username,
            displayName: (user.profileData as any)?.displayName || user.username,
            profileData: user.profileData,
          },
          tenant: {
            slug: tenant.slug,
            branding: tenant.branding,
          },
        },
        campaigns,
        rewards,
        fanCount,
        totalRewards,
      });
    } catch (error: any) {
      console.error('Error fetching creator store:', error);
      res.status(500).json({
        error: 'Error fetching creator store',
        message: error.message,
      });
    }
  });
}
