/**
 * Fandomly Points Service
 * 
 * Manages two types of points:
 * 1. Fandomly Points - Platform currency (redeemable for Fandomly admin rewards)
 * 2. Creator Points - Per-creator currency (redeemable for creator-specific rewards)
 */

import { db } from '../../db';
import { pointTransactions, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface PointsBalance {
  userId: string;
  fandomlyPoints: number;
  creatorPoints: Record<string, number>; // { creatorId: points }
}

export interface PointTransaction {
  id: string;
  userId: string;
  tenantId?: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  source: string;
  description?: string;
  metadata?: any;
  createdAt: Date;
}

// ============================================================================
// FANDOMLY POINTS (Platform Currency)
// ============================================================================

export class FandomlyPointsService {
  /**
   * Award Fandomly Points to a user
   */
  async awardPoints(
    userId: string,
    amount: number,
    source: string,
    description?: string,
    metadata?: any
  ): Promise<void> {
    await db.insert(pointTransactions).values({
      userId,
      tenantId: null, // null = Fandomly Points
      amount,
      type: 'earned',
      source,
      description: description || `Earned ${amount} Fandomly Points from ${source}`,
      metadata
    });

    console.log(`✅ Awarded ${amount} Fandomly Points to user ${userId} (${source})`);
  }

  /**
   * Spend Fandomly Points
   */
  async spendPoints(
    userId: string,
    amount: number,
    source: string,
    description?: string
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    
    if (balance < amount) {
      console.log(`❌ Insufficient Fandomly Points for user ${userId}: ${balance} < ${amount}`);
      return false;
    }

    await db.insert(pointTransactions).values({
      userId,
      tenantId: null,
      amount: -amount,
      type: 'spent',
      source,
      description: description || `Spent ${amount} Fandomly Points on ${source}`
    });

    console.log(`✅ Spent ${amount} Fandomly Points for user ${userId} (${source})`);
    return true;
  }

  /**
   * Get user's Fandomly Points balance
   */
  async getBalance(userId: string): Promise<number> {
    const transactions = await db.query.pointTransactions.findMany({
      where: and(
        eq(pointTransactions.userId, userId),
        sql`${pointTransactions.tenantId} IS NULL`
      )
    });

    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return Math.max(0, balance);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    return db.query.pointTransactions.findMany({
      where: and(
        eq(pointTransactions.userId, userId),
        sql`${pointTransactions.tenantId} IS NULL`
      ),
      orderBy: [desc(pointTransactions.createdAt)],
      limit
    }) as Promise<PointTransaction[]>;
  }
}

// ============================================================================
// CREATOR POINTS (Per-Creator Currency)
// ============================================================================

export class CreatorPointsService {
  /**
   * Award Creator Points to a user
   */
  async awardPoints(
    userId: string,
    creatorId: string,
    tenantId: string,
    amount: number,
    source: string,
    description?: string,
    metadata?: any
  ): Promise<void> {
    await db.insert(pointTransactions).values({
      userId,
      tenantId,
      amount,
      type: 'earned',
      source,
      description: description || `Earned ${amount} points from ${source}`,
      metadata: {
        ...metadata,
        creatorId
      }
    });

    console.log(`✅ Awarded ${amount} creator points to user ${userId} for creator ${creatorId} (${source})`);
  }

  /**
   * Spend Creator Points
   */
  async spendPoints(
    userId: string,
    creatorId: string,
    tenantId: string,
    amount: number,
    source: string,
    description?: string
  ): Promise<boolean> {
    const balance = await this.getBalance(userId, creatorId, tenantId);
    
    if (balance < amount) {
      console.log(`❌ Insufficient creator points for user ${userId}: ${balance} < ${amount}`);
      return false;
    }

    await db.insert(pointTransactions).values({
      userId,
      tenantId,
      amount: -amount,
      type: 'spent',
      source,
      description: description || `Spent ${amount} points on ${source}`,
      metadata: { creatorId }
    });

    console.log(`✅ Spent ${amount} creator points for user ${userId} with creator ${creatorId} (${source})`);
    return true;
  }

  /**
   * Get user's Creator Points balance for a specific creator
   */
  async getBalance(userId: string, creatorId: string, tenantId: string): Promise<number> {
    const transactions = await db.query.pointTransactions.findMany({
      where: and(
        eq(pointTransactions.userId, userId),
        eq(pointTransactions.tenantId, tenantId)
      )
    });

    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return Math.max(0, balance);
  }

  /**
   * Get all creator points balances for a user
   */
  async getAllBalances(userId: string): Promise<Record<string, number>> {
    const transactions = await db.query.pointTransactions.findMany({
      where: and(
        eq(pointTransactions.userId, userId),
        sql`${pointTransactions.tenantId} IS NOT NULL`
      )
    });

    // Group by tenant/creator
    const balances: Record<string, number> = {};
    
    for (const tx of transactions) {
      const creatorId = tx.metadata?.creatorId || tx.tenantId;
      if (creatorId) {
        balances[creatorId] = (balances[creatorId] || 0) + tx.amount;
      }
    }

    return balances;
  }

  /**
   * Get transaction history for a specific creator
   */
  async getTransactionHistory(
    userId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<PointTransaction[]> {
    return db.query.pointTransactions.findMany({
      where: and(
        eq(pointTransactions.userId, userId),
        eq(pointTransactions.tenantId, tenantId)
      ),
      orderBy: [desc(pointTransactions.createdAt)],
      limit
    }) as Promise<PointTransaction[]>;
  }
}

// ============================================================================
// COMBINED POINTS SERVICE
// ============================================================================

export class PointsService {
  fandomly: FandomlyPointsService;
  creator: CreatorPointsService;

  constructor() {
    this.fandomly = new FandomlyPointsService();
    this.creator = new CreatorPointsService();
  }

  /**
   * Get complete points overview for a user
   */
  async getFullBalance(userId: string): Promise<PointsBalance> {
    const [fandomlyPoints, creatorPoints] = await Promise.all([
      this.fandomly.getBalance(userId),
      this.creator.getAllBalances(userId)
    ]);

    return {
      userId,
      fandomlyPoints,
      creatorPoints
    };
  }

  /**
   * Get all transactions for a user (both Fandomly and Creator points)
   */
  async getAllTransactions(userId: string, limit: number = 50): Promise<{
    fandomly: PointTransaction[];
    creator: PointTransaction[];
  }> {
    const allTransactions = await db.query.pointTransactions.findMany({
      where: eq(pointTransactions.userId, userId),
      orderBy: [desc(pointTransactions.createdAt)],
      limit: limit * 2 // Get more to split
    }) as PointTransaction[];

    const fandomly = allTransactions
      .filter(tx => !tx.tenantId)
      .slice(0, limit);
    
    const creator = allTransactions
      .filter(tx => !!tx.tenantId)
      .slice(0, limit);

    return { fandomly, creator };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const pointsService = new PointsService();
export const fandomlyPointsService = new FandomlyPointsService();
export const creatorPointsService = new CreatorPointsService();

