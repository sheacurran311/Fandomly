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
import { reputationScores, reputationSyncLog } from '@shared/schema';
import { REPUTATION_THRESHOLDS } from '@shared/blockchain-config';

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
          signalWeights: Object.fromEntries(
            Object.entries(SIGNAL_CONFIG).map(([key, config]) => [
              key,
              { weight: config.weight, description: config.description },
            ])
          ),
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
        signalWeights: Object.fromEntries(
          Object.entries(SIGNAL_CONFIG).map(([key, config]) => [
            key,
            { weight: config.weight, description: config.description },
          ])
        ),
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
