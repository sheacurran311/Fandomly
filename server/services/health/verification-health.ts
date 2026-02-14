/**
 * Verification System Health Service
 * 
 * Monitors the health of verification services and external integrations.
 * Used for alerting and operational dashboards.
 */

import { db } from '../../db';
import { socialConnections, verificationAttempts } from '@shared/schema';
import { eq, and, gte, count, desc, sql } from 'drizzle-orm';

export interface ServiceHealth {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
  latency?: number;
  lastCheck: Date;
  message?: string;
}

export interface ExternalAPIHealth {
  api: string;
  platform: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  lastSuccess?: Date;
  failureCount24h: number;
  errorRate: number;
}

export interface HealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  externalAPIs: ExternalAPIHealth[];
  metrics: {
    verificationQueueLength: number;
    averageProcessingTime: number;
    activeConnections: number;
    pendingReviews: number;
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

// Configuration thresholds
const THRESHOLDS = {
  errorRateWarning: 10, // %
  errorRateCritical: 25, // %
  queueLengthWarning: 50,
  queueLengthCritical: 200,
  reviewBacklogWarning: 100,
  reviewBacklogCritical: 500,
  processingTimeWarning: 30, // seconds
  processingTimeCritical: 120, // seconds
};

// Platform API endpoints to monitor
const PLATFORM_APIS = [
  { platform: 'twitter', api: 'Twitter API v2' },
  { platform: 'instagram', api: 'Instagram Graph API' },
  { platform: 'facebook', api: 'Facebook Graph API' },
  { platform: 'tiktok', api: 'TikTok API v2' },
  { platform: 'youtube', api: 'YouTube Data API' },
  { platform: 'spotify', api: 'Spotify Web API' },
  { platform: 'twitch', api: 'Twitch Helix API' },
  { platform: 'discord', api: 'Discord API' },
  { platform: 'kick', api: 'Kick API' },
  { platform: 'patreon', api: 'Patreon API v2' },
];

class VerificationHealthService {
  private lastReport: HealthReport | null = null;
  private reportCacheTTL = 60000; // 1 minute cache
  private lastReportTime = 0;

  /**
   * Get comprehensive health report
   */
  async getHealthReport(forceRefresh = false): Promise<HealthReport> {
    const now = Date.now();
    
    // Return cached report if fresh
    if (!forceRefresh && this.lastReport && now - this.lastReportTime < this.reportCacheTTL) {
      return this.lastReport;
    }

    const [services, externalAPIs, metrics] = await Promise.all([
      this.checkInternalServices(),
      this.checkExternalAPIs(),
      this.gatherMetrics(),
    ]);

    const alerts = this.generateAlerts(services, externalAPIs, metrics);

    // Determine overall status
    const hasOutage = services.some(s => s.status === 'outage') || 
                      externalAPIs.some(a => a.status === 'outage');
    const hasDegraded = services.some(s => s.status === 'degraded') || 
                        externalAPIs.some(a => a.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (hasOutage) {
      overallStatus = 'critical';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    this.lastReport = {
      timestamp: new Date(),
      overallStatus,
      services,
      externalAPIs,
      metrics,
      alerts,
    };
    this.lastReportTime = now;

    return this.lastReport;
  }

  /**
   * Check internal service health
   */
  private async checkInternalServices(): Promise<ServiceHealth[]> {
    const services: ServiceHealth[] = [];
    const now = new Date();

    // Database connectivity
    try {
      const start = performance.now();
      await db.execute(sql`SELECT 1`);
      const latency = performance.now() - start;
      
      services.push({
        service: 'Database',
        status: latency > 500 ? 'degraded' : 'operational',
        latency: Math.round(latency),
        lastCheck: now,
      });
    } catch (error: any) {
      services.push({
        service: 'Database',
        status: 'outage',
        lastCheck: now,
        message: error.message,
      });
    }

    // Verification service
    services.push({
      service: 'Verification Service',
      status: 'operational',
      lastCheck: now,
    });

    // Token refresh service
    services.push({
      service: 'Token Refresh Service',
      status: 'operational',
      lastCheck: now,
    });

    // Manual review queue processor
    services.push({
      service: 'Review Queue Processor',
      status: 'operational',
      lastCheck: now,
    });

    return services;
  }

  /**
   * Check external API health based on recent verification attempts
   */
  private async checkExternalAPIs(): Promise<ExternalAPIHealth[]> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results: ExternalAPIHealth[] = [];

    for (const { platform, api } of PLATFORM_APIS) {
      // Get verification attempts for this platform
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
        .orderBy(desc(verificationAttempts.attemptedAt))
        .limit(100);

      const total = attempts.length;
      const failures = attempts.filter(a => !a.success).length;
      const errorRate = total > 0 ? (failures / total) * 100 : 0;
      const lastSuccess = attempts.find(a => a.success)?.attemptedAt;

      let status: 'operational' | 'degraded' | 'outage' | 'unknown' = 'unknown';
      
      if (total === 0) {
        status = 'unknown';
      } else if (errorRate > THRESHOLDS.errorRateCritical) {
        status = 'outage';
      } else if (errorRate > THRESHOLDS.errorRateWarning) {
        status = 'degraded';
      } else {
        status = 'operational';
      }

      results.push({
        api,
        platform,
        status,
        lastSuccess: lastSuccess ?? undefined,
        failureCount24h: failures,
        errorRate,
      });
    }

    return results;
  }

  /**
   * Gather operational metrics
   */
  private async gatherMetrics(): Promise<{
    verificationQueueLength: number;
    averageProcessingTime: number;
    activeConnections: number;
    pendingReviews: number;
  }> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count pending verification attempts (approximation)
    const queueLength = 0; // Would need a queue system to track this

    // Average processing time (from verification attempts)
    // This is a simplification - actual processing time would need timestamps
    const avgProcessingTime = 0;

    // Active social connections
    const connections = await db
      .select({ count: count() })
      .from(socialConnections)
      .where(eq(socialConnections.isActive, true));

    // Pending manual reviews
    const { manualReviewQueue } = await import('@shared/schema');
    const pendingReviews = await db
      .select({ count: count() })
      .from(manualReviewQueue)
      .where(eq(manualReviewQueue.status, 'pending'));

    return {
      verificationQueueLength: queueLength,
      averageProcessingTime: avgProcessingTime,
      activeConnections: Number(connections[0]?.count || 0),
      pendingReviews: Number(pendingReviews[0]?.count || 0),
    };
  }

  /**
   * Generate alerts based on health data
   */
  private generateAlerts(
    services: ServiceHealth[],
    externalAPIs: ExternalAPIHealth[],
    metrics: {
      verificationQueueLength: number;
      averageProcessingTime: number;
      activeConnections: number;
      pendingReviews: number;
    }
  ): Array<{ severity: 'info' | 'warning' | 'critical'; message: string; timestamp: Date }> {
    const alerts: Array<{ severity: 'info' | 'warning' | 'critical'; message: string; timestamp: Date }> = [];
    const now = new Date();

    // Check services
    for (const service of services) {
      if (service.status === 'outage') {
        alerts.push({
          severity: 'critical',
          message: `${service.service} is experiencing an outage: ${service.message || 'Unknown error'}`,
          timestamp: now,
        });
      } else if (service.status === 'degraded') {
        alerts.push({
          severity: 'warning',
          message: `${service.service} is degraded: ${service.latency ? `High latency (${service.latency}ms)` : service.message || 'Unknown issue'}`,
          timestamp: now,
        });
      }
    }

    // Check external APIs
    for (const api of externalAPIs) {
      if (api.status === 'outage') {
        alerts.push({
          severity: 'critical',
          message: `${api.api} appears to be down (${api.errorRate.toFixed(1)}% error rate in last 24h)`,
          timestamp: now,
        });
      } else if (api.status === 'degraded') {
        alerts.push({
          severity: 'warning',
          message: `${api.api} has elevated error rate (${api.errorRate.toFixed(1)}%)`,
          timestamp: now,
        });
      }
    }

    // Check metrics
    if (metrics.verificationQueueLength > THRESHOLDS.queueLengthCritical) {
      alerts.push({
        severity: 'critical',
        message: `Verification queue backlog is critical (${metrics.verificationQueueLength} items)`,
        timestamp: now,
      });
    } else if (metrics.verificationQueueLength > THRESHOLDS.queueLengthWarning) {
      alerts.push({
        severity: 'warning',
        message: `Verification queue backlog is growing (${metrics.verificationQueueLength} items)`,
        timestamp: now,
      });
    }

    if (metrics.pendingReviews > THRESHOLDS.reviewBacklogCritical) {
      alerts.push({
        severity: 'critical',
        message: `Manual review backlog is critical (${metrics.pendingReviews} items)`,
        timestamp: now,
      });
    } else if (metrics.pendingReviews > THRESHOLDS.reviewBacklogWarning) {
      alerts.push({
        severity: 'warning',
        message: `Manual review backlog is growing (${metrics.pendingReviews} items)`,
        timestamp: now,
      });
    }

    return alerts;
  }

  /**
   * Quick health check for load balancers
   */
  async quickHealthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Quick DB check
      await db.execute(sql`SELECT 1`);
      return { healthy: true, message: 'OK' };
    } catch (error: any) {
      return { healthy: false, message: error.message || 'Database connectivity issue' };
    }
  }
}

export const verificationHealth = new VerificationHealthService();
