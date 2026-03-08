/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SINGLE SOURCE OF TRUTH — Google OAuth (routes)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * This file + google-auth.ts are the ONLY places where Google OAuth routing and
 * redirect URI construction should be defined.
 */
import type { Express, Request, Response } from 'express';
import {
  exchangeGoogleCode,
  authenticateWithGoogle,
  confirmAccountLink,
  getGoogleAuthUrl,
} from '../../services/auth/google-auth';

// Validate redirect_uri to prevent open redirect attacks.
// Only allows same-origin URIs or configured allowed origins.
function isAllowedRedirectUri(uri: string, host: string): boolean {
  try {
    const parsed = new URL(uri);
    const allowedHosts = [
      host,
      ...(process.env.ALLOWED_REDIRECT_HOSTS || '').split(',').filter(Boolean),
    ];
    return allowedHosts.some((h) => parsed.host === h || parsed.host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Tracks recently used Google auth codes to reject duplicate exchange attempts
// (e.g. React 18 Strict Mode double-firing effects). TTL: 2 minutes.
const recentlyUsedCodes = new Map<string, number>();
const CODE_TTL_MS = 2 * 60 * 1000;

function markCodeUsed(code: string) {
  recentlyUsedCodes.set(code, Date.now());
  // Prune expired entries
  for (const [key, ts] of recentlyUsedCodes) {
    if (Date.now() - ts > CODE_TTL_MS) recentlyUsedCodes.delete(key);
  }
}

function isCodeAlreadyUsed(code: string): boolean {
  const ts = recentlyUsedCodes.get(code);
  if (!ts) return false;
  if (Date.now() - ts > CODE_TTL_MS) {
    recentlyUsedCodes.delete(code);
    return false;
  }
  return true;
}

export function registerGoogleAuthRoutes(app: Express) {
  /**
   * GET /api/auth/google
   * Redirects to Google OAuth consent screen
   */
  app.get('/api/auth/google', (req: Request, res: Response) => {
    try {
      const redirectUri =
        (req.query.redirect_uri as string) ||
        `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

      if (!isAllowedRedirectUri(redirectUri, req.get('host') || '')) {
        return res.status(400).json({ error: 'Invalid redirect_uri' });
      }

      const state = req.query.state as string;

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

      if (!isAllowedRedirectUri(redirectUri, req.get('host') || '')) {
        return res.status(400).json({ error: 'Invalid redirect_uri' });
      }

      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.json({ url: authUrl });
    } catch (error: any) {
      console.error('[Google Auth] Error generating auth URL:', error);
      res.status(500).json({
        error: 'Failed to generate Google auth URL',
        message: error.message,
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

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      if (!redirect_uri) {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }

      if (isCodeAlreadyUsed(code)) {
        console.warn('[Google Auth] Duplicate code exchange attempt — ignoring');
        return res.status(409).json({
          error: 'Authorization code already used',
          message: 'This login request was already processed. Please try again.',
        });
      }
      markCodeUsed(code);

      console.log('[Google Auth] Processing callback', {
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
        secure: process.env.NODE_ENV === 'production',
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
      console.error('[Google Auth] Callback error:', error);
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
        secure: process.env.NODE_ENV === 'production',
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
