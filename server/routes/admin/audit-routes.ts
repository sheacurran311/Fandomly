import { Router, Response } from 'express';
import type { IStorage } from '../core/storage';
import { authenticateUser, requireRole, AuthenticatedRequest } from '../../middleware/rbac';

/**
 * Audit log routes for viewing system audit trails
 * All endpoints require fandomly_admin role
 */
export function createAuditRoutes(storage: IStorage) {
  const router = Router();

  /**
   * GET /api/audit-logs
   * Get audit logs with optional filters
   * Required: fandomly_admin role
   */
  router.get('/', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userId,
        resource,
        action,
        tenantId,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = req.query;

      const filters: any = {};

      if (userId) filters.userId = userId as string;
      if (resource) filters.resource = resource as string;
      if (action) filters.action = action as string;
      if (tenantId) filters.tenantId = tenantId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      filters.limit = Math.min(parseInt(limit as string) || 100, 1000); // Max 1000 per request
      filters.offset = parseInt(offset as string) || 0;

      const logs = await storage.getAuditLogs(filters);

      res.json({
        logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: logs.length,
        },
      });
    } catch (error) {
      console.error('[Audit Routes] Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  /**
   * GET /api/audit-logs/:id
   * Get a specific audit log by ID
   * Required: fandomly_admin role
   */
  router.get('/:id', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const log = await storage.getAuditLogById(id);

      if (!log) {
        return res.status(404).json({ error: 'Audit log not found' });
      }

      res.json({ log });
    } catch (error) {
      console.error('[Audit Routes] Error fetching audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  /**
   * GET /api/audit-logs/user/:userId
   * Get audit logs for a specific user
   * Required: fandomly_admin role
   */
  router.get('/user/:userId', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const logs = await storage.getAuditLogs({
        userId,
        limit: Math.min(parseInt(limit as string) || 100, 1000),
        offset: parseInt(offset as string) || 0,
      });

      res.json({
        logs,
        pagination: {
          limit: Math.min(parseInt(limit as string) || 100, 1000),
          offset: parseInt(offset as string) || 0,
          total: logs.length,
        },
      });
    } catch (error) {
      console.error('[Audit Routes] Error fetching user audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch user audit logs' });
    }
  });

  /**
   * GET /api/audit-logs/resource/:resource/:resourceId
   * Get audit logs for a specific resource
   * Required: fandomly_admin role
   */
  router.get('/resource/:resource/:resourceId', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { resource, resourceId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const logs = await storage.getAuditLogs({
        resource,
        limit: Math.min(parseInt(limit as string) || 100, 1000),
        offset: parseInt(offset as string) || 0,
      });

      // Filter by resourceId (not a direct filter in storage layer)
      const filteredLogs = logs.filter(log => log.resourceId === resourceId);

      res.json({
        logs: filteredLogs,
        pagination: {
          limit: Math.min(parseInt(limit as string) || 100, 1000),
          offset: parseInt(offset as string) || 0,
          total: filteredLogs.length,
        },
      });
    } catch (error) {
      console.error('[Audit Routes] Error fetching resource audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch resource audit logs' });
    }
  });

  return router;
}
