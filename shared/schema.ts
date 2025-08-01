import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role-Based Access Control Enums
export const userRoleEnum = pgEnum('user_role', ['fandomly_admin', 'customer_admin', 'customer_end_user']);
export const customerTierEnum = pgEnum('customer_tier', ['basic', 'premium', 'vip']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dynamicUserId: text("dynamic_user_id").unique(),
  email: text("email"),
  username: text("username"),
  avatar: text("avatar"),
  walletAddress: text("wallet_address"),
  walletChain: text("wallet_chain"),
  userType: text("user_type").notNull().default("fan"), // "creator" | "fan" - legacy field
  // Role-Based Access Control
  role: userRoleEnum("role").notNull().default('customer_end_user'),
  customerTier: customerTierEnum("customer_tier").default('basic'), // Only applies to customer_end_user role
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

export const creators = pgTable("creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  category: text("category").notNull(), // "athlete" | "musician" | "creator"
  followerCount: integer("follower_count").default(0),
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
  fanId: varchar("fan_id").references(() => users.id).notNull(),
  programId: varchar("program_id").references(() => loyaltyPrograms.id).notNull(),
  currentPoints: integer("current_points").default(0),
  totalPointsEarned: integer("total_points_earned").default(0),
  currentTier: text("current_tier"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
export const usersRelations = relations(users, ({ one, many }) => ({
  creator: one(creators, {
    fields: [users.id],
    references: [creators.userId],
  }),
  fanPrograms: many(fanPrograms),
  rewardRedemptions: many(rewardRedemptions),
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  user: one(users, {
    fields: [creators.userId],
    references: [users.id],
  }),
  loyaltyPrograms: many(loyaltyPrograms),
  campaigns: many(campaigns),
}));

export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  creator: one(creators, {
    fields: [loyaltyPrograms.creatorId],
    references: [creators.id],
  }),
  rewards: many(rewards),
  fanPrograms: many(fanPrograms),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  program: one(loyaltyPrograms, {
    fields: [rewards.programId],
    references: [loyaltyPrograms.id],
  }),
  redemptions: many(rewardRedemptions),
}));

export const fanProgramsRelations = relations(fanPrograms, ({ one, many }) => ({
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
  fanProgram: one(fanPrograms, {
    fields: [pointTransactions.fanProgramId],
    references: [fanPrograms.id],
  }),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
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

// Types
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


