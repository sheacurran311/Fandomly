/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SINGLE SOURCE OF TRUTH — Google OAuth (routes)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * This file + google-auth.ts are the ONLY places where Google OAuth routing and
 * redirect URI construction should be defined. The client just navigates to
 * GET /api/auth/google — no client-side OAuth URL building allowed.
 */
import type { Express, Request, Response } from 'express';
import {
  exchangeGoogleCode,
  authenticateWithGoogle,
  confirmAccountLink,
  getGoogleAuthUrl,
} from '../../services/auth/google-auth';

/**
 * Register Google OAuth routes
 *
 * Server-driven OAuth flow:
 *   1. Client navigates to GET /api/auth/google
 *   2. Server redirects to Google consent screen with redirect_uri = /api/auth/google/callback
 *   3. Google redirects back to GET /api/auth/google/callback (server route)
 *   4. Server exchanges code, creates session, sets cookies, redirects browser to SPA
 *
 * The redirect_uri is always constructed by the server from the incoming request's
 * protocol + host, so it works with dynamic hostnames (Replit, Railway, etc.)
 * as long as the URL is registered in the Google Cloud Console.
 */

function buildCallbackUri(req: Request): string {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host')!;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  /**
   * GET /api/auth/google
   * Redirects to Google OAuth consent screen.
   * The redirect_uri is always the server-side callback route.
   */
  app.get('/api/auth/google', (req: Request, res: Response) => {
    try {
      const redirectUri = buildCallbackUri(req);
      const state = req.query.state as string;

      console.log('[Google Auth] Initiating OAuth flow', { redirectUri });

      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('[Google Auth] Error generating auth URL:', error);
      res.status(500).json({
        error: 'Failed to initiate Google authentication',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/auth/google/callback
   * Server-side OAuth callback — Google redirects here after consent.
   * Exchanges code for tokens, creates/finds user, sets session cookies,
   * then redirects the browser to the SPA with auth status.
   */
  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const errorParam = req.query.error as string;

      if (errorParam) {
        console.error('[Google Auth] Google returned error:', errorParam);
        return res.redirect(`/auth/google/callback?error=${encodeURIComponent(errorParam)}`);
      }

      if (!code) {
        return res.redirect('/auth/google/callback?error=no_code');
      }

      const redirectUri = buildCallbackUri(req);

      console.log('[Google Auth] Processing server callback', {
        codeLength: code.length,
        redirectUri,
      });

      const googleTokens = await exchangeGoogleCode(code, redirectUri);
      const authResult = await authenticateWithGoogle(googleTokens);

      if (authResult.linkRequired) {
        const linkParams = new URLSearchParams({
          link_required: 'true',
          providers: (authResult.existingProviders || []).join(','),
          pending_link_id: authResult.pendingLinkId || '',
        });
        return res.redirect(`/auth/google/callback?${linkParams.toString()}`);
      }

      // Set refresh token in HTTP-only cookie
      res.cookie('refresh_token', authResult.refreshToken, {
        httpOnly: true,
        secure: req.get('x-forwarded-proto') === 'https' || req.protocol === 'https',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const params = new URLSearchParams({
        success: 'true',
        is_new_user: String(authResult.isNewUser),
      });
      res.redirect(`/auth/google/callback?${params.toString()}`);
    } catch (error: any) {
      console.error('[Google Auth] Server callback error:', error);
      res.redirect(`/auth/google/callback?error=${encodeURIComponent(error.message || 'auth_failed')}`);
    }
  });

  /**
   * POST /api/auth/google/callback
   * Legacy JSON endpoint — kept for backward compatibility with any client
   * code that still POSTs the authorization code.
   */
  app.post('/api/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      if (!redirect_uri) {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }

      console.log('[Google Auth] Legacy POST callback', {
        codeLength: code.length,
        redirectUri: redirect_uri,
      });

      const googleTokens = await exchangeGoogleCode(code, redirect_uri);
      const authResult = await authenticateWithGoogle(googleTokens);

      if (authResult.linkRequired) {
        return res.status(200).json({
          success: false,
          linkRequired: true,
          existingProviders: authResult.existingProviders,
          pendingLinkId: authResult.pendingLinkId,
          message: 'An account with this email already exists. Please confirm to link accounts.',
        });
      }

      res.cookie('refresh_token', authResult.refreshToken, {
        httpOnly: true,
        secure: req.get('x-forwarded-proto') === 'https' || req.protocol === 'https',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: authResult.user,
        accessToken: authResult.accessToken,
        isNewUser: authResult.isNewUser,
      });
    } catch (error: any) {
      console.error('[Google Auth] POST callback error:', error);
      res.status(500).json({
        error: 'Google authentication failed',
        message: error.message,
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

      const googleTokens = await exchangeGoogleCode(code, redirect_uri);
      const authResult = await confirmAccountLink(pending_link_id, googleTokens);

      res.cookie('refresh_token', authResult.refreshToken, {
        httpOnly: true,
        secure: req.get('x-forwarded-proto') === 'https' || req.protocol === 'https',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: authResult.user,
        accessToken: authResult.accessToken,
        message: 'Account linked successfully',
      });
    } catch (error: any) {
      console.error('[Google Auth] Link error:', error);
      res.status(500).json({
        error: 'Failed to link Google account',
        message: error.message,
      });
    }
  });
}
