/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Subscription Limit Enforcement Service
 *
 * Checks whether a tenant has exceeded their subscription tier limits
 * before allowing resource creation (tasks, campaigns, social connections, programs).
 */

import { db } from '../db';
import { tasks, campaigns, loyaltyPrograms, socialConnections, tenants } from '@shared/schema';
import { eq, and, sql, ne } from 'drizzle-orm';
import { getTierLimits, isUnlimited, type SubscriptionTier } from '@shared/subscription-config';

export type LimitType = 'tasks' | 'campaigns' | 'socialConnections' | 'programs';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  tier: string;
  limitType: LimitType;
}

/**
 * Check whether the tenant can create another resource of the given type.
 * Returns { allowed, current, max, tier }.
 */
export async function checkSubscriptionLimit(
  tenantId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  // Get the tenant to find subscription tier
  const [tenant] = await db
    .select({
      subscriptionTier: tenants.subscriptionTier,
      limits: tenants.limits,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return { allowed: false, current: 0, max: 0, tier: 'unknown', limitType };
  }

  const tier = (tenant.subscriptionTier as SubscriptionTier) || 'free';
  const tierLimits = getTierLimits(tier);

  // Get the limit for this type
  const limitMap: Record<LimitType, number> = {
    tasks: tierLimits.maxTasks,
    campaigns: tierLimits.maxCampaigns,
    socialConnections: tierLimits.maxSocialConnections,
    programs: tierLimits.maxPrograms,
  };

  const max = limitMap[limitType];

  // Unlimited: always allowed
  if (isUnlimited(max)) {
    return { allowed: true, current: 0, max: -1, tier, limitType };
  }

  // Count current usage
  const current = await countCurrentUsage(tenantId, limitType);

  return {
    allowed: current < max,
    current,
    max,
    tier,
    limitType,
  };
}

/**
 * Check limit and throw if exceeded. Use in route handlers.
 */
export async function enforceSubscriptionLimit(
  tenantId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  const result = await checkSubscriptionLimit(tenantId, limitType);

  if (!result.allowed) {
    const labelMap: Record<LimitType, string> = {
      tasks: 'tasks',
      campaigns: 'campaigns',
      socialConnections: 'social connections',
      programs: 'loyalty programs',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error: any = new Error(
      `You've reached the maximum of ${result.max} ${labelMap[limitType]} on your ${result.tier} plan. Upgrade to add more.`
    );
    error.status = 403;
    error.code = 'LIMIT_EXCEEDED';
    error.details = {
      current: result.current,
      max: result.max,
      tier: result.tier,
      limitType: result.limitType,
      upgradeUrl: '/creator-dashboard/subscriptions',
    };
    throw error;
  }

  return result;
}

/**
 * Count current resource usage for a tenant.
 */
async function countCurrentUsage(tenantId: string, limitType: LimitType): Promise<number> {
  switch (limitType) {
    case 'tasks': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.tenantId, tenantId));
      return Number(result?.count ?? 0);
    }
    case 'campaigns': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(campaigns)
        .where(and(eq(campaigns.tenantId, tenantId), ne(campaigns.status, 'archived')));
      return Number(result?.count ?? 0);
    }
    case 'programs': {
      // Count programs by looking up the creator for this tenant
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.tenantId, tenantId));
      return Number(result?.count ?? 0);
    }
    case 'socialConnections': {
      // Social connections are per-user, so we need the tenant owner
      const [tenant] = await db
        .select({ ownerId: tenants.ownerId })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) return 0;

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(socialConnections)
        .where(
          and(eq(socialConnections.userId, tenant.ownerId), eq(socialConnections.isActive, true))
        );
      return Number(result?.count ?? 0);
    }
    default:
      return 0;
  }
}
