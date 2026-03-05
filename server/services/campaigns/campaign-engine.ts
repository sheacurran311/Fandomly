/**
 * Campaign Engine Service
 *
 * Central orchestrator for the Campaign V2 system:
 * - Eligibility checking (6 gating types)
 * - Progress tracking (completed / available / locked)
 * - Sequential task unlocking via dependency graph
 * - Campaign completion detection + bonus distribution
 * - Handle resolution (creator vs sponsor)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '../../db';
import {
  campaigns,
  campaignParticipations,
  taskAssignments,
  campaignAccessLogs,
  taskCompletions,
  nftDeliveries,
  users,
  fanPrograms,
  type CampaignSponsor,
} from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { CreatorPointsService } from '../points/points-service';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignEligibilityResult {
  eligible: boolean;
  reasons: string[];
  missingRequirements: Array<{
    type:
      | 'access_code'
      | 'nft'
      | 'badge'
      | 'reputation'
      | 'prerequisite_campaign'
      | 'task_completion'
      | 'subscription';
    description: string;
    value?: unknown;
  }>;
}

export interface CompletionRewardItem {
  type: 'nft' | 'badge' | 'raffle_entry' | 'reward' | 'points';
  rewardId?: string;
  metadata?: Record<string, unknown>;
  status: 'pending' | 'claimed' | 'failed';
}

export interface ClaimedRewardItem {
  type: 'nft' | 'badge' | 'raffle_entry' | 'reward' | 'points';
  rewardId?: string;
  metadata?: Record<string, unknown>;
  claimedAt: string;
  deliveryData?: Record<string, unknown>;
}

export interface CampaignProgressResult {
  campaignId: string;
  userId: string;
  tasksCompleted: string[]; // task assignment IDs
  tasksAvailable: string[]; // can start now
  tasksLocked: string[]; // blocked by dependencies
  tasksPendingVerification: string[]; // deferred, awaiting end-of-campaign check
  totalTasks: number;
  requiredTasks: number;
  optionalTasks: number;
  completionPercentage: number;
  canClaimCompletion: boolean;
  campaignCompleted: boolean;
  pendingRewards?: CompletionRewardItem[];
  claimedRewards?: ClaimedRewardItem[];
  rewardsClaimedAt?: string;
}

export interface ResolvedTaskHandle {
  handle: string;
  source: 'creator' | 'sponsor';
  sponsorName?: string;
  sponsorLogoUrl?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class CampaignEngineService {
  private pointsService = new CreatorPointsService();

  // --------------------------------------------------------------------------
  // ELIGIBILITY
  // --------------------------------------------------------------------------

  async checkEligibility(
    userId: string,
    campaignId: string,
    accessCode?: string
  ): Promise<CampaignEligibilityResult> {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign) {
      return { eligible: false, reasons: ['Campaign not found'], missingRequirements: [] };
    }

    // Check campaign is active and within date range
    if (campaign.status !== 'active') {
      return { eligible: false, reasons: ['Campaign is not active'], missingRequirements: [] };
    }

    const now = new Date();
    if (campaign.startDate && new Date(campaign.startDate) > now) {
      return {
        eligible: false,
        reasons: ['Campaign has not started yet'],
        missingRequirements: [],
      };
    }
    if (campaign.endDate && new Date(campaign.endDate) < now) {
      return { eligible: false, reasons: ['Campaign has ended'], missingRequirements: [] };
    }

    const missingRequirements: CampaignEligibilityResult['missingRequirements'] = [];

    // 1. Access code
    if (campaign.accessCodeEnabled && campaign.accessCode) {
      if (
        !accessCode ||
        accessCode.trim().toLowerCase() !== campaign.accessCode.trim().toLowerCase()
      ) {
        missingRequirements.push({
          type: 'access_code',
          description: 'Valid access code required to join this campaign',
        });
      }
    }

    // 2. NFT ownership
    if (
      campaign.requiredNftCollectionIds &&
      (campaign.requiredNftCollectionIds as string[]).length > 0
    ) {
      const userOwnsNFT = await this.checkNFTOwnership(
        userId,
        campaign.requiredNftCollectionIds as string[]
      );
      if (!userOwnsNFT) {
        missingRequirements.push({
          type: 'nft',
          description: 'Must own an NFT from a required collection',
          value: campaign.requiredNftCollectionIds,
        });
      }
    }

    // 3. Badge ownership
    if (campaign.requiredBadgeIds && (campaign.requiredBadgeIds as string[]).length > 0) {
      const userHasBadges = await this.checkBadgeOwnership(
        userId,
        campaign.requiredBadgeIds as string[]
      );
      if (!userHasBadges) {
        missingRequirements.push({
          type: 'badge',
          description: 'Must have earned required badges',
          value: campaign.requiredBadgeIds,
        });
      }
    }

    // 4. Reputation score
    if (campaign.minimumReputationScore && campaign.minimumReputationScore > 0) {
      const userReputation = await this.getUserReputation(userId);
      if (userReputation < campaign.minimumReputationScore) {
        missingRequirements.push({
          type: 'reputation',
          description: `Minimum reputation score: ${campaign.minimumReputationScore}`,
          value: { required: campaign.minimumReputationScore, current: userReputation },
        });
      }
    }

    // 5. Prerequisite campaigns
    if (campaign.prerequisiteCampaigns && (campaign.prerequisiteCampaigns as string[]).length > 0) {
      const completedCampaignIds = await this.getUserCompletedCampaignIds(userId);
      const missing = (campaign.prerequisiteCampaigns as string[]).filter(
        (id) => !completedCampaignIds.includes(id)
      );
      if (missing.length > 0) {
        missingRequirements.push({
          type: 'prerequisite_campaign',
          description: 'Must complete prerequisite campaigns first',
          value: missing,
        });
      }
    }

    // 6. Required task completions (standalone tasks)
    if (campaign.requiredTaskIds && (campaign.requiredTaskIds as string[]).length > 0) {
      const completedTaskIds = await this.getUserCompletedTaskIds(userId);
      const missing = (campaign.requiredTaskIds as string[]).filter(
        (id) => !completedTaskIds.includes(id)
      );
      if (missing.length > 0) {
        missingRequirements.push({
          type: 'task_completion',
          description: 'Must complete required tasks first',
          value: missing,
        });
      }
    }

    // 7. Subscription requirement
    if (campaign.requiresPaidSubscription) {
      const hasSub = await this.checkSubscription(
        userId,
        campaign.requiredSubscriberTier || undefined
      );
      if (!hasSub) {
        missingRequirements.push({
          type: 'subscription',
          description: campaign.requiredSubscriberTier
            ? `Requires "${campaign.requiredSubscriberTier}" subscription tier`
            : 'Requires an active paid subscription',
        });
      }
    }

    const eligible = missingRequirements.length === 0;

    // Log access attempt
    await db.insert(campaignAccessLogs).values({
      campaignId,
      userId,
      accessGranted: eligible,
      accessCodeUsed: accessCode || null,
      accessMethod: accessCode ? 'code' : 'direct',
      metadata: { missingRequirements, checkedAt: new Date().toISOString() },
    });

    return {
      eligible,
      reasons: missingRequirements.map((r) => r.description),
      missingRequirements,
    };
  }

  // --------------------------------------------------------------------------
  // JOIN CAMPAIGN
  // --------------------------------------------------------------------------

  async joinCampaign(userId: string, campaignId: string, tenantId: string, accessCode?: string) {
    // Check eligibility
    const eligibility = await this.checkEligibility(userId, campaignId, accessCode);
    if (!eligibility.eligible) {
      return { success: false, eligibility };
    }

    // Check if already participating
    const existing = await db.query.campaignParticipations.findFirst({
      where: and(
        eq(campaignParticipations.campaignId, campaignId),
        eq(campaignParticipations.memberId, userId)
      ),
    });

    if (existing) {
      return { success: true, participation: existing, alreadyJoined: true };
    }

    // Count required tasks
    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true)));
    const requiredCount = assignments.filter((a) => !a.isOptional).length;

    // Create participation
    const [participation] = await db
      .insert(campaignParticipations)
      .values({
        campaignId,
        memberId: userId,
        tenantId,
        participationCount: 0,
        totalTasksRequired: requiredCount,
        tasksCompleted: [],
        tasksPendingVerification: [],
        lastParticipation: new Date(),
      })
      .returning();

    // Increment campaign participant count
    await db
      .update(campaigns)
      .set({ totalParticipants: sql`${campaigns.totalParticipants} + 1` })
      .where(eq(campaigns.id, campaignId));

    return { success: true, participation, alreadyJoined: false };
  }

  // --------------------------------------------------------------------------
  // PROGRESS
  // --------------------------------------------------------------------------

  async getCampaignProgress(userId: string, campaignId: string): Promise<CampaignProgressResult> {
    const participation = await db.query.campaignParticipations.findFirst({
      where: and(
        eq(campaignParticipations.campaignId, campaignId),
        eq(campaignParticipations.memberId, userId)
      ),
    });

    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true)))
      .orderBy(taskAssignments.taskOrder);

    const completedIds: string[] = (participation?.tasksCompleted as string[]) || [];
    const pendingVerificationIds = (
      Array.isArray(participation?.tasksPendingVerification)
        ? participation.tasksPendingVerification
        : []
    )
      .map((p: Record<string, unknown>) => (p.assignmentId || p.taskId) as string)
      .filter((id): id is string => typeof id === 'string');

    const tasksAvailable: string[] = [];
    const tasksLocked: string[] = [];
    const requiredAssignments = assignments.filter((a) => !a.isOptional);
    const optionalAssignments = assignments.filter((a) => a.isOptional);

    for (const assignment of assignments) {
      const aid = assignment.id;
      if (completedIds.includes(aid) || pendingVerificationIds.includes(aid)) continue;

      const dependsOn = (assignment.dependsOnTaskIds as string[]) || [];
      const allDependenciesMet =
        dependsOn.length === 0 || dependsOn.every((depId) => completedIds.includes(depId));

      if (allDependenciesMet) {
        tasksAvailable.push(aid);
      } else {
        tasksLocked.push(aid);
      }
    }

    const totalCompleted = completedIds.length;
    const totalRequired = requiredAssignments.length;
    const completionPercentage =
      totalRequired > 0 ? Math.round((totalCompleted / assignments.length) * 100) : 0;

    const allRequiredDone = requiredAssignments.every((a) => completedIds.includes(a.id));
    const canClaimCompletion =
      allRequiredDone && !participation?.completionBonusAwarded && totalRequired > 0;

    return {
      campaignId,
      userId,
      tasksCompleted: completedIds,
      tasksAvailable,
      tasksLocked,
      tasksPendingVerification: pendingVerificationIds,
      totalTasks: assignments.length,
      requiredTasks: totalRequired,
      optionalTasks: optionalAssignments.length,
      completionPercentage,
      canClaimCompletion,
      campaignCompleted: participation?.campaignCompleted || false,
      pendingRewards: (participation?.pendingRewards as CompletionRewardItem[]) || undefined,
      claimedRewards: (participation?.claimedRewards as ClaimedRewardItem[]) || undefined,
      rewardsClaimedAt: participation?.rewardsClaimedAt?.toISOString() || undefined,
    };
  }

  // --------------------------------------------------------------------------
  // TASK COMPLETION IN CAMPAIGN
  // --------------------------------------------------------------------------

  async completeTaskInCampaign(
    userId: string,
    campaignId: string,
    assignmentId: string,
    _tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    // Get assignment
    const assignment = await db.query.taskAssignments.findFirst({
      where: and(eq(taskAssignments.id, assignmentId), eq(taskAssignments.campaignId, campaignId)),
    });
    if (!assignment) {
      return { success: false, message: 'Task assignment not found' };
    }

    // Check dependencies
    const dependsOn = (assignment.dependsOnTaskIds as string[]) || [];
    if (dependsOn.length > 0) {
      const participation = await db.query.campaignParticipations.findFirst({
        where: and(
          eq(campaignParticipations.campaignId, campaignId),
          eq(campaignParticipations.memberId, userId)
        ),
      });
      const completed = (participation?.tasksCompleted as string[]) || [];
      const allDepsComplete = dependsOn.every((depId) => completed.includes(depId));
      if (!allDepsComplete) {
        return { success: false, message: 'Dependencies not met. Complete required tasks first.' };
      }
    }

    // Check if deferred verification
    if (assignment.verificationTiming === 'deferred') {
      return this.markTaskAsDeferredInCampaign(userId, campaignId, assignmentId, assignment.taskId);
    }

    // Mark task as completed in participation
    await this.addCompletedTask(userId, campaignId, assignmentId);

    // Check for campaign completion
    await this.checkAndAwardCompletion(userId, campaignId);

    return { success: true, message: 'Task completed in campaign' };
  }

  async markTaskAsDeferredInCampaign(
    userId: string,
    campaignId: string,
    assignmentId: string,
    taskId: string
  ): Promise<{ success: boolean; message: string }> {
    const participation = await db.query.campaignParticipations.findFirst({
      where: and(
        eq(campaignParticipations.campaignId, campaignId),
        eq(campaignParticipations.memberId, userId)
      ),
    });

    if (!participation) {
      return { success: false, message: 'Not participating in campaign' };
    }

    const pending = Array.isArray(participation.tasksPendingVerification)
      ? participation.tasksPendingVerification
      : [];
    const alreadyPending = pending.some(
      (p: unknown) => (p as Record<string, unknown>).assignmentId === assignmentId
    );
    if (alreadyPending) {
      return { success: true, message: 'Task already marked for deferred verification' };
    }

    const updated = [...pending, { taskId, assignmentId, completedAt: new Date().toISOString() }];

    await db
      .update(campaignParticipations)
      .set({
        tasksPendingVerification: updated,
        progressMetadata: {
          ...(participation.progressMetadata && typeof participation.progressMetadata === 'object'
            ? (participation.progressMetadata as Record<string, unknown>)
            : {}),
          lastActivityAt: new Date().toISOString(),
        },
      })
      .where(eq(campaignParticipations.id, participation.id));

    return { success: true, message: 'Task marked for verification at campaign end' };
  }

  // --------------------------------------------------------------------------
  // COMPLETION
  // --------------------------------------------------------------------------

  async checkAndAwardCompletion(userId: string, campaignId: string): Promise<boolean> {
    const progress = await this.getCampaignProgress(userId, campaignId);
    if (!progress.canClaimCompletion) return false;

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });
    if (!campaign) return false;

    // Atomically mark completion + claim bonus in a single UPDATE.
    // The WHERE clause ensures only one concurrent request can succeed,
    // preventing double-award of completion bonus points (C5 race condition fix).
    const result = await db
      .update(campaignParticipations)
      .set({
        campaignCompleted: true,
        campaignCompletedAt: new Date(),
        completionBonusAwarded: true,
        progressMetadata: {
          lastActivityAt: new Date().toISOString(),
        },
      })
      .where(
        and(
          eq(campaignParticipations.campaignId, campaignId),
          eq(campaignParticipations.memberId, userId),
          eq(campaignParticipations.completionBonusAwarded, false)
        )
      )
      .returning({ id: campaignParticipations.id });

    // If no rows updated, another request already completed this campaign
    if (result.length === 0) {
      console.warn(
        `[CampaignEngine] Completion already claimed for user ${userId} campaign ${campaignId}`
      );
      return false;
    }

    // Award completion bonus points AFTER the atomic claim succeeds
    if (campaign.completionBonusPoints && campaign.completionBonusPoints > 0) {
      try {
        await this.pointsService.awardPoints(
          userId,
          campaign.creatorId,
          campaign.tenantId,
          campaign.completionBonusPoints,
          'campaign_completion',
          `Campaign completion bonus: ${campaign.name}`,
          { campaignId }
        );
      } catch (err) {
        console.error(`[CampaignEngine] Failed to award completion bonus:`, err);
      }
    }

    // Build pending rewards from completionBonusRewards (flexible reward system)
    const bonusRewards = (campaign.completionBonusRewards as any[]) || [];
    if (bonusRewards.length > 0) {
      const pendingRewards: CompletionRewardItem[] = bonusRewards.map((r: any) => ({
        type: r.type as CompletionRewardItem['type'],
        rewardId: r.rewardId || r.metadata?.rewardId,
        metadata: {
          ...r.metadata,
          value: r.value,
          campaignId,
          campaignName: campaign.name,
        },
        status: 'pending' as const,
      }));

      // Store pending rewards on the participation record for the claim flow
      await db
        .update(campaignParticipations)
        .set({ pendingRewards: pendingRewards as any })
        .where(eq(campaignParticipations.id, result[0].id));
    }

    return true;
  }

  /**
   * Claim pending rewards after campaign completion.
   * Processes NFT mints, raffle entries, badge awards, and reward deliveries.
   * Returns the claimed rewards with delivery data.
   */
  async claimRewards(
    userId: string,
    campaignId: string
  ): Promise<{ success: boolean; claimedRewards: ClaimedRewardItem[]; error?: string }> {
    // Get participation record with pending rewards
    const participation = await db.query.campaignParticipations.findFirst({
      where: and(
        eq(campaignParticipations.campaignId, campaignId),
        eq(campaignParticipations.memberId, userId)
      ),
    });

    if (!participation) {
      return { success: false, claimedRewards: [], error: 'Not a campaign participant' };
    }

    if (!participation.campaignCompleted) {
      return { success: false, claimedRewards: [], error: 'Campaign not yet completed' };
    }

    if (participation.rewardsClaimedAt) {
      return {
        success: true,
        claimedRewards: (participation.claimedRewards as ClaimedRewardItem[]) || [],
        error: 'Rewards already claimed',
      };
    }

    const pending = (participation.pendingRewards as CompletionRewardItem[]) || [];
    if (pending.length === 0) {
      // No flexible rewards to claim -- just mark as claimed
      await db
        .update(campaignParticipations)
        .set({ rewardsClaimedAt: new Date() })
        .where(eq(campaignParticipations.id, participation.id));
      return { success: true, claimedRewards: [] };
    }

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    const claimed: ClaimedRewardItem[] = [];
    const now = new Date().toISOString();

    for (const reward of pending) {
      try {
        let deliveryData: Record<string, unknown> = {};

        switch (reward.type) {
          case 'nft': {
            // Get user wallet for NFT minting
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const walletAddress = user?.walletAddress || (user as any)?.avalancheL1Address;

            if (walletAddress) {
              // Mint NFT via blockchain service
              try {
                const { getBlockchainNFTService } = await import('../nft/blockchain-nft-service');
                const blockchainNFTService = getBlockchainNFTService();
                const collectionId = reward.metadata?.collectionId as string;
                const tokenUri = (reward.metadata?.tokenUri as string) || '';
                if (collectionId && blockchainNFTService) {
                  const mintResult = await blockchainNFTService.mintNFT(
                    walletAddress,
                    parseInt(collectionId),
                    tokenUri
                  );
                  deliveryData = {
                    txHash: mintResult.txHash,
                    tokenId: mintResult.tokenId?.toString(),
                    walletAddress,
                    mintedAt: now,
                  };
                }
              } catch (mintErr) {
                console.error(`[CampaignEngine] NFT mint failed:`, mintErr);
                deliveryData = { error: 'Mint failed - queued for retry', walletAddress };
              }
            } else {
              deliveryData = {
                error: 'No wallet connected - NFT will be delivered when wallet is set up',
              };
            }
            break;
          }

          case 'badge': {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const walletAddress = user?.walletAddress || (user as any)?.avalancheL1Address;
            if (walletAddress) {
              try {
                const { getBlockchainNFTService } = await import('../nft/blockchain-nft-service');
                const blockchainNFTService = getBlockchainNFTService();
                const badgeTypeId = reward.metadata?.badgeTypeId as number;
                if (badgeTypeId && blockchainNFTService) {
                  const mintResult = await blockchainNFTService.mintBadge(
                    walletAddress,
                    badgeTypeId,
                    1
                  );
                  deliveryData = {
                    txHash: mintResult.txHash,
                    walletAddress,
                    mintedAt: now,
                  };
                }
              } catch (mintErr) {
                console.error(`[CampaignEngine] Badge mint failed:`, mintErr);
                deliveryData = { error: 'Badge mint failed - queued for retry' };
              }
            }
            break;
          }

          case 'raffle_entry': {
            const { raffleEntries } = await import('@shared/schema');
            await db.insert(raffleEntries).values({
              tenantId: campaign?.tenantId || null,
              userId,
              campaignId,
              rewardId: reward.rewardId || null,
              entrySource: 'campaign_completion',
              entryCount: (reward.metadata?.value as number) || 1,
              metadata: {
                campaignName: campaign?.name,
                ...reward.metadata,
              },
            });
            deliveryData = {
              entries: (reward.metadata?.value as number) || 1,
              source: 'campaign_completion',
              recordedAt: now,
            };
            break;
          }

          case 'reward': {
            // Direct reward delivery -- create a redemption record
            deliveryData = {
              rewardId: reward.rewardId,
              status: 'pending_fulfillment',
              claimedAt: now,
            };
            break;
          }

          case 'points': {
            // Additional points beyond completionBonusPoints
            const extraPoints = (reward.metadata?.value as number) || 0;
            if (extraPoints > 0 && campaign) {
              await this.pointsService.awardPoints(
                userId,
                campaign.creatorId,
                campaign.tenantId,
                extraPoints,
                'campaign_reward',
                `Campaign reward points: ${campaign.name}`,
                { campaignId }
              );
            }
            deliveryData = { points: extraPoints, awardedAt: now };
            break;
          }
        }

        claimed.push({
          type: reward.type,
          rewardId: reward.rewardId,
          metadata: reward.metadata,
          claimedAt: now,
          deliveryData,
        });
      } catch (err) {
        console.error(`[CampaignEngine] Failed to claim reward:`, reward, err);
        claimed.push({
          type: reward.type,
          rewardId: reward.rewardId,
          metadata: reward.metadata,
          claimedAt: now,
          deliveryData: { error: 'Claim failed' },
        });
      }
    }

    // Update participation with claimed rewards
    await db
      .update(campaignParticipations)
      .set({
        claimedRewards: claimed as any,
        pendingRewards: pending.map((r) => ({ ...r, status: 'claimed' as const })) as any,
        rewardsClaimedAt: new Date(),
      })
      .where(eq(campaignParticipations.id, participation.id));

    return { success: true, claimedRewards: claimed };
  }

  // --------------------------------------------------------------------------
  // HANDLE RESOLUTION
  // --------------------------------------------------------------------------

  async resolveTaskHandle(
    assignmentId: string,
    platform: string,
    creatorHandle?: string
  ): Promise<ResolvedTaskHandle> {
    const assignment = await db.query.taskAssignments.findFirst({
      where: eq(taskAssignments.id, assignmentId),
      with: { sponsor: true },
    });

    if (assignment?.useSponsorHandle && assignment.sponsorId) {
      const sponsor = assignment.sponsor as CampaignSponsor | null;
      if (sponsor?.socialHandles) {
        const handles = sponsor.socialHandles as Record<string, string>;
        const handle = handles[platform];
        if (handle) {
          return {
            handle,
            source: 'sponsor',
            sponsorName: sponsor.name,
            sponsorLogoUrl: sponsor.logoUrl || undefined,
          };
        }
      }
    }

    return {
      handle: creatorHandle || '',
      source: 'creator',
    };
  }

  // --------------------------------------------------------------------------
  // CAMPAIGN MULTIPLIER
  // --------------------------------------------------------------------------

  async getCampaignMultiplier(campaignId: string): Promise<number> {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });
    if (!campaign?.campaignMultiplier) return 1.0;
    return parseFloat(campaign.campaignMultiplier.toString());
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private async addCompletedTask(userId: string, campaignId: string, assignmentId: string) {
    const participation = await db.query.campaignParticipations.findFirst({
      where: and(
        eq(campaignParticipations.campaignId, campaignId),
        eq(campaignParticipations.memberId, userId)
      ),
    });

    if (!participation) return;

    const completed = (participation.tasksCompleted as string[]) || [];
    if (completed.includes(assignmentId)) return;

    await db
      .update(campaignParticipations)
      .set({
        tasksCompleted: [...completed, assignmentId],
        participationCount: (participation.participationCount || 0) + 1,
        lastParticipation: new Date(),
        progressMetadata: {
          ...(participation.progressMetadata && typeof participation.progressMetadata === 'object'
            ? (participation.progressMetadata as Record<string, unknown>)
            : {}),
          lastActivityAt: new Date().toISOString(),
        },
      })
      .where(eq(campaignParticipations.id, participation.id));
  }

  private async checkNFTOwnership(userId: string, collectionIds: string[]): Promise<boolean> {
    // Check if user has any NFT deliveries from the required collections
    const deliveries = await db
      .select()
      .from(nftDeliveries)
      .where(
        and(eq(nftDeliveries.userId, userId), inArray(nftDeliveries.collectionId, collectionIds))
      )
      .limit(1);
    return deliveries.length > 0;
  }

  private async checkBadgeOwnership(userId: string, badgeIds: string[]): Promise<boolean> {
    // Check NFT deliveries where the mint references a badge template
    const deliveries = await db
      .select()
      .from(nftDeliveries)
      .where(eq(nftDeliveries.userId, userId));
    // For now, check if user has any badge-related deliveries
    // This can be refined when badge minting is fully integrated
    return deliveries.length > 0 || badgeIds.length === 0;
  }

  private async getUserReputation(userId: string): Promise<number> {
    // Use the reputation oracle score (0-1000) if available
    const { reputationScores } = await import('@shared/schema');
    const record = await db
      .select({ offChainScore: reputationScores.offChainScore })
      .from(reputationScores)
      .where(eq(reputationScores.userId, userId));

    if (record.length > 0) {
      return record[0].offChainScore;
    }

    // Fallback: calculate on-the-fly from raw points (legacy behavior)
    const programs = await db.select().from(fanPrograms).where(eq(fanPrograms.fanId, userId));
    return programs.reduce((sum, p) => sum + (p.totalPointsEarned || 0), 0);
  }

  private async getUserCompletedCampaignIds(userId: string): Promise<string[]> {
    const completions = await db
      .select({ campaignId: campaignParticipations.campaignId })
      .from(campaignParticipations)
      .where(
        and(
          eq(campaignParticipations.memberId, userId),
          eq(campaignParticipations.campaignCompleted, true)
        )
      );
    return completions.map((c) => c.campaignId);
  }

  private async getUserCompletedTaskIds(userId: string): Promise<string[]> {
    const completions = await db
      .select({ taskId: taskCompletions.taskId })
      .from(taskCompletions)
      .where(and(eq(taskCompletions.userId, userId), eq(taskCompletions.status, 'completed')));
    return completions.map((c) => c.taskId);
  }

  private async checkSubscription(userId: string, requiredTier?: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) return false;
    const tier = (user as Record<string, unknown>).customerTier;
    if (!tier || tier === 'basic') return false;
    if (requiredTier && tier !== requiredTier) return false;
    return true;
  }
}

export const campaignEngine = new CampaignEngineService();
