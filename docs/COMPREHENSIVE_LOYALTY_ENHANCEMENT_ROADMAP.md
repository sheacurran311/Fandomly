# 🚀 Comprehensive Loyalty & Rewards Enhancement Roadmap

**Date:** November 11, 2025
**Status:** 📋 **READY FOR IMPLEMENTATION**
**Project:** Fandomly - No-Code Loyalty & Rewards Engine with AI + Web3

---

## 📊 Executive Summary

Based on a thorough review of your codebase, documentation, and database structure, this roadmap outlines a **12-week plan** to transform Fandomly into an enterprise-grade, no-code loyalty and rewards platform that leverages AI (creator tooling, data analytics) and Web3 (NFT minting, distribution, marketplace).

### Current State Assessment ✅

**What's Working Excellently:**
- ✅ **Database Foundation**: ALL migrations complete (0010-0022)
  - 120+ performance indexes (50-200x faster queries)
  - 60 data validation constraints
  - 52 foreign key cascade behaviors
  - Soft delete system with audit trails
  - 7 materialized views for instant analytics
- ✅ **Twitter/X Integration**: Automated verification working great
- ✅ **Multi-Tenant Architecture**: Solid creator-fan relationship model
- ✅ **Referral System**: Complete with tracking and rewards
- ✅ **NFT Integration**: Crossmint integration ready for Web3 rewards
- ✅ **Program Builder**: Basic creator dashboard and program creation
- ✅ **Social Platforms**: Twitter, Instagram, TikTok, YouTube, Spotify, Facebook support

### Critical Gaps to Address 🎯

**Top Priority Features (User Requested):**
1. 🔴 **Webhooks** - Real-time event system for integrations
2. 🔴 **Enhanced Task Verification** - Enterprise-grade customization
3. 🔴 **Task Templates** - Quizzes, polls, code submission templates
4. 🔴 **Rule Configuration** - Points multipliers, reward frequency, cadence settings
5. 🟡 **Fan Segmentation** - Target specific user groups
6. 🟡 **Custom Branding** - White-label program pages
7. 🟡 **Advanced Analytics** - Program health monitoring

---

## 🎯 Strategic Vision

### No-Code Loyalty Engine for Creators, Brands & Agencies

**Target Users:**
1. **Independent Creators** (athletes, musicians, streamers)
   - Quick program setup with templates
   - Social media task automation
   - Basic customization

2. **Brands & Agencies** (enterprise customers)
   - Advanced customization & branding
   - Multi-brand management
   - API integrations via webhooks
   - Custom task templates
   - Advanced rule configuration

3. **Fans** (end users)
   - Seamless task completion
   - Points & rewards tracking
   - NFT wallet integration
   - Social profile connection

### Competitive Positioning

