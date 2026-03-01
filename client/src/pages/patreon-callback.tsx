/**
 * Patreon OAuth Callback Page
 *
 * Handles the OAuth redirect from Patreon in a popup window.
 * Exchanges auth code for token, saves connection, and notifies opener.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let patreonCallbackProcessed = false;

export default function PatreonCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || patreonCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    patreonCallbackProcessed = true;

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
        displayName?: string;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`patreon_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Patreon Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'patreon-oauth-result', result },
            window.location.origin
          );
          window.close();
          return true;
        }
        if (state && state.startsWith('patreon_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[Patreon Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error('[Patreon Callback] OAuth error:', error);
          const errorMsg = errorDescription || error || 'Patreon authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({
            title: 'Patreon Connection Failed',
            description: errorMsg,
            variant: 'destructive',
          });
          setLocation('/creator-dashboard/social');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = localStorage.getItem('patreon_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        localStorage.removeItem('patreon_oauth_state');

        console.log('[Patreon Callback] Exchanging code for token...');

        // Exchange code for access token
        const redirectUri = `${window.location.origin}/patreon-callback`;
        const tokenResponse = await fetch('/api/social/patreon/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          throw new Error('No access token received');
        }

        console.log('[Patreon Callback] Token obtained, fetching user profile...');

        // Get user profile
        const userResponse = await fetch('/api/social/patreon/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          throw new Error(`Failed to fetch user profile: ${errorText}`);
        }

        const profileData = await userResponse.json();

        if (!profileData.id) {
          throw new Error('No profile data received');
        }

        console.log(
          '[Patreon Callback] User profile fetched:',
          profileData.full_name || profileData.vanity
        );

        // Save the connection to the database
        const displayName = profileData.vanity || profileData.full_name;
        const saveResponse = await fetch('/api/social-connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'patreon',
            platformUserId: String(profileData.id),
            platformUsername: displayName,
            platformDisplayName: profileData.full_name,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
            profileData: {
              fullName: profileData.full_name,
              vanity: profileData.vanity,
              email: profileData.email,
              imageUrl: profileData.image_url,
              url: profileData.url,
              isCreator: profileData.is_creator || false,
            },
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log('[Patreon Callback] Connection saved successfully');

        if (sendResultToOpener({ success: true, displayName })) return;

        // Fallback: show toast and redirect
        toast({
          title: 'Patreon Connected!',
          description: `Successfully connected ${displayName}`,
        });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[Patreon Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect Patreon';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        toast({
          title: 'Patreon Connection Failed',
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF424D] mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Patreon account...</p>
      </div>
    </div>
  );
}
