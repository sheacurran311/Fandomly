/**
 * Fandomly Points Service
 *
 * Manages two types of points:
 * 1. Fandomly Points - Platform currency (redeemable for Fandomly admin rewards)
 * 2. Creator Points - Per-creator currency (redeemable for creator-specific rewards)
 */

import { db } from '../../db';
import {
  pointTransactions,
  platformPointsTransactions,
  fanPrograms,
  loyaltyPrograms,
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { onReputationSignalChanged } from '../reputation/reputation-event-handler';

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
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// FANDOMLY POINTS (Platform Currency) - uses platform_points_transactions
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
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(platformPointsTransactions).values({
      userId,
      points: amount,
      source,
      description: description || `Earned ${amount} Fandomly Points from ${source}`,
      metadata: metadata ?? undefined,
    });

    console.log(`✅ Awarded ${amount} Fandomly Points to user ${userId} (${source})`);

    // Notify reputation system (non-blocking, debounced)
    onReputationSignalChanged(userId, 'taskCompletions');
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

    await db.insert(platformPointsTransactions).values({
      userId,
      points: -amount,
      source,
      description: description || `Spent ${amount} Fandomly Points on ${source}`,
    });

    console.log(`✅ Spent ${amount} Fandomly Points for user ${userId} (${source})`);
    return true;
  }

  /**
   * Get user's Fandomly Points balance
   */
  async getBalance(userId: string): Promise<number> {
    const transactions = await db.query.platformPointsTransactions.findMany({
      where: eq(platformPointsTransactions.userId, userId),
    });

    const balance = transactions.reduce((sum, tx) => sum + (tx.points ?? 0), 0);
    return Math.max(0, balance);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    const rows = await db.query.platformPointsTransactions.findMany({
      where: eq(platformPointsTransactions.userId, userId),
      orderBy: [desc(platformPointsTransactions.createdAt)],
      limit,
    });
    return rows.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      amount: tx.points,
      type: (tx.points >= 0 ? 'earned' : 'spent') as 'earned' | 'spent' | 'bonus' | 'refund',
      source: tx.source,
      description: tx.description ?? undefined,
      metadata: tx.metadata ?? undefined,
      createdAt: tx.createdAt ?? new Date(),
    }));
  }
}

// ============================================================================
// CREATOR POINTS (Per-Creator Currency)
// ============================================================================

