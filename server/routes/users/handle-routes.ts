/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Platform Handle Routes
 *
 * API endpoints for managing fan-claimed platform handles.
 * Used for T3 (manual) verification where OAuth isn't available.
 */

import { Express, Response } from 'express';
import { db } from '../../db';
import { fanPlatformHandles, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';

/**
 * Handle validation patterns per platform
 */
const HANDLE_PATTERNS: Record<string, RegExp> = {
  instagram: /^@?[a-zA-Z0-9._]{1,30}$/,
  tiktok: /^@?[a-zA-Z0-9._]{2,24}$/,
  twitter: /^@?[a-zA-Z0-9_]{1,15}$/,
  youtube: /^(UC[a-zA-Z0-9_-]{22}|@[a-zA-Z0-9_.-]{3,30})$/,
  facebook: /^[a-zA-Z0-9.]{5,50}$/,
  twitch: /^[a-zA-Z0-9_]{4,25}$/,
  kick: /^[a-zA-Z0-9_]{3,25}$/,
  discord: /^.{2,32}#[0-9]{4}$|^[a-zA-Z0-9_.]{2,32}$/,
};

/**
 * Normalize a handle (remove @, lowercase)
 */
function normalizeHandle(handle: string, platform: string): string {
  let normalized = handle.trim();

  // Remove @ prefix for most platforms
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1);
  }

  // Lowercase for most platforms (except YouTube channel IDs)
  if (platform !== 'youtube' || !normalized.startsWith('UC')) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Validate handle format for a platform
 */
function validateHandleFormat(handle: string, platform: string): boolean {
  const pattern = HANDLE_PATTERNS[platform.toLowerCase()];
  if (!pattern) return true; // Allow any format for unknown platforms
  return pattern.test(handle);
}

// Request schemas
const saveHandleSchema = z.object({
  platform: z.string().min(1),
  handle: z.string().min(1).max(100),
});

const updateHandleSchema = z.object({
  handle: z.string().min(1).max(100),
});

const verifyHandleSchema = z.object({
  verified: z.boolean(),
});

