import { z } from "zod";

/**
 * Snag-Inspired Task Rule Schema
 * 
 * Based on: https://docs.snagsolutions.io/loyalty/rules-configuration
 * 
 * Philosophy: Structured configuration over free-form text.
 * Every option is a dropdown, toggle, slider, or structured input.
 */

// ============================================
// SECTION ENUMS
// ============================================

export const taskSectionEnum = z.enum([
  "user_onboarding",      // Complete profile, connect accounts, refer friends
  "social_engagement",    // Twitter, Facebook, Instagram social actions
  "community_building",   // Discord, Telegram group participation
  "content_creation",     // Post, comment, share content
  "streaming_music",      // Spotify, YouTube, TikTok engagement
  "token_activity",       // NFT, ERC-20 (future blockchain integration)
  "custom"                // Custom creator-defined tasks
]);

export const updateCadenceEnum = z.enum([
  "immediate",  // Instant validation (quiz, link click, code entry)
  "daily",      // Check at midnight UTC (follower counts, check-ins)
  "weekly",     // Check Monday midnight UTC (weekly engagement)
  "monthly"     // Check 1st of month midnight UTC (monthly milestones)
]);

export const rewardFrequencyEnum = z.enum([
  "one_time",   // Task disappears after completion (profile setup, account connection)
  "daily",      // Resets at midnight UTC (daily check-in, daily engagement)
  "weekly",     // Resets Monday midnight UTC (weekly challenges)
  "monthly"     // Resets 1st of month midnight UTC (monthly goals)
]);

export const rewardTypeEnum = z.enum([
  "points",      // Award fixed amount of points
  "multiplier"   // Apply multiplier to future point earnings
]);

// ============================================
// PLATFORM ENUMS
// ============================================

export const platformEnum = z.enum([
  "twitter",
  "facebook", 
  "instagram",
  "youtube",
  "tiktok",
  "spotify",
  "discord",
  "telegram",
  "system"  // For profile, check-in, code entry, etc.
]);

// ============================================
// CORE TASK RULE SCHEMA
// ============================================

export const taskRuleSchema = z.object({
  // ============================================
  // SECTION 1: BASIC DETAILS
  // ============================================
  name: z.string()
    .min(1, "Task name is required")
    .max(100, "Task name must be 100 characters or less"),
  
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be 500 characters or less"),
  
  // Task organization
  section: taskSectionEnum,
  
  // Time constraints (optional)
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  
  // Special flags
  isRequired: z.boolean().default(false)
    .describe("Block access to other tasks until this one is completed"),
  
  hideFromUI: z.boolean().default(false)
    .describe("Hidden background task, triggered via API only"),
  
  // ============================================
  // SECTION 2: REWARD CONFIGURATION
  // ============================================
  rewardType: rewardTypeEnum,
  
  // Points reward configuration
  pointsToReward: z.number()
    .min(1, "Points must be at least 1")
    .max(100000, "Points cannot exceed 100,000")
    .optional()
    .describe("Fixed amount of points to award (when rewardType is 'points')"),
  
  pointCurrency: z.string()
    .default("default")
    .describe("Currency type for multi-currency point systems"),
  
  // Multiplier reward configuration
  multiplierValue: z.number()
    .min(1.01, "Multiplier must be greater than 1")
    .max(10, "Multiplier cannot exceed 10x")
    .optional()
    .describe("Multiplier applied to future earnings (when rewardType is 'multiplier')"),
  
  currenciesToApply: z.array(z.string())
    .optional()
    .describe("Which point currencies this multiplier applies to"),
  
  applyToExistingBalance: z.boolean()
    .default(false)
    .describe("Apply multiplier to existing points or only future earnings"),
  
  // ============================================
  // SECTION 3: TIMING CONFIGURATION
  // ============================================
  updateCadence: updateCadenceEnum
    .default("immediate")
    .describe("How often we check if the task is completed"),
  
  rewardFrequency: rewardFrequencyEnum
    .default("one_time")
    .describe("How often fans can earn rewards from this task"),
  
  // ============================================
  // SECTION 4: PLATFORM & TYPE
  // ============================================
  platform: platformEnum,
  
  taskType: z.string()
    .min(1, "Task type is required")
    .describe("Specific task type within the platform (e.g., 'twitter_follow', 'check_in')"),
  
  // ============================================
  // SECTION 5: CUSTOM SETTINGS
  // ============================================
  customSettings: z.record(z.any())
    .optional()
    .describe("Platform-specific configuration (handles, URLs, required fields, etc.)"),
  
  // ============================================
  // METADATA
  // ============================================
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  isDraft: z.boolean().default(false),
});

