import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dynamicUserId: text("dynamic_user_id").unique(),
  email: text("email"),
  username: text("username"),
  avatar: text("avatar"),
  walletAddress: text("wallet_address"),
  walletChain: text("wallet_chain"),
  userType: text("user_type").notNull().default("fan"), // "creator" | "fan"
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
    nftMetadata?: any;
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
