/**
 * Platform Task Test Fixtures
 * 
 * Sample platform-level task data for testing admin-managed
 * tasks that apply across all creators.
 */

const basePlatformTask = {
  ownershipLevel: 'platform' as const,
  tenantId: null,
  creatorId: null,
  programId: null,
  campaignId: null,
  isActive: true,
  isRequired: false,
  hideFromUI: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const completeProfileTask = {
  ...basePlatformTask,
  id: 'platform-task-complete-profile',
  name: 'Complete Your Profile',
  description: 'Fill out your profile to earn bonus points',
  taskType: 'complete_profile' as const,
  platform: 'internal' as const,
  section: 'user_onboarding' as const,
  pointsToReward: 100,
  rewardType: 'points' as const,
  customSettings: {
    requiredFields: ['bio', 'profile_photo', 'location', 'interests'],
    type: 'profile',
    category: 'Profile Completion',
    eligibleAccountTypes: ['fan', 'creator'],
  },
};

export const addProfilePhotoTask = {
  ...basePlatformTask,
  id: 'platform-task-add-photo',
  name: 'Add Profile Photo',
  description: 'Upload a profile photo to personalize your account',
  taskType: 'complete_profile' as const,
  platform: 'internal' as const,
  section: 'user_onboarding' as const,
  pointsToReward: 50,
  rewardType: 'points' as const,
  customSettings: {
    requiredFields: ['profile_photo'],
    type: 'profile',
    category: 'Profile Completion',
    eligibleAccountTypes: ['fan', 'creator'],
  },
};

export const connectTwitterTask = {
  ...basePlatformTask,
  id: 'platform-task-connect-twitter',
  name: 'Connect Twitter',
  description: 'Link your Twitter account for social engagement tasks',
  taskType: 'follow' as const,
  platform: 'twitter' as const,
  section: 'social_engagement' as const,
  pointsToReward: 75,
  rewardType: 'points' as const,
  customSettings: {
    type: 'social',
    category: 'Social Connection',
    socialPlatform: 'twitter',
    eligibleAccountTypes: ['fan'],
  },
};

export const connectInstagramTask = {
  ...basePlatformTask,
  id: 'platform-task-connect-instagram',
  name: 'Connect Instagram',
  description: 'Link your Instagram account for social engagement tasks',
  taskType: 'instagram_follow' as const,
  platform: 'instagram' as const,
  section: 'social_engagement' as const,
  pointsToReward: 75,
  rewardType: 'points' as const,
  customSettings: {
    type: 'social',
    category: 'Social Connection',
    socialPlatform: 'instagram',
    eligibleAccountTypes: ['fan'],
  },
};

export const connectYouTubeTask = {
  ...basePlatformTask,
  id: 'platform-task-connect-youtube',
  name: 'Connect YouTube',
  description: 'Link your YouTube account for video engagement tasks',
  taskType: 'youtube_subscribe' as const,
  platform: 'youtube' as const,
  section: 'social_engagement' as const,
  pointsToReward: 75,
  rewardType: 'points' as const,
  customSettings: {
    type: 'social',
    category: 'Social Connection',
    socialPlatform: 'youtube',
    eligibleAccountTypes: ['fan'],
  },
};

export const dailyCheckInTask = {
  ...basePlatformTask,
  id: 'platform-task-daily-checkin',
  name: 'Daily Check-In',
  description: 'Check in every day to earn bonus points',
  taskType: 'check_in' as const,
  platform: 'internal' as const,
  section: 'engagement' as const,
  pointsToReward: 10,
  rewardType: 'points' as const,
  customSettings: {
    type: 'engagement',
    category: 'Daily Engagement',
    frequency: 'daily',
    eligibleAccountTypes: ['fan'],
  },
};

export const referralPlatformTask = {
  ...basePlatformTask,
  id: 'platform-task-referral',
  name: 'Refer a Friend',
  description: 'Invite friends to the platform and earn rewards',
  taskType: 'referral' as const,
  platform: 'internal' as const,
  section: 'community_building' as const,
  pointsToReward: 500,
  rewardType: 'points' as const,
  customSettings: {
    type: 'engagement',
    category: 'Referrals',
    pointsPerReferral: 500,
    maxReferrals: null,
    eligibleAccountTypes: ['fan', 'creator'],
  },
};

export const inactivePlatformTask = {
  ...completeProfileTask,
  id: 'platform-task-inactive',
  name: 'Inactive Platform Task',
  isActive: false,
};

export const platformTaskCreatePayload = {
  name: 'New Platform Task',
  description: 'Created via admin automation',
  taskType: 'complete_profile',
  platform: 'internal',
  section: 'user_onboarding',
  pointsToReward: 100,
  customSettings: {
    requiredFields: ['bio'],
    type: 'profile',
    category: 'Profile Completion',
    eligibleAccountTypes: ['fan'],
  },
};

export const platformTaskUpdatePayload = {
  name: 'Updated Platform Task',
  description: 'Updated via admin automation',
  pointsToReward: 150,
};

export const allPlatformTaskFixtures = [
  completeProfileTask,
  addProfilePhotoTask,
  connectTwitterTask,
  connectInstagramTask,
  connectYouTubeTask,
  dailyCheckInTask,
  referralPlatformTask,
  inactivePlatformTask,
];

// Admin stats fixture
export const adminStatsFixture = {
  users: {
    total: 1250,
    fans: 1100,
    creators: 145,
    admins: 5,
    growth: 12.5,
  },
  creators: {
    total: 145,
    active: 120,
    tenants: 140,
    growth: 8.3,
  },
  revenue: {
    total: 0,
    thisMonth: 0,
    growth: 0,
  },
  tasks: {
    total: 450,
    platformTasks: 8,
    completions: 15000,
    growth: 15.2,
  },
  referrals: {
    total: 350,
    pending: 25,
    revenueShared: 0,
  },
  engagement: {
    activeUsers: 750,
    avgSessionTime: 12,
    dailyActive: 375,
  },
};

// Audit log fixture
export const auditLogFixture = {
  id: 'audit-log-1',
  userId: 'test-admin-user-1',
  action: 'create',
  resource: 'platform_task',
  resourceId: 'platform-task-new',
  oldValues: null,
  newValues: platformTaskCreatePayload,
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 Test Browser',
  createdAt: new Date('2025-01-01'),
};
