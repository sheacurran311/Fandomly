/**
 * YouTube OAuth Callback Page
 *
 * Handles the OAuth callback from YouTube/Google
 * Supports both authentication (login/signup) and social account linking
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getPostAuthRedirect,
  getSocialLinkingRedirect,
  checkAuthState,
  authenticateWithSocial,
  saveSocialConnection,
} from '@/lib/auth-redirect';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';

// Global flag to prevent duplicate execution across component remounts
let youtubeCallbackProcessed = false;

export default function YouTubeCallback() {
  const ranRef = useRef(false);
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);

  useEffect(() => {
    // Double-check: component-level AND global-level to prevent any duplicates
    if (ranRef.current || youtubeCallbackProcessed) {
      console.log('[YouTube Callback] Already processed, skipping duplicate execution');
      return;
    }
    ranRef.current = true;
    youtubeCallbackProcessed = true;

    let mounted = true;
    const run = async () => {
      console.log('[YouTube Callback] Starting YouTube OAuth callback processing...');
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const errorParam = urlParams.get('error');

        // Handle OAuth errors
        if (errorParam) {
          const result = { success: false, error: errorParam };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              (window.opener as any).youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorParam);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('youtube_oauth_state');
        if (state !== savedState) {
          const errorMsg = 'Invalid state parameter - possible CSRF attack';
          const result = { success: false, error: errorMsg };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              (window.opener as any).youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        if (!code) {
          const errorMsg = 'Missing authorization code';
          const result = { success: false, error: errorMsg };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              (window.opener as any).youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Clear state from localStorage
        localStorage.removeItem('youtube_oauth_state');

        // Exchange code for token
        const origin = window.location.origin;
        const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || `${origin}/youtube-callback`;

        console.log('[YouTube Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/youtube/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code, redirect_uri: redirectUri })
        });

        if (!tokenResp.ok) {
          const errorData = await tokenResp.json();
          throw new Error(errorData.error || errorData.message || 'Token exchange failed');
        }

        const tokenData = await tokenResp.json();
        
        if (!tokenData.access_token) {
          throw new Error('No access token received');
        }

        // Fetch channel info
        console.log('[YouTube Callback] Fetching channel info...');
        const channelResp = await fetch('/api/social/youtube/me', {
          headers: {
            'X-Social-Token': `Bearer ${tokenData.access_token}`,
          },
          credentials: 'include'
        });

        if (!channelResp.ok) {
          throw new Error('Failed to fetch channel info');
        }

        const channelData = await channelResp.json();
        const channel = channelData.items?.[0];

        if (!channel) {
          throw new Error('No channel data received');
        }

        const displayName = channel.snippet.title;
        const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0');

        // POPUP FLOW: If opened in popup, send data to parent
        if (window.opener) {
          const connectionData = {
            platform: 'youtube',
            platformUserId: channel.id,
            platformUsername: channel.snippet.customUrl || channel.id,
            platformDisplayName: displayName,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            profileData: {
              id: channel.id,
              title: displayName,
              name: displayName,
              channelTitle: displayName,
              subscriberCount,
              followers: subscriberCount,
              follower_count: subscriberCount,
              verified: false,
              profilePictureUrl: channel.snippet.thumbnails?.default?.url,
              description: channel.snippet.description,
            },
          };

          const result = {
            success: true,
            channelName: displayName,
            channelId: channel.id,
            username: channel.snippet.customUrl || channel.id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            connectionData,
            profileData: connectionData.profileData,
          };

          try {
            console.log('[YouTube Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
            (window.opener as any).youtubeCallbackData = result;
          } catch (e) {
            console.error('[YouTube Callback] Error posting to opener:', e);
          }
          // Small delay to ensure postMessage is received before popup closes
          // (Google's COOP headers can cause race conditions)
          setTimeout(() => window.close(), 150);
          return;
        }

        if (!mounted) return;

        // DIRECT NAVIGATION FLOW
        console.log('[YouTube Callback] Direct navigation detected, handling auth/linking flow...');

        // Clean up URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        } catch {}

        // Check if user is already authenticated
        const authCheck = await checkAuthState();
        console.log('[YouTube Callback] Auth check result:', authCheck);

        if (!authCheck.isAuthenticated) {
          // AUTHENTICATION FLOW
          console.log('[YouTube Callback] User not authenticated, initiating social auth...');
          
          const authResult = await authenticateWithSocial('youtube', {
            access_token: tokenData.access_token,
            platform_user_id: channel.id,
            email: undefined, // YouTube channel doesn't provide email directly
            username: channel.snippet.customUrl || channel.id,
            display_name: displayName,
            profile_data: {
              title: displayName,
              channelTitle: displayName,
              subscriberCount,
              followers: subscriberCount,
              verified: false,
              profilePictureUrl: channel.snippet.thumbnails?.default?.url,
              description: channel.snippet.description,
            },
          });

          console.log('[YouTube Callback] Social auth result:', authResult);

          if (authResult.linkRequired) {
            setStatus('link_required');
            setLinkInfo({
              existingProviders: authResult.existingProviders || [],
              message: authResult.message || 'An account with this email already exists.',
            });
            return;
          }

          if (!authResult.success) {
            setStatus('error');
            setError(authResult.error || 'Authentication failed');
            return;
          }

          toast({
            title: "Welcome to Fandomly!",
            description: `Successfully signed in as ${displayName}`,
          });

          const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
          console.log('[YouTube Callback] Auth successful, redirecting to:', redirectUrl);
          window.location.replace(redirectUrl);
          return;
        }

        // SOCIAL LINKING FLOW
        console.log('[YouTube Callback] User already authenticated, saving social connection...');

        const saveResult = await saveSocialConnection({
          platform: 'youtube',
          platformUserId: channel.id,
          platformUsername: channel.snippet.customUrl || channel.id,
          platformDisplayName: displayName,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profileData: {
            id: channel.id,
            title: displayName,
            name: displayName,
            channelTitle: displayName,
            subscriberCount,
            followers: subscriberCount,
            follower_count: subscriberCount,
            verified: false,
            profilePictureUrl: channel.snippet.thumbnails?.default?.url,
            description: channel.snippet.description,
          },
        });

        if (!saveResult.success) {
          console.error('[YouTube Callback] Failed to save connection:', saveResult.error);
        }

        // Invalidate social connections cache so all components get fresh data
        invalidateSocialConnections();

        toast({
          title: "YouTube Connected!",
          description: `Successfully connected ${displayName}`,
        });

        const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
        console.log('[YouTube Callback] Connection saved, redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error('[YouTube Callback] Error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
        const result = { success: false, error: errorMsg };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
            (window.opener as any).youtubeCallbackData = result;
          } catch (e) {
            console.error('[YouTube Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }

        if (mounted) {
          setStatus('error');
          setError(errorMsg);
        }
      }
    };
    
    run();
    return () => { mounted = false; };
  }, [toast]);

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <div className="bg-brand-card rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connection Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.replace('/')}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Account linking required
  if (status === 'link_required' && linkInfo) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <div className="bg-brand-card rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Account Found</h2>
          <p className="text-gray-300 mb-6">{linkInfo.message}</p>
          <p className="text-gray-400 text-sm mb-6">
            Existing login method: {linkInfo.existingProviders.join(', ')}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Please sign in with your existing account to link YouTube.
          </p>
          <button
            onClick={() => window.location.replace('/')}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Processing state
  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-white flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Processing YouTube authorization…
      </div>
    </div>
  );
}
