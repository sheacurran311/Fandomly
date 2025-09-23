import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";

// Instagram webhook verification and handling
export function registerInstagramWebhooks(app: Express) {
  
  // Test endpoint to verify webhook URL is accessible
  app.get('/webhooks/instagram/test', (req: Request, res: Response) => {
    console.log('[Instagram Webhooks] Test endpoint accessed');
    res.json({ 
      status: 'ok', 
      message: 'Instagram webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasVerifyToken: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
    });
  });
  
  // Webhook verification endpoint (GET request from Meta)
  app.get('/webhooks/instagram', (req: Request, res: Response) => {
    console.log('[Instagram Webhooks] Verification request received from:', req.ip);
    console.log('[Instagram Webhooks] Full query params:', req.query);
    console.log('[Instagram Webhooks] Headers:', req.headers);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('[Instagram Webhooks] Verification params:', {
      mode,
      token: token ? 'present' : 'missing',
      challenge: challenge ? 'present' : 'missing',
      expectedToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ? 'configured' : 'NOT_CONFIGURED'
    });
    
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
        console.log('[Instagram Webhooks] ✅ Webhook verified successfully - sending challenge back');
        res.status(200).send(challenge);
      } else {
        console.error('[Instagram Webhooks] ❌ Verification failed - invalid token or mode:', {
          receivedMode: mode,
          receivedToken: token,
          expectedToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
          tokensMatch: token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
        });
        res.sendStatus(403);
      }
    } else {
      console.error('[Instagram Webhooks] ❌ Verification failed - missing parameters');
      res.sendStatus(400);
    }
  });

  // Webhook event notifications endpoint (POST request from Meta)
  app.post('/webhooks/instagram', (req: Request, res: Response) => {
    console.log('[Instagram Webhooks] Event notification received');
    
    const body = req.body;
    
    // Verify the request signature
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!verifySignature(body, signature)) {
      console.error('[Instagram Webhooks] Invalid signature');
      return res.sendStatus(403);
    }
    
    console.log('[Instagram Webhooks] Signature verified, processing events');
    
    // Process the webhook payload
    if (body.object === 'instagram') {
      body.entry?.forEach((entry: any) => {
        console.log('[Instagram Webhooks] Processing entry:', entry.id);
        
        // Handle messaging events
        if (entry.messaging) {
          entry.messaging.forEach((messagingEvent: any) => {
            handleMessagingEvent(messagingEvent);
          });
        }
        
        // Handle comment events
        if (entry.changes) {
          entry.changes.forEach((change: any) => {
            handleChangeEvent(change);
          });
        }
      });
    }
    
    // Acknowledge receipt of the event
    res.status(200).send('EVENT_RECEIVED');
  });

  // API endpoint to subscribe to webhook fields
  app.post('/api/instagram/subscribe-webhooks', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { access_token, instagram_account_id, fields = ['messages', 'message_reactions', 'comments'] } = req.body;
      
      if (!access_token || !instagram_account_id) {
        return res.status(400).json({ 
          error: 'access_token and instagram_account_id are required' 
        });
      }
      
      console.log('[Instagram Webhooks] Subscribing to webhook fields:', fields);
      
      // Subscribe to webhook fields
      const subscribeUrl = `https://graph.instagram.com/v21.0/${instagram_account_id}/subscribed_apps`;
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          subscribed_fields: fields.join(','),
          access_token: access_token
        })
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
        result: result
      });
      
    } catch (error) {
      console.error('[Instagram Webhooks] Subscription error:', error);
      res.status(500).json({ 
        error: 'Failed to subscribe to webhooks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint to get webhook subscription status
  app.get('/api/instagram/webhook-status', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { access_token, instagram_account_id } = req.query;
      
      if (!access_token || !instagram_account_id) {
        return res.status(400).json({ 
          error: 'access_token and instagram_account_id are required' 
        });
      }
      
      // Check subscription status
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
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Verify webhook signature
function verifySignature(body: any, signature: string): boolean {
  if (!signature || !process.env.INSTAGRAM_APP_SECRET) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Handle messaging events (messages, reactions, etc.)
function handleMessagingEvent(messagingEvent: any) {
  console.log('[Instagram Webhooks] Processing messaging event:', {
    sender: messagingEvent.sender?.id,
    recipient: messagingEvent.recipient?.id,
    timestamp: messagingEvent.timestamp,
    hasMessage: !!messagingEvent.message,
    hasReaction: !!messagingEvent.reaction,
    isEcho: messagingEvent.message?.is_echo
  });
  
  // Handle incoming messages
  if (messagingEvent.message && !messagingEvent.message.is_echo) {
    handleIncomingMessage(messagingEvent);
  }
  
  // Handle message reactions
  if (messagingEvent.reaction) {
    handleMessageReaction(messagingEvent);
  }
  
  // Handle delivery confirmations
  if (messagingEvent.delivery) {
    handleMessageDelivery(messagingEvent);
  }
  
  // Handle read confirmations
  if (messagingEvent.read) {
    handleMessageRead(messagingEvent);
  }
}

// Handle change events (comments, mentions, etc.)
function handleChangeEvent(change: any) {
  console.log('[Instagram Webhooks] Processing change event:', {
    field: change.field,
    value: change.value
  });
  
  if (change.field === 'comments') {
    handleCommentEvent(change.value);
  }
  
  if (change.field === 'mentions') {
    handleMentionEvent(change.value);
  }
}

// Handle incoming messages from users
function handleIncomingMessage(messagingEvent: any) {
  const senderId = messagingEvent.sender.id;
  const recipientId = messagingEvent.recipient.id;
  const message = messagingEvent.message;
  
  console.log('[Instagram Webhooks] Incoming message:', {
    from: senderId,
    to: recipientId,
    text: message.text,
    attachments: message.attachments?.length || 0
  });
  
  // TODO: Store message in database
  // TODO: Trigger any automated responses
  // TODO: Notify the creator about the new message
}

// Handle message reactions
function handleMessageReaction(messagingEvent: any) {
  console.log('[Instagram Webhooks] Message reaction:', {
    sender: messagingEvent.sender.id,
    reaction: messagingEvent.reaction.reaction,
    messageId: messagingEvent.reaction.mid
  });
  
  // TODO: Store reaction in database
  // TODO: Update message engagement metrics
}

// Handle message delivery confirmations
function handleMessageDelivery(messagingEvent: any) {
  console.log('[Instagram Webhooks] Message delivered:', {
    recipient: messagingEvent.recipient.id,
    messageIds: messagingEvent.delivery.mids
  });
  
  // TODO: Update message delivery status in database
}

// Handle message read confirmations
function handleMessageRead(messagingEvent: any) {
  console.log('[Instagram Webhooks] Message read:', {
    sender: messagingEvent.sender.id,
    watermark: messagingEvent.read.watermark
  });
  
  // TODO: Update message read status in database
}

// Handle comment events
function handleCommentEvent(commentData: any) {
  console.log('[Instagram Webhooks] Comment event:', {
    commentId: commentData.id,
    mediaId: commentData.media?.id,
    text: commentData.text,
    from: commentData.from?.username
  });
  
  // TODO: Store comment in database
  // TODO: Check for moderation rules
  // TODO: Notify creator about new comment
}

// Handle mention events
function handleMentionEvent(mentionData: any) {
  console.log('[Instagram Webhooks] Mention event:', {
    commentId: mentionData.comment_id,
    mediaId: mentionData.media_id,
    text: mentionData.text
  });
  
  // TODO: Store mention in database
  // TODO: Notify creator about mention
}
