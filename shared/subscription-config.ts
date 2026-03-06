/**
 * Fandomly Subscription Tiers — Single Source of Truth
 *
 * Used by both client and server. Import from "shared/subscription-config"
 * to get tier definitions, limits, and pricing.
 */

export type SubscriptionTier = 'free' | 'beginner' | 'rising' | 'allstar' | 'enterprise';

export interface TierLimits {
  maxSocialConnections: number; // -1 = unlimited
  maxTasks: number;
  maxCampaigns: number;
  maxMembers: number;
  maxPrograms: number;
  maxRewards: number;
  maxApiCalls: number;
  storageLimit: number; // MB
  customDomain: boolean;
  advancedAnalytics: boolean;
  whiteLabel: boolean;
}

export interface TierDefinition {
  id: SubscriptionTier;
  name: string;
  price: number | null; // null = custom pricing
  priceLabel: string;
  description: string;
  limits: TierLimits;
  features: string[];
  recommended?: boolean;
  stripePriceId?: string; // Set via env or config
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0/month',
    description: 'Get started and explore Fandomly',
    limits: {
      maxSocialConnections: 3,
      maxTasks: 5,
      maxCampaigns: 0,
      maxMembers: 100,
      maxPrograms: 1,
      maxRewards: 5,
      maxApiCalls: 500,
      storageLimit: 50,
      customDomain: false,
      advancedAnalytics: false,
      whiteLabel: false,
    },
    features: [
      '1 loyalty program',
      'Up to 100 members',
      '3 social connections',
      '5 tasks',
      'Basic analytics',
    ],
  },
  beginner: {
    id: 'beginner',
    name: 'Beginner Creator',
    price: 9.99,
    priceLabel: '$9.99/month',
    description: 'For creators starting to grow their community',
    limits: {
      maxSocialConnections: 5,
      maxTasks: 15,
      maxCampaigns: 3,
      maxMembers: 500,
      maxPrograms: 1,
      maxRewards: 15,
      maxApiCalls: 2000,
      storageLimit: 200,
      customDomain: false,
      advancedAnalytics: false,
      whiteLabel: false,
    },
    features: [
      '1 loyalty program',
      'Up to 500 members',
      '5 social connections',
      '15 tasks',
      '3 campaigns',
      'Priority support',
    ],
  },
  rising: {
    id: 'rising',
    name: 'Rising Creator',
    price: 19.99,
    priceLabel: '$19.99/month',
    description: 'For growing creators ready to scale',
    recommended: true,
    limits: {
      maxSocialConnections: 8,
      maxTasks: 50,
      maxCampaigns: 10,
      maxMembers: 5000,
      maxPrograms: 3,
      maxRewards: 50,
      maxApiCalls: 10000,
      storageLimit: 500,
      customDomain: true,
      advancedAnalytics: true,
      whiteLabel: false,
    },
    features: [
      '3 loyalty programs',
      'Up to 5,000 members',
      '8 social connections',
      '50 tasks',
      '10 campaigns',
      'Custom domain',
      'Advanced analytics',
    ],
  },
  allstar: {
    id: 'allstar',
    name: 'All-Star',
    price: 39.99,
    priceLabel: '$39.99/month',
    description: 'For established creators and power users',
    limits: {
      maxSocialConnections: -1,
      maxTasks: -1,
      maxCampaigns: -1,
      maxMembers: 50000,
      maxPrograms: 10,
      maxRewards: -1,
      maxApiCalls: 50000,
      storageLimit: 2000,
      customDomain: true,
      advancedAnalytics: true,
      whiteLabel: true,
    },
    features: [
      '10 loyalty programs',
      'Up to 50,000 members',
      'Unlimited social connections',
      'Unlimited tasks & campaigns',
      'White-label branding',
      'Advanced analytics',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Agency / Enterprise',
    price: null,
    priceLabel: 'Custom',
    description: 'For agencies and large organizations',
    limits: {
      maxSocialConnections: -1,
      maxTasks: -1,
      maxCampaigns: -1,
      maxMembers: -1,
      maxPrograms: -1,
      maxRewards: -1,
      maxApiCalls: -1,
      storageLimit: -1,
      customDomain: true,
      advancedAnalytics: true,
      whiteLabel: true,
    },
    features: [
      'Unlimited everything',
      'Multi-tenant support',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'White-label branding',
    ],
  },
};

/**
 * Get limits for a subscription tier.
 * Defaults to "free" if tier is unknown.
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return (SUBSCRIPTION_TIERS[tier] ?? SUBSCRIPTION_TIERS.free).limits;
}

/**
 * Get the full tier definition.
 */
export function getTierDefinition(tier: SubscriptionTier): TierDefinition {
  return SUBSCRIPTION_TIERS[tier] ?? SUBSCRIPTION_TIERS.free;
}

/**
 * Check if a limit value means "unlimited".
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * All tiers in display order (for pricing pages).
 */
export const TIER_ORDER: SubscriptionTier[] = [
  'free',
  'beginner',
  'rising',
  'allstar',
  'enterprise',
];

/**
 * Selectable tiers (excludes enterprise which requires contact).
 */
export const SELECTABLE_TIERS: SubscriptionTier[] = ['free', 'beginner', 'rising', 'allstar'];
