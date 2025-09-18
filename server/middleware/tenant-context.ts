import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { AuthenticatedRequest } from './rbac';

declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: {
      tenantId: string;
      userRole: 'owner' | 'admin' | 'member' | null;
      canModify: boolean;
      canView: boolean;
    };
  }
}

/**
 * Middleware to validate tenant context and user permissions within that tenant
 * Prevents cross-tenant data access
 */
export function validateTenantContext(paramName: string = 'tenantId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params[paramName];
      const userId = req.user?.id;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Check if tenant exists
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Fandomly admins can access any tenant
      if (req.user?.role === 'fandomly_admin') {
        req.tenantContext = {
          tenantId,
          userRole: 'admin',
          canModify: true,
          canView: true,
        };
        return next();
      }

      // Check user's relationship to this tenant
      let userRole: 'owner' | 'admin' | 'member' | null = null;
      let canModify = false;
      let canView = false;

      // Check if user is the tenant owner
      if (tenant.ownerId === userId) {
        userRole = 'owner';
        canModify = true;
        canView = true;
      } else {
        // Check tenant membership
        try {
          const membership = await storage.getTenantMembership(tenantId, userId);
          if (membership) {
            switch (membership.role) {
              case 'admin':
                userRole = 'admin';
                canModify = true;
                canView = true;
                break;
              case 'member':
                userRole = 'member';
                canModify = false;
                canView = true;
                break;
              default:
                userRole = 'member';
                canModify = false;
                canView = true;
            }
          }
        } catch (error) {
          console.error('Error checking tenant membership:', error);
          // Continue with null role if membership check fails
        }
      }

      // If user has no relationship to this tenant, deny access
      if (!userRole) {
        return res.status(403).json({ 
          error: 'Access denied: You do not have permission to access this tenant',
          tenantId 
        });
      }

      // Attach tenant context to request
      req.tenantContext = {
        tenantId,
        userRole,
        canModify,
        canView,
      };

      next();
    } catch (error) {
      console.error('Tenant context validation error:', error);
      res.status(500).json({ error: 'Tenant access validation failed' });
    }
  };
}

/**
 * Middleware to require modify permissions within tenant context
 */
export function requireTenantModifyPermission() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(500).json({ error: 'Tenant context not initialized' });
    }

    if (!req.tenantContext.canModify) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to modify this tenant',
        userRole: req.tenantContext.userRole,
        required: 'owner or admin'
      });
    }

    next();
  };
}

/**
 * Middleware to require view permissions within tenant context
 */
export function requireTenantViewPermission() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(500).json({ error: 'Tenant context not initialized' });
    }

    if (!req.tenantContext.canView) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to view this tenant',
        userRole: req.tenantContext.userRole
      });
    }

    next();
  };
}

/**
 * Middleware to validate user access to specific user resources within tenant context
 * Prevents users from accessing other users' data even within the same tenant
 */
export function validateUserResourceAccess(userIdParam: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const targetUserId = req.params[userIdParam];
    const currentUserId = req.user?.id;

    if (!targetUserId || !currentUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fandomly admins can access any user's resources
    if (req.user?.role === 'fandomly_admin') {
      return next();
    }

    // Tenant owners/admins can access member resources within their tenant
    if (req.tenantContext?.canModify) {
      return next();
    }

    // Users can only access their own resources
    if (targetUserId !== currentUserId) {
      return res.status(403).json({ 
        error: 'Access denied: You can only access your own resources' 
      });
    }

    next();
  };
}