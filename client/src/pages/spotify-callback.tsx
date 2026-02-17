import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

function getDynamicUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check opener window first (for popup)
    if (window.opener && (window.opener as any).__dynamicUserId) {
      return (window.opener as any).__dynamicUserId;
    }
    
    // Then check current window
    if ((window as any).__dynamicUserId) {
      return (window as any).__dynamicUserId;
    }
    
    // Try localStorage as fallback
    const stored = localStorage.getItem('dynamicUserId');
    if (stored) return stored;
  } catch (error) {
    console.error('[Spotify Callback] Error getting dynamicUserId:', error);
  }
  
  return null;
}

// Global flag to prevent duplicate execution across component remounts
let spotifyCallbackProcessed = false;

export default function SpotifyCallback() {
  const ranRef = useRef(false);

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
        const error = urlParams.get('error');

        // Handle OAuth errors
        if (error) {
          const result = {
            success: false,
            error: error
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              window.opener.spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[Spotify Callback] OAuth error:', result);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('spotify_oauth_state');
        if (state !== savedState) {
          const result = {
            success: false,
            error: 'Invalid state parameter - possible CSRF attack'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              window.opener.spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[Spotify Callback] State mismatch');
          return;
        }

        if (!code) {
          const result = {
            success: false,
            error: 'Missing authorization code'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
              window.opener.spotifyCallbackData = result;
            } catch (e) {
              console.error('[Spotify Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[Spotify Callback] No code provided');
          return;
        }

        // Exchange code for token
        const dynamicUserId = getDynamicUserId() || (user as any)?.dynamicUserId || user?.id;
        const origin = window.location.origin;
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${origin}/spotify-callback`;

        console.log('[Spotify Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/spotify/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dynamic-user-id': dynamicUserId || ''
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
            'Authorization': `Bearer ${tokenData.access_token}`,
            'x-dynamic-user-id': dynamicUserId || ''
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

        // Save connection to database
        console.log('[Spotify Callback] Saving connection to database...');
        const saveResp = await fetch('/api/social-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dynamic-user-id': dynamicUserId || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            platform: 'spotify',
            platformUserId: profileData.id,
            platformUsername: profileData.id,
            platformDisplayName: profileData.display_name || profileData.id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
            profileData: {
              id: profileData.id,
              display_name: profileData.display_name || profileData.id,
              name: profileData.display_name || profileData.id,
              username: profileData.id,
              followers: profileData.followers?.total || 0,
              follower_count: profileData.followers?.total || 0,
              verified: false,
              profilePictureUrl: profileData.images?.[0]?.url,
              email: profileData.email,
              country: profileData.country,
              product: profileData.product
            }
          })
        });

        if (!saveResp.ok) {
          console.warn('[Spotify Callback] Failed to save connection to database');
        }

        const result = {
          success: true,
          displayName: profileData.display_name || profileData.id
        };

        // Clean up URL by removing code and state parameters
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        } catch {}

        if (window.opener) {
          try {
            console.log('[Spotify Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
            window.opener.spotifyCallbackData = result;
            console.log('[Spotify Callback] Closing popup');
          } catch (e) {
            console.error('[Spotify Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }

        if (!mounted) return;
        // Not a popup - redirect to dashboard
        window.location.replace('/creator-dashboard/social');
      } catch (error) {
        console.error('[Spotify Callback] Error:', error);
        const result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error'
        };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'spotify-oauth-result', result }, window.location.origin);
            window.opener.spotifyCallbackData = result;
          } catch (e) {
            console.error('[Spotify Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }
      }
    };
    
    run();
    return () => { mounted = false; };
  }, []); // Empty deps - only run once on mount

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-white flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Processing Spotify authorization…
      </div>
    </div>
  );
}

