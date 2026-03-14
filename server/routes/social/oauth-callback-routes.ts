/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import type { Express, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';
import {
  usedCodeCache,
  CODE_TTL_MS,
  exchangeInstagramToken,
  exchangeTikTokToken,
  exchangeTwitterToken,
  exchangeYouTubeToken,
  refreshYouTubeToken,
  exchangeSpotifyToken,
  refreshSpotifyToken,
  exchangeDiscordToken,
  getDiscordUser,
  exchangeTwitchToken,
  getTwitchUser,
  getTikTokUser,
  getTwitterUser,
  refreshTwitterToken,
} from './oauth-helpers';

export function registerOAuthCallbackRoutes(app: Express) {
  // Instagram Business Login token exchange (no auth required - OAuth code is the auth, popup windows don't share session)
  app.post('/api/social/instagram/token', async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri, user_type = 'creator' } = req.body;

      console.log('[Instagram API] Token exchange request:', {
        user_type,
        redirect_uri,
        code_length: code?.length,
        has_code: !!code,
      });

      if (!code || !redirect_uri) {
        console.error('[Instagram API] Missing required parameters:', {
          code: !!code,
          redirect_uri: !!redirect_uri,
        });
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }

      console.log('[Instagram API] Calling exchangeInstagramToken...');
      const tokenData = await exchangeInstagramToken(code, redirect_uri, user_type);
      console.log('[Instagram API] Token exchange response:', {
        has_data: !!tokenData.data,
        data_length: tokenData.data?.length,
        has_access_token: !!(tokenData.data?.[0]?.access_token || tokenData.access_token),
      });

      // The response from Instagram Business Login includes data array
      if (tokenData.data && tokenData.data.length > 0) {
        const tokenInfo = tokenData.data[0];
        const response = {
          access_token: tokenInfo.access_token,
          user_id: tokenInfo.user_id,
          permissions: tokenInfo.permissions,
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
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Instagram messaging (for creators via Facebook Page token)
  app.post(
    '/api/social/instagram/send-message',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
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
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: JSON.stringify({ text }),
            recipient: JSON.stringify({ id: recipient_id }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(
            `Instagram API error: ${errorData.error?.message || response.statusText}`
          );
        }

        const result = await response.json();
        res.json({ success: true, message_id: result.message_id });
      } catch (error) {
        console.error('Instagram send message error:', error);
        res.status(500).json({
          error: 'Failed to send Instagram message',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get Instagram Business Account info
  app.get(
    '/api/social/instagram/business-account',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        if (!accessToken) {
          return res.status(401).json({ error: 'Access token required' });
        }

        // Get Instagram Business Account from Facebook Page
        const response = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count,website,biography}&access_token=${accessToken}`
        );

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
            name: pageWithInstagram.name,
          },
          instagram_account: pageWithInstagram.instagram_business_account,
        });
      } catch (error) {
        console.error('Instagram business account error:', error);
        res.status(500).json({ error: 'Failed to get Instagram Business Account' });
      }
    }
  );

  // TikTok token exchange (no auth required - OAuth code is the auth, popup windows don't share session)
  app.post('/api/social/tiktok/token', async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: 'code is required' });
      }

      console.log('[TikTok Token Route] Processing token exchange');
      const tokenData = await exchangeTikTokToken(code, redirect_uri);
      // Token bundle is saved via the callback page's POST to /api/social-connections
      res.json(tokenData);
    } catch (error: any) {
      console.error('TikTok token exchange error:', error);
      res.status(500).json({
        error: 'Failed to exchange TikTok token',
        message: error.message || 'Unknown error',
      });
    }
  });

  // TikTok user info — uses platform OAuth token, not Fandomly JWT.
  // Called from popup window during auth/connection flow that doesn't share session cookies.
  app.get('/api/social/tiktok/user', async (req: Request, res: Response) => {
    try {
      const socialTokenHeader = req.headers['x-social-token'] as string | undefined;
      const authHeader = req.headers.authorization;
      const accessToken = (socialTokenHeader || authHeader)?.replace('Bearer ', '');
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

  // Twitter token exchange (PKCE) - no auth required, runs in popup window
  app.post('/api/social/twitter/token', async (req: Request, res: Response) => {
    try {
      const timestamp = new Date().toISOString();
      const { code, redirect_uri, code_verifier } = req.body || {};

      console.log(`[Twitter Token] ${timestamp} Request received:`, {
        hasCode: !!code,
        codeLength: code?.length || 0,
        redirect_uri,
        hasCodeVerifier: !!code_verifier,
        verifierLength: code_verifier?.length || 0,
      });

      if (!code || !redirect_uri || !code_verifier) {
        console.log('[Twitter Token] Missing required parameters');
        return res
          .status(400)
          .json({ error: 'code, redirect_uri, and code_verifier are required' });
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
        scope: result.body?.scope,
      });
      if (!result.ok) {
        // On failure, remove the code reservation so user can retry
        usedCodeCache.delete(codeKey);
        return res.status(result.status).json(result.body);
      }
      // Token bundle is saved via the callback page's POST to /api/social-connections
      return res.json(result.body);
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      res.status(500).json({ error: 'Failed to exchange Twitter token' });
    }
  });

  // Twitter token refresh - no auth required, runs in popup window context
  app.post('/api/social/twitter/refresh', async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body || {};
      if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token is required' });
      }
      const result = await refreshTwitterToken(refresh_token);
      if (!result.ok) {
        return res.status(result.status).json(result.body);
      }
      // Token bundle persistence is handled via the callback page's POST to /api/social-connections
      // Return the full token bundle so clients can atomically rotate stored refresh_token
      return res.json(result.body);
    } catch (error) {
      console.error('Twitter token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh Twitter token' });
    }
  });

  // Twitter user info — uses platform OAuth token from Authorization header, not Fandomly JWT.
  // Called during login flow before user is authenticated in Fandomly.
  app.get('/api/social/twitter/user', async (req: Request, res: Response) => {
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
  app.get(
    '/api/social/twitter/token-bundle',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const includeToken = req.query?.includeToken === 'true';

        console.log('[Twitter Token Bundle] Request params:', {
          userId,
          includeToken,
          queryParams: req.query,
        });

        const tokenBundle = await storage.getSocialTokenBundle(userId, 'twitter');
        if (!tokenBundle) {
          return res.status(404).json({ error: 'No Twitter tokens found for user' });
        }

        // Check if token needs refresh
        const now = Date.now();
        const needsRefresh = now >= tokenBundle.expires_at - 60000; // Refresh 1 min early

        const response: any = {
          hasTokens: true,
          needsRefresh,
          expiresAt: tokenBundle.expires_at,
          scope: tokenBundle.scope,
          receivedAt: tokenBundle.received_at,
        };

        // Only include access_token if explicitly requested (for testing)
        if (includeToken) {
          response.access_token = tokenBundle.access_token;
          response.debug = {
            bundleKeys: Object.keys(tokenBundle),
            hasAccessToken: !!tokenBundle.access_token,
            accessTokenLength: tokenBundle.access_token?.length || 0,
          };
        }

        res.json(response);
      } catch (error) {
        console.error('Twitter token bundle error:', error);
        res.status(500).json({ error: 'Failed to get token bundle info' });
      }
    }
  );

  // Debug endpoint to see raw stored token data (dev-only)
  app.get(
    '/api/social/twitter/debug-tokens',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
      }
      try {
        const userId = req.user!.id;

        const tokenBundle = await storage.getSocialTokenBundle(userId, 'twitter');
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
          accessTokenPreview: tokenBundle.access_token
            ? `${tokenBundle.access_token.substring(0, 4)}...${tokenBundle.access_token.substring(-4)}`
            : null,
        });
      } catch (error) {
        console.error('Twitter debug tokens error:', error);
        res.status(500).json({ error: 'Failed to debug tokens' });
      }
    }
  );

  // Proactive token refresh endpoint
  app.post(
    '/api/social/twitter/refresh-if-needed',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        const tokenBundle = await storage.getSocialTokenBundle(userId, 'twitter');
        if (!tokenBundle?.refresh_token) {
          return res.status(404).json({ error: 'No refresh token found' });
        }

        const now = Date.now();
        const needsRefresh = now >= tokenBundle.expires_at - 60000;

        if (!needsRefresh) {
          return res.json({ refreshed: false, message: 'Token still valid' });
        }

        console.log('[Twitter Proactive Refresh] Refreshing token for user:', userId);
        const result = await refreshTwitterToken(tokenBundle.refresh_token);

        if (!result.ok) {
          return res.status(result.status).json(result.body);
        }

        // Persist rotated token bundle
        const newTokenBundle = {
          ...result.body,
          received_at: Date.now(),
          expires_at: Date.now() + Math.max(0, Number(result.body?.expires_in || 0) - 60) * 1000,
        };
        await storage.saveSocialTokenBundle(userId, 'twitter', newTokenBundle);

        console.log('[Twitter Proactive Refresh] Token refreshed successfully');
        res.json({ refreshed: true, expiresAt: newTokenBundle.expires_at });
      } catch (error) {
        console.error('Twitter proactive refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
      }
    }
  );

  // YouTube token exchange (no auth required - OAuth code is the auth, popup windows don't share session)
  app.post('/api/social/youtube/token', async (req: Request, res: Response) => {
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
        message: error.message || 'Unknown error',
      });
    }
  });

  // YouTube user/channel info (no auth required — runs in popup window that doesn't share session)
  app.get('/api/social/youtube/me', async (req: Request, res: Response) => {
    try {
      // Prefer X-Social-Token header (avoids JWT middleware noise), fall back to Authorization
      const socialTokenHeader = req.headers['x-social-token'] as string | undefined;
      const authHeader = req.headers.authorization;
      const accessToken = (socialTokenHeader || authHeader)?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      console.log('[YouTube Me Route] Fetching channel info');
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

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
  app.post(
    '/api/social/youtube/refresh',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
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
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  // Spotify token exchange (no auth required - OAuth code is the auth, popup windows don't share session)
  app.post('/api/social/spotify/token', async (req: Request, res: Response) => {
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
        message: error.message || 'Unknown error',
      });
    }
  });

  // Spotify user profile — uses platform OAuth token, not Fandomly JWT.
  // Called from popup window during auth/connection flow that doesn't share session cookies.
  app.get('/api/social/spotify/me', async (req: Request, res: Response) => {
    try {
      const socialTokenHeader = req.headers['x-social-token'] as string | undefined;
      const authHeader = req.headers.authorization;
      const accessToken = (socialTokenHeader || authHeader)?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      console.log('[Spotify Me Route] Fetching user profile');
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
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
  app.post(
    '/api/social/spotify/refresh',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
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
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  // Discord token exchange (no auth required - OAuth code is the auth, connection saving requires auth)
  app.post('/api/social/discord/token', async (req, res) => {
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
        message: error.message || 'Unknown error',
      });
    }
  });

  // Discord user info — uses platform OAuth token, not Fandomly JWT.
  app.get('/api/social/discord/me', async (req, res) => {
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

  // Twitch token exchange (no auth required - OAuth code is the auth, connection saving requires auth)
  app.post('/api/social/twitch/token', async (req, res) => {
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
        message: error.message || 'Unknown error',
      });
    }
  });

  // Twitch user info — uses platform OAuth token, not Fandomly JWT.
  app.get('/api/social/twitch/me', async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      console.log('[Twitch Me Route] Fetching user info');
      const userData = await getTwitchUser(accessToken);
      if (!userData) {
        return res.status(404).json({ error: 'No Twitch user found for this token' });
      }
      res.json(userData);
    } catch (error) {
      console.error('Twitch me error:', error);
      res.status(500).json({ error: 'Failed to get Twitch user info' });
    }
  });
}
