/**
 * Spotify OAuth Callback Page
 *
 * Handles the OAuth callback from Spotify
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
let spotifyCallbackProcessed = false;

export default function SpotifyCallback() {
  const ranRef = useRef(false);
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);

  useEffect(() => {
    // Double-check: component-level AND global-level to prevent any duplicates
    if (ranRef.current || spotifyCallbackProcessed) {
      console.log('[Spotify Callback] Already processed, skipping duplicate execution');
      return;
    }
    ranRef.current = true;
    spotifyCallbackProcessed = true;

    let mounted = true;
    const run = async () => {
      console.log('[Spotify Callback] Starting Spotify OAuth callback processing...');
      
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
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              (window.opener as any).spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorParam);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('spotify_oauth_state');
        if (state !== savedState) {
          const errorMsg = 'Invalid state parameter - possible CSRF attack';
          const result = { success: false, error: errorMsg };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              (window.opener as any).spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
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
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              (window.opener as any).spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Clear state from localStorage
        localStorage.removeItem('spotify_oauth_state');

        // Exchange code for token
        const origin = window.location.origin;
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${origin}/spotify-callback`;

        console.log('[Spotify Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/spotify/token', {
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

        // Fetch user profile
        console.log('[Spotify Callback] Fetching user profile...');
        const profileResp = await fetch('/api/social/spotify/me', {
          headers: {
            'X-Social-Token': `Bearer ${tokenData.access_token}`,
          },
          credentials: 'include'
        });

        if (!profileResp.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const profileData = await profileResp.json();

        if (!profileData.id) {
          throw new Error('No profile data received');
        }

        const displayName = profileData.display_name || profileData.id;

        // POPUP FLOW: If opened in popup, send data to parent
        if (window.opener) {
          const connectionData = {
            platform: 'spotify',
            platformUserId: profileData.id,
            platformUsername: profileData.id,
            platformDisplayName: displayName,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            profileData: {
              id: profileData.id,
              display_name: displayName,
              name: displayName,
              username: profileData.id,
              followers: profileData.followers?.total || 0,
              follower_count: profileData.followers?.total || 0,
              verified: false,
              profilePictureUrl: profileData.images?.[0]?.url,
              email: profileData.email,
              country: profileData.country,
              product: profileData.product,
            },
          };

          const result = {
            success: true,
            displayName,
            userId: profileData.id,
            username: profileData.id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            connectionData,
            profileData: connectionData.profileData,
          };

          try {
            console.log('[Spotify Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
            (window.opener as any).spotifyCallbackData = result;
          } catch (e) {
            console.error('[Spotify Callback] Error posting to opener:', e);
          }
          // Small delay to ensure postMessage is received before popup closes
          // (Spotify's COOP headers can cause race conditions)
          setTimeout(() => window.close(), 150);
          return;
        }

        if (!mounted) return;

        // DIRECT NAVIGATION FLOW
        console.log('[Spotify Callback] Direct navigation detected, handling auth/linking flow...');

        // Clean up URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        } catch {}

        // Check if user is already authenticated
        const authCheck = await checkAuthState();
        console.log('[Spotify Callback] Auth check result:', authCheck);

        if (!authCheck.isAuthenticated) {
          // AUTHENTICATION FLOW
          console.log('[Spotify Callback] User not authenticated, initiating social auth...');
          
          const authResult = await authenticateWithSocial('spotify', {
            access_token: tokenData.access_token,
            platform_user_id: profileData.id,
            email: profileData.email,
            username: profileData.id,
            display_name: displayName,
            profile_data: {
              followers: profileData.followers?.total || 0,
              verified: false,
              profilePictureUrl: profileData.images?.[0]?.url,
              country: profileData.country,
              product: profileData.product,
            },
          });

          console.log('[Spotify Callback] Social auth result:', authResult);

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
          console.log('[Spotify Callback] Auth successful, redirecting to:', redirectUrl);
          window.location.replace(redirectUrl);
          return;
        }

        // SOCIAL LINKING FLOW
        console.log('[Spotify Callback] User already authenticated, saving social connection...');

        const saveResult = await saveSocialConnection({
          platform: 'spotify',
          platformUserId: profileData.id,
          platformUsername: profileData.id,
          platformDisplayName: displayName,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profileData: {
            id: profileData.id,
            display_name: displayName,
            name: displayName,
            username: profileData.id,
            followers: profileData.followers?.total || 0,
            follower_count: profileData.followers?.total || 0,
            verified: false,
            profilePictureUrl: profileData.images?.[0]?.url,
            email: profileData.email,
            country: profileData.country,
            product: profileData.product,
          },
        });

        if (!saveResult.success) {
          console.error('[Spotify Callback] Failed to save connection:', saveResult.error);
        }

        // Invalidate social connections cache so all components get fresh data
        invalidateSocialConnections();

        toast({
          title: "Spotify Connected!",
          description: `Successfully connected ${displayName}`,
        });

        const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
        console.log('[Spotify Callback] Connection saved, redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error('[Spotify Callback] Error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
        const result = { success: false, error: errorMsg };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
            (window.opener as any).spotifyCallbackData = result;
          } catch (e) {
            console.error('[Spotify Callback] Error posting to opener:', e);
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
            Please sign in with your existing account to link Spotify.
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
        Processing Spotify authorization…
      </div>
    </div>
  );
}
