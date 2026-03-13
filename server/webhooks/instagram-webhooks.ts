/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/rbac';

/**
 * Instagram Webhook Management API
 *
 * NOTE: The actual webhook verification (GET) and event handling (POST)
 * for /webhooks/instagram are registered in social-routes.ts, which has
 * the more complete implementation (nonce verification, mention handling).
 * This file only registers the management API endpoints.
 */
export function registerInstagramWebhooks(app: Express) {
  // API endpoint to subscribe to webhook fields
  app.post(
    '/api/instagram/subscribe-webhooks',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const {
          access_token,
          instagram_account_id,
          fields = ['messages', 'message_reactions', 'comments'],
        } = req.body;

        if (!access_token || !instagram_account_id) {
          return res.status(400).json({
            error: 'access_token and instagram_account_id are required',
          });
        }

        console.log('[Instagram Webhooks] Subscribing to webhook fields:', fields);

        const subscribeUrl = `https://graph.instagram.com/v21.0/${instagram_account_id}/subscribed_apps`;
        const response = await fetch(subscribeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            subscribed_fields: fields.join(','),
            access_token: access_token,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Instagram Webhooks] Subscription failed:', errorText);
          throw new Error(`Webhook subscription failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('[Instagram Webhooks] Subscription successful:', result);

        res.json({
          success: true,
          message: 'Successfully subscribed to Instagram webhooks',
          fields: fields,
          result: result,
        });
      } catch (error) {
        console.error('[Instagram Webhooks] Subscription error:', error);
        res.status(500).json({
          error: 'Failed to subscribe to webhooks',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // API endpoint to get webhook subscription status
  app.get(
    '/api/instagram/webhook-status',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { access_token, instagram_account_id } = req.query;

        if (!access_token || !instagram_account_id) {
          return res.status(400).json({
            error: 'access_token and instagram_account_id are required',
          });
        }

        const statusUrl = `https://graph.instagram.com/v21.0/${instagram_account_id}/subscribed_apps`;
        const response = await fetch(`${statusUrl}?access_token=${access_token}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Status check failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        res.json(result);
      } catch (error) {
        console.error('[Instagram Webhooks] Status check error:', error);
        res.status(500).json({
          error: 'Failed to check webhook status',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
