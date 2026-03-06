/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Consent Checking Middleware (GDPR Article 6/7)
 *
 * Verifies that the authenticated user has granted consent for a specific
 * processing purpose before allowing the request to proceed.
 *
 * Usage:
 *   app.post('/api/newsletter/subscribe', authenticateUser, requireConsent('marketing'), handler);
 */

import type { Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import type { AuthenticatedRequest } from './rbac';

/**
 * Middleware factory: blocks the request if the user hasn't consented
 * to the specified purpose.
 *
 * @param purpose - Consent category to check (e.g., 'marketing', 'analytics')
 */
export function requireConsent(purpose: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const result = await db.execute(sql`
        SELECT is_granted
        FROM user_consents
        WHERE user_id = ${userId}
          AND consent_type = ${purpose}
        ORDER BY created_at DESC
        LIMIT 1
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const consent = (result as any).rows?.[0];

      if (!consent || !consent.is_granted) {
        return res.status(403).json({
          error: `Consent required for ${purpose}`,
          code: 'CONSENT_REQUIRED',
          purpose,
          message: `You must grant "${purpose}" consent to use this feature. Update your preferences in Settings > Privacy.`,
        });
      }

      next();
    } catch (err) {
      console.error(`[ConsentGuard] Error checking consent for ${purpose}:`, err);
      // Fail open — don't block the user on DB errors
      next();
    }
  };
}
