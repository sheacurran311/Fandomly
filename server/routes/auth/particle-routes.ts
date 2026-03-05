/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle Network Auth Routes
 *
 * Provides the server-side endpoint for bridging Particle Connect sessions
 * to Fandomly's JWT auth system.
 *
 * Flow:
 *   Client (Particle Connect login) → POST /api/auth/particle/callback
 *     → Validate Particle token → Find/create user → Issue Fandomly JWT
 *     → Return user + JWT (same format as existing social auth callbacks)
 */

import type { Express, Request, Response } from 'express';
import { handleParticleCallback } from '../../services/auth/particle-auth-service';
import { signRefreshToken } from '../../services/auth/jwt-service';
import { authRateLimiter } from '../../middleware/rate-limit';

export function registerParticleAuthRoutes(app: Express) {
  /**
   * POST /api/auth/particle/callback
   *
   * Called by the client after Particle Connect login.
   * Validates the Particle session and issues a Fandomly JWT.
   *
   * Body: {
   *   particleToken: string,   // Particle session token
   *   walletAddress: string,   // User's EVM wallet address on Fandomly Chain
   * }
   *
   * Response: Same shape as POST /api/auth/social/callback for consistency
   */
  app.post('/api/auth/particle/callback', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { particleToken, walletAddress, particleUuid, userEmail, userName, userAvatar } =
        req.body;

      if (!particleUuid) {
        return res.status(400).json({
          success: false,
          error: 'Missing particleUuid — required for token validation',
        });
      }

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing walletAddress',
        });
      }

      // Validate + bridge to Fandomly auth
      const result = await handleParticleCallback(
        particleToken,
        walletAddress,
        particleUuid,
        userEmail,
        userName,
        userAvatar
      );

      if (!result.success) {
        return res.status(401).json(result);
      }

      // Generate refresh token (stored in httpOnly cookie, same as existing auth)
      const refreshToken = signRefreshToken({ id: result.user!.id });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        isNewUser: result.isNewUser,
      });
    } catch (error: any) {
      console.error('[Particle Auth] Callback error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during Particle authentication',
      });
    }
  });

  /**
   * GET /api/auth/particle/status
   *
   * Check if Particle auth is enabled on this server.
   * Used by the client to determine which auth flow to show.
   */
  app.get('/api/auth/particle/status', (_req: Request, res: Response) => {
    const enabled = Boolean(process.env.PARTICLE_PROJECT_ID && process.env.PARTICLE_SERVER_KEY);

    return res.json({
      enabled,
      provider: enabled ? 'particle' : 'legacy',
    });
  });
}
