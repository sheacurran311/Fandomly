/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stripe Service — Singleton Stripe instance and tier-price mapping.
 *
 * All Stripe operations go through this module so we have one place
 * to configure API version, map tiers ↔ price IDs, and create
 * common objects like billing portal sessions.
 */

import Stripe from 'stripe';
import type { SubscriptionTier } from '@shared/subscription-config';

let stripeInstance: Stripe | null = null;

/**
 * Lazy-init Stripe with the secret key from env.
 * Throws immediately if STRIPE_SECRET_KEY is missing.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(key, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2024-06-20' as any,
    });
  }
  return stripeInstance;
}

/**
 * Map each paid tier to a Stripe Price ID from env.
 * Free tier has no price. Enterprise is custom (contact sales).
 */
const TIER_TO_ENV_KEY: Partial<Record<SubscriptionTier, string>> = {
  beginner: 'STRIPE_PRICE_BEGINNER',
  rising: 'STRIPE_PRICE_RISING',
  allstar: 'STRIPE_PRICE_ALLSTAR',
};

/**
 * Get the Stripe Price ID for a given subscription tier.
 * Returns null for free/enterprise or if env var is not set.
 */
export function getPriceIdForTier(tier: SubscriptionTier): string | null {
  const envKey = TIER_TO_ENV_KEY[tier];
  if (!envKey) return null;
  return process.env[envKey] || null;
}

/**
 * Reverse lookup: given a Stripe Price ID, find the matching tier.
 * Returns null if no match.
 */
export function getTierForPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, envKey] of Object.entries(TIER_TO_ENV_KEY)) {
    if (process.env[envKey!] === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}

/**
 * Create a Stripe Billing Portal session so the customer can
 * manage payment methods, view invoices, and cancel.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Check if Stripe is configured (has secret key).
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
