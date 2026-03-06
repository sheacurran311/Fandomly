import { describe, it, expect, vi, beforeEach } from 'vitest';
import { freeTenant, allstarTenant, enterpriseTenant } from '../fixtures/tenants';

// Use vi.hoisted so the state is available inside vi.mock factories (which are hoisted)
const { state } = vi.hoisted(() => {
  return {
    state: {
      callIndex: 0,
      callResults: [] as any[][],
    },
  };
});

// The DB chain: db.select().from().where() -> result OR db.select().from().where().limit() -> result
// We track each .where() call and return the appropriate result based on callIndex.
vi.mock('../../server/db', () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockImplementation(() => {
    const idx = state.callIndex++;
    const result = state.callResults[idx] ?? [];
    return {
      limit: vi.fn().mockResolvedValue(result),
      then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
  });
  return { db: chain };
});

vi.mock('@shared/schema', () => ({
  tenants: { id: 'tenants.id', subscriptionTier: 'tenants.subscriptionTier', limits: 'tenants.limits', ownerId: 'tenants.ownerId' },
  tasks: { tenantId: 'tasks.tenantId' },
  campaigns: { tenantId: 'campaigns.tenantId', status: 'campaigns.status' },
  loyaltyPrograms: { tenantId: 'loyaltyPrograms.tenantId' },
  socialConnections: { userId: 'socialConnections.userId', isActive: 'socialConnections.isActive' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  ne: vi.fn((a, b) => ({ type: 'ne', a, b })),
  sql: vi.fn(),
}));

import {
  checkSubscriptionLimit,
  enforceSubscriptionLimit,
} from '@server/services/subscription-limit-service';

describe('Subscription Limit Service', () => {
  beforeEach(() => {
    state.callIndex = 0;
    state.callResults = [];
    vi.clearAllMocks();
  });

  describe('checkSubscriptionLimit()', () => {
    it('should return not allowed when tenant not found', async () => {
      state.callResults = [[]];

      const result = await checkSubscriptionLimit('nonexistent-tenant', 'tasks');

      expect(result).toEqual({
        allowed: false,
        current: 0,
        max: 0,
        tier: 'unknown',
        limitType: 'tasks',
      });
    });

    it('should return allowed=true and skip counting for unlimited tiers', async () => {
      // allstar has unlimited tasks (-1), so countCurrentUsage should NOT be called
      state.callResults = [[{ subscriptionTier: 'allstar', limits: allstarTenant.limits }]];

      const result = await checkSubscriptionLimit(allstarTenant.id, 'tasks');

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(-1);
      expect(result.tier).toBe('allstar');
      expect(result.limitType).toBe('tasks');
      // Only 1 DB call (get tenant), no count call
      expect(state.callIndex).toBe(1);
    });

    it('should return allowed=true when under limit for tasks', async () => {
      // Call 0: get tenant (free tier, maxTasks=5)
      // Call 1: count tasks -> 3
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 3 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(3);
      expect(result.max).toBe(5);
      expect(result.tier).toBe('free');
    });

    it('should return allowed=false when at limit for tasks', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 5 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.max).toBe(5);
    });

    it('should return allowed=false when over limit', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 7 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(7);
      expect(result.max).toBe(5);
    });

    it('should return enterprise tier with all unlimited limits', async () => {
      state.callResults = [[{ subscriptionTier: 'enterprise', limits: enterpriseTenant.limits }]];

      const result = await checkSubscriptionLimit(enterpriseTenant.id, 'campaigns');

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(-1);
      expect(result.tier).toBe('enterprise');
    });

    it('should handle social connections with tenant owner lookup', async () => {
      // Call 0: get tenant (free tier, maxSocialConnections=3)
      // Call 1: get tenant owner
      // Call 2: count social connections
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ ownerId: 'user-owner-001' }],
        [{ count: 2 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'socialConnections');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.max).toBe(3);
    });

    it('should return 0 social connections when tenant owner not found', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [], // no owner found
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'socialConnections');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.max).toBe(3);
    });

    it('should skip counting for unlimited social connections', async () => {
      state.callResults = [[{ subscriptionTier: 'allstar', limits: allstarTenant.limits }]];

      const result = await checkSubscriptionLimit(allstarTenant.id, 'socialConnections');

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(-1);
      expect(state.callIndex).toBe(1); // no count call
    });

    it('should default to free tier when subscriptionTier is null', async () => {
      state.callResults = [
        [{ subscriptionTier: null, limits: {} }],
        [{ count: 2 }],
      ];

      const result = await checkSubscriptionLimit('tenant-no-tier', 'tasks');

      expect(result.tier).toBe('free');
      expect(result.max).toBe(5);
      expect(result.current).toBe(2);
      expect(result.allowed).toBe(true);
    });

    it('should handle null count result', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: null }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.current).toBe(0);
      expect(result.allowed).toBe(true);
    });

    it('should handle empty count result', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [], // empty result
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.current).toBe(0);
      expect(result.allowed).toBe(true);
    });
  });

  describe('enforceSubscriptionLimit()', () => {
    it('should not throw when limit is not exceeded (unlimited)', async () => {
      state.callResults = [[{ subscriptionTier: 'enterprise', limits: enterpriseTenant.limits }]];

      const result = await enforceSubscriptionLimit(enterpriseTenant.id, 'tasks');

      expect(result.allowed).toBe(true);
    });

    it('should not throw when under limit', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 2 }],
      ];

      const result = await enforceSubscriptionLimit(freeTenant.id, 'tasks');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
    });

    it('should throw LIMIT_EXCEEDED when tenant not found', async () => {
      state.callResults = [[]];

      try {
        await enforceSubscriptionLimit('nonexistent-tenant', 'tasks');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('LIMIT_EXCEEDED');
        expect(error.status).toBe(403);
        expect(error.details.upgradeUrl).toBe('/creator-dashboard/subscriptions');
      }
    });

    it('should throw LIMIT_EXCEEDED when at limit', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 5 }],
      ];

      try {
        await enforceSubscriptionLimit(freeTenant.id, 'tasks');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('LIMIT_EXCEEDED');
        expect(error.status).toBe(403);
        expect(error.message).toContain('tasks');
        expect(error.message).toContain('5');
        expect(error.message).toContain('free');
        expect(error.message).toContain('Upgrade to add more');
        expect(error.details).toEqual({
          current: 5,
          max: 5,
          tier: 'free',
          limitType: 'tasks',
          upgradeUrl: '/creator-dashboard/subscriptions',
        });
      }
    });

    it('should use correct label for social connections in error', async () => {
      state.callResults = [[]];

      try {
        await enforceSubscriptionLimit('x', 'socialConnections');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('social connections');
      }
    });

    it('should use correct label for campaigns in error', async () => {
      state.callResults = [[]];

      try {
        await enforceSubscriptionLimit('x', 'campaigns');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('campaigns');
      }
    });

    it('should use correct label for programs in error', async () => {
      state.callResults = [[]];

      try {
        await enforceSubscriptionLimit('x', 'programs');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('loyalty programs');
      }
    });
  });

  describe('LimitType to tier limit mapping', () => {
    it('should map tasks to maxTasks (free=5)', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 1 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'tasks');
      expect(result.max).toBe(5);
    });

    it('should map campaigns to maxCampaigns (free=0)', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 0 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'campaigns');
      expect(result.max).toBe(0);
      // free tier has 0 campaigns, so even 0 usage means not allowed (0 < 0 is false)
      expect(result.allowed).toBe(false);
    });

    it('should map socialConnections to maxSocialConnections (free=3)', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ ownerId: 'user-001' }],
        [{ count: 1 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'socialConnections');
      expect(result.max).toBe(3);
    });

    it('should map programs to maxPrograms (free=1)', async () => {
      state.callResults = [
        [{ subscriptionTier: 'free', limits: freeTenant.limits }],
        [{ count: 0 }],
      ];

      const result = await checkSubscriptionLimit(freeTenant.id, 'programs');
      expect(result.max).toBe(1);
    });
  });
});
