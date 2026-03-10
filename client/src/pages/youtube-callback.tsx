/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * YouTube OAuth Callback Page
 * ⛔ YouTube auth source of truth: client/src/lib/social-integrations.ts (YouTubeAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth callback from YouTube/Google.
 * Supports TWO modes based on the state parameter:
 *
 * 1. AUTH mode (state contains '_auth_'): Used by the primary auth modal
 *    for registration/login. Exchanges code for token, fetches channel info
 *    + Google profile (email), sends result to opener WITHOUT saving to
 *    social connections. The auth modal handles loginWithCallback.
 *
 * 2. CONNECTION mode (default): Used by dashboard social connection flow.
 *    Exchanges code for token, fetches channel info, saves to social
 *    connections, sends result to opener.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let youtubeCallbackProcessed = false;

export default function YouTubeCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || youtubeCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    youtubeCallbackProcessed = true;

    const run = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      // Determine if this is an auth-modal flow or a social connection flow
      const isAuthFlow = state?.includes('_auth_');

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: any) => {
        if (state) {
          try {
            localStorage.setItem(`youtube_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[YouTube Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              { type: 'youtube-oauth-result', result },
              window.location.origin
            );
          } catch (e) {
            console.warn('[YouTube Callback] postMessage blocked (cross-origin), using localStorage fallback');
          }
          try {
            (window.opener as any).youtubeCallbackData = result;
          } catch {
            // Cross-origin frame access blocked — localStorage fallback already set above
          }
          window.close();
          return true;
        }
        if (state && state.startsWith('youtube_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[YouTube Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          isAuthFlow,
        });

        // Handle OAuth error
        if (error) {
          console.error('[YouTube Callback] OAuth error:', error);
          const errorMsg = error || 'YouTube authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({
            title: 'YouTube Connection Failed',
            description: errorMsg,
            variant: 'destructive',
          });
          setLocation('/');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = localStorage.getItem('youtube_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clear the state from localStorage
        localStorage.removeItem('youtube_oauth_state');

        console.log('[YouTube Callback] Exchanging code for token...');

        // Exchange code for access token
        const origin = window.location.origin;
        const redirectUri = `${origin}/youtube-callback`;

        const tokenResponse = await fetch('/api/social/youtube/token', {
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
          throw new Error('No access token received');
        }

        console.log('[YouTube Callback] Token obtained, fetching channel info...');

        // Get channel info
        const channelResponse = await fetch('/api/social/youtube/me', {
          method: 'GET',
          headers: {
            'X-Social-Token': `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (!channelResponse.ok) {
          const errorText = await channelResponse.text();
          throw new Error(`Failed to fetch channel info: ${errorText}`);
        }

        const channelData = await channelResponse.json();
        const channel = channelData.items?.[0];

        if (!channel) {
          throw new Error('No channel data received');
        }

        console.log('[YouTube Callback] Channel info fetched:', channel.snippet.title);

        // ── AUTH FLOW: Send data back to opener for loginWithCallback ──
        if (isAuthFlow) {
          // Also fetch Google userinfo for email (YouTube API doesn't return email)
          let email: string | undefined;
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              email = userInfo.email;
            }
          } catch (e) {
            console.warn('[YouTube Callback] Could not fetch Google userinfo for email:', e);
          }

          const authResult = {
            success: true,
            accessToken,
            userId: channel.id,
            platformUserId: channel.id,
            username: channel.snippet.customUrl || channel.id,
            displayName: channel.snippet.title,
            email,
            profileData: {
              id: channel.id,
              title: channel.snippet.title,
              profileImageUrl: channel.snippet.thumbnails?.default?.url,
              subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
              followers: parseInt(channel.statistics?.subscriberCount || '0'),
            },
          };

          if (sendResultToOpener(authResult)) return;

          // Fallback: redirect to login page
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
            platform: 'youtube',
            platformUserId: channel.id,
            platformUsername: channel.snippet.customUrl || channel.id,
            platformDisplayName: channel.snippet.title,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
            profileData: {
              id: channel.id,
              title: channel.snippet.title,
              name: channel.snippet.title,
              channelTitle: channel.snippet.title,
              subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
              followers: parseInt(channel.statistics?.subscriberCount || '0'),
              follower_count: parseInt(channel.statistics?.subscriberCount || '0'),
              verified: false,
              profilePictureUrl: channel.snippet.thumbnails?.default?.url,
              description: channel.snippet.description,
            },
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log('[YouTube Callback] Connection saved successfully');

        const channelName = channel.snippet.title;
        if (sendResultToOpener({ success: true, channelName })) return;

        // Otherwise show toast and redirect
        toast({
          title: 'YouTube Connected!',
          description: `Successfully connected ${channelName}`,
        });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[YouTube Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect YouTube';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        // Otherwise show toast and redirect
        toast({
          title: 'YouTube Connection Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setLocation(isAuthFlow ? '/login' : '/creator-dashboard/social');
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Connecting your YouTube account...</p>
      </div>
    </div>
  );
}