**Fandomly's Unique Value:**
- ✅ **Creator Economy Focus** (vs Snag's brand focus)
- ✅ **Social Verification Excellence** (Twitter API, TikTok smart detection)
- ✅ **Multi-Tenant SaaS** (vs single-tenant solutions)
- ✅ **Web3 Native** (NFT rewards, wallet integration)
- 🔄 **Adding: Enterprise customization** (catching up to OpenLoyalty/Snag)
- 🔄 **Adding: Webhook integrations** (API-first architecture)

---

## 📋 Implementation Roadmap

### PHASE 1: Foundation & Webhooks (Weeks 1-2) 🔴 CRITICAL

**Goal:** Build the webhook infrastructure that enables enterprise integrations

#### 1.1 Database Schema for Webhooks

**New Tables:**

```sql
-- migrations/0023_add_webhooks_system.sql

-- Webhook Endpoints Configuration
CREATE TABLE webhook_endpoints (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Endpoint Configuration
  url text NOT NULL, -- Target URL to POST events
  secret_key varchar(100) NOT NULL, -- For HMAC signature verification
  is_active boolean DEFAULT true,

  -- Event Subscriptions (array of event types)
  subscribed_events text[] NOT NULL, -- ['task.completed', 'reward.redeemed', 'points.earned']

  -- Delivery Settings
  delivery_config jsonb DEFAULT '{
    "timeout_ms": 5000,
    "max_retries": 3,
    "retry_backoff": "exponential",
    "retry_delays_ms": [1000, 5000, 15000]
  }'::jsonb,

  -- Filtering (optional - send only events matching criteria)
  event_filters jsonb, -- {"platform": "twitter", "task_type": "twitter_follow"}

  -- Metadata
  description text,
  created_by varchar REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_triggered_at timestamp,

  -- Stats
  stats jsonb DEFAULT '{
    "total_deliveries": 0,
    "successful_deliveries": 0,
    "failed_deliveries": 0,
    "average_response_time_ms": 0
  }'::jsonb
);

-- Webhook Delivery Log (for debugging and retries)
CREATE TABLE webhook_deliveries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id varchar NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

  -- Event Data
  event_type varchar(100) NOT NULL, -- 'task.completed'
  event_data jsonb NOT NULL, -- Full event payload

  -- Delivery Attempt
  attempt_number integer DEFAULT 1,
  status varchar(50) NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'

  -- Request/Response
  request_payload jsonb, -- What we sent
  request_headers jsonb,
  response_status_code integer,
  response_body text,
  response_time_ms integer,

  -- Error Tracking
  error_message text,
  error_code varchar(50),

  -- Timing
  scheduled_at timestamp DEFAULT now(),
  delivered_at timestamp,
  next_retry_at timestamp,

  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- Comments
COMMENT ON TABLE webhook_endpoints IS 'Webhook endpoint configurations for real-time event delivery';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery log for debugging and retry management';
```

#### 1.2 Webhook Event Types

**Standardized Event Schema:**

```typescript
// shared/webhookEvents.ts

export const WEBHOOK_EVENTS = {
  // Task Events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_VERIFIED: 'task.verified',
  TASK_FAILED: 'task.failed',

  // Campaign Events
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_ENDED: 'campaign.ended',
  CAMPAIGN_UPDATED: 'campaign.updated',

  // Points Events
  POINTS_EARNED: 'points.earned',
  POINTS_SPENT: 'points.spent',
  POINTS_ADJUSTED: 'points.adjusted',

  // Reward Events
  REWARD_CREATED: 'reward.created',
  REWARD_REDEEMED: 'reward.redeemed',
  REWARD_FULFILLED: 'reward.fulfilled',

  // User Events
  USER_JOINED: 'user.joined',
  USER_TIER_CHANGED: 'user.tier_changed',
  USER_MILESTONE: 'user.milestone',

  // Referral Events
  REFERRAL_CREATED: 'referral.created',
  REFERRAL_COMPLETED: 'referral.completed',

  // NFT Events
  NFT_MINTED: 'nft.minted',
  NFT_DELIVERED: 'nft.delivered',

  // Program Events
  PROGRAM_CREATED: 'program.created',
  PROGRAM_UPDATED: 'program.updated',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

export interface WebhookEvent<T = any> {
  // Event Metadata
  event_id: string;
  event_type: WebhookEventType;
  event_version: string; // '1.0' for API versioning

  // Tenant Context
  tenant_id: string;
  tenant_slug: string;

  // Timing
  occurred_at: string; // ISO 8601 timestamp

  // Event Data
  data: T;

  // Related Resources (for convenience)
  related?: {
    user_id?: string;
    creator_id?: string;
    program_id?: string;
    campaign_id?: string;
  };
}

// Example: Task Completed Event
export interface TaskCompletedEventData {
  task_id: string;
  task_name: string;
  task_type: string;
  platform: string;

  user_id: string;
  username: string;

  points_earned: number;
  verification_method: 'api' | 'smart_detection' | 'manual';

  completed_at: string;
  verified_at: string;

  metadata?: Record<string, any>;
}

// Example: Points Earned Event
export interface PointsEarnedEventData {
  transaction_id: string;
  user_id: string;
  username: string;

  points_amount: number;
  points_balance: number; // After transaction

  source: 'task' | 'referral' | 'bonus' | 'admin_adjustment';
  source_id?: string; // task_id, referral_id, etc.

  reason?: string;

  earned_at: string;
}

// Example: Reward Redeemed Event
export interface RewardRedeemedEventData {
  redemption_id: string;
  reward_id: string;
  reward_name: string;
  reward_type: string;

  user_id: string;
  username: string;

  points_spent: number;
  points_remaining: number;

  fulfillment_status: 'pending' | 'processing' | 'fulfilled' | 'failed';

  redeemed_at: string;

  delivery_info?: {
    nft_mint_id?: string;
    tracking_number?: string;
    email_sent?: boolean;
  };
}
```

#### 1.3 Webhook Service Implementation

**Backend Service:**

```typescript
// server/services/webhook-service.ts

import { db } from '../db';
import { webhookEndpoints, webhookDeliveries } from '../../shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import crypto from 'crypto';
import fetch from 'node-fetch';

export class WebhookService {

  /**
   * Trigger webhook event
   */
  async triggerEvent<T>(
    tenantId: string,
    eventType: string,
    eventData: T,
    relatedResources?: Record<string, string>
  ): Promise<void> {
    // Find active webhooks subscribed to this event
    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.tenantId, tenantId),
          eq(webhookEndpoints.isActive, true)
        )
      );

    const subscribedEndpoints = endpoints.filter(endpoint =>
      endpoint.subscribedEvents.includes(eventType)
    );

    if (subscribedEndpoints.length === 0) {
      return; // No webhooks to trigger
    }

    // Get tenant info
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { slug: true }
    });

    // Build webhook event payload
    const event: WebhookEvent = {
      event_id: crypto.randomUUID(),
      event_type: eventType,
      event_version: '1.0',
      tenant_id: tenantId,
      tenant_slug: tenant?.slug || '',
      occurred_at: new Date().toISOString(),
      data: eventData,
      related: relatedResources
    };

    // Queue delivery for each endpoint
    for (const endpoint of subscribedEndpoints) {
      // Check if event passes filters (if any)
      if (endpoint.eventFilters && !this.passesFilters(event, endpoint.eventFilters)) {
        continue;
      }

      await this.queueDelivery(endpoint, event);
    }
  }

  /**
   * Queue webhook delivery
   */
  private async queueDelivery(endpoint: any, event: WebhookEvent): Promise<void> {
    const delivery = await db.insert(webhookDeliveries).values({
      webhookEndpointId: endpoint.id,
      eventType: event.event_type,
      eventData: event as any,
      attemptNumber: 1,
      status: 'pending',
      scheduledAt: new Date()
    }).returning();

    // Trigger immediate delivery (async)
    this.deliverWebhook(delivery[0].id).catch(err =>
      console.error('Webhook delivery failed:', err)
    );
  }

  /**
   * Deliver webhook (with retries)
   */
  async deliverWebhook(deliveryId: string): Promise<void> {
    const delivery = await db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, deliveryId),
      with: { endpoint: true }
    });

    if (!delivery || !delivery.endpoint) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const { endpoint, eventData, attemptNumber } = delivery;
    const config = endpoint.deliveryConfig as any;

    try {
      // Generate HMAC signature
      const signature = this.generateSignature(
        JSON.stringify(eventData),
        endpoint.secretKey
      );

      const startTime = Date.now();

      // Send POST request
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fandomly-Signature': signature,
          'X-Fandomly-Event': eventData.event_type,
          'X-Fandomly-Delivery': deliveryId,
          'User-Agent': 'Fandomly-Webhooks/1.0'
        },
        body: JSON.stringify(eventData),
        timeout: config.timeout_ms || 5000
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      // Update delivery record
      if (response.ok) {
        await db.update(webhookDeliveries)
          .set({
            status: 'delivered',
            responseStatusCode: response.status,
            responseBody: responseBody.substring(0, 10000), // Limit size
            responseTimeMs: responseTime,
            deliveredAt: new Date()
          })
          .where(eq(webhookDeliveries.id, deliveryId));

        // Update endpoint stats
        await this.updateEndpointStats(endpoint.id, true, responseTime);

        // Update last triggered
        await db.update(webhookEndpoints)
          .set({ lastTriggeredAt: new Date() })
          .where(eq(webhookEndpoints.id, endpoint.id));

      } else {
        // Failed delivery - schedule retry
        await this.scheduleRetry(
          deliveryId,
          attemptNumber,
          config.max_retries || 3,
          config.retry_delays_ms || [1000, 5000, 15000],
          `HTTP ${response.status}: ${responseBody.substring(0, 200)}`
        );

        await this.updateEndpointStats(endpoint.id, false);
      }

    } catch (error: any) {
      // Network error or timeout - schedule retry
      await this.scheduleRetry(
        deliveryId,
        attemptNumber,
        config.max_retries || 3,
        config.retry_delays_ms || [1000, 5000, 15000],
        error.message
      );

      await this.updateEndpointStats(endpoint.id, false);
    }
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(
    deliveryId: string,
    attemptNumber: number,
    maxRetries: number,
    retryDelays: number[],
    errorMessage: string
  ): Promise<void> {
    if (attemptNumber >= maxRetries) {
      // Max retries reached - mark as failed
      await db.update(webhookDeliveries)
        .set({
          status: 'failed',
          errorMessage: `Max retries (${maxRetries}) exceeded. Last error: ${errorMessage}`
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return;
    }

    // Calculate next retry time
    const delay = retryDelays[attemptNumber - 1] || retryDelays[retryDelays.length - 1];
    const nextRetryAt = new Date(Date.now() + delay);

    await db.update(webhookDeliveries)
      .set({
        status: 'retrying',
        attemptNumber: attemptNumber + 1,
        nextRetryAt,
        errorMessage
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Check if event passes filters
   */
  private passesFilters(event: WebhookEvent, filters: any): boolean {
    if (!filters) return true;

    // Check each filter condition
    for (const [key, value] of Object.entries(filters)) {
      const eventValue = this.getNestedValue(event.data, key);
      if (eventValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Update endpoint statistics
   */
  private async updateEndpointStats(
    endpointId: string,
    success: boolean,
    responseTime?: number
  ): Promise<void> {
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: eq(webhookEndpoints.id, endpointId)
    });

    if (!endpoint) return;

    const stats = endpoint.stats as any;
    stats.total_deliveries = (stats.total_deliveries || 0) + 1;

    if (success) {
      stats.successful_deliveries = (stats.successful_deliveries || 0) + 1;

      // Update average response time
      if (responseTime) {
        const totalTime = stats.average_response_time_ms * (stats.successful_deliveries - 1);
        stats.average_response_time_ms = Math.round(
          (totalTime + responseTime) / stats.successful_deliveries
        );
      }
    } else {
      stats.failed_deliveries = (stats.failed_deliveries || 0) + 1;
    }

    await db.update(webhookEndpoints)
      .set({ stats })
      .where(eq(webhookEndpoints.id, endpointId));
  }

  /**
   * Process pending retries (call from cron job)
   */
  async processRetries(): Promise<void> {
    const pendingRetries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'retrying'),
          lte(webhookDeliveries.nextRetryAt, new Date())
        )
      )
      .limit(100);

    for (const delivery of pendingRetries) {
      await this.deliverWebhook(delivery.id);
    }
  }
}

// Export singleton
export const webhookService = new WebhookService();
```

#### 1.4 Webhook API Endpoints

**Create webhook management routes:**

```typescript
// server/webhook-routes.ts

import { Router } from 'express';
import { db } from './db';
import { webhookEndpoints, webhookDeliveries } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  subscribed_events: z.array(z.string()).min(1),
  event_filters: z.record(z.any()).optional(),
  delivery_config: z.object({
    timeout_ms: z.number().min(1000).max(30000).optional(),
    max_retries: z.number().min(0).max(10).optional(),
    retry_backoff: z.enum(['exponential', 'linear']).optional(),
    retry_delays_ms: z.array(z.number()).optional()
  }).optional()
});

// List webhooks for tenant
router.get('/webhooks', async (req, res) => {
  const tenantId = req.user.currentTenantId;

  const webhooks = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.tenantId, tenantId))
    .orderBy(desc(webhookEndpoints.createdAt));

  res.json(webhooks);
});

// Create webhook
router.post('/webhooks', async (req, res) => {
  const tenantId = req.user.currentTenantId;
  const userId = req.user.id;

  const data = createWebhookSchema.parse(req.body);

  // Generate secret key
  const secretKey = crypto.randomBytes(32).toString('hex');

  const webhook = await db.insert(webhookEndpoints).values({
    tenantId,
    url: data.url,
    description: data.description,
    subscribedEvents: data.subscribed_events,
    eventFilters: data.event_filters,
    deliveryConfig: data.delivery_config,
    secretKey,
    createdBy: userId
  }).returning();

  res.json({
    webhook: webhook[0],
    secret_key: secretKey // Return once, then hide
  });
});

// Get webhook details
router.get('/webhooks/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  const webhook = await db.query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    )
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  // Hide secret key (only show first/last 4 chars)
  const maskedSecret = webhook.secretKey
    ? `${webhook.secretKey.substring(0, 4)}...${webhook.secretKey.substring(webhook.secretKey.length - 4)}`
    : null;

  res.json({
    ...webhook,
    secretKey: maskedSecret
  });
});

// Update webhook
router.patch('/webhooks/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  const updateSchema = createWebhookSchema.partial();
  const data = updateSchema.parse(req.body);

  const updated = await db.update(webhookEndpoints)
    .set({
      url: data.url,
      description: data.description,
      subscribedEvents: data.subscribed_events,
      eventFilters: data.event_filters,
      deliveryConfig: data.delivery_config,
      updatedAt: new Date()
    })
    .where(and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    ))
    .returning();

  if (updated.length === 0) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  res.json(updated[0]);
});

// Toggle webhook active status
router.post('/webhooks/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  const webhook = await db.query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    )
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  const updated = await db.update(webhookEndpoints)
    .set({ isActive: !webhook.isActive })
    .where(eq(webhookEndpoints.id, id))
    .returning();

  res.json(updated[0]);
});

// Regenerate secret key
router.post('/webhooks/:id/regenerate-secret', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  const newSecret = crypto.randomBytes(32).toString('hex');

  const updated = await db.update(webhookEndpoints)
    .set({ secretKey: newSecret })
    .where(and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    ))
    .returning();

  if (updated.length === 0) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  res.json({
    webhook: updated[0],
    secret_key: newSecret
  });
});

// Delete webhook
router.delete('/webhooks/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  await db.delete(webhookEndpoints)
    .where(and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    ));

  res.json({ success: true });
});

// Get webhook deliveries (with pagination)
router.get('/webhooks/:id/deliveries', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;
  const { limit = 50, offset = 0, status } = req.query;

  // Verify webhook ownership
  const webhook = await db.query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    )
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  let query = db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookEndpointId, id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  if (status) {
    query = query.where(eq(webhookDeliveries.status, status as string));
  }

  const deliveries = await query;

  res.json({
    deliveries,
    pagination: {
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

// Retry failed delivery
router.post('/webhooks/:id/deliveries/:deliveryId/retry', async (req, res) => {
  const { id, deliveryId } = req.params;
  const tenantId = req.user.currentTenantId;

  // Verify webhook ownership
  const webhook = await db.query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    )
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  // Reset delivery status
  await db.update(webhookDeliveries)
    .set({
      status: 'pending',
      attemptNumber: 1,
      scheduledAt: new Date()
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Trigger delivery
  const { webhookService } = await import('./services/webhook-service');
  await webhookService.deliverWebhook(deliveryId);

  res.json({ success: true });
});

// Test webhook (send test event)
router.post('/webhooks/:id/test', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.currentTenantId;

  const webhook = await db.query.webhookEndpoints.findFirst({
    where: and(
      eq(webhookEndpoints.id, id),
      eq(webhookEndpoints.tenantId, tenantId)
    ),
    with: { tenant: true }
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  // Send test event
  const { webhookService } = await import('./services/webhook-service');

  const testEvent = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };

  await webhookService.triggerEvent(
    tenantId,
    'webhook.test',
    testEvent
  );

  res.json({ success: true, message: 'Test event queued' });
});

// Get available event types
router.get('/webhooks/events/types', async (req, res) => {
  const { WEBHOOK_EVENTS } = await import('../shared/webhookEvents');

  res.json({
    events: Object.values(WEBHOOK_EVENTS),
    categories: {
      tasks: ['task.created', 'task.updated', 'task.completed', 'task.verified', 'task.failed'],
      campaigns: ['campaign.started', 'campaign.ended', 'campaign.updated'],
      points: ['points.earned', 'points.spent', 'points.adjusted'],
      rewards: ['reward.created', 'reward.redeemed', 'reward.fulfilled'],
      users: ['user.joined', 'user.tier_changed', 'user.milestone'],
      referrals: ['referral.created', 'referral.completed'],
      nfts: ['nft.minted', 'nft.delivered'],
      programs: ['program.created', 'program.updated']
    }
  });
});

export default router;
```

**Deliverables for Phase 1:**
- ✅ Webhook database tables and indexes
- ✅ Webhook service with retry logic
- ✅ Webhook API endpoints (CRUD + test)
- ✅ HMAC signature verification
- ✅ Event filtering and routing
- ✅ Delivery tracking and statistics
- ✅ Admin UI for webhook management

---

### PHASE 2: Task Verification Enhancement (Weeks 3-4) 🔴 CRITICAL

**Goal:** Enterprise-grade task verification with customization and automation

#### 2.1 Enhanced Task Schema

**Update task settings to support new verification features:**

```sql
-- migrations/0024_enhance_task_verification.sql

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_rules jsonb DEFAULT '{}'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_approve boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS require_manual_review boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_timeout_minutes integer DEFAULT 60;

COMMENT ON COLUMN tasks.verification_rules IS 'Custom verification rules for enterprise task validation';
COMMENT ON COLUMN tasks.auto_approve IS 'Automatically approve task completions without manual review';
COMMENT ON COLUMN tasks.require_manual_review IS 'Always require manual review even if verification passes';
COMMENT ON COLUMN tasks.verification_timeout_minutes IS 'How long to wait for verification before timeout';

-- Add verification metadata to task_completions
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS verification_metadata jsonb;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS reviewer_id varchar REFERENCES users(id);
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS reviewed_at timestamp;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS review_notes text;

COMMENT ON COLUMN task_completions.verification_metadata IS 'Additional data from verification process (API response, trust score, etc)';
```

**TypeScript Schema Updates:**

```typescript
// shared/taskVerificationSchemas.ts

export interface VerificationRules {
  // Verification Method
  method: 'api' | 'smart_detection' | 'manual' | 'hybrid';

  // Automated Rules
  auto_approve_conditions?: {
    // Trust score threshold (0-1)
    min_trust_score?: number;

    // User requirements
    min_account_age_days?: number;
    min_completed_tasks?: number;
    min_points_earned?: number;
    verified_email_required?: boolean;

    // Platform requirements
    min_followers?: number;
    verified_account_required?: boolean;

    // Time-based
    completion_time_range?: {
      min_seconds?: number; // Too fast = suspicious
      max_seconds?: number; // Too slow = timeout
    };
  };

  // Manual Review Triggers
  manual_review_triggers?: {
    // Always review if any of these conditions match
    first_time_user?: boolean;
    high_value_task?: boolean; // points_to_reward > threshold
    suspicious_activity?: boolean;
    low_trust_score?: boolean; // below threshold
    flagged_content?: boolean;
  };

  // Platform-Specific Settings
  platform_settings?: {
    // Twitter
    twitter?: {
      verify_retweet?: boolean;
      verify_like?: boolean;
      verify_follow?: boolean;
      check_tweet_deleted?: boolean;
      allow_quote_retweet?: boolean;
    };

    // TikTok
    tiktok?: {
      trust_score_threshold?: number;
      require_profile_screenshot?: boolean;
      check_interaction_timestamp?: boolean;
    };

    // Instagram
    instagram?: {
      require_screenshot?: boolean;
      verify_via_mention?: boolean;
      check_story_expiration?: boolean;
    };
  };

  // Fraud Detection
  fraud_detection?: {
    enabled?: boolean;
    check_duplicate_submissions?: boolean;
    check_bot_behavior?: boolean;
    check_vpn_usage?: boolean;
    max_submissions_per_hour?: number;
  };
}

// Verification Result
export interface VerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  method: 'api' | 'smart_detection' | 'manual';
  auto_approved: boolean;
  needs_manual_review: boolean;

  // Metadata
  trust_score?: number;
  verification_data?: any; // API response, screenshots, etc
  fraud_flags?: string[];

  // Reasoning
  reason: string;
  details?: string;

  // Timing
  verified_at: Date;
  verification_duration_ms: number;
}
```

#### 2.2 Unified Verification Service

**Implement comprehensive verification service:**

```typescript
// server/services/unified-verification-service.ts

import { db } from '../db';
import { tasks, taskCompletions, users, socialConnections } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { VerificationRules, VerificationResult } from '../../shared/taskVerificationSchemas';

export class UnifiedVerificationService {

  /**
   * Verify task completion
   */
  async verifyTaskCompletion(
    taskCompletionId: string
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    // Load task completion with related data
    const completion = await db.query.taskCompletions.findFirst({
      where: eq(taskCompletions.id, taskCompletionId),
      with: {
        task: true,
        user: true
      }
    });

    if (!completion || !completion.task) {
      throw new Error('Task completion not found');
    }

    const { task, user } = completion;
    const rules = task.verificationRules as VerificationRules || {};

    // Calculate trust score
    const trustScore = await this.calculateTrustScore(user.id, task.platform);

    // Check if auto-approve conditions are met
    const autoApprove = await this.checkAutoApprove(
      user,
      task,
      trustScore,
      rules.auto_approve_conditions
    );

    // Check if manual review is required
    const needsManualReview = await this.checkManualReviewRequired(
      user,
      task,
      trustScore,
      rules.manual_review_triggers
    );

    // Perform platform-specific verification
    let platformVerification: any = {};

    switch (task.platform) {
      case 'twitter':
        platformVerification = await this.verifyTwitterTask(completion, task);
        break;
      case 'tiktok':
        platformVerification = await this.verifyTikTokTask(completion, task, trustScore);
        break;
      case 'instagram':
        platformVerification = await this.verifyInstagramTask(completion, task);
        break;
      case 'youtube':
        platformVerification = await this.verifyYouTubeTask(completion, task);
        break;
      case 'spotify':
        platformVerification = await this.verifySpotifyTask(completion, task);
        break;
      default:
        platformVerification = { verified: false, reason: 'Platform not supported' };
    }

    // Run fraud detection
    const fraudFlags = await this.detectFraud(user.id, task.id, completion);

    // Determine final verification status
    const verified = platformVerification.verified && fraudFlags.length === 0;
    const confidence = this.determineConfidence(
      platformVerification,
      trustScore,
      fraudFlags
    );

    const result: VerificationResult = {
      verified,
      confidence,
      method: rules.method || 'api',
      auto_approved: autoApprove && verified && !needsManualReview,
      needs_manual_review: needsManualReview || (verified && !autoApprove),
      trust_score: trustScore,
      verification_data: platformVerification.data,
      fraud_flags: fraudFlags,
      reason: this.buildReasonMessage(verified, platformVerification, fraudFlags),
      details: platformVerification.details,
      verified_at: new Date(),
      verification_duration_ms: Date.now() - startTime
    };

    // Update task completion
    await this.updateTaskCompletionStatus(taskCompletionId, result);

    // Trigger webhook if configured
    if (result.verified) {
      await this.triggerWebhook('task.verified', completion, result);
    } else {
      await this.triggerWebhook('task.failed', completion, result);
    }

    return result;
  }

  /**
   * Calculate user trust score (0-1)
   */
  private async calculateTrustScore(userId: string, platform: string): Promise<number> {
    let score = 0.5; // Base score

    // Get user stats
    const userStats = await db.query.userEngagementSummary.findFirst({
      where: eq(userEngagementSummary.userId, userId)
    });

    if (!userStats) {
      return 0.3; // New user = lower trust
    }

    // Account age factor (max +0.2)
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(userStats.firstActivityAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.min(accountAgeDays / 180, 0.2); // Max at 6 months

    // Completed tasks factor (max +0.2)
    score += Math.min(userStats.totalTasksCompleted / 50, 0.2);

    // Points earned factor (max +0.1)
    score += Math.min(userStats.totalPointsEarned / 5000, 0.1);

    // Social verification factor (max +0.1)
    const socialConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform)
      )
    });

    if (socialConnection?.profileData?.verified) {
      score += 0.1;
    }

    // Fraud history penalty
    const fraudIncidents = await this.getFraudHistory(userId);
    score -= fraudIncidents.length * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if auto-approve conditions are met
   */
  private async checkAutoApprove(
    user: any,
    task: any,
    trustScore: number,
    conditions?: any
  ): Promise<boolean> {
    if (!conditions) return task.autoApprove || false;

    // Check trust score
    if (conditions.min_trust_score && trustScore < conditions.min_trust_score) {
      return false;
    }

    // Check account age
    if (conditions.min_account_age_days) {
      const accountAge = Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (accountAge < conditions.min_account_age_days) {
        return false;
      }
    }

    // Check completed tasks
    if (conditions.min_completed_tasks) {
      const userStats = await db.query.userEngagementSummary.findFirst({
        where: eq(userEngagementSummary.userId, user.id)
      });
      if (!userStats || userStats.totalTasksCompleted < conditions.min_completed_tasks) {
        return false;
      }
    }

    // Check email verification
    if (conditions.verified_email_required && !user.emailVerified) {
      return false;
    }

    return true;
  }

  /**
   * Check if manual review is required
   */
  private async checkManualReviewRequired(
    user: any,
    task: any,
    trustScore: number,
    triggers?: any
  ): Promise<boolean> {
    if (task.requireManualReview) {
      return true;
    }

    if (!triggers) return false;

    // First time user
    if (triggers.first_time_user) {
      const userStats = await db.query.userEngagementSummary.findFirst({
        where: eq(userEngagementSummary.userId, user.id)
      });
      if (!userStats || userStats.totalTasksCompleted === 0) {
        return true;
      }
    }

    // High value task
    if (triggers.high_value_task && task.pointsToReward > 1000) {
      return true;
    }

    // Low trust score
    if (triggers.low_trust_score && trustScore < 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Verify Twitter task
   */
  private async verifyTwitterTask(completion: any, task: any): Promise<any> {
    // Implementation from existing twitter-verification-service.ts
    // Returns { verified: boolean, data: any, details: string }
    const { verifyTwitterAction } = await import('./twitter-verification-service');
    return await verifyTwitterAction(completion, task);
  }

  /**
   * Verify TikTok task (smart detection)
   */
  private async verifyTikTokTask(
    completion: any,
    task: any,
    trustScore: number
  ): Promise<any> {
    const threshold = task.customSettings?.trustScoreThreshold || 0.7;

    if (trustScore >= threshold) {
      return {
        verified: true,
        data: { trust_score: trustScore, method: 'smart_detection' },
        details: `Trust score ${trustScore.toFixed(2)} meets threshold ${threshold}`
      };
    }

    return {
      verified: false,
      data: { trust_score: trustScore, method: 'smart_detection' },
      details: `Trust score ${trustScore.toFixed(2)} below threshold ${threshold}`
    };
  }

  /**
   * Detect fraud
   */
  private async detectFraud(
    userId: string,
    taskId: string,
    completion: any
  ): Promise<string[]> {
    const flags: string[] = [];

    // Check duplicate submissions
    const recentSubmissions = await db
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          eq(taskCompletions.taskId, taskId)
        )
      )
      .limit(10);

    if (recentSubmissions.length > 5) {
      flags.push('excessive_submissions');
    }

    // Check completion time (too fast = bot)
    const timeSinceCreation = Date.now() - new Date(completion.createdAt).getTime();
    if (timeSinceCreation < 5000) { // Less than 5 seconds
      flags.push('suspicious_completion_speed');
    }

    return flags;
  }

  /**
   * Get fraud history
   */
  private async getFraudHistory(userId: string): Promise<any[]> {
    // Query audit log for fraud incidents
    return [];
  }

  /**
   * Determine confidence level
   */
  private determineConfidence(
    platformVerification: any,
    trustScore: number,
    fraudFlags: string[]
  ): 'high' | 'medium' | 'low' {
    if (fraudFlags.length > 0) return 'low';
    if (platformVerification.method === 'api' && trustScore > 0.7) return 'high';
    if (trustScore > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Build reason message
   */
  private buildReasonMessage(
    verified: boolean,
    platformVerification: any,
    fraudFlags: string[]
  ): string {
    if (!verified) {
      if (fraudFlags.length > 0) {
        return `Verification failed: ${fraudFlags.join(', ')}`;
      }
      return platformVerification.details || 'Verification failed';
    }
    return 'Task verified successfully';
  }

  /**
   * Update task completion status
   */
  private async updateTaskCompletionStatus(
    completionId: string,
    result: VerificationResult
  ): Promise<void> {
    await db.update(taskCompletions)
      .set({
        status: result.auto_approved ? 'completed' : 'pending_review',
        verificationMetadata: {
          trust_score: result.trust_score,
          confidence: result.confidence,
          method: result.method,
          fraud_flags: result.fraud_flags,
          verified_at: result.verified_at.toISOString(),
          duration_ms: result.verification_duration_ms
        },
        completedAt: result.auto_approved ? new Date() : null
      })
      .where(eq(taskCompletions.id, completionId));
  }

  /**
   * Trigger webhook
   */
  private async triggerWebhook(
    eventType: string,
    completion: any,
    result: VerificationResult
  ): Promise<void> {
    const { webhookService } = await import('./webhook-service');

    await webhookService.triggerEvent(
      completion.tenantId,
      eventType,
      {
        task_completion_id: completion.id,
        task_id: completion.taskId,
        user_id: completion.userId,
        verification_result: result
      }
    );
  }
}

// Export singleton
export const verificationService = new UnifiedVerificationService();
```

**Deliverables for Phase 2:**
- ✅ Enhanced task verification rules
- ✅ Trust score calculation system
- ✅ Auto-approval logic
- ✅ Manual review triggers
- ✅ Fraud detection system
- ✅ Platform-specific verification handlers
- ✅ Webhook integration for verification events

---

### PHASE 3: Task Templates & Rule Configuration (Weeks 5-6) 🔴 CRITICAL

**Goal:** Build task template library with quizzes, polls, and advanced rule configuration

#### 3.1 Task Template System

**Database schema for templates:**

```sql
-- migrations/0025_add_task_templates.sql

CREATE TABLE task_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Identity
  name varchar(200) NOT NULL,
  slug varchar(200) UNIQUE NOT NULL,
  description text,
  category varchar(100) NOT NULL, -- 'social_engagement', 'quiz', 'poll', 'code_submission', etc

  -- Template Type
  template_type varchar(100) NOT NULL, -- 'twitter_follow', 'quiz', 'poll', 'code_entry', 'custom'
  platform varchar(50), -- For platform-specific templates

  -- Template Configuration
  config jsonb NOT NULL, -- Default settings for this template
  custom_fields jsonb, -- Additional fields specific to template type

  -- Usage & Display
  icon varchar(100), -- Icon name or URL
  thumbnail_url text,
  difficulty varchar(50), -- 'easy', 'medium', 'hard'
  estimated_time_minutes integer,
  tags text[], -- ['giveaway', 'engagement', 'fun']

  -- Creator Tools
  is_public boolean DEFAULT true, -- Available to all creators
  tenant_id varchar REFERENCES tenants(id) ON DELETE CASCADE, -- If custom template for specific tenant
  created_by varchar REFERENCES users(id),

  -- Analytics
  usage_count integer DEFAULT 0,
  avg_completion_rate decimal(5,2),
  popularity_score decimal(5,2),

  -- Metadata
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Quiz Questions Table
CREATE TABLE quiz_questions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id varchar REFERENCES tasks(id) ON DELETE CASCADE,

  -- Question Data
  question_text text NOT NULL,
  question_type varchar(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer', 'multiple_select'

  -- Options (for multiple choice)
  options jsonb, -- [{"id": "a", "text": "Option A"}, ...]
  correct_answers jsonb NOT NULL, -- ["a"] or ["option1", "option2"] for multiple_select

  -- Settings
  points_value integer DEFAULT 0, -- Points for this specific question
  is_required boolean DEFAULT true,
  order_index integer DEFAULT 0,

  -- Metadata
  explanation text, -- Shown after answer
  image_url text,

  created_at timestamp DEFAULT now()
);

-- Poll Options Table
CREATE TABLE poll_options (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id varchar REFERENCES tasks(id) ON DELETE CASCADE,

  -- Option Data
  option_text text NOT NULL,
  option_image_url text,
  order_index integer DEFAULT 0,

  -- Results
  vote_count integer DEFAULT 0,

  created_at timestamp DEFAULT now()
);

-- Quiz/Poll Responses
CREATE TABLE task_responses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_completion_id varchar REFERENCES task_completions(id) ON DELETE CASCADE,
  task_id varchar REFERENCES tasks(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,

  -- Response Data
  response_type varchar(50) NOT NULL, -- 'quiz', 'poll', 'code_submission', 'text_input'

  -- For Quizzes
  question_id varchar, -- References quiz_questions.id
  selected_answers jsonb, -- User's selected answer(s)
  is_correct boolean,

  -- For Polls
  poll_option_id varchar, -- References poll_options.id

  -- For Code/Text Input
  text_input text,

  -- Metadata
  submitted_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_type ON task_templates(template_type);
CREATE INDEX idx_task_templates_public ON task_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX idx_quiz_questions_task ON quiz_questions(task_id);
CREATE INDEX idx_poll_options_task ON poll_options(task_id);
CREATE INDEX idx_task_responses_completion ON task_responses(task_completion_id);
CREATE INDEX idx_task_responses_user ON task_responses(user_id);

-- Comments
COMMENT ON TABLE task_templates IS 'Pre-built task templates for quick program setup';
COMMENT ON TABLE quiz_questions IS 'Questions for quiz-type tasks';
COMMENT ON TABLE poll_options IS 'Options for poll-type tasks';
COMMENT ON TABLE task_responses IS 'User responses to quizzes, polls, and other interactive tasks';
```

#### 3.2 Advanced Rule Configuration

**Enhanced task settings schema:**

```typescript
// shared/taskRuleSchemas.ts

export interface TaskRuleConfiguration {
  // Reward Configuration
  reward_config: {
    // Type of reward
    reward_type: 'points' | 'multiplier' | 'tiered' | 'random';

    // Points Configuration
    base_points?: number;
    bonus_points?: number;

    // Multiplier Configuration
    multiplier_value?: number; // User gets X times the defined amount
    multiplier_applies_to?: 'base_points' | 'all_points';

    // Tiered Rewards (based on performance)
    tiered_rewards?: Array<{
      tier: string; // 'bronze', 'silver', 'gold'
      condition: string; // 'score >= 80%', 'completion_time < 60s'
      points: number;
      multiplier?: number;
    }>;

    // Random Rewards (gamification)
    random_rewards?: {
      enabled: boolean;
      min_points: number;
      max_points: number;
      weights?: number[]; // Probability distribution
    };
  };

  // Update Cadence (Snag-inspired)
  update_cadence: {
    // How often the task updates/refreshes
    cadence: 'immediate' | 'daily' | 'weekly' | 'monthly';

    // For immediate: reward on completion
    // For daily/weekly/monthly: reward at the end of period

    // Timezone for scheduled rewards
    timezone?: string;

    // Specific time to award points
    reward_time?: string; // "09:00" UTC
  };

  // User Reward Frequency (Snag-inspired)
  user_reward_frequency: {
    // How often can a user earn the reward
    frequency: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'unlimited';

    // Timezone for frequency calculation
    timezone?: string; // Defaults to UTC

    // Maximum times user can earn reward (for unlimited)
    max_completions?: number;

    // Cooldown period (for custom frequency)
    cooldown_hours?: number;

    // Reset time (for daily/weekly/monthly)
    reset_time?: string; // "00:00" UTC
    reset_day?: number; // For weekly (0-6) or monthly (1-31)
  };

  // Streak Bonuses
  streak_bonuses?: {
    enabled: boolean;
    bonuses: Array<{
      streak_days: number;
      bonus_points: number;
      bonus_multiplier?: number;
    }>;
  };

  // Time-Based Bonuses
  time_bonuses?: {
    enabled: boolean;
    bonuses: Array<{
      name: string; // 'Early Bird', 'Happy Hour', 'Weekend Warrior'
      time_range: {
        start_time: string; // "06:00"
        end_time: string; // "10:00"
        days_of_week?: number[]; // [1,2,3,4,5] for weekdays
      };
      bonus_points?: number;
      bonus_multiplier?: number;
    }>;
  };

  // Conditional Rules
  conditional_rules?: Array<{
    condition_type: 'user_attribute' | 'user_stats' | 'task_performance' | 'date_range';

    // User Attribute Conditions
    user_attribute?: {
      field: string; // 'tier', 'verified', 'location'
      operator: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt';
      value: any;
    };

    // User Stats Conditions
    user_stats?: {
      metric: string; // 'total_points', 'tasks_completed', 'account_age_days'
      operator: 'gt' | 'gte' | 'lt' | 'lte' | 'between';
      value: number | [number, number];
    };

    // Task Performance Conditions
    task_performance?: {
      metric: 'completion_time' | 'score' | 'accuracy';
      operator: 'gt' | 'gte' | 'lt' | 'lte';
      value: number;
    };

    // Action to take when condition matches
    action: {
      type: 'multiply_points' | 'add_bonus' | 'unlock_reward' | 'grant_tier';
      value: number | string;
    };
  }>;

  // Expiration Rules
  expiration?: {
    enabled: boolean;
    expires_at?: string; // ISO date
    expires_after_days?: number;
    auto_archive?: boolean;
  };
}
```

**Deliverables for Phase 3:**
- ✅ Task template database schema
- ✅ Pre-built templates (10+ templates)
  - Social engagement templates (Twitter follow, retweet, etc)
  - Quiz template with multiple question types
  - Poll template with voting
  - Code submission template
  - Text input template
- ✅ Rule configuration system
  - Points vs Multiplier rewards
  - Update cadence (immediate, daily, weekly, monthly)
  - User reward frequency (one-time, daily, weekly, monthly)
  - Streak bonuses
  - Time-based bonuses
  - Conditional rules
- ✅ Template management UI
- ✅ Rule configuration UI

---

---

### PHASE 4: Fan Segmentation & Targeting (Weeks 7-8) 🟡 HIGH

**Goal:** Enable creators to segment fans and create targeted campaigns

#### 4.1 Fan Segmentation System

**Database schema:**

```sql
-- migrations/0026_add_fan_segmentation.sql

CREATE TABLE fan_segments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id varchar REFERENCES loyalty_programs(id) ON DELETE CASCADE,

  -- Segment Identity
  name varchar(200) NOT NULL,
  description text,
  slug varchar(200) NOT NULL,

  -- Segment Criteria (JSON query language)
  criteria jsonb NOT NULL,
  /* Example criteria:
  {
    "type": "all", // 'all' | 'any'
    "rules": [
      {
        "field": "fan_program.total_points_earned",
        "operator": "gte",
        "value": 1000
      },
      {
        "field": "fan_program.tier",
        "operator": "in",
        "value": ["premium", "vip"]
      },
      {
        "field": "user.created_at",
        "operator": "gte",
        "value": "2025-01-01"
      }
    ]
  }
  */

  -- Segment Type
  segment_type varchar(50) DEFAULT 'dynamic', -- 'dynamic' (auto-updates) | 'static' (fixed list)

  -- For static segments
  user_ids text[], -- Fixed list of user IDs

  -- Auto-refresh Settings (for dynamic segments)
  auto_refresh boolean DEFAULT true,
  refresh_frequency varchar(50) DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily', 'weekly'
  last_refreshed_at timestamp,

  -- Computed Stats (cached)
  member_count integer DEFAULT 0,
  avg_points_earned decimal(10,2),
  avg_tasks_completed decimal(10,2),
  last_calculated_at timestamp,

  -- Metadata
  created_by varchar REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Segment Membership (for performance)
CREATE TABLE segment_memberships (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id varchar NOT NULL REFERENCES fan_segments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fan_program_id varchar REFERENCES fan_programs(id) ON DELETE CASCADE,

  -- Membership Metadata
  joined_segment_at timestamp DEFAULT now(),

  -- User snapshot at time of joining (for static segments)
  user_snapshot jsonb,

  UNIQUE(segment_id, user_id)
);

-- Targeted Campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_segment_ids text[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_user_ids text[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS targeting_rules jsonb;

COMMENT ON COLUMN campaigns.target_segment_ids IS 'Segment IDs that can see this campaign';
COMMENT ON COLUMN campaigns.target_user_ids IS 'Specific user IDs that can see this campaign';
COMMENT ON COLUMN campaigns.targeting_rules IS 'Additional targeting rules beyond segments';

-- Indexes
CREATE INDEX idx_fan_segments_tenant ON fan_segments(tenant_id);
CREATE INDEX idx_fan_segments_program ON fan_segments(program_id);
CREATE INDEX idx_fan_segments_type ON fan_segments(segment_type);
CREATE INDEX idx_segment_memberships_segment ON segment_memberships(segment_id);
CREATE INDEX idx_segment_memberships_user ON segment_memberships(user_id);
CREATE UNIQUE INDEX idx_segment_memberships_unique ON segment_memberships(segment_id, user_id);

-- Comments
COMMENT ON TABLE fan_segments IS 'User segmentation for targeted campaigns and analytics';
COMMENT ON TABLE segment_memberships IS 'Cached segment membership for performance';
```

#### 4.2 Segment Builder Service

**TypeScript implementation:**

```typescript
// server/services/segment-service.ts

import { db } from '../db';
import { fanSegments, segmentMemberships, fanPrograms, users } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export class SegmentService {

  /**
   * Create segment
   */
  async createSegment(data: {
    tenantId: string;
    programId?: string;
    name: string;
    description?: string;
    criteria: any;
    segmentType: 'dynamic' | 'static';
    userIds?: string[];
    createdBy: string;
  }): Promise<any> {
    const slug = this.generateSlug(data.name);

    const segment = await db.insert(fanSegments).values({
      tenantId: data.tenantId,
      programId: data.programId,
      name: data.name,
      description: data.description,
      slug,
      criteria: data.criteria,
      segmentType: data.segmentType,
      userIds: data.userIds,
      createdBy: data.createdBy
    }).returning();

    // Calculate initial membership
    await this.refreshSegment(segment[0].id);

    return segment[0];
  }

  /**
   * Refresh segment membership
   */
  async refreshSegment(segmentId: string): Promise<void> {
    const segment = await db.query.fanSegments.findFirst({
      where: eq(fanSegments.id, segmentId)
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    if (segment.segmentType === 'static') {
      // Static segment: use fixed user list
      await this.refreshStaticSegment(segment);
    } else {
      // Dynamic segment: calculate based on criteria
      await this.refreshDynamicSegment(segment);
    }

    // Update last refreshed timestamp
    await db.update(fanSegments)
      .set({ lastRefreshedAt: new Date() })
      .where(eq(fanSegments.id, segmentId));
  }

  /**
   * Refresh static segment
   */
  private async refreshStaticSegment(segment: any): Promise<void> {
    // Clear existing memberships
    await db.delete(segmentMemberships)
      .where(eq(segmentMemberships.segmentId, segment.id));

    // Add users from userIds list
    if (segment.userIds && segment.userIds.length > 0) {
      const memberships = segment.userIds.map((userId: string) => ({
        segmentId: segment.id,
        userId
      }));

      await db.insert(segmentMemberships).values(memberships);
    }

    // Update member count
    await db.update(fanSegments)
      .set({ memberCount: segment.userIds?.length || 0 })
      .where(eq(fanSegments.id, segment.id));
  }

  /**
   * Refresh dynamic segment
   */
  private async refreshDynamicSegment(segment: any): Promise<void> {
    // Build SQL query from criteria
    const query = this.buildCriteriaQuery(segment.criteria, segment.tenantId, segment.programId);

    // Execute query to get matching users
    const matchingUsers = await db.execute(query);

    // Clear existing memberships
    await db.delete(segmentMemberships)
      .where(eq(segmentMemberships.segmentId, segment.id));

    // Add new memberships
    if (matchingUsers.rows.length > 0) {
      const memberships = matchingUsers.rows.map((row: any) => ({
        segmentId: segment.id,
        userId: row.user_id,
        fanProgramId: row.fan_program_id
      }));

      await db.insert(segmentMemberships).values(memberships);
    }

    // Calculate stats
    const stats = await this.calculateSegmentStats(segment.id);

    // Update segment
    await db.update(fanSegments)
      .set({
        memberCount: matchingUsers.rows.length,
        avgPointsEarned: stats.avgPoints,
        avgTasksCompleted: stats.avgTasks,
        lastCalculatedAt: new Date()
      })
      .where(eq(fanSegments.id, segment.id));
  }

  /**
   * Build SQL query from criteria
   */
  private buildCriteriaQuery(criteria: any, tenantId: string, programId?: string): any {
    const { type, rules } = criteria;

    let whereConditions: string[] = [];
    let params: any[] = [];

    // Base conditions
    whereConditions.push('fp.tenant_id = $1');
    params.push(tenantId);

    if (programId) {
      whereConditions.push('fp.program_id = $2');
      params.push(programId);
    }

    // Build WHERE clause from rules
    rules.forEach((rule: any, index: number) => {
      const condition = this.buildRuleCondition(rule, params.length + 1);
      if (condition) {
        whereConditions.push(condition.clause);
        params.push(...condition.params);
      }
    });

    // Combine with AND/OR
    const operator = type === 'all' ? 'AND' : 'OR';
    const whereClauses = whereConditions.slice(programId ? 2 : 1).join(` ${operator} `);

    const baseWhere = programId
      ? `fp.tenant_id = $1 AND fp.program_id = $2`
      : `fp.tenant_id = $1`;

    const fullWhere = whereClauses
      ? `${baseWhere} AND (${whereClauses})`
      : baseWhere;

    // Build full query
    const query = sql.raw(`
      SELECT DISTINCT
        u.id as user_id,
        fp.id as fan_program_id
      FROM fan_programs fp
      JOIN users u ON fp.fan_id = u.id
      WHERE ${fullWhere}
        AND fp.deleted_at IS NULL
        AND u.deleted_at IS NULL
    `);

    return query;
  }

  /**
   * Build individual rule condition
   */
  private buildRuleCondition(rule: any, paramStart: number): any {
    const { field, operator, value } = rule;

    // Map field to table column
    const fieldMap: Record<string, string> = {
      'fan_program.total_points_earned': 'fp.total_points_earned',
      'fan_program.current_points': 'fp.current_points',
      'fan_program.tier': 'fp.tier',
      'fan_program.joined_at': 'fp.joined_at',
      'user.created_at': 'u.created_at',
      'user.user_type': 'u.user_type',
      // Add more field mappings...
    };

    const dbField = fieldMap[field];
    if (!dbField) {
      console.warn(`Unknown field: ${field}`);
      return null;
    }

    // Build condition based on operator
    switch (operator) {
      case 'eq':
        return { clause: `${dbField} = $${paramStart}`, params: [value] };
      case 'ne':
        return { clause: `${dbField} != $${paramStart}`, params: [value] };
      case 'gt':
        return { clause: `${dbField} > $${paramStart}`, params: [value] };
      case 'gte':
        return { clause: `${dbField} >= $${paramStart}`, params: [value] };
      case 'lt':
        return { clause: `${dbField} < $${paramStart}`, params: [value] };
      case 'lte':
        return { clause: `${dbField} <= $${paramStart}`, params: [value] };
      case 'in':
        return {
          clause: `${dbField} = ANY($${paramStart}::text[])`,
          params: [value]
        };
      case 'between':
        return {
          clause: `${dbField} BETWEEN $${paramStart} AND $${paramStart + 1}`,
          params: value
        };
      default:
        return null;
    }
  }

  /**
   * Calculate segment statistics
   */
  private async calculateSegmentStats(segmentId: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT
        AVG(fp.total_points_earned) as avg_points,
        AVG(tc.task_count) as avg_tasks
      FROM segment_memberships sm
      JOIN fan_programs fp ON sm.fan_program_id = fp.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as task_count
        FROM task_completions
        WHERE status = 'completed'
        GROUP BY user_id
      ) tc ON sm.user_id = tc.user_id
      WHERE sm.segment_id = ${segmentId}
    `);

    return {
      avgPoints: result.rows[0]?.avg_points || 0,
      avgTasks: result.rows[0]?.avg_tasks || 0
    };
  }

  /**
   * Check if user is in segment
   */
  async isUserInSegment(userId: string, segmentId: string): Promise<boolean> {
    const membership = await db.query.segmentMemberships.findFirst({
      where: and(
        eq(segmentMemberships.segmentId, segmentId),
        eq(segmentMemberships.userId, userId)
      )
    });

    return !!membership;
  }

  /**
   * Get user's segments
   */
  async getUserSegments(userId: string, tenantId: string): Promise<any[]> {
    const segments = await db
      .select({
        segment: fanSegments
      })
      .from(segmentMemberships)
      .innerJoin(fanSegments, eq(segmentMemberships.segmentId, fanSegments.id))
      .where(
        and(
          eq(segmentMemberships.userId, userId),
          eq(fanSegments.tenantId, tenantId)
        )
      );

    return segments.map(s => s.segment);
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Export singleton
export const segmentService = new SegmentService();
```

**Deliverables for Phase 4:**
- ✅ Fan segmentation database schema
- ✅ Segment builder service with dynamic/static segments
- ✅ Segment criteria query builder
- ✅ Segment membership caching
- ✅ Targeted campaign filtering
- ✅ Segment analytics and stats
- ✅ Segment management UI

---

### PHASE 5: Web3 Enhancements (Weeks 9-10) 🟡 MEDIUM

**Goal:** Expand Web3 capabilities with wallet tasks and enhanced NFT rewards

#### 5.1 Web3 Wallet Connection Tasks

**Database schema:**

```sql
-- migrations/0027_add_web3_tasks.sql

-- Add Web3 task types to task_type enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'connect_wallet';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'hold_token';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'nft_ownership';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'onchain_action';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'bridge_funds';

-- Web3 Verifications Table
CREATE TABLE web3_verifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_completion_id varchar REFERENCES task_completions(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,

  -- Wallet Info
  wallet_address varchar(100) NOT NULL,
  chain varchar(50) NOT NULL, -- 'ethereum', 'polygon', 'solana', 'arbitrum', etc

  -- Verification Type
  verification_type varchar(50) NOT NULL, -- 'wallet_connection', 'token_hold', 'nft_ownership', 'onchain_action'

  -- Verification Data
  verification_data jsonb, -- Chain-specific data

  -- Token Holdings (for hold_token tasks)
  token_contract varchar(100),
  token_balance varchar(100), -- Big number as string
  token_decimals integer,

  -- NFT Ownership (for nft_ownership tasks)
  nft_contract varchar(100),
  nft_token_id varchar(100),
  nft_metadata jsonb,

  -- Onchain Action (for onchain_action tasks)
  transaction_hash varchar(100),
  block_number bigint,
  event_name varchar(100),
  event_data jsonb,

  -- Verification Result
  is_verified boolean DEFAULT false,
  verified_at timestamp,
  verification_method varchar(50), -- 'rpc_call', 'indexer', 'graph_protocol'

  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_web3_verifications_completion ON web3_verifications(task_completion_id);
CREATE INDEX idx_web3_verifications_user ON web3_verifications(user_id);
CREATE INDEX idx_web3_verifications_wallet ON web3_verifications(wallet_address);
CREATE INDEX idx_web3_verifications_chain ON web3_verifications(chain);

COMMENT ON TABLE web3_verifications IS 'Web3 task verifications (wallet connections, token holdings, NFT ownership, onchain actions)';
```

#### 5.2 Web3 Verification Service

**Implementation:**

```typescript
// server/services/web3-verification-service.ts

import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';

export class Web3VerificationService {

  // EVM providers
  private providers: Record<string, ethers.Provider> = {
    ethereum: new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL),
    polygon: new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL),
    arbitrum: new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL),
  };

  // Solana connection
  private solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

  /**
   * Verify wallet connection
   */
  async verifyWalletConnection(
    walletAddress: string,
    chain: string,
    signedMessage?: string,
    signature?: string
  ): Promise<boolean> {
    // Optional: Verify signature to prove ownership
    if (signedMessage && signature) {
      return this.verifySignature(walletAddress, signedMessage, signature, chain);
    }

    // Basic verification: just check if address is valid
    if (chain === 'solana') {
      try {
        new PublicKey(walletAddress);
        return true;
      } catch {
        return false;
      }
    } else {
      // EVM chains
      return ethers.isAddress(walletAddress);
    }
  }

  /**
   * Verify token holdings
   */
  async verifyTokenHolding(
    walletAddress: string,
    chain: string,
    tokenContract: string,
    minimumBalance: string // in wei/lamports
  ): Promise<{ verified: boolean; balance: string }> {
    if (chain === 'solana') {
      return this.verifySolanaTokenHolding(walletAddress, tokenContract, minimumBalance);
    } else {
      return this.verifyERC20TokenHolding(walletAddress, chain, tokenContract, minimumBalance);
    }
  }

  /**
   * Verify ERC20 token holding
   */
  private async verifyERC20TokenHolding(
    walletAddress: string,
    chain: string,
    tokenContract: string,
    minimumBalance: string
  ): Promise<{ verified: boolean; balance: string }> {
    const provider = this.providers[chain];
    if (!provider) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    // ERC20 ABI for balanceOf
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)'
    ];

    const contract = new ethers.Contract(tokenContract, erc20Abi, provider);

    try {
      const balance = await contract.balanceOf(walletAddress);
      const balanceString = balance.toString();

      const verified = BigInt(balanceString) >= BigInt(minimumBalance);

      return { verified, balance: balanceString };
    } catch (error) {
      console.error('ERC20 verification error:', error);
      return { verified: false, balance: '0' };
    }
  }

  /**
   * Verify Solana token holding
   */
  private async verifySolanaTokenHolding(
    walletAddress: string,
    tokenMint: string,
    minimumBalance: string
  ): Promise<{ verified: boolean; balance: string }> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(tokenMint);

      // Get token accounts for wallet
      const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey }
      );

      if (tokenAccounts.value.length === 0) {
        return { verified: false, balance: '0' };
      }

      // Sum all token account balances
      let totalBalance = BigInt(0);
      for (const account of tokenAccounts.value) {
        const amount = account.account.data.parsed.info.tokenAmount.amount;
        totalBalance += BigInt(amount);
      }

      const balanceString = totalBalance.toString();
      const verified = totalBalance >= BigInt(minimumBalance);

      return { verified, balance: balanceString };
    } catch (error) {
      console.error('Solana token verification error:', error);
      return { verified: false, balance: '0' };
    }
  }

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(
    walletAddress: string,
    chain: string,
    nftContract: string,
    tokenId?: string
  ): Promise<{ verified: boolean; tokenIds: string[] }> {
    if (chain === 'solana') {
      return this.verifySolanaNFTOwnership(walletAddress, nftContract);
    } else {
      return this.verifyERC721Ownership(walletAddress, chain, nftContract, tokenId);
    }
  }

  /**
   * Verify ERC721 NFT ownership
   */
  private async verifyERC721Ownership(
    walletAddress: string,
    chain: string,
    nftContract: string,
    tokenId?: string
  ): Promise<{ verified: boolean; tokenIds: string[] }> {
    const provider = this.providers[chain];
    if (!provider) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    // ERC721 ABI
    const erc721Abi = [
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function balanceOf(address owner) view returns (uint256)'
    ];

    const contract = new ethers.Contract(nftContract, erc721Abi, provider);

    try {
      if (tokenId) {
        // Check specific token ID
        const owner = await contract.ownerOf(tokenId);
        const verified = owner.toLowerCase() === walletAddress.toLowerCase();
        return { verified, tokenIds: verified ? [tokenId] : [] };
      } else {
        // Check if wallet owns any tokens from collection
        const balance = await contract.balanceOf(walletAddress);
        const verified = balance > 0n;
        return { verified, tokenIds: [] }; // Would need indexer for token IDs
      }
    } catch (error) {
      console.error('ERC721 verification error:', error);
      return { verified: false, tokenIds: [] };
    }
  }

  /**
   * Verify Solana NFT ownership
   */
  private async verifySolanaNFTOwnership(
    walletAddress: string,
    collectionAddress: string
  ): Promise<{ verified: boolean; tokenIds: string[] }> {
    try {
      const walletPubkey = new PublicKey(walletAddress);

      // Get all token accounts
      const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      // Filter for NFTs (amount = 1, decimals = 0)
      const nfts = tokenAccounts.value.filter(account => {
        const data = account.account.data.parsed.info.tokenAmount;
        return data.amount === '1' && data.decimals === 0;
      });

      // TODO: Verify collection membership (requires Metaplex metadata)
      const verified = nfts.length > 0;
      const tokenIds = nfts.map(nft => nft.pubkey.toString());

      return { verified, tokenIds };
    } catch (error) {
      console.error('Solana NFT verification error:', error);
      return { verified: false, tokenIds: [] };
    }
  }

  /**
   * Verify signature (for wallet ownership proof)
   */
  private async verifySignature(
    walletAddress: string,
    message: string,
    signature: string,
    chain: string
  ): Promise<boolean> {
    try {
      if (chain === 'solana') {
        // Solana signature verification
        // TODO: Implement Solana signature verification
        return true;
      } else {
        // EVM signature verification
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify onchain action (e.g., bridge transaction)
   */
  async verifyOnchainAction(
    transactionHash: string,
    chain: string,
    expectedEventName: string,
    contractAddress?: string
  ): Promise<{ verified: boolean; eventData?: any }> {
    const provider = this.providers[chain];
    if (!provider) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    try {
      const receipt = await provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        return { verified: false };
      }

      // Check if transaction was successful
      if (receipt.status !== 1) {
        return { verified: false };
      }

      // If contract address specified, verify logs
      if (contractAddress) {
        const logs = receipt.logs.filter(
          log => log.address.toLowerCase() === contractAddress.toLowerCase()
        );

        if (logs.length === 0) {
          return { verified: false };
        }

        // Parse event logs
        // TODO: Parse specific event based on expectedEventName
        return { verified: true, eventData: logs };
      }

      return { verified: true };
    } catch (error) {
      console.error('Onchain action verification error:', error);
      return { verified: false };
    }
  }
}

// Export singleton
export const web3VerificationService = new Web3VerificationService();
```

**Deliverables for Phase 5:**
- ✅ Web3 task types (wallet connection, token holding, NFT ownership, onchain actions)
- ✅ Multi-chain support (Ethereum, Polygon, Arbitrum, Solana)
- ✅ ERC20 token balance verification
- ✅ ERC721 NFT ownership verification
- ✅ Solana SPL token verification
- ✅ Transaction verification for onchain actions
- ✅ Wallet signature verification
- ✅ Web3 task builder UI
- ✅ Enhanced Crossmint NFT reward distribution

---

### PHASE 6: UI/UX Polish & Analytics (Weeks 11-12) 🟢 MEDIUM

**Goal:** Enterprise-grade UI components and real-time analytics dashboards

#### 6.1 Webhook Management UI

**Component:**

```typescript
// client/src/components/webhooks/WebhookManager.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function WebhookManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch webhooks
  const { data: webhooks, isLoading, refetch } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiClient.get('/api/webhooks').then(res => res.data)
  });

  // Create webhook mutation
  const createWebhook = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/webhooks', data),
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
    }
  });

  // Toggle webhook active status
  const toggleWebhook = useMutation({
    mutationFn: (webhookId: string) =>
      apiClient.post(`/api/webhooks/${webhookId}/toggle`),
    onSuccess: () => refetch()
  });

  if (isLoading) {
    return <div>Loading webhooks...</div>;
  }

  return (
    <div className="webhook-manager">
      <div className="header">
        <h2>Webhooks</h2>
        <button onClick={() => setShowCreateModal(true)}>
          + Create Webhook
        </button>
      </div>

      <div className="webhooks-list">
        {webhooks?.map((webhook: any) => (
          <WebhookCard
            key={webhook.id}
            webhook={webhook}
            onToggle={() => toggleWebhook.mutate(webhook.id)}
            onRefetch={refetch}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateWebhookModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createWebhook.mutate(data)}
        />
      )}
    </div>
  );
}

