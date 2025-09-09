import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role-Based Access Control Enums
export const userRoleEnum = pgEnum('user_role', ['fandomly_admin', 'customer_admin', 'customer_end_user']);
export const customerTierEnum = pgEnum('customer_tier', ['basic', 'premium', 'vip']);

// Multi-Tenant Structure
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended', 'trial']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['starter', 'professional', 'enterprise']);

// Tenant (Store) Table - Each creator gets their own tenant/store  
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Tenant Identity
  slug: varchar("slug", { length: 100 }).unique().notNull(), // e.g., "aerial-ace-athletics"
  name: text("name").notNull(), // e.g., "Aerial Ace Athletics"
  domain: text("domain").unique(), // Custom domain support: aerialace.fandomly.com
  
  // Owner Information
  ownerId: varchar("owner_id").notNull(),
  
  // Tenant Settings
  status: tenantStatusEnum("status").notNull().default('trial'),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default('starter'),
  subscriptionStatus: text("subscription_status").default('trial'), // "trial" | "active" | "past_due" | "canceled"
  
  // Branding & Customization
  branding: jsonb("branding").$type<{
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    customCSS?: string;
    favicon?: string;
    fontFamily?: string;
  }>(),
  
  // Business Information
  businessInfo: jsonb("business_info").$type<{
    businessType: 'individual' | 'team' | 'organization';
    sport?: string; // For athletes
    position?: string; // For athletes
    school?: string; // For college athletes
    division?: string; // For college athletes
    year?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate';
    industryType?: string; // For creators/musicians
    teamSize?: number;
    website?: string;
    socialLinks?: {
      instagram?: string;
      tiktok?: string;
      twitter?: string;
      youtube?: string;
      spotify?: string;
    };
  }>(),
  
  // Limits & Usage
  limits: jsonb("limits").$type<{
    maxMembers: number;
    maxCampaigns: number;
    maxRewards: number;
    maxApiCalls: number;
    storageLimit: number; // in MB
    customDomain: boolean;
    advancedAnalytics: boolean;
    whiteLabel: boolean;
  }>(),
  
  // Usage Tracking
  usage: jsonb("usage").$type<{
    currentMembers: number;
    currentCampaigns: number;
    currentRewards: number;
    apiCallsThisMonth: number;
    storageUsed: number;
  }>().default({
    currentMembers: 0,
    currentCampaigns: 0,
    currentRewards: 0,
    apiCallsThisMonth: 0,
    storageUsed: 0
  }),
  
  // Billing
  billingInfo: jsonb("billing_info").$type<{
    stripeCustomerId?: string;
    subscriptionId?: string;
    trialEndsAt?: string;
    nextBillingDate?: string;
    billingEmail?: string;
  }>(),
  
  // Configuration
  settings: jsonb("settings").$type<{
    timezone: string;
    currency: string;
    language: string;
    nilCompliance: boolean; // For athlete tenants
    publicProfile: boolean;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    enableSocialLogin: boolean;
    customTermsUrl?: string;
    customPrivacyUrl?: string;
  }>().default({
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    nilCompliance: false,
    publicProfile: true,
    allowRegistration: true,
    requireEmailVerification: false,
    enableSocialLogin: true
  }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dynamicUserId: text("dynamic_user_id").unique(),
  email: text("email"),
  username: text("username"),
  avatar: text("avatar"),
  walletAddress: text("wallet_address"),
  walletChain: text("wallet_chain"),
  userType: text("user_type").notNull().default("fan"), // "creator" | "fan" - legacy field
  
  // Optional profile data collected during onboarding (fan/creator)
  profileData: jsonb("profile_data").$type<{
    name?: string;
    age?: number;
    interests?: Array<"musicians" | "athletes" | "content_creators">;
    bio?: string;
    location?: string;
    avatar?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    favoriteCreators?: string[];
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
    };
    facebookData?: {
      id: string;
      name: string;
      email?: string;
      picture?: string;
      likes?: any;
      importedAt: string;
    };
    preferences?: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      marketingEmails?: boolean;
      smsNotifications?: boolean;
    };
  }>(),
  
  // Multi-Tenant Support
  currentTenantId: varchar("current_tenant_id"), // Current active tenant
  
  // Role-Based Access Control
  role: userRoleEnum("role").notNull().default('customer_end_user'),
  customerTier: customerTierEnum("customer_tier").default('basic'), // Only applies to customer_end_user role
  
  // Onboarding State Tracking
  onboardingState: jsonb("onboarding_state").$type<{
    currentStep: number; // 0 = not started, 1+ = step numbers
    totalSteps: number;
    completedSteps: string[]; // Array of completed step IDs
    isCompleted: boolean;
    lastOnboardingRoute?: string; // Save where user left off
    skipReason?: string; // If user skipped onboarding
  }>().default({
    currentStep: 0,
    totalSteps: 5,
    completedSteps: [],
    isCompleted: false
  }),
  
  // Admin permissions for fandomly_admin role
  adminPermissions: jsonb("admin_permissions").$type<{
    canManageAllCreators?: boolean;
    canManageUsers?: boolean;
    canAccessAnalytics?: boolean;
    canManagePlatformSettings?: boolean;
    canManagePayments?: boolean;
  }>(),
  
  // Customer admin metadata for customer_admin role (creators)
  customerAdminData: jsonb("customer_admin_data").$type<{
    organizationName?: string;
    businessType?: string; // "individual" | "team" | "organization"
    nilAthleteData?: {
      sport: string;
      division: string;
      school: string;
      position: string;
      year: string; // "freshman" | "sophomore" | "junior" | "senior"
    };
    subscriptionStatus?: "active" | "inactive" | "trial";
    subscriptionTier?: "starter" | "professional" | "enterprise";
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tenant Memberships - Users can be members of multiple tenants
export const tenantMemberships = pgTable("tenant_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Role within this specific tenant
  role: text("role").notNull().default('member'), // 'owner' | 'admin' | 'moderator' | 'member'
  
  // Member-specific data for this tenant
  memberData: jsonb("member_data").$type<{
    displayName?: string;
    bio?: string;
    points: number;
    tier: string;
    joinedVia?: 'invitation' | 'registration' | 'social';
    referredBy?: string;
    customAttributes?: Record<string, any>;
  }>().default({
    points: 0,
    tier: 'basic'
  }),
  
  // Status
  status: text("status").notNull().default('active'), // 'active' | 'inactive' | 'banned'
  
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
});

