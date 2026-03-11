/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Kick OAuth Callback Page
 * ⛔ Kick auth source of truth: client/src/lib/kick.ts (KickAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth redirect from Kick in a popup window.
 * 3-step pattern:
 *   1. POST /api/social/kick/token  — exchange code (no auth)
 *   2. GET  /api/social/kick/me     — fetch profile (platform token in header)
 *   3. POST /api/social-connections — save connection (session cookies)
 *
 * AUTH FLOW: if state contains "_auth_", posts full result back to opener
 *            for loginWithCallback in the auth modal instead of saving.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let kickCallbackProcessed = false;

export default function KickCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current || kickCallbackProcessed) return;
    ranRef.current = true;
    kickCallbackProcessed = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Determine if this is an auth-modal flow or a social connection flow
      const isAuthFlow = state?.includes('_auth_');

      // Helper: store in localStorage + postMessage + close popup (COOP-safe)
      const sendResultToOpener = (result: Record<string, unknown>) => {
        if (state) {
          try {
            localStorage.setItem(`kick_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Kick Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'kick-oauth-result', result }, window.location.origin);
          } catch (e) {
            console.warn('[Kick Callback] postMessage blocked (cross-origin), using localStorage fallback');
          }
          try {
            (window.opener as any).kickCallbackData = result;
          } catch {
            // Cross-origin frame access blocked — localStorage fallback already set above
          }
          window.close();
          return true;
        }
        if (state && (state.startsWith('kick_') || state.includes('kick'))) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[Kick Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          isAuthFlow,
        });

        if (error) {
          console.error('[Kick Callback] OAuth error:', error, errorDescription);
          const errorMsg = errorDescription || error || 'Kick authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({ title: 'Kick Connection Failed', description: errorMsg, variant: 'destructive' });
          setLocation(isAuthFlow ? '/login' : '/creator-dashboard/social');
          return;
        }

        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = sessionStorage.getItem('kick_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        sessionStorage.removeItem('kick_oauth_state');

        const codeVerifier = sessionStorage.getItem('kick_code_verifier') || undefined;
        sessionStorage.removeItem('kick_code_verifier');

        // Step 1: Exchange code for token
        console.log('[Kick Callback] Step 1: Exchanging code for token...');
        const redirectUri = `${window.location.origin}/kick-callback`;
        const tokenResponse = await fetch('/api/social/kick/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
          credentials: 'include',
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
          throw new Error('No access token received from Kick');
        }

        // Step 2: Fetch user profile
        console.log('[Kick Callback] Step 2: Fetching user profile...');
        const meResponse = await fetch('/api/social/kick/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });

        if (!meResponse.ok) {
          const errorText = await meResponse.text();
          throw new Error(`Failed to fetch Kick profile: ${errorText}`);
        }

        const profile = await meResponse.json();
        if (!profile.id) {
          throw new Error('No user data received from Kick');
        }

        console.log('[Kick Callback] Profile fetched:', profile.username);

        // ── AUTH FLOW: post full result back to opener for loginWithCallback ──
        if (isAuthFlow) {
          const authResult = {
            success: true,
            accessToken,
            userId: profile.id,
            platformUserId: profile.id,
            username: profile.username,
            displayName: profile.username,
            email: undefined, // Kick doesn't provide email
            profileData: {
              bio: profile.bio,
              profilePicture: profile.profile_pic,
              followerCount: profile.follower_count,
              isVerified: profile.verified,
            },
          };
          if (sendResultToOpener(authResult)) return;
          setLocation('/login');
          return;
        }

        // ── CONNECTION FLOW: save to social connections (Step 3) ──
        console.log('[Kick Callback] Step 3: Saving connection...');
        const saveResponse = await fetch('/api/social-connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'kick',
            platformUserId: profile.id,
            platformUsername: profile.username,
            platformDisplayName: profile.username,
            accessToken,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
            profileData: {
              bio: profile.bio,
              profilePicture: profile.profile_pic,
              followerCount: profile.follower_count,
              isVerified: profile.verified,
            },
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log('[Kick Callback] Connection saved successfully:', profile.username);
        if (sendResultToOpener({ success: true, username: profile.username })) return;

        toast({ title: 'Kick Connected!', description: `Successfully connected ${profile.username}` });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[Kick Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect Kick';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        toast({ title: 'Kick Connection Failed', description: errorMsg, variant: 'destructive' });
        setLocation('/creator-dashboard/social');
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Kick account...</p>
      </div>
    </div>
  );
}
