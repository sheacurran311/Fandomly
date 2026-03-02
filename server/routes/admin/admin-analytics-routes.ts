/**
 * Admin Analytics Routes
 *
 * Dedicated analytics endpoints separated from admin-routes.ts.
 * All endpoints require fandomly_admin role.
 */

import { type Express, type Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import {
  authenticateUser,
  requireFandomlyAdmin,
  type AuthenticatedRequest,
} from '../../middleware/rbac';

function parsePeriodDays(period: string | undefined): number {
  switch (period) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '365d':
      return 365;
    default:
      return 30;
  }
}

export function registerAdminAnalyticsRoutes(app: Express) {
  const adminAuth = [authenticateUser, requireFandomlyAdmin];

  /**
   * GET /api/admin/analytics/users?period=30d
   * User analytics: growth time-series, auth provider breakdown.
   */
  app.get(
    '/api/admin/analytics/users',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parsePeriodDays(req.query.period as string);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [growthResult, providerResult, totalResult] = await Promise.all([
          // Daily signups
          db.execute(sql`
          SELECT
            date_trunc('day', created_at)::date as date,
            COUNT(*) as signups,
            COUNT(CASE WHEN user_type = 'fan' THEN 1 END) as fans,
            COUNT(CASE WHEN user_type = 'creator' THEN 1 END) as creators
          FROM users
          WHERE created_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `),
          // Auth provider breakdown
          db.execute(sql`
          SELECT
            COALESCE(primary_auth_provider, 'unknown') as provider,
            COUNT(*) as count
          FROM users
          GROUP BY 1
          ORDER BY count DESC
        `),
          // Total active counts (users active in last 1/7/30 days)
          db.execute(sql`
          SELECT
            COUNT(CASE WHEN last_active_at >= NOW() - INTERVAL '1 day' THEN 1 END) as dau,
            COUNT(CASE WHEN last_active_at >= NOW() - INTERVAL '7 days' THEN 1 END) as wau,
            COUNT(CASE WHEN last_active_at >= NOW() - INTERVAL '30 days' THEN 1 END) as mau,
            COUNT(*) as total
          FROM users
        `),
        ]);

        const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows || [];
        const row = (r: unknown) => rows(r)[0] || {};

        res.json({
          growth: rows(growthResult).map((r) => ({
            date: String(r.date),
            signups: Number(r.signups) || 0,
            fans: Number(r.fans) || 0,
            creators: Number(r.creators) || 0,
          })),
          providers: rows(providerResult).map((r) => ({
            provider: String(r.provider),
            count: Number(r.count) || 0,
          })),
          totals: {
            dau: Number(row(totalResult).dau) || 0,
            wau: Number(row(totalResult).wau) || 0,
            mau: Number(row(totalResult).mau) || 0,
            total: Number(row(totalResult).total) || 0,
          },
        });
      } catch (error: unknown) {
        console.error('[AdminAnalytics] User analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch user analytics' });
      }
    }
  );

  /**
   * GET /api/admin/analytics/tasks?period=30d
   * Task analytics: completions by platform, by verification tier, top task types.
   */
  app.get(
    '/api/admin/analytics/tasks',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parsePeriodDays(req.query.period as string);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [byPlatform, byTier, byType, dailyCompletions] = await Promise.all([
          // Completions by platform
          db.execute(sql`
          SELECT t.platform, COUNT(tc.id) as completions
          FROM task_completions tc
          JOIN tasks t ON t.id = tc.task_id
          WHERE tc.status = 'completed' AND tc.completed_at >= ${since}
          GROUP BY t.platform
          ORDER BY completions DESC
        `),
          // By verification tier
          db.execute(sql`
          SELECT
            COALESCE(tc.verification_tier, 'unknown') as tier,
            COUNT(*) as completions,
            COUNT(CASE WHEN tc.verification_method IS NOT NULL THEN 1 END) as verified
          FROM task_completions tc
          WHERE tc.status = 'completed' AND tc.completed_at >= ${since}
          GROUP BY 1
          ORDER BY completions DESC
        `),
          // Top task types
          db.execute(sql`
          SELECT t.task_type, COUNT(tc.id) as completions
          FROM task_completions tc
          JOIN tasks t ON t.id = tc.task_id
          WHERE tc.status = 'completed' AND tc.completed_at >= ${since}
          GROUP BY t.task_type
          ORDER BY completions DESC
          LIMIT 10
        `),
          // Daily completions trend
          db.execute(sql`
          SELECT
            date_trunc('day', completed_at)::date as date,
            COUNT(*) as completions
          FROM task_completions
          WHERE status = 'completed' AND completed_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `),
        ]);

        const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows || [];

        res.json({
          byPlatform: rows(byPlatform).map((r) => ({
            platform: String(r.platform),
            completions: Number(r.completions) || 0,
          })),
          byTier: rows(byTier).map((r) => ({
            tier: String(r.tier),
            completions: Number(r.completions) || 0,
            verified: Number(r.verified) || 0,
          })),
          byType: rows(byType).map((r) => ({
            taskType: String(r.task_type),
            completions: Number(r.completions) || 0,
          })),
          daily: rows(dailyCompletions).map((r) => ({
            date: String(r.date),
            completions: Number(r.completions) || 0,
          })),
        });
      } catch (error: unknown) {
        console.error('[AdminAnalytics] Task analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch task analytics' });
      }
    }
  );

  /**
   * GET /api/admin/analytics/social
   * Social platform connection stats.
   */
  app.get(
    '/api/admin/analytics/social',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const [platformCounts, recentTrend] = await Promise.all([
          // Connections per platform
          db.execute(sql`
          SELECT platform, COUNT(*) as connections
          FROM social_connections
          GROUP BY platform
          ORDER BY connections DESC
        `),
          // Last 30 days trend
          db.execute(sql`
          SELECT
            date_trunc('day', created_at)::date as date,
            COUNT(*) as connections
          FROM social_connections
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY 1
          ORDER BY 1
        `),
        ]);

        const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows || [];

        res.json({
          platforms: rows(platformCounts).map((r) => ({
            platform: String(r.platform),
            connections: Number(r.connections) || 0,
          })),
          trend: rows(recentTrend).map((r) => ({
            date: String(r.date),
            connections: Number(r.connections) || 0,
          })),
        });
      } catch (error: unknown) {
        console.error('[AdminAnalytics] Social analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch social analytics' });
      }
    }
  );

  /**
   * GET /api/admin/analytics/blockchain
   * Reputation score distribution and on-chain sync stats.
   */
  app.get(
    '/api/admin/analytics/blockchain',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const [distribution, syncStats] = await Promise.all([
          // Score distribution in 100-point buckets
          db.execute(sql`
          SELECT
            FLOOR(off_chain_score / 100) * 100 as bucket_start,
            COUNT(*) as count
          FROM reputation_scores
          GROUP BY 1
          ORDER BY 1
        `),
          // Sync stats
          db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced,
            COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed,
            ROUND(AVG(off_chain_score)) as avg_score,
            COUNT(CASE WHEN off_chain_score >= 500 THEN 1 END) as staking_eligible,
            COUNT(CASE WHEN off_chain_score >= 750 THEN 1 END) as token_eligible
          FROM reputation_scores
        `),
        ]);

        const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows || [];
        const row = (r: unknown) => rows(r)[0] || {};
        const s = row(syncStats);

        res.json({
          distribution: rows(distribution).map((r) => ({
            range: `${Number(r.bucket_start)}-${Number(r.bucket_start) + 99}`,
            count: Number(r.count) || 0,
          })),
          syncStats: {
            total: Number(s.total) || 0,
            synced: Number(s.synced) || 0,
            pending: Number(s.pending) || 0,
            failed: Number(s.failed) || 0,
            avgScore: Number(s.avg_score) || 0,
            stakingEligible: Number(s.staking_eligible) || 0,
            tokenEligible: Number(s.token_eligible) || 0,
          },
        });
      } catch (error: unknown) {
        console.error('[AdminAnalytics] Blockchain analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch blockchain analytics' });
      }
    }
  );
}
