/**
 * Subscription Guard Middleware
 *
 * Ensures the user's tenant has an active subscription before allowing
 * resource creation. Blocks write operations when past_due or canceled.
 */

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './rbac';
import { db } from '../db';
import { tenants, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware that blocks resource creation when subscription is not active.
 *
 * - 'active' / 'trial': allowed
 * - 'past_due': allowed for reads, blocked for creates/updates (402)
 * - 'canceled' / 'suspended' / 'inactive': blocked (402)
 * - Free tier with no Stripe subscription: allowed (no payment needed)
 */
export function requireActiveSubscription() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user's tenant
      const user = await db
        .select({ currentTenantId: users.currentTenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const tenantId = user[0]?.currentTenantId;
      if (!tenantId) {
        // No tenant — let the route handler deal with it
        return next();
      }

      const [tenant] = await db
        .select({
          subscriptionTier: tenants.subscriptionTier,
          subscriptionStatus: tenants.subscriptionStatus,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return next();
      }

      // Free tier doesn't require Stripe payment
      if (tenant.subscriptionTier === 'free') {
        return next();
      }

      const status = tenant.subscriptionStatus || 'active';

      // Active or trial — proceed
      if (status === 'active' || status === 'trial') {
        return next();
      }

      // Past due — block creates but context is informative
      if (status === 'past_due') {
        return res.status(402).json({
          error: 'Your payment is past due. Please update your payment method to continue.',
          code: 'PAYMENT_REQUIRED',
          details: {
            subscriptionStatus: 'past_due',
            upgradeUrl: '/creator-dashboard/subscriptions',
            portalAction: 'update_payment_method',
          },
        });
      }

      // Canceled, suspended, inactive
      return res.status(402).json({
        error: 'Your subscription is inactive. Please resubscribe to access this feature.',
        code: 'SUBSCRIPTION_INACTIVE',
        details: {
          subscriptionStatus: status,
          upgradeUrl: '/creator-dashboard/subscriptions',
        },
      });
    } catch (error) {
      console.error('[SubscriptionGuard] Error checking subscription:', error);
      // On error, allow through (fail-open for availability)
      return next();
    }
  };
}
