/**
 * Beta Signup Routes
 *
 * Handles email capture for the beta program waitlist.
 * Public endpoint - no authentication required.
 */

import type { Express, Request, Response } from 'express';
import { publicEndpointLimiter } from '../middleware/rate-limit';
import { db } from '../db';
import { betaSignups } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for beta signup
const betaSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  userType: z.enum(['creator', 'fan', 'brand', 'unknown']).optional().default('unknown'),
  source: z.string().optional().default('landing_page'),
  metadata: z
    .object({
      referrer: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    })
    .optional(),
});

export function registerBetaSignupRoutes(app: Express) {
  /**
   * POST /api/beta-signup
   * Register a new email for the beta waitlist
   */
  app.post('/api/beta-signup', publicEndpointLimiter, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = betaSignupSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.errors[0]?.message || 'Invalid input',
        });
      }

      const { email, userType, source, metadata: rawMetadata } = validationResult.data;

      // Sanitize metadata: remove undefined values so JSONB insert doesn't fail
      const metadata =
        rawMetadata && typeof rawMetadata === 'object'
          ? Object.fromEntries(Object.entries(rawMetadata).filter(([, v]) => v != null && v !== ''))
          : undefined;

      // Check if email already exists
      const existingSignup = await db
        .select()
        .from(betaSignups)
        .where(eq(betaSignups.email, email.toLowerCase()))
        .limit(1);

      if (existingSignup.length > 0) {
        return res.status(200).json({
          success: true,
          message: "You're already on the list! We'll be in touch soon.",
          alreadyRegistered: true,
        });
      }

      // Insert new signup (only include metadata if we have keys)
      const insertValues: Record<string, unknown> = {
        email: email.toLowerCase(),
        userType: userType ?? 'unknown',
        source: source ?? 'landing_page',
      };
      if (metadata && Object.keys(metadata).length > 0) {
        insertValues.metadata = metadata;
      }

      const [newSignup] = await db
        .insert(betaSignups)
        .values(insertValues as typeof betaSignups.$inferInsert)
        .returning();

      return res.status(201).json({
        success: true,
        message: "Welcome to the beta! We'll notify you when access is available.",
        alreadyRegistered: false,
        id: newSignup.id,
      });
    } catch (error) {
      const err = error as Error;
      const message = err?.message ?? String(error);
      console.error('Beta signup error:', message, error);

      // If table is missing, hint at running migrations
      const isMissingTable =
        typeof message === 'string' &&
        (message.includes('beta_signups') || message.includes('does not exist'));
      const hint = isMissingTable
        ? ' Run migrations (e.g. npm run db:push or apply migrations/0028_add_beta_signups.sql) and try again.'
        : '';

      return res.status(500).json({
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? `${message}${hint}`
            : 'Something went wrong. Please try again.',
      });
    }
  });

  /**
   * GET /api/beta-signup/count
   * Get count of beta signups (for display purposes)
   */
  app.get('/api/beta-signup/count', async (_req: Request, res: Response) => {
    try {
      const result = await db.select().from(betaSignups);
      const count = result.length;

      return res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      console.error('Beta signup count error:', error);
      return res.status(500).json({
        success: false,
        error: 'Could not fetch count',
      });
    }
  });
}
