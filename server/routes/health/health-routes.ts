/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring system health.
 * Includes both public health endpoints and detailed admin endpoints.
 */

import { Express, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest, requireFandomlyAdmin } from '../../middleware/rbac';
import { verificationHealth } from '../../services/health/verification-health';

export function registerHealthRoutes(app: Express) {
  /**
   * GET /health
   * Quick health check for load balancers and monitoring
   * This endpoint is public and returns minimal data.
   */
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const result = await verificationHealth.quickHealthCheck();
      
      if (result.healthy) {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          message: result.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/health/detailed
   * Detailed health report for internal monitoring
   * Requires authentication.
   */
  app.get(
    '/api/health/detailed',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const forceRefresh = req.query.refresh === 'true';
        const report = await verificationHealth.getHealthReport(forceRefresh);
        
        res.json(report);
      } catch (error: any) {
        console.error('[Health] Detailed report error:', error);
        res.status(500).json({ error: 'Failed to generate health report' });
      }
    }
  );

  /**
   * GET /api/health/services
   * Get status of internal services only
   */
  app.get(
    '/api/health/services',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const report = await verificationHealth.getHealthReport();
        res.json({
          services: report.services,
          overallStatus: report.overallStatus,
          timestamp: report.timestamp,
        });
      } catch (error: any) {
        console.error('[Health] Services status error:', error);
        res.status(500).json({ error: 'Failed to fetch services status' });
      }
    }
  );

  /**
   * GET /api/health/external
   * Get status of external API integrations
   */
  app.get(
    '/api/health/external',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const report = await verificationHealth.getHealthReport();
        res.json({
          externalAPIs: report.externalAPIs,
          timestamp: report.timestamp,
        });
      } catch (error: any) {
        console.error('[Health] External APIs status error:', error);
        res.status(500).json({ error: 'Failed to fetch external API status' });
      }
    }
  );

  /**
   * GET /api/health/alerts
   * Get current health alerts
   */
  app.get(
    '/api/health/alerts',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const report = await verificationHealth.getHealthReport();
        res.json({
          alerts: report.alerts,
          severity: report.alerts.length === 0 
            ? 'none' 
            : report.alerts.some(a => a.severity === 'critical') 
              ? 'critical' 
              : report.alerts.some(a => a.severity === 'warning') 
                ? 'warning' 
                : 'info',
          timestamp: report.timestamp,
        });
      } catch (error: any) {
        console.error('[Health] Alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
      }
    }
  );

  /**
   * GET /api/health/metrics
   * Get operational metrics
   */
  app.get(
    '/api/health/metrics',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const report = await verificationHealth.getHealthReport();
        res.json({
          metrics: report.metrics,
          timestamp: report.timestamp,
        });
      } catch (error: any) {
        console.error('[Health] Metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    }
  );
}