export class CreatorPointsService {
  private async resolveFanProgramId(
    userId: string,
    creatorId: string,
    tenantId: string
  ): Promise<string | null> {
    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.creatorId, creatorId), eq(loyaltyPrograms.tenantId, tenantId)))
      .limit(1);
    if (!program) return null;
    const [fp] = await db
      .select()
      .from(fanPrograms)
      .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, program.id)))
      .limit(1);
    return fp?.id ?? null;
  }

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
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const fanProgramId = await this.resolveFanProgramId(userId, creatorId, tenantId);
    if (!fanProgramId) {
      console.warn(
        `[CreatorPoints] No fan program for user ${userId} in creator ${creatorId} tenant ${tenantId}; skipping points award`
      );
      return;
    }

    // Insert transaction record
    await db.insert(pointTransactions).values({
      tenantId,
      fanProgramId,
      points: amount,
      type: 'earned',
      source,
      metadata: metadata ? { ...metadata } : undefined,
    });

    // Update fan_programs balance (increment current_points and total_points_earned)
    await db
      .update(fanPrograms)
      .set({
        currentPoints: sql`${fanPrograms.currentPoints} + ${amount}`,
        totalPointsEarned: sql`${fanPrograms.totalPointsEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(fanPrograms.id, fanProgramId));

    console.log(
      `✅ Awarded ${amount} creator points to user ${userId} for creator ${creatorId} (${source})`
    );

    // Notify reputation system (non-blocking, debounced)
    onReputationSignalChanged(userId, 'totalPoints');
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
    _description?: string
  ): Promise<boolean> {
    const balance = await this.getBalance(userId, creatorId, tenantId);
    if (balance < amount) {
      console.log(`❌ Insufficient creator points for user ${userId}: ${balance} < ${amount}`);
      return false;
    }
    const fanProgramId = await this.resolveFanProgramId(userId, creatorId, tenantId);
    if (!fanProgramId) return false;

    // Insert transaction record
    await db.insert(pointTransactions).values({
      tenantId,
      fanProgramId,
      points: -amount,
      type: 'spent',
      source,
    });

    // Update fan_programs balance (decrement current_points only, NOT total_points_earned)
    await db
      .update(fanPrograms)
      .set({
        currentPoints: sql`GREATEST(0, ${fanPrograms.currentPoints} - ${amount})`,
        updatedAt: new Date(),
      })
      .where(eq(fanPrograms.id, fanProgramId));

    console.log(
      `✅ Spent ${amount} creator points for user ${userId} with creator ${creatorId} (${source})`
    );
    return true;
  }

  /**
   * Get user's Creator Points balance for a specific creator
   */
  async getBalance(userId: string, creatorId: string, tenantId: string): Promise<number> {
    const fanProgramId = await this.resolveFanProgramId(userId, creatorId, tenantId);
    if (!fanProgramId) return 0;
    const transactions = await db.query.pointTransactions.findMany({
      where: eq(pointTransactions.fanProgramId, fanProgramId),
    });
    return Math.max(
      0,
      transactions.reduce((sum, tx) => sum + (tx.points ?? 0), 0)
    );
  }

  /**
   * Get all creator points balances for a user
   */
  async getAllBalances(userId: string): Promise<Record<string, number>> {
    const fps = await db.query.fanPrograms.findMany({
      where: eq(fanPrograms.fanId, userId),
      with: { program: true },
    });
    const balances: Record<string, number> = {};
    for (const fp of fps) {
      const creatorId = fp.program?.creatorId;
      if (!creatorId) continue;
      const txs = await db.query.pointTransactions.findMany({
        where: eq(pointTransactions.fanProgramId, fp.id),
      });
      const balance = txs.reduce((sum, tx) => sum + (tx.points ?? 0), 0);
      if (balance > 0) balances[creatorId] = balance;
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
    const fanProgramsList = await db.query.fanPrograms.findMany({
      where: and(eq(fanPrograms.fanId, userId), eq(fanPrograms.tenantId, tenantId)),
      limit: 1,
    });
    const fp = fanProgramsList[0];
    if (!fp) return [];
    const rows = await db.query.pointTransactions.findMany({
      where: eq(pointTransactions.fanProgramId, fp.id),
      orderBy: [desc(pointTransactions.createdAt)],
      limit,
    });
    return rows.map((tx) => ({
      id: tx.id,
      userId,
      tenantId: tx.tenantId,
      amount: tx.points ?? 0,
      type: (tx.points && tx.points >= 0 ? 'earned' : 'spent') as
        | 'earned'
        | 'spent'
        | 'bonus'
        | 'refund',
      source: tx.source,
      metadata: tx.metadata ?? undefined,
      createdAt: tx.createdAt ?? new Date(),
    }));
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
      this.creator.getAllBalances(userId),
    ]);

    return {
      userId,
      fandomlyPoints,
      creatorPoints,
    };
  }

  /**
   * Get all transactions for a user (both Fandomly and Creator points)
   * Optimized: Uses a single JOIN query instead of N+1 queries
   */
  async getAllTransactions(
    userId: string,
    limit: number = 50
  ): Promise<{
    fandomly: PointTransaction[];
    creator: PointTransaction[];
  }> {
    const fandomly = await this.fandomly.getTransactionHistory(userId, limit);

    // Single query with JOIN to get all creator point transactions
    // This replaces the N+1 pattern (1 query for fan programs + N queries for transactions)
    const creatorTxsRaw = await db.execute(sql`
      SELECT 
        pt.id,
        pt.tenant_id,
        pt.points,
        pt.source,
        pt.metadata,
        pt.created_at
      FROM point_transactions pt
      INNER JOIN fan_programs fp ON pt.fan_program_id = fp.id
      WHERE fp.fan_id = ${userId}
      ORDER BY pt.created_at DESC
      LIMIT ${limit}
    `);

    const creatorTxs: PointTransaction[] = (creatorTxsRaw.rows || []).map(
      (tx: Record<string, unknown>) => ({
        id: tx.id,
        userId,
        tenantId: tx.tenant_id,
        amount: tx.points ?? 0,
        type: (tx.points && tx.points >= 0 ? 'earned' : 'spent') as
          | 'earned'
          | 'spent'
          | 'bonus'
          | 'refund',
        source: tx.source,
        metadata: tx.metadata ?? undefined,
        createdAt: tx.created_at ? new Date(tx.created_at) : new Date(),
      })
    );

    return { fandomly, creator: creatorTxs };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const pointsService = new PointsService();
export const fandomlyPointsService = new FandomlyPointsService();
export const creatorPointsService = new CreatorPointsService();