// ============================================
// SPECIFIC TASK CONFIGURATIONS
// ============================================

/**
 * Complete Profile Task Configuration
 * Reference: https://docs.snagsolutions.io/loyalty/rules/complete-profile
 */
export const completeProfileSettingsSchema = z.object({
  requiredFields: z.array(z.enum([
    "username",
    "avatar",
    "bio",
    "location",
    "interests",
    "twitter",
    "instagram",
    "facebook",
    "tiktok",
    "discord",
    "telegram",
    "youtube",
    "spotify"
  ])),
  
  rewardMode: z.enum([
    "all_or_nothing",  // Award points only when ALL fields are completed
    "per_field"        // Award points for each individual field completed
  ]),
  
  pointsPerField: z.number()
    .min(1)
    .optional()
    .describe("Points awarded per field (only when rewardMode is 'per_field')"),
});

/**
 * Refer a Friend Task Configuration
 * Reference: https://docs.snagsolutions.io/loyalty/rules/refer-friends
 */
export const referralSettingsSchema = z.object({
  // Referral Tier System
  referralTier: z.enum([
    "platform_creator_to_creator",  // Creators referring creators (revenue share)
    "platform_fan_to_fan",          // Fans referring fans (platform points)
    "campaign_fan_to_fan"           // Campaign-specific fan referrals (dual rewards)
  ]).describe("Type of referral program"),
  
  rewardStructure: z.enum([
    "fixed",           // Fixed points for referrer and referred
    "percentage",      // Referrer earns % of referred user's future points
    "revenue_share"    // Referrer earns % of referred creator's revenue (platform only)
  ]),
  
  // Fixed reward configuration
  referrerPoints: z.number()
    .min(0)
    .optional()
    .describe("Points awarded to the person who refers"),
  
  referredPoints: z.number()
    .min(0)
    .optional()
    .describe("Points awarded to the person who was referred"),
  
  // Percentage reward configuration
  percentageOfReferred: z.number()
    .min(1)
    .max(100)
    .optional()
    .describe("Percentage of referred user's future earnings"),
  
  // Revenue share configuration (platform creator→creator only)
  revenueSharePercentage: z.number()
    .min(1)
    .max(50)
    .optional()
    .describe("Percentage of referred creator's revenue (platform use only)"),
  
  revenueShareDuration: z.enum([
    "lifetime",      // Forever
    "12_months",     // 1 year
    "6_months",      // 6 months
    "3_months"       // 3 months
  ]).optional()
    .describe("How long revenue share lasts"),
  
  // Dual rewards (campaign referrals only)
  dualRewards: z.object({
    enabled: z.boolean(),
    creatorPoints: z.number().min(0).optional(),
    platformPoints: z.number().min(0).optional(),
  }).optional()
    .describe("For campaign referrals: both creator and platform points"),
  
  // Qualifying conditions (when referrer gets rewarded)
  qualifyingConditions: z.array(z.object({
    type: z.enum([
      "quest_completion",     // Referred user must complete a specific quest
      "point_threshold",      // Referred user must reach X points
      "account_age",          // Referred user's account must be X days old
      "revenue_threshold"     // Referred creator must generate X revenue (creator→creator only)
    ]),
    value: z.union([z.string(), z.number()]),
  })).optional(),
  
  // Limits
  maxReferralsPerUser: z.number()
    .min(1)
    .optional()
    .describe("Max referrals per user (null = unlimited)"),
  
  totalMaxReferrals: z.number()
    .min(1)
    .optional()
    .describe("Total referrals across all users (null = unlimited)"),
});

/**
 * Check-In Task Configuration
 * Reference: https://docs.snagsolutions.io/loyalty/rules/check-in
 */
export const checkInSettingsSchema = z.object({
  pointsPerCheckIn: z.number()
    .min(1)
    .describe("Base points awarded for each check-in"),
  
  // Streak system
  enableStreak: z.boolean()
    .default(false)
    .describe("Enable consecutive check-in streak bonuses"),
  
  rewardOnlyStreakCompletions: z.boolean()
    .default(false)
    .describe("Only award points when full streak is completed (hides daily check-in)"),
  
  streakMilestones: z.array(z.object({
    consecutiveDays: z.number()
      .min(2)
      .describe("Number of consecutive days required"),
    bonusPoints: z.number()
      .min(1)
      .describe("Bonus points awarded for reaching this milestone"),
  })).optional(),
  
  // Celebration asset
  celebrationAsset: z.object({
    type: z.enum(["none", "image", "video"]),
    url: z.string().url().optional(),
  }).optional(),
  
  // Advanced
  countAnyRuleAsCheckIn: z.boolean()
    .default(false)
    .describe("Any task completion automatically counts as checking in"),
});

