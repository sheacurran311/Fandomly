import type { Express } from "express";
import express from "express";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";
import { URLSearchParams } from "url";

// Instagram Basic Display API token exchange
async function exchangeInstagramToken(code: string, redirectUri: string) {
  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code
    })
  });
  
  return response.json();
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
    })
  });
  
  return response.json();
}

// Twitter API v2 token exchange
async function exchangeTwitterToken(code: string) {
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID!,
      redirect_uri: `${process.env.BASE_URL}/auth/twitter/callback`,
      code_verifier: 'challenge'
    })
  });
  
  return response.json();
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
    })
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
    })
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
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics,profile_image_url,verified', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  return response.json();
}

export function registerSocialRoutes(app: Express) {
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
        if (updatedProfileData?.socialConnections?.facebook) {
          delete updatedProfileData.socialConnections.facebook;
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

  // Instagram token exchange
  app.post('/api/social/instagram/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, redirect_uri } = req.body;
      const tokenData = await exchangeInstagramToken(code, redirect_uri);
      res.json(tokenData);
    } catch (error) {
      console.error('Instagram token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Instagram token' });
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

  // Twitter token exchange
  app.post('/api/social/twitter/token', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const tokenData = await exchangeTwitterToken(code);
      res.json(tokenData);
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Twitter token' });
    }
  });

  // Twitter user info
  app.get('/api/social/twitter/user', authenticateUser, async (req: AuthenticatedRequest, res) => {
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

  // Save connected social account
  app.post('/api/social/connect', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.dynamicUserId;
      const { platform, accountData } = req.body;
      
      // TODO: Save to database
      // await storage.saveSocialAccount(userId, platform, accountData);
      
      res.json({ success: true, message: `${platform} account connected successfully` });
    } catch (error) {
      console.error('Social connect error:', error);
      res.status(500).json({ error: 'Failed to connect social account' });
    }
  });

  // Get user's connected social accounts
  app.get('/api/social/accounts', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.dynamicUserId;
      
      // TODO: Get from database
      // const accounts = await storage.getSocialAccounts(userId);
      const accounts = []; // Placeholder
      
      res.json(accounts);
    } catch (error) {
      console.error('Get social accounts error:', error);
      res.status(500).json({ error: 'Failed to get social accounts' });
    }
  });

  // Disconnect social account
  app.delete('/api/social/:platform', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.dynamicUserId;
      const { platform } = req.params;
      
      // TODO: Remove from database
      // await storage.removeSocialAccount(userId, platform);
      
      res.json({ success: true, message: `${platform} account disconnected` });
    } catch (error) {
      console.error('Social disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect social account' });
    }
  });
}