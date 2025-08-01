import { 
  users, creators, loyaltyPrograms, rewards, fanPrograms, 
  pointTransactions, rewardRedemptions,
  type User, type InsertUser, type Creator, type InsertCreator,
  type LoyaltyProgram, type InsertLoyaltyProgram,
  type Reward, type InsertReward, type FanProgram, type InsertFanProgram,
  type PointTransaction, type InsertPointTransaction,
  type RewardRedemption, type InsertRewardRedemption
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDynamicId(dynamicUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Creator operations
  getCreator(id: string): Promise<Creator | undefined>;
  getCreatorByUserId(userId: string): Promise<Creator | undefined>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator>;
  getAllCreators(): Promise<Creator[]>;

  // Loyalty program operations
  getLoyaltyProgram(id: string): Promise<LoyaltyProgram | undefined>;
  getLoyaltyProgramsByCreator(creatorId: string): Promise<LoyaltyProgram[]>;
  createLoyaltyProgram(program: InsertLoyaltyProgram): Promise<LoyaltyProgram>;
  updateLoyaltyProgram(id: string, updates: Partial<InsertLoyaltyProgram>): Promise<LoyaltyProgram>;

  // Reward operations
  getReward(id: string): Promise<Reward | undefined>;
  getRewardsByProgram(programId: string): Promise<Reward[]>;
  getAllRewards(): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: string, updates: Partial<InsertReward>): Promise<Reward>;

  // Fan program operations
  getFanProgram(fanId: string, programId: string): Promise<FanProgram | undefined>;
  getFanProgramsByUser(fanId: string): Promise<FanProgram[]>;
  createFanProgram(fanProgram: InsertFanProgram): Promise<FanProgram>;
  updateFanProgram(id: string, updates: Partial<InsertFanProgram>): Promise<FanProgram>;

  // Point transaction operations
  createPointTransaction(transaction: InsertPointTransaction): Promise<PointTransaction>;
  getPointTransactionsByFanProgram(fanProgramId: string): Promise<PointTransaction[]>;

  // Reward redemption operations
  createRewardRedemption(redemption: InsertRewardRedemption): Promise<RewardRedemption>;
  getRewardRedemptionsByUser(fanId: string): Promise<RewardRedemption[]>;
  updateRewardRedemption(id: string, updates: Partial<InsertRewardRedemption>): Promise<RewardRedemption>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
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
    const [creator] = await db.insert(creators).values(insertCreator).returning();
    return creator;
  }

  async updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator> {
    const [creator] = await db.update(creators).set(updates).where(eq(creators.id, id)).returning();
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
    const [program] = await db.insert(loyaltyPrograms).values(insertProgram).returning();
    return program;
  }

  async updateLoyaltyProgram(id: string, updates: Partial<InsertLoyaltyProgram>): Promise<LoyaltyProgram> {
    const [program] = await db.update(loyaltyPrograms).set(updates).where(eq(loyaltyPrograms.id, id)).returning();
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
    const [reward] = await db.insert(rewards).values(insertReward).returning();
    return reward;
  }

  async updateReward(id: string, updates: Partial<InsertReward>): Promise<Reward> {
    const [reward] = await db.update(rewards).set(updates).where(eq(rewards.id, id)).returning();
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
    const [transaction] = await db.insert(pointTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async getPointTransactionsByFanProgram(fanProgramId: string): Promise<PointTransaction[]> {
    return await db.select().from(pointTransactions)
      .where(eq(pointTransactions.fanProgramId, fanProgramId))
      .orderBy(desc(pointTransactions.createdAt));
  }

  // Reward redemption operations
  async createRewardRedemption(insertRedemption: InsertRewardRedemption): Promise<RewardRedemption> {
    const [redemption] = await db.insert(rewardRedemptions).values(insertRedemption).returning();
    return redemption;
  }

  async getRewardRedemptionsByUser(fanId: string): Promise<RewardRedemption[]> {
    return await db.select().from(rewardRedemptions)
      .where(eq(rewardRedemptions.fanId, fanId))
      .orderBy(desc(rewardRedemptions.redeemedAt));
  }

  async updateRewardRedemption(id: string, updates: Partial<InsertRewardRedemption>): Promise<RewardRedemption> {
    const [redemption] = await db.update(rewardRedemptions).set(updates)
      .where(eq(rewardRedemptions.id, id)).returning();
    return redemption;
  }
}

export const storage = new DatabaseStorage();
