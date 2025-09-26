import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";
import { URLSearchParams } from "url";
import { storage } from "./storage";

// Instagram Business Login token exchange
async function exchangeInstagramToken(code: string, redirectUri: string, userType: string = 'creator') {
  const clientId = userType === 'creator' ? process.env.INSTAGRAM_CREATOR_APP_ID : process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = userType === 'creator' ? process.env.INSTAGRAM_APP_SECRET : process.env.INSTAGRAM_CLIENT_SECRET;
  
  console.log('[Instagram Token Exchange] Request details:', {
    userType,
    clientId,
    hasClientSecret: !!clientSecret,
    redirectUri,
    codeLength: code.length
  });
  
  if (!clientSecret) {
    throw new Error(`Instagram client secret not configured for ${userType}`);
  }
  
  const requestBody = {
    client_id: clientId!,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  };
  
  console.log('[Instagram Token Exchange] Making request to Instagram API...');
  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(requestBody).toString()
  });
  
  console.log('[Instagram Token Exchange] Instagram API response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Instagram Token Exchange] Instagram API error:', errorText);
    throw new Error(`Instagram token exchange failed: ${response.status} ${errorText}`);
  }
  
  const result = await response.json();
  console.log('[Instagram Token Exchange] Success, received token data:', {
    hasAccessToken: !!result.access_token,
    hasData: !!result.data,
    dataLength: result.data?.length
  });
  
  return result;
}

// TikTok Login Kit token exchange
async function exchangeTikTokToken(code: string) {
  const response = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code'
    }).toString()
  });
  
  return response.json();
}

// Twitter API v2 token exchange (Authorization Code with PKCE)
async function exchangeTwitterToken(
  code: string,
  redirectUri: string,
  codeVerifier: string
) {
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  }).toString();

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  // Include client credentials for confidential clients when a secret is configured
  if (process.env.TWITTER_CLIENT_SECRET) {
    headers['Authorization'] = `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`;
  }

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: params
  });

  const text = await response.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return {
    ok: response.ok,
    status: response.status,
    body: json ?? { error: 'invalid_response', error_description: text }
  };
}

// YouTube Data API token exchange
async function exchangeYouTubeToken(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.BASE_URL}/auth/youtube/callback`
    }).toString()
  });
  
  return response.json();
}

// Spotify Web API token exchange
async function exchangeSpotifyToken(code: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.BASE_URL}/auth/spotify/callback`
    }).toString()
  });
  
  return response.json();
}

// Get TikTok user info
async function getTikTokUser(accessToken: string) {
  const response = await fetch('https://open-api.tiktok.com/user/info/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      access_token: accessToken,
      fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'follower_count', 'following_count', 'likes_count', 'video_count']
    })
  });
  
  return response.json();
}

// Get Twitter user info
async function getTwitterUser(accessToken: string) {
  const response = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,public_metrics,profile_image_url,verified', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  return response.json();
}

// Verify webhook signature
function verifyWebhookSignature(body: any, signature: string): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  
  if (!signature || !appSecret) {
    console.log('[Instagram Webhooks] Signature verification skipped - missing signature or app secret:', {
      hasSignature: !!signature,
      hasAppSecret: !!appSecret
    });
    return false;
  }
  
  // Convert body to string for signature verification
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(bodyString)
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
  
  console.log('[Instagram Webhooks] Signature comparison:', {
    expected: expectedSignature.substring(0, 10) + '...',
    received: receivedSignature.substring(0, 10) + '...',
    bodyType: typeof body,
    bodyLength: bodyString.length
  });
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
  
  console.log('[Instagram Webhooks] Signature verification:', isValid ? 'VALID' : 'INVALID');
  return isValid;
}

