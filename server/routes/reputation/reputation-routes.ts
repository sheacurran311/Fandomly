/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reputation API Routes
 *
 * Endpoints for querying and managing reputation scores.
 * Both fan-facing (view own score) and admin (trigger sync, view stats).
 */

import { type Express } from 'express';
import {
  authenticateUser,
  requireFandomlyAdmin,
  type AuthenticatedRequest,
} from '../../middleware/rbac';
import { getReputationOracle } from '../../services/reputation/reputation-oracle-service';
import {
  calculateUserScore,
  SIGNAL_CONFIG,
} from '../../services/reputation/reputation-score-calculator';
import { db } from '../../db';
import { eq, desc, sql } from 'drizzle-orm';
import { reputationScores, reputationSyncLog, creators, users } from '@shared/schema';
import { REPUTATION_THRESHOLDS } from '@shared/blockchain-config';

/**
 * Build signalWeights response filtered to the user's type.
 */
function getSignalWeightsForUser(isCreator: boolean) {
  const targetType = isCreator ? 'creator' : 'fan';
  return Object.fromEntries(
    Object.entries(SIGNAL_CONFIG)
      .filter(([_, config]) => config.userType === targetType || config.userType === 'both')
      .map(([key, config]) => [key, { weight: config.weight, description: config.description }])
  );
}

