/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Express } from 'express';
import type { AuthenticatedRequest } from '../../middleware/rbac';
import { authenticateUser } from '../../middleware/rbac';
import { syncActionLimiter } from '../../middleware/rate-limit';
import storage from '../../core/storage';
import db from '../../db';
import { getTierLimits, type SubscriptionTier } from '@shared/subscription-config';

export function registerStripeRoutes(app: Express) {
  // Stripe Payment Routes - Using javascript_stripe integration

  // Stripe payment intent for one-time payments
  app.post(
    '/api/create-payment-intent',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { amount, currency = 'usd' } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: 'Invalid amount' });
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-06-20' as any,
        });

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        });
      } catch (error: any) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({
          error: 'Error creating payment intent',
          message: error.message,
        });
      }
    }
  );

  // Get or create subscription for authenticated user
  app.post(
    '/api/get-or-create-subscription',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user from our database
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-06-20' as any,
        });

        // Get user's tenant to check existing billing info
        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];

        // Check if user already has active subscription
        if (tenant?.billingInfo?.subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              tenant.billingInfo.subscriptionId
            );

            if (subscription.status === 'active' || subscription.status === 'trialing') {
              const latestInvoice = subscription.latest_invoice;
              const paymentIntent =
                typeof latestInvoice === 'object' && latestInvoice
                  ? (latestInvoice as any).payment_intent
                  : null;
              return res.json({
                subscriptionId: subscription.id,
                clientSecret:
                  typeof paymentIntent === 'object' && paymentIntent
                    ? paymentIntent.client_secret
                    : null,
                status: subscription.status,
              });
            }
          } catch (error) {
            console.error('Error retrieving existing subscription:', error);
            // Continue to create new subscription if current one is invalid
          }
        }

        // Create new customer if needed
        let customerId = tenant?.billingInfo?.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || `${user.id}@wallet.user`,
            name: user.username || 'Creator',
            metadata: {
              userId: user.id,
              tenantId: tenant?.id || '',
            },
          });
          customerId = customer.id;
        }

        // Create subscription with default price (you can customize this)
        const { priceId = process.env.STRIPE_DEFAULT_PRICE_ID } = req.body;

        if (!priceId) {
          return res.status(400).json({
            error: 'No price ID provided and STRIPE_DEFAULT_PRICE_ID not configured',
          });
        }

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
        });

        // Update tenant with billing info
        if (tenant) {
          await storage.updateTenant(tenant.id, {
            billingInfo: {
              ...tenant.billingInfo,
              stripeCustomerId: customerId,
              subscriptionId: subscription.id,
            },
          });
        }

        const latestInvoice = subscription.latest_invoice;
        const paymentIntent =
          typeof latestInvoice === 'object' && latestInvoice
            ? (latestInvoice as any).payment_intent
            : null;
        res.json({
          subscriptionId: subscription.id,
          clientSecret:
            typeof paymentIntent === 'object' && paymentIntent ? paymentIntent.client_secret : null,
          status: subscription.status,
        });
      } catch (error: any) {
        console.error('Subscription creation error:', error);
        res.status(500).json({
          error: 'Error creating subscription',
          message: error.message,
        });
      }
    }
  );

  // Get subscription status
  app.get('/api/subscription-status', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json({ status: 'no_subscription' });

      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ status: 'no_subscription' });
      }

      const userTenants = await storage.getUserTenants(user.id);
      const tenant = userTenants[0];

      if (!tenant?.billingInfo?.subscriptionId) {
        return res.json({ status: 'no_subscription' });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-06-20' as any,
      });

      const subscription = await stripe.subscriptions.retrieve(tenant.billingInfo.subscriptionId);

      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: subscription.items.data[0]?.price?.nickname || 'Unknown Plan',
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({
        error: 'Error fetching subscription status',
        message: error.message,
      });
    }
  });

  // Get subscription details with live usage counts
  app.get('/api/subscription-details', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await storage.getUser(userId);
      if (!user?.currentTenantId) {
        return res.json({ tier: 'free', limits: getTierLimits('free'), usage: {} });
      }

      const { checkSubscriptionLimit } = await import('../../services/subscription-limit-service');

      const [tenant] = await db
        .select()
        .from((await import('@shared/schema')).tenants)
        .where(
          (await import('drizzle-orm')).eq(
            (await import('@shared/schema')).tenants.id,
            user.currentTenantId
          )
        )
        .limit(1);

      if (!tenant) {
        return res.json({ tier: 'free', limits: getTierLimits('free'), usage: {} });
      }

      const tier = (tenant.subscriptionTier as SubscriptionTier) || 'free';
      const tierLimits = getTierLimits(tier);

      // Get live usage counts
      const [tasksResult, campaignsResult, programsResult, socialsResult] = await Promise.all([
        checkSubscriptionLimit(user.currentTenantId, 'tasks'),
        checkSubscriptionLimit(user.currentTenantId, 'campaigns'),
        checkSubscriptionLimit(user.currentTenantId, 'programs'),
        checkSubscriptionLimit(user.currentTenantId, 'socialConnections'),
      ]);

      res.json({
        tier,
        tierName: (await import('@shared/subscription-config')).getTierDefinition(tier).name,
        limits: tierLimits,
        usage: {
          tasks: tasksResult.current,
          campaigns: campaignsResult.current,
          programs: programsResult.current,
          socialConnections: socialsResult.current,
          members: (tenant.usage as any)?.currentMembers ?? 0,
        },
        billingInfo: tenant.billingInfo || null,
      });
    } catch (error: any) {
      console.error('Subscription details error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
  });

  // ─── Stripe Subscription Management ──────────────────────────────

  // Create Checkout Session for new subscription or upgrade
  app.post(
    '/api/stripe/create-checkout-session',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { tier } = req.body;
        if (!tier || tier === 'free' || tier === 'enterprise') {
          return res.status(400).json({ error: 'Invalid tier for checkout' });
        }

        const { getStripe, getPriceIdForTier } = await import('../../services/stripe-service');
        const stripe = getStripe();

        const priceId = getPriceIdForTier(tier);
        if (!priceId) {
          return res.status(400).json({ error: `No Stripe price configured for tier: ${tier}` });
        }

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];

        // Get or create Stripe customer
        let customerId = tenant?.billingInfo?.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            name: user.username || 'Creator',
            metadata: { userId: user.id, tenantId: tenant?.id || '' },
          });
          customerId = customer.id;

          // Store customer ID
          if (tenant) {
            await storage.updateTenant(tenant.id, {
              billingInfo: { ...tenant.billingInfo, stripeCustomerId: customerId },
            });
          }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${baseUrl}/creator-dashboard/subscriptions?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancel_url: `${baseUrl}/creator-dashboard/subscriptions?canceled=true`,
          metadata: {
            tenantId: tenant?.id || '',
            userId: user.id,
            tier,
          },
          subscription_data: {
            metadata: {
              tenantId: tenant?.id || '',
              userId: user.id,
              tier,
            },
          },
        });

        res.json({ url: session.url });
      } catch (error: any) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
      }
    }
  );

  // Create Billing Portal session (manage payment methods, invoices, cancel)
  app.post(
    '/api/stripe/create-portal-session',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const customerId = tenant?.billingInfo?.stripeCustomerId;

        if (!customerId) {
          return res
            .status(400)
            .json({ error: 'No billing account found. Subscribe to a plan first.' });
        }

        const { createBillingPortalSession } = await import('../../services/stripe-service');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const session = await createBillingPortalSession(
          customerId,
          `${baseUrl}/creator-dashboard/subscriptions`
        );

        res.json({ url: session.url });
      } catch (error: any) {
        console.error('Portal session error:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
      }
    }
  );

  // Change subscription (upgrade/downgrade with proration)
  app.post(
    '/api/stripe/change-subscription',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { tier } = req.body;
        if (!tier || tier === 'enterprise') {
          return res.status(400).json({ error: 'Invalid tier' });
        }

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const subscriptionId = tenant?.billingInfo?.subscriptionId;

        if (!subscriptionId) {
          return res.status(400).json({ error: 'No active subscription to change' });
        }

        // Free tier = cancel subscription
        if (tier === 'free') {
          const { getStripe } = await import('../../services/stripe-service');
          const stripe = getStripe();
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });
          return res.json({ success: true, message: 'Subscription will cancel at period end' });
        }

        const { getStripe, getPriceIdForTier } = await import('../../services/stripe-service');
        const stripe = getStripe();

        const newPriceId = getPriceIdForTier(tier);
        if (!newPriceId) {
          return res.status(400).json({ error: `No Stripe price configured for tier: ${tier}` });
        }

        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentItemId = subscription.items.data[0]?.id;

        if (!currentItemId) {
          return res.status(400).json({ error: 'Subscription has no items' });
        }

        // Update with proration
        const updated = await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: 'create_prorations',
          // Cancel the pending cancellation if upgrading
          cancel_at_period_end: false,
        });

        // NOTE: Tier change in DB is handled by webhook (customer.subscription.updated)
        // We don't update tier here to maintain webhook-first architecture

        res.json({
          success: true,
          subscriptionId: updated.id,
          status: updated.status,
          message: 'Subscription updated. Changes will be reflected shortly.',
        });
      } catch (error: any) {
        console.error('Subscription change error:', error);
        res.status(500).json({ error: 'Failed to change subscription' });
      }
    }
  );

  // Cancel subscription at period end
  app.post(
    '/api/stripe/cancel-subscription',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const subscriptionId = tenant?.billingInfo?.subscriptionId;

        if (!subscriptionId) {
          return res.status(400).json({ error: 'No active subscription to cancel' });
        }

        const { getStripe } = await import('../../services/stripe-service');
        const stripe = getStripe();

        const updated = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        res.json({
          success: true,
          cancelAt: updated.cancel_at
            ? new Date((updated.cancel_at as number) * 1000).toISOString()
            : null,
          message: 'Subscription will cancel at the end of the current billing period.',
        });
      } catch (error: any) {
        console.error('Subscription cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
      }
    }
  );

  // List past invoices
  app.get('/api/stripe/invoices', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const userTenants = await storage.getUserTenants(user.id);
      const tenant = userTenants[0];
      const customerId = tenant?.billingInfo?.stripeCustomerId;

      if (!customerId) {
        return res.json({ invoices: [] });
      }

      const { getStripe } = await import('../../services/stripe-service');
      const stripe = getStripe();

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });

      res.json({
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due ? (inv.amount_due / 100).toFixed(2) : '0.00',
          currency: inv.currency,
          date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
        })),
      });
    } catch (error: any) {
      console.error('Invoice list error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });
}
