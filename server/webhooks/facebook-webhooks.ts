/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express, Request, Response } from 'express';
import crypto from 'crypto';
import { matchAndVerifyTask } from '../services/webhook-auto-verify';

/**
 * Facebook Webhooks Handler
 * Handles webhooks for both Facebook Pages and User accounts
 * Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

// Verify webhook signature for Facebook
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyFacebookSignature(
  body: any,
  signature: string,
  appSecret: string,
  rawBody?: Buffer
): boolean {
  if (!signature || !appSecret) {
    console.log(
      '[Facebook Webhooks] Signature verification skipped - missing signature or app secret'
    );
    return false;
  }

  // Use raw body buffer for accurate signature verification (JSON.stringify may differ from original)
  const bodyString = rawBody
    ? rawBody.toString('utf8')
    : typeof body === 'string'
      ? body
      : JSON.stringify(body);

  const expectedSignature = crypto.createHmac('sha256', appSecret).update(bodyString).digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    console.log('[Facebook Webhooks] Signature verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  } catch (error) {
    console.error('[Facebook Webhooks] Signature verification error:', error);
    return false;
  }
}

/**
 * Process Facebook Page webhook events
 * Handles: feed posts, comments, reactions, page likes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processPageEvent(entry: any) {
  console.log('[Facebook Pages] Processing entry:', entry.id);

  for (const change of entry.changes || []) {
    const { field, value } = change;

    console.log('[Facebook Pages] Change event:', {
      field,
      value: JSON.stringify(value).substring(0, 200),
    });

    // Facebook events use sender_id OR from.id depending on the event type
    const senderId = value.sender_id || value.from?.id;

    switch (field) {
      case 'feed':
        // Post created, edited, or deleted
        console.log('[Facebook Pages] Feed event:', {
          item: value.item,
          verb: value.verb,
          postId: value.post_id,
          senderId,
        });
        // Auto-verify share/post tasks when a new post or share is created
        if (value.verb === 'add' && senderId) {
          const taskType = value.item === 'share' ? 'share' : 'post';
          await matchAndVerifyTask(senderId, 'facebook', taskType, {
            postId: value.post_id,
            item: value.item,
            pageId: entry.id,
          });
        }
        break;

      case 'mention':
        // Page or user mentioned in a post
        console.log('[Facebook Pages] 📢 Mention event:', {
          postId: value.post_id,
          senderId,
          senderName: value.sender_name,
          item: value.item,
          verb: value.verb,
        });
        if (value.verb === 'add' && senderId) {
          await matchAndVerifyTask(senderId, 'facebook', 'post', {
            postId: value.post_id,
            item: 'mention',
            pageId: entry.id,
          });
        }
        break;

      case 'comments':
        // Comment added, edited, or deleted
        console.log('[Facebook Pages] 💬 Comment event:', {
          commentId: value.comment_id,
          postId: value.post_id,
          parentId: value.parent_id,
          message: value.message,
          senderId,
          verb: value.verb,
        });
        // Auto-verify comment tasks
        if (value.verb === 'add' && senderId) {
          await matchAndVerifyTask(senderId, 'facebook', 'comment', {
            commentId: value.comment_id,
            postId: value.post_id,
          });
        }
        break;

      case 'reactions':
        // Reaction (like, love, etc.) added or removed
        console.log('[Facebook Pages] ❤️ Reaction event:', {
          reactionType: value.reaction_type,
          postId: value.post_id,
          senderId,
          verb: value.verb,
        });
        // Auto-verify like/reaction tasks
        if (value.verb === 'add' && senderId) {
          await matchAndVerifyTask(senderId, 'facebook', 'like', {
            postId: value.post_id,
            reactionType: value.reaction_type,
          });
        }
        break;

      case 'likes':
        // Page like/unlike
        console.log('[Facebook Pages] 👍 Page like event:', {
          userId: value.user_id,
          verb: value.verb,
        });
        // Auto-verify page follow tasks
        if (value.verb === 'add' && value.user_id) {
          await matchAndVerifyTask(value.user_id, 'facebook', 'follow_page', { pageId: entry.id });
        }
        break;

      default:
        console.log('[Facebook Pages] Unhandled field:', field);
    }
  }
}

/**
 * Process Facebook User webhook events
 * Handles: user photos, videos, feed activity
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processUserEvent(entry: any) {
  console.log('[Facebook Users] Processing entry:', entry.id);

  for (const change of entry.changes || []) {
    const { field, value } = change;

    console.log('[Facebook Users] Change event:', {
      field,
      value: JSON.stringify(value).substring(0, 200),
    });

    switch (field) {
      case 'photos':
        // User uploaded/tagged in photo
        console.log('[Facebook Users] Photo event:', {
          verb: value.verb,
          objectId: value.object_id,
        });
        // Auto-verify photo tasks when user uploads or is tagged
        if (value.verb === 'add' || value.verb === 'tagged') {
          await matchAndVerifyTask(entry.id, 'facebook', 'post', {
            objectId: value.object_id,
            mediaType: 'photo',
          });
        }
        break;

      case 'videos':
        // User uploaded/tagged in video
        console.log('[Facebook Users] Video event:', {
          verb: value.verb,
          objectId: value.object_id,
        });
        // Auto-verify video tasks when user uploads or is tagged
        if (value.verb === 'add' || value.verb === 'tagged') {
          await matchAndVerifyTask(entry.id, 'facebook', 'post', {
            objectId: value.object_id,
            mediaType: 'video',
          });
        }
        break;

      case 'feed':
        // User feed activity (posts, likes, comments, shares)
        console.log('[Facebook Users] Feed event:', {
          verb: value.verb,
          item: value.item,
          postId: value.post_id,
        });
        // Auto-verify feed activity tasks (shares, posts, likes, comments)
        if (value.verb === 'add' && value.item) {
          const feedTaskType =
            value.item === 'share'
              ? 'share'
              : value.item === 'like'
                ? 'like'
                : value.item === 'comment'
                  ? 'comment'
                  : 'post';
          await matchAndVerifyTask(entry.id, 'facebook', feedTaskType, {
            postId: value.post_id,
            item: value.item,
          });
        }
        break;

      default:
        console.log('[Facebook Users] Unhandled field:', field);
    }
  }
}

export function registerFacebookWebhooks(app: Express) {
  const appSecret = process.env.FACEBOOK_APP_SECRET || '';

  // ===== Facebook Pages Webhooks =====

  // Test endpoint
  app.get('/webhooks/facebook/pages/test', (req: Request, res: Response) => {
    console.log('[Facebook Pages Webhooks] Test endpoint accessed');
    res.json({
      status: 'ok',
      message: 'Facebook Pages webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      appId: '1665384740795979',
      hasVerifyToken: !!process.env.FACEBOOK_PAGE_WEBHOOK_VERIFY_TOKEN,
      verifyTokenPreview: process.env.FACEBOOK_PAGE_WEBHOOK_VERIFY_TOKEN
        ? `${process.env.FACEBOOK_PAGE_WEBHOOK_VERIFY_TOKEN.substring(0, 10)}...`
        : 'NOT_SET',
    });
  });

  // Webhook verification endpoint (GET request from Meta)
  app.get('/webhooks/facebook/pages', (req: Request, res: Response) => {
    console.log('\n========================================');
    console.log('[Facebook Pages Webhooks] 🔔 VERIFICATION REQUEST');
    console.log('[Facebook Pages Webhooks] From IP:', req.ip);
    console.log('[Facebook Pages Webhooks] Query params:', JSON.stringify(req.query, null, 2));
    console.log('========================================\n');

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.FACEBOOK_PAGE_WEBHOOK_VERIFY_TOKEN;

    console.log('[Facebook Pages Webhooks] Verification comparison:');
    console.log('  - Mode:', mode, '(expected: subscribe)');
    console.log('  - Token received:', token);
    console.log('  - Token expected:', expectedToken);
    console.log('  - Challenge:', challenge);
    console.log('  - Tokens match:', token === expectedToken);
    console.log('  - Token lengths:', token?.length, 'vs', expectedToken?.length);

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('[Facebook Pages Webhooks] ✅ VERIFICATION SUCCESSFUL');
        res.status(200).send(challenge);
      } else {
        console.error('[Facebook Pages Webhooks] ❌ VERIFICATION FAILED');
        console.error('  Mode match:', mode === 'subscribe');
        console.error('  Token match:', token === expectedToken);
        res.sendStatus(403);
      }
    } else {
      console.error('[Facebook Pages Webhooks] ❌ Missing parameters');
      console.error('  Mode present:', !!mode);
      console.error('  Token present:', !!token);
      res.sendStatus(400);
    }
  });

  // Webhook event notifications endpoint (POST request from Meta)
  app.post('/webhooks/facebook/pages', async (req: Request, res: Response) => {
    console.log('[Facebook Pages Webhooks] Event notification received');

    const body = req.body;
    const signature = req.headers['x-hub-signature-256'] as string;

    // Verify signature using raw body for accurate HMAC comparison
    if (signature && appSecret) {
      const isValid = verifyFacebookSignature(body, signature, appSecret, (req as any).rawBody);
      if (!isValid) {
        console.error('[Facebook Pages Webhooks] ❌ Invalid signature');
        return res.sendStatus(403);
      }
      console.log('[Facebook Pages Webhooks] ✅ Signature verified');
    } else {
      console.warn(
        '[Facebook Pages Webhooks] ⚠️ Signature verification skipped (development mode)'
      );
    }

    // Process the webhook payload
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        await processPageEvent(entry);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  });

  // ===== Facebook Users Webhooks =====

  // Test endpoint
  app.get('/webhooks/facebook/users/test', (req: Request, res: Response) => {
    console.log('[Facebook Users Webhooks] Test endpoint accessed');
    res.json({
      status: 'ok',
      message: 'Facebook Users webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      appId: '4233782626946744',
      hasVerifyToken: !!process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
      verifyTokenPreview: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
        ? `${process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN.substring(0, 10)}...`
        : 'NOT_SET',
    });
  });

  // Webhook verification endpoint (GET request from Meta)
  app.get('/webhooks/facebook/users', (req: Request, res: Response) => {
    console.log('\n========================================');
    console.log('[Facebook Users Webhooks] 🔔 VERIFICATION REQUEST');
    console.log('[Facebook Users Webhooks] From IP:', req.ip);
    console.log('[Facebook Users Webhooks] Query params:', JSON.stringify(req.query, null, 2));
    console.log('========================================\n');

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

    console.log('[Facebook Users Webhooks] Verification comparison:');
    console.log('  - Mode:', mode, '(expected: subscribe)');
    console.log('  - Token received:', token);
    console.log('  - Token expected:', expectedToken);
    console.log('  - Challenge:', challenge);
    console.log('  - Tokens match:', token === expectedToken);
    console.log('  - Token lengths:', token?.length, 'vs', expectedToken?.length);

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('[Facebook Users Webhooks] ✅ VERIFICATION SUCCESSFUL');
        res.status(200).send(challenge);
      } else {
        console.error('[Facebook Users Webhooks] ❌ VERIFICATION FAILED');
        console.error('  Mode match:', mode === 'subscribe');
        console.error('  Token match:', token === expectedToken);
        res.sendStatus(403);
      }
    } else {
      console.error('[Facebook Users Webhooks] ❌ Missing parameters');
      console.error('  Mode present:', !!mode);
      console.error('  Token present:', !!token);
      res.sendStatus(400);
    }
  });

  // Webhook event notifications endpoint (POST request from Meta)
  app.post('/webhooks/facebook/users', async (req: Request, res: Response) => {
    console.log('[Facebook Users Webhooks] Event notification received');

    const body = req.body;
    const signature = req.headers['x-hub-signature-256'] as string;

    // Verify signature using raw body for accurate HMAC comparison
    if (signature && appSecret) {
      const isValid = verifyFacebookSignature(body, signature, appSecret, (req as any).rawBody);
      if (!isValid) {
        console.error('[Facebook Users Webhooks] ❌ Invalid signature');
        return res.sendStatus(403);
      }
      console.log('[Facebook Users Webhooks] ✅ Signature verified');
    } else {
      console.warn(
        '[Facebook Users Webhooks] ⚠️ Signature verification skipped (development mode)'
      );
    }

    // Process the webhook payload
    if (body.object === 'user') {
      for (const entry of body.entry || []) {
        await processUserEvent(entry);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  });
}
