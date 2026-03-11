/**
 * Fandomly Three-Tier Referral Service
 *
 * Handles all referral tracking and rewards:
 * 1. Creator → Creator (Revenue Share)
 * 2. Fan → Fan (Fandomly Points)
 * 3. Creator Task/Campaign Referrals (Creator Points)
 */

import { db } from '../../db';
import {
  creatorReferrals,
  fanReferrals,
  creatorTaskReferrals,
  creators,
  tasks,
  campaigns,
  type CreatorReferral,
  type FanReferral,
  type CreatorTaskReferral,
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { fandomlyPointsService, creatorPointsService } from '../points/points-service';
import { onReputationSignalChanged } from '../reputation/reputation-event-handler';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique referral code
 */
function generateUniqueCode(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${randomPart}${timestamp.slice(-3)}`;
}

/**
 * Generate referral URL for different contexts
 */
function generateReferralUrl(
  type: 'creator' | 'fan' | 'task' | 'campaign',
  params: {
    code: string;
    creatorUrl?: string;
    taskId?: string;
    campaignId?: string;
  }
): string {
  const baseUrl = process.env.VITE_APP_URL || 'https://fandomly.ai';

  switch (type) {
    case 'creator':
      return `${baseUrl}?ref=${params.code.toLowerCase()}`;

    case 'fan':
      return `${baseUrl}?fanref=${params.code.toLowerCase()}`;

    case 'task':
      return `${baseUrl}/${params.creatorUrl}/tasks/${params.taskId}?ref=${params.code.toLowerCase()}`;

    case 'campaign':
      return `${baseUrl}/${params.creatorUrl}/campaigns/${params.campaignId}?ref=${params.code.toLowerCase()}`;

    default:
      return baseUrl;
  }
}

// ============================================================================
// CREATOR → CREATOR REFERRALS (Revenue Share)
// ============================================================================

export class CreatorReferralService {
  /**
   * Create or get existing creator referral
   */
  async getOrCreateCreatorReferral(creatorId: string): Promise<CreatorReferral> {
    // Check if referral already exists
    const [existing] = await db
      .select()
      .from(creatorReferrals)
      .where(eq(creatorReferrals.referringCreatorId, creatorId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new referral
    const code = generateUniqueCode('CREATOR');
    const url = generateReferralUrl('creator', { code });

    const [referral] = await db
      .insert(creatorReferrals)
      .values({
        referringCreatorId: creatorId,
        referralCode: code,
        referralUrl: url,
        status: 'active',
        commissionPercentage: '10.00', // Default 10%
      })
      .returning();

    return referral;
  }

  /**
   * Track referral link click
   */
  async trackClick(code: string): Promise<void> {
    await db
      .update(creatorReferrals)
      .set({
        clickCount: sql`${creatorReferrals.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creatorReferrals.referralCode, code));
  }

  /**
   * Complete referral when new creator signs up
   */
  async completeReferral(code: string, newCreatorId: string): Promise<void> {
    const [referral] = await db
      .select()
      .from(creatorReferrals)
      .where(eq(creatorReferrals.referralCode, code))
      .limit(1);

    if (!referral || referral.status !== 'active') {
      return;
    }

    await db
      .update(creatorReferrals)
      .set({
        referredCreatorId: newCreatorId,
        signupDate: new Date(),
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(creatorReferrals.id, referral.id));
  }

  /**
   * Mark referral as paid (when referred creator upgrades)
   */
  async markFirstPaid(referredCreatorId: string): Promise<void> {
    const [referral] = await db
      .select()
      .from(creatorReferrals)
      .where(
        and(
          eq(creatorReferrals.referredCreatorId, referredCreatorId),
          eq(creatorReferrals.status, 'active')
        )
      )
      .limit(1);

    if (!referral) {
      return;
    }

    await db
      .update(creatorReferrals)
      .set({
        firstPaidDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorReferrals.id, referral.id));
  }

  /**
   * Calculate and record commission
   */
  async calculateCommission(referredCreatorId: string, paymentAmount: number): Promise<number> {
    const [referral] = await db
      .select()
      .from(creatorReferrals)
      .where(
        and(
          eq(creatorReferrals.referredCreatorId, referredCreatorId),
          eq(creatorReferrals.status, 'active')
        )
      )
      .limit(1);

    if (!referral) {
      return 0;
    }

    const percentage = parseFloat(referral.commissionPercentage ?? '0');
    const commission = paymentAmount * (percentage / 100);

    // Update totals
    await db
      .update(creatorReferrals)
      .set({
        totalRevenueGenerated: sql`${creatorReferrals.totalRevenueGenerated} + ${paymentAmount}`,
        totalCommissionEarned: sql`${creatorReferrals.totalCommissionEarned} + ${commission}`,
        updatedAt: new Date(),
      })
      .where(eq(creatorReferrals.id, referral.id));

    return commission;
  }

  /**
   * Get creator's referral stats
   */
  async getCreatorReferralStats(creatorId: string) {
    try {
      const [referral] = await db
        .select()
        .from(creatorReferrals)
        .where(eq(creatorReferrals.referringCreatorId, creatorId))
        .limit(1);

      if (!referral) {
        return null;
      }

      // Get referred creators
      const referredCreators = await db
        .select()
        .from(creatorReferrals)
        .where(
          and(
            eq(creatorReferrals.referringCreatorId, creatorId),
            sql`${creatorReferrals.referredCreatorId} IS NOT NULL`
          )
        );

      return {
        referralCode: referral.referralCode,
        referralUrl: referral.referralUrl,
        totalClicks: referral.clickCount || 0,
        totalSignups: referredCreators.length,
        totalRevenue: parseFloat(referral.totalRevenueGenerated || '0'),
        totalCommission: parseFloat(referral.totalCommissionEarned || '0'),
        commissionPercentage: parseFloat(referral.commissionPercentage || '0'),
        referredCreators: referredCreators.map((r) => ({
          id: r.referredCreatorId,
          signupDate: r.signupDate,
          firstPaidDate: r.firstPaidDate,
          revenue: parseFloat(r.totalRevenueGenerated || '0'),
          commission: parseFloat(r.totalCommissionEarned || '0'),
        })),
      };
    } catch (error) {
      console.error('[ReferralService] Error in getCreatorReferralStats:', error);
      throw error;
    }
  }
}

