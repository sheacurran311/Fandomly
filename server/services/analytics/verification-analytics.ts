/**
 * Verification Analytics Service
 * 
 * Provides metrics, reports, and insights for task verification.
 * Supports dashboards for creators and platform admins.
 */

import { db } from '../../db';
import { 
  taskCompletions, tasks, verificationAttempts, 
  manualReviewQueue, socialConnections, users 
} from '@shared/schema';
import { eq, and, gte, lte, sql, count, desc, asc } from 'drizzle-orm';

export interface VerificationMetrics {
  totalVerifications: number;
  successRate: number;
  byTier: {
    tier1: { total: number; success: number; rate: number };
    tier2: { total: number; success: number; rate: number };
    tier3: { total: number; success: number; rate: number };
  };
  byPlatform: Record<string, { total: number; success: number; rate: number }>;
  byMethod: Record<string, { total: number; success: number; rate: number }>;
  pendingManualReview: number;
  avgReviewTime: number; // in hours
}

export interface DailyStats {
  date: string;
  verifications: number;
  successes: number;
  failures: number;
  manualReviews: number;
}

export interface PlatformHealth {
  platform: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccessAt?: Date;
  failureRate24h: number;
  avgResponseTime: number;
  activeConnections: number;
  issues: string[];
}

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  taskId?: string;
  platform: string;
  action: string;
  result: 'success' | 'failure' | 'pending';
  details: Record<string, any>;
}

class VerificationAnalyticsService {
  /**
   * Get comprehensive verification metrics for a time period
   */
  async getMetrics(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VerificationMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate || new Date();

    // Build base query conditions
    const conditions = [
      gte(verificationAttempts.attemptedAt, start),
      lte(verificationAttempts.attemptedAt, end),
    ];

    // Get all verification attempts
    const attempts = await db
      .select({
        platform: verificationAttempts.platform,
        method: verificationAttempts.verificationMethod,
        success: verificationAttempts.success,
        tier: sql<string>`CASE 
          WHEN ${verificationAttempts.verificationMethod} IN ('api', 'auto_tracking', 'auto_interactive') THEN 'T1'
          WHEN ${verificationAttempts.verificationMethod} IN ('code_comment', 'code_repost', 'hashtag') THEN 'T2'
          ELSE 'T3'
        END`.as('tier'),
      })
      .from(verificationAttempts)
      .where(and(...conditions));

    // Calculate metrics
    const total = attempts.length;
    const successful = attempts.filter(a => a.success).length;

    // Tier breakdown
    const tier1Attempts = attempts.filter(a => a.tier === 'T1');
    const tier2Attempts = attempts.filter(a => a.tier === 'T2');
    const tier3Attempts = attempts.filter(a => a.tier === 'T3');

    // Platform breakdown
    const platformMap = new Map<string, { total: number; success: number }>();
    for (const attempt of attempts) {
      const existing = platformMap.get(attempt.platform) || { total: 0, success: 0 };
      existing.total++;
      if (attempt.success) existing.success++;
      platformMap.set(attempt.platform, existing);
    }

    // Method breakdown
    const methodMap = new Map<string, { total: number; success: number }>();
    for (const attempt of attempts) {
      const existing = methodMap.get(attempt.method) || { total: 0, success: 0 };
      existing.total++;
      if (attempt.success) existing.success++;
      methodMap.set(attempt.method, existing);
    }

    // Pending manual reviews
    const pendingReviews = await db
      .select({ count: count() })
      .from(manualReviewQueue)
      .where(eq(manualReviewQueue.status, 'pending'));

    // Average review time
    const avgReviewTime = await this.calculateAverageReviewTime(start, end);

    return {
      totalVerifications: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byTier: {
        tier1: {
          total: tier1Attempts.length,
          success: tier1Attempts.filter(a => a.success).length,
          rate: tier1Attempts.length > 0 
            ? (tier1Attempts.filter(a => a.success).length / tier1Attempts.length) * 100 
            : 0,
        },
        tier2: {
          total: tier2Attempts.length,
          success: tier2Attempts.filter(a => a.success).length,
          rate: tier2Attempts.length > 0 
            ? (tier2Attempts.filter(a => a.success).length / tier2Attempts.length) * 100 
            : 0,
        },
        tier3: {
          total: tier3Attempts.length,
          success: tier3Attempts.filter(a => a.success).length,
          rate: tier3Attempts.length > 0 
            ? (tier3Attempts.filter(a => a.success).length / tier3Attempts.length) * 100 
            : 0,
        },
      },
      byPlatform: Object.fromEntries(
        Array.from(platformMap.entries()).map(([platform, stats]) => [
          platform,
          { ...stats, rate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0 },
        ])
      ),
      byMethod: Object.fromEntries(
        Array.from(methodMap.entries()).map(([method, stats]) => [
          method,
          { ...stats, rate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0 },
        ])
      ),
      pendingManualReview: Number(pendingReviews[0]?.count || 0),
      avgReviewTime,
    };
  }

