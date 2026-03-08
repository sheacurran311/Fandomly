/**
 * YouTube OAuth Callback Page
 * ⛔ YouTube auth source of truth: client/src/lib/social-integrations.ts (YouTubeAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth callback from YouTube/Google
 * Exchanges authorization code for access token
 * Saves the connection to the database
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

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: {
        success: boolean;
        error?: string;
        channelName?: string;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`youtube_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[YouTube Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'youtube-oauth-result', result },
            window.location.origin
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window.opener as any).youtubeCallbackData = result;
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
          setLocation('/creator-dashboard/social');
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

        // Get channel info — use X-Social-Token header so the YouTube access token
        // doesn't conflict with the authenticateUser middleware's JWT parsing
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

        // Save the connection to the database
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
        setLocation('/creator-dashboard/social');
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
