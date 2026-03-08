/**
 * Creator Activity Routes
 *
 * Complex analytics endpoints for creator dashboards:
 * - Activity feed showing fan joins, task completions, and reward redemptions
 * - Weekly/monthly engagement metrics with period-over-period comparison
 */

import type { Express } from 'express';
import { db } from '../../db';
import {
  loyaltyPrograms,
  fanPrograms,
  taskCompletions,
  rewardRedemptions,
  users,
  tasks,
  creators,
  rewards,
} from '@shared/schema';
import { eq, and, desc, or, gte, lt, sql, inArray, isNotNull } from 'drizzle-orm';

export function registerCreatorActivityRoutes(app: Express) {
  // Creator Activity Feed
  app.get('/api/creator/activity/:creatorId', async (req, res) => {
    try {
      const { creatorId } = req.params; // This is actually the userId passed from frontend
      const { search = '', type = 'all', dateFilter = 'all', limit = '100' } = req.query;

      // First, look up the actual creator.id from the user.id
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, creatorId))
        .limit(1);

      // Try both the userId as creatorId directly and the looked-up creator.id
      const creatorIds = creator ? [creatorId, creator.id] : [creatorId];

      const programs = await db
        .select()
        .from(loyaltyPrograms)
        .where(or(...creatorIds.map((cid) => eq(loyaltyPrograms.creatorId, cid))));

      if (programs.length === 0) {
        return res.json([]);
      }

      const programIds = programs.map((p) => p.id);
      const tenantIds = [...new Set(programs.map((p) => p.tenantId).filter(Boolean))];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activities: any[] = [];

      // Calculate date filter
      let dateThreshold: Date | null = null;
      const now = new Date();
      if (dateFilter === 'today') {
        dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === 'week') {
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'month') {
        dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === 'quarter') {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        dateThreshold = new Date(now.getFullYear(), quarterMonth, 1);
      }

      // 1. Fetch fan enrollments (joins)
      if (type === 'all' || type === 'join') {
        for (const programId of programIds) {
          const joins = await db
            .select({
              id: fanPrograms.id,
              fanId: fanPrograms.fanId,
              joinedAt: fanPrograms.joinedAt,
              fanUsername: users.username,
            })
            .from(fanPrograms)
            .leftJoin(users, eq(fanPrograms.fanId, users.id))
            .where(
              and(
                eq(fanPrograms.programId, programId),
                dateThreshold ? gte(fanPrograms.joinedAt, dateThreshold) : sql`true`
              )
            )
            .orderBy(desc(fanPrograms.joinedAt))
            .limit(parseInt(limit as string));

          joins.forEach((join) => {
            activities.push({
              id: join.id,
              type: 'join',
              description: `joined your loyalty program`,
              timestamp: join.joinedAt,
              fanName: join.fanUsername || 'Anonymous Fan',
              fanId: join.fanId,
            });
          });
        }
      }

      // 2. Fetch task completions
      if (type === 'all' || type === 'task' || type === 'earn') {
        const processedCompletionIds = new Set<string>();

        // First try by programId
        for (const programId of programIds) {
          // Query completions including both 'completed' and 'claimed' status
          const completions = await db
            .select({
              id: taskCompletions.id,
              userId: taskCompletions.userId,
              taskId: taskCompletions.taskId,
              completedAt: taskCompletions.completedAt,
              updatedAt: taskCompletions.updatedAt,
              pointsEarned: taskCompletions.pointsEarned,
              status: taskCompletions.status,
              fanUsername: users.username,
              taskName: tasks.name,
            })
            .from(taskCompletions)
            .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
            .leftJoin(users, eq(taskCompletions.userId, users.id))
            .where(
              and(
                eq(tasks.programId, programId),
                or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed')),
                dateThreshold
                  ? gte(
                      sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`,
                      dateThreshold
                    )
                  : sql`true`
              )
            )
            .orderBy(
              desc(sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`)
            )
            .limit(parseInt(limit as string));

          completions.forEach((completion) => {
            // Use completedAt or fall back to updatedAt
            const timestamp = completion.completedAt || completion.updatedAt;
            if (timestamp && !processedCompletionIds.has(completion.id)) {
              processedCompletionIds.add(completion.id);
              activities.push({
                id: completion.id,
                type: 'task',
                description: `completed task: ${completion.taskName}`,
                timestamp: timestamp,
                points: completion.pointsEarned,
                fanName: completion.fanUsername || 'Anonymous Fan',
                fanId: completion.userId,
              });
            }
          });
        }

        // Fallback: Also try by tenantId for tasks that might not have programId set
        for (const tenantId of tenantIds) {
          const tenantCompletions = await db
            .select({
              id: taskCompletions.id,
              userId: taskCompletions.userId,
              taskId: taskCompletions.taskId,
              completedAt: taskCompletions.completedAt,
              updatedAt: taskCompletions.updatedAt,
              pointsEarned: taskCompletions.pointsEarned,
              status: taskCompletions.status,
              fanUsername: users.username,
              taskName: tasks.name,
            })
            .from(taskCompletions)
            .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
            .leftJoin(users, eq(taskCompletions.userId, users.id))
            .where(
              and(
                eq(tasks.tenantId, tenantId),
                or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed')),
                dateThreshold
                  ? gte(
                      sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`,
                      dateThreshold
                    )
                  : sql`true`
              )
            )
            .orderBy(
              desc(sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`)
            )
            .limit(parseInt(limit as string));

          tenantCompletions.forEach((completion) => {
            // Use completedAt or fall back to updatedAt, avoid duplicates
            const timestamp = completion.completedAt || completion.updatedAt;
            if (timestamp && !processedCompletionIds.has(completion.id)) {
              processedCompletionIds.add(completion.id);
              activities.push({
                id: completion.id,
                type: 'task',
                description: `completed task: ${completion.taskName}`,
                timestamp: timestamp,
                points: completion.pointsEarned,
                fanName: completion.fanUsername || 'Anonymous Fan',
                fanId: completion.userId,
              });
            }
          });
        }
      }

      // 3. Fetch reward redemptions
      if (type === 'all' || type === 'redeem') {
        for (const programId of programIds) {
          const redemptions = await db
            .select({
              id: rewardRedemptions.id,
              fanId: rewardRedemptions.fanId,
              redeemedAt: rewardRedemptions.redeemedAt,
              pointsSpent: rewardRedemptions.pointsSpent,
              rewardId: rewardRedemptions.rewardId,
              fanUsername: users.username,
            })
            .from(rewardRedemptions)
            .leftJoin(users, eq(rewardRedemptions.fanId, users.id))
            .where(
              and(
                sql`${rewardRedemptions.rewardId} IN (SELECT id FROM rewards WHERE program_id = ${programId})`,
                dateThreshold ? gte(rewardRedemptions.redeemedAt, dateThreshold) : sql`true`
              )
            )
            .orderBy(desc(rewardRedemptions.redeemedAt))
            .limit(parseInt(limit as string));

          redemptions.forEach((redemption) => {
            activities.push({
              id: redemption.id,
              type: 'redeem',
              description: `redeemed a reward`,
              timestamp: redemption.redeemedAt,
              points: -redemption.pointsSpent,
              fanName: redemption.fanUsername || 'Anonymous Fan',
              fanId: redemption.fanId,
            });
          });
        }
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply search filter
      let filteredActivities = activities;
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchLower = search.toLowerCase();
        filteredActivities = activities.filter(
          (activity) =>
            activity.fanName?.toLowerCase().includes(searchLower) ||
            activity.description?.toLowerCase().includes(searchLower)
        );
      }

      // Limit results
      const limitedActivities = filteredActivities.slice(0, parseInt(limit as string));

      res.json(limitedActivities);
    } catch (error) {
      console.error('Error fetching creator activity:', error);
      res.status(500).json({ error: 'Failed to fetch creator activity' });
    }
  });

  // Creator Engagement Metrics (supports week, month, all periods with comparison)
  app.get('/api/creator/weekly-metrics/:creatorId', async (req, res) => {
    try {
      const { creatorId } = req.params;
      const period = (req.query.period as string) || 'week';

      // Get creator's programs - first try by creatorId directly, then by user_id lookup
      let programs = await db
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.creatorId, creatorId));

      // If no programs found, the creatorId might be a user_id - look up the creator and try again
      if (programs.length === 0) {
        const [creator] = await db.select().from(creators).where(eq(creators.userId, creatorId));
        if (creator) {
          programs = await db
            .select()
            .from(loyaltyPrograms)
            .where(eq(loyaltyPrograms.creatorId, creator.id));
        }
      }

      if (programs.length === 0) {
        return res.json({
          newFans: 0,
          tasksCompleted: 0,
          rewardsRedeemed: 0,
          pointsDistributed: 0,
        });
      }

      const programIds = programs.map((p) => p.id);

      // Calculate date ranges based on period
      const now = new Date();
      let currentStart: Date;
      let previousStart: Date;
      let previousEnd: Date;

      if (period === 'week') {
        // Current week (Sunday to now)
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - now.getDay());
        currentStart.setHours(0, 0, 0, 0);
        // Previous week
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
      } else if (period === 'month') {
        // Current month (1st to now)
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Previous month
        previousEnd = new Date(currentStart);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else {
        // All time - no comparison
        currentStart = new Date(0);
        previousStart = new Date(0);
        previousEnd = new Date(0);
      }

      // Helper function to get metrics for a date range
      const getMetricsForRange = async (startDate: Date, endDate?: Date) => {
        let newFans = 0;
        let tasksCompleted = 0;
        let rewardsRedeemed = 0;
        let pointsDistributed = 0;

        for (const programId of programIds) {
          // Count new fans
          const fansQuery = endDate
            ? and(
                eq(fanPrograms.programId, programId),
                gte(fanPrograms.joinedAt, startDate),
                lt(fanPrograms.joinedAt, endDate)
              )
            : and(eq(fanPrograms.programId, programId), gte(fanPrograms.joinedAt, startDate));

          const fans = await db
            .select({ count: sql<number>`count(*)` })
            .from(fanPrograms)
            .where(fansQuery);
          newFans += Number(fans[0]?.count || 0);

          // Count tasks completed (including 'claimed' status)
          const completionsQuery = endDate
            ? and(
                eq(tasks.programId, programId),
                or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed')),
                isNotNull(taskCompletions.completedAt),
                gte(taskCompletions.completedAt, startDate),
                lt(taskCompletions.completedAt, endDate)
              )
            : and(
                eq(tasks.programId, programId),
                or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed')),
                isNotNull(taskCompletions.completedAt),
                gte(taskCompletions.completedAt, startDate)
              );

          const completions = await db
            .select({ count: sql<number>`count(*)` })
            .from(taskCompletions)
            .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
            .where(completionsQuery);
          tasksCompleted += Number(completions[0]?.count || 0);

          // Count rewards redeemed
          const redemptionsQuery = endDate
            ? and(
                eq(rewards.programId, programId),
                gte(rewardRedemptions.redeemedAt, startDate),
                lt(rewardRedemptions.redeemedAt, endDate)
              )
            : and(eq(rewards.programId, programId), gte(rewardRedemptions.redeemedAt, startDate));

          const redemptions = await db
            .select({ count: sql<number>`count(*)` })
            .from(rewardRedemptions)
            .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
            .where(redemptionsQuery);
          rewardsRedeemed += Number(redemptions[0]?.count || 0);
        }

        // Get points distributed from fan_programs for this creator's programs
        // Sum totalPointsEarned from all fans in these programs
        const fanProgramsData = await db
          .select({
            totalEarned: sql<number>`COALESCE(SUM(${fanPrograms.totalPointsEarned}), 0)`,
          })
          .from(fanPrograms)
          .where(inArray(fanPrograms.programId, programIds));

        pointsDistributed = Number(fanProgramsData[0]?.totalEarned || 0);

        return { newFans, tasksCompleted, rewardsRedeemed, pointsDistributed };
      };

      // Get current period metrics
      const currentMetrics = await getMetricsForRange(currentStart);

      // Get previous period metrics for comparison (only if not "all" period)
      let previousMetrics = null;
      if (period !== 'all') {
        previousMetrics = await getMetricsForRange(previousStart, previousEnd);
      }

      res.json({
        newFans: currentMetrics.newFans,
        tasksCompleted: currentMetrics.tasksCompleted,
        rewardsRedeemed: currentMetrics.rewardsRedeemed,
        pointsDistributed: currentMetrics.pointsDistributed,
        ...(previousMetrics && {
          previousNewFans: previousMetrics.newFans,
          previousTasksCompleted: previousMetrics.tasksCompleted,
          previousRewardsRedeemed: previousMetrics.rewardsRedeemed,
          previousPointsDistributed: previousMetrics.pointsDistributed,
        }),
      });
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      res.status(500).json({ error: 'Failed to fetch engagement metrics' });
    }
  });
}
