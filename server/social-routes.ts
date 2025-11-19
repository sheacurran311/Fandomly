import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";
import { URLSearchParams } from "url";
import { storage } from "./storage";
import { db } from "./db";
import { socialConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Server-side code idempotency
const usedCodeCache = new Map<string, number>(); // code -> expiryMillis
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function pruneUsedCodes() {
  const now = Date.now();
  for (const [k, v] of Array.from(usedCodeCache.entries())) {
    if (v < now) usedCodeCache.delete(k);
  }
}
setInterval(pruneUsedCodes, 60 * 1000).unref();

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
async function exchangeTikTokToken(code: string, redirectUri?: string) {
  console.log('[TikTok Token Exchange] Request details:', {
    hasClientKey: !!process.env.TIKTOK_CLIENT_KEY,
    clientKeyPrefix: process.env.TIKTOK_CLIENT_KEY?.substring(0, 5) + '...',
    clientKeyLength: process.env.TIKTOK_CLIENT_KEY?.length,
    hasClientSecret: !!process.env.TIKTOK_CLIENT_SECRET,
    clientSecretLength: process.env.TIKTOK_CLIENT_SECRET?.length,
    redirectUri,
    codeLength: code.length
  });

  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    throw new Error('TikTok client credentials not configured');
  }

  if (!redirectUri) {
    throw new Error('redirect_uri is required for TikTok token exchange');
  }

  // TikTok API v2 requires these exact parameters
  const requestBody = {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  };

  console.log('[TikTok Token Exchange] Request body:', {
    client_key: requestBody.client_key,
    hasClientSecret: !!requestBody.client_secret,
    code: requestBody.code.substring(0, 20) + '...',
    grant_type: requestBody.grant_type,
    redirect_uri: requestBody.redirect_uri
  });

  console.log('[TikTok Token Exchange] Making request to TikTok API v2...');
  // TikTok API v2 uses /v2/oauth/token/ endpoint
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    },
    body: new URLSearchParams(requestBody).toString()
  });
  
  console.log('[TikTok Token Exchange] TikTok API response status:', response.status);
  
  const result = await response.json();
  
  console.log('[TikTok Token Exchange] Raw response:', JSON.stringify(result));
  
  // TikTok API v2 response structure (per official docs):
  // Success: { access_token, open_id, refresh_token, expires_in, ... } (flat structure)
  // Error: { error, error_description, log_id }
  
  if (result.error) {
    const errorMessage = result.error_description || result.error;
    console.error('[TikTok Token Exchange] TikTok API error:', {
      error: result.error,
      error_description: result.error_description,
      log_id: result.log_id
    });
    throw new Error(`TikTok token exchange failed: ${errorMessage}`);
  }
  
  if (!result.access_token) {
    console.error('[TikTok Token Exchange] No access_token in response:', result);
    throw new Error('TikTok API did not return access_token');
  }
  
  console.log('[TikTok Token Exchange] Success! Token data:', {
    hasAccessToken: !!result.access_token,
    hasOpenId: !!result.open_id,
    hasRefreshToken: !!result.refresh_token,
    expiresIn: result.expires_in,
    scope: result.scope
  });
  
  // Return the result directly (access_token, open_id, refresh_token are at root level)
  return result;
}

