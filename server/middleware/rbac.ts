import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      userId?: string;
    };
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'fandomly_admin' | 'customer_admin' | 'customer_end_user';
    customerTier?: 'basic' | 'premium' | 'vip' | null;
    adminPermissions?: any;
    customerAdminData?: any;
  };
  dynamicUser?: {
    id: string;
    dynamicUserId: string;
    alias?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    verifiedCredentials?: any[];
    walletAddress?: string;
    walletChain?: string;
  };
}

// Middleware to verify user authentication and attach role information
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Get Dynamic user ID from verified JWT (set by verifyDynamicAuth middleware)
    const dynamicUserId = req.dynamicUser?.dynamicUserId;
    
    if (!dynamicUserId) {
      return res.status(401).json({ error: 'Authentication required - no verified user identity' });
    }

    // Fetch user with role information using verified Dynamic user ID from JWT
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        customerTier: users.customerTier,
        adminPermissions: users.adminPermissions,
        customerAdminData: users.customerAdminData,
      })
      .from(users)
      .where(eq(users.dynamicUserId, dynamicUserId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      ...user,
      customerTier: user.customerTier || undefined,
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Role-based access control middleware
export function requireRole(allowedRoles: Array<'fandomly_admin' | 'customer_admin' | 'customer_end_user'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

// Customer tier access control
export function requireCustomerTier(minTier: 'basic' | 'premium' | 'vip') {
  const tierLevels = { basic: 1, premium: 2, vip: 3 };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'customer_end_user') {
      // Non-customer end users bypass tier restrictions
      return next();
    }

    const userTierLevel = tierLevels[req.user.customerTier || 'basic'];
    const requiredTierLevel = tierLevels[minTier];

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: 'Insufficient tier access',
        required: minTier,
        current: req.user.customerTier || 'basic'
      });
    }

    next();
  };
}

// Admin permission check
export function requireAdminPermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'fandomly_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.user.adminPermissions || !req.user.adminPermissions[permission]) {
      return res.status(403).json({ 
        error: 'Insufficient admin permissions',
        required: permission
      });
    }

    next();
  };
}

// Resource ownership check (for customer_admin accessing their own resources)
export function requireResourceOwnership(resourceIdParam: string = 'id') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fandomly admins can access any resource
    if (req.user.role === 'fandomly_admin') {
      return next();
    }

    // Customer admins can only access their own resources
    if (req.user.role === 'customer_admin') {
      const resourceId = req.params[resourceIdParam];
      
      try {
        // Check if the resource belongs to this customer admin
        // This would need to be customized based on the specific resource type
        // For now, we'll assume the resourceId matches the user ID or creator ID
        const [creator] = await db
          .select({ userId: users.id })
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1);

        if (!creator || creator.userId !== req.user.id) {
          return res.status(403).json({ error: 'Access denied: Resource not owned by user' });
        }

        return next();
      } catch (error) {
        console.error('Resource ownership check error:', error);
        return res.status(500).json({ error: 'Access verification failed' });
      }
    }

    // Customer end users have limited access
    next();
  };
}

// Utility function to check if user has access to specific features
export function hasFeatureAccess(
  user: AuthenticatedRequest['user'], 
  feature: 'nil_dashboard' | 'advanced_analytics' | 'bulk_operations' | 'api_access'
): boolean {
  if (!user) return false;

  switch (feature) {
    case 'nil_dashboard':
      return user.role === 'customer_admin' || user.role === 'fandomly_admin';
    
    case 'advanced_analytics':
      return user.role === 'fandomly_admin' || 
             (user.role === 'customer_admin') ||
             (user.role === 'customer_end_user' && (user.customerTier === 'premium' || user.customerTier === 'vip'));
    
    case 'bulk_operations':
      return user.role === 'fandomly_admin' || user.role === 'customer_admin';
    
    case 'api_access':
      return user.role === 'fandomly_admin' || 
             (user.role === 'customer_admin') ||
             (user.role === 'customer_end_user' && user.customerTier === 'vip');
    
    default:
      return false;
  }
}