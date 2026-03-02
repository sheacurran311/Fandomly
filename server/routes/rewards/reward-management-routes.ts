/**
 * Reward Management Routes
 *
 * Handles all reward-related operations including:
 * - Reward CRUD operations (create, read, update, delete)
 * - Reward redemption
 * - Physical rewards approval workflow
 */

import type { Express } from 'express';
import {
  authenticateUser,
  requireFandomlyAdmin,
  type AuthenticatedRequest,
} from '../../middleware/rbac';
import { insertRewardSchema } from '@shared/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerRewardManagementRoutes(app: Express, storage: any) {
  // Get all rewards for authenticated user's tenant
  app.get('/api/rewards', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Get user's current tenant context
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get creator to determine tenant
      let tenantId = null;
      if (user.userType === 'creator') {
        const creator = await storage.getCreatorByUserId(user.id);
        tenantId = creator?.tenantId;
      }

      // Fetch rewards with tenant isolation
      const rewards = tenantId ? await storage.getAllRewards(tenantId) : [];
      res.json(rewards);
    } catch {
      res.status(500).json({ error: 'Failed to fetch rewards' });
    }
  });

  // Get rewards by creator (for fan dashboard)
  app.get(
    '/api/rewards/creator/:creatorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const creator = await storage.getCreator(req.params.creatorId);
        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        // Get active rewards for this creator's tenant
        const rewards = await storage.getAllRewards(creator.tenantId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeRewards = rewards.filter((reward: any) => reward.isActive);
        res.json(activeRewards);
      } catch {
        res.status(500).json({ error: 'Failed to fetch rewards' });
      }
    }
  );

  // Create reward (creator-only)
  app.post('/api/rewards', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: 'Access denied. Creator account required.' });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile not found' });
      }

      // Validate request body
      const rewardData = insertRewardSchema.parse({
        ...req.body,
        tenantId: creator.tenantId, // Override client-supplied tenantId for security
      });

      const reward = await storage.createReward(rewardData);
      res.status(201).json(reward);
    } catch (error) {
      console.error('Reward creation error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid reward data',
      });
    }
  });

  // Update reward (creator-only)
  app.put('/api/rewards/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: 'Access denied. Creator account required.' });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile not found' });
      }

      // Verify the reward belongs to this creator's tenant
      const existingReward = await storage.getReward(req.params.id, creator.tenantId);
      if (!existingReward) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      // Validate update data (partial schema)
      const updateData = insertRewardSchema.partial().parse(req.body);

      const updatedReward = await storage.updateReward(req.params.id, updateData);
      res.json(updatedReward);
    } catch (error) {
      console.error('Reward update error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid reward data',
      });
    }
  });

  // Delete reward (creator-only)
  app.delete('/api/rewards/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: 'Access denied. Creator account required.' });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile not found' });
      }

      // Verify the reward belongs to this creator's tenant
      const existingReward = await storage.getReward(req.params.id, creator.tenantId);
      if (!existingReward) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      // Soft delete by setting isActive to false
      await storage.updateReward(req.params.id, { isActive: false });
      res.status(204).send();
    } catch (error) {
      console.error('Reward deletion error:', error);
      res.status(500).json({ error: 'Failed to delete reward' });
    }
  });

  // Redeem reward (fan-only)
  app.post('/api/rewards/:id/redeem', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get the reward details
      const reward = await storage.getReward(req.params.id);
      if (!reward || !reward.isActive) {
        return res.status(404).json({ error: 'Reward not found or inactive' });
      }

      // Get user's tenant membership for this reward's tenant
      const membership = await storage.getUserTenantMembership(user.id, reward.tenantId);
      if (!membership) {
        return res.status(403).json({ error: 'Not authorized to redeem from this creator' });
      }

      // Validate redemption request
      const { entries = 1 } = req.body; // For raffles, allow multiple entries
      const totalCost = reward.pointsCost * entries;

      // Check if user has enough points
      if ((membership.memberData?.points || 0) < totalCost) {
        return res.status(400).json({
          error: 'Insufficient points',
          required: totalCost,
          available: membership.memberData?.points || 0,
        });
      }

      // Check stock/max redemptions
      if (reward.maxRedemptions && (reward.currentRedemptions || 0) >= reward.maxRedemptions) {
        return res.status(400).json({ error: 'Reward no longer available' });
      }

      // For raffle rewards, check max entries
      if (reward.rewardType === 'raffle' && reward.rewardData?.raffleData?.maxEntries) {
        const maxEntries = reward.rewardData.raffleData.maxEntries;
        if (entries > maxEntries) {
          return res.status(400).json({
            error: `Maximum ${maxEntries} entries allowed per person`,
          });
        }
      }

      // Use atomic redemption to prevent race conditions and ensure data integrity
      const result = await storage.redeemRewardAtomic({
        userId: user.id,
        rewardId: reward.id,
        entries,
        membershipId: membership.id,
      });

      res.json({
        success: true,
        message: `Successfully redeemed ${reward.name}`,
        pointsSpent: reward.pointsCost * entries,
        remainingPoints: result.updatedMembership.memberData?.points || 0,
        entries: entries,
        redemptionId: result.rewardRedemption.id,
      });
    } catch (error) {
      console.error('Reward redemption error:', error);
      res.status(500).json({ error: 'Failed to redeem reward' });
    }
  });

  // Get rewards by program
  app.get('/api/rewards/program/:programId', async (req, res) => {
    try {
      // Get loyalty program to verify tenant context
      const program = await storage.getLoyaltyProgram(req.params.programId);
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Fetch rewards with tenant isolation
      const rewards = await storage.getRewardsByProgram(req.params.programId, program.tenantId);
      res.json(rewards);
    } catch {
      res.status(500).json({ error: 'Failed to fetch rewards' });
    }
  });

  // Admin physical rewards approval routes
  app.get(
    '/api/admin/physical-rewards',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get all physical rewards using storage layer
        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        const allRewards = await storage.getAllRewards(creator.tenantId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const physicalRewards = allRewards.filter((r: any) => r.rewardType === 'physical');

        res.json(physicalRewards);
      } catch (error) {
        console.error('Error fetching physical rewards:', error);
        res.status(500).json({ error: 'Failed to fetch physical rewards' });
      }
    }
  );

  app.put(
    '/api/admin/physical-rewards/:id/approve',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { id } = req.params;
        const { adminNotes, approvedAt } = req.body;

        // Get the reward and update it
        const reward = await storage.getReward(id);
        if (!reward) {
          return res.status(404).json({ error: 'Reward not found' });
        }

        // Update reward data with approval status
        const updatedRewardData = {
          ...reward.rewardData,
          physicalData: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(reward.rewardData as any)?.physicalData,
            approvalStatus: 'approved',
            adminNotes: adminNotes || null,
            approvedAt: approvedAt || new Date().toISOString(),
          },
        };

        const updatedReward = await storage.updateReward(id, {
          rewardData: updatedRewardData,
          isActive: true, // Auto-activate approved rewards
        });

        res.json(updatedReward);
      } catch (error) {
        console.error('Error approving reward:', error);
        res.status(500).json({ error: 'Failed to approve reward' });
      }
    }
  );

  app.put(
    '/api/admin/physical-rewards/:id/reject',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { id } = req.params;
        const { adminNotes } = req.body;

        if (!adminNotes) {
          return res.status(400).json({ error: 'Admin notes are required for rejection' });
        }

        // Get the reward and update it
        const reward = await storage.getReward(id);
        if (!reward) {
          return res.status(404).json({ error: 'Reward not found' });
        }

        // Update reward data with rejection status
        const updatedRewardData = {
          ...reward.rewardData,
          physicalData: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(reward.rewardData as any)?.physicalData,
            approvalStatus: 'rejected',
            adminNotes: adminNotes,
          },
        };

        const updatedReward = await storage.updateReward(id, {
          rewardData: updatedRewardData,
          isActive: false, // Deactivate rejected rewards
        });

        res.json(updatedReward);
      } catch (error) {
        console.error('Error rejecting reward:', error);
        res.status(500).json({ error: 'Failed to reject reward' });
      }
    }
  );
}
