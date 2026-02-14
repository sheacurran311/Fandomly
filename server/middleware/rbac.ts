import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { verifyAccessToken, verifyRefreshToken, JWTUserPayload } from '../services/auth/jwt-service';

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
    userType?: string;
    customerTier?: 'basic' | 'premium' | 'vip' | null;
    adminPermissions?: any;
    customerAdminData?: any;
    dynamicUserId?: string;  // Legacy: Dynamic user ID (for backward compatibility)
    authProvider?: string;   // New: which auth provider was used
    isAdmin?: boolean;
  };
  jwtPayload?: JWTUserPayload; // Store JWT payload for reference
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

/**
 * Middleware to verify user authentication and attach role information
 * Supports both:
 * 1. JWT-based auth (new system) via Authorization: Bearer header
 * 2. Legacy Dynamic auth via x-dynamic-user-id header (for gradual migration)
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Try JWT authentication first (new system)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const payload = verifyAccessToken(token);
        req.jwtPayload = payload;
        
        // Fetch user by ID from JWT
        const [user] = await db
          .select({
            id: users.id,
            role: users.role,
            userType: users.userType,
            customerTier: users.customerTier,
            adminPermissions: users.adminPermissions,
            customerAdminData: users.customerAdminData,
          })
          .from(users)
          .where(eq(users.id, payload.sub))
          .limit(1);

        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
          ...user,
          customerTier: user.customerTier || undefined,
          authProvider: payload.provider,
          isAdmin: user.role === 'fandomly_admin',
        };
        
        console.log('[Auth] JWT auth successful for user:', user.id);
        return next();
      } catch (jwtError: any) {
        // JWT verification failed - check if it's expired
        if (jwtError.message === 'Token expired') {
          return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        console.log('[Auth] JWT verification failed:', jwtError.message);
        // Fall through to legacy auth
      }
    }

    // Try cookie-based auth (refresh_token cookie)
    const refreshTokenCookie = req.cookies?.refresh_token;
    if (refreshTokenCookie) {
      try {
        const payload = verifyRefreshToken(refreshTokenCookie);
        const [user] = await db
          .select({
            id: users.id,
            role: users.role,
            userType: users.userType,
            customerTier: users.customerTier,
            adminPermissions: users.adminPermissions,
            customerAdminData: users.customerAdminData,
          })
          .from(users)
          .where(eq(users.id, payload.sub))
          .limit(1);

        if (user) {
          req.user = {
            ...user,
            customerTier: user.customerTier || undefined,
            isAdmin: user.role === 'fandomly_admin',
          };
          console.log('[Auth] Cookie auth successful for user:', user.id);
          return next();
        }
      } catch (cookieError: any) {
        console.log('[Auth] Cookie auth failed:', cookieError.message);
        // Fall through to legacy auth
      }
    }

    // Legacy: Extract Dynamic user ID from headers or body
    const dynamicUserId = req.headers['x-dynamic-user-id'] as string || req.body?.dynamicUserId;
    
    if (!dynamicUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user with role information using Dynamic user ID
    let [user] = await db
      .select({
        id: users.id,
        role: users.role,
        userType: users.userType,
        customerTier: users.customerTier,
        adminPermissions: users.adminPermissions,
        customerAdminData: users.customerAdminData,
      })
      .from(users)
      .where(eq(users.dynamicUserId, dynamicUserId))
      .limit(1);

    // Fallback: client may pass internal user id when dynamicUserId is not set
    if (!user) {
      [user] = await db
        .select({
          id: users.id,
          role: users.role,
          userType: users.userType,
          customerTier: users.customerTier,
          adminPermissions: users.adminPermissions,
          customerAdminData: users.customerAdminData,
        })
        .from(users)
        .where(eq(users.id, dynamicUserId))
        .limit(1);
    }

    // Auto-create user if they don't exist (Dynamic authenticated but not in our DB)
    if (!user) {
      console.log('[Auth] User not found, auto-creating for dynamicUserId:', dynamicUserId);
      
      // Create a basic fan user account
      const [newUser] = await db.insert(users).values({
        dynamicUserId,
        username: `user_${dynamicUserId.substring(0, 8)}`,
        email: null,
        userType: 'fan',
        role: 'customer_end_user',
        walletAddress: '',
        walletChain: '',
      } as any).returning();
      
      user = {
        id: newUser.id,
        role: newUser.role as 'fandomly_admin' | 'customer_admin' | 'customer_end_user',
        userType: newUser.userType ?? 'fan',
        customerTier: newUser.customerTier,
        adminPermissions: newUser.adminPermissions,
        customerAdminData: newUser.customerAdminData,
      };
      
      console.log('[Auth] Auto-created user:', user.id);
    }

    req.user = {
      ...user,
      customerTier: user.customerTier || undefined,
      dynamicUserId: dynamicUserId,
      isAdmin: user.role === 'fandomly_admin',
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

// Middleware to require Fandomly admin access
export function requireFandomlyAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'fandomly_admin') {
    return res.status(403).json({ 
      error: 'Fandomly admin access required',
      current: req.user.role
    });
  }

  next();
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