export function registerSocialRoutes(app: Express) {
  
  // ===== Instagram Webhooks =====
  
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
    console.log('[Instagram Webhooks] Headers:', req.headers);
    
    const body = req.body;
    console.log('[Instagram Webhooks] Body type:', typeof body);
    console.log('[Instagram Webhooks] Body:', JSON.stringify(body, null, 2));
    
    // Verify the request signature (temporarily disabled for testing)
    const signature = req.headers['x-hub-signature-256'] as string;
    console.log('[Instagram Webhooks] Signature header:', signature ? 'present' : 'missing');
    
    // Verify signature (temporarily disabled for testing)
    if (signature) {
      const isValidSignature = verifyWebhookSignature(req.body, signature);
      if (!isValidSignature) {
        console.warn('[Instagram Webhooks] ⚠️  Invalid signature - but processing anyway for testing');
        // Temporarily allow invalid signatures for Meta's test webhooks
        // return res.sendStatus(403);
      } else {
        console.log('[Instagram Webhooks] ✅ Signature verified successfully');
      }
    } else {
      console.warn('[Instagram Webhooks] ⚠️  No signature header - processing anyway (development mode)');
    }
    
    console.log('[Instagram Webhooks] Processing events (signature verification temporarily disabled)');
    
    // Process the webhook payload
    if (body.object === 'instagram') {
      body.entry?.forEach((entry: any) => {
        console.log('[Instagram Webhooks] Processing entry:', entry.id);
        
        // Handle messaging events
        if (entry.messaging) {
          entry.messaging.forEach((messagingEvent: any) => {
            console.log('[Instagram Webhooks] 📩 Messaging event:', {
              sender: messagingEvent.sender?.id,
              recipient: messagingEvent.recipient?.id,
              message: messagingEvent.message?.text,
              timestamp: messagingEvent.timestamp,
              isEcho: messagingEvent.message?.is_echo
            });
          });
        }
        
        // Handle comment events
        if (entry.changes) {
          entry.changes.forEach((change: any) => {
            console.log('[Instagram Webhooks] 💬 Change event:', {
              field: change.field,
              value: change.value
            });
          });
        }
      });
    }
    
    // Acknowledge receipt of the event
    res.status(200).send('EVENT_RECEIVED');
  });

  // ===== Facebook deauthorization callback =====
  app.post('/api/facebook/deauthorize', express.raw({ type: 'application/json' }), async (req, res) => {
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
          profileData: updatedProfileData
        });
        
        // Log the deauthorization event
        console.log('Facebook data removed for user:', user.id, 'Facebook ID:', user_id);
      }
      
      // Facebook expects a 200 OK response with specific format
      res.status(200).json({
        url: `${process.env.FRONTEND_URL || 'https://fandomly.ai'}/data-deletion`,
        confirmation_code: `deauth_${user_id}_${Date.now()}`
      });
      
    } catch (error) {
      console.error('Facebook deauthorization callback error:', error);
      res.status(500).json({ error: 'Failed to process deauthorization' });
    }
  });

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
      body: bodyParams.toString()
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

  // Inspect a token via /debug_token (requires app credentials)
  app.get('/api/facebook/debug-token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const inputToken = (req.query.token as string) || req.headers['x-fb-token'] as string;
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!inputToken) return res.status(400).json({ error: 'token query param or x-fb-token header required' });
      if (!appId || !appSecret) return res.status(400).json({ error: 'Server missing FACEBOOK_APP_ID/SECRET' });
      const appAccessToken = `${appId}|${appSecret}`;
      const url = new URL(`https://graph.facebook.com/${FB_API_VERSION}/debug_token`);
      url.search = new URLSearchParams({
        input_token: inputToken,
        access_token: appAccessToken
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
      const fields = (req.query.fields as string) || 'id,name,access_token,category,followers_count,fan_count,instagram_business_account';
      const data = await callFacebookGraph('/me/accounts', 'GET', { fields, limit: '100' }, token);
      res.json(data);
    } catch (error) {
      console.error('Facebook /me/accounts error:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // GET page details
  app.get('/api/facebook/pages/:pageId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const bearer = req.headers.authorization || '';
      const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
      const { pageId } = req.params;
      const fields = (req.query.fields as string) || 'id,name,followers_count,fan_count,link,username,instagram_business_account';
      const data = await callFacebookGraph(`/${pageId}`, 'GET', { fields }, token);
      res.json(data);
    } catch (error) {
      console.error('Facebook page details error:', error);
      res.status(500).json({ error: 'Failed to fetch page details' });
    }
  });

  // GET page insights
  app.get('/api/facebook/pages/:pageId/insights', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const bearer = req.headers.authorization || '';
      const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'Authorization: Bearer <token> required' });
      const { pageId } = req.params;
      const metric = (req.query.metric as string) || 'page_engaged_users,page_post_engagements,page_fans,page_impressions';
      const period = (req.query.period as string) || 'day';
      const since = (req.query.since as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const until = (req.query.until as string) || new Date().toISOString().split('T')[0];
      const data = await callFacebookGraph(`/${pageId}/insights`, 'GET', { metric, period, since, until }, token);
      res.json(data);
    } catch (error) {
      console.error('Facebook page insights error:', error);
      res.status(500).json({ error: 'Failed to fetch page insights' });
    }
  });

  // Instagram Business Login token exchange
  app.post('/api/social/instagram/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri, user_type = 'creator' } = req.body;
      
      console.log('[Instagram API] Token exchange request:', {
        user_type,
        redirect_uri,
        code_length: code?.length,
        has_code: !!code
      });
      
      if (!code || !redirect_uri) {
        console.error('[Instagram API] Missing required parameters:', { code: !!code, redirect_uri: !!redirect_uri });
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }
      
      console.log('[Instagram API] Calling exchangeInstagramToken...');
      const tokenData = await exchangeInstagramToken(code, redirect_uri, user_type);
      console.log('[Instagram API] Token exchange response:', { 
        has_data: !!tokenData.data,
        data_length: tokenData.data?.length,
        has_access_token: !!(tokenData.data?.[0]?.access_token || tokenData.access_token)
      });
      
      // The response from Instagram Business Login includes data array
      if (tokenData.data && tokenData.data.length > 0) {
        const tokenInfo = tokenData.data[0];
        const response = {
          access_token: tokenInfo.access_token,
          user_id: tokenInfo.user_id,
          permissions: tokenInfo.permissions
        };
        console.log('[Instagram API] Sending formatted response');
        res.json(response);
      } else {
        console.log('[Instagram API] Sending raw response');
        res.json(tokenData);
      }
    } catch (error) {
      console.error('Instagram token exchange error:', error);
      res.status(500).json({ 
        error: 'Failed to exchange Instagram token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Instagram messaging (for creators via Facebook Page token)
  app.post('/api/social/instagram/send-message', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const { text, recipient_id } = req.body;
      
      if (!text || !recipient_id) {
        return res.status(400).json({ error: 'text and recipient_id are required' });
      }

      // Send Instagram message using Graph API
      const response = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: JSON.stringify({ text }),
          recipient: JSON.stringify({ id: recipient_id })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      res.json({ success: true, message_id: result.message_id });
    } catch (error) {
      console.error('Instagram send message error:', error);
      res.status(500).json({ 
        error: 'Failed to send Instagram message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Instagram Business Account info
  app.get('/api/social/instagram/business-account', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Get Instagram Business Account from Facebook Page
      const response = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count,website,biography}&access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Find page with Instagram Business Account
      const pageWithInstagram = data.data?.find((page: any) => page.instagram_business_account);
      
      if (!pageWithInstagram) {
        return res.status(404).json({ error: 'No Instagram Business Account found' });
      }

      res.json({
        page: {
          id: pageWithInstagram.id,
          name: pageWithInstagram.name
        },
        instagram_account: pageWithInstagram.instagram_business_account
      });
    } catch (error) {
      console.error('Instagram business account error:', error);
      res.status(500).json({ error: 'Failed to get Instagram Business Account' });
    }
  });

  // TikTok token exchange
  app.post('/api/social/tiktok/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const tokenData = await exchangeTikTokToken(code);
      res.json(tokenData);
    } catch (error) {
      console.error('TikTok token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange TikTok token' });
    }
  });

  // TikTok user info
  app.get('/api/social/tiktok/user', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      const userData = await getTikTokUser(accessToken);
      res.json(userData);
    } catch (error) {
      console.error('TikTok user info error:', error);
      res.status(500).json({ error: 'Failed to get TikTok user info' });
    }
  });

  // Twitter token exchange (no custom auth middleware)
  app.post('/api/social/twitter/token', async (req: AuthenticatedRequest, res) => {
    try {
      const timestamp = new Date().toISOString();
      const { code, redirect_uri, code_verifier } = req.body || {};
      const dynamicUserIdHeader = req.headers['x-dynamic-user-id'] as string | undefined;
      const dynamicUserIdBody = (req.body && (req.body.dynamicUserId || req.body.userId)) as string | undefined;
      const dynamicUserId = dynamicUserIdHeader || dynamicUserIdBody;

      console.log(`[Twitter Token] ${timestamp} Request received:`, {
        code: code ? `${code.substring(0, 10)}...` : 'missing',
        redirect_uri,
        code_verifier: code_verifier ? `${code_verifier.substring(0, 10)}...` : 'missing',
        userId: dynamicUserId || 'unknown'
      });

      if (!code || !redirect_uri || !code_verifier) {
        console.log('[Twitter Token] Missing required parameters');
        return res.status(400).json({ error: 'code, redirect_uri, and code_verifier are required' });
      }

      console.log(`[Twitter Token] Calling exchangeTwitterToken...`);
      const result = await exchangeTwitterToken(code, redirect_uri, code_verifier);
      console.log(`[Twitter Token] ${timestamp} exchange response:`, { status: result.status, ok: result.ok, body: result.body });
      if (!result.ok) {
        return res.status(result.status).json(result.body);
      }
      return res.json(result.body);
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Twitter token' });
    }
  });

  // Twitter user info (no custom auth middleware)
  app.get('/api/social/twitter/user', async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      const userData = await getTwitterUser(accessToken);
      res.json(userData);
    } catch (error) {
      console.error('Twitter user info error:', error);
      res.status(500).json({ error: 'Failed to get Twitter user info' });
    }
  });

  // YouTube token exchange
  app.post('/api/social/youtube/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const tokenData = await exchangeYouTubeToken(code);
      res.json(tokenData);
    } catch (error) {
      console.error('YouTube token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange YouTube token' });
    }
  });

  // Spotify token exchange
  app.post('/api/social/spotify/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const tokenData = await exchangeSpotifyToken(code);
      res.json(tokenData);
    } catch (error) {
      console.error('Spotify token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Spotify token' });
    }
  });

  // Save connected social account (no custom auth middleware)
  app.post('/api/social/connect', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId || req.body?.userId;
      const { platform, accountData } = req.body;
      
      console.log(`[Social Connect] Request received:`, { 
        dynamicUserId, 
        platform, 
        hasAccountData: !!accountData,
        accountUsername: accountData?.user?.username 
      });
      
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      if (!platform || !accountData) {
        return res.status(400).json({ error: 'Platform and account data are required' });
      }
      
      // Save to database
      await storage.saveSocialAccount(dynamicUserId, platform, accountData);
      
      console.log(`[Social Connect] Successfully saved ${platform} account for user ${dynamicUserId}`);
      res.json({ success: true, message: `${platform} account connected successfully` });
    } catch (error) {
      console.error('Social connect error:', error);
      res.status(500).json({ error: 'Failed to connect social account' });
    }
  });

  // Get user's connected social accounts (no custom auth middleware)
  app.get('/api/social/accounts', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || (req.query?.dynamicUserId as string) || (req.query?.userId as string);
      if (!dynamicUserId) {
        return res.json([]);
      }
      const accounts = await storage.getSocialAccounts(dynamicUserId);
      res.json(accounts);
    } catch (error) {
      console.error('Get social accounts error:', error);
      res.status(500).json({ error: 'Failed to get social accounts' });
    }
  });

  // Disconnect social account (no custom auth middleware)
  app.delete('/api/social/:platform', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId || req.body?.userId;
      const { platform } = req.params;
      
      console.log(`[Social Disconnect] Request to disconnect ${platform} for user: ${dynamicUserId}`);
      
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      // Remove from database
      const success = await storage.removeSocialAccount(dynamicUserId, platform);
      
      if (success) {
        console.log(`[Social Disconnect] Successfully disconnected ${platform} for user ${dynamicUserId}`);
        res.json({ success: true, message: `${platform} account disconnected successfully` });
      } else {
        console.log(`[Social Disconnect] Failed to disconnect ${platform} for user ${dynamicUserId}`);
        res.status(500).json({ error: `Failed to disconnect ${platform} account` });
      }
    } catch (error) {
      console.error('Social disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect social account' });
    }
  });
}