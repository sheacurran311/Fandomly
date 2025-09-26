import { 
  users, creators, loyaltyPrograms, rewards, fanPrograms, 
  pointTransactions, rewardRedemptions, tenants, tenantMemberships,
  campaigns, campaignRules, campaignParticipations, socialCampaignTasks,
  tasks, taskAssignments, taskTemplates,
  type User, type InsertUser, type Creator, type InsertCreator,
  type LoyaltyProgram, type InsertLoyaltyProgram,
  type Reward, type InsertReward, type FanProgram, type InsertFanProgram,
  type PointTransaction, type InsertPointTransaction,
  type RewardRedemption, type InsertRewardRedemption,
  type Tenant, type InsertTenant, type TenantMembership, type InsertTenantMembership,
  type Campaign, type InsertCampaign, type CampaignRule, type InsertCampaignRule,
  type Task, type InsertTask, type TaskTemplate, type InsertTaskTemplate, type TaskAssignment, type InsertTaskAssignment,
  insertSocialCampaignTaskSchema,
  creatorFacebookPages
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDynamicId(dynamicUserId: string): Promise<User | undefined>;
  getUsersByFacebookId(facebookId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, updates: any): Promise<User | undefined>;
  updateUserType(userId: string, userType: "fan" | "creator"): Promise<User | undefined>;
  updateOnboardingState(userId: string, onboardingState: any): Promise<User | undefined>;

  // Creator operations
  getCreator(id: string, tenantId?: string): Promise<Creator | undefined>;
  getCreatorByUserId(userId: string, tenantId?: string): Promise<Creator | undefined>;
  createCreator(creator: any): Promise<Creator>;
  updateCreator(id: string, updates: any): Promise<Creator>;
  getAllCreators(): Promise<Creator[]>;

  // Loyalty program operations
  getLoyaltyProgram(id: string): Promise<LoyaltyProgram | undefined>;
  getLoyaltyProgramsByCreator(creatorId: string): Promise<LoyaltyProgram[]>;
  createLoyaltyProgram(program: any): Promise<LoyaltyProgram>;
  updateLoyaltyProgram(id: string, updates: any): Promise<LoyaltyProgram>;

  // Reward operations
  getReward(id: string, tenantId?: string): Promise<Reward | undefined>;
  getRewardsByProgram(programId: string, tenantId?: string): Promise<Reward[]>;
  getAllRewards(tenantId?: string): Promise<Reward[]>;
  createReward(reward: any): Promise<Reward>;
  updateReward(id: string, updates: any): Promise<Reward>;
  deleteReward(id: string): Promise<void>;
  
  // Atomic redemption operation
  redeemRewardAtomic(data: {
    userId: string;
    rewardId: string;
    entries: number;
    membershipId: string;
  }): Promise<{
    updatedMembership: TenantMembership;
    updatedReward: Reward;
    fanProgram: FanProgram;
    pointTransaction: PointTransaction;
    rewardRedemption: RewardRedemption;
  }>;

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
  getCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]>;
  getActiveCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]>;
  getAllActiveCampaigns(tenantId?: string): Promise<Campaign[]>;
  createCampaign(data: any): Promise<Campaign>;
  updateCampaign(id: string, data: any): Promise<Campaign>;
  getCampaignRules(campaignId: string): Promise<CampaignRule[]>;
  createCampaignRule(data: any): Promise<CampaignRule>;
  
  // Social Campaign Task operations
  getSocialCampaignTasks(campaignId: string): Promise<any[]>;
  createSocialCampaignTask(data: any): Promise<any>;
  updateSocialCampaignTask(id: string, data: any): Promise<any>;
  deleteSocialCampaignTask(id: string): Promise<void>;
  
  // Campaign Participation operations
  createCampaignParticipation(data: any): Promise<any>;
  getCampaignParticipation(campaignId: string, memberId: string): Promise<any>;
  updateCampaignParticipation(id: string, data: any): Promise<any>;

  // Task operations (new workflow)
  getTasks(creatorId: string, tenantId?: string): Promise<Task[]>;
  getTask(id: string, tenantId?: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>, tenantId: string): Promise<Task | undefined>;
  deleteTask(id: string, tenantId: string): Promise<void>;
  
  // Task Template operations
  getTaskTemplates(tenantId?: string): Promise<TaskTemplate[]>;
  getTaskTemplate(id: string, tenantId?: string): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: string, updates: Partial<InsertTaskTemplate>, tenantId?: string): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: string, tenantId?: string): Promise<void>;
  
  // Task Assignment operations
  getTaskAssignments(campaignId: string): Promise<TaskAssignment[]>;
  getCampaignTasks(campaignId: string): Promise<Task[]>;
  assignTaskToCampaign(taskId: string, campaignId: string, tenantId: string): Promise<TaskAssignment>;
  unassignTaskFromCampaign(taskId: string, campaignId: string, tenantId: string): Promise<void>;
  
  // Campaign Publishing operations
  publishCampaign(campaignId: string, tenantId: string): Promise<Campaign | undefined>;
  getPendingCampaigns(creatorId: string, tenantId?: string): Promise<Campaign[]>;

  // Creator Facebook Pages
  upsertCreatorFacebookPages(creatorId: string, pages: Array<{
    pageId: string;
    name: string;
    accessToken: string;
    followersCount?: number;
    fanCount?: number;
    instagramBusinessAccountId?: string;
    connectedInstagramAccountId?: string;
  }>): Promise<number>;
  getCreatorFacebookPages(creatorId: string): Promise<any[]>;

  // Social OAuth token storage
  saveSocialTokenBundle(dynamicUserId: string, platform: string, tokenBundle: any): Promise<void>;
  getSocialTokenBundle(dynamicUserId: string, platform: string): Promise<any | undefined>;
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

  async getUsersByFacebookId(facebookId: string): Promise<User[]> {
    // Query users where profileData contains Facebook data with the given ID
    // This uses PostgreSQL JSON operators to search within the profileData field
    const usersWithFacebookId = await db
      .select()
      .from(users)
      .where(sql`${users.profileData}->>'facebookData' IS NOT NULL AND ${users.profileData}->'facebookData'->>'id' = ${facebookId}`)
      .orderBy(desc(users.createdAt));
    
    return usersWithFacebookId || [];
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
  async getCreator(id: string, tenantId?: string): Promise<Creator | undefined> {
    const conditions = tenantId 
      ? and(eq(creators.id, id), eq(creators.tenantId, tenantId))
      : eq(creators.id, id);
    const [creator] = await db.select().from(creators).where(conditions);
    return creator || undefined;
  }

  async getCreatorByUserId(userId: string, tenantId?: string): Promise<Creator | undefined> {
    const conditions = tenantId 
      ? and(eq(creators.userId, userId), eq(creators.tenantId, tenantId))
      : eq(creators.userId, userId);
    const [creator] = await db.select().from(creators).where(conditions);
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
  async getReward(id: string, tenantId?: string): Promise<Reward | undefined> {
    const conditions = tenantId 
      ? and(eq(rewards.id, id), eq(rewards.tenantId, tenantId))
      : eq(rewards.id, id);
    const [reward] = await db.select().from(rewards).where(conditions);
    return reward || undefined;
  }

  async getRewardsByProgram(programId: string, tenantId?: string): Promise<Reward[]> {
    const conditions = tenantId 
      ? and(eq(rewards.programId, programId), eq(rewards.tenantId, tenantId))
      : eq(rewards.programId, programId);
    return await db.select().from(rewards).where(conditions);
  }

  async getAllRewards(tenantId?: string): Promise<Reward[]> {
    const conditions = tenantId ? eq(rewards.tenantId, tenantId) : undefined;
    return conditions 
      ? await db.select().from(rewards).where(conditions)
      : await db.select().from(rewards);
  }

  async createReward(insertReward: InsertReward): Promise<Reward> {
    const [reward] = await db.insert(rewards).values(insertReward as any).returning();
    return reward;
  }

  async updateReward(id: string, updates: Partial<InsertReward>): Promise<Reward> {
    const [reward] = await db.update(rewards).set(updates as any).where(eq(rewards.id, id)).returning();
    return reward;
  }

  async deleteReward(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await db.update(rewards).set({ isActive: false } as any).where(eq(rewards.id, id));
  }

  async redeemRewardAtomic(data: {
    userId: string;
    rewardId: string;
    entries: number;
    membershipId: string;
  }): Promise<{
    updatedMembership: TenantMembership;
    updatedReward: Reward;
    fanProgram: FanProgram;
    pointTransaction: PointTransaction;
    rewardRedemption: RewardRedemption;
  }> {
    // Use db.transaction for atomicity - all operations succeed or all fail
    return await db.transaction(async (tx) => {
      // Get fresh reward data with row lock to prevent race conditions
      const [reward] = await tx.select().from(rewards)
        .where(and(eq(rewards.id, data.rewardId), eq(rewards.isActive, true)));
      
      if (!reward) {
        throw new Error('Reward not found or inactive');
      }

      // Calculate cost server-side - NEVER trust client
      const totalCost = reward.pointsCost * data.entries;

      // Get fresh membership data with row lock and validate ownership
      const [membership] = await tx.select().from(tenantMemberships)
        .where(and(
          eq(tenantMemberships.id, data.membershipId),
          eq(tenantMemberships.userId, data.userId),  // IDOR prevention
          eq(tenantMemberships.tenantId, reward.tenantId) // Tenant scoping
        ));
      
      if (!membership) {
        throw new Error('Membership not found or access denied');
      }

      // Validate raffle max entries
      if (reward.rewardType === 'raffle' && reward.rewardData?.raffleData?.maxEntries) {
        if (data.entries > reward.rewardData.raffleData.maxEntries) {
          throw new Error(`Maximum ${reward.rewardData.raffleData.maxEntries} entries allowed`);
        }
      }

      // Atomic conditional updates to prevent race conditions
      // 1. Update membership points with conditional check
      const membershipUpdateResult = await tx.update(tenantMemberships)
        .set({
          memberData: {
            ...membership.memberData,
            points: (membership.memberData?.points || 0) - totalCost
          }
        } as any)
        .where(and(
          eq(tenantMemberships.id, data.membershipId),
          // Conditional update - only succeed if sufficient points
          sql`(${tenantMemberships.memberData}->>'points')::int >= ${totalCost}`
        ))
        .returning();

      if (membershipUpdateResult.length === 0) {
        throw new Error('Insufficient points');
      }

      // 2. Update reward stock with conditional check
      const rewardUpdateResult = await tx.update(rewards)
        .set({
          currentRedemptions: sql`${rewards.currentRedemptions} + ${data.entries}`
        } as any)
        .where(and(
          eq(rewards.id, data.rewardId),
          // Conditional update - only succeed if stock available
          reward.maxRedemptions 
            ? sql`${rewards.currentRedemptions} + ${data.entries} <= ${reward.maxRedemptions}`
            : sql`true`
        ))
        .returning();

      if (rewardUpdateResult.length === 0) {
        throw new Error('Reward no longer available');
      }

      // 3. Find or create fan program within transaction
      let fanProgram = await tx.select().from(fanPrograms)
        .where(and(eq(fanPrograms.fanId, data.userId), eq(fanPrograms.programId, reward.programId)))
        .then(rows => rows[0]);

      if (!fanProgram) {
        const [newFanProgram] = await tx.insert(fanPrograms)
          .values({
            tenantId: reward.tenantId,
            fanId: data.userId,
            programId: reward.programId,
            currentPoints: 0,
            totalPointsEarned: 0
          } as any)
          .returning();
        fanProgram = newFanProgram;
      }

      // 4. Create audit trail - reward redemption record
      const [rewardRedemption] = await tx.insert(rewardRedemptions)
        .values({
          rewardId: reward.id,
          fanId: data.userId,
          pointsSpent: totalCost,
          quantity: data.entries,
          status: 'completed',
          redeemedAt: new Date()
        } as any)
        .returning();

      // 5. Create point transaction for audit trail
      const [pointTransaction] = await tx.insert(pointTransactions)
        .values({
          tenantId: reward.tenantId,
          fanProgramId: fanProgram.id,
          points: -totalCost,
          type: 'spent',
          source: 'reward_redemption',
          metadata: {
            rewardId: reward.id,
            redemptionId: rewardRedemption.id
          }
        } as any)
        .returning();

      return {
        updatedMembership: membershipUpdateResult[0],
        updatedReward: rewardUpdateResult[0],
        fanProgram,
        pointTransaction,
        rewardRedemption
      };
    });
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

  async getUserTenantMembership(userId: string, tenantId: string): Promise<TenantMembership | undefined> {
    const [membership] = await db.select().from(tenantMemberships)
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.tenantId, tenantId)));
    return membership || undefined;
  }

  async updateUserTenantMembership(userId: string, tenantId: string, updates: Partial<InsertTenantMembership>): Promise<TenantMembership> {
    const [membership] = await db.update(tenantMemberships)
      .set(updates as any)
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.tenantId, tenantId)))
      .returning();
    return membership;
  }

  async updateTenantMembership(id: string, updates: Partial<InsertTenantMembership>): Promise<TenantMembership> {
    const [membership] = await db.update(tenantMemberships)
      .set(updates as any)
      .where(eq(tenantMemberships.id, id))
      .returning();
    return membership;
  }

  // Campaign operations
  async getCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId 
      ? and(eq(campaigns.creatorId, creatorId), eq(campaigns.tenantId, tenantId))
      : eq(campaigns.creatorId, creatorId);
    return await db.select().from(campaigns).where(conditions);
  }

  async getActiveCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId 
      ? and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'active'), eq(campaigns.tenantId, tenantId))
      : and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'active'));
    return await db.select().from(campaigns).where(conditions);
  }

  async getAllActiveCampaigns(tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId 
      ? and(eq(campaigns.status, 'active'), eq(campaigns.tenantId, tenantId))
      : eq(campaigns.status, 'active');
    return await db.select().from(campaigns).where(conditions);
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

  // Social Campaign Task operations
  async getSocialCampaignTasks(campaignId: string): Promise<any[]> {
    return await db.select().from(socialCampaignTasks)
      .where(eq(socialCampaignTasks.campaignId, campaignId))
      .orderBy(socialCampaignTasks.displayOrder, socialCampaignTasks.createdAt);
  }

  async createSocialCampaignTask(data: any): Promise<any> {
    const [row] = await db.insert(socialCampaignTasks).values(data as any).returning();
    return row;
  }

  async updateSocialCampaignTask(id: string, data: any): Promise<any> {
    const [row] = await db.update(socialCampaignTasks)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(socialCampaignTasks.id, id))
      .returning();
    return row;
  }

  async deleteSocialCampaignTask(id: string): Promise<void> {
    await db.delete(socialCampaignTasks).where(eq(socialCampaignTasks.id, id));
  }

  // Creator Facebook Pages
  async upsertCreatorFacebookPages(creatorId: string, pages: Array<{
    pageId: string;
    name: string;
    accessToken: string;
    followersCount?: number;
    fanCount?: number;
    instagramBusinessAccountId?: string;
    connectedInstagramAccountId?: string;
  }>): Promise<number> {
    let count = 0;
    for (const p of pages) {
      const existing = await db.select().from(creatorFacebookPages)
        .where(and(eq(creatorFacebookPages.creatorId, creatorId), eq(creatorFacebookPages.pageId, p.pageId)));
      if (existing && existing.length > 0) {
        await db.update(creatorFacebookPages).set({
          name: p.name,
          accessToken: p.accessToken,
          followersCount: p.followersCount || 0,
          fanCount: p.fanCount || 0,
          instagramBusinessAccountId: p.instagramBusinessAccountId,
          connectedInstagramAccountId: p.connectedInstagramAccountId,
          updatedAt: new Date()
        } as any).where(and(eq(creatorFacebookPages.creatorId, creatorId), eq(creatorFacebookPages.pageId, p.pageId)));
      } else {
        await db.insert(creatorFacebookPages).values({
          creatorId,
          pageId: p.pageId,
          name: p.name,
          accessToken: p.accessToken,
          followersCount: p.followersCount || 0,
          fanCount: p.fanCount || 0,
          instagramBusinessAccountId: p.instagramBusinessAccountId,
          connectedInstagramAccountId: p.connectedInstagramAccountId,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
      }
      count++;
    }
    return count;
  }

  async getCreatorFacebookPages(creatorId: string): Promise<any[]> {
    return await db.select().from(creatorFacebookPages).where(eq(creatorFacebookPages.creatorId, creatorId));
  }

  // Campaign Participation operations
  async createCampaignParticipation(data: any): Promise<any> {
    const [participation] = await db.insert(campaignParticipations).values(data).returning();
    return participation;
  }

  async getCampaignParticipation(campaignId: string, memberId: string): Promise<any> {
    const [participation] = await db.select().from(campaignParticipations)
      .where(and(eq(campaignParticipations.campaignId, campaignId), eq(campaignParticipations.memberId, memberId)));
    return participation || undefined;
  }

  async updateCampaignParticipation(id: string, data: any): Promise<any> {
    const [participation] = await db.update(campaignParticipations)
      .set(data)
      .where(eq(campaignParticipations.id, id))
      .returning();
    return participation;
  }

  // Task operations (new workflow)
  async getTasks(creatorId: string, tenantId?: string): Promise<Task[]> {
    const conditions = tenantId 
      ? and(eq(tasks.creatorId, creatorId), eq(tasks.tenantId, tenantId))
      : eq(tasks.creatorId, creatorId);
    return await db.select().from(tasks).where(conditions).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string, tenantId?: string): Promise<Task | undefined> {
    const conditions = tenantId 
      ? and(eq(tasks.id, id), eq(tasks.tenantId, tenantId))
      : eq(tasks.id, id);
    const [task] = await db.select().from(tasks).where(conditions);
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<InsertTask>, tenantId: string): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .returning();
    return task;
  }

  async deleteTask(id: string, tenantId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)));
  }

  // Task Template operations
  async getTaskTemplates(tenantId?: string): Promise<TaskTemplate[]> {
    // Get both global templates and tenant-specific templates
    const conditions = tenantId 
      ? sql`${taskTemplates.isGlobal} = true OR ${taskTemplates.tenantId} = ${tenantId}`
      : sql`${taskTemplates.isGlobal} = true`;
    
    return await db.select()
      .from(taskTemplates)
      .where(conditions)
      .orderBy(desc(taskTemplates.createdAt));
  }

  async getTaskTemplate(id: string, tenantId?: string): Promise<TaskTemplate | undefined> {
    const conditions = tenantId 
      ? and(
          eq(taskTemplates.id, id), 
          sql`${taskTemplates.isGlobal} = true OR ${taskTemplates.tenantId} = ${tenantId}`
        )
      : and(eq(taskTemplates.id, id), eq(taskTemplates.isGlobal, true));
    
    const [template] = await db.select().from(taskTemplates).where(conditions);
    return template;
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [newTemplate] = await db.insert(taskTemplates).values(template).returning();
    return newTemplate;
  }

  async updateTaskTemplate(id: string, updates: Partial<InsertTaskTemplate>, tenantId?: string): Promise<TaskTemplate | undefined> {
    // Only allow updates to templates the user owns (global templates if admin, tenant templates if tenant admin)
    const conditions = tenantId 
      ? and(eq(taskTemplates.id, id), eq(taskTemplates.tenantId, tenantId))
      : and(eq(taskTemplates.id, id), eq(taskTemplates.isGlobal, true));
    
    const [template] = await db.update(taskTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return template;
  }

  async deleteTaskTemplate(id: string, tenantId?: string): Promise<void> {
    // Only allow deletion of templates the user owns
    const conditions = tenantId 
      ? and(eq(taskTemplates.id, id), eq(taskTemplates.tenantId, tenantId))
      : and(eq(taskTemplates.id, id), eq(taskTemplates.isGlobal, true));
    
    await db.delete(taskTemplates).where(conditions);
  }

  // Task Assignment operations
  async getTaskAssignments(campaignId: string): Promise<TaskAssignment[]> {
    return await db.select().from(taskAssignments)
      .where(eq(taskAssignments.campaignId, campaignId))
      .orderBy(taskAssignments.displayOrder);
  }

  async getCampaignTasks(campaignId: string): Promise<Task[]> {
    const result = await db
      .select({ 
        task: tasks,
        assignment: taskAssignments 
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(and(
        eq(taskAssignments.campaignId, campaignId),
        eq(taskAssignments.isActive, true)
      ))
      .orderBy(taskAssignments.displayOrder);
    
    return result.map(r => r.task);
  }

  async assignTaskToCampaign(taskId: string, campaignId: string, tenantId: string): Promise<TaskAssignment> {
    const [assignment] = await db.insert(taskAssignments).values({
      taskId,
      campaignId,
      tenantId,
      displayOrder: 1,
      isActive: true
    }).returning();
    return assignment;
  }

  async unassignTaskFromCampaign(taskId: string, campaignId: string, tenantId: string): Promise<void> {
    await db.delete(taskAssignments)
      .where(and(
        eq(taskAssignments.taskId, taskId),
        eq(taskAssignments.campaignId, campaignId),
        eq(taskAssignments.tenantId, tenantId)
      ));
  }

  // Campaign Publishing operations
  async publishCampaign(campaignId: string, tenantId: string): Promise<Campaign | undefined> {
    // Check if campaign has >1 tasks assigned
    const assignedTasks = await this.getTaskAssignments(campaignId);
    if (assignedTasks.length < 1) {
      throw new Error('Campaign must have at least 1 task assigned before publishing');
    }

    const [campaign] = await db.update(campaigns)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .returning();
    return campaign;
  }

  async getPendingCampaigns(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId 
      ? and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'pending_tasks'), eq(campaigns.tenantId, tenantId))
      : and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'pending_tasks'));
    return await db.select().from(campaigns).where(conditions).orderBy(desc(campaigns.createdAt));
  }

  // Social Account Management
  async saveSocialAccount(dynamicUserId: string, platform: string, accountData: any): Promise<void> {
    try {
      // First, get the user's internal ID from their Dynamic ID
      const user = await this.getUserByDynamicId(dynamicUserId);
      if (!user) {
        throw new Error(`User not found for Dynamic ID: ${dynamicUserId}`);
      }

      // Create or update social account connection
      const socialAccountData = {
        userId: user.id,
        platform,
        platformUserId: accountData.user?.id || accountData.id,
        username: accountData.user?.username || accountData.username,
        displayName: accountData.user?.name || accountData.name || accountData.displayName,
        profileUrl: accountData.user?.profileUrl || `https://twitter.com/${accountData.user?.username}`,
        followers: accountData.user?.followersCount || accountData.followersCount || 0,
        metadata: JSON.stringify(accountData),
        connectedAt: new Date(),
        isActive: true
      };

      console.log(`[Storage] Saving social account for user ${user.id}:`, { platform, username: socialAccountData.username });
      // Persist under users.profileData.socialConnections
      const profileData: any = (user as any).profileData || {};
      const socialConnections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];
      const filtered = socialConnections.filter((acc: any) => acc.platform !== platform);
      const updatedConnections = [...filtered, {
        platform: socialAccountData.platform,
        platformUserId: socialAccountData.platformUserId,
        username: socialAccountData.username,
        displayName: socialAccountData.displayName,
        profileUrl: socialAccountData.profileUrl,
        followers: socialAccountData.followers,
        metadata: socialAccountData.metadata,
        connectedAt: socialAccountData.connectedAt,
        isActive: socialAccountData.isActive
      }];
      const nextProfileData = { ...profileData, socialConnections: updatedConnections };
      await this.updateUser(user.id, { profileData: nextProfileData } as any);
      console.log(`[Storage] Social account saved successfully:`, socialAccountData);
      
    } catch (error) {
      console.error(`[Storage] Failed to save social account:`, error);
      throw error;
    }
  }

  async getSocialAccounts(dynamicUserId: string): Promise<any[]> {
    try {
      const user = await this.getUserByDynamicId(dynamicUserId);
      if (!user) {
        return [];
      }

      const profileData: any = (user as any).profileData || {};
      const connections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];
      console.log(`[Storage] Getting social accounts for user ${user.id} -> ${connections.length} found`);
      return connections;
      
    } catch (error) {
      console.error(`[Storage] Failed to get social accounts:`, error);
      return [];
    }
  }

  async removeSocialAccount(dynamicUserId: string, platform: string): Promise<boolean> {
    try {
      const user = await this.getUserByDynamicId(dynamicUserId);
      if (!user) {
        console.log(`[Storage] User not found for dynamicUserId: ${dynamicUserId}`);
        return false;
      }

      const profileData: any = (user as any).profileData || {};
      const connections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];

      // Remove the connection for this platform
      const updatedConnections = connections.filter((conn: any) => conn.platform !== platform);
      
      console.log(`[Storage] Removing ${platform} connection for user ${user.id}. Before: ${connections.length}, After: ${updatedConnections.length}`);

      // Update user with new connections
      const updatedProfileData = {
        ...profileData,
        socialConnections: updatedConnections
      };

      await this.updateUser(user.id, { profileData: updatedProfileData } as any);
      
      console.log(`[Storage] Successfully removed ${platform} connection for user ${user.id}`);
      return true;
      
    } catch (error) {
      console.error(`[Storage] Failed to remove social account:`, error);
      return false;
    }
  }

  async saveSocialTokenBundle(dynamicUserId: string, platform: string, tokenBundle: any): Promise<void> {
    try {
      const user = await this.getUserByDynamicId(dynamicUserId);
      if (!user) {
        throw new Error(`User not found for Dynamic ID: ${dynamicUserId}`);
      }

      const profileData: any = (user as any).profileData || {};
      const socialTokens = profileData.socialTokens && typeof profileData.socialTokens === 'object'
        ? profileData.socialTokens
        : {};

      socialTokens[platform] = tokenBundle;

      const nextProfileData = { ...profileData, socialTokens };
      await this.updateUser(user.id, { profileData: nextProfileData } as any);
      console.log(`[Storage] Saved ${platform} token bundle for user ${user.id}`);
    } catch (error) {
      console.error(`[Storage] Failed to save ${platform} token bundle:`, error);
      throw error;
    }
  }

  async getSocialTokenBundle(dynamicUserId: string, platform: string): Promise<any | undefined> {
    try {
      const user = await this.getUserByDynamicId(dynamicUserId);
      if (!user) return undefined;
      const profileData: any = (user as any).profileData || {};
      const socialTokens = profileData.socialTokens && typeof profileData.socialTokens === 'object'
        ? profileData.socialTokens
        : {};
      return socialTokens[platform];
    } catch (error) {
      console.error(`[Storage] Failed to get ${platform} token bundle:`, error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
