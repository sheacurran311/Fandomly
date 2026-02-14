/**
 * Kick OAuth Routes
 * 
 * Handles OAuth flow for Kick streaming platform.
 * Note: Kick's OAuth API may have limited availability.
 */

import { Express, Request, Response } from "express";
import { db } from "../../db";
import { socialConnections, users } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from "../../middleware/rbac";

// Kick OAuth configuration
const KICK_CONFIG = {
  clientId: process.env.KICK_CLIENT_ID || '',
  clientSecret: process.env.KICK_CLIENT_SECRET || '',
  redirectUri: process.env.KICK_REDIRECT_URI || '',
  authUrl: 'https://kick.com/oauth/authorize', // Placeholder
  tokenUrl: 'https://kick.com/oauth/token', // Placeholder
  apiBase: 'https://kick.com/api/v1', // Placeholder
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
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string): Promise<KickTokenResponse> {
  const response = await fetch(KICK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KICK_CONFIG.clientId,
      client_secret: KICK_CONFIG.clientSecret,
      code,
      redirect_uri: KICK_CONFIG.redirectUri,
    }),
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
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Kick] Profile fetch error:', error);
    throw new Error('Failed to fetch Kick profile');
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<KickTokenResponse> {
  const response = await fetch(KICK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KICK_CONFIG.clientId,
      client_secret: KICK_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

export function registerKickOAuthRoutes(app: Express) {
  /**
   * Handle OAuth callback from Kick
   */
  app.post(
    "/api/social/kick/callback",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { code } = req.body;
        if (!code) {
          return res.status(400).json({ message: "Authorization code required" });
        }

        // Check if Kick OAuth is configured
        if (!KICK_CONFIG.clientId || !KICK_CONFIG.clientSecret) {
          return res.status(503).json({ 
            message: "Kick OAuth is not yet available" 
          });
        }

        // Exchange code for tokens
        const tokenData = await exchangeCodeForToken(code);

        // Fetch user profile
        const profile = await fetchKickProfile(tokenData.access_token);

        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Check for existing connection
        const existing = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'kick')
          ),
        });

        const connectionData = {
          platform: 'kick' as const,
          platformUserId: profile.id,
          platformUsername: profile.username,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
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
      } catch (error: any) {
        console.error('[Kick] OAuth callback error:', error);
        res.status(500).json({ 
          message: error.message || 'Failed to connect Kick account' 
        });
      }
    }
  );

  /**
   * Get Kick connection status
   */
  app.get(
    "/api/social/connections/kick",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'kick')
          ),
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
      } catch (error: any) {
        console.error('[Kick] Get connection error:', error);
        res.status(500).json({ message: 'Failed to get connection status' });
      }
    }
  );

  /**
   * Disconnect Kick account
   */
  app.delete(
    "/api/social/connections/kick",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        await db
          .update(socialConnections)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(socialConnections.userId, userId),
              eq(socialConnections.platform, 'kick')
            )
          );

        res.json({ success: true });
      } catch (error: any) {
        console.error('[Kick] Disconnect error:', error);
        res.status(500).json({ message: 'Failed to disconnect account' });
      }
    }
  );
}
