/**
 * Reputation Oracle Service
 *
 * Bridges off-chain reputation data to the on-chain ReputationRegistry contract.
 *
 * Architecture (Option A with Option C foundation):
 * - Batch sync: Hourly recalculation + batch push for all users with wallets
 * - Threshold sync: Immediate single-user push when crossing critical thresholds
 *   (500 for FanStaking, 750 for CreatorTokenFactory)
 * - The threshold sync path is the foundation for Option C event-driven updates.
 *   Currently called manually; in Option C, it will be triggered by point-award events.
 *
 * Contract interaction follows the same viem pattern as BlockchainNFTService.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  FANDOMLY_CHAIN,
  CONTRACTS,
  REPUTATION_REGISTRY_ABI,
  REPUTATION_THRESHOLDS,
} from '@shared/blockchain-config';
import { db } from '../../db';
import { eq, and, isNotNull } from 'drizzle-orm';
import { reputationScores, reputationSyncLog, users } from '@shared/schema';
import { calculateUserScore, type ScoreBreakdown } from './reputation-score-calculator';

// ============================================================================
// CHAIN SETUP (matches blockchain-nft-service.ts pattern)
// ============================================================================

const fandomlyChain = defineChain({
  id: FANDOMLY_CHAIN.id,
  name: FANDOMLY_CHAIN.name,
  nativeCurrency: FANDOMLY_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [FANDOMLY_CHAIN.rpcUrl] },
  },
  testnet: FANDOMLY_CHAIN.testnet,
});

// Batch size for on-chain batchUpdateScores (gas limit safe)
const BATCH_SIZE = 50;

// Minimum score delta to trigger an on-chain update (avoid unnecessary gas)
const MIN_SCORE_DELTA = 5;

// ============================================================================
// SERVICE
// ============================================================================

export class ReputationOracleService {
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private registryAddress: Address;

  constructor(privateKey: `0x${string}`) {
    const account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: fandomlyChain,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account,
      chain: fandomlyChain,
      transport: http(),
    });

    this.registryAddress = CONTRACTS.ReputationRegistry as Address;
  }

  // ==========================================================================
  // ON-CHAIN READ
  // ==========================================================================

  /**
   * Read current on-chain score for a wallet address.
   */
  async getOnChainScore(walletAddress: string): Promise<number> {
    const score = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getScore',
      args: [walletAddress as Address],
    });
    return Number(score);
  }

  /**
   * Check if a wallet meets an on-chain threshold.
   */
  async meetsThreshold(walletAddress: string, threshold: number): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.registryAddress,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'meetsThreshold',
      args: [walletAddress as Address, BigInt(threshold)],
    });
  }

  // ==========================================================================
  // ON-CHAIN WRITE — SINGLE USER
  // ==========================================================================

  /**
   * Push a single user's score on-chain.
   * Used for threshold crossings (Option C foundation).
   */
  async pushSingleScore(walletAddress: string, score: number, reason: string): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'updateScore',
      args: [walletAddress as Address, BigInt(score), reason],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  // ==========================================================================
  // ON-CHAIN WRITE — BATCH
  // ==========================================================================

  /**
   * Push a batch of scores on-chain via batchUpdateScores.
   * Splits into chunks of BATCH_SIZE to stay within gas limits.
   */
  async pushBatchScores(
    entries: Array<{ walletAddress: string; score: number }>,
    reason: string
  ): Promise<Hash[]> {
    const txHashes: Hash[] = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      const addresses = chunk.map((e) => e.walletAddress as Address);
      const scores = chunk.map((e) => BigInt(e.score));

      const hash = await this.walletClient.writeContract({
        address: this.registryAddress,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'batchUpdateScores',
        args: [addresses, scores, reason],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      txHashes.push(hash);
    }

    return txHashes;
  }

  // ==========================================================================
  // SCORE RECALCULATION + DB UPDATE
  // ==========================================================================

  /**
   * Recalculate a single user's reputation score and update the DB record.
   * Does NOT push on-chain — that's handled by sync methods.
   * Returns the new score and whether a critical threshold was crossed.
   */
  async recalculateUser(userId: string): Promise<{
    score: number;
    breakdown: ScoreBreakdown;
    thresholdCrossed: number | null;
  }> {
    const { score, breakdown } = await calculateUserScore(userId);

    // Get user's wallet address
    const [user] = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, userId));

    // Upsert the reputation score record
    const existing = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.userId, userId));

    const previousScore = existing[0]?.offChainScore ?? 0;

    // Check if a critical threshold was crossed
    let thresholdCrossed: number | null = null;
    const thresholds = Object.values(REPUTATION_THRESHOLDS);
    for (const threshold of thresholds) {
      if (previousScore < threshold && score >= threshold) {
        thresholdCrossed = threshold;
        break; // Take the first (lowest) threshold crossed
      }
    }

    const now = new Date();

    if (existing.length > 0) {
      await db
        .update(reputationScores)
        .set({
          offChainScore: score,
          previousScore,
          scoreBreakdown: breakdown,
          lastCalculatedAt: now,
          updatedAt: now,
          walletAddress: user?.walletAddress || existing[0].walletAddress,
          // Mark for sync if score changed enough
          syncStatus:
            Math.abs(score - (existing[0].onChainScore ?? 0)) >= MIN_SCORE_DELTA
              ? 'pending'
              : existing[0].syncStatus,
          // Threshold tracking
          ...(thresholdCrossed
            ? {
                crossedThreshold: thresholdCrossed,
                thresholdCrossedAt: now,
                pendingThresholdSync: true,
              }
            : {}),
        })
        .where(eq(reputationScores.userId, userId));
    } else {
      await db.insert(reputationScores).values({
        userId,
        walletAddress: user?.walletAddress || null,
        offChainScore: score,
        onChainScore: 0,
        previousScore: 0,
        scoreBreakdown: breakdown,
        syncStatus: score > 0 ? 'pending' : 'synced',
        lastCalculatedAt: now,
        ...(thresholdCrossed
          ? {
              crossedThreshold: thresholdCrossed,
              thresholdCrossedAt: now,
              pendingThresholdSync: true,
            }
          : {}),
      });
    }

    return { score, breakdown, thresholdCrossed };
  }

  // ==========================================================================
  // BATCH SYNC — Hourly cron job
  // ==========================================================================

  /**
   * Full batch sync pipeline:
   * 1. Recalculate all user scores
   * 2. Find users whose score diverges from on-chain by >= MIN_SCORE_DELTA
   * 3. Push batch updates on-chain
   * 4. Update DB sync state
   */
  async runBatchSync(): Promise<{
    usersProcessed: number;
    usersUpdated: number;
    usersFailed: number;
    txHashes: Hash[];
  }> {
    const startTime = Date.now();
    const logId = await this.createSyncLog('batch', 'started');

    let usersProcessed = 0;
    let usersUpdated = 0;
    let usersFailed = 0;
    const errors: Array<{ userId: string; walletAddress: string; error: string }> = [];

    try {
      // Step 1: Get all users with wallet addresses
      const usersWithWallets = await db
        .select({ id: users.id, walletAddress: users.walletAddress })
        .from(users)
        .where(isNotNull(users.walletAddress));

      console.log(
        `[ReputationOracle] Batch sync starting for ${usersWithWallets.length} users with wallets`
      );

      // Step 2: Recalculate all scores
      const toSync: Array<{ walletAddress: string; score: number; userId: string }> = [];

      for (const user of usersWithWallets) {
        if (!user.walletAddress) continue;
        usersProcessed++;

        try {
          const { score } = await this.recalculateUser(user.id);

          // Check if on-chain update is needed
          const existing = await db
            .select({ onChainScore: reputationScores.onChainScore })
            .from(reputationScores)
            .where(eq(reputationScores.userId, user.id));

          const currentOnChain = existing[0]?.onChainScore ?? 0;

          if (Math.abs(score - currentOnChain) >= MIN_SCORE_DELTA) {
            toSync.push({
              walletAddress: user.walletAddress,
              score,
              userId: user.id,
            });
          }
        } catch (err) {
          usersFailed++;
          errors.push({
            userId: user.id,
            walletAddress: user.walletAddress,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      console.log(
        `[ReputationOracle] ${toSync.length} users need on-chain updates (out of ${usersProcessed} processed)`
      );

      // Step 3: Push to chain in batches
      let txHashes: Hash[] = [];
      if (toSync.length > 0) {
        try {
          txHashes = await this.pushBatchScores(
            toSync.map((e) => ({ walletAddress: e.walletAddress, score: e.score })),
            `batch_sync_${new Date().toISOString()}`
          );

          // Step 4: Update DB sync state for all synced users
          const now = new Date();
          for (const entry of toSync) {
            await db
              .update(reputationScores)
              .set({
                onChainScore: entry.score,
                syncStatus: 'synced',
                lastSyncedAt: now,
                syncTxHash: txHashes[0] || null,
                syncError: null,
                pendingThresholdSync: false,
                updatedAt: now,
              })
              .where(eq(reputationScores.userId, entry.userId));
          }

          usersUpdated = toSync.length;
        } catch (err) {
          // Mark all as failed
          for (const entry of toSync) {
            usersFailed++;
            await db
              .update(reputationScores)
              .set({
                syncStatus: 'failed',
                syncError: err instanceof Error ? err.message : String(err),
                updatedAt: new Date(),
              })
              .where(eq(reputationScores.userId, entry.userId));
          }
        }
      }

      const durationMs = Date.now() - startTime;
      await this.completeSyncLog(logId, {
        status: 'completed',
        usersProcessed,
        usersUpdated,
        usersFailed,
        txHash: txHashes[0] || null,
        errorLog: errors.length > 0 ? errors : null,
        durationMs,
      });

      console.log(
        `[ReputationOracle] Batch sync completed in ${durationMs}ms: ${usersUpdated} updated, ${usersFailed} failed`
      );

      return { usersProcessed, usersUpdated, usersFailed, txHashes };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await this.completeSyncLog(logId, {
        status: 'failed',
        usersProcessed,
        usersUpdated,
        usersFailed,
        txHash: null,
        errorLog: [
          ...errors,
          {
            userId: 'system',
            walletAddress: '',
            error: err instanceof Error ? err.message : String(err),
          },
        ],
        durationMs,
      });
      throw err;
    }
  }

  // ==========================================================================
  // THRESHOLD SYNC — Option C foundation
  // ==========================================================================

  /**
   * Immediately sync a single user who just crossed a critical threshold.
   * In Option C, this will be called from point-award event handlers.
   * Currently can be called manually or by the batch job when it detects a crossing.
   */
  async syncThresholdCrossing(userId: string): Promise<{
    synced: boolean;
    score: number;
    threshold: number | null;
    txHash: Hash | null;
  }> {
    const record = await db
      .select()
      .from(reputationScores)
      .where(
        and(eq(reputationScores.userId, userId), eq(reputationScores.pendingThresholdSync, true))
      );

    if (record.length === 0 || !record[0].walletAddress) {
      return { synced: false, score: 0, threshold: null, txHash: null };
    }

    const entry = record[0];

    try {
      const txHash = await this.pushSingleScore(
        entry.walletAddress,
        entry.offChainScore,
        `threshold_crossing_${entry.crossedThreshold}`
      );

      const now = new Date();
      await db
        .update(reputationScores)
        .set({
          onChainScore: entry.offChainScore,
          syncStatus: 'synced',
          lastSyncedAt: now,
          syncTxHash: txHash,
          syncError: null,
          pendingThresholdSync: false,
          updatedAt: now,
        })
        .where(eq(reputationScores.userId, userId));

      // Log the threshold sync
      await this.createSyncLog('threshold', 'completed', {
        usersProcessed: 1,
        usersUpdated: 1,
        txHash,
      });

      console.log(
        `[ReputationOracle] Threshold sync for user ${userId}: score ${entry.offChainScore}, threshold ${entry.crossedThreshold}`
      );

      return {
        synced: true,
        score: entry.offChainScore,
        threshold: entry.crossedThreshold,
        txHash,
      };
    } catch (err) {
      await db
        .update(reputationScores)
        .set({
          syncStatus: 'failed',
          syncError: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(reputationScores.userId, userId));

      return {
        synced: false,
        score: entry.offChainScore,
        threshold: entry.crossedThreshold,
        txHash: null,
      };
    }
  }

  /**
   * Process all pending threshold crossings.
   * Called by the cron job after batch recalculation or independently.
   */
  async processPendingThresholds(): Promise<number> {
    const pending = await db
      .select({ userId: reputationScores.userId })
      .from(reputationScores)
      .where(
        and(
          eq(reputationScores.pendingThresholdSync, true),
          isNotNull(reputationScores.walletAddress)
        )
      );

    let synced = 0;
    for (const entry of pending) {
      const result = await this.syncThresholdCrossing(entry.userId);
      if (result.synced) synced++;
    }

    if (synced > 0) {
      console.log(`[ReputationOracle] Processed ${synced} threshold crossings`);
    }

    return synced;
  }

  // ==========================================================================
  // SINGLE USER QUERY (for API)
  // ==========================================================================

  /**
   * Get a user's full reputation data (off-chain + on-chain).
   * If no record exists, recalculate and create one.
   */
  async getUserReputation(userId: string): Promise<{
    offChainScore: number;
    onChainScore: number;
    breakdown: ScoreBreakdown | null;
    syncStatus: string;
    lastSyncedAt: Date | null;
    walletAddress: string | null;
    thresholds: Record<string, boolean>;
  }> {
    let record = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.userId, userId));

    // Auto-calculate if no record exists
    if (record.length === 0) {
      await this.recalculateUser(userId);
      record = await db.select().from(reputationScores).where(eq(reputationScores.userId, userId));
    }

    const entry = record[0];
    if (!entry) {
      return {
        offChainScore: 0,
        onChainScore: 0,
        breakdown: null,
        syncStatus: 'pending',
        lastSyncedAt: null,
        walletAddress: null,
        thresholds: {
          fanStaking: false,
          creatorToken: false,
        },
      };
    }

    return {
      offChainScore: entry.offChainScore,
      onChainScore: entry.onChainScore,
      breakdown: entry.scoreBreakdown as ScoreBreakdown | null,
      syncStatus: entry.syncStatus,
      lastSyncedAt: entry.lastSyncedAt,
      walletAddress: entry.walletAddress,
      thresholds: {
        fanStaking: entry.offChainScore >= REPUTATION_THRESHOLDS.FAN_STAKING,
        creatorToken: entry.offChainScore >= REPUTATION_THRESHOLDS.CREATOR_TOKEN,
      },
    };
  }

  // ==========================================================================
  // SYNC LOG HELPERS
  // ==========================================================================

  private async createSyncLog(
    syncType: string,
    status: string,
    extra?: Partial<{
      usersProcessed: number;
      usersUpdated: number;
      txHash: Hash | null;
    }>
  ): Promise<string> {
    const [log] = await db
      .insert(reputationSyncLog)
      .values({
        syncType,
        status,
        usersProcessed: extra?.usersProcessed ?? 0,
        usersUpdated: extra?.usersUpdated ?? 0,
        txHash: extra?.txHash ?? null,
      })
      .returning({ id: reputationSyncLog.id });
    return log.id;
  }

  private async completeSyncLog(
    logId: string,
    data: {
      status: string;
      usersProcessed: number;
      usersUpdated: number;
      usersFailed: number;
      txHash: Hash | null;
      errorLog: Array<{ userId: string; walletAddress: string; error: string }> | null;
      durationMs: number;
    }
  ): Promise<void> {
    await db
      .update(reputationSyncLog)
      .set({
        status: data.status,
        usersProcessed: data.usersProcessed,
        usersUpdated: data.usersUpdated,
        usersFailed: data.usersFailed,
        txHash: data.txHash,
        errorLog: data.errorLog,
        completedAt: new Date(),
        durationMs: data.durationMs,
      })
      .where(eq(reputationSyncLog.id, logId));
  }
}

// ============================================================================
// SINGLETON INITIALIZATION (matches BlockchainNFTService pattern)
// ============================================================================

let reputationOracleService: ReputationOracleService | null = null;

export function initializeReputationOracle(): ReputationOracleService | null {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.warn('[ReputationOracle] Not configured. Set DEPLOYER_PRIVATE_KEY in env.');
    return null;
  }

  const key = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
  reputationOracleService = new ReputationOracleService(key);
  console.log('[ReputationOracle] Initialized (Fandomly Chain L1)');
  return reputationOracleService;
}

export function getReputationOracle(): ReputationOracleService | null {
  if (!reputationOracleService) {
    return initializeReputationOracle();
  }
  return reputationOracleService;
}
