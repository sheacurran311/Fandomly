/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  users,
  creators,
  loyaltyPrograms,
  rewards,
  fanPrograms,
  pointTransactions,
  rewardRedemptions,
  tenants,
  tenantMemberships,
  campaigns,
  campaignRules,
  campaignParticipations,
  tasks,
  taskAssignments,
  taskTemplates,
  taskCompletions,
  rewardDistributions,
  notifications,
  auditLog,
  type User,
  type InsertUser,
  type Creator,
  type InsertCreator,
  type LoyaltyProgram,
  type InsertLoyaltyProgram,
  type Reward,
  type InsertReward,
  type FanProgram,
  type InsertFanProgram,
  type PointTransaction,
  type InsertPointTransaction,
  type RewardRedemption,
  type InsertRewardRedemption,
  type Tenant,
  type InsertTenant,
  type TenantMembership,
  type InsertTenantMembership,
  type Campaign,
  type InsertCampaign,
  type CampaignRule,
  type InsertCampaignRule,
  type Task,
  type InsertTask,
  type TaskTemplate,
  type InsertTaskTemplate,
  type TaskAssignment,
  type InsertTaskAssignment,
  type TaskCompletion,
  type InsertTaskCompletion,
  type RewardDistribution,
  type InsertRewardDistribution,
  type AuditLog,
  type InsertAuditLog,
  creatorFacebookPages,
} from '@shared/schema';
import { db } from '../db';
import { eq, desc, and, sql, or, isNull, count } from 'drizzle-orm';
import { encryptToken, decryptToken } from '../utils/crypto-utils';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByFacebookId(facebookId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, updates: any): Promise<User | undefined>;
  updateUserType(userId: string, userType: 'fan' | 'creator'): Promise<User | undefined>;
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
  getRewardRedemptionsByProgram(programId: string): Promise<RewardRedemption[]>;
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
  getCampaign(id: string, tenantId?: string): Promise<Campaign | undefined>;
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
  getTasksByTenantId(tenantId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  getTask(id: string, tenantId?: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(
    id: string,
    updates: Partial<InsertTask>,
    tenantId?: string
  ): Promise<Task | undefined>;
  deleteTask(id: string, tenantId?: string): Promise<void>;

  // Task Template operations
  getTaskTemplates(tenantId?: string): Promise<TaskTemplate[]>;
  getTaskTemplate(id: string, tenantId?: string): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(
    id: string,
    updates: Partial<InsertTaskTemplate>,
    tenantId?: string
  ): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: string, tenantId?: string): Promise<void>;

  // Task Assignment operations
  getTaskAssignments(campaignId: string): Promise<TaskAssignment[]>;
  getCampaignTasks(campaignId: string): Promise<Task[]>;
  assignTaskToCampaign(
    taskId: string,
    campaignId: string,
    tenantId: string
  ): Promise<TaskAssignment>;
  unassignTaskFromCampaign(taskId: string, campaignId: string, tenantId: string): Promise<void>;

  // Task Completion operations
  getTaskCompletion(id: string): Promise<TaskCompletion | undefined>;
  getTaskCompletionByUserAndTask(
    userId: string,
    taskId: string,
    campaignId?: string | null
  ): Promise<TaskCompletion | undefined>;
  getUserTaskCompletions(userId: string, tenantId?: string): Promise<any[]>;
  getTaskCompletions(taskId: string): Promise<TaskCompletion[]>;
  getTaskCompletionsByProgram(programId: string): Promise<TaskCompletion[]>;
  createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion>;
  updateTaskCompletion(
    id: string,
    updates: Partial<InsertTaskCompletion>
  ): Promise<TaskCompletion | undefined>;

  // Reward Distribution operations
  getUserRewardDistributions(userId: string, tenantId?: string): Promise<RewardDistribution[]>;
  createRewardDistribution(distribution: InsertRewardDistribution): Promise<RewardDistribution>;

  // Campaign Publishing operations
  publishCampaign(campaignId: string, tenantId: string): Promise<Campaign | undefined>;
  getPendingCampaigns(creatorId: string, tenantId?: string): Promise<Campaign[]>;

  // Creator Facebook Pages
  upsertCreatorFacebookPages(
    creatorId: string,
    pages: Array<{
      pageId: string;
      name: string;
      accessToken: string;
      followersCount?: number;
      fanCount?: number;
      instagramBusinessAccountId?: string;
      connectedInstagramAccountId?: string;
    }>
  ): Promise<number>;
  getCreatorFacebookPages(creatorId: string): Promise<any[]>;

  // Social OAuth token storage
  saveSocialTokenBundle(userId: string, platform: string, tokenBundle: any): Promise<void>;
  getSocialTokenBundle(userId: string, platform: string): Promise<any | undefined>;

  // Audit Log operations
  createAuditLog(log: any): Promise<any>;
  getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  getAuditLogById(id: string): Promise<any | undefined>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUsersByFacebookId(facebookId: string): Promise<User[]> {
    // Query users where profileData contains Facebook data with the given ID
    // This uses PostgreSQL JSON operators to search within the profileData field
    const usersWithFacebookId = await db
      .select()
      .from(users)
      .where(
        sql`${users.profileData}->>'facebookData' IS NOT NULL AND ${users.profileData}->'facebookData'->>'id' = ${facebookId}`
      )
      .orderBy(desc(users.createdAt));

    return usersWithFacebookId || [];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserType(userId: string, userType: 'fan' | 'creator'): Promise<User | undefined> {
    try {
      const role = userType === 'creator' ? 'customer_admin' : 'customer_end_user';

      // Reset onboarding state when switching user types
      // This ensures users go through the appropriate onboarding for their new type
      const resetOnboardingState = {
        currentStep: 0,
        totalSteps: userType === 'creator' ? 3 : 2,
        completedSteps: [],
        isCompleted: false,
        lastOnboardingRoute: undefined,
      };

      const [updatedUser] = await db
        .update(users)
        .set({
          userType,
          role,
          onboardingState: resetOnboardingState,
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user type:', error);
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
      console.error('Error updating onboarding state:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser as any)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates as any)
      .where(eq(users.id, id))
      .returning();
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
    const [creator] = await db
      .insert(creators)
      .values(insertCreator as any)
      .returning();
    return creator;
  }

  async updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator> {
    const [updatedCreator] = await db
      .update(creators)
      .set(updates as any)
      .where(eq(creators.id, id))
      .returning();

    // Auto-check verification status after update
    if (updatedCreator) {
      try {
        const { calculateCreatorVerification } = await import('@shared/creatorVerificationSchema');
        const creatorType = updatedCreator.category as 'athlete' | 'musician' | 'content_creator';

        // Query platform activity for verification requirements
        const [programResult, taskResult] = await Promise.all([
          db
            .select({ total: count() })
            .from(loyaltyPrograms)
            .where(and(eq(loyaltyPrograms.creatorId, id), eq(loyaltyPrograms.isActive, true))),
          db
            .select({ total: count() })
            .from(tasks)
            .where(and(eq(tasks.creatorId, id), eq(tasks.ownershipLevel, 'creator'))),
        ]);
        const platformActivity = {
          activeProgramCount: Number(programResult[0]?.total) || 0,
          publishedTaskCount: Number(taskResult[0]?.total) || 0,
        };

        const verificationData = calculateCreatorVerification(
          updatedCreator,
          creatorType,
          platformActivity
        );

        // Auto-verify if profile is complete
        const shouldVerify = verificationData.profileComplete && !updatedCreator.isVerified;
        const shouldUnverify = !verificationData.profileComplete && updatedCreator.isVerified;

        if (
          shouldVerify ||
          shouldUnverify ||
          JSON.stringify(verificationData) !== JSON.stringify(updatedCreator.verificationData)
        ) {
          const [finalCreator] = await db
            .update(creators)
            .set({
              isVerified: shouldVerify ? true : shouldUnverify ? false : updatedCreator.isVerified,
              verificationData: verificationData as any,
            })
            .where(eq(creators.id, id))
            .returning();

          if (shouldVerify) {
            console.log(`✅ Auto-verified creator: ${updatedCreator.displayName} (${id})`);
          } else if (shouldUnverify) {
            console.log(
              `⚠️  Removed verification from creator: ${updatedCreator.displayName} (${id})`
            );
          }

          return finalCreator;
        }
      } catch (verificationError) {
        console.error(`⚠️  Auto-verification check failed for creator ${id}:`, verificationError);
        // Continue without verification check - don't fail the update
      }
    }

    return updatedCreator;
  }

  async getAllCreators(): Promise<Creator[]> {
    // Get all creators without ordering first (will be sorted in API layer)
    const allCreators = await db.select().from(creators);
    console.log(`📊 getAllCreators() found ${allCreators.length} creators`);
    return allCreators;
  }

  // Loyalty program operations
  async getLoyaltyProgram(id: string): Promise<LoyaltyProgram | undefined> {
    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, id));
    return program || undefined;
  }

  async getLoyaltyProgramsByCreator(creatorId: string): Promise<LoyaltyProgram[]> {
    // First, try to find programs by creator_id directly
    let programs = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.creatorId, creatorId));

    // If no programs found, the creatorId might be a user_id - look up the creator and try again
    if (programs.length === 0) {
      const [creator] = await db.select().from(creators).where(eq(creators.userId, creatorId));
      if (creator) {
        programs = await db
          .select()
          .from(loyaltyPrograms)
          .where(eq(loyaltyPrograms.creatorId, creator.id));
      }
    }

    return programs;
  }

  async createLoyaltyProgram(insertProgram: InsertLoyaltyProgram): Promise<LoyaltyProgram> {
    const [program] = await db
      .insert(loyaltyPrograms)
      .values(insertProgram as any)
      .returning();
    return program;
  }

  async updateLoyaltyProgram(
    id: string,
    updates: Partial<InsertLoyaltyProgram>
  ): Promise<LoyaltyProgram> {
    const [program] = await db
      .update(loyaltyPrograms)
      .set(updates as any)
      .where(eq(loyaltyPrograms.id, id))
      .returning();
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
    const [reward] = await db
      .insert(rewards)
      .values(insertReward as any)
      .returning();
    return reward;
  }

  async updateReward(id: string, updates: Partial<InsertReward>): Promise<Reward> {
    const [reward] = await db
      .update(rewards)
      .set(updates as any)
      .where(eq(rewards.id, id))
      .returning();
    return reward;
  }

  async deleteReward(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(rewards)
      .set({ isActive: false } as any)
      .where(eq(rewards.id, id));
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
      const [reward] = await tx
        .select()
        .from(rewards)
        .where(and(eq(rewards.id, data.rewardId), eq(rewards.isActive, true)));

      if (!reward) {
        throw new Error('Reward not found or inactive');
      }

      // Calculate cost server-side - NEVER trust client
      const totalCost = reward.pointsCost * data.entries;

      // Get fresh membership data with row lock and validate ownership
      const [membership] = await tx
        .select()
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.id, data.membershipId),
            eq(tenantMemberships.userId, data.userId), // IDOR prevention
            eq(tenantMemberships.tenantId, reward.tenantId) // Tenant scoping
          )
        );

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
      const membershipUpdateResult = await tx
        .update(tenantMemberships)
        .set({
          memberData: {
            ...membership.memberData,
            points: (membership.memberData?.points || 0) - totalCost,
          },
        } as any)
        .where(
          and(
            eq(tenantMemberships.id, data.membershipId),
            // Conditional update - only succeed if sufficient points
            sql`(${tenantMemberships.memberData}->>'points')::int >= ${totalCost}`
          )
        )
        .returning();

      if (membershipUpdateResult.length === 0) {
        throw new Error('Insufficient points');
      }

      // 2. Update reward stock with conditional check
      const rewardUpdateResult = await tx
        .update(rewards)
        .set({
          currentRedemptions: sql`${rewards.currentRedemptions} + ${data.entries}`,
        } as any)
        .where(
          and(
            eq(rewards.id, data.rewardId),
            // Conditional update - only succeed if stock available
            reward.maxRedemptions
              ? sql`${rewards.currentRedemptions} + ${data.entries} <= ${reward.maxRedemptions}`
              : sql`true`
          )
        )
        .returning();

      if (rewardUpdateResult.length === 0) {
        throw new Error('Reward no longer available');
      }

      // 3. Find or create fan program within transaction
      let fanProgram = await tx
        .select()
        .from(fanPrograms)
        .where(and(eq(fanPrograms.fanId, data.userId), eq(fanPrograms.programId, reward.programId)))
        .then((rows) => rows[0]);

      if (!fanProgram) {
        const [newFanProgram] = await tx
          .insert(fanPrograms)
          .values({
            tenantId: reward.tenantId,
            fanId: data.userId,
            programId: reward.programId,
            currentPoints: 0,
            totalPointsEarned: 0,
          } as any)
          .returning();
        fanProgram = newFanProgram;
      }

      // 4. Create audit trail - reward redemption record
      const [rewardRedemption] = await tx
        .insert(rewardRedemptions)
        .values({
          rewardId: reward.id,
          fanId: data.userId,
          pointsSpent: totalCost,
          quantity: data.entries,
          status: 'completed',
          redeemedAt: new Date(),
        } as any)
        .returning();

      // 5. Create point transaction for audit trail
      const [pointTransaction] = await tx
        .insert(pointTransactions)
        .values({
          tenantId: reward.tenantId,
          fanProgramId: fanProgram.id,
          points: -totalCost,
          type: 'spent',
          source: 'reward_redemption',
          metadata: {
            rewardId: reward.id,
            redemptionId: rewardRedemption.id,
          },
        } as any)
        .returning();

      return {
        updatedMembership: membershipUpdateResult[0],
        updatedReward: rewardUpdateResult[0],
        fanProgram,
        pointTransaction,
        rewardRedemption,
      };
    });
  }

  // Fan program operations
  async getFanProgram(fanId: string, programId: string): Promise<FanProgram | undefined> {
    const [fanProgram] = await db
      .select()
      .from(fanPrograms)
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
    const [fanProgram] = await db
      .update(fanPrograms)
      .set(updates)
      .where(eq(fanPrograms.id, id))
      .returning();
    return fanProgram;
  }

  // Point transaction operations
  async createPointTransaction(
    insertTransaction: InsertPointTransaction
  ): Promise<PointTransaction> {
    const [transaction] = await db
      .insert(pointTransactions)
      .values(insertTransaction as any)
      .returning();
    return transaction;
  }

  async getPointTransactionsByFanProgram(fanProgramId: string): Promise<PointTransaction[]> {
    return await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.fanProgramId, fanProgramId))
      .orderBy(desc(pointTransactions.createdAt));
  }

  // Reward redemption operations
  async createRewardRedemption(
    insertRedemption: InsertRewardRedemption
  ): Promise<RewardRedemption> {
    const [redemption] = await db
      .insert(rewardRedemptions)
      .values(insertRedemption as any)
      .returning();
    return redemption;
  }

  async getRewardRedemptionsByUser(fanId: string): Promise<RewardRedemption[]> {
    return await db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.fanId, fanId))
      .orderBy(desc(rewardRedemptions.redeemedAt));
  }

  async getRewardRedemptionsByProgram(programId: string): Promise<RewardRedemption[]> {
    const rows = await db
      .select({ redemption: rewardRedemptions })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
      .where(eq(rewards.programId, programId))
      .orderBy(desc(rewardRedemptions.redeemedAt));
    return rows.map((r) => r.redemption);
  }

  async updateRewardRedemption(
    id: string,
    updates: Partial<InsertRewardRedemption>
  ): Promise<RewardRedemption> {
    const [redemption] = await db
      .update(rewardRedemptions)
      .set(updates as any)
      .where(eq(rewardRedemptions.id, id))
      .returning();
    return redemption;
  }

  // Tenant operations
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
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
    const [tenant] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.ownerId, userId));
  }

  // Tenant Membership operations
  async createTenantMembership(data: InsertTenantMembership): Promise<TenantMembership> {
    const [membership] = await db
      .insert(tenantMemberships)
      .values({
        ...data,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      } as any)
      .returning();
    return membership;
  }

  async getTenantMembers(tenantId: string): Promise<TenantMembership[]> {
    return await db
      .select()
      .from(tenantMemberships)
      .where(eq(tenantMemberships.tenantId, tenantId));
  }

  async getUserMemberships(userId: string): Promise<TenantMembership[]> {
    return await db.select().from(tenantMemberships).where(eq(tenantMemberships.userId, userId));
  }

  async getUserTenantMembership(
    userId: string,
    tenantId: string
  ): Promise<TenantMembership | undefined> {
    const [membership] = await db
      .select()
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.tenantId, tenantId)));
    return membership || undefined;
  }

  async updateUserTenantMembership(
    userId: string,
    tenantId: string,
    updates: Partial<InsertTenantMembership>
  ): Promise<TenantMembership> {
    const [membership] = await db
      .update(tenantMemberships)
      .set(updates as any)
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.tenantId, tenantId)))
      .returning();
    return membership;
  }

  async updateTenantMembership(
    id: string,
    updates: Partial<InsertTenantMembership>
  ): Promise<TenantMembership> {
    const [membership] = await db
      .update(tenantMemberships)
      .set(updates as any)
      .where(eq(tenantMemberships.id, id))
      .returning();
    return membership;
  }

  // Campaign operations
  async getCampaign(id: string, tenantId?: string): Promise<Campaign | undefined> {
    const conditions = tenantId
      ? and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId))
      : eq(campaigns.id, id);
    const [campaign] = await db.select().from(campaigns).where(conditions);
    return campaign;
  }

  async getCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId
      ? and(eq(campaigns.creatorId, creatorId), eq(campaigns.tenantId, tenantId))
      : eq(campaigns.creatorId, creatorId);
    return await db.select().from(campaigns).where(conditions);
  }

  async getActiveCampaignsByCreator(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId
      ? and(
          eq(campaigns.creatorId, creatorId),
          eq(campaigns.status, 'active'),
          eq(campaigns.tenantId, tenantId)
        )
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
    const [row] = await db
      .insert(campaigns)
      .values(data as any)
      .returning();
    return row;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign> {
    const [row] = await db
      .update(campaigns)
      .set(data as any)
      .where(eq(campaigns.id, id))
      .returning();
    return row;
  }

  async getCampaignRules(campaignId: string): Promise<CampaignRule[]> {
    return await db.select().from(campaignRules).where(eq(campaignRules.campaignId, campaignId));
  }

  async createCampaignRule(data: InsertCampaignRule): Promise<CampaignRule> {
    const [row] = await db
      .insert(campaignRules)
      .values(data as any)
      .returning();
    return row;
  }

  // socialCampaignTasks CRUD removed — table dropped in migration 0043

  // Creator Facebook Pages - Optimized batch upsert (fixes N+1 query)
  async upsertCreatorFacebookPages(
    creatorId: string,
    pages: Array<{
      pageId: string;
      name: string;
      accessToken: string;
      followersCount?: number;
      fanCount?: number;
      instagramBusinessAccountId?: string;
      connectedInstagramAccountId?: string;
    }>
  ): Promise<number> {
    if (pages.length === 0) return 0;

    const now = new Date();

    // Batch upsert using ON CONFLICT DO UPDATE
    // This is a single query instead of 2*N queries
    const values = pages.map((p) => ({
      creatorId,
      pageId: p.pageId,
      name: p.name,
      accessToken: p.accessToken,
      followersCount: p.followersCount || 0,
      fanCount: p.fanCount || 0,
      instagramBusinessAccountId: p.instagramBusinessAccountId || null,
      connectedInstagramAccountId: p.connectedInstagramAccountId || null,
      createdAt: now,
      updatedAt: now,
    }));

    // Use raw SQL for proper ON CONFLICT handling with Drizzle
    await db.execute(sql`
      INSERT INTO creator_facebook_pages (creator_id, page_id, name, access_token, followers_count, fan_count, instagram_business_account_id, connected_instagram_account_id, created_at, updated_at)
      VALUES ${sql.join(
        values.map(
          (v) =>
            sql`(${v.creatorId}, ${v.pageId}, ${v.name}, ${v.accessToken}, ${v.followersCount}, ${v.fanCount}, ${v.instagramBusinessAccountId}, ${v.connectedInstagramAccountId}, ${v.createdAt}, ${v.updatedAt})`
        ),
        sql`, `
      )}
      ON CONFLICT (creator_id, page_id) DO UPDATE SET
        name = EXCLUDED.name,
        access_token = EXCLUDED.access_token,
        followers_count = EXCLUDED.followers_count,
        fan_count = EXCLUDED.fan_count,
        instagram_business_account_id = EXCLUDED.instagram_business_account_id,
        connected_instagram_account_id = EXCLUDED.connected_instagram_account_id,
        updated_at = EXCLUDED.updated_at
    `);

    return pages.length;
  }

  async getCreatorFacebookPages(creatorId: string): Promise<any[]> {
    return await db
      .select()
      .from(creatorFacebookPages)
      .where(eq(creatorFacebookPages.creatorId, creatorId));
  }

  // Campaign Participation operations
  async createCampaignParticipation(data: any): Promise<any> {
    const [participation] = await db.insert(campaignParticipations).values(data).returning();
    return participation;
  }

  async getCampaignParticipation(campaignId: string, memberId: string): Promise<any> {
    const [participation] = await db
      .select()
      .from(campaignParticipations)
      .where(
        and(
          eq(campaignParticipations.campaignId, campaignId),
          eq(campaignParticipations.memberId, memberId)
        )
      );
    return participation || undefined;
  }

  async updateCampaignParticipation(id: string, data: any): Promise<any> {
    const [participation] = await db
      .update(campaignParticipations)
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

  async getTasksByTenantId(tenantId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string, tenantId?: string): Promise<Task | undefined> {
    const conditions = tenantId
      ? and(eq(tasks.id, id), eq(tasks.tenantId, tenantId))
      : eq(tasks.id, id);
    const [task] = await db.select().from(tasks).where(conditions);
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const taskData = {
      ...task,
      hashtags: task.hashtags ? Array.from(task.hashtags as string[]) : null,
    };
    const [newTask] = await db
      .insert(tasks)
      .values(taskData as any)
      .returning();
    return newTask;
  }

  async updateTask(
    id: string,
    updates: Partial<InsertTask>,
    tenantId?: string
  ): Promise<Task | undefined> {
    const updateData = {
      ...updates,
      hashtags: updates.hashtags ? Array.from(updates.hashtags as string[]) : updates.hashtags,
      updatedAt: new Date(),
    };

    const conditions = tenantId
      ? and(eq(tasks.id, id), eq(tasks.tenantId, tenantId))
      : eq(tasks.id, id);

    const [task] = await db
      .update(tasks)
      .set(updateData as any)
      .where(conditions)
      .returning();
    return task;
  }

  async deleteTask(id: string, tenantId?: string): Promise<void> {
    const conditions = tenantId
      ? and(eq(tasks.id, id), eq(tasks.tenantId, tenantId))
      : eq(tasks.id, id);
    await db.delete(tasks).where(conditions);
  }

  // Task Template operations
  async getTaskTemplates(tenantId?: string): Promise<TaskTemplate[]> {
    // Get both global templates and tenant-specific templates
    const conditions = tenantId
      ? sql`${taskTemplates.isGlobal} = true OR ${taskTemplates.tenantId} = ${tenantId}`
      : sql`${taskTemplates.isGlobal} = true`;

    return await db
      .select()
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

  async updateTaskTemplate(
    id: string,
    updates: Partial<InsertTaskTemplate>,
    tenantId?: string
  ): Promise<TaskTemplate | undefined> {
    // Only allow updates to templates the user owns (global templates if admin, tenant templates if tenant admin)
    const conditions = tenantId
      ? and(eq(taskTemplates.id, id), eq(taskTemplates.tenantId, tenantId))
      : and(eq(taskTemplates.id, id), eq(taskTemplates.isGlobal, true));

    const [template] = await db
      .update(taskTemplates)
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
    return await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.campaignId, campaignId))
      .orderBy(taskAssignments.displayOrder);
  }

  async getCampaignTasks(campaignId: string): Promise<Task[]> {
    const result = await db
      .select({
        task: tasks,
        assignment: taskAssignments,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(and(eq(taskAssignments.campaignId, campaignId), eq(taskAssignments.isActive, true)))
      .orderBy(taskAssignments.displayOrder);

    return result.map((r) => r.task);
  }

  async assignTaskToCampaign(
    taskId: string,
    campaignId: string,
    tenantId: string
  ): Promise<TaskAssignment> {
    const [assignment] = await db
      .insert(taskAssignments)
      .values({
        taskId,
        campaignId,
        tenantId,
        displayOrder: 1,
        isActive: true,
      })
      .returning();
    return assignment;
  }

  async unassignTaskFromCampaign(
    taskId: string,
    campaignId: string,
    tenantId: string
  ): Promise<void> {
    await db
      .delete(taskAssignments)
      .where(
        and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.campaignId, campaignId),
          eq(taskAssignments.tenantId, tenantId)
        )
      );
  }

  // Task Completion operations
  async getTaskCompletion(id: string): Promise<TaskCompletion | undefined> {
    const [completion] = await db.select().from(taskCompletions).where(eq(taskCompletions.id, id));
    return completion;
  }

  /**
   * Get task completion by user and task, optionally scoped by campaign context.
   *
   * @param userId - The user's ID
   * @param taskId - The task's ID
   * @param campaignId - Optional campaign ID. If provided, looks for campaign-context completions.
   *                     If not provided, looks for standalone-context completions (or null for backwards compatibility).
   *
   * This enables the campaign override model where:
   * - Standalone completion: completionContext = 'standalone', campaignId = null
   * - Campaign completion: completionContext = 'campaign', campaignId = <specific campaign>
   * - Each context is independently deduped
   */
  async getTaskCompletionByUserAndTask(
    userId: string,
    taskId: string,
    campaignId?: string | null
  ): Promise<TaskCompletion | undefined> {
    const baseConditions = [eq(taskCompletions.userId, userId), eq(taskCompletions.taskId, taskId)];

    let contextCondition;
    if (campaignId) {
      // Looking for a completion within a specific campaign
      contextCondition = and(
        eq(taskCompletions.campaignId, campaignId),
        eq(taskCompletions.completionContext, 'campaign')
      );
    } else {
      // Looking for a standalone completion (or legacy rows with null context)
      contextCondition = or(
        isNull(taskCompletions.completionContext),
        eq(taskCompletions.completionContext, 'standalone')
      );
    }

    const [completion] = await db
      .select()
      .from(taskCompletions)
      .where(and(...baseConditions, contextCondition))
      .limit(1);
    return completion;
  }

  async getUserTaskCompletions(userId: string, tenantId?: string): Promise<any[]> {
    const conditions = tenantId
      ? and(eq(taskCompletions.userId, userId), eq(taskCompletions.tenantId, tenantId))
      : eq(taskCompletions.userId, userId);

    const completions = await db
      .select()
      .from(taskCompletions)
      .where(conditions)
      .orderBy(desc(taskCompletions.lastActivityAt));

    // Import frequency service
    const { taskFrequencyService } = await import('../services/task-frequency-service');
    const { inArray } = await import('drizzle-orm');

    // ✅ OPTIMIZATION: Batch fetch all tasks first to avoid N+1 query
    const taskIds = [...new Set(completions.map((c) => c.taskId))];
    let tasksMap = new Map();

    if (taskIds.length > 0) {
      const tasksData = await db.query.tasks.findMany({
        where: inArray(tasks.id, taskIds),
      });
      tasksMap = new Map(tasksData.map((t) => [t.id, t]));
    }

    // Enrich completions with eligibility using cached task data
    const enrichedCompletions = await Promise.all(
      completions.map(async (completion) => {
        if (completion.status !== 'completed') {
          return { ...completion, isAvailableAgain: false };
        }

        // ✅ Get task from cache instead of individual query
        const task = tasksMap.get(completion.taskId);
        if (!task) {
          return { ...completion, isAvailableAgain: false };
        }

        // Only check eligibility if repeatable frequency
        if (['daily', 'weekly', 'monthly'].includes(task.rewardFrequency || '')) {
          const eligibility = await taskFrequencyService.checkEligibility({
            userId,
            taskId: completion.taskId,
            tenantId: completion.tenantId,
          });

          return {
            ...completion,
            isAvailableAgain: eligibility.isEligible,
            nextAvailableAt: eligibility.nextAvailableAt,
            timeRemaining: eligibility.isEligible
              ? null
              : await taskFrequencyService.getTimeUntilAvailable({
                  userId,
                  taskId: completion.taskId,
                  tenantId: completion.tenantId,
                }),
          };
        }

        return { ...completion, isAvailableAgain: false };
      })
    );

    return enrichedCompletions;
  }

  async getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
    return await db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.taskId, taskId))
      .orderBy(desc(taskCompletions.startedAt));
  }

  async getTaskCompletionsByProgram(programId: string): Promise<TaskCompletion[]> {
    console.log(`[Storage] Getting task completions for program ${programId}`);

    // First check what tasks exist for this program
    const programTasks = await db
      .select({ id: tasks.id, name: tasks.name, programId: tasks.programId })
      .from(tasks)
      .where(eq(tasks.programId, programId));
    console.log(
      `[Storage] Found ${programTasks.length} tasks for program ${programId}:`,
      programTasks
    );

    const rows = await db
      .select({ task_completions: taskCompletions, task: tasks })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(tasks.programId, programId))
      .orderBy(desc(taskCompletions.completedAt));

    console.log(
      `[Storage] Found ${rows.length} completions for program ${programId}:`,
      rows.map((r) => ({
        completionId: r.task_completions.id,
        status: r.task_completions.status,
        taskId: r.task_completions.taskId,
        taskProgramId: r.task?.programId,
      }))
    );

    return rows.map((r) => r.task_completions) as TaskCompletion[];
  }

  async createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion> {
    const [newCompletion] = await db
      .insert(taskCompletions)
      .values({
        ...completion,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newCompletion;
  }

  async updateTaskCompletion(
    id: string,
    updates: Partial<InsertTaskCompletion>
  ): Promise<TaskCompletion | undefined> {
    const [updated] = await db
      .update(taskCompletions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(taskCompletions.id, id))
      .returning();
    return updated;
  }

  // Reward Distribution operations
  async getUserRewardDistributions(
    userId: string,
    tenantId?: string
  ): Promise<RewardDistribution[]> {
    const conditions = tenantId
      ? and(eq(rewardDistributions.userId, userId), eq(rewardDistributions.tenantId, tenantId))
      : eq(rewardDistributions.userId, userId);
    return await db
      .select()
      .from(rewardDistributions)
      .where(conditions)
      .orderBy(desc(rewardDistributions.createdAt));
  }

  async createRewardDistribution(
    distribution: InsertRewardDistribution
  ): Promise<RewardDistribution> {
    const [newDistribution] = await db
      .insert(rewardDistributions)
      .values({
        ...distribution,
        createdAt: new Date(),
      })
      .returning();
    return newDistribution;
  }

  // Campaign Publishing operations
  async publishCampaign(campaignId: string, tenantId: string): Promise<Campaign | undefined> {
    // Check if campaign has >1 tasks assigned
    const assignedTasks = await this.getTaskAssignments(campaignId);
    if (assignedTasks.length < 1) {
      throw new Error('Campaign must have at least 1 task assigned before publishing');
    }

    const [campaign] = await db
      .update(campaigns)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .returning();
    return campaign;
  }

  async getPendingCampaigns(creatorId: string, tenantId?: string): Promise<Campaign[]> {
    const conditions = tenantId
      ? and(
          eq(campaigns.creatorId, creatorId),
          eq(campaigns.status, 'pending_tasks'),
          eq(campaigns.tenantId, tenantId)
        )
      : and(eq(campaigns.creatorId, creatorId), eq(campaigns.status, 'pending_tasks'));
    return await db.select().from(campaigns).where(conditions).orderBy(desc(campaigns.createdAt));
  }

  // Social Account Management
  async saveSocialAccount(userId: string, platform: string, accountData: any): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User not found for ID: ${userId}`);
      }

      // Create or update social account connection
      const socialAccountData = {
        userId: user.id,
        platform,
        platformUserId: accountData.user?.id || accountData.id,
        username: accountData.user?.username || accountData.username,
        displayName: accountData.user?.name || accountData.name || accountData.displayName,
        profileUrl:
          accountData.user?.profileUrl || `https://twitter.com/${accountData.user?.username}`,
        followers: accountData.user?.followersCount || accountData.followersCount || 0,
        metadata: JSON.stringify(accountData),
        connectedAt: new Date(),
        isActive: true,
      };

      console.log(`[Storage] Saving social account for user ${user.id}:`, {
        platform,
        username: socialAccountData.username,
      });
      // Persist under users.profileData.socialConnections
      const profileData: any = (user as any).profileData || {};
      const socialConnections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];
      const filtered = socialConnections.filter((acc: any) => acc.platform !== platform);
      const updatedConnections = [
        ...filtered,
        {
          platform: socialAccountData.platform,
          platformUserId: socialAccountData.platformUserId,
          username: socialAccountData.username,
          displayName: socialAccountData.displayName,
          profileUrl: socialAccountData.profileUrl,
          followers: socialAccountData.followers,
          metadata: socialAccountData.metadata,
          connectedAt: socialAccountData.connectedAt,
          isActive: socialAccountData.isActive,
        },
      ];
      const nextProfileData = { ...profileData, socialConnections: updatedConnections };
      await this.updateUser(user.id, { profileData: nextProfileData } as any);
      console.log(`[Storage] Social account saved successfully:`, socialAccountData);
    } catch (error) {
      console.error(`[Storage] Failed to save social account:`, error);
      throw error;
    }
  }

  async getSocialAccounts(userId: string): Promise<any[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return [];
      }

      const profileData: any = (user as any).profileData || {};
      const connections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];
      console.log(
        `[Storage] Getting social accounts for user ${user.id} -> ${connections.length} found`
      );
      return connections;
    } catch (error) {
      console.error(`[Storage] Failed to get social accounts:`, error);
      return [];
    }
  }

  async removeSocialAccount(userId: string, platform: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        console.log(`[Storage] User not found for userId: ${userId}`);
        return false;
      }

      const profileData: any = (user as any).profileData || {};
      const connections = Array.isArray(profileData.socialConnections)
        ? profileData.socialConnections
        : [];

      // Remove the connection for this platform
      const updatedConnections = connections.filter((conn: any) => conn.platform !== platform);

      console.log(
        `[Storage] Removing ${platform} connection for user ${user.id}. Before: ${connections.length}, After: ${updatedConnections.length}`
      );

      // Update user with new connections
      const updatedProfileData = {
        ...profileData,
        socialConnections: updatedConnections,
      };

      await this.updateUser(user.id, { profileData: updatedProfileData } as any);

      console.log(`[Storage] Successfully removed ${platform} connection for user ${user.id}`);
      return true;
    } catch (error) {
      console.error(`[Storage] Failed to remove social account:`, error);
      return false;
    }
  }

  async saveSocialTokenBundle(userId: string, platform: string, tokenBundle: any): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User not found for ID: ${userId}`);
      }

      const profileData: any = (user as any).profileData || {};
      const socialTokens =
        profileData.socialTokens && typeof profileData.socialTokens === 'object'
          ? profileData.socialTokens
          : {};

      // Encrypt sensitive tokens before storage
      const secureTokenBundle = {
        ...tokenBundle,
        refresh_token: tokenBundle.refresh_token
          ? encryptToken(tokenBundle.refresh_token)
          : tokenBundle.refresh_token,
        // Keep access_token unencrypted for easier debugging (it's short-lived)
      };

      socialTokens[platform] = secureTokenBundle;

      const nextProfileData = { ...profileData, socialTokens };
      await this.updateUser(user.id, { profileData: nextProfileData } as any);
      console.log(
        `[Storage] Saved ${platform} token bundle for user ${user.id} (refresh_token encrypted)`
      );
    } catch (error) {
      console.error(`[Storage] Failed to save ${platform} token bundle:`, error);
      throw error;
    }
  }

  async getSocialTokenBundle(userId: string, platform: string): Promise<any | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      const profileData: any = (user as any).profileData || {};
      const socialTokens =
        profileData.socialTokens && typeof profileData.socialTokens === 'object'
          ? profileData.socialTokens
          : {};

      const tokenBundle = socialTokens[platform];
      if (!tokenBundle) return undefined;

      // Decrypt sensitive tokens when retrieving
      return {
        ...tokenBundle,
        refresh_token: tokenBundle.refresh_token
          ? decryptToken(tokenBundle.refresh_token)
          : tokenBundle.refresh_token,
      };
    } catch (error) {
      console.error(`[Storage] Failed to get ${platform} token bundle:`, error);
      return undefined;
    }
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(log).returning();
    return newLog;
  }

  async getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const conditions: any[] = [];

    if (filters?.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    if (filters?.resource) {
      conditions.push(eq(auditLog.resource, filters.resource as any));
    }
    if (filters?.action) {
      conditions.push(eq(auditLog.action, filters.action as any));
    }
    if (filters?.tenantId) {
      conditions.push(eq(auditLog.tenantId, filters.tenantId));
    }
    if (filters?.startDate) {
      conditions.push(sql`${auditLog.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${auditLog.createdAt} <= ${filters.endDate}`);
    }

    let query = db.select().from(auditLog);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(auditLog.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    const [log] = await db.select().from(auditLog).where(eq(auditLog.id, id));
    return log || undefined;
  }

  async getSocialCampaignTasks(_campaignId: string): Promise<any[]> {
    return [];
  }

  async createSocialCampaignTask(_data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateSocialCampaignTask(_id: string, _data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async deleteSocialCampaignTask(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }
}

export const storage = new DatabaseStorage();
