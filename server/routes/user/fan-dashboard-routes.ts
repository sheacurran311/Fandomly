import { Express } from "express";
import { db } from '../../db';
import { users, fanPrograms, campaigns, platformTaskCompletions, platformPointsTransactions, pointTransactions, rewardRedemptions, loyaltyPrograms, taskCompletions } from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { platformPointsService } from '../../services/points/platform-points-service';
import { getSafeDateGroupConfig } from '../../utils/safe-sql';

export function registerFanDashboardRoutes(app: Express) {
  /**
   * GET /api/fan/dashboard/stats
   * Get comprehensive fan dashboard statistics
   */
  app.get("/api/fan/dashboard/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Debug: Log user ID and check fan_programs enrollment
      console.log('[Fan Stats Debug] userId:', userId);
      
      const userFanPrograms = await db.select().from(fanPrograms).where(eq(fanPrograms.fanId, userId));
      console.log('[Fan Stats Debug] fan_programs for user:', userFanPrograms.length, 'records', userFanPrograms.map(fp => ({ id: fp.id, programId: fp.programId })));
      
      // Debug: Check all point_transactions in the system
      const allPointTx = await db.select().from(pointTransactions).limit(20);
      console.log('[Fan Stats Debug] point_transactions sample:', allPointTx.length, 'records');
      allPointTx.forEach(tx => {
        console.log(`  - tx.id: ${tx.id}, fanProgramId: ${tx.fanProgramId}, points: ${tx.points}, type: ${tx.type}, source: ${tx.source}`);
      });

      // Get platform points balance from platform_points_transactions table (unified source)
      // This ensures consistency with charts and leaderboards that also query this table
      const platformPointsResult = await db.execute(sql`
        SELECT COALESCE(SUM(points), 0) as total
        FROM platform_points_transactions
        WHERE user_id = ${userId}
      `);
      const platformPointsFromTable = Number((platformPointsResult.rows[0] as any)?.total || 0);
      
      // Also get legacy balance from profile_data for comparison/fallback
      const platformPointsFromProfile = await platformPointsService.getBalance(userId);
      
      // Use the higher value (handles case where legacy data exists but not in table yet)
      const platformPoints = Math.max(platformPointsFromTable, platformPointsFromProfile);
      console.log('[Fan Stats Debug] platformPoints - fromTable:', platformPointsFromTable, 'fromProfile:', platformPointsFromProfile, 'using:', platformPoints);

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
      console.log('[Fan Stats Debug] creatorPoints (earned):', creatorPoints);

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

      // spentPoints is already negative (e.g., -50) because points column stores negative values for 'spent' type
      const spentPoints = Number(spentPointsResult[0]?.totalSpent || 0);
      const netCreatorPoints = creatorPoints + spentPoints; // Add because spentPoints is already negative

      // Get programs enrolled count (number of program enrollments)
      const programsEnrolledResult = await db
        .select({ count: count() })
        .from(fanPrograms)
        .where(eq(fanPrograms.fanId, userId));

      const programsEnrolledCount = programsEnrolledResult[0]?.count || 0;

      // Get distinct creators enrolled count
      const creatorsEnrolledResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${loyaltyPrograms.creatorId})` })
        .from(fanPrograms)
        .innerJoin(loyaltyPrograms, eq(fanPrograms.programId, loyaltyPrograms.id))
        .where(eq(fanPrograms.fanId, userId));

      const creatorsEnrolledCount = Number(creatorsEnrolledResult[0]?.count || 0);

      // Get active campaigns count (campaigns available from enrolled creators)
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
        followingCount: creatorsEnrolledCount, // backward compat: now returns distinct creators
        creatorsEnrolledCount,
        programsEnrolledCount,
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
      ].sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());

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
      
      // Use safe date grouping config to prevent SQL injection
      const dateConfig = getSafeDateGroupConfig(timeframe);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateConfig.daysBack);

      // Platform points history - using safe SQL expressions
      const platformPointsHistory = await db.execute(sql`
        SELECT 
          ${sql.raw(dateConfig.toCharExpr('created_at'))} as period,
          COALESCE(SUM(points), 0) as points
        FROM platform_points_transactions
        WHERE user_id = ${userId}
          AND created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(dateConfig.groupByExpr('created_at'))}
        ORDER BY period
      `);

      // Creator points history - using safe SQL expressions
      // Points are already stored correctly: positive for earned, negative for spent
      // So we just SUM directly without any CASE transformation
      const creatorPointsHistory = await db.execute(sql`
        SELECT 
          ${sql.raw(dateConfig.toCharExpr('pt.created_at'))} as period,
          COALESCE(SUM(pt.points), 0) as points
        FROM ${pointTransactions} pt
        WHERE pt.fan_program_id IN (
          SELECT id FROM ${fanPrograms} WHERE fan_id = ${userId}
        )
        AND pt.created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(dateConfig.groupByExpr('pt.created_at'))}
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
      
      // Use safe date grouping config to prevent SQL injection
      const dateConfig = getSafeDateGroupConfig(timeframe);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateConfig.daysBack);

      // Platform task completions over time - using safe SQL expressions
      const platformCompletionStats = await db.execute(sql`
        SELECT 
          ${sql.raw(dateConfig.toCharExpr('created_at'))} as period,
          COUNT(*) as completed
        FROM ${platformTaskCompletions}
        WHERE user_id = ${userId}
          AND created_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(dateConfig.groupByExpr('created_at'))}
        ORDER BY period
      `);

      // Creator task completions over time (from task_completions table) - using safe SQL expressions
      const creatorCompletionStats = await db.execute(sql`
        SELECT 
          ${sql.raw(dateConfig.toCharExpr('completed_at'))} as period,
          COUNT(*) as completed
        FROM ${taskCompletions}
        WHERE user_id = ${userId}
          AND status = 'completed'
          AND completed_at IS NOT NULL
          AND completed_at >= ${startDate.toISOString()}
        GROUP BY ${sql.raw(dateConfig.groupByExpr('completed_at'))}
        ORDER BY period
      `);

      // Combine platform and creator completions by period
      const combinedMap = new Map<string, number>();
      
      // Add platform completions
      for (const row of (platformCompletionStats.rows || []) as any[]) {
        const existing = combinedMap.get(row.period) || 0;
        combinedMap.set(row.period, existing + Number(row.completed));
      }
      
      // Add creator completions
      for (const row of (creatorCompletionStats.rows || []) as any[]) {
        const existing = combinedMap.get(row.period) || 0;
        combinedMap.set(row.period, existing + Number(row.completed));
      }

      // Convert map to sorted array
      const completions = Array.from(combinedMap.entries())
        .map(([period, completed]) => ({ period, completed }))
        .sort((a, b) => a.period.localeCompare(b.period));

      res.json({
        timeframe,
        completions,
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

  /**
   * POST /api/fan/admin/backfill-platform-points
   * One-time script to backfill platform_points_transactions from profile_data
   * This ensures all existing platform points appear in charts and leaderboards
   */
  app.post("/api/fan/admin/backfill-platform-points", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all users with fandomlyPoints in profile_data
      const usersWithPoints = await db.execute(sql`
        SELECT id, username, profile_data
        FROM users
        WHERE (profile_data->>'fandomlyPoints')::int > 0
      `);

      let backfilledCount = 0;
      const results: any[] = [];

      for (const user of (usersWithPoints.rows || []) as any[]) {
        const userId = user.id;
        const profilePoints = Number(user.profile_data?.fandomlyPoints || 0);
        
        // Check if user already has records in platform_points_transactions
        const existingTxResult = await db.execute(sql`
          SELECT COALESCE(SUM(points), 0) as total
          FROM platform_points_transactions
          WHERE user_id = ${userId}
        `);
        const existingTotal = Number((existingTxResult.rows[0] as any)?.total || 0);
        
        // If profile_data has more points than the table, we need to backfill the difference
        const difference = profilePoints - existingTotal;
        
        if (difference > 0) {
          // Insert a backfill transaction for the difference
          await db.insert(platformPointsTransactions).values({
            userId,
            points: difference,
            source: 'backfill_from_profile_data',
            description: `Backfilled ${difference} platform points from legacy profile_data storage`,
          });
          
          backfilledCount++;
          results.push({
            userId,
            username: user.username,
            profilePoints,
            existingTotal,
            backfilledAmount: difference,
          });
          
          console.log(`[Backfill] User ${user.username}: backfilled ${difference} points (profile: ${profilePoints}, table: ${existingTotal})`);
        }
      }

      res.json({
        success: true,
        message: `Backfilled platform points for ${backfilledCount} users`,
        backfilledCount,
        details: results,
      });
    } catch (error) {
      console.error("Error backfilling platform points:", error);
      res.status(500).json({ error: "Failed to backfill platform points" });
    }
  });
}