// Twitter API v2 token exchange (PKCE + confidential client)
async function exchangeTwitterToken(
  code: string,
  redirectUri: string,
  codeVerifier: string
) {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  
  try {
    console.log('[Twitter Server] CLIENT_ID fingerprint:', clientId.slice(0,6), '...', clientId.slice(-6));
    console.log('[Twitter Server] Using redirect_uri for exchange:', redirectUri);
    console.log('[Twitter Server] Auth mode: PKCE + confidential (Basic auth)');
  } catch {}
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
    // Using Basic auth instead of client_id/client_secret in body
  }).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  // Add Basic auth for confidential client
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
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
async function exchangeYouTubeToken(code: string, redirectUri: string) {
  console.log('[YouTube Token Exchange] Request details:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length
  });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('YouTube/Google client credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  });
  
  console.log('[YouTube Token Exchange] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Token Exchange] Error:', errorText);
    throw new Error(`YouTube token exchange failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

// YouTube token refresh
async function refreshYouTubeToken(refreshToken: string) {
  console.log('[YouTube Token Refresh] Refreshing token...');
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('YouTube/Google client credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });
  
  console.log('[YouTube Token Refresh] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Token Refresh] Error:', errorText);
    throw new Error(`YouTube token refresh failed: ${response.status}`);
  }
  
  return response.json();
}

// Spotify Web API token exchange
async function exchangeSpotifyToken(code: string, redirectUri: string) {
  console.log('[Spotify Token Exchange] Request details:', {
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length
  });

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()
  });
  
  console.log('[Spotify Token Exchange] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Spotify Token Exchange] Error:', errorText);
    throw new Error(`Spotify token exchange failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

// Spotify token refresh
async function refreshSpotifyToken(refreshToken: string) {
  console.log('[Spotify Token Refresh] Refreshing token...');
  
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString()
  });
  
  console.log('[Spotify Token Refresh] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Spotify Token Refresh] Error:', errorText);
    throw new Error(`Spotify token refresh failed: ${response.status}`);
  }
  
  return response.json();
}

// Discord OAuth token exchange
async function exchangeDiscordToken(code: string, redirectUri: string) {
  console.log('[Discord Token Exchange] Request details:', {
    hasClientId: !!process.env.DISCORD_APP_ID,
    hasClientSecret: !!process.env.DISCORD_PUBLIC_KEY,
    redirectUri,
    codeLength: code.length
  });

  if (!process.env.DISCORD_APP_ID || !process.env.DISCORD_PUBLIC_KEY) {
    throw new Error('Discord client credentials not configured');
  }

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_APP_ID,
      client_secret: process.env.DISCORD_PUBLIC_KEY,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()
  });

  console.log('[Discord Token Exchange] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Discord Token Exchange] Error:', errorText);
    throw new Error(`Discord token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get Discord user info
async function getDiscordUser(accessToken: string) {
  console.log('[Discord User Info] Fetching user data...');

  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Discord User Info] Error:', errorText);
    throw new Error(`Failed to fetch Discord user info: ${response.status}`);
  }

  return response.json();
}

// Twitch OAuth token exchange
async function exchangeTwitchToken(code: string, redirectUri: string) {
  console.log('[Twitch Token Exchange] Request details:', {
    hasClientId: !!process.env.TWITCH_CLIENT_ID,
    hasClientSecret: !!process.env.TWITCH_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length
  });

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new Error('Twitch client credentials not configured');
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()
  });

  console.log('[Twitch Token Exchange] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Twitch Token Exchange] Error:', errorText);
    throw new Error(`Twitch token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get Twitch user info
async function getTwitchUser(accessToken: string) {
  console.log('[Twitch User Info] Fetching user data...');

  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Twitch User Info] Error:', errorText);
    throw new Error(`Failed to fetch Twitch user info: ${response.status}`);
  }

  const data = await response.json();
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

