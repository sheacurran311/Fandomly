/**
 * Reward Test Fixtures
 * 
 * Sample reward data for testing reward CRUD operations
 * and reward redemption flows.
 */

const baseReward = {
  tenantId: 'test-tenant-1',
  creatorId: 'test-creator-1',
  isActive: true,
  currentRedemptions: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const raffleReward = {
  ...baseReward,
  id: 'test-reward-raffle',
  name: 'Monthly Raffle Entry',
  description: 'Enter our monthly raffle for a chance to win exclusive prizes',
  rewardType: 'raffle' as const,
  pointsCost: 100,
  maxRedemptions: null, // Unlimited
  metadata: {
    drawDate: new Date('2025-02-01').toISOString(),
    prize: 'Exclusive merchandise bundle',
  },
};

export const physicalReward = {
  ...baseReward,
  id: 'test-reward-physical',
  name: 'Signed Poster',
  description: 'Get a signed poster shipped to your address',
  rewardType: 'physical' as const,
  pointsCost: 5000,
  maxRedemptions: 50,
  metadata: {
    requiresShipping: true,
    estimatedDelivery: '2-4 weeks',
  },
};

export const customReward = {
  ...baseReward,
  id: 'test-reward-custom',
  name: 'Personalized Shoutout',
  description: 'Get a personalized video shoutout from the creator',
  rewardType: 'custom' as const,
  pointsCost: 10000,
  maxRedemptions: 10,
  metadata: {
    deliveryMethod: 'video',
    estimatedDelivery: '1 week',
  },
};

export const nftReward = {
  ...baseReward,
  id: 'test-reward-nft',
  name: 'Exclusive NFT',
  description: 'Claim an exclusive digital collectible',
  rewardType: 'nft' as const,
  pointsCost: 2500,
  maxRedemptions: 100,
  metadata: {
    collectionId: 'test-nft-collection-1',
    templateId: 'test-nft-template-1',
  },
};

export const videoReward = {
  ...baseReward,
  id: 'test-reward-video',
  name: 'Exclusive Video Content',
  description: 'Unlock access to exclusive video content',
  rewardType: 'video' as const,
  pointsCost: 500,
  maxRedemptions: null,
  metadata: {
    videoUrl: 'https://example.com/exclusive-video',
    duration: '15:00',
  },
};

export const soldOutReward = {
  ...physicalReward,
  id: 'test-reward-sold-out',
  name: 'Limited Edition Item (Sold Out)',
  currentRedemptions: 50,
  maxRedemptions: 50,
};

export const inactiveReward = {
  ...raffleReward,
  id: 'test-reward-inactive',
  name: 'Inactive Reward',
  isActive: false,
};

export const rewardCreatePayload = {
  name: 'New Test Reward',
  description: 'Created via test automation',
  rewardType: 'raffle' as const,
  pointsCost: 100,
  maxRedemptions: null,
};

export const rewardUpdatePayload = {
  name: 'Updated Reward Name',
  description: 'Updated description',
  pointsCost: 150,
};

export const allRewardFixtures = [
  raffleReward,
  physicalReward,
  customReward,
  nftReward,
  videoReward,
  soldOutReward,
  inactiveReward,
];
