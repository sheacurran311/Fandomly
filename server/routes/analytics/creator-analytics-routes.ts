/**
 * Creator Analytics API Routes
 * 
 * Cross-platform analytics endpoints providing overview, per-platform,
 * content, growth, and comparison views.
 */

import { Express, Response } from 'express';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { analyticsLimiter, insightsLimiter } from '../../middleware/rate-limit';
import { db } from '../../db';
import { insightsEngine } from '../../services/analytics/insights-engine';
import {
  platformAccountMetricsDaily,
  platformContent,
  platformContentMetrics,
  socialConnections,
  syncPreferences,
  syncLog,
  taskCompletions,
  tasks,
  fanPrograms,
  loyaltyPrograms,
} from '@shared/schema';

/**
 * Parse date range from query params
 */
function getDateRange(range?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate as string) : new Date();
  let start: Date;

  switch (range) {
    case '7d':
      start = new Date(end.getTime() - 7 * 86400000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 86400000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 86400000);
      break;
    case 'custom':
      start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 86400000);
      break;
    default:
      start = new Date(end.getTime() - 30 * 86400000);
  }

  return { start, end };
}

/**
 * Parse platforms filter
 */
function parsePlatforms(platforms?: string): string[] | null {
  if (!platforms || platforms === 'all') return null;
  return platforms.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
}

