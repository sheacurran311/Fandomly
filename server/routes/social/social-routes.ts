/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import type { Express, Request, Response } from 'express';
import express from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { socialConnections, platformPointsTransactions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { platformPointsService } from '../../services/points/platform-points-service';
import { encryptToken } from '../../lib/token-encryption';
import { verifyWebhookSignature } from './oauth-helpers';
import { registerOAuthCallbackRoutes } from './oauth-callback-routes';
import { registerAppleMusicRoutes } from './apple-music-routes';

// Points awarded for connecting a social account
const SOCIAL_CONNECTION_POINTS = 500;

export function registerSocialRoutes(app: Express) {
  // Register OAuth callback routes
  registerOAuthCallbackRoutes(app);

  // Register Apple Music routes
  registerAppleMusicRoutes(app);

  // ===== Instagram Webhooks =====

  // Test endpoint to verify webhook URL is accessible (no secrets exposed)
  app.get('/webhooks/instagram/test', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'Instagram webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      hasVerifyToken: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
    });
  });

  // Webhook verification endpoint (GET request from Meta)
  app.get('/webhooks/instagram', (req: Request, res: Response) => {
    console.log('\n========================================');
    console.log('[Instagram Webhooks] 🔔 VERIFICATION REQUEST RECEIVED');
    console.log('[Instagram Webhooks] From IP:', req.ip);
    console.log('[Instagram Webhooks] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Instagram Webhooks] Full query params:', JSON.stringify(req.query, null, 2));
    console.log('========================================\n');

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

    console.log('[Instagram Webhooks] Verification attempt:', {
      mode,
      hasToken: !!token,
      tokensMatch: token === expectedToken,
    });

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('[Instagram Webhooks] ✅ VERIFICATION SUCCESSFUL - Sending challenge back');
        console.log('[Instagram Webhooks] Challenge value:', challenge);
        res.status(200).send(challenge);
      } else {
        console.error('[Instagram Webhooks] ❌ VERIFICATION FAILED - Token or mode mismatch');
        console.error('  Details:', {
          receivedMode: mode,
          expectedMode: 'subscribe',
          modeMatch: mode === 'subscribe',
          receivedToken: token,
          expectedToken: expectedToken,
          tokenMatch: token === expectedToken,
          tokenLengthReceived: token?.length,
          tokenLengthExpected: expectedToken?.length,
        });
        res.sendStatus(403);
      }
    } else {
      console.error('[Instagram Webhooks] ❌ VERIFICATION FAILED - Missing parameters');
      console.error('  Mode present:', !!mode);
      console.error('  Token present:', !!token);
      res.sendStatus(400);
    }
  });

  // Webhook event notifications endpoint (POST request from Meta)
  app.post('/webhooks/instagram', async (req: Request, res: Response) => {
    console.log('[Instagram Webhooks] Event notification received');
    console.log('[Instagram Webhooks] Headers:', req.headers);

    const body = req.body;
    console.log('[Instagram Webhooks] Body type:', typeof body);
    console.log('[Instagram Webhooks] Body:', JSON.stringify(body, null, 2));

    // Verify the request signature from Meta
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      console.error('[Instagram Webhooks] Missing signature header — rejecting request');
      return res.sendStatus(400);
    }

    const isValidSignature = verifyWebhookSignature(req.body, signature, (req as any).rawBody);
    if (!isValidSignature) {
      console.error('[Instagram Webhooks] Invalid signature — rejecting request');
      return res.sendStatus(403);
    }

    console.log('[Instagram Webhooks] Signature verified successfully');

    console.log('[Instagram Webhooks] Processing events...');

    // Process the webhook payload
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        console.log('[Instagram Webhooks] Processing entry:', entry.id);

        // Handle webhook changes
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log('[Instagram Webhooks] Change event:', {
              field: change.field,
              valueKeys: Object.keys(change.value || {}),
            });

            // Handle comment events (for nonce/keyword verification)
            if (change.field === 'comments' && change.value) {
              const { handleInstagramCommentEvent } =
                await import('../../services/instagram-verification-service');

              const commentEvent = {
                comment_id: change.value.id || change.value.comment_id,
                media_id: change.value.media?.id || change.value.media_id,
                text: change.value.text || '',
                from: {
                  id: change.value.from?.id || '',
                  username: change.value.from?.username || '',
                },
              };

              console.log('[Instagram Webhooks] 💬 Processing comment event:', {
                comment_id: commentEvent.comment_id,
                media_id: commentEvent.media_id,
                username: commentEvent.from.username,
              });

              try {
                await handleInstagramCommentEvent(commentEvent);
              } catch (error) {
                console.error('[Instagram Webhooks] Error processing comment:', error);
              }
            }

            // Handle mention events (for story mention verification)
            if (change.field === 'mentions' && change.value) {
              const { handleInstagramMentionEvent } =
                await import('../../services/instagram-verification-service');

              const mentionEvent = {
                mention_id: change.value.id || change.value.mention_id,
                from: {
                  id: change.value.from?.id || change.value.sender?.id || '',
                  username: change.value.from?.username || change.value.sender?.username || '',
                },
                target: {
                  id: change.value.target?.id || entry.id,
                  username: change.value.target?.username || '',
                },
                caption: change.value.caption || change.value.text,
              };

              console.log('[Instagram Webhooks] 👋 Processing mention event:', {
                mention_id: mentionEvent.mention_id,
                fan_username: mentionEvent.from.username,
                creator_username: mentionEvent.target.username,
              });

              try {
                await handleInstagramMentionEvent(mentionEvent);
              } catch (error) {
                console.error('[Instagram Webhooks] Error processing mention:', error);
              }
            }
          }
        }
      }
    }

    // Acknowledge receipt of the event
    res.status(200).send('EVENT_RECEIVED');
  });

  // ===== Facebook deauthorization callback =====
  app.post(
    '/api/facebook/deauthorize',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        console.log('Facebook deauthorization callback received');

        // Parse the request body
        const body = JSON.parse(req.body.toString());
        const { user_id, app_id } = body;

        // Verify this is for our app
        const expectedAppId = process.env.FACEBOOK_APP_ID;
        if (app_id !== expectedAppId) {
          console.warn('Deauthorization callback for wrong app ID:', app_id);
          return res.status(400).json({ error: 'Invalid app ID' });
        }

        console.log('Processing deauthorization for Facebook user:', user_id);

        // Find all users with this Facebook ID and clean up their data
        const users = await storage.getUsersByFacebookId(user_id);

        for (const user of users) {
          console.log('Cleaning up Facebook data for user:', user.id);

          // Remove Facebook data from user profile
          const updatedProfileData = { ...user.profileData };
          if (updatedProfileData?.facebookData) {
            delete updatedProfileData.facebookData;
          }
          if ((updatedProfileData as any)?.socialConnections?.facebook) {
            delete (updatedProfileData as any).socialConnections.facebook;
          }

          // Update user with cleaned profile data
          await storage.updateUser(user.id, {
            profileData: updatedProfileData,
          });

          // Log the deauthorization event
          console.log('Facebook data removed for user:', user.id, 'Facebook ID:', user_id);
        }

        // Facebook expects a 200 OK response with specific format
        res.status(200).json({
          url: `${process.env.FRONTEND_URL || 'https://fandomly.ai'}/data-deletion`,
          confirmation_code: `deauth_${user_id}_${Date.now()}`,
        });
      } catch (error) {
        console.error('Facebook deauthorization callback error:', error);
        res.status(500).json({ error: 'Failed to process deauthorization' });
      }
    }
  );

  // ===== Facebook Graph API helpers and debug proxy =====
  const FB_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';
  const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

  async function callFacebookGraph(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    params: Record<string, any>,
    accessToken: string
  ) {
    const url = new URL(`${FB_BASE_URL}${path}`);
    const searchParams = new URLSearchParams();
    // Ensure access token is always included
    searchParams.set('access_token', accessToken);

    if (method === 'GET' || method === 'DELETE') {
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        searchParams.set(key, String(value));
      });
      url.search = searchParams.toString();
      const res = await fetch(url.toString(), { method });
      return res.json();
    }

    // POST/PUT
    const bodyParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      bodyParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    bodyParams.set('access_token', accessToken);
    const res = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });
    return res.json();
  }

  // Generic Graph passthrough for manual testing
  app.post('/api/facebook/graph', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { path, method = 'GET', params = {}, accessToken } = req.body || {};
      if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
      if (!path || typeof path !== 'string' || !path.startsWith('/')) {
        return res.status(400).json({ error: 'path must start with /' });
      }
      const data = await callFacebookGraph(path, method, params, accessToken);
      res.json(data);
    } catch (error) {
      console.error('Facebook graph passthrough error:', error);
      res.status(500).json({ error: 'Graph request failed' });
    }
  });

  // Inspect a token via /debug_token (dev-only, requires app credentials)
  app.get('/api/facebook/debug-token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const inputToken = (req.query.token as string) || (req.headers['x-fb-token'] as string);
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!inputToken)
        return res.status(400).json({ error: 'token query param or x-fb-token header required' });
      if (!appId || !appSecret)
        return res.status(400).json({ error: 'Server missing FACEBOOK_APP_ID/SECRET' });
      const appAccessToken = `${appId}|${appSecret}`;
      const url = new URL(`https://graph.facebook.com/${FB_API_VERSION}/debug_token`);
      url.search = new URLSearchParams({
        input_token: inputToken,
        access_token: appAccessToken,
      }).toString();
      const resp = await fetch(url.toString());
      const json = await resp.json();
      res.json(json);
    } catch (error) {
      console.error('Facebook debug-token error:', error);
      res.status(500).json({ error: 'Failed to debug token' });
    }
  });

  // GET /me with optional fields using provided Bearer token
  app.get('/api/facebook/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const bearer = req.headers.authorization || '';
      const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
      const fields = (req.query.fields as string) || 'id,name,fan_count,followers_count';
      const data = await callFacebookGraph('/me', 'GET', { fields }, token);
      res.json(data);
    } catch (error) {
      console.error('Facebook /me error:', error);
      res.status(500).json({ error: 'Failed to fetch /me' });
    }
  });

  // GET /me/accounts to list pages
  app.get('/api/facebook/accounts', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const bearer = req.headers.authorization || '';
      const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
      const fields =
        (req.query.fields as string) ||
        'id,name,access_token,category,followers_count,fan_count,instagram_business_account';
      const data = await callFacebookGraph('/me/accounts', 'GET', { fields, limit: '100' }, token);
      res.json(data);
    } catch (error) {
      console.error('Facebook /me/accounts error:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // GET page details
  app.get(
    '/api/facebook/pages/:pageId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const bearer = req.headers.authorization || '';
        const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
        if (!token)
          return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
        const { pageId } = req.params;
        const fields =
          (req.query.fields as string) ||
          'id,name,followers_count,fan_count,link,username,instagram_business_account';
        const data = await callFacebookGraph(`/${pageId}`, 'GET', { fields }, token);
        res.json(data);
      } catch (error) {
        console.error('Facebook page details error:', error);
        res.status(500).json({ error: 'Failed to fetch page details' });
      }
    }
  );

  // GET page insights
  app.get(
    '/api/facebook/pages/:pageId/insights',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const bearer = req.headers.authorization || '';
        const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
        if (!token)
          return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
        const { pageId } = req.params;
        const metric =
          (req.query.metric as string) ||
          'page_engaged_users,page_post_engagements,page_fans,page_impressions';
        const period = (req.query.period as string) || 'day';
        const since =
          (req.query.since as string) ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const until = (req.query.until as string) || new Date().toISOString().split('T')[0];
        const data = await callFacebookGraph(
          `/${pageId}/insights`,
          'GET',
          { metric, period, since, until },
          token
        );
        res.json(data);
      } catch (error) {
        console.error('Facebook page insights error:', error);
        res.status(500).json({ error: 'Failed to fetch page insights' });
      }
    }
  );

  // Save connected social account
  app.post('/api/social/connect', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { platform, accountData } = req.body;

      console.log(`[Social Connect] Request received:`, {
        userId,
        platform,
        hasAccountData: !!accountData,
        accountUsername: accountData?.user?.username,
      });

      if (!platform || !accountData) {
        return res.status(400).json({ error: 'Platform and account data are required' });
      }

      // Save to BOTH systems for consistency
      // 1. Save to old storage system (users.profileData.socialConnections)
      await storage.saveSocialAccount(userId, platform, accountData);

      // 2. Also save to socialConnections table for consistency across all pages
      let isNewConnection = false;

      try {
        // Check if connection already exists in socialConnections table
        const existingConnection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, platform)
          ),
        });

        // Exchange short-lived Facebook/Instagram tokens for long-lived ones before encrypting
        let rawAccessToken = accountData.accessToken || accountData.access_token;
        const rawRefreshToken = accountData.refreshToken || accountData.refresh_token;

        if (rawAccessToken && (platform === 'facebook' || platform === 'instagram')) {
          try {
            const appSecret = process.env.FACEBOOK_APP_SECRET;
            const appId =
              platform === 'facebook'
                ? process.env.FACEBOOK_CREATOR_APP_ID || '1665384740795979'
                : process.env.FACEBOOK_APP_ID || '4233782626946744';
            if (appSecret) {
              const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(rawAccessToken)}`;
              const exchangeRes = await fetch(exchangeUrl);
              if (exchangeRes.ok) {
                const exchangeData = await exchangeRes.json();
                rawAccessToken = exchangeData.access_token;
                console.log(`[Social Connect] Exchanged for long-lived ${platform} token`);
              }
            }
          } catch (exchangeErr) {
            console.warn(
              `[Social Connect] Long-lived token exchange failed for ${platform}:`,
              exchangeErr
            );
          }
        }

        const connectionData = {
          platformUserId: accountData.user?.id || accountData.id,
          platformUsername: accountData.user?.username || accountData.username,
          platformDisplayName:
            accountData.user?.name || accountData.name || accountData.displayName,
          profileData: accountData,
          ...(rawAccessToken ? { accessToken: encryptToken(rawAccessToken) } : {}),
          ...(rawRefreshToken ? { refreshToken: encryptToken(rawRefreshToken) } : {}),
          lastSyncedAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
        };

        if (existingConnection) {
          // Update existing connection
          await db
            .update(socialConnections)
            .set(connectionData)
            .where(eq(socialConnections.id, existingConnection.id));
          console.log(
            `[Social Connect] Updated ${platform} in socialConnections table for user ${userId}`
          );
        } else {
          // Create new connection
          await db.insert(socialConnections).values({
            userId,
            platform,
            ...connectionData,
          });
          isNewConnection = true;
          console.log(
            `[Social Connect] Created ${platform} in socialConnections table for user ${userId}`
          );
        }
      } catch (syncError) {
        console.error(`[Social Connect] Error syncing to socialConnections table:`, syncError);
        // Don't fail the request if the sync fails
      }

      // Award platform points for new social connection (one-time per platform)
      // Check transaction history to prevent exploit via disconnect/reconnect
      let pointsAwarded = 0;
      if (isNewConnection) {
        try {
          // Check if user already received points for this platform
          const existingReward = await db.query.platformPointsTransactions.findFirst({
            where: and(
              eq(platformPointsTransactions.userId, userId),
              eq(platformPointsTransactions.source, 'social_connection_reward'),
              sql`metadata->>'platform' = ${platform}`
            ),
          });

          if (!existingReward) {
            await platformPointsService.awardPoints(
              userId,
              SOCIAL_CONNECTION_POINTS,
              'social_connection_reward',
              {
                platform,
                platformUsername: accountData?.user?.username || accountData?.username,
              }
            );
            pointsAwarded = SOCIAL_CONNECTION_POINTS;
            console.log(
              `[Social Connect] Awarded ${SOCIAL_CONNECTION_POINTS} points to user ${userId} for connecting ${platform}`
            );
          } else {
            console.log(
              `[Social Connect] User ${userId} already received points for ${platform} - skipping (disconnect/reconnect protection)`
            );
          }
        } catch (pointsError) {
          console.error(`[Social Connect] Error awarding points:`, pointsError);
          // Don't fail the connection if points award fails
        }
      }

      console.log(`[Social Connect] Successfully saved ${platform} account for user ${userId}`);
      res.json({
        success: true,
        message: `${platform} account connected successfully`,
        pointsAwarded,
        isNewConnection,
      });
    } catch (error) {
      console.error('Social connect error:', error);
      res.status(500).json({ error: 'Failed to connect social account' });
    }
  });

  // Get user's connected social accounts
  app.get('/api/social/accounts', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const accounts = await storage.getSocialAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error('Get social accounts error:', error);
      res.status(500).json({ error: 'Failed to get social accounts' });
    }
  });

  // Get individual platform connection status
  app.get(
    '/api/social-connections/:platform',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { platform } = req.params;

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, platform),
            eq(socialConnections.isActive, true)
          ),
        });

        if (connection) {
          res.json({
            connected: true,
            connection: {
              id: connection.id,
              platform: connection.platform,
              platformUserId: connection.platformUserId,
              platformUsername: connection.platformUsername,
              platformDisplayName: connection.platformDisplayName,
              profileData: connection.profileData,
              connectedAt: connection.connectedAt,
              lastSyncedAt: connection.lastSyncedAt,
              isActive: connection.isActive,
            },
          });
        } else {
          res.json({ connected: false, connectionData: null });
        }
      } catch (error) {
        console.error(`Get ${req.params.platform} connection status error:`, error);
        res.json({ connected: false, connectionData: null });
      }
    }
  );

  // Disconnect social account (generic endpoint for all platforms)
  app.post(
    '/api/social-connections/disconnect',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { platform } = req.body;

        console.log(`[Social Disconnect] Request to disconnect ${platform} for user: ${userId}`);

        if (!platform) {
          return res.status(400).json({ error: 'platform required' });
        }

        const platformLower = String(platform).toLowerCase();

        // 1. Remove from socialConnections table (PRIMARY - source of truth)
        await db
          .delete(socialConnections)
          .where(
            and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platformLower))
          );
        console.log(
          `[Social Disconnect] Removed ${platformLower} from socialConnections table for user ${userId}`
        );

        // 2. Also remove from old storage (profileData.socialConnections) - best effort
        try {
          await storage.removeSocialAccount(userId, platformLower);
          console.log(`[Social Disconnect] Also removed ${platformLower} from old storage system`);
        } catch (storageErr) {
          console.warn(`[Social Disconnect] Old storage sync failed (non-fatal):`, storageErr);
        }

        console.log(
          `[Social Disconnect] Successfully disconnected ${platformLower} for user ${userId}`
        );
        res.json({ success: true, message: `${platformLower} account disconnected successfully` });
      } catch (error) {
        console.error('Social disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect social account' });
      }
    }
  );

  // Disconnect social account - legacy endpoint
  // Used by use-twitter-connection, use-social-connection (DELETE /api/social/twitter, etc.)
  app.delete('/api/social/:platform', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const platform = (req.params.platform || '').toLowerCase();

      console.log(
        `[Social Disconnect] DELETE request to disconnect ${platform} for user: ${userId}`
      );

      // 1. Remove from socialConnections table (PRIMARY - source of truth)
      await db
        .delete(socialConnections)
        .where(and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platform)));
      console.log(
        `[Social Disconnect] Removed ${platform} from socialConnections table for user ${userId}`
      );

      // 2. Also remove from old storage - best effort
      try {
        await storage.removeSocialAccount(userId, platform);
      } catch (storageErr) {
        console.warn(`[Social Disconnect] Old storage sync failed (non-fatal):`, storageErr);
      }

      console.log(`[Social Disconnect] Successfully disconnected ${platform} for user ${userId}`);
      res.json({ success: true, message: `${platform} account disconnected successfully` });
    } catch (error) {
      console.error('Social disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect social account' });
    }
  });
}
