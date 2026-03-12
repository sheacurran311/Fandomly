/**
 * Kick OAuth Routes
 *
 * Handles OAuth flow for Kick streaming platform (OAuth 2.1 with PKCE).
 *
 * Endpoint auth rules (see .cursor/rules/social-auth-single-source.mdc):
 * - /api/social/kick/token  — NO authenticateUser (runs in popup without session cookies)
 * - /api/social/kick/me     — NO authenticateUser (uses platform token from Authorization header)
 * - /api/social/connections/kick (GET/DELETE) — authenticateUser required (dashboard, session present)
 */

import { Express, Request, Response } from 'express';
import { db } from '../../db';
import { socialConnections } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';

// Kick OAuth configuration - uses id.kick.com for OAuth 2.1 with PKCE
const KICK_CONFIG = {
  clientId: process.env.KICK_CLIENT_ID || '',
  clientSecret: process.env.KICK_CLIENT_SECRET || '',
  authUrl: 'https://id.kick.com/oauth/authorize',
  tokenUrl: 'https://id.kick.com/oauth/token',
  apiBase: 'https://api.kick.com/public/v1',
};

interface KickTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KickUserResponse {
  user_id: number | string;
  name: string;
  email?: string;
  profile_picture?: string;
}

/**
 * Exchange authorization code for access token (OAuth 2.1 with PKCE)
 * redirect_uri is passed through from the client — Kick's auth server validates it.
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<KickTokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: KICK_CONFIG.clientId,
    client_secret: KICK_CONFIG.clientSecret,
    code,
    redirect_uri: redirectUri,
  };

  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const response = await fetch(KICK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Kick] Token exchange error:', error);
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Fetch user profile from Kick API using a platform access token.
 * Kick's public API v1 returns the authenticated user via GET /users (no /me endpoint).
 * Response: { data: [{ user_id, name, email, profile_picture }], message: "OK" }
 */
async function fetchKickProfile(accessToken: string): Promise<KickUserResponse> {
  const response = await fetch(`${KICK_CONFIG.apiBase}/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Kick] Profile fetch error:', error);
    throw new Error('Failed to fetch Kick profile');
  }

  const body = await response.json();
  // Kick returns { data: [ userObject ], message: "OK" }
  const user = Array.isArray(body?.data) ? body.data[0] : body;
  if (!user) {
    throw new Error('Kick API returned empty user data');
  }
  return user;
}

export function registerKickOAuthRoutes(app: Express) {
  /**
   * POST /api/social/kick/token
   * Exchange authorization code for access token (popup flow, no session cookies).
   * NO authenticateUser — popup windows don't have Fandomly session cookies.
   */
  app.post('/api/social/kick/token', async (req: Request, res: Response) => {
    try {
      if (!KICK_CONFIG.clientId || !KICK_CONFIG.clientSecret) {
        return res.status(503).json({ message: 'Kick OAuth is not configured' });
      }

      const { code, code_verifier, redirect_uri } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }
      if (!redirect_uri) {
        return res.status(400).json({ message: 'redirect_uri required' });
      }

      console.log('[Kick Token Exchange] Processing token exchange');
      const tokenData = await exchangeCodeForToken(code, redirect_uri, code_verifier);
      res.json(tokenData);
    } catch (error) {
      console.error('[Kick] Token exchange error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Token exchange failed' });
    }
  });

  /**
   * GET /api/social/kick/me
   * Fetch Kick user profile using the platform OAuth token from the Authorization header.
   * NO authenticateUser — uses platform token, not Fandomly JWT.
   * Called from popup window after token exchange.
   */
  app.get('/api/social/kick/me', async (req: Request, res: Response) => {
    try {
      const socialTokenHeader = req.headers['x-social-token'] as string | undefined;
      const authHeader = req.headers.authorization;
      const accessToken = (socialTokenHeader || authHeader)?.replace('Bearer ', '');

      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }

      console.log('[Kick Me Route] Fetching user profile');
      const profile = await fetchKickProfile(accessToken);
      res.json(profile);
    } catch (error) {
      console.error('[Kick] Profile fetch error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch profile' });
    }
  });

  /**
   * GET /api/social/connections/kick
   * Get current Kick connection status for the authenticated user (dashboard).
   */
  app.get(
    '/api/social/connections/kick',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const connection = await db.query.socialConnections.findFirst({
          where: and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'kick')),
        });

        if (!connection) {
          return res.json({ isActive: false, platformUserId: null, platformUsername: null, profileData: null });
        }

        res.json({
          isActive: connection.isActive,
          platformUserId: connection.platformUserId,
          platformUsername: connection.platformUsername,
          profileData: connection.profileData,
        });
      } catch (error) {
        console.error('[Kick] Get connection error:', error);
        res.status(500).json({ message: 'Failed to get connection status' });
      }
    }
  );

  /**
   * DELETE /api/social/connections/kick
   * Disconnect Kick account for the authenticated user (dashboard).
   */
  app.delete(
    '/api/social/connections/kick',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        await db
          .update(socialConnections)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'kick')));

        res.json({ success: true });
      } catch (error) {
        console.error('[Kick] Disconnect error:', error);
        res.status(500).json({ message: 'Failed to disconnect account' });
      }
    }
  );
}
