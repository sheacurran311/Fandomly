/**
 * Verification Analytics API Routes
 * 
 * Provides endpoints for verification metrics, platform health,
 * and audit logs for creators and admins.
 */

import { Express, Response } from 'express';
import { authenticateUser, AuthenticatedRequest, requireRole } from '../../middleware/rbac';
import { verificationAnalytics } from '../../services/analytics/verification-analytics';

export function registerVerificationAnalyticsRoutes(app: Express) {
  /**
   * GET /api/analytics/verification/metrics
   * Get comprehensive verification metrics
   * 
   * Query params:
   * - startDate: ISO date string
   * - endDate: ISO date string
   */
  app.get(
    '/api/analytics/verification/metrics',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { startDate, endDate } = req.query;
        
        const metrics = await verificationAnalytics.getMetrics(
          undefined, // tenantId - could be extracted from user
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        res.json(metrics);
      } catch (error: any) {
        console.error('[Analytics] Metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    }
  );

  /**
   * GET /api/analytics/verification/daily
   * Get daily verification statistics for charting
   * 
   * Query params:
   * - days: number of days (default 30, max 90)
   */
  app.get(
    '/api/analytics/verification/daily',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = Math.min(90, parseInt(req.query.days as string) || 30);
        
        const stats = await verificationAnalytics.getDailyStats(days);
        
        res.json(stats);
      } catch (error: any) {
        console.error('[Analytics] Daily stats error:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
      }
    }
  );

  /**
   * GET /api/analytics/verification/platform-health
   * Get health status for all platforms
   */
  app.get(
    '/api/analytics/verification/platform-health',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const health = await verificationAnalytics.getPlatformHealth();
        
        res.json(health);
      } catch (error: any) {
        console.error('[Analytics] Platform health error:', error);
        res.status(500).json({ error: 'Failed to fetch platform health' });
      }
    }
  );

  /**
   * GET /api/analytics/verification/audit
   * Get audit log of verification activities
   * 
   * Query params:
   * - userId: filter by user
   * - platform: filter by platform
   * - startDate: ISO date string
   * - endDate: ISO date string
   * - limit: number (default 100, max 500)
   * - offset: number (default 0)
   */
  app.get(
    '/api/analytics/verification/audit',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId, taskId, platform, startDate, endDate, limit, offset } = req.query;
        
        const result = await verificationAnalytics.getAuditLog({
          userId: userId as string,
          taskId: taskId as string,
          platform: platform as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          limit: Math.min(500, parseInt(limit as string) || 100),
          offset: parseInt(offset as string) || 0,
        });
        
        res.json(result);
      } catch (error: any) {
        console.error('[Analytics] Audit log error:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
      }
    }
  );

  /**
   * GET /api/analytics/verification/creator/:creatorId
   * Get creator-specific verification statistics
   */
  app.get(
    '/api/analytics/verification/creator/:creatorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { creatorId } = req.params;
        const userId = req.user?.id;
        
        // Verify the requesting user has access to this creator's data
        // Either they are the creator or an admin
        if (creatorId !== userId && !req.user?.isAdmin) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        const stats = await verificationAnalytics.getCreatorStats(creatorId);
        
        res.json(stats);
      } catch (error: any) {
        console.error('[Analytics] Creator stats error:', error);
        res.status(500).json({ error: 'Failed to fetch creator stats' });
      }
    }
  );

  /**
   * GET /api/analytics/verification/summary
   * Get a quick summary for dashboard widgets
   */
  app.get(
    '/api/analytics/verification/summary',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Get last 7 days of metrics
        const endDate = new Date();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const [metrics, health] = await Promise.all([
          verificationAnalytics.getMetrics(undefined, startDate, endDate),
          verificationAnalytics.getPlatformHealth(),
        ]);
        
        // Calculate health summary
        const healthySystems = health.filter(p => p.status === 'healthy').length;
        const degradedSystems = health.filter(p => p.status === 'degraded').length;
        const downSystems = health.filter(p => p.status === 'down').length;
        
        res.json({
          totalVerifications7d: metrics.totalVerifications,
          successRate7d: metrics.successRate,
          pendingReviews: metrics.pendingManualReview,
          avgReviewTimeHours: metrics.avgReviewTime,
          systemHealth: {
            healthy: healthySystems,
            degraded: degradedSystems,
            down: downSystems,
            overallStatus: downSystems > 0 ? 'critical' : degradedSystems > 0 ? 'warning' : 'healthy',
          },
          topPlatforms: Object.entries(metrics.byPlatform)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([platform, stats]) => ({ platform, ...stats })),
        });
      } catch (error: any) {
        console.error('[Analytics] Summary error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
      }
    }
  );
}
