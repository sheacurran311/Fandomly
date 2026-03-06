import { describe, it, expect } from 'vitest';
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  SELECTABLE_TIERS,
  getTierLimits,
  getTierDefinition,
  isUnlimited,
  type SubscriptionTier,
  type TierLimits,
  type TierDefinition,
} from '@shared/subscription-config';

describe('Subscription Config', () => {
  describe('SUBSCRIPTION_TIERS', () => {
    it('should define exactly 5 tiers', () => {
      expect(Object.keys(SUBSCRIPTION_TIERS)).toHaveLength(5);
    });

    it('should have all expected tier IDs', () => {
      const expectedTiers: SubscriptionTier[] = ['free', 'beginner', 'rising', 'allstar', 'enterprise'];
      expectedTiers.forEach((tier) => {
        expect(SUBSCRIPTION_TIERS).toHaveProperty(tier);
      });
    });

    it('should have required properties for each tier', () => {
      Object.values(SUBSCRIPTION_TIERS).forEach((tier) => {
        expect(tier).toHaveProperty('id');
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        expect(tier).toHaveProperty('priceLabel');
        expect(tier).toHaveProperty('description');
        expect(tier).toHaveProperty('limits');
        expect(tier).toHaveProperty('features');
        expect(Array.isArray(tier.features)).toBe(true);
        expect(tier.features.length).toBeGreaterThan(0);
      });
    });

    it('should have matching id fields', () => {
      Object.entries(SUBSCRIPTION_TIERS).forEach(([key, tier]) => {
        expect(tier.id).toBe(key);
      });
    });

    it('should have valid limit properties for each tier', () => {
      const requiredLimitKeys: (keyof TierLimits)[] = [
        'maxSocialConnections',
        'maxTasks',
        'maxCampaigns',
        'maxMembers',
        'maxPrograms',
        'maxRewards',
        'maxApiCalls',
        'storageLimit',
        'customDomain',
        'advancedAnalytics',
        'whiteLabel',
      ];

      Object.values(SUBSCRIPTION_TIERS).forEach((tier) => {
        requiredLimitKeys.forEach((key) => {
          expect(tier.limits).toHaveProperty(key);
        });
      });
    });
  });

  describe('Tier Pricing', () => {
    it('should have free tier at $0', () => {
      expect(SUBSCRIPTION_TIERS.free.price).toBe(0);
      expect(SUBSCRIPTION_TIERS.free.priceLabel).toBe('$0/month');
    });

    it('should have beginner tier at $9.99', () => {
      expect(SUBSCRIPTION_TIERS.beginner.price).toBe(9.99);
      expect(SUBSCRIPTION_TIERS.beginner.priceLabel).toBe('$9.99/month');
    });

    it('should have rising tier at $19.99', () => {
      expect(SUBSCRIPTION_TIERS.rising.price).toBe(19.99);
      expect(SUBSCRIPTION_TIERS.rising.priceLabel).toBe('$19.99/month');
    });

    it('should have allstar tier at $39.99', () => {
      expect(SUBSCRIPTION_TIERS.allstar.price).toBe(39.99);
      expect(SUBSCRIPTION_TIERS.allstar.priceLabel).toBe('$39.99/month');
    });

    it('should have enterprise tier with custom pricing', () => {
      expect(SUBSCRIPTION_TIERS.enterprise.price).toBeNull();
      expect(SUBSCRIPTION_TIERS.enterprise.priceLabel).toBe('Custom');
    });

    it('should have prices in ascending order for paid tiers', () => {
      const paidTiers = ['beginner', 'rising', 'allstar'] as const;
      for (let i = 1; i < paidTiers.length; i++) {
        const prev = SUBSCRIPTION_TIERS[paidTiers[i - 1]].price as number;
        const curr = SUBSCRIPTION_TIERS[paidTiers[i]].price as number;
        expect(curr).toBeGreaterThan(prev);
      }
    });
  });

  describe('Tier Limits Scaling', () => {
    it('should increase limits from free to allstar', () => {
      const scalingKeys: (keyof TierLimits)[] = [
        'maxSocialConnections',
        'maxTasks',
        'maxMembers',
        'maxPrograms',
      ];

      const orderedTiers: SubscriptionTier[] = ['free', 'beginner', 'rising', 'allstar'];
      for (let i = 1; i < orderedTiers.length; i++) {
        const prevLimits = SUBSCRIPTION_TIERS[orderedTiers[i - 1]].limits;
        const currLimits = SUBSCRIPTION_TIERS[orderedTiers[i]].limits;

        scalingKeys.forEach((key) => {
          const prev = prevLimits[key] as number;
          const curr = currLimits[key] as number;
          // Current should be >= previous (unlimited is -1, which is actually "more")
          if (!isUnlimited(curr)) {
            expect(curr).toBeGreaterThanOrEqual(prev);
          }
        });
      }
    });

    it('should have free tier with strict limits', () => {
      const free = SUBSCRIPTION_TIERS.free.limits;
      expect(free.maxSocialConnections).toBe(3);
      expect(free.maxTasks).toBe(5);
      expect(free.maxCampaigns).toBe(0);
      expect(free.maxMembers).toBe(100);
      expect(free.maxPrograms).toBe(1);
    });

    it('should have enterprise tier with all unlimited numeric limits', () => {
      const ent = SUBSCRIPTION_TIERS.enterprise.limits;
      expect(isUnlimited(ent.maxSocialConnections)).toBe(true);
      expect(isUnlimited(ent.maxTasks)).toBe(true);
      expect(isUnlimited(ent.maxCampaigns)).toBe(true);
      expect(isUnlimited(ent.maxMembers)).toBe(true);
      expect(isUnlimited(ent.maxPrograms)).toBe(true);
      expect(isUnlimited(ent.maxRewards)).toBe(true);
      expect(isUnlimited(ent.maxApiCalls)).toBe(true);
      expect(isUnlimited(ent.storageLimit)).toBe(true);
    });

    it('should have allstar with unlimited socials, tasks, and campaigns', () => {
      const allstar = SUBSCRIPTION_TIERS.allstar.limits;
      expect(isUnlimited(allstar.maxSocialConnections)).toBe(true);
      expect(isUnlimited(allstar.maxTasks)).toBe(true);
      expect(isUnlimited(allstar.maxCampaigns)).toBe(true);
    });

    it('should have enterprise with all premium features enabled', () => {
      const ent = SUBSCRIPTION_TIERS.enterprise.limits;
      expect(ent.customDomain).toBe(true);
      expect(ent.advancedAnalytics).toBe(true);
      expect(ent.whiteLabel).toBe(true);
    });

    it('should have free tier without premium features', () => {
      const free = SUBSCRIPTION_TIERS.free.limits;
      expect(free.customDomain).toBe(false);
      expect(free.advancedAnalytics).toBe(false);
      expect(free.whiteLabel).toBe(false);
    });
  });

  describe('Recommended Tier', () => {
    it('should mark rising tier as recommended', () => {
      expect(SUBSCRIPTION_TIERS.rising.recommended).toBe(true);
    });

    it('should have only one recommended tier', () => {
      const recommended = Object.values(SUBSCRIPTION_TIERS).filter((t) => t.recommended);
      expect(recommended).toHaveLength(1);
      expect(recommended[0].id).toBe('rising');
    });
  });

  describe('getTierLimits()', () => {
    it('should return correct limits for each tier', () => {
      const tiers: SubscriptionTier[] = ['free', 'beginner', 'rising', 'allstar', 'enterprise'];
      tiers.forEach((tier) => {
        const limits = getTierLimits(tier);
        expect(limits).toEqual(SUBSCRIPTION_TIERS[tier].limits);
      });
    });

    it('should return free tier limits for unknown tier', () => {
      const limits = getTierLimits('nonexistent' as SubscriptionTier);
      expect(limits).toEqual(SUBSCRIPTION_TIERS.free.limits);
    });
  });

  describe('getTierDefinition()', () => {
    it('should return full definition for each tier', () => {
      const tiers: SubscriptionTier[] = ['free', 'beginner', 'rising', 'allstar', 'enterprise'];
      tiers.forEach((tier) => {
        const def = getTierDefinition(tier);
        expect(def).toEqual(SUBSCRIPTION_TIERS[tier]);
      });
    });

    it('should return free tier definition for unknown tier', () => {
      const def = getTierDefinition('nonexistent' as SubscriptionTier);
      expect(def).toEqual(SUBSCRIPTION_TIERS.free);
    });
  });

  describe('isUnlimited()', () => {
    it('should return true for -1', () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for 0', () => {
      expect(isUnlimited(0)).toBe(false);
    });

    it('should return false for positive numbers', () => {
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
      expect(isUnlimited(999999)).toBe(false);
    });

    it('should return false for other negative numbers', () => {
      expect(isUnlimited(-2)).toBe(false);
      expect(isUnlimited(-100)).toBe(false);
    });
  });

  describe('TIER_ORDER', () => {
    it('should contain all 5 tiers in correct order', () => {
      expect(TIER_ORDER).toEqual(['free', 'beginner', 'rising', 'allstar', 'enterprise']);
    });

    it('should have same length as SUBSCRIPTION_TIERS keys', () => {
      expect(TIER_ORDER).toHaveLength(Object.keys(SUBSCRIPTION_TIERS).length);
    });
  });

  describe('SELECTABLE_TIERS', () => {
    it('should contain 4 tiers (excludes enterprise)', () => {
      expect(SELECTABLE_TIERS).toEqual(['free', 'beginner', 'rising', 'allstar']);
    });

    it('should not include enterprise', () => {
      expect(SELECTABLE_TIERS).not.toContain('enterprise');
    });

    it('should be a subset of TIER_ORDER', () => {
      SELECTABLE_TIERS.forEach((tier) => {
        expect(TIER_ORDER).toContain(tier);
      });
    });
  });
});
