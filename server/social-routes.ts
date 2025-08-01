import type { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";

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