export function registerHandleRoutes(app: Express) {
  /**
   * Get all platform handles for the authenticated user
   * GET /api/users/me/platform-handles
   */
  app.get(
    '/api/users/me/platform-handles',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;

        const handles = await db.query.fanPlatformHandles.findMany({
          where: eq(fanPlatformHandles.userId, userId),
        });

        res.json(handles);
      } catch (error: any) {
        console.error('Error fetching platform handles:', error);
        res.status(500).json({
          error: 'Failed to fetch platform handles',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get platform handles for a specific user
   * GET /api/users/:userId/platform-handles
   */
  app.get(
    '/api/users/:userId/platform-handles',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const requesterId = req.user!.id;

        // Only allow the user themselves, creators, or admins to view handles
        if (requesterId !== userId) {
          const requesterUser = await db.query.users.findFirst({
            where: eq(users.id, requesterId),
          });
          if (
            !requesterUser ||
            (requesterUser.role !== 'fandomly_admin' && requesterUser.userType !== 'creator')
          ) {
            return res.status(403).json({ error: 'Not authorized to view these handles' });
          }
        }

        const handles = await db.query.fanPlatformHandles.findMany({
          where: eq(fanPlatformHandles.userId, userId),
        });

        res.json(handles);
      } catch (error: any) {
        console.error('Error fetching user platform handles:', error);
        res.status(500).json({
          error: 'Failed to fetch platform handles',
          message: error.message,
        });
      }
    }
  );

  /**
   * Save or update a platform handle
   * POST /api/users/me/platform-handles
   */
  app.post(
    '/api/users/me/platform-handles',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const validatedData = saveHandleSchema.parse(req.body);

        const { platform, handle } = validatedData;

        // Validate format
        const formatValid = validateHandleFormat(handle, platform);
        const normalized = normalizeHandle(handle, platform);

        // Check if handle already exists for this platform
        const existing = await db.query.fanPlatformHandles.findFirst({
          where: and(
            eq(fanPlatformHandles.userId, userId),
            eq(fanPlatformHandles.platform, platform as any)
          ),
        });

        if (existing) {
          // Update existing
          const [updated] = await db
            .update(fanPlatformHandles)
            .set({
              handle,
              normalizedHandle: normalized,
              formatValid,
              manuallyVerified: false, // Reset verification on update
              verifiedAt: null,
              verifiedBy: null,
              updatedAt: new Date(),
            })
            .where(eq(fanPlatformHandles.id, existing.id))
            .returning();

          return res.json(updated);
        }

        // Create new
        const [created] = await db
          .insert(fanPlatformHandles)
          .values({
            userId,
            platform: platform as any,
            handle,
            normalizedHandle: normalized,
            formatValid,
            manuallyVerified: false,
          })
          .returning();

        res.status(201).json(created);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error saving platform handle:', error);
        res.status(500).json({
          error: 'Failed to save platform handle',
          message: error.message,
        });
      }
    }
  );

  /**
   * Update a platform handle
   * PATCH /api/users/me/platform-handles/:platform
   */
  app.patch(
    '/api/users/me/platform-handles/:platform',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { platform } = req.params;
        const validatedData = updateHandleSchema.parse(req.body);

        const { handle } = validatedData;

        // Validate format
        const formatValid = validateHandleFormat(handle, platform);
        const normalized = normalizeHandle(handle, platform);

        // Find existing handle
        const existing = await db.query.fanPlatformHandles.findFirst({
          where: and(
            eq(fanPlatformHandles.userId, userId),
            eq(fanPlatformHandles.platform, platform as any)
          ),
        });

        if (!existing) {
          return res.status(404).json({ error: 'Handle not found' });
        }

        // Update
        const [updated] = await db
          .update(fanPlatformHandles)
          .set({
            handle,
            normalizedHandle: normalized,
            formatValid,
            manuallyVerified: false, // Reset verification on update
            verifiedAt: null,
            verifiedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(fanPlatformHandles.id, existing.id))
          .returning();

        res.json(updated);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error updating platform handle:', error);
        res.status(500).json({
          error: 'Failed to update platform handle',
          message: error.message,
        });
      }
    }
  );

  /**
   * Delete a platform handle
   * DELETE /api/users/me/platform-handles/:platform
   */
  app.delete(
    '/api/users/me/platform-handles/:platform',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { platform } = req.params;

        await db
          .delete(fanPlatformHandles)
          .where(
            and(
              eq(fanPlatformHandles.userId, userId),
              eq(fanPlatformHandles.platform, platform as any)
            )
          );

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error deleting platform handle:', error);
        res.status(500).json({
          error: 'Failed to delete platform handle',
          message: error.message,
        });
      }
    }
  );

  /**
   * Creator: Verify a fan's platform handle
   * POST /api/users/:userId/platform-handles/:platform/verify
   */
  app.post(
    '/api/users/:userId/platform-handles/:platform/verify',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId, platform } = req.params;
        const creatorUserId = req.user!.id;
        const validatedData = verifyHandleSchema.parse(req.body);

        // Verify the requester is a creator or admin
        const requesterUser = await db.query.users.findFirst({
          where: eq(users.id, creatorUserId),
        });
        if (
          !requesterUser ||
          (requesterUser.role !== 'fandomly_admin' && requesterUser.userType !== 'creator')
        ) {
          return res.status(403).json({ error: 'Only creators and admins can verify handles' });
        }

        // Find the handle
        const existing = await db.query.fanPlatformHandles.findFirst({
          where: and(
            eq(fanPlatformHandles.userId, userId),
            eq(fanPlatformHandles.platform, platform as any)
          ),
        });

        if (!existing) {
          return res.status(404).json({ error: 'Handle not found' });
        }

        // Update verification status
        const [updated] = await db
          .update(fanPlatformHandles)
          .set({
            manuallyVerified: validatedData.verified,
            verifiedAt: validatedData.verified ? new Date() : null,
            verifiedBy: validatedData.verified ? creatorUserId : null,
            updatedAt: new Date(),
          })
          .where(eq(fanPlatformHandles.id, existing.id))
          .returning();

        res.json(updated);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error verifying platform handle:', error);
        res.status(500).json({
          error: 'Failed to verify platform handle',
          message: error.message,
        });
      }
    }
  );
}
