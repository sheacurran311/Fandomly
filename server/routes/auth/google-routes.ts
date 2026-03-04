import type { Express, Request, Response } from "express";
import { 
  exchangeGoogleCode, 
  authenticateWithGoogle, 
  confirmAccountLink,
  getGoogleAuthUrl
} from '../../services/auth/google-auth';

/**
 * Register Google OAuth routes
 *
 * @deprecated These routes are legacy fallbacks from before Particle Network was integrated.
 * When VITE_PARTICLE_PROJECT_ID is set, Particle ConnectKit handles all authentication
 * (including Google via its native Google social auth connector). These routes remain
 * for two reasons:
 *   1. Fallback when Particle env vars are not configured
 *   2. Backward compatibility for users who originally authenticated via Google OAuth
 *      and may have existing sessions that go through this code path
 *
 * Do NOT remove these routes unless all users have been migrated to Particle auth
 * and there is no longer a need for a non-Particle fallback path.
 */
export function registerGoogleAuthRoutes(app: Express) {
  
  /**
   * GET /api/auth/google
   * Redirects to Google OAuth consent screen
   */
  app.get('/api/auth/google', (req: Request, res: Response) => {
    try {
      const redirectUri = req.query.redirect_uri as string || 
        `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      const state = req.query.state as string;
      
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('[Google Auth] Error generating auth URL:', error);
      res.status(500).json({ 
        error: 'Failed to initiate Google authentication',
        message: error.message 
      });
    }
  });

  /**
   * GET /api/auth/google/url
   * Returns the Google OAuth URL (for client-side redirect)
   */
  app.get('/api/auth/google/url', (req: Request, res: Response) => {
    try {
      const redirectUri = req.query.redirect_uri as string;
      const state = req.query.state as string;
      
      if (!redirectUri) {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }
      
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.json({ url: authUrl });
    } catch (error: any) {
      console.error('[Google Auth] Error generating auth URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate Google auth URL',
        message: error.message 
      });
    }
  });

  /**
   * POST /api/auth/google/callback
   * Exchange authorization code for tokens and authenticate user
   */
  app.post('/api/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri } = req.body;
      // NOTE: user_type is intentionally NOT accepted here.
      // All new users are created with 'pending' type and must choose after auth.
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }
      
      if (!redirect_uri) {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }

      console.log('[Google Auth] Processing callback', {
        codeLength: code.length,
        redirectUri: redirect_uri,
      });

      // Exchange code for tokens
      const googleTokens = await exchangeGoogleCode(code, redirect_uri);
      
      // Authenticate or create user — new users always get 'pending' type
      const authResult = await authenticateWithGoogle(googleTokens);

      // If link is required, return the link info
      if (authResult.linkRequired) {
        return res.status(200).json({
          success: false,
          linkRequired: true,
          existingProviders: authResult.existingProviders,
          pendingLinkId: authResult.pendingLinkId,
          message: 'An account with this email already exists. Please confirm to link accounts.'
        });
      }

      // Set refresh token in HTTP-only cookie for security
      res.cookie('refresh_token', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: authResult.user,
        accessToken: authResult.accessToken,
        isNewUser: authResult.isNewUser
      });
    } catch (error: any) {
      console.error('[Google Auth] Callback error:', error);
      res.status(500).json({ 
        error: 'Google authentication failed',
        message: error.message 
      });
    }
  });

  /**
   * POST /api/auth/google/link
   * Confirm linking a Google account to an existing account
   */
  app.post('/api/auth/google/link', async (req: Request, res: Response) => {
    try {
      const { pending_link_id, code, redirect_uri } = req.body;
      
      if (!pending_link_id) {
        return res.status(400).json({ error: 'pending_link_id is required' });
      }
      
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }

      // Exchange code for tokens
      const googleTokens = await exchangeGoogleCode(code, redirect_uri);
      
      // Confirm the link
      const authResult = await confirmAccountLink(pending_link_id, googleTokens);

      // Set refresh token in HTTP-only cookie
      res.cookie('refresh_token', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        user: authResult.user,
        accessToken: authResult.accessToken,
        message: 'Account linked successfully'
      });
    } catch (error: any) {
      console.error('[Google Auth] Link error:', error);
      res.status(500).json({ 
        error: 'Failed to link Google account',
        message: error.message 
      });
    }
  });
}
