/**
 * Dashboard Stats Routes
 * Pre-aggregated dashboard statistics endpoints
 * Moves client-side aggregation logic to the backend for better performance
 */

import type { Express } from "express";
import { db } from '../../db';
import { 
  users, creators, fanPrograms, campaigns, loyaltyPrograms,
  platformTaskCompletions, taskCompletions, 
  platformPointsTransactions, pointTransactions,
  tenantMemberships, tasks, socialConnections
} from "@shared/schema";
import { eq, and, sql, count, desc, gte, sum } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';

export function registerDashboardStatsRoutes(app: Express) {
  /**
   * GET /api/dashboard/creator-stats
   * Pre-aggregated statistics for creator dashboard
   * Replaces multiple sequential API calls in use-creator-dashboard.ts
   */
  app.get("/api/dashboard/creator-stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get creator record
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      const tenantId = creator.tenantId;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Single aggregated query for core stats
      const [statsResult] = await db.execute(sql`
        WITH fan_stats AS (
          SELECT 
            COUNT(DISTINCT tm.user_id) as total_fans,
            COUNT(DISTINCT CASE WHEN tm.created_at >= ${thirtyDaysAgo.toISOString()} THEN tm.user_id END) as new_fans_30d
          FROM tenant_memberships tm
          WHERE tm.tenant_id = ${tenantId}
            AND tm.role = 'member'
        ),
        task_stats AS (
          SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN is_draft = false AND is_active = true THEN 1 END) as published_tasks
          FROM tasks
          WHERE creator_id = ${creator.id}
        ),
        completion_stats AS (
          SELECT 
            COUNT(*) as total_completions,
            COUNT(CASE WHEN tc.completed_at >= ${thirtyDaysAgo.toISOString()} THEN 1 END) as completions_30d,
            COALESCE(SUM(tc.points_earned), 0) as points_distributed
          FROM task_completions tc
          INNER JOIN tasks t ON tc.task_id = t.id
          WHERE t.creator_id = ${creator.id}
            AND tc.status = 'completed'
        ),
        campaign_stats AS (
          SELECT 
            COUNT(*) as total_campaigns,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns
          FROM campaigns
          WHERE creator_id = ${creator.id}
        ),
        program_stats AS (
          SELECT 
            COUNT(*) as total_programs,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published_programs
          FROM loyalty_programs
          WHERE creator_id = ${creator.id}
        )
        SELECT 
          fs.total_fans,
          fs.new_fans_30d,
          ts.total_tasks,
          ts.published_tasks,
          cs.total_completions,
          cs.completions_30d,
          cs.points_distributed,
          cas.total_campaigns,
          cas.active_campaigns,
          ps.total_programs,
          ps.published_programs
        FROM fan_stats fs, task_stats ts, completion_stats cs, campaign_stats cas, program_stats ps
      `);

      const stats = (statsResult as any).rows?.[0] || {};
      
      // Get social connections count
      const [socialResult] = await db
        .select({ count: count() })
        .from(socialConnections)
        .where(eq(socialConnections.userId, userId));
      
      // Get recent activity (last 10 completions)
      const recentCompletions = await db
        .select({
          id: taskCompletions.id,
          userId: taskCompletions.userId,
          taskId: taskCompletions.taskId,
          pointsEarned: taskCompletions.pointsEarned,
          completedAt: taskCompletions.completedAt,
          taskName: tasks.name,
        })
        .from(taskCompletions)
        .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
        .where(
          and(
            eq(tasks.creatorId, creator.id),
            eq(taskCompletions.status, 'completed')
          )
        )
        .orderBy(desc(taskCompletions.completedAt))
        .limit(10);

      res.json({
        creator: {
          id: creator.id,
          displayName: creator.displayName,
          tenantId: creator.tenantId,
        },
        stats: {
          fans: {
            total: parseInt(stats.total_fans) || 0,
            newLast30Days: parseInt(stats.new_fans_30d) || 0,
          },
          tasks: {
            total: parseInt(stats.total_tasks) || 0,
            published: parseInt(stats.published_tasks) || 0,
          },
          completions: {
            total: parseInt(stats.total_completions) || 0,
            last30Days: parseInt(stats.completions_30d) || 0,
          },
          points: {
            distributed: parseInt(stats.points_distributed) || 0,
          },
          campaigns: {
            total: parseInt(stats.total_campaigns) || 0,
            active: parseInt(stats.active_campaigns) || 0,
          },
          programs: {
            total: parseInt(stats.total_programs) || 0,
            published: parseInt(stats.published_programs) || 0,
          },
          socialConnections: socialResult?.count || 0,
        },
        recentActivity: recentCompletions,
      });
    } catch (error) {
      console.error("Error fetching creator stats:", error);
      res.status(500).json({ error: "Failed to fetch creator statistics" });
    }
  });

  /**
   * GET /api/dashboard/fan-stats
   * Pre-aggregated statistics for fan dashboard
   * Replaces multiple sequential API calls in use-fan-dashboard.ts
   */
  app.get("/api/dashboard/fan-stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Single aggregated query for fan stats
      const [statsResult] = await db.execute(sql`
        WITH program_stats AS (
          SELECT 
            COUNT(*) as programs_joined,
            COALESCE(SUM(fp.points_balance), 0) as total_creator_points
          FROM fan_programs fp
          WHERE fp.fan_id = ${userId}
        ),
        platform_stats AS (
          SELECT 
            COALESCE(SUM(CASE WHEN ppt.points > 0 THEN ppt.points ELSE 0 END), 0) as total_platform_points
          FROM platform_points_transactions ppt
          WHERE ppt.user_id = ${userId}
        ),
        task_completion_stats AS (
          SELECT 
            COUNT(*) as platform_tasks_completed
          FROM platform_task_completions ptc
          WHERE ptc.user_id = ${userId}
        ),
        creator_task_stats AS (
          SELECT 
            COUNT(*) as creator_tasks_completed,
            COUNT(CASE WHEN tc.completed_at >= ${thirtyDaysAgo.toISOString()} THEN 1 END) as tasks_completed_30d
          FROM task_completions tc
          WHERE tc.user_id = ${userId}
            AND tc.status = 'completed'
        ),
        membership_stats AS (
          SELECT COUNT(*) as communities_joined
          FROM tenant_memberships tm
          WHERE tm.user_id = ${userId}
            AND tm.role = 'member'
        )
        SELECT 
          ps.programs_joined,
          ps.total_creator_points,
          pls.total_platform_points,
          tcs.platform_tasks_completed,
          cts.creator_tasks_completed,
          cts.tasks_completed_30d,
          ms.communities_joined
        FROM program_stats ps, platform_stats pls, task_completion_stats tcs, creator_task_stats cts, membership_stats ms
      `);

      const stats = (statsResult as any).rows?.[0] || {};
      
      // Get user's joined programs with creator info
      const joinedPrograms = await db
        .select({
          programId: fanPrograms.programId,
          pointsBalance: fanPrograms.pointsBalance,
          tier: fanPrograms.tier,
          joinedAt: fanPrograms.createdAt,
          programName: loyaltyPrograms.name,
          creatorId: loyaltyPrograms.creatorId,
        })
        .from(fanPrograms)
        .innerJoin(loyaltyPrograms, eq(fanPrograms.programId, loyaltyPrograms.id))
        .where(eq(fanPrograms.fanId, userId))
        .limit(10);

      // Get recent point transactions
      const recentTransactions = await db
        .select({
          id: platformPointsTransactions.id,
          points: platformPointsTransactions.points,
          source: platformPointsTransactions.source,
          createdAt: platformPointsTransactions.createdAt,
        })
        .from(platformPointsTransactions)
        .where(eq(platformPointsTransactions.userId, userId))
        .orderBy(desc(platformPointsTransactions.createdAt))
        .limit(10);

      res.json({
        stats: {
          points: {
            platform: parseInt(stats.total_platform_points) || 0,
            creator: parseInt(stats.total_creator_points) || 0,
            total: (parseInt(stats.total_platform_points) || 0) + (parseInt(stats.total_creator_points) || 0),
          },
          tasks: {
            platformCompleted: parseInt(stats.platform_tasks_completed) || 0,
            creatorCompleted: parseInt(stats.creator_tasks_completed) || 0,
            completedLast30Days: parseInt(stats.tasks_completed_30d) || 0,
            total: (parseInt(stats.platform_tasks_completed) || 0) + (parseInt(stats.creator_tasks_completed) || 0),
          },
          engagement: {
            programsJoined: parseInt(stats.programs_joined) || 0,
            communitiesJoined: parseInt(stats.communities_joined) || 0,
          },
        },
        joinedPrograms,
        recentTransactions,
      });
    } catch (error) {
      console.error("Error fetching fan stats:", error);
      res.status(500).json({ error: "Failed to fetch fan statistics" });
    }
  });
}
