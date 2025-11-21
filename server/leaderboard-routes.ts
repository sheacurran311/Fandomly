/**
 * Sprint 8: Leaderboard Routes
 * API endpoints for campaign, program, and platform leaderboards
 * CRITICAL: All data is real-time calculated from database views - NO mock data
 */

import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";
import { BadgeRewardsService } from "./badge-rewards-service";

export function registerLeaderboardRoutes(app: Express) {

  // ============================================
  // CAMPAIGN LEADERBOARDS
  // ============================================

  /**
   * GET /api/leaderboards/campaign/:campaignId
   * Get leaderboard for a specific campaign with time period filtering
   * Query params: period (all-time | week | month), limit (default: 100)
   */
  app.get("/api/leaderboards/campaign/:campaignId", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const period = req.query.period as string || 'all-time';
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // Select appropriate view based on time period
      let viewName = 'campaign_leaderboard';
      if (period === 'week') {
        viewName = 'campaign_leaderboard_week';
      } else if (period === 'month') {
        viewName = 'campaign_leaderboard_month';
      }

      // Query the materialized view for real-time data
      const leaderboard = await db.execute(sql`
        SELECT
          cl.campaign_id,
          cl.user_id,
          cl.username,
          cl.avatar,
          cl.points,
          cl.participation_count,
          cl.last_participation,
          cl.rank,
          cl.joined_at,
          -- Get rank change from history (yesterday vs today)
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM ${sql.raw(viewName)} cl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'campaign'
          AND rh.scope_id = cl.campaign_id
          AND rh.user_id = cl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE cl.campaign_id = ${campaignId}
        ORDER BY cl.rank
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // Get total participant count
      const totalResult = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as total
        FROM ${sql.raw(viewName)}
        WHERE campaign_id = ${campaignId}
      `);

      const total = totalResult.rows[0]?.total || 0;

      res.json({
        leaderboard: leaderboard.rows,
        pagination: {
          limit,
          offset,
          total: parseInt(total.toString())
        },
        period,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch campaign leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch campaign leaderboard' });
    }
  });

  /**
   * GET /api/leaderboards/campaign/:campaignId/user/:userId
   * Get specific user's rank and stats in a campaign
   */
  app.get("/api/leaderboards/campaign/:campaignId/user/:userId", async (req, res) => {
    try {
      const { campaignId, userId } = req.params;
      const period = req.query.period as string || 'all-time';

      let viewName = 'campaign_leaderboard';
      if (period === 'week') viewName = 'campaign_leaderboard_week';
      else if (period === 'month') viewName = 'campaign_leaderboard_month';

      const result = await db.execute(sql`
        SELECT
          cl.*,
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM ${sql.raw(viewName)} cl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'campaign'
          AND rh.scope_id = cl.campaign_id
          AND rh.user_id = cl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE cl.campaign_id = ${campaignId}
          AND cl.user_id = ${userId}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found in campaign leaderboard' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Failed to fetch user campaign rank:', error);
      res.status(500).json({ error: 'Failed to fetch user campaign rank' });
    }
  });

  // ============================================
  // PROGRAM LEADERBOARDS
  // ============================================

  /**
   * GET /api/leaderboards/program/:programId
   * Get leaderboard for a specific loyalty program
   * Query params: limit (default: 100), offset (default: 0)
   */
  app.get("/api/leaderboards/program/:programId", async (req, res) => {
    try {
      const { programId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // Query program leaderboard view
      const leaderboard = await db.execute(sql`
        SELECT
          pl.program_id,
          pl.user_id,
          pl.username,
          pl.avatar,
          pl.current_points,
          pl.total_points_earned,
          pl.current_tier,
          pl.joined_at,
          pl.rank,
          pl.current_rank,
          -- Get rank change from history
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM program_leaderboard pl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'program'
          AND rh.scope_id = pl.program_id
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE pl.program_id = ${programId}
        ORDER BY pl.rank
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // Get total participant count
      const totalResult = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as total
        FROM program_leaderboard
        WHERE program_id = ${programId}
      `);

      const total = totalResult.rows[0]?.total || 0;

      res.json({
        leaderboard: leaderboard.rows,
        pagination: {
          limit,
          offset,
          total: parseInt(total.toString())
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch program leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch program leaderboard' });
    }
  });

  /**
   * GET /api/leaderboards/program/:programId/user/:userId
   * Get specific user's rank in a program
   */
  app.get("/api/leaderboards/program/:programId/user/:userId", async (req, res) => {
    try {
      const { programId, userId } = req.params;

      const result = await db.execute(sql`
        SELECT
          pl.*,
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM program_leaderboard pl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'program'
          AND rh.scope_id = pl.program_id
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE pl.program_id = ${programId}
          AND pl.user_id = ${userId}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found in program leaderboard' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Failed to fetch user program rank:', error);
      res.status(500).json({ error: 'Failed to fetch user program rank' });
    }
  });

  // ============================================
  // PLATFORM LEADERBOARD
  // ============================================

  /**
   * GET /api/leaderboards/platform
   * Get platform-wide leaderboard based on Fandomly Points
   * Query params: period (all-time | week | month), limit (default: 100)
   */
  app.get("/api/leaderboards/platform", async (req, res) => {
    try {
      const period = req.query.period as string || 'all-time';
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // Select appropriate view based on time period
      let viewName = 'platform_leaderboard';
      if (period === 'week') {
        viewName = 'platform_leaderboard_week';
      } else if (period === 'month') {
        viewName = 'platform_leaderboard_month';
      }

      // Query the materialized view
      const leaderboard = await db.execute(sql`
        SELECT
          pl.user_id,
          pl.username,
          pl.avatar,
          pl.total_points,
          pl.transaction_count,
          pl.last_activity,
          pl.rank,
          -- Get rank change from history
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM ${sql.raw(viewName)} pl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'platform'
          AND rh.scope_id IS NULL
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        ORDER BY pl.rank
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // Get total participant count
      const totalResult = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as total
        FROM ${sql.raw(viewName)}
      `);

      const total = totalResult.rows[0]?.total || 0;

      res.json({
        leaderboard: leaderboard.rows,
        pagination: {
          limit,
          offset,
          total: parseInt(total.toString())
        },
        period,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch platform leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch platform leaderboard' });
    }
  });

  /**
   * GET /api/leaderboards/platform/user/:userId
   * Get specific user's platform rank
   */
  app.get("/api/leaderboards/platform/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const period = req.query.period as string || 'all-time';

      let viewName = 'platform_leaderboard';
      if (period === 'week') viewName = 'platform_leaderboard_week';
      else if (period === 'month') viewName = 'platform_leaderboard_month';

      const result = await db.execute(sql`
        SELECT
          pl.*,
          COALESCE(rh.rank_change, 0) AS rank_change,
          COALESCE(rh.points_change, 0) AS points_change
        FROM ${sql.raw(viewName)} pl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'platform'
          AND rh.scope_id IS NULL
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE pl.user_id = ${userId}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found in platform leaderboard' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Failed to fetch user platform rank:', error);
      res.status(500).json({ error: 'Failed to fetch user platform rank' });
    }
  });

  // ============================================
  // TOP PERFORMERS (for badges/rewards)
  // ============================================

  /**
   * GET /api/leaderboards/top-performers
   * Get top performers across all leaderboards for badge rewards
   * Query params: type (platform | campaign | program), limit (default: 10)
   */
  app.get("/api/leaderboards/top-performers", async (req, res) => {
    try {
      const type = req.query.type as string || 'platform';
      const limit = parseInt(req.query.limit as string) || 10;
      const scopeId = req.query.scopeId as string; // campaign_id or program_id

      let result;

      if (type === 'platform') {
        result = await db.execute(sql`
          SELECT * FROM top_platform_leaders
          LIMIT ${limit}
        `);
      } else if (type === 'campaign' && scopeId) {
        result = await db.execute(sql`
          SELECT * FROM top_campaign_leaders
          WHERE campaign_id = ${scopeId}
          LIMIT ${limit}
        `);
      } else if (type === 'program' && scopeId) {
        result = await db.execute(sql`
          SELECT * FROM top_program_leaders
          WHERE program_id = ${scopeId}
          LIMIT ${limit}
        `);
      } else {
        return res.status(400).json({ error: 'Invalid type or missing scopeId' });
      }

      res.json({
        topPerformers: result.rows,
        type,
        scopeId,
        limit
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch top performers:', error);
      res.status(500).json({ error: 'Failed to fetch top performers' });
    }
  });

  // ============================================
  // USER DASHBOARD (all ranks)
  // ============================================

  /**
   * GET /api/leaderboards/user/:userId/all-ranks
   * Get user's ranks across all campaigns, programs, and platform
   */
  app.get("/api/leaderboards/user/:userId/all-ranks", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      // Verify user can only access their own ranks (unless admin)
      if (req.user?.id !== userId && req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get platform rank
      const platformRank = await db.execute(sql`
        SELECT
          pl.*,
          COALESCE(rh.rank_change, 0) AS rank_change
        FROM platform_leaderboard pl
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'platform'
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE pl.user_id = ${userId}
      `);

      // Get all campaign ranks
      const campaignRanks = await db.execute(sql`
        SELECT
          cl.*,
          c.name AS campaign_name,
          COALESCE(rh.rank_change, 0) AS rank_change
        FROM campaign_leaderboard cl
        INNER JOIN campaigns c ON cl.campaign_id = c.id
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'campaign'
          AND rh.scope_id = cl.campaign_id
          AND rh.user_id = cl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE cl.user_id = ${userId}
        ORDER BY cl.rank
      `);

      // Get all program ranks
      const programRanks = await db.execute(sql`
        SELECT
          pl.*,
          lp.name AS program_name,
          COALESCE(rh.rank_change, 0) AS rank_change
        FROM program_leaderboard pl
        INNER JOIN loyalty_programs lp ON pl.program_id = lp.id
        LEFT JOIN leaderboard_rank_history rh
          ON rh.leaderboard_type = 'program'
          AND rh.scope_id = pl.program_id
          AND rh.user_id = pl.user_id
          AND rh.snapshot_date = CURRENT_DATE
        WHERE pl.user_id = ${userId}
        ORDER BY pl.rank
      `);

      res.json({
        userId,
        platform: platformRank.rows[0] || null,
        campaigns: campaignRanks.rows,
        programs: programRanks.rows
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch user ranks:', error);
      res.status(500).json({ error: 'Failed to fetch user ranks' });
    }
  });

  // ============================================
  // ADMIN: MANUAL REFRESH
  // ============================================

  /**
   * POST /api/leaderboards/refresh
   * Manually trigger leaderboard refresh (admin only)
   */
  app.post("/api/leaderboards/refresh", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow admins to manually refresh
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await db.execute(sql`SELECT refresh_leaderboards()`);

      res.json({
        success: true,
        message: 'Leaderboards refreshed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to refresh leaderboards:', error);
      res.status(500).json({ error: 'Failed to refresh leaderboards' });
    }
  });

  /**
   * POST /api/leaderboards/capture-snapshot
   * Manually trigger daily rank snapshot capture (admin only)
   */
  app.post("/api/leaderboards/capture-snapshot", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow admins to manually capture snapshots
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await db.execute(sql`SELECT capture_rank_snapshot()`);

      res.json({
        success: true,
        message: 'Rank snapshot captured successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to capture rank snapshot:', error);
      res.status(500).json({ error: 'Failed to capture rank snapshot' });
    }
  });

  // ============================================
  // BADGE REWARDS FOR TOP PERFORMERS (Sprint 8)
  // ============================================

  /**
   * POST /api/leaderboards/award-badges
   * Manually trigger badge rewards for all top performers (admin only)
   */
  app.post("/api/leaderboards/award-badges", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow admins to manually award badges
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const crossmintApiKey = process.env.CROSSMINT_API_KEY;
      if (!crossmintApiKey) {
        return res.status(500).json({ error: 'Crossmint API key not configured' });
      }

      const badgeService = new BadgeRewardsService(crossmintApiKey);
      const results = await badgeService.awardAllBadges();

      res.json({
        success: true,
        message: 'Badge rewards processed successfully',
        results: {
          platformBadges: results.platformBadges.length,
          campaignBadges: results.campaignBadges.length,
          programBadges: results.programBadges.length,
          total: results.platformBadges.length + results.campaignBadges.length + results.programBadges.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to award badges:', error);
      res.status(500).json({ error: 'Failed to award badges', details: error.message });
    }
  });

  /**
   * POST /api/leaderboards/award-platform-badges
   * Award badges to platform top performers (admin only)
   */
  app.post("/api/leaderboards/award-platform-badges", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const period = req.body.period as 'week' | 'month' | 'all-time' || 'week';
      const crossmintApiKey = process.env.CROSSMINT_API_KEY;

      if (!crossmintApiKey) {
        return res.status(500).json({ error: 'Crossmint API key not configured' });
      }

      const badgeService = new BadgeRewardsService(crossmintApiKey);
      const rewards = await badgeService.awardPlatformBadges(period);

      res.json({
        success: true,
        message: `Awarded ${rewards.length} platform badges for ${period}`,
        rewards,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to award platform badges:', error);
      res.status(500).json({ error: 'Failed to award platform badges', details: error.message });
    }
  });

  /**
   * POST /api/leaderboards/award-campaign-badges/:campaignId
   * Award badges to campaign top performers (admin only)
   */
  app.post("/api/leaderboards/award-campaign-badges/:campaignId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { campaignId } = req.params;
      const period = req.body.period as 'week' | 'month' | 'all-time' || 'all-time';
      const crossmintApiKey = process.env.CROSSMINT_API_KEY;

      if (!crossmintApiKey) {
        return res.status(500).json({ error: 'Crossmint API key not configured' });
      }

      const badgeService = new BadgeRewardsService(crossmintApiKey);
      const rewards = await badgeService.awardCampaignBadges(campaignId, period);

      res.json({
        success: true,
        message: `Awarded ${rewards.length} campaign badges`,
        rewards,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to award campaign badges:', error);
      res.status(500).json({ error: 'Failed to award campaign badges', details: error.message });
    }
  });

  /**
   * POST /api/leaderboards/award-program-badges/:programId
   * Award badges to program top performers (admin only)
   */
  app.post("/api/leaderboards/award-program-badges/:programId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { programId } = req.params;
      const crossmintApiKey = process.env.CROSSMINT_API_KEY;

      if (!crossmintApiKey) {
        return res.status(500).json({ error: 'Crossmint API key not configured' });
      }

      const badgeService = new BadgeRewardsService(crossmintApiKey);
      const rewards = await badgeService.awardProgramBadges(programId);

      res.json({
        success: true,
        message: `Awarded ${rewards.length} program badges`,
        rewards,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Failed to award program badges:', error);
      res.status(500).json({ error: 'Failed to award program badges', details: error.message });
    }
  });
}
