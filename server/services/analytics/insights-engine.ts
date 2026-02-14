/**
 * AI Insights Engine
 * 
 * Rule-based analytics engine that generates actionable suggestions
 * from cross-platform metrics. Deterministic rules first; LLM enhancement later.
 */

import { db } from '../../db';
import {
  platformAccountMetricsDaily,
  platformContent,
  platformContentMetrics,
  socialConnections,
} from '@shared/schema';
import { eq, and, gte, desc, sql, lte } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface Insight {
  id: string;
  type: 'growth' | 'engagement' | 'content' | 'timing' | 'cross_platform' | 'anomaly';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  platform?: string;
  metric?: string;
  value?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Insight Generation
// ============================================================================

export class InsightsEngine {
  /**
   * Generate all insights for a creator
   */
  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Run all analyzers in parallel
      const [
        growthInsights,
        contentInsights,
        crossPlatformInsights,
        anomalyInsights,
        timingInsights,
      ] = await Promise.all([
        this.analyzeGrowthVelocity(userId),
        this.analyzeTopContentTypes(userId),
        this.analyzeCrossPlatformOpportunities(userId),
        this.detectAnomalies(userId),
        this.analyzeBestPostingTimes(userId),
      ]);

      insights.push(...growthInsights, ...contentInsights, ...crossPlatformInsights, ...anomalyInsights, ...timingInsights);

      // Sort by priority: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return insights;
    } catch (error) {
      console.error('[InsightsEngine] Error generating insights:', error);
      return insights;
    }
  }

  /**
   * Analyze follower growth velocity across platforms
   */
  private async analyzeGrowthVelocity(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Get metrics per platform for 30-day and 7-day comparison
      const connections = await db.query.socialConnections.findMany({
        where: and(eq(socialConnections.userId, userId), eq(socialConnections.isActive, true)),
      });

      for (const conn of connections) {
        const latestMetric = await db.query.platformAccountMetricsDaily.findFirst({
          where: and(
            eq(platformAccountMetricsDaily.userId, userId),
            eq(platformAccountMetricsDaily.platform, conn.platform),
          ),
          orderBy: [desc(platformAccountMetricsDaily.date)],
        });

        const thirtyDayMetric = await db.query.platformAccountMetricsDaily.findFirst({
          where: and(
            eq(platformAccountMetricsDaily.userId, userId),
            eq(platformAccountMetricsDaily.platform, conn.platform),
            lte(platformAccountMetricsDaily.date, thirtyDaysAgo),
          ),
          orderBy: [desc(platformAccountMetricsDaily.date)],
        });

        if (latestMetric && thirtyDayMetric) {
          const currentFollowers = (latestMetric.followers || 0) + (latestMetric.subscribers || 0);
          const previousFollowers = (thirtyDayMetric.followers || 0) + (thirtyDayMetric.subscribers || 0);
          const growthPct = previousFollowers > 0
            ? ((currentFollowers - previousFollowers) / previousFollowers * 100)
            : 0;

          if (growthPct > 10) {
            insights.push({
              id: `growth-${conn.platform}`,
              type: 'growth',
              priority: 'high',
              title: `${conn.platform} is growing fast!`,
              description: `Your ${conn.platform} grew ${growthPct.toFixed(1)}% in the last 30 days (${previousFollowers.toLocaleString()} → ${currentFollowers.toLocaleString()}). Keep up the momentum!`,
              platform: conn.platform,
              metric: 'followers',
              value: growthPct,
            });
          } else if (growthPct < -5) {
            insights.push({
              id: `growth-decline-${conn.platform}`,
              type: 'growth',
              priority: 'high',
              title: `${conn.platform} followers declining`,
              description: `Your ${conn.platform} lost ${Math.abs(growthPct).toFixed(1)}% followers in the last 30 days. Consider refreshing your content strategy.`,
              platform: conn.platform,
              metric: 'followers',
              value: growthPct,
            });
          }
        }
      }

      // Compare growth rates across platforms
      if (connections.length >= 2) {
        const growthRates: { platform: string; rate: number; followers: number }[] = [];
        
        for (const conn of connections) {
          const latest = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, conn.platform),
            ),
            orderBy: [desc(platformAccountMetricsDaily.date)],
          });

          const previous = await db.query.platformAccountMetricsDaily.findFirst({
            where: and(
              eq(platformAccountMetricsDaily.userId, userId),
              eq(platformAccountMetricsDaily.platform, conn.platform),
              lte(platformAccountMetricsDaily.date, thirtyDaysAgo),
            ),
            orderBy: [desc(platformAccountMetricsDaily.date)],
          });

          if (latest && previous) {
            const curr = (latest.followers || 0) + (latest.subscribers || 0);
            const prev = (previous.followers || 0) + (previous.subscribers || 0);
            const rate = prev > 0 ? ((curr - prev) / prev * 100) : 0;
            growthRates.push({ platform: conn.platform, rate, followers: curr });
          }
        }

        if (growthRates.length >= 2) {
          growthRates.sort((a, b) => b.rate - a.rate);
          const fastest = growthRates[0];
          const slowest = growthRates[growthRates.length - 1];

          if (fastest.rate > slowest.rate + 10) {
            insights.push({
              id: 'growth-comparison',
              type: 'cross_platform',
              priority: 'medium',
              title: `${fastest.platform} outpacing ${slowest.platform}`,
              description: `Your ${fastest.platform} grew ${fastest.rate.toFixed(1)}% while ${slowest.platform} grew only ${slowest.rate.toFixed(1)}%. Consider cross-promoting from ${fastest.platform} to boost ${slowest.platform}.`,
              metadata: { fastest, slowest },
            });
          }
        }
      }
    } catch (error) {
      console.error('[InsightsEngine] Growth velocity error:', error);
    }

    return insights;
  }

  /**
   * Analyze which content types perform best
   */
  private async analyzeTopContentTypes(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Get content with metrics grouped by type
      const contentByType = await db
        .select({
          contentType: platformContent.contentType,
          platform: platformContent.platform,
          avgViews: sql<number>`AVG(COALESCE(${platformContentMetrics.views}, 0))`,
          avgLikes: sql<number>`AVG(COALESCE(${platformContentMetrics.likes}, 0))`,
          count: sql<number>`COUNT(DISTINCT ${platformContent.id})`,
        })
        .from(platformContent)
        .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
        .where(eq(platformContent.userId, userId))
        .groupBy(platformContent.contentType, platformContent.platform);

      // Find best performing content type per platform
      const platformBest = new Map<string, typeof contentByType[0]>();
      for (const entry of contentByType) {
        const existing = platformBest.get(entry.platform);
        if (!existing || (entry.avgViews || 0) > (existing.avgViews || 0)) {
          platformBest.set(entry.platform, entry);
        }
      }

      for (const [platform, best] of Array.from(platformBest.entries())) {
        if ((best.avgViews || 0) > 0 && best.count > 2) {
          insights.push({
            id: `content-type-${platform}`,
            type: 'content',
            priority: 'medium',
            title: `${best.contentType}s perform best on ${platform}`,
            description: `Your ${best.contentType} content on ${platform} averages ${Math.round(best.avgViews || 0).toLocaleString()} views - focus on creating more of this type.`,
            platform,
            metadata: { contentType: best.contentType, avgViews: best.avgViews, count: best.count },
          });
        }
      }
    } catch (error) {
      console.error('[InsightsEngine] Content types error:', error);
    }

    return insights;
  }

  /**
   * Analyze cross-platform opportunities
   */
  private async analyzeCrossPlatformOpportunities(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      const connections = await db.query.socialConnections.findMany({
        where: and(eq(socialConnections.userId, userId), eq(socialConnections.isActive, true)),
      });

      if (connections.length < 2) return insights;

      // Get latest follower counts per platform
      const platformFollowers: { platform: string; followers: number }[] = [];
      for (const conn of connections) {
        const latest = await db.query.platformAccountMetricsDaily.findFirst({
          where: and(
            eq(platformAccountMetricsDaily.userId, userId),
            eq(platformAccountMetricsDaily.platform, conn.platform),
          ),
          orderBy: [desc(platformAccountMetricsDaily.date)],
        });

        if (latest) {
          platformFollowers.push({
            platform: conn.platform,
            followers: (latest.followers || 0) + (latest.subscribers || 0),
          });
        }
      }

      platformFollowers.sort((a, b) => b.followers - a.followers);

      if (platformFollowers.length >= 2) {
        const biggest = platformFollowers[0];
        const smallest = platformFollowers[platformFollowers.length - 1];
        const ratio = smallest.followers > 0 ? biggest.followers / smallest.followers : 0;

        if (ratio > 3 && biggest.followers > 1000) {
          insights.push({
            id: 'cross-promo',
            type: 'cross_platform',
            priority: 'medium',
            title: `Cross-promote to grow ${smallest.platform}`,
            description: `Your ${biggest.platform} audience (${biggest.followers.toLocaleString()}) is ${ratio.toFixed(0)}x larger than ${smallest.platform} (${smallest.followers.toLocaleString()}). Use ${biggest.platform} to drive followers to ${smallest.platform}.`,
            metadata: { biggest, smallest, ratio },
          });
        }
      }

      // Consistency score
      const contentCounts: { platform: string; count: number }[] = [];
      for (const conn of connections) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const count = await db
          .select({ count: sql<number>`count(*)` })
          .from(platformContent)
          .where(and(
            eq(platformContent.userId, userId),
            eq(platformContent.platform, conn.platform),
            gte(platformContent.publishedAt, thirtyDaysAgo),
          ));
        contentCounts.push({ platform: conn.platform, count: Number(count[0]?.count || 0) });
      }

      const activeCount = contentCounts.filter(c => c.count > 0).length;
      const inactiveCount = contentCounts.filter(c => c.count === 0).length;
      
      if (inactiveCount > 0 && activeCount > 0) {
        const inactive = contentCounts.filter(c => c.count === 0).map(c => c.platform);
        insights.push({
          id: 'consistency',
          type: 'content',
          priority: 'low',
          title: 'Improve posting consistency',
          description: `You haven't posted on ${inactive.join(', ')} in the last 30 days. Regular posting improves algorithm visibility.`,
          metadata: { inactive, active: activeCount },
        });
      }
    } catch (error) {
      console.error('[InsightsEngine] Cross-platform error:', error);
    }

    return insights;
  }

  /**
   * Detect anomalies in recent metrics
   */
  private async detectAnomalies(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Find content with significantly above-average engagement
      const avgMetrics = await db
        .select({
          platform: platformContent.platform,
          avgViews: sql<number>`AVG(COALESCE(${platformContentMetrics.views}, 0))`,
          avgLikes: sql<number>`AVG(COALESCE(${platformContentMetrics.likes}, 0))`,
        })
        .from(platformContent)
        .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
        .where(eq(platformContent.userId, userId))
        .groupBy(platformContent.platform);

      const avgByPlatform = new Map(avgMetrics.map(m => [m.platform, m]));

      // Check recent content (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const recentContent = await db
        .select({
          id: platformContent.id,
          platform: platformContent.platform,
          title: platformContent.title,
          contentType: platformContent.contentType,
          views: sql<number>`MAX(COALESCE(${platformContentMetrics.views}, 0))`,
          likes: sql<number>`MAX(COALESCE(${platformContentMetrics.likes}, 0))`,
        })
        .from(platformContent)
        .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
        .where(and(
          eq(platformContent.userId, userId),
          gte(platformContent.publishedAt, sevenDaysAgo),
        ))
        .groupBy(platformContent.id)
        .orderBy(sql`MAX(COALESCE(${platformContentMetrics.views}, 0)) DESC`)
        .limit(10);

      for (const content of recentContent) {
        const avg = avgByPlatform.get(content.platform);
        if (!avg) continue;

        const viewsAvg = Number(avg.avgViews) || 1;
        const viewMultiple = (content.views || 0) / viewsAvg;

        if (viewMultiple >= 3 && (content.views || 0) > 100) {
          insights.push({
            id: `anomaly-${content.id}`,
            type: 'anomaly',
            priority: 'high',
            title: `${content.platform} content going viral!`,
            description: `"${content.title || content.contentType}" got ${(content.views || 0).toLocaleString()} views - that's ${viewMultiple.toFixed(1)}x your average! Engage with the audience while it's trending.`,
            platform: content.platform,
            value: viewMultiple,
            metadata: { contentId: content.id, views: content.views, average: viewsAvg },
          });
        }
      }
    } catch (error) {
      console.error('[InsightsEngine] Anomaly detection error:', error);
    }

    return insights;
  }

  /**
   * Analyze best posting times
   */
  private async analyzeBestPostingTimes(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Analyze content published_at vs engagement
      const contentWithTiming = await db
        .select({
          platform: platformContent.platform,
          publishedAt: platformContent.publishedAt,
          views: sql<number>`MAX(COALESCE(${platformContentMetrics.views}, 0))`,
          likes: sql<number>`MAX(COALESCE(${platformContentMetrics.likes}, 0))`,
        })
        .from(platformContent)
        .leftJoin(platformContentMetrics, eq(platformContent.id, platformContentMetrics.contentId))
        .where(eq(platformContent.userId, userId))
        .groupBy(platformContent.id)
        .limit(200);

      // Group by day of week and analyze
      const dayPerformance: Record<number, { totalViews: number; count: number }> = {};
      const hourPerformance: Record<number, { totalViews: number; count: number }> = {};

      for (const item of contentWithTiming) {
        if (!item.publishedAt) continue;
        const date = new Date(item.publishedAt);
        const day = date.getDay();
        const hour = date.getHours();

        if (!dayPerformance[day]) dayPerformance[day] = { totalViews: 0, count: 0 };
        dayPerformance[day].totalViews += item.views || 0;
        dayPerformance[day].count++;

        if (!hourPerformance[hour]) hourPerformance[hour] = { totalViews: 0, count: 0 };
        hourPerformance[hour].totalViews += item.views || 0;
        hourPerformance[hour].count++;
      }

      // Find best day
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let bestDay = -1;
      let bestDayAvg = 0;
      for (const [day, data] of Object.entries(dayPerformance)) {
        const avg = data.count > 0 ? data.totalViews / data.count : 0;
        if (avg > bestDayAvg) {
          bestDayAvg = avg;
          bestDay = Number(day);
        }
      }

      // Find best hour range
      let bestHour = -1;
      let bestHourAvg = 0;
      for (const [hour, data] of Object.entries(hourPerformance)) {
        const avg = data.count > 0 ? data.totalViews / data.count : 0;
        if (avg > bestHourAvg) {
          bestHourAvg = avg;
          bestHour = Number(hour);
        }
      }

      if (bestDay >= 0 && bestHour >= 0 && Object.keys(dayPerformance).length >= 3) {
        const timeLabel = bestHour > 12 ? `${bestHour - 12}PM` : bestHour === 0 ? '12AM' : `${bestHour}AM`;
        insights.push({
          id: 'best-posting-time',
          type: 'timing',
          priority: 'medium',
          title: `Best time to post: ${days[bestDay]}s around ${timeLabel}`,
          description: `Your content posted on ${days[bestDay]}s around ${timeLabel} gets ${Math.round(bestDayAvg).toLocaleString()} average views - ${Math.round(bestDayAvg / Math.max(1, bestHourAvg) * 100)}% better than other times.`,
          metadata: { bestDay: days[bestDay], bestHour, avgViews: bestDayAvg },
        });
      }
    } catch (error) {
      console.error('[InsightsEngine] Posting times error:', error);
    }

    return insights;
  }
}

// Export singleton
export const insightsEngine = new InsightsEngine();
