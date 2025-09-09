import { 
  users, creators, loyaltyPrograms, rewards, fanPrograms, 
  pointTransactions, rewardRedemptions, tenants, tenantMemberships,
  campaigns, campaignRules,
  type User, type InsertUser, type Creator, type InsertCreator,
  type LoyaltyProgram, type InsertLoyaltyProgram,
  type Reward, type InsertReward, type FanProgram, type InsertFanProgram,
  type PointTransaction, type InsertPointTransaction,
  type RewardRedemption, type InsertRewardRedemption,
  type Tenant, type InsertTenant, type TenantMembership, type InsertTenantMembership,
  type Campaign, type InsertCampaign, type CampaignRule, type InsertCampaignRule
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDynamicId(dynamicUserId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, updates: any): Promise<User | undefined>;
  updateUserType(userId: string, userType: "fan" | "creator"): Promise<User | undefined>;
  updateOnboardingState(userId: string, onboardingState: any): Promise<User | undefined>;

  // Creator operations
  getCreator(id: string): Promise<Creator | undefined>;
  getCreatorByUserId(userId: string): Promise<Creator | undefined>;
  createCreator(creator: any): Promise<Creator>;
  updateCreator(id: string, updates: any): Promise<Creator>;
  getAllCreators(): Promise<Creator[]>;

  // Loyalty program operations
  getLoyaltyProgram(id: string): Promise<LoyaltyProgram | undefined>;
  getLoyaltyProgramsByCreator(creatorId: string): Promise<LoyaltyProgram[]>;
  createLoyaltyProgram(program: any): Promise<LoyaltyProgram>;
  updateLoyaltyProgram(id: string, updates: any): Promise<LoyaltyProgram>;

  // Reward operations
  getReward(id: string): Promise<Reward | undefined>;
  getRewardsByProgram(programId: string): Promise<Reward[]>;
  getAllRewards(): Promise<Reward[]>;
  createReward(reward: any): Promise<Reward>;
  updateReward(id: string, updates: any): Promise<Reward>;

  // Fan program operations
  getFanProgram(fanId: string, programId: string): Promise<FanProgram | undefined>;
  getFanProgramsByUser(fanId: string): Promise<FanProgram[]>;
  createFanProgram(fanProgram: any): Promise<FanProgram>;
  updateFanProgram(id: string, updates: any): Promise<FanProgram>;

  // Point transaction operations
  createPointTransaction(transaction: any): Promise<PointTransaction>;
  getPointTransactionsByFanProgram(fanProgramId: string): Promise<PointTransaction[]>;

  // Reward redemption operations
  createRewardRedemption(redemption: any): Promise<RewardRedemption>;
  getRewardRedemptionsByUser(fanId: string): Promise<RewardRedemption[]>;
  updateRewardRedemption(id: string, updates: any): Promise<RewardRedemption>;

  // Tenant operations
  createTenant(data: any): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  updateTenant(id: string, data: any): Promise<Tenant | undefined>;
  getUserTenants(userId: string): Promise<Tenant[]>;

  // Tenant Membership operations
  createTenantMembership(data: any): Promise<TenantMembership>;
  getTenantMembers(tenantId: string): Promise<TenantMembership[]>;
  getUserMemberships(userId: string): Promise<TenantMembership[]>;

  // Campaign operations
  getCampaignsByCreator(creatorId: string): Promise<Campaign[]>;
  getActiveCampaignsByCreator(creatorId: string): Promise<Campaign[]>;
  createCampaign(data: any): Promise<Campaign>;
  updateCampaign(id: string, data: any): Promise<Campaign>;
  getCampaignRules(campaignId: string): Promise<CampaignRule[]>;
  createCampaignRule(data: any): Promise<CampaignRule>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByDynamicId(dynamicUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.dynamicUserId, dynamicUserId));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserType(userId: string, userType: "fan" | "creator"): Promise<User | undefined> {
    try {
      const role = userType === "creator" ? "customer_admin" : "customer_end_user";
      const [updatedUser] = await db
        .update(users)
        .set({ 
          userType, 
          role
          // Preserve existing onboarding state and profile data when switching types
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user type:", error);
      return undefined;
    }
  }

  async updateOnboardingState(userId: string, onboardingState: any): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ onboardingState })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating onboarding state:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Creator operations
  async getCreator(id: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.id, id));
    return creator || undefined;
  }

  async getCreatorByUserId(userId: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.userId, userId));
    return creator || undefined;
  }

  async createCreator(insertCreator: InsertCreator): Promise<Creator> {
    const [creator] = await db.insert(creators).values(insertCreator as any).returning();
    return creator;
  }

  async updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator> {
    const [creator] = await db.update(creators).set(updates as any).where(eq(creators.id, id)).returning();
    return creator;
  }

  async getAllCreators(): Promise<Creator[]> {
    return await db.select().from(creators).orderBy(desc(creators.followerCount));
  }

  // Loyalty program operations
  async getLoyaltyProgram(id: string): Promise<LoyaltyProgram | undefined> {
    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, id));
    return program || undefined;
  }

  async getLoyaltyProgramsByCreator(creatorId: string): Promise<LoyaltyProgram[]> {
    return await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.creatorId, creatorId));
  }

  async createLoyaltyProgram(insertProgram: InsertLoyaltyProgram): Promise<LoyaltyProgram> {
    const [program] = await db.insert(loyaltyPrograms).values(insertProgram as any).returning();
    return program;
  }

  async updateLoyaltyProgram(id: string, updates: Partial<InsertLoyaltyProgram>): Promise<LoyaltyProgram> {
    const [program] = await db.update(loyaltyPrograms).set(updates as any).where(eq(loyaltyPrograms.id, id)).returning();
    return program;
  }

  // Reward operations
  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    return reward || undefined;
  }

  async getRewardsByProgram(programId: string): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.programId, programId));
  }

  async getAllRewards(): Promise<Reward[]> {
    return await db.select().from(rewards);
  }

  async createReward(insertReward: InsertReward): Promise<Reward> {
    const [reward] = await db.insert(rewards).values(insertReward as any).returning();
    return reward;
  }

  async updateReward(id: string, updates: Partial<InsertReward>): Promise<Reward> {
    const [reward] = await db.update(rewards).set(updates as any).where(eq(rewards.id, id)).returning();
    return reward;
  }

  // Fan program operations
  async getFanProgram(fanId: string, programId: string): Promise<FanProgram | undefined> {
    const [fanProgram] = await db.select().from(fanPrograms)
      .where(and(eq(fanPrograms.fanId, fanId), eq(fanPrograms.programId, programId)));
    return fanProgram || undefined;
  }

  async getFanProgramsByUser(fanId: string): Promise<FanProgram[]> {
    return await db.select().from(fanPrograms).where(eq(fanPrograms.fanId, fanId));
  }

  async createFanProgram(insertFanProgram: InsertFanProgram): Promise<FanProgram> {
    const [fanProgram] = await db.insert(fanPrograms).values(insertFanProgram).returning();
    return fanProgram;
  }

  async updateFanProgram(id: string, updates: Partial<InsertFanProgram>): Promise<FanProgram> {
    const [fanProgram] = await db.update(fanPrograms).set(updates).where(eq(fanPrograms.id, id)).returning();
    return fanProgram;
  }

  // Point transaction operations
  async createPointTransaction(insertTransaction: InsertPointTransaction): Promise<PointTransaction> {
    const [transaction] = await db.insert(pointTransactions).values(insertTransaction as any).returning();
    return transaction;
  }

  async getPointTransactionsByFanProgram(fanProgramId: string): Promise<PointTransaction[]> {
    return await db.select().from(pointTransactions)
      .where(eq(pointTransactions.fanProgramId, fanProgramId))
      .orderBy(desc(pointTransactions.createdAt));
  }

  // Reward redemption operations
  async createRewardRedemption(insertRedemption: InsertRewardRedemption): Promise<RewardRedemption> {
    const [redemption] = await db.insert(rewardRedemptions).values(insertRedemption as any).returning();
    return redemption;
  }

  async getRewardRedemptionsByUser(fanId: string): Promise<RewardRedemption[]> {
    return await db.select().from(rewardRedemptions)
      .where(eq(rewardRedemptions.fanId, fanId))
      .orderBy(desc(rewardRedemptions.redeemedAt));
  }

  async updateRewardRedemption(id: string, updates: Partial<InsertRewardRedemption>): Promise<RewardRedemption> {
    const [redemption] = await db.update(rewardRedemptions).set(updates as any)
      .where(eq(rewardRedemptions.id, id)).returning();
    return redemption;
  }

  // Tenant operations
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any).returning();
    return tenant;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db.update(tenants).set({
      ...data,
      updatedAt: new Date()
    } as any).where(eq(tenants.id, id)).returning();
    return tenant;
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.ownerId, userId));
  }

  // Tenant Membership operations
  async createTenantMembership(data: InsertTenantMembership): Promise<TenantMembership> {
    const [membership] = await db.insert(tenantMemberships).values({
      ...data,
      joinedAt: new Date(),
      lastActiveAt: new Date()
    } as any).returning();
    return membership;
  }

  async getTenantMembers(tenantId: string): Promise<TenantMembership[]> {
    return await db.select().from(tenantMemberships).where(eq(tenantMemberships.tenantId, tenantId));
  }

  async getUserMemberships(userId: string): Promise<TenantMembership[]> {
    return await db.select().from(tenantMemberships).where(eq(tenantMemberships.userId, userId));
  }

  // Campaign operations
  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.creatorId, creatorId));
  }

  async getActiveCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'active')));
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [row] = await db.insert(campaigns).values(data as any).returning();
    return row;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign> {
    const [row] = await db.update(campaigns).set(data as any).where(eq(campaigns.id, id)).returning();
    return row;
  }

  async getCampaignRules(campaignId: string): Promise<CampaignRule[]> {
    return await db.select().from(campaignRules).where(eq(campaignRules.campaignId, campaignId));
  }

  async createCampaignRule(data: InsertCampaignRule): Promise<CampaignRule> {
    const [row] = await db.insert(campaignRules).values(data as any).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