  /**
   * Get daily verification stats for charting
   */
  async getDailyStats(days: number = 30, tenantId?: string): Promise<DailyStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db
      .select({
        date: sql<string>`DATE(${verificationAttempts.attemptedAt})`.as('date'),
        total: count(),
        successes: sql<number>`SUM(CASE WHEN ${verificationAttempts.success} THEN 1 ELSE 0 END)`.as('successes'),
        failures: sql<number>`SUM(CASE WHEN NOT ${verificationAttempts.success} THEN 1 ELSE 0 END)`.as('failures'),
      })
      .from(verificationAttempts)
      .where(gte(verificationAttempts.attemptedAt, startDate))
      .groupBy(sql`DATE(${verificationAttempts.attemptedAt})`)
      .orderBy(asc(sql`DATE(${verificationAttempts.attemptedAt})`));

    // Get manual reviews by date
    const reviews = await db
      .select({
        date: sql<string>`DATE(${manualReviewQueue.createdAt})`.as('date'),
        count: count(),
      })
      .from(manualReviewQueue)
      .where(gte(manualReviewQueue.createdAt, startDate))
      .groupBy(sql`DATE(${manualReviewQueue.createdAt})`);

    const reviewsByDate = new Map(reviews.map(r => [r.date, Number(r.count)]));

    return stats.map(s => ({
      date: s.date,
      verifications: Number(s.total),
      successes: Number(s.successes),
      failures: Number(s.failures),
      manualReviews: reviewsByDate.get(s.date) || 0,
    }));
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(): Promise<PlatformHealth[]> {
    const platforms = ['twitter', 'instagram', 'tiktok', 'youtube', 'spotify', 
                       'twitch', 'discord', 'facebook', 'kick', 'patreon'];
    
    const healthData: PlatformHealth[] = [];
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const platform of platforms) {
      // Get last 24h attempts
      const attempts = await db
        .select({
          success: verificationAttempts.success,
          attemptedAt: verificationAttempts.attemptedAt,
        })
        .from(verificationAttempts)
        .where(and(
          eq(verificationAttempts.platform, platform),
          gte(verificationAttempts.attemptedAt, last24h)
        ))
        .orderBy(desc(verificationAttempts.attemptedAt));

      const total = attempts.length;
      const failures = attempts.filter(a => !a.success).length;
      const failureRate = total > 0 ? (failures / total) * 100 : 0;

      // Get active connections count
      const connections = await db
        .select({ count: count() })
        .from(socialConnections)
        .where(and(
          eq(socialConnections.platform, platform),
          eq(socialConnections.isActive, true)
        ));

      // Determine health status
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      const issues: string[] = [];

      if (failureRate > 50) {
        status = 'down';
        issues.push(`High failure rate: ${failureRate.toFixed(1)}%`);
      } else if (failureRate > 20) {
        status = 'degraded';
        issues.push(`Elevated failure rate: ${failureRate.toFixed(1)}%`);
      }

      if (total === 0 && Number(connections[0]?.count || 0) > 0) {
        status = 'degraded';
        issues.push('No verification attempts in last 24h despite active connections');
      }

      healthData.push({
        platform,
        status,
        lastSuccessAt: attempts.find(a => a.success)?.attemptedAt || undefined,
        failureRate24h: failureRate,
        avgResponseTime: 0, // Would need timing data
        activeConnections: Number(connections[0]?.count || 0),
        issues,
      });
    }