export const creators = pgTable("creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Each creator belongs to a tenant
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  category: text("category").notNull(), // "athlete" | "musician" | "content_creator"
  imageUrl: text("image_url"),
  followerCount: integer("follower_count").default(0),
  
  // Creator Type-Specific Data
  typeSpecificData: jsonb("type_specific_data").$type<{
    // Athlete-specific data
    athlete?: {
      sport: string;
      ageRange: string; // "under_18" | "18_22" | "23_30" | "over_30"
      education: string; // "middle_school" | "high_school" | "college" | "professional" | "other"
      position: string;
      school?: string;
      currentSponsors?: string[];
      nilCompliant: boolean;
    };
    
    // Musician-specific data
    musician?: {
      bandArtistName: string;
      musicCatalogUrl: string;
      artistType: string; // "independent" | "signed" | "hobby"
      musicGenre: string[];
    };
    
    // Content Creator-specific data
    contentCreator?: {
      contentType: string[]; // ["video", "podcast", "gaming", "lifestyle", etc.]
      topicsOfFocus: string[];
      sponsorships?: string[];
      totalViews?: string; // "under_1k" | "1k_10k" | "10k_100k" | "100k_1m" | "over_1m"
      platforms: string[]; // ["instagram", "tiktok", "youtube", "twitch", etc.]
    };
  }>(),
  
  brandColors: jsonb("brand_colors").$type<{
    primary: string;
    secondary: string;
    accent: string;
  }>(),
  socialLinks: jsonb("social_links").$type<{
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    facebook?: string;
    discord?: string;
  }>(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  creatorId: varchar("creator_id").references(() => creators.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  pointsName: text("points_name").default("Points"), // e.g. "Thunder Points", "Luna Coins"
  tiers: jsonb("tiers").$type<Array<{
    id: string;
    name: string;
    minPoints: number;
    benefits: string[];
    color: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  programId: varchar("program_id").references(() => loyaltyPrograms.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  rewardType: text("reward_type").notNull(), // "traditional" | "nft" | "token" | "experience"
  rewardData: jsonb("reward_data").$type<{
    nftMetadata?: {
      name: string;
      description: string;
      image: string;
      attributes: Array<{ trait_type: string; value: string; }>;
      contractAddress?: string;
      tokenId?: string;
      blockchain: string; // "ethereum" | "solana" | "polygon" | "bsc"
      rarity?: string;
      collection?: string;
    };
    tokenAmount?: string;
    experienceDetails?: string;
    downloadLink?: string;
    couponCode?: string;
  }>(),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  requiredTier: text("required_tier"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fanPrograms = pgTable("fan_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  fanId: varchar("fan_id").references(() => users.id).notNull(),
  programId: varchar("program_id").references(() => loyaltyPrograms.id).notNull(),
  currentPoints: integer("current_points").default(0),
  totalPointsEarned: integer("total_points_earned").default(0),
  currentTier: text("current_tier"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  fanProgramId: varchar("fan_program_id").references(() => fanPrograms.id).notNull(),
  points: integer("points").notNull(),
  type: text("type").notNull(), // "earned" | "spent"
  source: text("source").notNull(), // "social_follow" | "reward_redemption" | "referral" | etc.
  metadata: jsonb("metadata").$type<{
    socialPlatform?: string;
    rewardId?: string;
    referralId?: string;
    postUrl?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rewardRedemptions = pgTable("reward_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  fanId: varchar("fan_id").references(() => users.id).notNull(),
  rewardId: varchar("reward_id").references(() => rewards.id).notNull(),
  pointsSpent: integer("points_spent").notNull(),
  status: text("status").default("pending"), // "pending" | "completed" | "failed"
  redemptionData: jsonb("redemption_data").$type<{
    nftTxHash?: string;
    tokenTxHash?: string;
    deliveryInfo?: any;
  }>(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// OpenLoyalty-style Campaign System
export const campaignTypeEnum = pgEnum('campaign_type', ['automation', 'direct', 'referral']);
export const campaignTriggerEnum = pgEnum('campaign_trigger', [
  'schedule_daily', 'schedule_weekly', 'schedule_monthly', 'birthday', 'anniversary',
  'purchase_transaction', 'return_transaction', 'internal_event', 'custom_event', 
  'achievement_earned', 'redemption_code'
]);
export const campaignStatusEnum = pgEnum('campaign_status', ['active', 'inactive', 'draft', 'archived']);

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  creatorId: varchar("creator_id").references(() => creators.id).notNull(),
  
  // Basic Info
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order"),
  
  // Campaign Type & Trigger
  campaignType: campaignTypeEnum("campaign_type").notNull(),
  trigger: campaignTriggerEnum("trigger").notNull(),
  
  // Schedule & Status
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: campaignStatusEnum("status").notNull().default('draft'),
  
  // Visibility & Targeting
  visibility: text("visibility").notNull().default('everyone'), // 'everyone' | 'segments' | 'tiers' | 'hidden'
  visibilityRules: jsonb("visibility_rules").$type<{
    segments?: string[];
    tiers?: string[];
    customAttributes?: Record<string, any>;
  }>(),
  
  // Custom Attributes for API filtering
  customAttributes: jsonb("custom_attributes").$type<Record<string, any>>(),
  
  // Transaction Filters (for purchase/return triggers)
  transactionFilters: jsonb("transaction_filters").$type<{
    productCategories?: string[];
    brands?: string[];
    priceRange?: { min: number; max: number; };
    quantity?: { min: number; max: number; };
    customFilters?: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
  }>(),
  
  // Budget & Limits
  globalBudget: integer("global_budget"), // Total units that can be issued
  perMemberLimit: jsonb("per_member_limit").$type<{
    type: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year' | 'total';
    value: number;
  }>(),
  
  // Usage tracking
  totalIssued: integer("total_issued").default(0),
  totalParticipants: integer("total_participants").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Rules (Conditions + Effects)
export const campaignRules = pgTable("campaign_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  ruleOrder: integer("rule_order").notNull().default(1),
  
  // Conditions (ALL must be met within this rule)
  conditions: jsonb("conditions").$type<Array<{
    type: 'member_tier' | 'purchase_amount' | 'product_category' | 'custom_attribute' | 
          'previous_purchase' | 'member_segment' | 'transaction_count' | 'date_range';
    field?: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
    value: any;
    logicalOperator?: 'AND' | 'OR'; // For combining with next condition
  }>>().notNull(),
  
  // Effects (What happens when conditions are met)
  effects: jsonb("effects").$type<Array<{
    type: 'add_units' | 'deduct_units' | 'give_reward' | 'set_custom_attribute' | 
          'remove_custom_attribute' | 'upgrade_tier' | 'send_notification';
    value?: any;
    formula?: string; // For calculations like "transaction_amount * 0.1"
    rewardId?: string;
    attributeName?: string;
    attributeValue?: any;
    notificationTemplate?: string;
  }>>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign Participation Tracking
export const campaignParticipations = pgTable("campaign_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Belongs to tenant
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  memberId: varchar("member_id").references(() => users.id).notNull(),
  
  // Tracking
  participationCount: integer("participation_count").default(1),
  lastParticipation: timestamp("last_participation").defaultNow(),
  totalUnitsEarned: integer("total_units_earned").default(0),
  
  // Metadata
  participationData: jsonb("participation_data").$type<{
    triggerDetails?: any;
    rewardsEarned?: Array<{
      type: string;
      value: any;
      timestamp: string;
    }>;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});



// Relations
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, {
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  memberships: many(tenantMemberships),
  creators: many(creators),
  loyaltyPrograms: many(loyaltyPrograms),
  campaigns: many(campaigns),
  rewards: many(rewards),
  fanPrograms: many(fanPrograms),
  pointTransactions: many(pointTransactions),
  rewardRedemptions: many(rewardRedemptions),
  campaignParticipations: many(campaignParticipations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  currentTenant: one(tenants, {
    fields: [users.currentTenantId],
    references: [tenants.id],
  }),
  ownedTenants: many(tenants, {
    relationName: "ownedTenants",
  }),
  tenantMemberships: many(tenantMemberships),
  creator: one(creators, {
    fields: [users.id],
    references: [creators.userId],
  }),
  fanPrograms: many(fanPrograms),
  rewardRedemptions: many(rewardRedemptions),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMemberships.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMemberships.userId],
    references: [users.id],
  }),
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  user: one(users, {
    fields: [creators.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [creators.tenantId],
    references: [tenants.id],
  }),
  loyaltyPrograms: many(loyaltyPrograms),
  campaigns: many(campaigns),
}));

export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [loyaltyPrograms.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [loyaltyPrograms.creatorId],
    references: [creators.id],
  }),
  rewards: many(rewards),
  fanPrograms: many(fanPrograms),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rewards.tenantId],
    references: [tenants.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [rewards.programId],
    references: [loyaltyPrograms.id],
  }),
  redemptions: many(rewardRedemptions),
}));

export const fanProgramsRelations = relations(fanPrograms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [fanPrograms.tenantId],
    references: [tenants.id],
  }),
  fan: one(users, {
    fields: [fanPrograms.fanId],
    references: [users.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [fanPrograms.programId],
    references: [loyaltyPrograms.id],
  }),
  pointTransactions: many(pointTransactions),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [pointTransactions.tenantId],
    references: [tenants.id],
  }),
  fanProgram: one(fanPrograms, {
    fields: [pointTransactions.fanProgramId],
    references: [fanPrograms.id],
  }),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rewardRedemptions.tenantId],
    references: [tenants.id],
  }),
  fan: one(users, {
    fields: [rewardRedemptions.fanId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [rewardRedemptions.rewardId],
    references: [rewards.id],
  }),
}));

