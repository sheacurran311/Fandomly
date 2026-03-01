/**
 * Kick OAuth Callback Page
 *
 * Handles the OAuth redirect from Kick in a popup window.
 * Exchanges auth code for token (with PKCE), saves connection, and notifies opener.
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
    // Prevent duplicate execution
    if (ranRef.current || kickCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    kickCallbackProcessed = true;

    const run = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: {
        success: boolean;
        error?: string;
        username?: string;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`kick_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Kick Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'kick-oauth-result', result }, window.location.origin);
          window.close();
          return true;
        }
        if (state && state.startsWith('kick_')) {
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
        });

        // Handle OAuth error
        if (error) {
          console.error('[Kick Callback] OAuth error:', error);
          const errorMsg = errorDescription || error || 'Kick authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({ title: 'Kick Connection Failed', description: errorMsg, variant: 'destructive' });
          setLocation('/creator-dashboard/social');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = localStorage.getItem('kick_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        localStorage.removeItem('kick_oauth_state');

        // Retrieve PKCE code verifier
        const codeVerifier = localStorage.getItem('kick_code_verifier');
        localStorage.removeItem('kick_code_verifier');

        console.log('[Kick Callback] Exchanging code for token (with PKCE)...');

        // Exchange code for access token
        const redirectUri = `${window.location.origin}/kick-callback`;
        const tokenResponse = await fetch('/api/social/kick/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
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
          throw new Error('No access token received');
        }

        console.log('[Kick Callback] Token obtained, fetching user profile...');

        // Get user profile
        const userResponse = await fetch('/api/social/kick/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          throw new Error(`Failed to fetch user profile: ${errorText}`);
        }

        const profileData = await userResponse.json();

        if (!profileData.id && !profileData.username) {
          throw new Error('No profile data received');
        }

        console.log(
          '[Kick Callback] User profile fetched:',
          profileData.username || profileData.id
        );

        // Save the connection to the database
        const saveResponse = await fetch('/api/social-connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'kick',
            platformUserId: String(profileData.id),
            platformUsername: profileData.username,
            platformDisplayName: profileData.username,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
            profileData: {
              id: profileData.id,
              username: profileData.username,
              bio: profileData.bio,
              profilePicture: profileData.profile_pic || profileData.profilePicture,
              followerCount: profileData.follower_count || profileData.followerCount || 0,
              isVerified: profileData.verified || profileData.isVerified || false,
            },
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log('[Kick Callback] Connection saved successfully');

        const username = profileData.username || profileData.id;
        if (sendResultToOpener({ success: true, username })) return;

        // Fallback: show toast and redirect
        toast({ title: 'Kick Connected!', description: `Successfully connected ${username}` });
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
