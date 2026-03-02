/**
 * Kick OAuth Routes
 *
 * Handles OAuth flow for Kick streaming platform.
 * Note: Kick's OAuth API may have limited availability.
 */

import { Express, Response } from 'express';
import { db } from '../../db';
import { socialConnections } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { encryptToken, safeDecryptToken } from '../../lib/token-encryption';

// Kick OAuth configuration - uses id.kick.com for OAuth 2.1 with PKCE
const KICK_CONFIG = {
  clientId: process.env.KICK_CLIENT_ID || '',
  clientSecret: process.env.KICK_CLIENT_SECRET || '',
  redirectUri: process.env.KICK_REDIRECT_URI || '',
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
  id: string;
  username: string;
  bio?: string;
  profile_pic?: string;
  follower_count?: number;
  verified?: boolean;
}

/**
 * Exchange authorization code for access token (OAuth 2.1 with PKCE)
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier?: string,
  redirectUri?: string
): Promise<KickTokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: KICK_CONFIG.clientId,
    client_secret: KICK_CONFIG.clientSecret,
    code,
    redirect_uri: redirectUri || KICK_CONFIG.redirectUri,
  };

  // PKCE: include code_verifier if provided (required by Kick OAuth 2.1)
  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const response = await fetch(KICK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Kick] Token exchange error:', error);
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Fetch user profile from Kick API
 */
async function fetchKickProfile(accessToken: string): Promise<KickUserResponse> {
  const response = await fetch(`${KICK_CONFIG.apiBase}/user/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Kick] Profile fetch error:', error);
    throw new Error('Failed to fetch Kick profile');
  }

  return response.json();
}

export function registerKickOAuthRoutes(app: Express) {
  // Allowed redirect URIs for validation (M13)
  const ALLOWED_KICK_REDIRECT_URIS = [
    KICK_CONFIG.redirectUri,
    // Allow any same-origin callback path
  ].filter(Boolean);

  /**
   * Validate redirect_uri against allowed list
   */
  function validateRedirectUri(uri: string | undefined, allowed: string[]): boolean {
    if (!uri) return true; // Will use default
    return allowed.some((a) => a === uri);
  }

  /**
   * Exchange authorization code for token (popup flow)
   */
  app.post(
    '/api/social/kick/token',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!KICK_CONFIG.clientId || !KICK_CONFIG.clientSecret) {
          return res.status(503).json({ message: 'Kick OAuth is not configured' });
        }

        const { code, code_verifier, redirect_uri } = req.body;
        if (!code) {
          return res.status(400).json({ message: 'Authorization code required' });
        }

        // Validate redirect_uri (M13)
        if (redirect_uri && !validateRedirectUri(redirect_uri, ALLOWED_KICK_REDIRECT_URIS)) {
          return res.status(400).json({ message: 'Invalid redirect_uri' });
        }

        const tokenData = await exchangeCodeForToken(code, code_verifier, redirect_uri);
        res.json(tokenData);
      } catch (error) {
        console.error('[Kick] Token exchange error:', error);
        res
          .status(500)
          .json({ message: error instanceof Error ? error.message : 'Token exchange failed' });
      }
    }
  );

  /**
   * Get authenticated user profile from Kick API
   * Uses stored access token from socialConnections instead of client-provided header
   */
  app.get(
    '/api/social/kick/me',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        // Use stored token from socialConnections instead of client-provided header
        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'kick'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection?.accessToken) {
          return res
            .status(404)
            .json({ message: 'Kick not connected. Please connect via OAuth first.' });
        }

        const profile = await fetchKickProfile(safeDecryptToken(connection.accessToken));
        res.json(profile);
      } catch (error) {
        console.error('[Kick] Profile fetch error:', error);
        res
          .status(500)
          .json({ message: error instanceof Error ? error.message : 'Failed to fetch profile' });
      }
    }
  );

  /**
   * Handle OAuth callback from Kick (legacy redirect flow)
   */
  app.post(
    '/api/social/kick/callback',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const { code, code_verifier, redirect_uri } = req.body;
        if (!code) {
          return res.status(400).json({ message: 'Authorization code required' });
        }

        // Check if Kick OAuth is configured
        if (!KICK_CONFIG.clientId || !KICK_CONFIG.clientSecret) {
          return res.status(503).json({
            message: 'Kick OAuth is not yet available',
          });
        }

        // Validate redirect_uri (M13)
        if (redirect_uri && !validateRedirectUri(redirect_uri, ALLOWED_KICK_REDIRECT_URIS)) {
          return res.status(400).json({ message: 'Invalid redirect_uri' });
        }

        // Exchange code for tokens (with PKCE code_verifier)
        const tokenData = await exchangeCodeForToken(code, code_verifier, redirect_uri);

        // Fetch user profile
        const profile = await fetchKickProfile(tokenData.access_token);

        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Check for existing connection
        const existing = await db.query.socialConnections.findFirst({
          where: and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'kick')),
        });

        const connectionData = {
          platform: 'kick' as const,
          platformUserId: profile.id,
          platformUsername: profile.username,
          accessToken: encryptToken(tokenData.access_token),
          refreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
          tokenExpiresAt: expiresAt,
          profileData: {
            bio: profile.bio,
            profilePicture: profile.profile_pic,
            followerCount: profile.follower_count,
            isVerified: profile.verified,
          },
          isActive: true,
          updatedAt: new Date(),
        };

        if (existing) {
          // Update existing connection
          await db
            .update(socialConnections)
            .set(connectionData)
            .where(eq(socialConnections.id, existing.id));
        } else {
          // Create new connection
          await db.insert(socialConnections).values({
            userId,
            ...connectionData,
          });
        }

        res.json({ success: true, username: profile.username });
      } catch (error) {
        console.error('[Kick] OAuth callback error:', error);
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Failed to connect Kick account',
        });
      }
    }
  );

  /**
   * Get Kick connection status
   */
  app.get(
    '/api/social/connections/kick',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const connection = await db.query.socialConnections.findFirst({
          where: and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'kick')),
        });

        if (!connection) {
          return res.json({
            isActive: false,
            platformUserId: null,
            platformUsername: null,
            profileData: null,
          });
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
   * Disconnect Kick account
   */
  app.delete(
    '/api/social/connections/kick',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

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