function WebhookCard({ webhook, onToggle, onRefetch }: any) {
  const [showDetails, setShowDetails] = useState(false);

  const stats = webhook.stats || {};
  const successRate = stats.total_deliveries > 0
    ? ((stats.successful_deliveries / stats.total_deliveries) * 100).toFixed(1)
    : 0;

  return (
    <div className={`webhook-card ${!webhook.is_active ? 'inactive' : ''}`}>
      <div className="webhook-header">
        <div className="webhook-info">
          <div className="webhook-url">{webhook.url}</div>
          <div className="webhook-description">{webhook.description}</div>
        </div>

        <div className="webhook-stats">
          <div className="stat">
            <label>Success Rate</label>
            <span className={successRate > 90 ? 'good' : successRate > 70 ? 'warning' : 'error'}>
              {successRate}%
            </span>
          </div>
          <div className="stat">
            <label>Total Deliveries</label>
            <span>{stats.total_deliveries || 0}</span>
          </div>
          <div className="stat">
            <label>Avg Response</label>
            <span>{stats.average_response_time_ms || 0}ms</span>
          </div>
        </div>

        <div className="webhook-actions">
          <button
            className={`toggle-btn ${webhook.is_active ? 'active' : 'inactive'}`}
            onClick={onToggle}
          >
            {webhook.is_active ? 'Active' : 'Inactive'}
          </button>
          <button onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {showDetails && (
        <WebhookDetails webhook={webhook} onRefetch={onRefetch} />
      )}
    </div>
  );
}
```

#### 6.2 Task Template Library UI

**Component:**

```typescript
// client/src/components/tasks/TaskTemplateLibrary.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function TaskTemplateLibrary({ onSelectTemplate }: any) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['task-templates'],
    queryFn: () => apiClient.get('/api/task-templates').then(res => res.data)
  });

  const filteredTemplates = templates?.filter((template: any) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Templates', icon: '📦' },
    { id: 'social_engagement', label: 'Social Engagement', icon: '👥' },
    { id: 'quiz', label: 'Quizzes', icon: '❓' },
    { id: 'poll', label: 'Polls', icon: '📊' },
    { id: 'code_submission', label: 'Code Entry', icon: '🎟️' },
    { id: 'web3', label: 'Web3 Tasks', icon: '⛓️' }
  ];

  return (
    <div className="task-template-library">
      <div className="library-header">
        <h2>Task Template Library</h2>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="templates-grid">
        {filteredTemplates?.map((template: any) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, onSelect }: any) {
  return (
    <div className="template-card" onClick={onSelect}>
      {template.thumbnail_url && (
        <div className="template-thumbnail">
          <img src={template.thumbnail_url} alt={template.name} />
        </div>
      )}

      <div className="template-content">
        <div className="template-header">
          <h3>{template.name}</h3>
          <span className={`difficulty ${template.difficulty}`}>
            {template.difficulty}
          </span>
        </div>

        <p className="template-description">{template.description}</p>

        <div className="template-meta">
          <span className="platform-badge">{template.platform}</span>
          <span className="time-badge">⏱️ {template.estimated_time_minutes} min</span>
          {template.avg_completion_rate && (
            <span className="completion-badge">
              ✅ {(template.avg_completion_rate * 100).toFixed(0)}% completion
            </span>
          )}
        </div>

        <div className="template-tags">
          {template.tags?.map((tag: string) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="template-actions">
        <button className="use-template-btn">Use Template</button>
      </div>
    </div>
  );
}
```

#### 6.3 Segment Builder UI

**Component:**

```typescript
// client/src/components/segments/SegmentBuilder.tsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function SegmentBuilder({ onSave }: any) {
  const [segment, setSegment] = useState({
    name: '',
    description: '',
    segment_type: 'dynamic',
    criteria: {
      type: 'all',
      rules: []
    }
  });

  const addRule = () => {
    setSegment(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        rules: [
          ...prev.criteria.rules,
          { field: '', operator: '', value: '' }
        ]
      }
    }));
  };

  const removeRule = (index: number) => {
    setSegment(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        rules: prev.criteria.rules.filter((_, i) => i !== index)
      }
    }));
  };

  const updateRule = (index: number, updates: any) => {
    setSegment(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        rules: prev.criteria.rules.map((rule, i) =>
          i === index ? { ...rule, ...updates } : rule
        )
      }
    }));
  };

  const saveSegment = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/segments', data),
    onSuccess: (data) => onSave(data.data)
  });

  const fieldOptions = [
    { value: 'fan_program.total_points_earned', label: 'Total Points Earned' },
    { value: 'fan_program.current_points', label: 'Current Points Balance' },
    { value: 'fan_program.tier', label: 'Fan Tier' },
    { value: 'fan_program.joined_at', label: 'Join Date' },
    { value: 'user.created_at', label: 'Account Age' },
    { value: 'user.user_type', label: 'User Type' }
  ];

  const operatorOptions = [
    { value: 'eq', label: 'Equals' },
    { value: 'ne', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Than or Equal' },
    { value: 'in', label: 'In' },
    { value: 'between', label: 'Between' }
  ];

  return (
    <div className="segment-builder">
      <div className="segment-form">
        <div className="form-group">
          <label>Segment Name</label>
          <input
            type="text"
            value={segment.name}
            onChange={(e) => setSegment(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., High Value Fans"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={segment.description}
            onChange={(e) => setSegment(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe this segment..."
          />
        </div>

        <div className="form-group">
          <label>Match Type</label>
          <select
            value={segment.criteria.type}
            onChange={(e) => setSegment(prev => ({
              ...prev,
              criteria: { ...prev.criteria, type: e.target.value as 'all' | 'any' }
            }))}
          >
            <option value="all">Match ALL conditions (AND)</option>
            <option value="any">Match ANY condition (OR)</option>
          </select>
        </div>

        <div className="rules-section">
          <div className="rules-header">
            <h3>Conditions</h3>
            <button onClick={addRule} className="add-rule-btn">+ Add Condition</button>
          </div>

          {segment.criteria.rules.map((rule: any, index: number) => (
            <div key={index} className="rule-row">
              <select
                value={rule.field}
                onChange={(e) => updateRule(index, { field: e.target.value })}
                className="field-select"
              >
                <option value="">Select field...</option>
                {fieldOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={rule.operator}
                onChange={(e) => updateRule(index, { operator: e.target.value })}
                className="operator-select"
              >
                <option value="">Select operator...</option>
                {operatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <input
                type="text"
                value={rule.value}
                onChange={(e) => updateRule(index, { value: e.target.value })}
                placeholder="Value..."
                className="value-input"
              />

              <button onClick={() => removeRule(index)} className="remove-rule-btn">
                ✕
              </button>
            </div>
          ))}

          {segment.criteria.rules.length === 0 && (
            <div className="empty-rules">
              <p>No conditions yet. Add a condition to define your segment.</p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            onClick={() => saveSegment.mutate(segment)}
            disabled={!segment.name || segment.criteria.rules.length === 0}
            className="save-btn"
          >
            Create Segment
          </button>
        </div>
      </div>

      <div className="segment-preview">
        <h3>Segment Preview</h3>
        <div className="preview-card">
          <h4>{segment.name || 'Untitled Segment'}</h4>
          <p>{segment.description || 'No description'}</p>

          <div className="criteria-summary">
            <strong>Will match users who:</strong>
            <ul>
              {segment.criteria.rules.map((rule: any, index: number) => {
                const field = fieldOptions.find(f => f.value === rule.field);
                const operator = operatorOptions.find(o => o.value === rule.operator);

                return (
                  <li key={index}>
                    {field?.label || rule.field} {operator?.label || rule.operator} {rule.value}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Deliverables for Phase 6:**
- ✅ Webhook management UI (create, edit, test, monitor)
- ✅ Task template library with preview
- ✅ Segment builder with visual rule creator
- ✅ Enhanced program builder with branding options
- ✅ Real-time analytics dashboards
- ✅ Program health monitoring UI
- ✅ Task performance analytics
- ✅ Mobile-responsive design
- ✅ Accessibility improvements (WCAG AA)

---

## 📈 Success Metrics & KPIs

### Technical Metrics

**Performance:**
- ✅ API response times < 200ms (p95)
- ✅ Dashboard load times < 1s
- ✅ Database query times < 100ms
- ✅ Webhook delivery success rate > 95%

**Reliability:**
- ✅ System uptime > 99.9%
- ✅ Webhook retry success rate > 90%
- ✅ Task verification accuracy > 95%
- ✅ Zero data integrity issues

### Business Metrics

**Creator Adoption:**
- Track webhook usage (% of creators using webhooks)
- Track template usage (most popular templates)
- Track advanced features (segments, rule configuration)
- Creator retention rate

**Fan Engagement:**
- Task completion rates by template type
- Average time to task completion
- Repeat completion rates
- Points redemption rates

**Platform Growth:**
- New programs created per week
- Active programs (with tasks)
- Total tasks completed
- Total points distributed

---

## 🚀 Deployment Strategy

### Week-by-Week Rollout

**Weeks 1-2: Phase 1 (Webhooks)**
- Deploy to staging
- Internal testing
- Beta testing with 5 creators
- Production deploy
- Monitor for 1 week

**Weeks 3-4: Phase 2 (Task Verification)**
- Deploy verification enhancements
- A/B test auto-approval vs manual review
- Collect fraud detection metrics
- Optimize trust score algorithm

**Weeks 5-6: Phase 3 (Templates & Rules)**
- Deploy template system
- Seed 15+ templates
- Creator training/documentation
- Collect feedback on rule configuration

**Weeks 7-8: Phase 4 (Segmentation)**
- Deploy segmentation system
- Create example segments
- Enable targeted campaigns
- Monitor performance impact

**Weeks 9-10: Phase 5 (Web3)**
- Deploy Web3 tasks
- Partner with 3 Web3 projects for testing
- Optimize RPC usage costs
- Launch NFT reward campaigns

**Weeks 11-12: Phase 6 (UI/UX)**
- Deploy all UI enhancements
- Conduct user testing
- Fix accessibility issues
- Performance optimization
- Launch marketing campaign

---

## 💰 Cost Estimation

### Development Resources

**Team Required:**
- 2 Backend Engineers (12 weeks)
- 1 Frontend Engineer (12 weeks)
- 1 DevOps Engineer (part-time, 6 weeks)
- 1 QA Engineer (8 weeks)
- 1 Product Designer (6 weeks)

**Total:** ~50 person-weeks

### Infrastructure Costs

**Additional Monthly Costs:**
- RPC providers (Alchemy/Infura): $200-500/mo
- Solana RPC: $100-300/mo
- Database scaling: +$100-200/mo
- Webhook delivery infrastructure: +$50-100/mo
- Analytics & monitoring: +$50/mo

**Total Additional:** ~$500-1,150/month

---

## 🎯 Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Roadmap**
   - Schedule team review meeting
   - Get stakeholder sign-off
   - Prioritize phases based on business needs

2. **Set Up Project Tracking**
   - Create Jira/Linear project
   - Break down phases into stories
   - Assign engineers to phases

3. **Prepare Development Environment**
   - Set up staging webhooks infrastructure
   - Get RPC provider API keys
   - Create test wallets for Web3 testing

4. **Create Documentation**
   - API documentation for webhooks
   - Template creation guide for creators
   - Segmentation user guide

5. **Kick Off Phase 1**
   - Start webhook database migration
   - Begin webhook service implementation
   - Design webhook management UI

---

## 📚 Resources & References

### Internal Documentation
- [Database Schema Audit Report](./DATABASE_SCHEMA_AUDIT_REPORT.md)
- [Database Migrations Summary](./DATABASE_MIGRATIONS_SUMMARY.md)
- [Loyalty Engine Enhancement Plan](./LOYALTY_ENGINE_ENHANCEMENT_PLAN.md)
- [Competitive Analysis](./COMPETITIVE_ANALYSIS_SNAG_OPENLOYALTY.md)
- [Crossmint NFT Integration](./CROSSMINT_NFT_INTEGRATION.md)

### External Resources
- [Snag Solutions Docs](https://docs.snagsolutions.io/)
- [OpenLoyalty API](https://apidocs.openloyalty.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Crossmint API](https://docs.crossmint.com/)

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Status:** 📋 **READY FOR REVIEW**
**Next Review:** After Phase 1 completion

---

## ✅ Approval Checklist

- [ ] Technical architecture reviewed by engineering team
- [ ] Cost estimates approved by finance
- [ ] Timeline approved by product management
- [ ] Resource allocation confirmed
- [ ] Phase 1 ready to start
- [ ] Monitoring & alerts configured
- [ ] Documentation plan in place
- [ ] QA strategy defined

**Ready to build the best loyalty platform for creators! 🚀**