// Campaign Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [campaigns.creatorId],
    references: [creators.id],
  }),
  rules: many(campaignRules),
  participations: many(campaignParticipations),
}));

export const campaignRulesRelations = relations(campaignRules, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignRules.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignParticipationsRelations = relations(campaignParticipations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [campaignParticipations.tenantId],
    references: [tenants.id],
  }),
  campaign: one(campaigns, {
    fields: [campaignParticipations.campaignId],
    references: [campaigns.id],
  }),
  member: one(users, {
    fields: [campaignParticipations.memberId],
    references: [users.id],
  }),
}));



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
});

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms).omit({
  id: true,
  createdAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export const insertFanProgramSchema = createInsertSchema(fanPrograms).omit({
  id: true,
  joinedAt: true,
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertRewardRedemptionSchema = createInsertSchema(rewardRedemptions).omit({
  id: true,
  redeemedAt: true,
});



// Campaign Schemas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  totalIssued: true,
  totalParticipants: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignRuleSchema = createInsertSchema(campaignRules).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignParticipationSchema = createInsertSchema(campaignParticipations).omit({
  id: true,
  createdAt: true,
});

// Tenant Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  usage: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantMembershipSchema = createInsertSchema(tenantMemberships).omit({
  id: true,
  joinedAt: true,
  lastActiveAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type TenantMembership = typeof tenantMemberships.$inferSelect;
export type InsertTenantMembership = z.infer<typeof insertTenantMembershipSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;

export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type InsertLoyaltyProgram = z.infer<typeof insertLoyaltyProgramSchema>;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type FanProgram = typeof fanPrograms.$inferSelect;
export type InsertFanProgram = z.infer<typeof insertFanProgramSchema>;

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = z.infer<typeof insertRewardRedemptionSchema>;

// Campaign Types
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignRule = typeof campaignRules.$inferSelect;
export type InsertCampaignRule = z.infer<typeof insertCampaignRuleSchema>;
export type CampaignParticipation = typeof campaignParticipations.$inferSelect;
export type InsertCampaignParticipation = z.infer<typeof insertCampaignParticipationSchema>;

// Achievement System Tables
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  icon: varchar("icon").notNull(), // Icon name from Lucide
  category: varchar("category").notNull(), // "social", "engagement", "milestones", "special"
  type: varchar("type").notNull(), // "bronze", "silver", "gold", "platinum", "diamond"
  pointsRequired: integer("points_required").default(0),
  actionRequired: varchar("action_required"), // "follow", "campaign_complete", "points_earned", etc.
  actionCount: integer("action_count").default(1), // How many times action must be performed
  rewardPoints: integer("reward_points").default(0),
  rewardType: varchar("reward_type"), // "points", "badge", "nft", "discount", "access"
  rewardValue: varchar("reward_value"), // JSON string for reward details
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id),
  progress: integer("progress").default(0), // Current progress towards achievement
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  claimed: boolean("claimed").default(false),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLevels = pgTable("user_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  currentLevel: integer("current_level").default(1),
  totalPoints: integer("total_points").default(0),
  levelPoints: integer("level_points").default(0), // Points in current level
  nextLevelThreshold: integer("next_level_threshold").default(1000),
  achievementsUnlocked: integer("achievements_unlocked").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Achievement Schemas
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserLevelSchema = createInsertSchema(userLevels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Achievement Types
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserLevel = typeof userLevels.$inferSelect;
export type InsertUserLevel = z.infer<typeof insertUserLevelSchema>;