/**
 * Reach X Followers Task Configuration
 * Reference: https://docs.snagsolutions.io/loyalty/rules/x-followers
 */
export const followerMilestoneSettingsSchema = z.object({
  platform: z.enum(["twitter", "instagram", "tiktok", "youtube", "spotify"]),
  
  milestoneStructure: z.enum([
    "single",    // One-time milestone
    "tiered"     // Multiple milestones at different follower counts
  ]),
  
  // Single milestone configuration
  targetFollowerCount: z.number()
    .min(1)
    .optional()
    .describe("Target follower count for single milestone"),
  
  // Tiered milestone configuration
  tiers: z.array(z.object({
    followerCount: z.number()
      .min(1)
      .describe("Follower count required for this tier"),
    points: z.number()
      .min(1)
      .describe("Points awarded for reaching this tier"),
  })).optional(),
});

/**
 * Connect Account Task Configuration
 */
export const connectAccountSettingsSchema = z.object({
  accountType: z.enum([
    "email",
    "twitter",
    "facebook", 
    "instagram",
    "discord",
    "telegram",
    "youtube",
    "spotify",
    "wallet"
  ]),
  
  // Wallet-specific settings
  supportedWallets: z.array(z.enum([
    "evm",
    "solana",
    "bitcoin",
    "sui",
    "ton"
  ])).optional(),
});

/**
 * Social Action Task Configuration
 * For: Follow, Like, Retweet, Comment, Share, Subscribe, etc.
 */
export const socialActionSettingsSchema = z.object({
  // Platform-specific identifiers
  handle: z.string()
    .optional()
    .describe("Twitter/Instagram/TikTok handle to follow"),
  
  url: z.string()
    .url()
    .optional()
    .describe("Direct URL to post/video/page to interact with"),
  
  pageId: z.string()
    .optional()
    .describe("Facebook page ID"),
  
  channelUrl: z.string()
    .url()
    .optional()
    .describe("YouTube channel URL"),
  
  artistId: z.string()
    .optional()
    .describe("Spotify artist ID"),
  
  // Text requirements
  requiredText: z.string()
    .optional()
    .describe("Specific text that must be included (for bio, comment, post tasks)"),
  
  hashtags: z.array(z.string())
    .optional()
    .describe("Required hashtags for post tasks"),
  
  // Verification
  verificationMethod: z.enum([
    "manual",      // Admin manually verifies
    "automatic",   // Instantly approved
    "api"          // Verified via platform API
  ]).default("manual"),
});

/**
 * Code Entry Task Configuration
 * Reference: https://docs.snagsolutions.io/loyalty/rules/code-entry
 */
export const codeEntrySettingsSchema = z.object({
  code: z.string()
    .min(1)
    .describe("The code that fans must enter"),
  
  caseSensitive: z.boolean()
    .default(false)
    .describe("Whether the code is case-sensitive"),
  
  maxAttempts: z.number()
    .min(1)
    .optional()
    .describe("Maximum number of attempts allowed (null = unlimited)"),
});

/**
 * Quiz/Poll Task Configuration
 */
