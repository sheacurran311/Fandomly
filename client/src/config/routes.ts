/**
 * Centralized route constants — single source of truth for all navigation paths.
 */
export const ROUTES = {
  // Public
  HOME: '/',
  FIND_CREATORS: '/find-creators',
  MARKETPLACE: '/marketplace',
  LOGIN: '/login',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  DATA_DELETION: '/data-deletion',

  // Auth / Onboarding
  USER_TYPE_SELECTION: '/user-type-selection',
  CREATOR_TYPE_SELECTION: '/creator-type-selection',
  BRAND_TYPE_SELECTION: '/brand-type-selection',
  BRAND_ONBOARDING: '/brand-onboarding',
  TENANT_SETUP: '/tenant-setup',
  BRANDING_STUDIO: '/branding-studio',
  FAN_ONBOARDING_PROFILE: '/fan-onboarding/profile',
  FAN_ONBOARDING_CHOOSE: '/fan-onboarding/choose-creators',

  // Creator Dashboard
  CREATOR_DASHBOARD: '/creator-dashboard',
  CREATOR_ANALYTICS: '/creator-dashboard/analytics',
  CREATOR_GROWTH: '/creator-dashboard/growth',
  CREATOR_REVENUE: '/creator-dashboard/revenue',
  CREATOR_PROGRAM_BUILDER: '/creator-dashboard/program-builder',
  CREATOR_CAMPAIGNS: '/creator-dashboard/campaigns',
  CREATOR_CAMPAIGN_BUILDER: '/creator-dashboard/campaign-builder',
  CREATOR_TASKS: '/creator-dashboard/tasks',
  CREATOR_TASK_CREATE: '/creator-dashboard/tasks/create',
  CREATOR_SOCIAL: '/creator-dashboard/social',
  CREATOR_REWARDS: '/creator-dashboard/rewards',
  CREATOR_NFT_COLLECTIONS: '/creator-dashboard/nft-collections',
  CREATOR_ACTIVITY: '/creator-dashboard/activity',
  CREATOR_FANS: '/creator-dashboard/fans',
  CREATOR_TOKEN: '/creator-dashboard/token',
  CREATOR_PLATFORM_TASKS: '/creator-dashboard/platform-tasks',
  CREATOR_NIL: '/creator-dashboard/nil',
  CREATOR_SUBSCRIPTIONS: '/creator-dashboard/subscriptions',
  CREATOR_BILLING: '/creator-dashboard/billing',
  CREATOR_SETTINGS: '/creator-dashboard/settings',

  // Fan Dashboard
  FAN_DASHBOARD: '/fan-dashboard',
  FAN_JOINED: '/fan-dashboard/joined',
  FAN_TASKS: '/fan-dashboard/tasks',
  FAN_CAMPAIGNS: '/fan-dashboard/campaigns',
  FAN_SOCIAL: '/fan-dashboard/social',
  FAN_ACHIEVEMENTS: '/fan-dashboard/achievements',
  FAN_POINTS: '/fan-dashboard/points',
  FAN_REWARDS_STORE: '/fan-dashboard/rewards-store',
  FAN_NFTS: '/fan-dashboard/nfts',
  FAN_NOTIFICATIONS: '/fan-dashboard/notifications',
  FAN_BILLING: '/fan-dashboard/billing',
  FAN_SETTINGS: '/fan-dashboard/settings',

  // Admin Dashboard
  ADMIN_DASHBOARD: '/admin-dashboard',
  ADMIN_OVERVIEW: '/admin-dashboard/overview',
  ADMIN_USERS: '/admin-dashboard/users',
  ADMIN_CREATORS: '/admin-dashboard/creators',
  ADMIN_AGENCIES: '/admin-dashboard/agencies',
  ADMIN_PLATFORM_TASKS: '/admin-dashboard/platform-tasks',
  ADMIN_ANALYTICS: '/admin-dashboard/analytics',
  ADMIN_REPUTATION: '/admin-dashboard/reputation',
  ADMIN_REVIEW_QUEUE: '/admin-dashboard/review-queue',

  // Profiles
  PROFILE: '/profile',
  FAN_PROFILE: '/fan-profile',

  // Blockchain / Web3
  REPUTATION: '/reputation',
  STAKING: '/staking',

  // Agency
  AGENCY_DASHBOARD: '/agency-dashboard',
} as const;

/** Dynamic route builders */
export const buildRoute = {
  creatorPublic: (url: string) => `/@${url}`,
  programPublic: (slug: string) => `/programs/${slug}`,
  programPreview: (programId: string) => `/programs/${programId}/preview`,
  fanCampaignDetail: (id: string) => `/fan-dashboard/campaigns/${id}`,
  taskEdit: (id: string) => `/creator-dashboard/tasks/edit/${id}`,
  adminTaskEdit: (id: string) => `/admin-dashboard/platform-tasks/edit/${id}`,
} as const;
