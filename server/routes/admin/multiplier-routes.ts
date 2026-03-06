/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Multiplier Management Routes
 *
 * Endpoints for managing active multiplier events:
 * - List all multipliers (active and upcoming)
 * - Create new multiplier events
 * - Update existing multipliers
 * - Deactivate multipliers
 */

import type { Express } from 'express';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { activeMultipliers, tenantMemberships } from '@shared/schema';
import { eq, and, or, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const createMultiplierSchema = z.object({
  tenantId: z.string().optional(), // null for platform-wide
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['time_based', 'streak_based', 'tier_based', 'event', 'task_specific']),
  multiplier: z.number().min(1.0).max(10.0),
  conditions: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      timeRanges: z
        .array(
          z.object({
            start: z.string(),
            end: z.string(),
          })
        )
        .optional(),
      timezone: z.string().optional(),
      requiredStreak: z.number().optional(),
      streakType: z.enum(['daily_checkin', 'task_completion']).optional(),
      requiredTier: z.string().optional(),
      minPointsBalance: z.number().optional(),
      applicableTaskTypes: z.array(z.string()).optional(),
      applicableTaskIds: z.array(z.string()).optional(),
      applicablePlatforms: z.array(z.string()).optional(),
      newUsersOnly: z.boolean().optional(),
      userRegisteredAfter: z.string().optional(),
    })
    .optional(),
  stackingType: z.enum(['additive', 'multiplicative']).default('multiplicative'),
  priority: z.number().default(0),
  canStackWithOthers: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const updateMultiplierSchema = createMultiplierSchema.partial();

/**
 * Check if user is admin for the tenant or platform admin.
 * Platform-wide multipliers (no tenantId) require fandomly_admin role.
 * Tenant-scoped multipliers require admin/owner in THAT specific tenant.
 */
async function isAdmin(
  userId: string,
  userRole: string | undefined,
  tenantId?: string
): Promise<boolean> {
  if (!tenantId) {
    // Platform-wide multipliers require fandomly_admin role
    return userRole === 'fandomly_admin';
  }

  // Check if admin/owner in the SPECIFIC tenant
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.tenantId, tenantId),
      or(eq(tenantMemberships.role, 'admin'), eq(tenantMemberships.role, 'owner'))
    ),
  });

  return !!membership;
}

export function registerMultiplierRoutes(app: Express) {
  /**
   * GET /api/admin/multipliers
   * List all multipliers (with optional tenant filter)
   */
  app.get('/api/admin/multipliers', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tenantId = req.query.tenantId as string | undefined;

      // Check admin access
      const hasAccess = await isAdmin(userId, req.user?.role, tenantId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Fetch multipliers
      let query = db.select().from(activeMultipliers);

      if (tenantId) {
        query = query.where(
          or(eq(activeMultipliers.tenantId, tenantId), isNull(activeMultipliers.tenantId))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
      }

      const multipliers = await query.orderBy(desc(activeMultipliers.createdAt));

      res.json({ multipliers });
    } catch (error) {
      console.error('[Multipliers API] List error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  /**
   * GET /api/admin/multipliers/:id
   * Get a specific multiplier by ID
   */
  app.get(
    '/api/admin/multipliers/:id',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const multiplier = await db.query.activeMultipliers.findFirst({
          where: eq(activeMultipliers.id, id),
        });

        if (!multiplier) {
          return res.status(404).json({ error: 'Multiplier not found' });
        }

        // Check admin access for this multiplier's tenant
        const hasAccess = await isAdmin(userId, req.user?.role, multiplier.tenantId || undefined);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        res.json(multiplier);
      } catch (error) {
        console.error('[Multipliers API] Get error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/admin/multipliers
   * Create a new multiplier event
   */
  app.post('/api/admin/multipliers', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      const validation = createMultiplierSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const data = validation.data;

      // Check admin access
      const hasAccess = await isAdmin(userId, req.user?.role, data.tenantId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Create multiplier
      const [multiplier] = await db
        .insert(activeMultipliers)
        .values({
          tenantId: data.tenantId || null,
          name: data.name,
          description: data.description || null,
          type: data.type,
          multiplier: data.multiplier.toString(),
          conditions: data.conditions || null,
          stackingType: data.stackingType,
          priority: data.priority,
          canStackWithOthers: data.canStackWithOthers,
          isActive: data.isActive,
          createdBy: userId,
        })
        .returning();

      res.status(201).json(multiplier);
    } catch (error) {
      console.error('[Multipliers API] Create error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  /**
   * PUT /api/admin/multipliers/:id
   * Update an existing multiplier
   */
  app.put(
    '/api/admin/multipliers/:id',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        // Check if multiplier exists
        const existing = await db.query.activeMultipliers.findFirst({
          where: eq(activeMultipliers.id, id),
        });

        if (!existing) {
          return res.status(404).json({ error: 'Multiplier not found' });
        }

        // Check admin access
        const hasAccess = await isAdmin(userId, req.user?.role, existing.tenantId || undefined);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        // Validate request body
        const validation = updateMultiplierSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request data',
            details: validation.error.issues,
          });
        }

        const data = validation.data;

        // Build update object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.type !== undefined) updates.type = data.type;
        if (data.multiplier !== undefined) updates.multiplier = data.multiplier.toString();
        if (data.conditions !== undefined) updates.conditions = data.conditions;
        if (data.stackingType !== undefined) updates.stackingType = data.stackingType;
        if (data.priority !== undefined) updates.priority = data.priority;
        if (data.canStackWithOthers !== undefined)
          updates.canStackWithOthers = data.canStackWithOthers;
        if (data.isActive !== undefined) updates.isActive = data.isActive;

        // Update multiplier
        const [updated] = await db
          .update(activeMultipliers)
          .set(updates)
          .where(eq(activeMultipliers.id, id))
          .returning();

        res.json(updated);
      } catch (error) {
        console.error('[Multipliers API] Update error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * DELETE /api/admin/multipliers/:id
   * Deactivate a multiplier (soft delete)
   */
  app.delete(
    '/api/admin/multipliers/:id',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        // Check if multiplier exists
        const existing = await db.query.activeMultipliers.findFirst({
          where: eq(activeMultipliers.id, id),
        });

        if (!existing) {
          return res.status(404).json({ error: 'Multiplier not found' });
        }

        // Check admin access
        const hasAccess = await isAdmin(userId, req.user?.role, existing.tenantId || undefined);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        // Deactivate (soft delete)
        await db
          .update(activeMultipliers)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(activeMultipliers.id, id));

        res.json({ success: true, message: 'Multiplier deactivated' });
      } catch (error) {
        console.error('[Multipliers API] Delete error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );
}
