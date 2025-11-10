/**
 * JSONB Validation Schemas
 *
 * This file contains Zod schemas for validating JSONB fields in the database.
 * These schemas ensure type safety and data consistency for complex JSON data.
 *
 * Usage:
 * - Import the schema you need
 * - Validate data before inserting/updating: schema.parse(data)
 * - Use in API endpoints to validate request bodies
 * - Use in storage layer to ensure data integrity
 */

import { z } from 'zod';

// ============================================================================
// TENANT BRANDING SCHEMA
// ============================================================================

export const tenantBrandingSchema = z.object({
  logo: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').default('#000000'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').default('#FFFFFF'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  customCSS: z.string().optional(),
  favicon: z.string().url().optional(),
  fontFamily: z.string().optional(),
}).strict();

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

// ============================================================================
// TENANT BUSINESS INFO SCHEMA
// ============================================================================

export const tenantBusinessInfoSchema = z.object({
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().default('US'),
  }).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
  website: z.string().url().optional(),
}).strict();

export type TenantBusinessInfo = z.infer<typeof tenantBusinessInfoSchema>;

// ============================================================================
// USER PROFILE DATA SCHEMA
// ============================================================================

export const userProfileDataSchema = z.object({
  // Basic Info
  name: z.string().max(100).optional(),
  age: z.number().int().min(13).max(120).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  bannerImage: z.string().url().optional(),

  // Contact
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional(),

  // Marketing Preferences
  creatorTypeInterests: z.array(
    z.enum(['athletes', 'musicians', 'content_creators', 'brands'])
  ).optional(),
  interestSubcategories: z.object({
    athletes: z.array(z.string()).optional(),
    musicians: z.array(z.string()).optional(),
    content_creators: z.array(z.string()).optional(),
  }).optional(),

  // Education (for athletes)
  education: z.object({
    level: z.enum([
      'middle_school',
      'high_school',
      'junior_college',
      'college_d1',
      'college_d2',
      'college_d3',
      'naia',
      'not_enrolled',
      'professional'
    ]),
    grade: z.enum(['freshman', 'sophomore', 'junior', 'senior', 'graduate']).optional(),
    school: z.string().optional(),
    graduationYear: z.number().int().min(1900).max(2100).optional(),
  }).optional(),

  // Platform Points (Fandomly-wide)
  fandomlyPoints: z.number().int().min(0).default(0),

  // Notification Preferences
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    marketingEmails: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
  }).optional(),
}).strict();

export type UserProfileData = z.infer<typeof userProfileDataSchema>;

// ============================================================================
// CREATOR TYPE-SPECIFIC DATA SCHEMA
// ============================================================================

export const athleteDataSchema = z.object({
  sport: z.string(),
  position: z.string().optional(),
  team: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  stats: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
}).strict();

export const musicianDataSchema = z.object({
  genre: z.string(),
  instrument: z.string().optional(),
  label: z.string().optional(),
  spotifyArtistId: z.string().optional(),
  appleMusicArtistId: z.string().optional(),
}).strict();

export const contentCreatorDataSchema = z.object({
  niche: z.string(),
  platforms: z.array(z.string()).optional(),
  contentType: z.array(z.string()).optional(),
}).strict();

export const creatorTypeSpecificDataSchema = z.union([
  athleteDataSchema,
  musicianDataSchema,
  contentCreatorDataSchema,
  z.object({}).strict(), // Empty object for brands or unknown types
]);

export type CreatorTypeSpecificData = z.infer<typeof creatorTypeSpecificDataSchema>;

// ============================================================================
// CREATOR BRAND COLORS SCHEMA
// ============================================================================

export const brandColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
}).strict();

export type BrandColors = z.infer<typeof brandColorsSchema>;

// ============================================================================
// CREATOR SOCIAL LINKS SCHEMA
// ============================================================================

export const socialLinksSchema = z.object({
  twitter: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
  facebook: z.string().url().optional(),
  spotify: z.string().url().optional(),
  appleMusic: z.string().url().optional(),
  website: z.string().url().optional(),
  discord: z.string().url().optional(),
  telegram: z.string().url().optional(),
}).strict();

export type SocialLinks = z.infer<typeof socialLinksSchema>;

// ============================================================================
// TASK CUSTOM SETTINGS SCHEMA (per task type)
// ============================================================================

export const taskCustomSettingsSchema = z.object({
  // Twitter tasks
  handle: z.string().optional(),
  tweetUrl: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),

  // Instagram tasks
  postUrl: z.string().url().optional(),
  keyword: z.string().optional(),

  // YouTube tasks
  videoUrl: z.string().url().optional(),
  channelUrl: z.string().url().optional(),

  // TikTok tasks
  videoId: z.string().optional(),

  // Spotify tasks
  playlistId: z.string().optional(),
  albumId: z.string().optional(),
  artistId: z.string().optional(),

  // Referral tasks
  minReferrals: z.number().int().min(1).optional(),
  rewardPerReferral: z.number().int().min(0).optional(),

  // Check-in tasks
  streakBonuses: z.array(z.object({
    days: z.number().int().min(1),
    bonusPoints: z.number().int().min(0),
  })).optional(),

  // Custom/generic settings
  customField1: z.string().optional(),
  customField2: z.string().optional(),
  customData: z.record(z.string(), z.any()).optional(),
}).passthrough(); // Allow additional fields for flexibility

