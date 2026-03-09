/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { Express, Request, Response } from 'express';
import { db } from '../../db';
import { users, socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isTokenExpiringSoon,
} from '../../services/auth/jwt-service';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { nanoid } from 'nanoid';
import { claimBetaWelcomePoints } from '../../services/beta-signup-service';

/**
 * Register general authentication routes
 */
export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/social/callback
   * Generic social login callback - handles all social providers for authentication
   */
  app.post('/api/auth/social/callback', async (req: Request, res: Response) => {
    try {
      const {
        provider,
        access_token,
        platform_user_id,
        email,
        username,
        display_name,
        profile_data,
      } = req.body;
      // NOTE: user_type is intentionally NOT destructured from the body.
      // All new users MUST be created with 'pending' type and choose their type
      // on the /user-type-selection page after authentication.

      if (!provider || !access_token || !platform_user_id) {
        console.error('[Social Auth] Missing required fields:', {
          hasProvider: !!provider,
          hasAccessToken: !!access_token,
          hasPlatformUserId: !!platform_user_id,
          provider: provider || '(missing)',
        });
        return res.status(400).json({
          error: 'provider, access_token, and platform_user_id are required',
          missing: {
            provider: !provider,
            access_token: !access_token,
            platform_user_id: !platform_user_id,
          },
        });
      }

      console.log('[Social Auth] Processing callback', {
        provider,
        platformUserId: platform_user_id,
        email,
      });

      // Look for existing user by social connection
      const existingConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.platform, provider),
          eq(socialConnections.platformUserId, platform_user_id)
        ),
      });

      let user;
      let isNewUser = false;

      if (existingConnection) {
        // Found existing connection, get the user
        user = await db.query.users.findFirst({
          where: eq(users.id, existingConnection.userId),
        });

        if (!user) {
          // Connection exists but user doesn't - shouldn't happen, but handle it
          await db.delete(socialConnections).where(eq(socialConnections.id, existingConnection.id));
          return res.status(400).json({ error: 'Invalid connection state' });
        }

        // Update the connection tokens
        await db
          .update(socialConnections)
          .set({
            accessToken: access_token,
            profileData: profile_data || existingConnection.profileData,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          })
          .where(eq(socialConnections.id, existingConnection.id));
      } else {
        // No existing connection - check by email
        if (email) {
          user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (user) {
            // User exists with this email but from different provider
            // Return link required response
            const pendingLinkId = createPendingLinkId(user.id, platform_user_id, provider, email);

            return res.status(200).json({
              success: false,
              linkRequired: true,
              existingProviders: user.primaryAuthProvider
                ? [user.primaryAuthProvider]
                : ['unknown'],
              pendingLinkId,
              message:
                'An account with this email already exists. Please confirm to link accounts.',
            });
          }
        }

        // Create new user
        isNewUser = true;
        const generatedUsername = generateUsername(
          display_name || username || email?.split('@')[0] || 'user'
        );

        // ALL new users start as 'pending' — they MUST choose their type after auth
        const [newUser] = await db
          .insert(users)
          .values({
            email: email || null,
            username: generatedUsername,
            primaryAuthProvider: provider,
            userType: 'pending',
            role: 'customer_end_user',
            profileData: {
              name: display_name,
              ...profile_data,
            },
            onboardingState: {
              currentStep: 0,
              totalSteps: 5,
              completedSteps: [],
              isCompleted: false,
            },
          } as any)
          .returning();

        user = newUser;

        // Create social connection
        await db.insert(socialConnections).values({
          userId: user.id,
          platform: provider,
          platformUserId: platform_user_id,
          platformUsername: username,
          platformDisplayName: display_name,
          accessToken: access_token,
          profileData: profile_data,
          connectedAt: new Date(),
          isActive: true,
        } as any);

        console.log('[Social Auth] Created new user:', user.id);
      }

      if (!user) {
        return res.status(500).json({ error: 'Failed to create or find user' });
      }

      // Auto-promote platform founders to fandomly_admin on login.
      // This ensures admin access even if the database was recreated.
      const FOUNDER_EMAILS = ['sheacurran10@gmail.com'];
      if (
        user.email &&
        FOUNDER_EMAILS.includes(user.email.toLowerCase()) &&
        user.role !== 'fandomly_admin'
      ) {
        await db
          .update(users)
          .set({ role: 'fandomly_admin', updatedAt: new Date() })
          .where(eq(users.id, user.id));
        user = { ...user, role: 'fandomly_admin' };
        console.log(`[Auth] Auto-promoted founder ${user.email} to fandomly_admin`);
      }

      // If this is a new user, check for beta welcome points
      let betaPointsClaimed = false;
      let betaPointsAmount = 0;
      if (isNewUser && user.email) {
        const result = await claimBetaWelcomePoints(user.id, user.email);
        betaPointsClaimed = result.claimed;
        betaPointsAmount = result.points;
      }

      // Generate tokens
      const accessToken = signAccessToken({
        id: user.id,
        email: user.email,
        provider,
      });
      const refreshToken = signRefreshToken({ id: user.id });

      // Set refresh token cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          role: user.role,
          profileData: user.profileData,
          onboardingState: user.onboardingState,
        },
        accessToken,
        isNewUser,
        betaWelcome: betaPointsClaimed
          ? {
              pointsAwarded: betaPointsAmount,
              message: `Welcome bonus: ${betaPointsAmount} Fandomly Points credited!`,
            }
          : undefined,
      });
    } catch (error: any) {
      console.error('[Social Auth] Callback error:', error);
      res.status(500).json({
        error: 'Social authentication failed',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/auth/social/link
   * Link a social account to an existing user account
   */
  app.post('/api/auth/social/link', async (req: Request, res: Response) => {
    try {
      const { pending_link_id, access_token, provider, platform_user_id, profile_data } = req.body;

      if (!pending_link_id) {
        return res.status(400).json({ error: 'pending_link_id is required' });
      }

      // Decode pending link
      const linkData = decodePendingLinkId(pending_link_id);
      if (!linkData) {
        return res.status(400).json({ error: 'Invalid or expired link request' });
      }

      // Verify the provider and platform user match
      if (linkData.provider !== provider || linkData.providerId !== platform_user_id) {
        return res.status(400).json({ error: 'Account mismatch' });
      }

      // Get the existing user
      const user = await db.query.users.findFirst({
        where: eq(users.id, linkData.existingUserId),
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add to linked accounts
      const linkedAccounts = user.linkedAccounts || { providers: [] };
      linkedAccounts.providers.push({
        provider,
        providerId: platform_user_id,
        email: linkData.email ?? undefined,
        linkedAt: new Date().toISOString(),
      });

      await db
        .update(users)
        .set({
          linkedAccounts,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Create or update social connection (upsert to handle existing connections)
      const existingConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.platform, provider),
          eq(socialConnections.platformUserId, platform_user_id)
        ),
      });

      if (existingConnection) {
        // Update existing connection to point to the linked user
        await db
          .update(socialConnections)
          .set({
            userId: user.id,
            accessToken: access_token,
            profileData: profile_data ?? existingConnection.profileData,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(socialConnections.id, existingConnection.id));
      } else {
        await db.insert(socialConnections).values({
          userId: user.id,
          platform: provider,
          platformUserId: platform_user_id,
          accessToken: access_token,
          profileData: profile_data ?? undefined,
          connectedAt: new Date(),
          isActive: true,
        } as any);
      }

      // Generate tokens
      const jwtAccessToken = signAccessToken({
        id: user.id,
        email: user.email,
        provider,
      });
      const refreshToken = signRefreshToken({ id: user.id });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          role: user.role,
          profileData: user.profileData,
          onboardingState: user.onboardingState,
        },
        accessToken: jwtAccessToken,
        message: 'Account linked successfully',
      });
    } catch (error: any) {
      console.error('[Social Auth] Link error:', error);
      res.status(500).json({
        error: 'Failed to link account',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/auth/session
   * Check if a session exists and return user info if so.
   * Returns 200 with { authenticated: false } when no session — avoids
   * noisy 401 errors in the browser console on initial page load.
   */
  app.get('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const refreshTokenValue = req.cookies?.refresh_token;

      if (!refreshTokenValue) {
        return res.json({ authenticated: false });
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshTokenValue);

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });

      if (!user) {
        // Token references a deleted user – clear the stale cookie
        res.clearCookie('refresh_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        return res.json({ authenticated: false });
      }

      // Generate fresh access token
      const newAccessToken = signAccessToken({
        id: user.id,
        email: user.email,
        provider: user.primaryAuthProvider || undefined,
      });

      // Rotate refresh token
      const newRefreshToken = signRefreshToken({ id: user.id });
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        authenticated: true,
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          role: user.role,
          profileData: user.profileData,
          onboardingState: user.onboardingState,
        },
      });
    } catch (error: any) {
      // Token expired or invalid – clear cookie and return unauthenticated
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.json({ authenticated: false });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new access token
      const newAccessToken = signAccessToken({
        id: user.id,
        email: user.email,
        provider: user.primaryAuthProvider || undefined,
      });

      // Optionally rotate refresh token
      const newRefreshToken = signRefreshToken({ id: user.id });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          role: user.role,
          profileData: user.profileData,
          onboardingState: user.onboardingState,
        },
      });
    } catch (error: any) {
      console.error('[Auth] Refresh error:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Clear refresh token and logout
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  });

  /**
   * GET /api/auth/me
   * Get current user from JWT
   */
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const token = authHeader.replace('Bearer ', '');
      const payload = verifyAccessToken(token);

      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check if token is expiring soon
      const tokenExpiringSoon = isTokenExpiringSoon(token);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          role: user.role,
          profileData: user.profileData,
          onboardingState: user.onboardingState,
          avatar: user.avatar,
        },
        tokenExpiringSoon,
      });
    } catch (error: any) {
      console.error('[Auth] Get user error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/auth/linked-accounts
   * Get all linked accounts for the current user
   */
  app.get(
    '/api/auth/linked-accounts',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, req.user.id),
        });

        const connections = await db.query.socialConnections.findMany({
          where: eq(socialConnections.userId, req.user.id),
        });

        res.json({
          primaryProvider: user?.primaryAuthProvider,
          linkedAccounts: user?.linkedAccounts?.providers || [],
          socialConnections: connections.map((c) => ({
            platform: c.platform,
            platformUsername: c.platformUsername,
            platformDisplayName: c.platformDisplayName,
            isActive: c.isActive,
            connectedAt: c.connectedAt,
          })),
        });
      } catch (error: any) {
        console.error('[Auth] Get linked accounts error:', error);
        res.status(500).json({
          error: 'Failed to get linked accounts',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/auth/initiate-link
   * Start the process of linking a new account (from settings)
   */
  app.post(
    '/api/auth/initiate-link',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { provider } = req.body;

        if (!provider) {
          return res.status(400).json({ error: 'provider is required' });
        }

        // Check if already linked
        const existingConnection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, req.user.id),
            eq(socialConnections.platform, provider)
          ),
        });

        if (existingConnection) {
          return res.status(400).json({ error: 'Provider already linked' });
        }

        // Create a link token that includes user ID
        const linkToken = Buffer.from(
          JSON.stringify({
            userId: req.user.id,
            provider,
            initiatedAt: Date.now(),
            expiresAt: Date.now() + 10 * 60 * 1000,
          })
        ).toString('base64url');

        res.json({
          success: true,
          linkToken,
          message: 'Proceed with OAuth flow and include linkToken in callback',
        });
      } catch (error: any) {
        console.error('[Auth] Initiate link error:', error);
        res.status(500).json({
          error: 'Failed to initiate account linking',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/auth/complete-link
   * Complete account linking from settings
   */
  app.post('/api/auth/complete-link', async (req: Request, res: Response) => {
    try {
      const { link_token, access_token, platform_user_id, username, display_name, profile_data } =
        req.body;

      if (!link_token || !access_token || !platform_user_id) {
        return res
          .status(400)
          .json({ error: 'link_token, access_token, and platform_user_id are required' });
      }

      // Decode link token
      let linkData: any;
      try {
        linkData = JSON.parse(Buffer.from(link_token, 'base64url').toString());
      } catch {
        return res.status(400).json({ error: 'Invalid link token' });
      }

      if (linkData.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'Link token expired' });
      }

      // Check if this social account is already connected to another user
      const existingConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.platform, linkData.provider),
          eq(socialConnections.platformUserId, platform_user_id)
        ),
      });

      if (existingConnection && existingConnection.userId !== linkData.userId) {
        return res.status(400).json({
          error: 'This social account is already connected to another user',
        });
      }

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, linkData.userId),
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create or update social connection
      if (existingConnection) {
        await db
          .update(socialConnections)
          .set({
            accessToken: access_token,
            platformUsername: username,
            platformDisplayName: display_name,
            profileData: profile_data,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          })
          .where(eq(socialConnections.id, existingConnection.id));
      } else {
        await db.insert(socialConnections).values({
          userId: user.id,
          platform: linkData.provider,
          platformUserId: platform_user_id,
          platformUsername: username,
          platformDisplayName: display_name,
          accessToken: access_token,
          profileData: profile_data,
          connectedAt: new Date(),
          isActive: true,
        } as any);

        // Update linked accounts
        const linkedAccounts = user.linkedAccounts || { providers: [] };
        linkedAccounts.providers.push({
          provider: linkData.provider,
          providerId: platform_user_id,
          linkedAt: new Date().toISOString(),
        });

        await db
          .update(users)
          .set({ linkedAccounts, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      res.json({
        success: true,
        message: `${linkData.provider} account linked successfully`,
      });
    } catch (error: any) {
      console.error('[Auth] Complete link error:', error);
      res.status(500).json({
        error: 'Failed to complete account linking',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/auth/update-wallet
   * Save the Particle embedded wallet address after the ParticleAuthListener
   * creates it via connectAsync(). Only sets the address if it's not already set.
   */
  app.post(
    '/api/auth/update-wallet',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { walletAddress } = req.body;
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'walletAddress is required' });
        }

        // Basic hex address validation
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Only update if not already set (prevents overwriting a working address)
        if (!user.avalancheL1Address) {
          await db
            .update(users)
            .set({
              avalancheL1Address: walletAddress,
              blockchainEnabled: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
          console.log(`[Auth] Saved wallet address ${walletAddress} for user ${userId}`);
          return res.json({ success: true, walletAddress, updated: true });
        }

        return res.json({ success: true, walletAddress: user.avalancheL1Address, updated: false });
      } catch (error: any) {
        console.error('[Auth] Update wallet error:', error);
        res.status(500).json({ error: 'Failed to update wallet address' });
      }
    }
  );
}

// Helper functions

function generateUsername(base: string): string {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = nanoid(6).toLowerCase();
  return `${cleaned}_${suffix}`;
}

function createPendingLinkId(
  existingUserId: string,
  providerId: string,
  provider: string,
  email: string | null
): string {
  const linkId = nanoid();
  const data = Buffer.from(
    JSON.stringify({
      existingUserId,
      providerId,
      provider,
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
  ).toString('base64url');
  // Use '.' as delimiter — safe because nanoid and base64url never contain '.'
  return `${linkId}.${data}`;
}

function decodePendingLinkId(pendingLinkId: string): {
  existingUserId: string;
  providerId: string;
  provider: string;
  email: string | null;
} | null {
  try {
    // Split on first '.' only (supports both new '.' and legacy '_' delimiter)
    let delimiterIdx = pendingLinkId.indexOf('.');
    if (delimiterIdx === -1) {
      // Legacy format: try last '_' since nanoid can contain '_'
      delimiterIdx = pendingLinkId.lastIndexOf('_');
    }
    if (delimiterIdx === -1) return null;

    const data = pendingLinkId.substring(delimiterIdx + 1);
    if (!data) return null;

    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (decoded.expiresAt < Date.now()) return null;

    return decoded;
  } catch {
    return null;
  }
}