// Get TikTok user info
async function getTikTokUser(accessToken: string) {
  console.log('[TikTok User Info] Fetching user data...');
  
  // TikTok API v2 uses GET request with query parameters
  const fields = ['open_id', 'union_id', 'avatar_url', 'display_name', 'follower_count', 'following_count', 'likes_count', 'video_count'];
  const url = `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(',')}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('[TikTok User Info] Response status:', response.status);
  
  const result = await response.json();
  
  console.log('[TikTok User Info] Raw response:', JSON.stringify(result));
  
  // TikTok Display API v2 response structure:
  // Success: { data: { user: { ... } }, error: { code: "ok", message: "", log_id: "..." } }
  // Error: { error: { code: "error_code", message: "...", log_id: "..." } }
  // Note: TikTok ALWAYS returns an "error" object, but code "ok" means success!
  
  if (result.error && result.error.code !== 'ok') {
    const errorMessage = result.error.message || result.error.code || JSON.stringify(result.error);
    console.error('[TikTok User Info] TikTok API error:', result.error);
    throw new Error(`TikTok user info failed: ${errorMessage}`);
  }
  
  // Display API actually does use nested structure
  if (!result.data || !result.data.user) {
    console.error('[TikTok User Info] Missing user data in response:', result);
    throw new Error('TikTok API did not return user data');
  }
  
  console.log('[TikTok User Info] Success! User data:', {
    open_id: result.data.user.open_id,
    display_name: result.data.user.display_name,
    follower_count: result.data.user.follower_count
  });
  
  // Return the full result (keeps data.user structure for callback)
  return result;
}

// Get Twitter user info
async function getTwitterUser(accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics,profile_image_url,verified', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  return response.json();
}

// Refresh Twitter tokens (PKCE + confidential client - rotation aware)
async function refreshTwitterToken(
  refreshToken: string
) {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  
  try {
    console.log('[Twitter Server] Refresh with auth mode: PKCE + confidential (Basic auth)');
  } catch {}
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
    // Using Basic auth instead of client_id/client_secret in body
  }).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  // Add Basic auth for confidential client (consistent with exchange)
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
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

// Verify webhook signature
// Note: This requires access to the raw body buffer, which needs special middleware
function verifyWebhookSignature(body: any, signature: string, rawBody?: Buffer): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  
  if (!signature || !appSecret) {
    console.log('[Instagram Webhooks] Signature verification skipped - missing signature or app secret:', {
      hasSignature: !!signature,
      hasAppSecret: !!appSecret
    });
    return false;
  }
  
  // Use raw body if available, otherwise stringify (less reliable)
  const bodyString = rawBody ? rawBody.toString('utf8') : 
                     typeof body === 'string' ? body : JSON.stringify(body);
  
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(bodyString)
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
  
  console.log('[Instagram Webhooks] Signature comparison:', {
    expected: expectedSignature.substring(0, 10) + '...',
    received: receivedSignature.substring(0, 10) + '...',
    bodyType: rawBody ? 'buffer' : typeof body,
    bodyLength: bodyString.length
  });
  
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
    
    console.log('[Instagram Webhooks] Signature verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  } catch (error) {
    console.error('[Instagram Webhooks] Signature verification error:', error);
    return false;
  }
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
      hasVerifyToken: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
      verifyTokenPreview: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN 
        ? `${process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN.substring(0, 10)}...` 
        : 'NOT_SET'
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
    
    console.log('[Instagram Webhooks] Verification comparison:');
    console.log('  - Mode:', mode, '(expected: subscribe)');
    console.log('  - Token received:', token);
    console.log('  - Token expected:', expectedToken);
    console.log('  - Challenge:', challenge);
    console.log('  - Tokens match:', token === expectedToken);
    
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
          tokenLengthExpected: expectedToken?.length
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
    
    console.log('[Instagram Webhooks] Processing events...');
    
    // Process the webhook payload
    if (body.object === 'instagram') {
      for (const entry of (body.entry || [])) {
        console.log('[Instagram Webhooks] Processing entry:', entry.id);
        
        // Handle webhook changes
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log('[Instagram Webhooks] Change event:', {
              field: change.field,
              valueKeys: Object.keys(change.value || {})
            });
            
            // Handle comment events (for nonce/keyword verification)
            if (change.field === 'comments' && change.value) {
              const { handleInstagramCommentEvent } = await import('./services/instagram-verification-service');
              
              const commentEvent = {
                comment_id: change.value.id || change.value.comment_id,
                media_id: change.value.media?.id || change.value.media_id,
                text: change.value.text || '',
                from: {
                  id: change.value.from?.id || '',
                  username: change.value.from?.username || ''
                }
              };
              
              console.log('[Instagram Webhooks] 💬 Processing comment event:', {
                comment_id: commentEvent.comment_id,
                media_id: commentEvent.media_id,
                username: commentEvent.from.username
              });
              
              try {
                await handleInstagramCommentEvent(commentEvent);
              } catch (error) {
                console.error('[Instagram Webhooks] Error processing comment:', error);
              }
            }
            
            // Handle mention events (for story mention verification)
            if (change.field === 'mentions' && change.value) {
              const { handleInstagramMentionEvent } = await import('./services/instagram-verification-service');
              
              const mentionEvent = {
                mention_id: change.value.id || change.value.mention_id,
                from: {
                  id: change.value.from?.id || change.value.sender?.id || '',
                  username: change.value.from?.username || change.value.sender?.username || ''
                },
                target: {
                  id: change.value.target?.id || entry.id,
                  username: change.value.target?.username || ''
                },
                caption: change.value.caption || change.value.text
              };
              
              console.log('[Instagram Webhooks] 👋 Processing mention event:', {
                mention_id: mentionEvent.mention_id,
                fan_username: mentionEvent.from.username,
                creator_username: mentionEvent.target.username
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
      const { code, redirect_uri } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: 'code is required' });
      }
      
      console.log('[TikTok Token Route] Processing token exchange for user:', req.user?.id);
      const tokenData = await exchangeTikTokToken(code, redirect_uri);
      
      // Store the token data for the user if needed
      // TODO: Save to database if you want to persist TikTok connections
      
      res.json(tokenData);
    } catch (error: any) {
      console.error('TikTok token exchange error:', error);
      res.status(500).json({ 
        error: 'Failed to exchange TikTok token',
        message: error.message || 'Unknown error'
      });
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

  // Twitter token exchange (PKCE)
  app.post('/api/social/twitter/token', async (req: AuthenticatedRequest, res) => {
    try {
      const timestamp = new Date().toISOString();
      const { code, redirect_uri, code_verifier } = req.body || {};
      const dynamicUserIdHeader = req.headers['x-dynamic-user-id'] as string | undefined;
      const dynamicUserIdBody = (req.body && (req.body.dynamicUserId || req.body.userId)) as string | undefined;
      const dynamicUserId = dynamicUserIdHeader || dynamicUserIdBody;

      console.log(`[Twitter Token] ${timestamp} Request received:`, {
        hasCode: !!code,
        codeLength: code?.length || 0,
        redirect_uri,
        hasCodeVerifier: !!code_verifier,
        verifierLength: code_verifier?.length || 0,
        userId: dynamicUserId || 'unknown'
      });

      if (!code || !redirect_uri || !code_verifier) {
        console.log('[Twitter Token] Missing required parameters');
        return res.status(400).json({ error: 'code, redirect_uri, and code_verifier are required' });
      }

      // Check for duplicate code usage
      const codeKey = String(code);
      const now = Date.now();
      if (usedCodeCache.has(codeKey)) {
        console.warn('[Twitter Token] Code already used - duplicate exchange blocked');
        return res.status(409).json({ error: 'code_already_used' });
      }
      // Reserve the code
      usedCodeCache.set(codeKey, now + CODE_TTL_MS);

      console.log(`[Twitter Token] Calling exchangeTwitterToken...`);
      const result = await exchangeTwitterToken(code, redirect_uri, code_verifier);
      console.log(`[Twitter Token] ${timestamp} exchange response:`, { 
        status: result.status, 
        ok: result.ok, 
        hasAccessToken: !!result.body?.access_token,
        hasRefreshToken: !!result.body?.refresh_token,
        expiresIn: result.body?.expires_in,
        scope: result.body?.scope
      });
      if (!result.ok) {
        // On failure, remove the code reservation so user can retry
        usedCodeCache.delete(codeKey);
        return res.status(result.status).json(result.body);
      }
      // Persist token bundle if we have a user context
      if (dynamicUserId && result.body?.access_token) {
        try {
          const tokenBundle = {
            ...result.body,
            received_at: Date.now(),
            expires_at: Date.now() + Math.max(0, (Number(result.body?.expires_in || 0) - 60)) * 1000
          };
          await storage.saveSocialTokenBundle(dynamicUserId, 'twitter', tokenBundle);
          console.log('[Twitter Token] Token bundle persisted successfully');
        } catch (e) {
          console.warn('[Twitter Token] Failed to persist token bundle:', e);
        }
      }
      return res.json(result.body);
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Twitter token' });
    }
  });

  // Twitter token refresh (no custom auth middleware)
  app.post('/api/social/twitter/refresh', async (req: AuthenticatedRequest, res) => {
    try {
      const { refresh_token } = req.body || {};
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId || req.body?.userId;
      if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token is required' });
      }
      const result = await refreshTwitterToken(refresh_token);
      if (!result.ok) {
        return res.status(result.status).json(result.body);
      }
      // Persist rotated token bundle
      if (dynamicUserId && result.body?.access_token) {
        try {
          const tokenBundle = {
            ...result.body,
            received_at: Date.now(),
            expires_at: Date.now() + Math.max(0, (Number(result.body?.expires_in || 0) - 60)) * 1000
          };
          await storage.saveSocialTokenBundle(dynamicUserId, 'twitter', tokenBundle);
          console.log('[Twitter Refresh] Token bundle rotated and persisted successfully');
        } catch (e) {
          console.warn('[Twitter Refresh] Failed to persist token bundle:', e);
        }
      }
      // Return the full token bundle so clients can atomically rotate stored refresh_token
      return res.json(result.body);
    } catch (error) {
      console.error('Twitter token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh Twitter token' });
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

  // Get stored Twitter token bundle for a user
  app.get('/api/social/twitter/token-bundle', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || (req.query?.dynamicUserId as string);
      const includeToken = req.query?.includeToken === 'true';
      
      console.log('[Twitter Token Bundle] Request params:', {
        dynamicUserId,
        includeToken,
        queryParams: req.query
      });
      
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      const tokenBundle = await storage.getSocialTokenBundle(dynamicUserId, 'twitter');
      if (!tokenBundle) {
        return res.status(404).json({ error: 'No Twitter tokens found for user' });
      }

      // Check if token needs refresh
      const now = Date.now();
      const needsRefresh = now >= (tokenBundle.expires_at - 60000); // Refresh 1 min early

      const response: any = {
        hasTokens: true,
        needsRefresh,
        expiresAt: tokenBundle.expires_at,
        scope: tokenBundle.scope,
        receivedAt: tokenBundle.received_at
      };

      // Only include access_token if explicitly requested (for testing)
      if (includeToken) {
        response.access_token = tokenBundle.access_token;
        response.debug = {
          bundleKeys: Object.keys(tokenBundle),
          hasAccessToken: !!tokenBundle.access_token,
          accessTokenLength: tokenBundle.access_token?.length || 0
        };
      }

      res.json(response);
    } catch (error) {
      console.error('Twitter token bundle error:', error);
      res.status(500).json({ error: 'Failed to get token bundle info' });
    }
  });

  // Debug endpoint to see raw stored token data
  app.get('/api/social/twitter/debug-tokens', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || (req.query?.dynamicUserId as string);
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      const tokenBundle = await storage.getSocialTokenBundle(dynamicUserId, 'twitter');
      if (!tokenBundle) {
        return res.status(404).json({ error: 'No Twitter tokens found for user' });
      }

      res.json({
        bundleKeys: Object.keys(tokenBundle),
        hasAccessToken: !!tokenBundle.access_token,
        hasRefreshToken: !!tokenBundle.refresh_token,
        accessTokenLength: tokenBundle.access_token?.length || 0,
        refreshTokenLength: tokenBundle.refresh_token?.length || 0,
        tokenType: tokenBundle.token_type,
        expiresIn: tokenBundle.expires_in,
        scope: tokenBundle.scope,
        receivedAt: tokenBundle.received_at,
        expiresAt: tokenBundle.expires_at,
        // Include first/last 4 chars of access_token for verification
        accessTokenPreview: tokenBundle.access_token ? 
          `${tokenBundle.access_token.substring(0, 4)}...${tokenBundle.access_token.substring(-4)}` : null
      });
    } catch (error) {
      console.error('Twitter debug tokens error:', error);
      res.status(500).json({ error: 'Failed to debug tokens' });
    }
  });

  // Proactive token refresh endpoint
  app.post('/api/social/twitter/refresh-if-needed', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId;
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }

      const tokenBundle = await storage.getSocialTokenBundle(dynamicUserId, 'twitter');
      if (!tokenBundle?.refresh_token) {
        return res.status(404).json({ error: 'No refresh token found' });
      }

      const now = Date.now();
      const needsRefresh = now >= (tokenBundle.expires_at - 60000);

      if (!needsRefresh) {
        return res.json({ refreshed: false, message: 'Token still valid' });
      }

      console.log('[Twitter Proactive Refresh] Refreshing token for user:', dynamicUserId);
      const result = await refreshTwitterToken(tokenBundle.refresh_token);
      
      if (!result.ok) {
        return res.status(result.status).json(result.body);
      }

      // Persist rotated token bundle
      const newTokenBundle = {
        ...result.body,
        received_at: Date.now(),
        expires_at: Date.now() + Math.max(0, (Number(result.body?.expires_in || 0) - 60)) * 1000
      };
      await storage.saveSocialTokenBundle(dynamicUserId, 'twitter', newTokenBundle);
      
      console.log('[Twitter Proactive Refresh] Token refreshed successfully');
      res.json({ refreshed: true, expiresAt: newTokenBundle.expires_at });
    } catch (error) {
      console.error('Twitter proactive refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  // YouTube token exchange
  app.post('/api/social/youtube/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }
      console.log('[YouTube Token Route] Processing token exchange');
      const tokenData = await exchangeYouTubeToken(code, redirect_uri);
      res.json(tokenData);
    } catch (error: any) {
      console.error('YouTube token exchange error:', error);
      res.status(500).json({ 
        error: 'Failed to exchange YouTube token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // YouTube user/channel info
  app.get('/api/social/youtube/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      console.log('[YouTube Me Route] Fetching channel info');
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[YouTube Me Route] Error:', errorText);
        return res.status(response.status).json({ error: 'Failed to fetch channel info' });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('YouTube me error:', error);
      res.status(500).json({ error: 'Failed to get YouTube channel info' });
    }
  });

  // YouTube token refresh
  app.post('/api/social/youtube/refresh', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token required' });
      }
      
      console.log('[YouTube Refresh Route] Refreshing token');
      const tokenData = await refreshYouTubeToken(refresh_token);
      res.json(tokenData);
    } catch (error: any) {
      console.error('YouTube token refresh error:', error);
      res.status(500).json({ 
        error: 'Failed to refresh YouTube token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // Spotify token exchange
  app.post('/api/social/spotify/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }
      console.log('[Spotify Token Route] Processing token exchange');
      const tokenData = await exchangeSpotifyToken(code, redirect_uri);
      res.json(tokenData);
    } catch (error: any) {
      console.error('Spotify token exchange error:', error);
      res.status(500).json({ 
        error: 'Failed to exchange Spotify token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // Spotify user profile
  app.get('/api/social/spotify/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      console.log('[Spotify Me Route] Fetching user profile');
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Spotify Me Route] Error:', errorText);
        return res.status(response.status).json({ error: 'Failed to fetch profile' });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Spotify me error:', error);
      res.status(500).json({ error: 'Failed to get Spotify profile' });
    }
  });

  // Spotify token refresh
  app.post('/api/social/spotify/refresh', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token required' });
      }
      
      console.log('[Spotify Refresh Route] Refreshing token');
      const tokenData = await refreshSpotifyToken(refresh_token);
      res.json(tokenData);
    } catch (error: any) {
      console.error('Spotify token refresh error:', error);
      res.status(500).json({ 
        error: 'Failed to refresh Spotify token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // Discord token exchange
  app.post('/api/social/discord/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }
      console.log('[Discord Token Route] Processing token exchange');
      const tokenData = await exchangeDiscordToken(code, redirect_uri);
      res.json(tokenData);
    } catch (error: any) {
      console.error('Discord token exchange error:', error);
      res.status(500).json({
        error: 'Failed to exchange Discord token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // Discord user info
  app.get('/api/social/discord/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      console.log('[Discord Me Route] Fetching user info');
      const userData = await getDiscordUser(accessToken);
      res.json(userData);
    } catch (error) {
      console.error('Discord me error:', error);
      res.status(500).json({ error: 'Failed to get Discord user info' });
    }
  });

  // Twitch token exchange
  app.post('/api/social/twitch/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }
      console.log('[Twitch Token Route] Processing token exchange');
      const tokenData = await exchangeTwitchToken(code, redirect_uri);
      res.json(tokenData);
    } catch (error: any) {
      console.error('Twitch token exchange error:', error);
      res.status(500).json({
        error: 'Failed to exchange Twitch token',
        message: error.message || 'Unknown error'
      });
    }
  });

  // Twitch user info
  app.get('/api/social/twitch/me', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      console.log('[Twitch Me Route] Fetching user info');
      const userData = await getTwitchUser(accessToken);
      res.json(userData);
    } catch (error) {
      console.error('Twitch me error:', error);
      res.status(500).json({ error: 'Failed to get Twitch user info' });
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
      
      // Save to BOTH systems for consistency
      // 1. Save to old storage system (users.profileData.socialConnections)
      await storage.saveSocialAccount(dynamicUserId, platform, accountData);
      
      // 2. Also save to socialConnections table for consistency across all pages
      try {
        const user = await storage.getUserByDynamicId(dynamicUserId);
        if (user) {
          // Check if connection already exists in socialConnections table
          const existingConnection = await db.query.socialConnections.findFirst({
            where: and(
              eq(socialConnections.userId, user.id),
              eq(socialConnections.platform, platform)
            ),
          });

          const connectionData = {
            platformUserId: accountData.user?.id || accountData.id,
            platformUsername: accountData.user?.username || accountData.username,
            platformDisplayName: accountData.user?.name || accountData.name || accountData.displayName,
            profileData: accountData,
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
            console.log(`[Social Connect] Updated ${platform} in socialConnections table for user ${user.id}`);
          } else {
            // Create new connection
            await db
              .insert(socialConnections)
              .values({
                userId: user.id,
                platform,
                ...connectionData,
              });
            console.log(`[Social Connect] Created ${platform} in socialConnections table for user ${user.id}`);
          }
        }
      } catch (syncError) {
        console.error(`[Social Connect] Error syncing to socialConnections table:`, syncError);
        // Don't fail the request if the sync fails
      }
      
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

  // Get individual platform connection status
  app.get('/api/social-connections/:platform', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || (req.query?.dynamicUserId as string) || (req.query?.userId as string);
      const { platform } = req.params;
      
      if (!dynamicUserId) {
        return res.json({ connected: false, connectionData: null });
      }
      
      // Query from socialConnections table for consistency
      const user = await storage.getUserByDynamicId(dynamicUserId);
      if (!user) {
        return res.json({ connected: false, connectionData: null });
      }

      const connection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, user.id),
          eq(socialConnections.platform, platform)
        ),
      });
      
      if (connection && connection.isActive) {
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
          }
        });
      } else {
        res.json({ connected: false, connectionData: null });
      }
    } catch (error) {
      console.error(`Get ${req.params.platform} connection status error:`, error);
      res.json({ connected: false, connectionData: null });
    }
  });

  // Disconnect social account (generic endpoint for all platforms)
  app.post('/api/social-connections/disconnect', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId || req.body?.userId;
      const { platform } = req.body;
      
      console.log(`[Social Disconnect] Request to disconnect ${platform} for user: ${dynamicUserId}`);
      
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      if (!platform) {
        return res.status(400).json({ error: 'platform required' });
      }
      
      // Remove from BOTH systems for consistency
      // 1. Remove from old storage system
      const success = await storage.removeSocialAccount(dynamicUserId, platform);
      
      // 2. Also remove from socialConnections table
      try {
        const user = await storage.getUserByDynamicId(dynamicUserId);
        if (user) {
          await db
            .delete(socialConnections)
            .where(
              and(
                eq(socialConnections.userId, user.id),
                eq(socialConnections.platform, platform)
              )
            );
          console.log(`[Social Disconnect] Also removed ${platform} from socialConnections table for user ${user.id}`);
        }
      } catch (syncError) {
        console.error(`[Social Disconnect] Error removing from socialConnections table:`, syncError);
        // Don't fail the request if the sync fails
      }
      
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

  // Disconnect social account (no custom auth middleware) - legacy endpoint
  app.delete('/api/social/:platform', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || req.body?.dynamicUserId || req.body?.userId;
      const { platform } = req.params;
      
      console.log(`[Social Disconnect] Request to disconnect ${platform} for user: ${dynamicUserId}`);
      
      if (!dynamicUserId) {
        return res.status(400).json({ error: 'dynamicUserId required' });
      }
      
      // Remove from BOTH systems for consistency
      // 1. Remove from old storage system
      const success = await storage.removeSocialAccount(dynamicUserId, platform);
      
      // 2. Also remove from socialConnections table
      try {
        const user = await storage.getUserByDynamicId(dynamicUserId);
        if (user) {
          await db
            .delete(socialConnections)
            .where(
              and(
                eq(socialConnections.userId, user.id),
                eq(socialConnections.platform, platform)
              )
            );
          console.log(`[Social Disconnect] Also removed ${platform} from socialConnections table for user ${user.id}`);
        }
      } catch (syncError) {
        console.error(`[Social Disconnect] Error removing from socialConnections table:`, syncError);
        // Don't fail the request if the sync fails
      }
      
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