// ============================================================================
// FAN → FAN REFERRALS (Fandomly Points)
// ============================================================================

export class FanReferralService {
  /**
   * Create or get existing fan referral
   */
  async getOrCreateFanReferral(fanId: string): Promise<FanReferral> {
    // Check if referral already exists
    const [existing] = await db
      .select()
      .from(fanReferrals)
      .where(eq(fanReferrals.referringFanId, fanId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new referral
    const code = generateUniqueCode('FAN');
    const url = generateReferralUrl('fan', { code });

    const [referral] = await db
      .insert(fanReferrals)
      .values({
        referringFanId: fanId,
        referralCode: code,
        referralUrl: url,
        status: 'pending',
        percentageRewardsEnabled: true,
        percentageValue: '5.00', // Default 5%
        percentageExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    return referral;
  }

  /**
   * Track referral link click
   */
  async trackClick(code: string): Promise<void> {
    await db
      .update(fanReferrals)
      .set({
        clickCount: sql`${fanReferrals.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(fanReferrals.referralCode, code));
  }

  /**
   * Complete referral when new fan signs up
   */
  async completeReferral(code: string, newFanId: string): Promise<void> {
    const [referral] = await db
      .select()
      .from(fanReferrals)
      .where(eq(fanReferrals.referralCode, code))
      .limit(1);

    if (!referral) {
      return;
    }

    await db
      .update(fanReferrals)
      .set({
        referredFanId: newFanId,
        signupDate: new Date(),
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(fanReferrals.id, referral.id));

    // Notify reputation system of new referral (non-blocking)
    if (referral.referringFanId) {
      onReputationSignalChanged(referral.referringFanId, 'referralCount');
    }

    // Award signup bonus to referrer
    await this.awardReferralPoints(referral.id, 'signup', 50, 'Friend signed up');
  }

  /**
   * Award referral points for milestones
   */
  async awardReferralPoints(
    referralId: string,
    milestone: 'signup' | 'first_task' | 'profile_complete',
    points: number,
    reason: string
  ): Promise<void> {
    const [referral] = await db
      .select()
      .from(fanReferrals)
      .where(eq(fanReferrals.id, referralId))
      .limit(1);

    if (!referral || referral.status !== 'active') {
      return;
    }

    // Update milestone tracking
    const updates: Record<string, unknown> = {
      totalPointsReferrerEarned: sql`${fanReferrals.totalPointsReferrerEarned} + ${points}`,
      updatedAt: new Date(),
    };

    if (milestone === 'first_task') {
      updates.firstTaskCompletedAt = new Date();
    } else if (milestone === 'profile_complete') {
      updates.profileCompletedAt = new Date();
    }

    await db.update(fanReferrals).set(updates).where(eq(fanReferrals.id, referralId));

    // Award Fandomly Points to referring fan
    if (!referral.referringFanId) return;
    await fandomlyPointsService.awardPoints(
      referral.referringFanId,
      points,
      `fan_referral_${milestone}`,
      reason,
      { referralId, milestone }
    );
  }

  /**
   * Track points earned by referred user (for percentage rewards)
   */
  async trackReferredUserPoints(referredFanId: string, points: number): Promise<void> {
    const [referral] = await db
      .select()
      .from(fanReferrals)
      .where(
        and(
          eq(fanReferrals.referredFanId, referredFanId),
          eq(fanReferrals.status, 'active'),
          eq(fanReferrals.percentageRewardsEnabled, true)
        )
      )
      .limit(1);

    if (!referral) {
      return;
    }

    // Check if percentage rewards are still valid
    if (referral.percentageExpiresAt && new Date() > referral.percentageExpiresAt) {
      return;
    }

    const percentage = parseFloat(referral.percentageValue ?? '0');
    const bonusPoints = Math.floor(points * (percentage / 100));

    // Update tracking
    await db
      .update(fanReferrals)
      .set({
        totalPointsReferredUserEarned: sql`${fanReferrals.totalPointsReferredUserEarned} + ${points}`,
        totalPointsReferrerEarned: sql`${fanReferrals.totalPointsReferrerEarned} + ${bonusPoints}`,
        updatedAt: new Date(),
      })
      .where(eq(fanReferrals.id, referral.id));

    // Award bonus Fandomly Points to referring fan
    if (bonusPoints > 0 && referral.referringFanId) {
      await fandomlyPointsService.awardPoints(
        referral.referringFanId,
        bonusPoints,
        'fan_referral_percentage',
        `Earned ${bonusPoints} bonus points (${percentage}% of friend's ${points} points)`,
        { referralId: referral.id ?? undefined, referredFanId }
      );
    }
  }

  /**
   * Get fan's referral stats
   */
  async getFanReferralStats(fanId: string) {
    try {
      const [referral] = await db
        .select()
        .from(fanReferrals)
        .where(eq(fanReferrals.referringFanId, fanId))
        .limit(1);

      if (!referral) {
        return null;
      }

      // Count referred fans
      const referredFans = await db
        .select()
        .from(fanReferrals)
        .where(
          and(
            eq(fanReferrals.referringFanId, fanId),
            sql`${fanReferrals.referredFanId} IS NOT NULL`
          )
        );

      const friendsWithFirstTask = referredFans.filter((r) => r.firstTaskCompletedAt).length;
      const friendsWithProfileComplete = referredFans.filter((r) => r.profileCompletedAt).length;

      return {
        referralCode: referral.referralCode,
        referralUrl: referral.referralUrl,
        totalClicks: referral.clickCount,
        totalFriends: referredFans.length,
        friendsWithFirstTask,
        friendsWithProfileComplete,
        totalPointsEarned: referral.totalPointsReferrerEarned,
        percentageRewardsActive:
          referral.percentageRewardsEnabled &&
          (!referral.percentageExpiresAt || new Date() < referral.percentageExpiresAt),
        percentageValue: parseFloat(referral.percentageValue ?? '0'),
        percentageExpiresAt: referral.percentageExpiresAt,
        referredFans: referredFans.map((r) => ({
          id: r.referredFanId,
          signupDate: r.signupDate,
          firstTaskCompleted: r.firstTaskCompletedAt,
          profileCompleted: r.profileCompletedAt,
          pointsEarned: r.totalPointsReferredUserEarned || 0,
        })),
      };
    } catch (error) {
      console.error('[ReferralService] Error in getFanReferralStats:', error);
      throw error;
    }
  }
}

// ============================================================================
// CREATOR TASK/CAMPAIGN REFERRALS (Creator Points)
// ============================================================================

export class CreatorTaskReferralService {
  /**
   * Create task referral link for a fan
   */
  async createTaskReferral(
    taskId: string,
    fanId: string,
    creatorId: string
  ): Promise<CreatorTaskReferral> {
    // Get task details for URL generation
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);

    if (!task || !creator) {
      throw new Error('Task or creator not found');
    }

    // Check if referral already exists
    const [existing] = await db
      .select()
      .from(creatorTaskReferrals)
      .where(
        and(eq(creatorTaskReferrals.taskId, taskId), eq(creatorTaskReferrals.referringFanId, fanId))
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Generate code and URL (creator has displayName, not username; use displayName for slug)
    const creatorSlug =
      creator.displayName
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 20) || creatorId.slice(0, 8);
    const baseCode = generateUniqueCode('TASK');
    const code = `${creatorSlug}-${baseCode}`;
    const url = generateReferralUrl('task', {
      code,
      creatorUrl: creatorSlug,
      taskId: task.id,
    });

    const [referral] = await db
      .insert(creatorTaskReferrals)
      .values({
        creatorId,
        taskId,
        referringFanId: fanId,
        referralCode: code,
        referralUrl: url,
        referralType: 'task',
        status: 'pending',
        sharePercentage: '10.00', // Default 10% share
      })
      .returning();

    return referral;
  }

  /**
   * Create campaign referral link for a fan
   */
  async createCampaignReferral(
    campaignId: string,
    fanId: string,
    creatorId: string
  ): Promise<CreatorTaskReferral> {
    // Get campaign details
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);

    if (!campaign || !creator) {
      throw new Error('Campaign or creator not found');
    }

    // Check if referral already exists
    const [existing] = await db
      .select()
      .from(creatorTaskReferrals)
      .where(
        and(
          eq(creatorTaskReferrals.campaignId, campaignId),
          eq(creatorTaskReferrals.referringFanId, fanId)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Generate code and URL (creator has displayName, not username; use displayName for slug)
    const creatorSlug =
      creator.displayName
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 20) || creatorId.slice(0, 8);
    const baseCode = generateUniqueCode('CAMP');
    const code = `${creatorSlug}-${baseCode}`;
    const url = generateReferralUrl('campaign', {
      code,
      creatorUrl: creatorSlug,
      campaignId: campaign.id,
    });

    const [referral] = await db
      .insert(creatorTaskReferrals)
      .values({
        creatorId,
        campaignId,
        referringFanId: fanId,
        referralCode: code,
        referralUrl: url,
        referralType: 'campaign',
        status: 'pending',
        sharePercentage: '10.00',
      })
      .returning();

    return referral;
  }

  /**
   * Track referral link click
   */
  async trackClick(code: string): Promise<void> {
    await db
      .update(creatorTaskReferrals)
      .set({
        clickCount: sql`${creatorTaskReferrals.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creatorTaskReferrals.referralCode, code));
  }

  /**
   * Complete referral when friend signs up
   */
  async completeReferral(code: string, newFanId: string): Promise<void> {
    const [referral] = await db
      .select()
      .from(creatorTaskReferrals)
      .where(eq(creatorTaskReferrals.referralCode, code))
      .limit(1);

    if (!referral) {
      return;
    }

    await db
      .update(creatorTaskReferrals)
      .set({
        referredFanId: newFanId,
        signupDate: new Date(),
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(creatorTaskReferrals.id, referral.id));

    // Award signup bonus (25 creator points)
    await this.awardTaskReferralPoints(
      referral.id,
      'signup',
      25,
      'Friend signed up via your referral'
    );
  }

  /**
   * Mark when friend joins this specific creator
   */
  async markFriendJoinedCreator(referralId: string): Promise<void> {
    await db
      .update(creatorTaskReferrals)
      .set({
        joinedCreatorDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorTaskReferrals.id, referralId));

    // Award bonus (50 creator points)
    await this.awardTaskReferralPoints(
      referralId,
      'joined_creator',
      50,
      'Friend joined this creator'
    );
  }

  /**
   * Mark when friend completes the task
   */
  async markTaskCompleted(referralId: string): Promise<void> {
    await db
      .update(creatorTaskReferrals)
      .set({
        completedTaskDate: new Date(),
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(creatorTaskReferrals.id, referralId));

    // Award completion bonus (100 creator points)
    await this.awardTaskReferralPoints(
      referralId,
      'completed_task',
      100,
      'Friend completed the task'
    );
  }

  /**
   * Award creator points for referral milestones
   */
  async awardTaskReferralPoints(
    referralId: string,
    milestone: 'signup' | 'joined_creator' | 'completed_task',
    points: number,
    reason: string
  ): Promise<void> {
    const [referral] = await db
      .select()
      .from(creatorTaskReferrals)
      .where(eq(creatorTaskReferrals.id, referralId))
      .limit(1);

    if (!referral) {
      return;
    }

    // Update points tracking
    await db
      .update(creatorTaskReferrals)
      .set({
        totalCreatorPointsEarned: sql`${creatorTaskReferrals.totalCreatorPointsEarned} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(creatorTaskReferrals.id, referralId));

    // Award creator points to referring fan
    // Get tenant ID for the creator
    const [creator] = await db
      .select()
      .from(creators)
      .where(eq(creators.id, referral.creatorId))
      .limit(1);

    if (creator) {
      await creatorPointsService.awardPoints(
        referral.referringFanId,
        referral.creatorId,
        creator.tenantId,
        points,
        `task_referral_${milestone}`,
        reason,
        { referralId, taskId: referral.taskId, campaignId: referral.campaignId }
      );
    }
  }

  /**
   * Get task/campaign referral stats for a fan
   */
  async getFanTaskReferralStats(fanId: string, creatorId?: string) {
    const referrals = creatorId
      ? await db
          .select()
          .from(creatorTaskReferrals)
          .where(
            and(
              eq(creatorTaskReferrals.referringFanId, fanId),
              eq(creatorTaskReferrals.creatorId, creatorId)
            )
          )
          .orderBy(desc(creatorTaskReferrals.createdAt))
      : await db
          .select()
          .from(creatorTaskReferrals)
          .where(eq(creatorTaskReferrals.referringFanId, fanId))
          .orderBy(desc(creatorTaskReferrals.createdAt));

    const stats = {
      totalShares: referrals.length,
      totalClicks: referrals.reduce((sum, r) => sum + (r.clickCount ?? 0), 0),
      totalSignups: referrals.filter((r) => r.signupDate).length,
      totalCompletions: referrals.filter((r) => r.completedTaskDate).length,
      totalPointsEarned: referrals.reduce((sum, r) => sum + (r.totalCreatorPointsEarned ?? 0), 0),
      referrals: referrals.map((r) => ({
        id: r.id,
        code: r.referralCode,
        url: r.referralUrl,
        type: r.referralType,
        taskId: r.taskId,
        campaignId: r.campaignId,
        clicks: r.clickCount ?? 0,
        friendJoined: !!r.signupDate,
        taskCompleted: !!r.completedTaskDate,
        pointsEarned: r.totalCreatorPointsEarned ?? 0,
        createdAt: r.createdAt,
      })),
    };

    return stats;
  }

  /**
   * Get leaderboard of top referrers for a creator
   */
  async getCreatorReferralLeaderboard(creatorId: string, limit: number = 10) {
    const referrals = await db
      .select()
      .from(creatorTaskReferrals)
      .where(eq(creatorTaskReferrals.creatorId, creatorId))
      .orderBy(desc(creatorTaskReferrals.totalCreatorPointsEarned))
      .limit(limit);

    // Group by fan and sum points
    const fanTotals = new Map<string, number>();
    const fanData = new Map<string, Record<string, unknown>>();

    for (const ref of referrals) {
      const current = fanTotals.get(ref.referringFanId) || 0;
      fanTotals.set(ref.referringFanId, current + (ref.totalCreatorPointsEarned ?? 0));

      if (!fanData.has(ref.referringFanId)) {
        fanData.set(ref.referringFanId, {
          fanId: ref.referringFanId,
          totalShares: 0,
          totalCompletions: 0,
        });
      }

      const data = fanData.get(ref.referringFanId);
      if (data) {
        (data.totalShares as number)++;
        if (ref.completedTaskDate) (data.totalCompletions as number)++;
      }
    }

    // Sort and limit
    const leaderboard = Array.from(fanTotals.entries())
      .map(([fanId, points]) => ({
        fanId,
        totalPoints: points,
        ...fanData.get(fanId),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    return leaderboard;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const creatorReferralService = new CreatorReferralService();
export const fanReferralService = new FanReferralService();
export const creatorTaskReferralService = new CreatorTaskReferralService();
