import { Express, Response } from "express";
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from '../../middleware/rbac';
import { getDynamicAnalyticsService } from '../../services/analytics/dynamic-analytics-service';

export function registerDynamicAnalyticsRoutes(app: Express) {
  // Middleware: All analytics routes require Fandomly admin role
  const adminAuth = [authenticateUser, requireFandomlyAdmin];

  /**
   * GET /api/admin/dynamic-analytics/wallets
   * Get wallet analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/wallets", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getWalletAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic wallet analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch wallet analytics',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/visits
   * Get visit analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/visits", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getVisitAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic visit analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch visit analytics',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/overview
   * Get overview analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/overview", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getOverviewAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic overview analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch overview analytics',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/topline
   * Get topline analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/topline", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getToplineAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic topline analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch topline analytics',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/engagement
   * Get engagement analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/engagement", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getEngagementAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic engagement analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch engagement analytics',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/wallets/breakdown
   * Get wallet breakdown analytics from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/wallets/breakdown", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { startDate, endDate } = req.query;
      const result = await service.getWalletBreakdownAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic wallet breakdown:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch wallet breakdown',
        configured: true,
      });
    }
  });

  /**
   * GET /api/admin/dynamic-analytics/users
   * Get all users from Dynamic
   */
  app.get("/api/admin/dynamic-analytics/users", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = getDynamicAnalyticsService();
      
      if (!service) {
        return res.json({
          success: false,
          error: 'Dynamic Analytics not configured',
          configured: false,
        });
      }

      const { limit, offset } = req.query;
      const result = await service.getAllUsers(
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );

      res.json({
        ...result,
        configured: true,
      });
    } catch (error: any) {
      console.error('Error fetching Dynamic users:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch users',
        configured: true,
      });
    }
  });
}