export type TaskCustomSettings = z.infer<typeof taskCustomSettingsSchema>;

// ============================================================================
// CAMPAIGN VISIBILITY RULES SCHEMA
// ============================================================================

export const campaignVisibilityRulesSchema = z.object({
  tierRequired: z.string().optional(),
  minPointsRequired: z.number().int().min(0).optional(),
  memberSince: z.string().datetime().optional(),
  customAttributes: z.record(z.string(), z.any()).optional(),
  excludeUsers: z.array(z.string()).optional(),
  includeUsers: z.array(z.string()).optional(),
}).strict();

export type CampaignVisibilityRules = z.infer<typeof campaignVisibilityRulesSchema>;

// ============================================================================
// CAMPAIGN TRANSACTION FILTERS SCHEMA
// ============================================================================

export const campaignTransactionFiltersSchema = z.object({
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  productCategories: z.array(z.string()).optional(),
  storeLocations: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
}).strict();

export type CampaignTransactionFilters = z.infer<typeof campaignTransactionFiltersSchema>;

// ============================================================================
// LOYALTY PROGRAM TIERS SCHEMA
// ============================================================================

export const loyaltyTierSchema = z.object({
  name: z.string(),
  minPoints: z.number().int().min(0),
  benefits: z.array(z.string()).optional(),
  multiplier: z.number().min(1).default(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict();

export const loyaltyProgramTiersSchema = z.array(loyaltyTierSchema);

export type LoyaltyTier = z.infer<typeof loyaltyTierSchema>;
export type LoyaltyProgramTiers = z.infer<typeof loyaltyProgramTiersSchema>;

// ============================================================================
// REWARD DATA SCHEMA
// ============================================================================

export const rewardDataSchema = z.object({
  // NFT Reward Data
  nftCollectionId: z.string().optional(),
  nftTemplateId: z.string().optional(),

  // Raffle Reward Data
  rafflePrize: z.string().optional(),
  raffleDrawDate: z.string().datetime().optional(),
  maxEntries: z.number().int().min(1).optional(),

  // Physical Reward Data
  shippingRequired: z.boolean().optional(),
  estimatedDelivery: z.string().optional(),

  // Experience Reward Data
  experienceDate: z.string().datetime().optional(),
  location: z.string().optional(),
  capacity: z.number().int().min(1).optional(),

  // Percentage/Discount Rewards
  percentage: z.number().min(0).max(100).optional(),
  discountCode: z.string().optional(),
  expirationDate: z.string().datetime().optional(),

  // Custom data
  customData: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type RewardData = z.infer<typeof rewardDataSchema>;

// ============================================================================
// POINT TRANSACTION METADATA SCHEMA
// ============================================================================

export const pointTransactionMetadataSchema = z.object({
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  campaignId: z.string().optional(),
  campaignName: z.string().optional(),
  referralId: z.string().optional(),
  socialPlatform: z.string().optional(),
  multiplier: z.number().min(0).optional(),
  bonusPoints: z.number().int().optional(),
  notes: z.string().optional(),
  adminOverride: z.boolean().optional(),
  overrideReason: z.string().optional(),
}).passthrough();

export type PointTransactionMetadata = z.infer<typeof pointTransactionMetadataSchema>;

// ============================================================================
// NOTIFICATION METADATA SCHEMA
// ============================================================================

export const notificationMetadataSchema = z.object({
  taskId: z.string().optional(),
  campaignId: z.string().optional(),
  rewardId: z.string().optional(),
  achievementId: z.string().optional(),
  pointsEarned: z.number().int().optional(),
  actionUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type NotificationMetadata = z.infer<typeof notificationMetadataSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize JSONB data before saving to database
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validateJsonb<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validate JSONB data, returning null if invalid
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or null if invalid
 */
export function safeValidateJsonb<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate hex color code
 */
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color (#RRGGBB)');

/**
 * Validate E.164 phone number format
 */
export const phoneNumberSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Must be valid E.164 phone number');

/**
 * Validate email address
 */
export const emailSchema = z.string().email('Must be valid email address');

/**
 * Validate URL
 */
export const urlSchema = z.string().url('Must be valid URL');

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  tenantBranding: tenantBrandingSchema,
  tenantBusinessInfo: tenantBusinessInfoSchema,
  userProfileData: userProfileDataSchema,
  creatorTypeSpecificData: creatorTypeSpecificDataSchema,
  brandColors: brandColorsSchema,
  socialLinks: socialLinksSchema,
  taskCustomSettings: taskCustomSettingsSchema,
  campaignVisibilityRules: campaignVisibilityRulesSchema,
  campaignTransactionFilters: campaignTransactionFiltersSchema,
  loyaltyProgramTiers: loyaltyProgramTiersSchema,
  rewardData: rewardDataSchema,
  pointTransactionMetadata: pointTransactionMetadataSchema,
  notificationMetadata: notificationMetadataSchema,
};

export default schemas;