export function registerReputationRoutes(app: Express) {
  // ==========================================================================
  // FAN-FACING: View own reputation
  // ==========================================================================

  /**
   * GET /api/reputation/me
   * Get the authenticated user's reputation score and breakdown.
   */
  app.get('/api/reputation/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is a creator for signal type filtering
      const creatorRecord = await db.query.creators.findFirst({
        where: eq(creators.userId, userId),
      });
      const isCreator = !!creatorRecord;
      const signalWeights = getSignalWeightsForUser(isCreator);

      const oracle = getReputationOracle();
      if (oracle) {
        const data = await oracle.getUserReputation(userId);
        return res.json({
          score: data.offChainScore,
          onChainScore: data.onChainScore,
          breakdown: data.breakdown,
          syncStatus: data.syncStatus,
          lastSyncedAt: data.lastSyncedAt,
          walletAddress: data.walletAddress,
          thresholds: data.thresholds,
          maxScore: 1000,
          signalWeights,
        });
      }

      // Fallback: calculate score without oracle (no on-chain data)
      const { score, breakdown } = await calculateUserScore(userId);
      return res.json({
        score,
        onChainScore: 0,
        breakdown,
        syncStatus: 'not_configured',
        lastSyncedAt: null,
        walletAddress: null,
        thresholds: {
          fanStaking: score >= REPUTATION_THRESHOLDS.FAN_STAKING,
          creatorToken: score >= REPUTATION_THRESHOLDS.CREATOR_TOKEN,
        },
        maxScore: 1000,
        signalWeights,
      });
    } catch (error) {
      console.error('[ReputationRoutes] Error fetching reputation:', error);
      return res.status(500).json({ error: 'Failed to fetch reputation score' });
    }
  });

  /**
   * GET /api/reputation/user/:userId
   * Get any user's reputation score (public data only).
   */
  app.get(
    '/api/reputation/user/:userId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;

        const record = await db
          .select({
            offChainScore: reputationScores.offChainScore,
            onChainScore: reputationScores.onChainScore,
            lastSyncedAt: reputationScores.lastSyncedAt,
          })
          .from(reputationScores)
          .where(eq(reputationScores.userId, userId));

        if (record.length === 0) {
          // Calculate on-the-fly if no record
          const { score } = await calculateUserScore(userId);
          return res.json({
            score,
            onChainScore: 0,
            lastSyncedAt: null,
            maxScore: 1000,
          });
        }

        return res.json({
          score: record[0].offChainScore,
          onChainScore: record[0].onChainScore,
          lastSyncedAt: record[0].lastSyncedAt,
          maxScore: 1000,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Error fetching user reputation:', error);
        return res.status(500).json({ error: 'Failed to fetch reputation score' });
      }
    }
  );

  /**
   * GET /api/reputation/me/history
   * Get the authenticated user's score change history.
   */
  app.get(
    '/api/reputation/me/history',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get current + previous score from reputation_scores
        const record = await db
          .select({
            offChainScore: reputationScores.offChainScore,
            previousScore: reputationScores.previousScore,
            lastCalculatedAt: reputationScores.lastCalculatedAt,
          })
          .from(reputationScores)
          .where(eq(reputationScores.userId, userId));

        // Build history from sync log entries
        const logs = await db
          .select({
            syncType: reputationSyncLog.syncType,
            usersUpdated: reputationSyncLog.usersUpdated,
            completedAt: reputationSyncLog.completedAt,
          })
          .from(reputationSyncLog)
          .where(eq(reputationSyncLog.status, 'completed'))
          .orderBy(desc(reputationSyncLog.completedAt))
          .limit(20);

        const history = [];

        // Show the most recent score change if available
        if (record.length > 0 && record[0].lastCalculatedAt) {
          history.push({
            date: record[0].lastCalculatedAt,
            oldScore: record[0].previousScore ?? 0,
            newScore: record[0].offChainScore,
            syncType: 'Score update',
          });
        }

        // Add completed sync events
        for (const log of logs) {
          if (log.completedAt) {
            history.push({
              date: log.completedAt,
              oldScore: 0,
              newScore: 0,
              syncType: `${log.syncType} sync (${log.usersUpdated ?? 0} users)`,
            });
          }
        }

        return res.json({ history });
      } catch (error) {
        console.error('[ReputationRoutes] Error fetching history:', error);
        return res.status(500).json({ error: 'Failed to fetch reputation history' });
      }
    }
  );

  // ==========================================================================
  // ADMIN: Trigger sync, view logs
  // ==========================================================================

  /**
   * POST /api/admin/reputation/recalculate/:userId
   * Recalculate a specific user's score (admin only).
   */
  app.post(
    '/api/admin/reputation/recalculate/:userId',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        const oracle = getReputationOracle();
        if (!oracle) {
          return res.status(503).json({ error: 'Reputation oracle not configured' });
        }

        const result = await oracle.recalculateUser(userId);
        return res.json({
          score: result.score,
          breakdown: result.breakdown,
          thresholdCrossed: result.thresholdCrossed,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Recalculate error:', error);
        return res.status(500).json({ error: 'Failed to recalculate score' });
      }
    }
  );

  /**
   * POST /api/admin/reputation/sync
   * Trigger a manual batch sync (admin only).
   * Alias for /api/admin/reputation/sync-batch for backwards compatibility.
   */
  app.post(
    '/api/admin/reputation/sync',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const oracle = getReputationOracle();
        if (!oracle) {
          return res.status(503).json({ error: 'Reputation oracle not configured' });
        }

        const result = await oracle.runBatchSync();
        return res.json({
          success: true,
          usersProcessed: result.usersProcessed,
          usersUpdated: result.usersUpdated,
          usersFailed: result.usersFailed,
          txHashes: result.txHashes,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Sync error:', error);
        return res.status(500).json({ error: 'Batch sync failed' });
      }
    }
  );

  /**
   * POST /api/reputation/sync-batch
   * Admin-only endpoint to trigger a batch sync of all user scores to the blockchain.
   * This endpoint:
   * 1. Queries all users with wallet addresses
   * 2. Calculates their reputation scores based on activity
   * 3. Calls the ReputationRegistry contract's batchUpdateScores function
   * 4. Logs the sync results
   */
  app.post(
    '/api/reputation/sync-batch',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const oracle = getReputationOracle();
        if (!oracle) {
          return res.status(503).json({ error: 'Reputation oracle not configured' });
        }

        console.log('[ReputationRoutes] Starting batch sync of all user scores...');
        const result = await oracle.runBatchSync();

        console.log(
          `[ReputationRoutes] Batch sync completed: ${result.usersUpdated}/${result.usersProcessed} users synced, ${result.usersFailed} failed`
        );

        return res.json({
          success: true,
          usersProcessed: result.usersProcessed,
          usersUpdated: result.usersUpdated,
          usersFailed: result.usersFailed,
          txHashes: result.txHashes,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Batch sync error:', error);
        return res.status(500).json({ error: 'Batch sync failed' });
      }
    }
  );

  /**
   * POST /api/reputation/sync/:userId
   * Sync a specific user's score to chain.
   * Recalculates the user's score and immediately pushes it to the blockchain.
   */
  app.post(
    '/api/reputation/sync/:userId',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        const oracle = getReputationOracle();
        if (!oracle) {
          return res.status(503).json({ error: 'Reputation oracle not configured' });
        }

        console.log(`[ReputationRoutes] Syncing score for user ${userId}...`);

        // Recalculate the user's score
        const { score, breakdown } = await oracle.recalculateUser(userId);

        // Get user's wallet address
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        const walletAddr = (userRecord as any)?.avalancheL1Address || userRecord?.walletAddress;
        if (!walletAddr) {
          return res.status(400).json({
            error: 'User does not have a wallet address',
            userId,
            score,
          });
        }

        // Push to blockchain
        const txHash = await oracle.pushSingleScore(walletAddr, score, `manual_sync_${userId}`);

        console.log(
          `[ReputationRoutes] User ${userId} score synced to chain: ${score} (tx: ${txHash})`
        );

        return res.json({
          success: true,
          userId,
          score,
          breakdown,
          txHash,
          walletAddress: walletAddr,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Single user sync error:', error);
        return res.status(500).json({ error: 'Failed to sync user score' });
      }
    }
  );

  /**
   * GET /api/admin/reputation/sync-logs
   * View recent sync logs (admin only).
   */
  app.get(
    '/api/admin/reputation/sync-logs',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const logs = await db
          .select()
          .from(reputationSyncLog)
          .orderBy(desc(reputationSyncLog.createdAt))
          .limit(limit);

        return res.json({ logs });
      } catch (error) {
        console.error('[ReputationRoutes] Sync logs error:', error);
        return res.status(500).json({ error: 'Failed to fetch sync logs' });
      }
    }
  );

  /**
   * GET /api/admin/reputation/stats
   * Overview stats for the reputation system (admin only).
   */
  app.get(
    '/api/admin/reputation/stats',
    authenticateUser,
    requireFandomlyAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const stats = await db.execute(sql`
          SELECT
            COUNT(*) as total_users,
            COUNT(CASE WHEN off_chain_score >= 500 THEN 1 END) as staking_eligible,
            COUNT(CASE WHEN off_chain_score >= 750 THEN 1 END) as token_eligible,
            ROUND(AVG(off_chain_score)) as avg_score,
            MAX(off_chain_score) as max_score,
            COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_count,
            COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_count,
            COUNT(CASE WHEN pending_threshold_sync = true THEN 1 END) as pending_thresholds
          FROM reputation_scores
        `);

        const row = (stats as { rows: Record<string, unknown>[] }).rows?.[0] || {};
        return res.json({
          totalUsers: Number(row.total_users) || 0,
          stakingEligible: Number(row.staking_eligible) || 0,
          tokenEligible: Number(row.token_eligible) || 0,
          avgScore: Number(row.avg_score) || 0,
          maxScore: Number(row.max_score) || 0,
          syncedCount: Number(row.synced_count) || 0,
          pendingCount: Number(row.pending_count) || 0,
          failedCount: Number(row.failed_count) || 0,
          pendingThresholds: Number(row.pending_thresholds) || 0,
          thresholds: REPUTATION_THRESHOLDS,
        });
      } catch (error) {
        console.error('[ReputationRoutes] Stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }
  );
}
