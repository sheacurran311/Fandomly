import { Request, Response, NextFunction } from 'express';
import type { IStorage } from '../storage';
import type { AuthenticatedRequest } from './rbac';

/**
 * Audit logging middleware for tracking admin actions
 * This middleware should be applied to sensitive endpoints that require audit trails
 */
export function createAuditLogger(storage: IStorage) {
  return function auditLog(options: {
    resource: string;
    action: string;
    includeBody?: boolean;
    captureChanges?: (req: AuthenticatedRequest) => Promise<{ before?: any; after?: any }>;
  }) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Capture the original res.json to intercept response
      const originalJson = res.json.bind(res);
      let responseData: any = null;
      let statusCode: number = 200;

      res.json = function (data: any) {
        responseData = data;
        statusCode = res.statusCode;
        return originalJson(data);
      };

      // Capture the original res.status to track status codes
      const originalStatus = res.status.bind(res);
      res.status = function (code: number) {
        statusCode = code;
        return originalStatus(code);
      };

      // Wait for response to finish
      res.on('finish', async () => {
        try {
          // Only log if user is authenticated and has elevated privileges
          if (!req.user || !['fandomly_admin', 'customer_admin'].includes(req.user.role || '')) {
            return;
          }

          const changes = options.captureChanges ? await options.captureChanges(req) : undefined;

          // Get tenant context from request
          let tenantId: string | undefined;
          if (req.body?.tenantId) {
            tenantId = req.body.tenantId;
          } else if (req.query?.tenantId) {
            tenantId = req.query.tenantId as string;
          } else if (req.user) {
            // Try to get tenant from user's creator profile
            try {
              const creator = await storage.getCreatorByUserId(req.user.id);
              tenantId = creator?.tenantId;
            } catch (e) {
              // Ignore - tenant context not required
            }
          }

          await storage.createAuditLog({
            userId: req.user.id,
            userRole: req.user.role,
            action: options.action as any,
            resource: options.resource as any,
            resourceId: req.params.id || req.params.completionId || req.params.taskId || req.params.creatorId,
            tenantId,
            changes,
            metadata: {
              endpoint: req.originalUrl || req.url,
              method: req.method,
              statusCode,
              duration: Date.now() - startTime,
              ...(options.includeBody && req.body ? { requestBody: req.body } : {}),
              ...(statusCode >= 400 && responseData?.error ? { errorMessage: responseData.error } : {}),
            },
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
          });
        } catch (error) {
          console.error('[Audit Log] Failed to create audit log:', error);
          // Don't fail the request if audit logging fails
        }
      });

      next();
    };
  };
}

/**
 * Helper function to capture before/after changes for a resource
 */
export async function captureResourceChanges(
  storage: IStorage,
  resourceType: 'user' | 'creator' | 'program' | 'task' | 'reward' | 'physical_reward',
  resourceId: string,
  getAfter?: () => Promise<any>
): Promise<{ before?: any; after?: any }> {
  try {
    let before: any;

    // Get the "before" state
    switch (resourceType) {
      case 'user':
        before = await storage.getUser(resourceId);
        break;
      case 'creator':
        before = await storage.getCreator(resourceId);
        break;
      case 'task':
        before = await storage.getTask(resourceId);
        break;
      case 'reward':
        before = await storage.getReward(resourceId);
        break;
      // Add more cases as needed
    }

    // If a custom getAfter function is provided, use it
    const after = getAfter ? await getAfter() : undefined;

    return {
      before: before ? sanitizeForAudit(before) : undefined,
      after: after ? sanitizeForAudit(after) : undefined,
    };
  } catch (error) {
    console.error('[Audit Log] Failed to capture resource changes:', error);
    return {};
  }
}

/**
 * Sanitize data for audit logging (remove sensitive fields)
 */
function sanitizeForAudit(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'privateKey',
    'walletAddress', // PII
    'email', // PII
    'socialTokens', // Contains OAuth tokens
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForAudit(sanitized[key]);
    }
  }

  return sanitized;
}
