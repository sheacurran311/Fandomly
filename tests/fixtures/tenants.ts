/**
 * Test fixtures for tenant data used in subscription limit tests.
 */

export const freeTenant = {
  id: 'tenant-free-001',
  subscriptionTier: 'free' as const,
  ownerId: 'user-owner-001',
  limits: {
    maxSocialConnections: 3,
    maxTasks: 5,
    maxCampaigns: 0,
    maxMembers: 100,
    maxPrograms: 1,
    maxRewards: 5,
  },
};

export const beginnerTenant = {
  id: 'tenant-beginner-001',
  subscriptionTier: 'beginner' as const,
  ownerId: 'user-owner-002',
  limits: {
    maxSocialConnections: 5,
    maxTasks: 15,
    maxCampaigns: 3,
    maxMembers: 500,
    maxPrograms: 1,
  },
};

export const risingTenant = {
  id: 'tenant-rising-001',
  subscriptionTier: 'rising' as const,
  ownerId: 'user-owner-003',
  limits: {
    maxSocialConnections: 8,
    maxTasks: 50,
    maxCampaigns: 10,
    maxMembers: 5000,
    maxPrograms: 3,
  },
};

export const allstarTenant = {
  id: 'tenant-allstar-001',
  subscriptionTier: 'allstar' as const,
  ownerId: 'user-owner-004',
  limits: {
    maxSocialConnections: -1,
    maxTasks: -1,
    maxCampaigns: -1,
    maxMembers: 50000,
    maxPrograms: 10,
  },
};

export const enterpriseTenant = {
  id: 'tenant-enterprise-001',
  subscriptionTier: 'enterprise' as const,
  ownerId: 'user-owner-005',
  limits: {
    maxSocialConnections: -1,
    maxTasks: -1,
    maxCampaigns: -1,
    maxMembers: -1,
    maxPrograms: -1,
  },
};