    return healthData;
  }

  /**
   * Get audit log for verification activities
   */
  async getAuditLog(
    filters: {
      userId?: string;
      taskId?: string;
      platform?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const { userId, taskId, platform, startDate, endDate, limit = 100, offset = 0 } = filters;

    const conditions = [];
    if (userId) conditions.push(sql`${verificationAttempts.userId}::text = ${userId}`);
    if (platform) conditions.push(eq(verificationAttempts.platform, platform));
    if (startDate) conditions.push(gte(verificationAttempts.attemptedAt, startDate));
    if (endDate) conditions.push(lte(verificationAttempts.attemptedAt, endDate));

    const [entries, countResult] = await Promise.all([
      db
        .select({
          timestamp: verificationAttempts.attemptedAt,
          userId: verificationAttempts.userId,
          taskCompletionId: verificationAttempts.taskCompletionId,
          platform: verificationAttempts.platform,
          method: verificationAttempts.verificationMethod,
          success: verificationAttempts.success,
          error: verificationAttempts.errorMessage,
          data: verificationAttempts.verificationData,
        })
        .from(verificationAttempts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(verificationAttempts.attemptedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(verificationAttempts)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      entries: entries.map(e => ({
        timestamp: e.timestamp ?? new Date(),
        userId: String(e.userId),
        taskId: undefined, // Would need join with task_completions
        platform: e.platform,
        action: `verification_${e.method}`,
        result: e.success ? 'success' : 'failure',
        details: {
          method: e.method,
          error: e.error,
          ...(e.data as object || {}),
        },
      })),
      total: Number(countResult[0]?.count || 0),
    };
  }

  /**
   * Get creator-specific verification stats
   */
  async getCreatorStats(creatorId: string): Promise<{
    totalTaskCompletions: number;
    pendingReviews: number;
    approvedToday: number;
    rejectedToday: number;
    topPlatforms: Array<{ platform: string; completions: number }>;
    recentActivity: Array<{
      taskName: string;
      fanName: string;
      platform: string;
      status: string;
      timestamp: Date;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total task completions for creator's tasks
    const totalCompletions = await db
      .select({ count: count() })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(tasks.creatorId, creatorId));

    // Get pending reviews
    // Note: manual_review_queue.creator_id is integer; creatorId is uuid string - use sql cast for comparison
    const pendingReviews = await db
      .select({ count: count() })
      .from(manualReviewQueue)
      .where(and(
        sql`${manualReviewQueue.creatorId}::text = ${creatorId}`,
        eq(manualReviewQueue.status, 'pending')
      ));

    // Get today's approved/rejected
    const todayStats = await db
      .select({
        status: manualReviewQueue.status,
        count: count(),
      })
      .from(manualReviewQueue)
      .where(and(
        sql`${manualReviewQueue.creatorId}::text = ${creatorId}`,
        gte(manualReviewQueue.reviewedAt, today)
      ))
      .groupBy(manualReviewQueue.status);

    const todayApproved = todayStats.find(s => s.status === 'approved')?.count || 0;
    const todayRejected = todayStats.find(s => s.status === 'rejected')?.count || 0;

    // Get top platforms
    const platformStats = await db
      .select({
        platform: tasks.platform,
        count: count(),
      })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(tasks.creatorId, creatorId))
      .groupBy(tasks.platform)
      .orderBy(desc(count()))
      .limit(5);

    // Get recent activity
    const recentActivity = await db
      .select({
        taskName: tasks.name,
        platform: tasks.platform,
        status: taskCompletions.status,
        timestamp: taskCompletions.createdAt,
        fanId: taskCompletions.userId,
      })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(tasks.creatorId, creatorId))
      .orderBy(desc(taskCompletions.createdAt))
      .limit(10);

    // Get fan names
    const fanIds = Array.from(new Set(recentActivity.map(a => a.fanId)));
    const fans = fanIds.length > 0 
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, fanIds),
          columns: { id: true, username: true },
        })
      : [];
    const fanMap = new Map(fans.map(f => [f.id, f.username || 'Unknown Fan']));

    return {
      totalTaskCompletions: Number(totalCompletions[0]?.count || 0),
      pendingReviews: Number(pendingReviews[0]?.count || 0),
      approvedToday: Number(todayApproved),
      rejectedToday: Number(todayRejected),
      topPlatforms: platformStats.map(p => ({
        platform: p.platform,
        completions: Number(p.count),
      })),
      recentActivity: recentActivity.map(a => ({
        taskName: a.taskName,
        fanName: fanMap.get(a.fanId) || 'Unknown Fan',
        platform: a.platform,
        status: a.status,
        timestamp: a.timestamp ?? new Date(),
      })),
    };
  }

  /**
   * Calculate average manual review time
   */
  private async calculateAverageReviewTime(start: Date, end: Date): Promise<number> {
    const reviews = await db
      .select({
        createdAt: manualReviewQueue.createdAt,
        reviewedAt: manualReviewQueue.reviewedAt,
      })
      .from(manualReviewQueue)
      .where(and(
        gte(manualReviewQueue.createdAt, start),
        lte(manualReviewQueue.createdAt, end),
        sql`${manualReviewQueue.reviewedAt} IS NOT NULL`
      ));

    if (reviews.length === 0) return 0;

    const totalHours = reviews.reduce((sum, r) => {
      if (!r.reviewedAt || !r.createdAt) return sum;
      const diff = r.reviewedAt.getTime() - r.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return totalHours / reviews.length;
  }
}

export const verificationAnalytics = new VerificationAnalyticsService();
