/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TikTok OAuth Callback Page
 * ⛔ TikTok auth source of truth: client/src/lib/social-integrations.ts (TikTokAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth callback from TikTok
 * Exchanges authorization code for access token
 * Saves the connection to the database
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let tiktokCallbackProcessed = false;

export default function TikTokCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || tiktokCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    tiktokCallbackProcessed = true;

    const run = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Determine if this is an auth-modal flow or a social connection flow
      const isAuthFlow = state?.includes('_auth_');

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: Record<string, unknown>) => {
        if (state) {
          try {
            localStorage.setItem(`tiktok_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[TikTok Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              { type: 'tiktok-oauth-result', result },
              window.location.origin
            );
          } catch (e) {
            console.warn('[TikTok Callback] postMessage blocked (cross-origin), using localStorage fallback');
          }
          try {
            (window.opener as any).tiktokCallbackData = result;
          } catch {
            // Cross-origin frame access blocked — localStorage fallback already set above
          }
          window.close();
          return true;
        }
        if (state && state.startsWith('tiktok_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[TikTok Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error('[TikTok Callback] OAuth error:', error, errorDescription);
          const errorMsg = errorDescription || error || 'TikTok authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({
            title: 'TikTok Connection Failed',
            description: errorMsg,
            variant: 'destructive',
          });
          setLocation(isAuthFlow ? '/login' : '/creator-dashboard/social');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = localStorage.getItem('tiktok_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clear the state from localStorage
        localStorage.removeItem('tiktok_oauth_state');

        console.log('[TikTok Callback] Exchanging code for token...');

        // Exchange code for access token
        const origin = window.location.origin;
        const redirectUri = `${origin}/tiktok-callback`;

        const tokenResponse = await fetch('/api/social/tiktok/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
          credentials: 'include',
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          console.error('[TikTok Callback] Token data missing access_token:', tokenData);
          throw new Error(
            `No access token received. Server returned: ${JSON.stringify(tokenData)}`
          );
        }

        console.log('[TikTok Callback] Token obtained, fetching user info...');

        // Get user info
        const userResponse = await fetch('/api/social/tiktok/user', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          throw new Error(`Failed to fetch user info: ${errorText}`);
        }

        const userData = await userResponse.json();
        const tiktokUser = userData.data?.user;

        if (!tiktokUser) {
          throw new Error('No user data received');
        }

        console.log('[TikTok Callback] User info fetched:', tiktokUser.display_name);

        // ── AUTH FLOW: Send data back to opener for loginWithCallback ──
        if (isAuthFlow) {
          const authResult = {
            success: true,
            accessToken,
            userId: tiktokUser.open_id || tiktokUser.union_id,
            platformUserId: tiktokUser.open_id || tiktokUser.union_id,
            username: tiktokUser.username || tiktokUser.display_name,
            displayName: tiktokUser.display_name,
            email: undefined, // TikTok doesn't provide email
            profileData: {
              open_id: tiktokUser.open_id,
              display_name: tiktokUser.display_name,
              username: tiktokUser.username || tiktokUser.display_name,
              follower_count: tiktokUser.follower_count || 0,
              followers: tiktokUser.follower_count || 0,
              verified: tiktokUser.is_verified || false,
              profilePictureUrl: tiktokUser.avatar_url,
            },
          };
          if (sendResultToOpener(authResult)) return;
          setLocation('/login');
          return;
        }

        // ── CONNECTION FLOW: Save to social connections ──
        const saveResponse = await fetch('/api/social-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'tiktok',
            platformUserId: tiktokUser.open_id || tiktokUser.union_id,
            platformUsername: tiktokUser.username || tiktokUser.display_name,
            platformDisplayName: tiktokUser.display_name,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
            profileData: {
              open_id: tiktokUser.open_id,
              display_name: tiktokUser.display_name,
              username: tiktokUser.username || tiktokUser.display_name,
              follower_count: tiktokUser.follower_count || 0,
              followers: tiktokUser.follower_count || 0,
              following: tiktokUser.following_count || 0,
              verified: tiktokUser.is_verified || false,
              profilePictureUrl: tiktokUser.avatar_url,
              bio: tiktokUser.bio_description,
            },
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log('[TikTok Callback] Connection saved successfully');

        const displayName = tiktokUser.display_name;
        if (sendResultToOpener({ success: true, displayName })) return;

        // Otherwise show toast and redirect
        toast({
          title: 'TikTok Connected!',
          description: `Successfully connected ${displayName}`,
        });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[TikTok Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect TikTok';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        // Otherwise show toast and redirect
        toast({
          title: 'TikTok Connection Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setLocation('/creator-dashboard/social');
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Connecting your TikTok account...</p>
      </div>
    </div>
  );
}