export const quizSettingsSchema = z.object({
  question: z.string()
    .min(1)
    .describe("The question to ask"),
  
  options: z.array(z.string())
    .min(2)
    .describe("Answer options"),
  
  correctAnswer: z.number()
    .min(0)
    .optional()
    .describe("Index of correct answer (only for quiz, not poll)"),
  
  isQuiz: z.boolean()
    .default(true)
    .describe("true = quiz (has correct answer), false = poll (no wrong answer)"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type TaskRule = z.infer<typeof taskRuleSchema>;
export type TaskSection = z.infer<typeof taskSectionEnum>;
export type UpdateCadence = z.infer<typeof updateCadenceEnum>;
export type RewardFrequency = z.infer<typeof rewardFrequencyEnum>;
export type RewardType = z.infer<typeof rewardTypeEnum>;
export type Platform = z.infer<typeof platformEnum>;

export type CompleteProfileSettings = z.infer<typeof completeProfileSettingsSchema>;
export type ReferralSettings = z.infer<typeof referralSettingsSchema>;
export type CheckInSettings = z.infer<typeof checkInSettingsSchema>;
export type FollowerMilestoneSettings = z.infer<typeof followerMilestoneSettingsSchema>;
export type ConnectAccountSettings = z.infer<typeof connectAccountSettingsSchema>;
export type SocialActionSettings = z.infer<typeof socialActionSettingsSchema>;
export type CodeEntrySettings = z.infer<typeof codeEntrySettingsSchema>;
export type QuizSettings = z.infer<typeof quizSettingsSchema>;

// ============================================
// TASK CATEGORIES MAPPING
// ============================================

export const TASK_CATEGORIES = {
  user_onboarding: {
    id: "user_onboarding" as const,
    name: "User Onboarding",
    icon: "UserCheck",
    color: "blue",
    description: "Get fans to complete their profiles and connect accounts",
    tasks: [
      "complete_profile",
      "connect_email",
      "connect_wallet",
      "refer_friend",
      "check_in"
    ]
  },
  
  social_engagement: {
    id: "social_engagement" as const,
    name: "Social Engagement",
    icon: "Users",
    color: "purple",
    description: "Engage fans with social media tasks",
    tasks: [
      "twitter_follow",
      "twitter_retweet",
      "twitter_like",
      "facebook_like_page",
      "instagram_follow",
      "instagram_like_post",
      "youtube_subscribe",
      "tiktok_follow",
      "spotify_follow"
    ]
  },
  
  community_building: {
    id: "community_building" as const,
    name: "Community Building",
    icon: "MessageCircle",
    color: "green",
    description: "Build community through Discord and Telegram",
    tasks: [
      "discord_join_server",
      "discord_send_message",
      "discord_get_role",
      "telegram_join_group",
      "telegram_send_message"
    ]
  },
  
  content_creation: {
    id: "content_creation" as const,
    name: "Content Creation",
    icon: "FileText",
    color: "orange",
    description: "Encourage fans to create and share content",
    tasks: [
      "twitter_post",
      "twitter_comment",
      "facebook_share_post",
      "facebook_comment",
      "youtube_comment"
    ]
  },
  
  streaming_music: {
    id: "streaming_music" as const,
    name: "Streaming & Music",
    icon: "Music",
    color: "pink",
    description: "Engage with music and video content",
    tasks: [
      "spotify_follow",
      "spotify_playlist",
      "youtube_subscribe",
      "youtube_like",
      "tiktok_follow",
      "tiktok_like"
    ]
  },
  
  custom: {
    id: "custom" as const,
    name: "Custom Tasks",
    icon: "Wrench",
    color: "gray",
    description: "Custom creator-defined tasks",
    tasks: [
      "enter_code",
      "click_link",
      "answer_quiz",
      "answer_poll",
      "submit_text"
    ]
  }
} as const;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate that reward configuration matches reward type
 */
export function validateRewardConfig(data: Partial<TaskRule>): { valid: boolean; error?: string } {
  if (data.rewardType === "points") {
    if (!data.pointsToReward || data.pointsToReward < 1) {
      return { valid: false, error: "Points to reward is required when reward type is 'points'" };
    }
  }
  
  if (data.rewardType === "multiplier") {
    if (!data.multiplierValue || data.multiplierValue <= 1) {
      return { valid: false, error: "Multiplier value must be greater than 1 when reward type is 'multiplier'" };
    }
  }
  
  return { valid: true };
}

/**
 * Get default values for a task type
 */
export function getDefaultTaskConfig(section: TaskSection, taskType: string): Partial<TaskRule> {
  const defaults: Partial<TaskRule> = {
    section,
    taskType,
    rewardType: "points",
    pointsToReward: 50,
    updateCadence: "immediate",
    rewardFrequency: "one_time",
    isRequired: false,
    hideFromUI: false,
    isActive: true,
    isDraft: false,
  };
  
  // Adjust defaults based on task type
  if (taskType.includes("check_in")) {
    defaults.updateCadence = "daily";
    defaults.rewardFrequency = "daily";
  }
  
  if (taskType.includes("followers") || taskType.includes("reach")) {
    defaults.updateCadence = "daily";
    defaults.rewardFrequency = "one_time";
  }
  
  if (taskType.includes("referral") || taskType.includes("refer")) {
    defaults.updateCadence = "immediate";
    defaults.rewardFrequency = "one_time";
  }
  
  return defaults;
}