export function registerCreatorAnalyticsRoutes(app: Express) {
  /**
   * GET /api/analytics/overview
   * Aggregated metrics across all or selected platforms
   */
  app.get(
    '/api/analytics/overview',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { start, end } = getDateRange(
          req.query.dateRange as string,
          req.query.startDate as string,
          req.query.endDate as string
        );
        const platformFilter = parsePlatforms(req.query.platforms as string);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Get connected platforms
        const connections = await db.query.socialConnections.findMany({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.isActive, true)
          ),
        });

        const connectedPlatforms = connections.map(c => c.platform);
        const activePlatforms = platformFilter
          ? platformFilter.filter(p => connectedPlatforms.includes(p))
          : connectedPlatforms;

        // Get latest metrics per platform
        const latestMetrics = [];
        for (const platform of activePlatforms) {
          const latest = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, platform),
              lte(platformAccountMetricsDaily.date, endStr),
            ),
            orderBy: [desc(platformAccountMetricsDaily.date)],
          });
          if (latest) {
            latestMetrics.push(latest);
          }
        }

        // Aggregate totals
        const totalFollowers = latestMetrics.reduce((sum, m) => sum + (m.followers || 0) + (m.subscribers || 0), 0);
        const totalViews = latestMetrics.reduce((sum, m) => sum + (Number(m.totalViews) || 0), 0);
        const totalLikes = latestMetrics.reduce((sum, m) => sum + (Number(m.totalLikes) || 0), 0);
        const totalPosts = latestMetrics.reduce((sum, m) => sum + (m.totalPosts || 0), 0);

        // Get growth data (compare start vs end of period)
        const startMetrics = [];
        for (const platform of activePlatforms) {
          const earliest = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, platform),
              gte(platformAccountMetricsDaily.date, startStr),
            ),
            orderBy: [platformAccountMetricsDaily.date],
          });
          if (earliest) {
            startMetrics.push(earliest);
          }
        }

        const startFollowers = startMetrics.reduce((sum, m) => sum + (m.followers || 0) + (m.subscribers || 0), 0);
        const followerGrowth = startFollowers > 0
          ? ((totalFollowers - startFollowers) / startFollowers * 100)
          : 0;

        // Get top content for the period
        const topContent = await db
          .select({
            id: platformContent.id,
            platform: platformContent.platform,
            title: platformContent.title,
            contentType: platformContent.contentType,
            url: platformContent.url,
            thumbnailUrl: platformContent.thumbnailUrl,
            publishedAt: platformContent.publishedAt,
            totalViews: sql<number>`COALESCE(MAX(${platformContentMetrics.views}), 0)`,
            totalLikes: sql<number>`COALESCE(MAX(${platformContentMetrics.likes}), 0)`,
            totalComments: sql<number>`COALESCE(MAX(${platformContentMetrics.comments}), 0)`,
          })
          .from(platformContent)
          .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
          .where(
            and(
              eq(platformContent.userId, userId),
              ...(platformFilter ? [inArray(platformContent.platform, platformFilter)] : []),
            )
          )
          .groupBy(platformContent.id)
          .orderBy(sql`COALESCE(MAX(${platformContentMetrics.views}), 0) DESC`)
          .limit(5);

        // Get platform task stats
        const creatorPrograms = await db.query.loyaltyPrograms.findMany({
          where: eq(loyaltyPrograms.creatorId, userId),
        });
        const programIds = creatorPrograms.map(p => p.id);

        let totalTaskCompletions = 0;
        let totalFans = 0;
        if (programIds.length > 0) {
          for (const pid of programIds) {
            const tc = await db.select({ count: sql<number>`count(*)` })
              .from(taskCompletions)
              .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
              .where(and(
                eq(tasks.programId, pid),
                gte(taskCompletions.completedAt, start),
              ));
            totalTaskCompletions += Number(tc[0]?.count || 0);

            const fans = await db.select({ count: sql<number>`count(*)` })
              .from(fanPrograms)
              .where(eq(fanPrograms.programId, pid));
            totalFans += Number(fans[0]?.count || 0);
          }
        }

        // Get sync preferences for status display
        const prefs = await db.query.syncPreferences.findMany({
          where: eq(syncPreferences.userId, userId),
        });

        res.json({
          overview: {
            totalFollowers,
            totalViews,
            totalLikes,
            totalPosts,
            totalFans,
            totalTaskCompletions,
            followerGrowth: Math.round(followerGrowth * 100) / 100,
          },
          platforms: latestMetrics.map(m => ({
            platform: m.platform,
            followers: (m.followers || 0) + (m.subscribers || 0),
            views: Number(m.totalViews) || 0,
            likes: Number(m.totalLikes) || 0,
            posts: m.totalPosts || 0,
            engagementRate: m.engagementRate ? Number(m.engagementRate) : null,
            platformSpecific: m.platformSpecific,
          })),
          topContent,
          connectedPlatforms,
          syncStatus: prefs.map(p => ({
            platform: p.platform,
            syncEnabled: p.syncEnabled,
            lastSyncAt: p.lastSyncAt,
            nextSyncAt: p.nextSyncAt,
            status: p.syncStatus,
          })),
          dateRange: { start: startStr, end: endStr },
        });
      } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
      }
    }
  );

  /**
   * GET /api/analytics/platform/:platform
   * Single platform deep dive
   */
  app.get(
    '/api/analytics/platform/:platform',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { platform } = req.params;
        const { start, end } = getDateRange(
          req.query.dateRange as string,
          req.query.startDate as string,
          req.query.endDate as string
        );
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Get account metrics history
        const metricsHistory = await db.query.platformAccountMetricsDaily.findMany({
          where: and(
            eq(platformAccountMetricsDaily.userId, userId),
            eq(platformAccountMetricsDaily.platform, platform),
            gte(platformAccountMetricsDaily.date, startStr),
            lte(platformAccountMetricsDaily.date, endStr),
          ),
          orderBy: [platformAccountMetricsDaily.date],
        });

        // Get content list with latest metrics
        const contentList = await db
          .select({
            id: platformContent.id,
            platformContentId: platformContent.platformContentId,
            contentType: platformContent.contentType,
            title: platformContent.title,
            url: platformContent.url,
            thumbnailUrl: platformContent.thumbnailUrl,
            publishedAt: platformContent.publishedAt,
            views: sql<number>`COALESCE(MAX(${platformContentMetrics.views}), 0)`,
            likes: sql<number>`COALESCE(MAX(${platformContentMetrics.likes}), 0)`,
            comments: sql<number>`COALESCE(MAX(${platformContentMetrics.comments}), 0)`,
            shares: sql<number>`COALESCE(MAX(${platformContentMetrics.shares}), 0)`,
          })
          .from(platformContent)
          .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
          .where(
            and(
              eq(platformContent.userId, userId),
              eq(platformContent.platform, platform),
            )
          )
          .groupBy(platformContent.id)
          .orderBy(desc(platformContent.publishedAt))
          .limit(25);

        // Get sync info
        const syncPref = await db.query.syncPreferences.findFirst({
          where: and(
            eq(syncPreferences.userId, userId),
            eq(syncPreferences.platform, platform)
          ),
        });

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, platform)
          ),
        });

        res.json({
          platform,
          metricsHistory: metricsHistory.map(m => ({
            date: m.date,
            followers: m.followers,
            following: m.following,
            totalPosts: m.totalPosts,
            totalViews: Number(m.totalViews) || 0,
            totalLikes: Number(m.totalLikes) || 0,
            engagementRate: m.engagementRate ? Number(m.engagementRate) : null,
            subscribers: m.subscribers,
            platformSpecific: m.platformSpecific,
          })),
          content: contentList,
          syncStatus: syncPref ? {
            syncEnabled: syncPref.syncEnabled,
            lastSyncAt: syncPref.lastSyncAt,
            nextSyncAt: syncPref.nextSyncAt,
            status: syncPref.syncStatus,
            frequency: syncPref.syncFrequencyMinutes,
          } : null,
          connectionInfo: connection ? {
            username: connection.platformUsername,
            displayName: connection.platformDisplayName,
            connectedAt: connection.connectedAt,
            profileData: connection.profileData,
          } : null,
        });
      } catch (error) {
        console.error('Error fetching platform analytics:', error);
        res.status(500).json({ error: 'Failed to fetch platform analytics' });
      }
    }
  );

  /**
   * GET /api/analytics/content
   * Content performance across platforms
   */
  app.get(
    '/api/analytics/content',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const platformFilter = parsePlatforms(req.query.platforms as string);
        const sortBy = (req.query.sortBy as string) || 'views';
        const limit = Math.min(Number(req.query.limit) || 20, 50);

        let orderClause;
        switch (sortBy) {
          case 'engagement':
            orderClause = sql`(COALESCE(MAX(${platformContentMetrics.likes}), 0) + COALESCE(MAX(${platformContentMetrics.comments}), 0) + COALESCE(MAX(${platformContentMetrics.shares}), 0)) DESC`;
            break;
          case 'recent':
            orderClause = sql`${platformContent.publishedAt} DESC NULLS LAST`;
            break;
          case 'views':
          default:
            orderClause = sql`COALESCE(MAX(${platformContentMetrics.views}), 0) DESC`;
        }

        const content = await db
          .select({
            id: platformContent.id,
            platform: platformContent.platform,
            platformContentId: platformContent.platformContentId,
            contentType: platformContent.contentType,
            title: platformContent.title,
            description: platformContent.description,
            url: platformContent.url,
            thumbnailUrl: platformContent.thumbnailUrl,
            publishedAt: platformContent.publishedAt,
            views: sql<number>`COALESCE(MAX(${platformContentMetrics.views}), 0)`,
            likes: sql<number>`COALESCE(MAX(${platformContentMetrics.likes}), 0)`,
            comments: sql<number>`COALESCE(MAX(${platformContentMetrics.comments}), 0)`,
            shares: sql<number>`COALESCE(MAX(${platformContentMetrics.shares}), 0)`,
            saves: sql<number>`COALESCE(MAX(${platformContentMetrics.saves}), 0)`,
            impressions: sql<number>`COALESCE(MAX(${platformContentMetrics.impressions}), 0)`,
          })
          .from(platformContent)
          .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
          .where(
            and(
              eq(platformContent.userId, userId),
              ...(platformFilter ? [inArray(platformContent.platform, platformFilter)] : []),
            )
          )
          .groupBy(platformContent.id)
          .orderBy(orderClause)
          .limit(limit);

        res.json({ content, total: content.length });
      } catch (error) {
        console.error('Error fetching content analytics:', error);
        res.status(500).json({ error: 'Failed to fetch content analytics' });
      }
    }
  );

  /**
   * GET /api/analytics/growth
   * Follower/engagement growth over time
   */
  app.get(
    '/api/analytics/growth',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { start, end } = getDateRange(
          req.query.dateRange as string,
          req.query.startDate as string,
          req.query.endDate as string
        );
        const platformFilter = parsePlatforms(req.query.platforms as string);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Get daily metrics per platform
        const conditions = [
          eq(platformAccountMetricsDaily.userId, userId),
          gte(platformAccountMetricsDaily.date, startStr),
          lte(platformAccountMetricsDaily.date, endStr),
        ];

        if (platformFilter) {
          conditions.push(inArray(platformAccountMetricsDaily.platform, platformFilter));
        }

        const dailyMetrics = await db.query.platformAccountMetricsDaily.findMany({
          where: and(...conditions),
          orderBy: [platformAccountMetricsDaily.date, platformAccountMetricsDaily.platform],
        });

        // Group by date for aggregated view
        const dateMap = new Map<string, {
          date: string;
          totalFollowers: number;
          totalViews: number;
          totalLikes: number;
          platforms: Record<string, { followers: number; views: number; likes: number }>;
        }>();

        for (const metric of dailyMetrics) {
          const dateStr = metric.date as string;
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: dateStr,
              totalFollowers: 0,
              totalViews: 0,
              totalLikes: 0,
              platforms: {},
            });
          }

          const entry = dateMap.get(dateStr)!;
          const followers = (metric.followers || 0) + (metric.subscribers || 0);
          const views = Number(metric.totalViews) || 0;
          const likes = Number(metric.totalLikes) || 0;

          entry.totalFollowers += followers;
          entry.totalViews += views;
          entry.totalLikes += likes;
          entry.platforms[metric.platform] = { followers, views, likes };
        }

        // Convert to array sorted by date
        const growthData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Per-platform growth series
        const platforms = Array.from(new Set(dailyMetrics.map(m => m.platform)));
        const platformSeries: Record<string, { date: string; followers: number; views: number }[]> = {};
        for (const p of platforms) {
          platformSeries[p] = dailyMetrics
            .filter(m => m.platform === p)
            .map(m => ({
              date: m.date as string,
              followers: (m.followers || 0) + (m.subscribers || 0),
              views: Number(m.totalViews) || 0,
            }));
        }

        res.json({
          aggregated: growthData,
          byPlatform: platformSeries,
          dateRange: { start: startStr, end: endStr },
        });
      } catch (error) {
        console.error('Error fetching growth analytics:', error);
        res.status(500).json({ error: 'Failed to fetch growth analytics' });
      }
    }
  );

  /**
   * GET /api/analytics/comparison
   * Compare metrics across platforms
   */
  app.get(
    '/api/analytics/comparison',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { start, end } = getDateRange(
          req.query.dateRange as string,
          req.query.startDate as string,
          req.query.endDate as string
        );
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Get latest metrics per platform
        const connections = await db.query.socialConnections.findMany({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.isActive, true)
          ),
        });

        const comparison = [];
        for (const conn of connections) {
          const latest = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, conn.platform),
              lte(platformAccountMetricsDaily.date, endStr),
            ),
            orderBy: [desc(platformAccountMetricsDaily.date)],
          });

          const earliest = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, conn.platform),
              gte(platformAccountMetricsDaily.date, startStr),
            ),
            orderBy: [platformAccountMetricsDaily.date],
          });

          const contentCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(platformContent)
            .where(and(
              eq(platformContent.userId, userId),
              eq(platformContent.platform, conn.platform),
            ));

          const currentFollowers = (latest?.followers || 0) + (latest?.subscribers || 0);
          const previousFollowers = (earliest?.followers || 0) + (earliest?.subscribers || 0);
          const growth = previousFollowers > 0
            ? ((currentFollowers - previousFollowers) / previousFollowers * 100)
            : 0;

          comparison.push({
            platform: conn.platform,
            username: conn.platformUsername,
            displayName: conn.platformDisplayName,
            followers: currentFollowers,
            followerGrowth: Math.round(growth * 100) / 100,
            totalViews: Number(latest?.totalViews) || 0,
            totalPosts: latest?.totalPosts || 0,
            engagementRate: latest?.engagementRate ? Number(latest.engagementRate) : null,
            contentItems: Number(contentCount[0]?.count || 0),
            platformSpecific: latest?.platformSpecific || {},
          });
        }

        // Sort by followers descending
        comparison.sort((a, b) => b.followers - a.followers);

        res.json({
          comparison,
          dateRange: { start: startStr, end: endStr },
        });
      } catch (error) {
        console.error('Error fetching comparison analytics:', error);
        res.status(500).json({ error: 'Failed to fetch comparison analytics' });
      }
    }
  );

  /**
   * GET /api/analytics/sync-history
   * Recent sync operations log
   */
  app.get(
    '/api/analytics/sync-history',
    authenticateUser,
    analyticsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const limit = Math.min(Number(req.query.limit) || 20, 50);

        const logs = await db.query.syncLog.findMany({
          where: eq(syncLog.userId, userId),
          orderBy: [desc(syncLog.startedAt)],
          limit,
        });

        res.json({ logs });
      } catch (error) {
        console.error('Error fetching sync history:', error);
        res.status(500).json({ error: 'Failed to fetch sync history' });
      }
    }
  );

  /**
   * GET /api/analytics/insights
   * AI-powered suggestions and insights
   */
  app.get(
    '/api/analytics/insights',
    authenticateUser,
    insightsLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const insights = await insightsEngine.generateInsights(userId);

        res.json({ insights });
      } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
      }
    }
  );
}
