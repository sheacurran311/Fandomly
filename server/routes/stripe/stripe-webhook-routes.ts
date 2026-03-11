/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stripe Webhook Handler
 *
 * Receives Stripe webhook events, verifies signatures, and updates
 * tenant subscription state. This is the ONLY place subscription tier
 * changes should be applied — the frontend never sets tier directly.
 *
 * Webhook-first architecture: trust webhooks, not API responses.
 */

import type { Express, Request, Response } from 'express';
import express from 'express';
import { db } from '../../db';
import { tenants, processedStripeEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getStripe, getTierForPriceId } from '../../services/stripe-service';
import { getTierLimits } from '@shared/subscription-config';

/**
 * DB-backed idempotency: check if an event was already processed.
 * Falls back to allowing processing if the DB check fails (fail-open).
 */
async function isAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select({ eventId: processedStripeEvents.eventId })
      .from(processedStripeEvents)
      .where(eq(processedStripeEvents.eventId, eventId))
      .limit(1);
    return !!existing;
  } catch {
    return false;
  }
}

async function markProcessed(eventId: string, eventType: string) {
  try {
    await db.insert(processedStripeEvents).values({ eventId, eventType }).onConflictDoNothing();
  } catch {
    // Non-critical — worst case we re-process on next restart
  }
}

export function registerStripeWebhookRoutes(app: Express) {
  /**
   * POST /api/stripe/webhook
   *
   * IMPORTANT: This route MUST receive the raw body for signature verification.
   * The raw body middleware is applied in server/index.ts BEFORE express.json().
   */
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('[StripeWebhook] STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      let event;

      try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        console.error(
          '[StripeWebhook] Signature verification failed:',
          err instanceof Error ? err.message : 'Unknown error'
        );
        return res.status(400).json({ error: `Webhook signature verification failed` });
      }

      // Idempotency: skip already-processed events
      if (await isAlreadyProcessed(event.id)) {
        return res.json({ received: true, duplicate: true });
      }

      // Acknowledge receipt immediately — process async
      res.json({ received: true });

      try {
        await handleStripeEvent(event);
        await markProcessed(event.id, event.type);
      } catch (err) {
        console.error(`[StripeWebhook] Error processing event ${event.type}:`, err);
        // Don't fail the response — it was already sent
      }
    }
  );
}

/**
 * Route Stripe events to the appropriate handler.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStripeEvent(event: any) {
  console.log(`[StripeWebhook] Processing ${event.type} (${event.id})`);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object);
      break;

    default:
      console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * Find tenant by Stripe customer ID.
 */
async function findTenantByCustomerId(customerId: string) {
  // billingInfo is JSONB with stripeCustomerId
  const allTenants = await db.select().from(tenants).where(eq(tenants.id, tenants.id)); // get all, filter in JS

  // Filter by stripeCustomerId in JSONB (Drizzle doesn't natively support JSONB field queries well)
  return allTenants.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.billingInfo?.stripeCustomerId === customerId
  );
}

/**
 * Find tenant by Stripe subscription ID.
 */
async function findTenantBySubscriptionId(subscriptionId: string) {
  const allTenants = await db.select().from(tenants);
  return allTenants.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.billingInfo?.subscriptionId === subscriptionId
  );
}

// ─── Event Handlers ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreated(subscription: any) {
  const tenant = await findTenantByCustomerId(subscription.customer);
  if (!tenant) {
    console.warn(`[StripeWebhook] No tenant found for customer ${subscription.customer}`);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? getTierForPriceId(priceId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {
    subscriptionStatus: mapStripeStatus(subscription.status),
    billingInfo: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(tenant as any).billingInfo,
      subscriptionId: subscription.id,
      nextBillingDate: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    },
  };

  if (tier) {
    updates.subscriptionTier = tier;
    updates.limits = getTierLimits(tier);
  }

  await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));

  console.log(
    `[StripeWebhook] Subscription created for tenant ${tenant.id}: tier=${tier || 'unchanged'}, status=${subscription.status}`
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: any) {
  const tenant =
    (await findTenantBySubscriptionId(subscription.id)) ||
    (await findTenantByCustomerId(subscription.customer));

  if (!tenant) {
    console.warn(`[StripeWebhook] No tenant found for subscription ${subscription.id}`);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? getTierForPriceId(priceId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {
    subscriptionStatus: mapStripeStatus(subscription.status),
    billingInfo: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(tenant as any).billingInfo,
      subscriptionId: subscription.id,
      nextBillingDate: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    },
  };

  // Only update tier if the price changed and we can map it
  if (tier) {
    updates.subscriptionTier = tier;
    updates.limits = getTierLimits(tier);
  }

  // Track cancellation
  if (subscription.cancel_at_period_end) {
    updates.billingInfo.cancelAtPeriodEnd = true;
    updates.billingInfo.cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null;
  } else {
    updates.billingInfo.cancelAtPeriodEnd = false;
    updates.billingInfo.cancelAt = null;
  }

  await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));

  console.log(
    `[StripeWebhook] Subscription updated for tenant ${tenant.id}: tier=${tier || 'unchanged'}, status=${subscription.status}`
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  const tenant =
    (await findTenantBySubscriptionId(subscription.id)) ||
    (await findTenantByCustomerId(subscription.customer));

  if (!tenant) {
    console.warn(`[StripeWebhook] No tenant found for deleted subscription ${subscription.id}`);
    return;
  }

  // Downgrade to free
  await db
    .update(tenants)
    .set({
      subscriptionTier: 'free',
      subscriptionStatus: 'canceled',
      limits: getTierLimits('free'),
      billingInfo: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(tenant as any).billingInfo,
        subscriptionId: null,
        nextBillingDate: null,
        cancelAtPeriodEnd: false,
        cancelAt: null,
      },
    })
    .where(eq(tenants.id, tenant.id));

  console.log(`[StripeWebhook] Subscription deleted — tenant ${tenant.id} downgraded to free`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaymentSucceeded(invoice: any) {
  if (!invoice.subscription) return;

  const tenant =
    (await findTenantBySubscriptionId(invoice.subscription as string)) ||
    (await findTenantByCustomerId(invoice.customer as string));

  if (!tenant) return;

  await db
    .update(tenants)
    .set({
      subscriptionStatus: 'active',
      billingInfo: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(tenant as any).billingInfo,
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : null,
      },
    })
    .where(eq(tenants.id, tenant.id));

  console.log(`[StripeWebhook] Payment succeeded for tenant ${tenant.id}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaymentFailed(invoice: any) {
  if (!invoice.subscription) return;

  const tenant =
    (await findTenantBySubscriptionId(invoice.subscription as string)) ||
    (await findTenantByCustomerId(invoice.customer as string));

  if (!tenant) return;

  await db
    .update(tenants)
    .set({
      subscriptionStatus: 'past_due',
      billingInfo: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(tenant as any).billingInfo,
        lastFailedPaymentDate: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        failedPaymentAttempts: ((tenant as any).billingInfo?.failedPaymentAttempts || 0) + 1,
      },
    })
    .where(eq(tenants.id, tenant.id));

  console.log(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    `[StripeWebhook] Payment failed for tenant ${tenant.id} (attempt ${((tenant as any).billingInfo?.failedPaymentAttempts || 0) + 1})`
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTrialWillEnd(subscription: any) {
  // Future: send email notification to user about trial ending
  console.log(
    `[StripeWebhook] Trial ending soon for subscription ${subscription.id} (customer: ${subscription.customer})`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Map Stripe subscription status to our internal status.
 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trial';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive';
    default:
      return stripeStatus;
  }
}
