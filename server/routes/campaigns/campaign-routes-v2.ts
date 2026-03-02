/**
 * Campaign V2 Routes
 *
 * Enhanced campaign API: sponsors, gating, sequential tasks,
 * deferred verification, completion bonuses.
 */

import type { Express } from 'express';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { campaignEngine } from '../../services/campaigns/campaign-engine';
import { campaignSponsorService } from '../../services/campaigns/campaign-sponsor';
import { campaignVerificationService } from '../../services/campaigns/campaign-verification';
import { db } from '../../db';
import { campaigns, taskAssignments, tasks, creators, campaignSponsors } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export function registerCampaignV2Routes(app: Express) {
  // ============================================================================
  // CREATOR: CAMPAIGN BUILDER
  // ============================================================================

  /**
   * GET /api/campaigns/v2/:campaignId/builder-data
   * Full campaign data for the builder (campaign + sponsors + task assignments + tasks)
   */
  app.get(
    '/api/campaigns/v2/:campaignId/builder-data',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;

        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const sponsors = await campaignSponsorService.getSponsors(campaignId);

        const assignments = await db
          .select()
          .from(taskAssignments)
          .where(
            and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true))
          )
          .orderBy(taskAssignments.taskOrder);

        // Fetch task details for each assignment
        const taskIds = assignments.map((a) => a.taskId);
        const taskDetails =
          taskIds.length > 0
            ? await db
                .select()
                .from(tasks)
                .where(
                  sql`${tasks.id} = ANY(ARRAY[${sql.join(
                    taskIds.map((id) => sql`${id}`),
                    sql`, `
                  )}])`
                )
            : [];

        const taskMap = new Map(taskDetails.map((t) => [t.id, t]));

        const enrichedAssignments = assignments.map((a) => ({
          ...a,
          task: taskMap.get(a.taskId) || null,
          sponsor: sponsors.find((s) => s.id === a.sponsorId) || null,
        }));

        res.json({
          campaign,
          sponsors,
          taskAssignments: enrichedAssignments,
        });
      } catch (error) {
        console.error('[CampaignV2] builder-data error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2
   * Create campaign with V2 fields
   */
  app.post('/api/campaigns/v2', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const creator = await db.query.creators.findFirst({
        where: eq(creators.userId, userId!),
      });
      if (!creator) return res.status(403).json({ error: 'Creator profile required' });

      const body = req.body;

      const [campaign] = await db
        .insert(campaigns)
        .values({
          tenantId: creator.tenantId,
          creatorId: creator.id,
          programId: body.programId || null,
          name: body.name || 'Untitled Campaign',
          description: body.description || null,
          campaignType: body.campaignType || 'direct',
          trigger: body.trigger || 'custom_event',
          startDate: body.startDate ? new Date(body.startDate) : new Date(),
          endDate: body.endDate ? new Date(body.endDate) : null,
          status: 'draft',
          // V2 fields
          accessCode: body.accessCode || null,
          accessCodeEnabled: body.accessCodeEnabled || false,
          minimumReputationScore: body.minimumReputationScore || null,
          campaignMultiplier: body.campaignMultiplier || '1.00',
          completionBonusPoints: body.completionBonusPoints || 0,
          completionBonusRewards: body.completionBonusRewards || null,
          verificationMode: body.verificationMode || 'immediate',
          bannerImageUrl: body.bannerImageUrl || null,
          accentColor: body.accentColor || '#8B5CF6',
          enforceSequentialTasks: body.enforceSequentialTasks || false,
          // Existing gating fields
          prerequisiteCampaigns: body.prerequisiteCampaigns || [],
          requiredNftCollectionIds: body.requiredNftCollectionIds || [],
          requiredBadgeIds: body.requiredBadgeIds || [],
          requiredTaskIds: body.requiredTaskIds || [],
          allTasksRequired: body.allTasksRequired ?? true,
          requiresPaidSubscription: body.requiresPaidSubscription || false,
          requiredSubscriberTier: body.requiredSubscriberTier || null,
          campaignTypes: body.campaignTypes || ['points'],
          rewardStructure: body.rewardStructure || null,
        })
        .returning();

      res.json(campaign);
    } catch (error) {
      console.error('[CampaignV2] create error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  /**
   * PUT /api/campaigns/v2/:campaignId
   * Update campaign with V2 fields
   */
  app.put(
    '/api/campaigns/v2/:campaignId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;

        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const existing = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!existing) return res.status(404).json({ error: 'Campaign not found' });

        const body = req.body;
        const updates: Record<string, unknown> = { updatedAt: new Date() };

        // Map all supported fields
        const fields = [
          'name',
          'description',
          'startDate',
          'endDate',
          'status',
          'accessCode',
          'accessCodeEnabled',
          'minimumReputationScore',
          'campaignMultiplier',
          'completionBonusPoints',
          'completionBonusRewards',
          'verificationMode',
          'bannerImageUrl',
          'accentColor',
          'enforceSequentialTasks',
          'prerequisiteCampaigns',
          'requiredNftCollectionIds',
          'requiredBadgeIds',
          'requiredTaskIds',
          'allTasksRequired',
          'requiresPaidSubscription',
          'requiredSubscriberTier',
          'campaignTypes',
          'rewardStructure',
        ];

        for (const field of fields) {
          if (body[field] !== undefined) {
            if (field === 'startDate' || field === 'endDate') {
              updates[field] = body[field] ? new Date(body[field]) : null;
            } else {
              updates[field] = body[field];
            }
          }
        }

        const [updated] = await db
          .update(campaigns)
          .set(updates)
          .where(eq(campaigns.id, campaignId))
          .returning();

        res.json(updated);
      } catch (error) {
        console.error('[CampaignV2] update error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2/:campaignId/publish
   * Publish campaign with enhanced validation
   */
  app.post(
    '/api/campaigns/v2/:campaignId/publish',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;

        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Validate: must have at least 1 task assigned
        const assignments = await db
          .select()
          .from(taskAssignments)
          .where(
            and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true))
          );
        if (assignments.length === 0) {
          return res.status(400).json({ error: 'Campaign must have at least one task assigned' });
        }

        // Publish
        const [published] = await db
          .update(campaigns)
          .set({
            status: 'active',
            startDate: campaign.startDate || new Date(),
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId))
          .returning();

        // Schedule deferred verification if needed
        if (
          campaign.verificationMode === 'deferred' ||
          campaign.verificationMode === 'end_of_campaign'
        ) {
          await campaignVerificationService.scheduleDeferredVerification(campaignId);
        }

        res.json(published);
      } catch (error) {
        console.error('[CampaignV2] publish error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  // ============================================================================
  // CREATOR: SPONSORS
  // ============================================================================

  app.post(
    '/api/campaigns/:campaignId/sponsors',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;

        // Verify campaign ownership
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign)
          return res.status(404).json({ error: 'Campaign not found or access denied' });

        const sponsor = await campaignSponsorService.addSponsor({
          campaignId,
          ...req.body,
        });
        res.json(sponsor);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  app.get('/api/campaigns/:campaignId/sponsors', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const sponsors = await campaignSponsorService.getSponsors(campaignId);
      res.json({ sponsors });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put(
    '/api/campaigns/sponsors/:sponsorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { sponsorId } = req.params;
        const userId = req.user?.id;

        // Verify ownership via sponsor -> campaign -> creator
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const sponsor = await db.query.campaignSponsors.findFirst({
          where: eq(campaignSponsors.id, sponsorId),
        });
        if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, sponsor.campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign) return res.status(403).json({ error: 'Access denied' });

        const updated = await campaignSponsorService.updateSponsor(sponsorId, req.body);
        if (!updated) return res.status(404).json({ error: 'Sponsor not found' });
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  app.delete(
    '/api/campaigns/sponsors/:sponsorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { sponsorId } = req.params;
        const userId = req.user?.id;

        // Verify ownership via sponsor -> campaign -> creator
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const sponsor = await db.query.campaignSponsors.findFirst({
          where: eq(campaignSponsors.id, sponsorId),
        });
        if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, sponsor.campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign) return res.status(403).json({ error: 'Access denied' });

        await campaignSponsorService.removeSponsor(sponsorId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  // ============================================================================
  // CREATOR: TASK ASSIGNMENTS V2
  // ============================================================================

  /**
   * PUT /api/campaigns/v2/:campaignId/task-assignments/:assignmentId
   * Update task assignment with V2 fields (ordering, dependencies, sponsor, verification timing)
   */
  app.put(
    '/api/campaigns/v2/:campaignId/task-assignments/:assignmentId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId, assignmentId } = req.params;
        const userId = req.user?.id;

        // Verify campaign ownership
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign)
          return res.status(404).json({ error: 'Campaign not found or access denied' });

        const body = req.body;

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        const fields = [
          'taskOrder',
          'dependsOnTaskIds',
          'isOptional',
          'useSponsorHandle',
          'sponsorId',
          'verificationTiming',
          'taskDescriptionOverride',
          'customRewardValue',
          'customInstructions',
          'displayOrder',
          'isActive',
        ];

        for (const field of fields) {
          if (body[field] !== undefined) {
            updates[field] = body[field];
          }
        }

        const [updated] = await db
          .update(taskAssignments)
          .set(updates)
          .where(eq(taskAssignments.id, assignmentId))
          .returning();

        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2/:campaignId/task-assignments/reorder
   * Bulk reorder tasks in campaign
   */
  app.post(
    '/api/campaigns/v2/:campaignId/task-assignments/reorder',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;

        // Verify campaign ownership
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId!),
        });
        if (!creator) return res.status(403).json({ error: 'Creator profile required' });

        const campaign = await db.query.campaigns.findFirst({
          where: and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creator.id)),
        });
        if (!campaign)
          return res.status(404).json({ error: 'Campaign not found or access denied' });

        // Accept both formats:
        // - { orderedAssignmentIds: string[] } (client sends this - IDs in desired order)
        // - { order: [{ assignmentId, taskOrder }] } (legacy explicit format)
        const { orderedAssignmentIds, order } = req.body;

        if (Array.isArray(orderedAssignmentIds)) {
          // Client format: array of assignment IDs in desired order
          for (let i = 0; i < orderedAssignmentIds.length; i++) {
            await db
              .update(taskAssignments)
              .set({ taskOrder: i, updatedAt: new Date() })
              .where(eq(taskAssignments.id, orderedAssignmentIds[i]));
          }
        } else if (Array.isArray(order)) {
          // Legacy format: explicit { assignmentId, taskOrder } objects
          for (const item of order) {
            await db
              .update(taskAssignments)
              .set({ taskOrder: item.taskOrder, updatedAt: new Date() })
              .where(eq(taskAssignments.id, item.assignmentId));
          }
        } else {
          return res
            .status(400)
            .json({
              error:
                'Provide orderedAssignmentIds (array of IDs) or order (array of { assignmentId, taskOrder })',
            });
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  // ============================================================================
  // FAN: CAMPAIGN PARTICIPATION
  // ============================================================================

  /**
   * POST /api/campaigns/v2/:campaignId/check-eligibility
   * Check if fan meets all gating requirements
   */
  app.post(
    '/api/campaigns/v2/:campaignId/check-eligibility',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { accessCode } = req.body;

        const eligibility = await campaignEngine.checkEligibility(userId, campaignId, accessCode);
        res.json(eligibility);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2/:campaignId/join
   * Join a campaign (with optional access code)
   */
  app.post(
    '/api/campaigns/v2/:campaignId/join',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { accessCode } = req.body;

        // Get campaign to find tenantId
        const campaign = await db.query.campaigns.findFirst({
          where: eq(campaigns.id, campaignId),
        });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const result = await campaignEngine.joinCampaign(
          userId,
          campaignId,
          campaign.tenantId,
          accessCode
        );

        if (!result.success) {
          return res.status(403).json({
            error: 'Not eligible to join campaign',
            eligibility: result.eligibility,
          });
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * GET /api/campaigns/v2/:campaignId/progress
   * Get fan's progress in campaign
   */
  app.get(
    '/api/campaigns/v2/:campaignId/progress',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const progress = await campaignEngine.getCampaignProgress(userId, campaignId);
        res.json(progress);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2/:campaignId/tasks/:assignmentId/complete
   * Complete a task within campaign context
   */
  app.post(
    '/api/campaigns/v2/:campaignId/tasks/:assignmentId/complete',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId, assignmentId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const campaign = await db.query.campaigns.findFirst({
          where: eq(campaigns.id, campaignId),
        });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const result = await campaignEngine.completeTaskInCampaign(
          userId,
          campaignId,
          assignmentId,
          campaign.tenantId
        );

        if (!result.success) {
          return res.status(400).json({ error: result.message });
        }

        // Get updated progress
        const progress = await campaignEngine.getCampaignProgress(userId, campaignId);

        res.json({ ...result, progress });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/campaigns/v2/:campaignId/claim-completion
   * Claim completion bonus after finishing all required tasks
   */
  app.post(
    '/api/campaigns/v2/:campaignId/claim-completion',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { campaignId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const awarded = await campaignEngine.checkAndAwardCompletion(userId, campaignId);

        if (awarded) {
          const campaign = await db.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
          });
          res.json({
            success: true,
            message: 'Completion bonus awarded!',
            bonusPoints: campaign?.completionBonusPoints || 0,
          });
        } else {
          res.status(400).json({ error: 'Campaign not yet completed or bonus already claimed' });
        }
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * GET /api/campaigns/v2/:campaignId/detail
   * Full campaign detail for fan view (campaign + sponsors + tasks with assignments)
   */
  app.get('/api/campaigns/v2/:campaignId/detail', async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, campaignId), eq(campaigns.status, 'active')),
        with: {
          creator: true,
        },
      });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const sponsors = await campaignSponsorService.getSponsors(campaignId);

      const assignments = await db
        .select()
        .from(taskAssignments)
        .where(and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true)))
        .orderBy(taskAssignments.taskOrder);

      // Fetch task details
      const taskIds = assignments.map((a) => a.taskId);
      const taskDetails =
        taskIds.length > 0
          ? await db
              .select()
              .from(tasks)
              .where(
                sql`${tasks.id} = ANY(ARRAY[${sql.join(
                  taskIds.map((id) => sql`${id}`),
                  sql`, `
                )}])`
              )
          : [];

      const taskMap = new Map(taskDetails.map((t) => [t.id, t]));

      const enrichedTasks = assignments.map((a) => {
        const task = taskMap.get(a.taskId);
        const sponsor = a.sponsorId ? sponsors.find((s) => s.id === a.sponsorId) : null;
        return {
          assignmentId: a.id,
          taskId: a.taskId,
          taskOrder: a.taskOrder,
          isOptional: a.isOptional,
          dependsOnTaskIds: a.dependsOnTaskIds,
          verificationTiming: a.verificationTiming,
          customRewardValue: a.customRewardValue,
          taskDescriptionOverride: a.taskDescriptionOverride,
          useSponsorHandle: a.useSponsorHandle,
          task: task
            ? {
                id: task.id,
                name: task.name,
                description: task.description,
                taskType: task.taskType,
                platform: task.platform,
                pointsToReward: task.pointsToReward,
                targetUrl: task.targetUrl,
                customSettings: task.customSettings,
                verificationTier: task.verificationTier,
              }
            : null,
          sponsor: sponsor
            ? {
                id: sponsor.id,
                name: sponsor.name,
                logoUrl: sponsor.logoUrl,
                socialHandles: sponsor.socialHandles,
              }
            : null,
        };
      });

      // Campaign gating info (what requirements exist, without revealing access codes)
      const gatingInfo = {
        hasAccessCode: campaign.accessCodeEnabled || false,
        hasNFTRequirement:
          (Array.isArray(campaign.requiredNftCollectionIds)
            ? campaign.requiredNftCollectionIds
            : []
          ).length > 0,
        hasBadgeRequirement:
          (Array.isArray(campaign.requiredBadgeIds) ? campaign.requiredBadgeIds : []).length > 0,
        hasReputationRequirement: !!campaign.minimumReputationScore,
        hasPrerequisiteCampaigns:
          (Array.isArray(campaign.prerequisiteCampaigns) ? campaign.prerequisiteCampaigns : [])
            .length > 0,
        hasSubscriptionRequirement: campaign.requiresPaidSubscription || false,
      };

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: campaign.status,
          bannerImageUrl: campaign.bannerImageUrl,
          accentColor: campaign.accentColor,
          campaignMultiplier: campaign.campaignMultiplier,
          completionBonusPoints: campaign.completionBonusPoints,
          verificationMode: campaign.verificationMode,
          enforceSequentialTasks: campaign.enforceSequentialTasks,
          totalParticipants: campaign.totalParticipants,
          creator: campaign.creator,
        },
        sponsors,
        tasks: enrichedTasks,
        gatingInfo,
      });
    } catch (error) {
      console.error('[CampaignV2] detail error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}
