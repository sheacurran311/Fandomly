import { Express } from "express";
import { db } from '../../db';
import { users, fanPrograms, campaigns, platformTaskCompletions, platformPointsTransactions, pointTransactions, rewardRedemptions, loyaltyPrograms } from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { platformPointsService } from '../../services/points/platform-points-service';

export function registerFanDashboardRoutes(app: Express) {
  /**
   * GET /api/fan/dashboard/stats
   * Get comprehensive fan dashboard statistics
   */
  app.get("/api/fan/dashboard/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get platform points balance
      const platformPoints = await platformPointsService.getBalance(userId);

      // Get creator points (sum of all creator-specific point balances)
      const creatorPointsResult = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${pointTransactions.points}), 0)`,
        })
        .from(pointTransactions)
        .where(
          and(
            sql`${pointTransactions.fanProgramId} IN (
              SELECT id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
            )`,
            eq(pointTransactions.type, 'earned')
          )
        );

      const creatorPoints = Number(creatorPointsResult[0]?.totalPoints || 0);

      // Calculate points spent
      const spentPointsResult = await db
        .select({
          totalSpent: sql<number>`COALESCE(SUM(${pointTransactions.points}), 0)`,
        })
        .from(pointTransactions)
        .where(
          and(
            sql`${pointTransactions.fanProgramId} IN (
              SELECT id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
            )`,
            eq(pointTransactions.type, 'spent')
          )
        );

      const spentPoints = Number(spentPointsResult[0]?.totalSpent || 0);
      const netCreatorPoints = creatorPoints - spentPoints;

      // Get following count (number of creator programs joined)
      const followingResult = await db
        .select({ count: count() })
        .from(fanPrograms)
        .where(eq(fanPrograms.fanId, userId));

      const followingCount = followingResult[0]?.count || 0;

      // Get active campaigns count
      const activeCampaignsResult = await db
        .select({ count: count() })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'active'),
            sql`${campaigns.tenantId} IN (
              SELECT tenant_id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
            )`
          )
        );

      const activeCampaignsCount = activeCampaignsResult[0]?.count || 0;

      // Get rewards earned count
      const rewardsResult = await db
        .select({ count: count() })
        .from(rewardRedemptions)
        .where(eq(rewardRedemptions.fanId, userId));

      const rewardsEarned = rewardsResult[0]?.count || 0;

      // Calculate points change (last 7 days vs previous 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Recent points (last 7 days)
      const recentPointsResult = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${pointTransactions.points}), 0)`,
        })
        .from(pointTransactions)
        .where(
          and(
            sql`${pointTransactions.fanProgramId} IN (
              SELECT id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
            )`,
            eq(pointTransactions.type, 'earned'),
            sql`${pointTransactions.createdAt} >= ${sevenDaysAgo}`
          )
        );

      const recentPoints = Number(recentPointsResult[0]?.totalPoints || 0);

      // Previous period points (days 8-14)
      const previousPointsResult = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${pointTransactions.points}), 0)`,
        })
        .from(pointTransactions)
        .where(
          and(
            sql`${pointTransactions.fanProgramId} IN (
              SELECT id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
            )`,
            eq(pointTransactions.type, 'earned'),
            sql`${pointTransactions.createdAt} >= ${fourteenDaysAgo}`,
            sql`${pointTransactions.createdAt} < ${sevenDaysAgo}`
          )
        );

      const previousPoints = Number(previousPointsResult[0]?.totalPoints || 0);

      // Calculate percentage change
      let pointsChange = null;
      if (previousPoints > 0) {
        const changePercent = ((recentPoints - previousPoints) / previousPoints) * 100;
        pointsChange = {
          value: Math.abs(Math.round(changePercent)),
          type: changePercent >= 0 ? 'increase' : 'decrease',
          period: 'vs last week',
        };
      } else if (recentPoints > 0) {
        pointsChange = {
          value: 100,
          type: 'increase',
          period: 'new activity',
        };
      }

      res.json({
        platformPoints,
        creatorPoints: netCreatorPoints,
        totalPoints: platformPoints + netCreatorPoints,
        pointsChange,
        followingCount,
        activeCampaignsCount,
        rewardsEarned,
      });
    } catch (error) {
      console.error("Error fetching fan dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch fan dashboard stats" });
    }
  });

  /**
   * GET /api/fan/dashboard/recent-activity
   * Get recent activity for the fan
   */
  app.get("/api/fan/dashboard/recent-activity", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // Get recent point transactions
      const recentTransactions = await db.query.pointTransactions.findMany({
        where: sql`${pointTransactions.fanProgramId} IN (
          SELECT id FROM ${fanPrograms} WHERE ${fanPrograms.fanId} = ${userId}
        )`,
        orderBy: sql`${pointTransactions.createdAt} DESC`,
        limit,
      });

      // Get recent platform task completions
      const recentPlatformCompletions = await db.query.platformTaskCompletions.findMany({
        where: eq(platformTaskCompletions.userId, userId),
        orderBy: sql`${platformTaskCompletions.createdAt} DESC`,
        limit: 5,
        with: {
          task: {
            columns: {
              name: true,
              description: true,
            },
          },
        },
      });

      // Get recent reward redemptions
      const recentRedemptions = await db.query.rewardRedemptions.findMany({
        where: eq(rewardRedemptions.fanId, userId),
        orderBy: sql`${rewardRedemptions.redeemedAt} DESC`,
        limit: 5,
      });

      // Combine and sort all activities
      const allActivities = [
        ...recentTransactions.map(t => ({
          type: 'points',
          data: t,
          timestamp: t.createdAt,
        })),
        ...recentPlatformCompletions.map(c => ({
          type: 'platform_task',
          data: c,
          timestamp: c.createdAt,
        })),
        ...recentRedemptions.map(r => ({
          type: 'reward',
          data: r,
          timestamp: r.redeemedAt,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        activities: allActivities.slice(0, limit),
        count: allActivities.length,
      });
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ error: "Failed to fetch recent activity" });
    }
  });

  /**
   * GET /api/fan/dashboard/points-history
   * Get points history chart data with timeframe support
   * Query params: timeframe=daily|weekly|monthly|yearly
   */
  app.get("/api/fan/dashboard/points-history", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const timeframe = (req.query.timeframe as string) || 'weekly';
      
      // Determine date grouping and range based on timeframe
      let dateFormat: string;
      let daysBack: number;
      let groupByFormat: string;
      
      switch (timeframe) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          daysBack = 30;
          groupByFormat = 'DATE(%s)';
          break;
        case 'weekly':
          dateFormat = 'YYYY-"W"IW';
          daysBack = 90;
          groupByFormat = 'DATE_TRUNC(\'week\', %s)';
          break;
        case 'monthly':
          dateFormat = 'YYYY-MM';
          daysBack = 365;
          groupByFormat = 'DATE_TRUNC(\'month\', %s)';
          break;
        case 'yearly':
          dateFormat = 'YYYY';
          daysBack = 1095; // 3 years
          groupByFormat = 'DATE_TRUNC(\'year\', %s)';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          daysBack = 30;
          groupByFormat = 'DATE(%s)';
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Platform points history
      const platformPointsHistory = await db.execute(sql`
        SELECT 
          TO_CHAR(${sql.raw(groupByFormat.replace('%s', 'created_at'))}, ${dateFormat}) as period,
          COALESCE(SUM(points), 0) as points
        FROM platform_points_transactions
        WHERE user_id = ${userId}
          AND created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(groupByFormat.replace('%s', 'created_at'))}
        ORDER BY period
      `);

      // Creator points history
      const creatorPointsHistory = await db.execute(sql`
        SELECT 
          TO_CHAR(${sql.raw(groupByFormat.replace('%s', 'pt.created_at'))}, ${dateFormat}) as period,
          COALESCE(SUM(CASE WHEN pt.type = 'earned' THEN pt.points ELSE -pt.points END), 0) as points
        FROM ${pointTransactions} pt
        WHERE pt.fan_program_id IN (
          SELECT id FROM ${fanPrograms} WHERE fan_id = ${userId}
        )
        AND pt.created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(groupByFormat.replace('%s', 'pt.created_at'))}
        ORDER BY period
      `);

      res.json({
        timeframe,
        platformPoints: platformPointsHistory.rows || [],
        creatorPoints: creatorPointsHistory.rows || [],
      });
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ error: "Failed to fetch points history" });
    }
  });

  /**
   * GET /api/fan/dashboard/task-completion-stats
   * Get task completion statistics with timeframe support
   */
  app.get("/api/fan/dashboard/task-completion-stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const timeframe = (req.query.timeframe as string) || 'weekly';
      
      let dateFormat: string;
      let daysBack: number;
      let groupByFormat: string;
      
      switch (timeframe) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          daysBack = 30;
          groupByFormat = 'DATE(%s)';
          break;
        case 'weekly':
          dateFormat = 'YYYY-"W"IW';
          daysBack = 90;
          groupByFormat = 'DATE_TRUNC(\'week\', %s)';
          break;
        case 'monthly':
          dateFormat = 'YYYY-MM';
          daysBack = 365;
          groupByFormat = 'DATE_TRUNC(\'month\', %s)';
          break;
        case 'yearly':
          dateFormat = 'YYYY';
          daysBack = 1095;
          groupByFormat = 'DATE_TRUNC(\'year\', %s)';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          daysBack = 30;
          groupByFormat = 'DATE(%s)';
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Platform task completions over time
      const completionStats = await db.execute(sql`
        SELECT 
          TO_CHAR(${sql.raw(groupByFormat.replace('%s', 'created_at'))}, ${dateFormat}) as period,
          COUNT(*) as completed
        FROM ${platformTaskCompletions}
        WHERE user_id = ${userId}
          AND created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(groupByFormat.replace('%s', 'created_at'))}
        ORDER BY period
      `);

      res.json({
        timeframe,
        completions: completionStats.rows || [],
      });
    } catch (error) {
      console.error("Error fetching task completion stats:", error);
      res.status(500).json({ error: "Failed to fetch task completion stats" });
    }
  });

  /**
   * GET /api/fan/points/breakdown
   * Get points breakdown by source (platform, tasks, campaigns, etc.)
   */
  app.get("/api/fan/points/breakdown", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Platform points by source
      const platformBreakdown = await db.execute(sql`
        SELECT 
          source,
          COALESCE(SUM(points), 0) as total_points
        FROM platform_points_transactions
        WHERE user_id = ${userId}
        GROUP BY source
      `);

      // Creator points by program
      const creatorBreakdown = await db.execute(sql`
        SELECT 
          lp.name as source,
          COALESCE(SUM(CASE WHEN pt.type = 'earned' THEN pt.points ELSE 0 END), 0) as total_points
        FROM ${pointTransactions} pt
        JOIN ${fanPrograms} fp ON pt.fan_program_id = fp.id
        JOIN ${loyaltyPrograms} lp ON fp.program_id = lp.id
        WHERE fp.fan_id = ${userId}
        GROUP BY lp.name
      `);

      res.json({
        platformPoints: platformBreakdown.rows || [],
        creatorPoints: creatorBreakdown.rows || [],
      });
    } catch (error) {
      console.error("Error fetching points breakdown:", error);
      res.status(500).json({ error: "Failed to fetch points breakdown" });
    }
  });

  /**
   * GET /api/fan/achievements/timeline
   * Get achievement completion timeline
   */
  app.get("/api/fan/achievements/timeline", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get completed achievements with timeline
      const completedAchievements = await db.execute(sql`
        SELECT 
          ua.achievement_id,
          ua.earned_at,
          ua.points_awarded,
          a.name,
          a.description,
          a.category
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ${userId}
          AND ua.status = 'completed'
        ORDER BY ua.earned_at DESC
        LIMIT 50
      `);

      res.json({
        achievements: completedAchievements.rows || [],
      });
    } catch (error) {
      console.error("Error fetching achievement timeline:", error);
      res.status(500).json({ error: "Failed to fetch achievement timeline" });
    }
  });
}

