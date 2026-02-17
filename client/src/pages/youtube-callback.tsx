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
    console.error('[YouTube Callback] Error getting dynamicUserId:', error);
  }
  
  return null;
}

// Global flag to prevent duplicate execution across component remounts
let youtubeCallbackProcessed = false;

export default function YouTubeCallback() {
  const ranRef = useRef(false);

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
        const error = urlParams.get('error');

        // Handle OAuth errors
        if (error) {
          const result = {
            success: false,
            error: error
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              window.opener.youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[YouTube Callback] OAuth error:', result);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('youtube_oauth_state');
        if (state !== savedState) {
          const result = {
            success: false,
            error: 'Invalid state parameter - possible CSRF attack'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              window.opener.youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[YouTube Callback] State mismatch');
          return;
        }

        if (!code) {
          const result = {
            success: false,
            error: 'Missing authorization code'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
              window.opener.youtubeCallbackData = result;
            } catch (e) {
              console.error('[YouTube Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[YouTube Callback] No code provided');
          return;
        }

        // Exchange code for token
        const dynamicUserId = getDynamicUserId() || (user as any)?.dynamicUserId || user?.id;
        const origin = window.location.origin;
        const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || `${origin}/youtube-callback`;

        console.log('[YouTube Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/youtube/token', {
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

        // Fetch channel info
        console.log('[YouTube Callback] Fetching channel info...');
        const channelResp = await fetch('/api/social/youtube/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'x-dynamic-user-id': dynamicUserId || ''
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

        // Save connection to database
        console.log('[YouTube Callback] Saving connection to database...');
        const saveResp = await fetch('/api/social-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dynamic-user-id': dynamicUserId || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            platform: 'youtube',
            platformUserId: channel.id,
            platformUsername: channel.snippet.customUrl || channel.id,
            platformDisplayName: channel.snippet.title,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
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
              description: channel.snippet.description
            }
          })
        });

        if (!saveResp.ok) {
          console.warn('[YouTube Callback] Failed to save connection to database');
        }

        const result = {
          success: true,
          channelName: channel.snippet.title
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
            console.log('[YouTube Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
            window.opener.youtubeCallbackData = result;
            console.log('[YouTube Callback] Closing popup');
          } catch (e) {
            console.error('[YouTube Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }

        if (!mounted) return;
        // Not a popup - redirect to dashboard
        window.location.replace('/creator-dashboard/social');
      } catch (error) {
        console.error('[YouTube Callback] Error:', error);
        const result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error'
        };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'youtube-oauth-result', result }, window.location.origin);
            window.opener.youtubeCallbackData = result;
          } catch (e) {
            console.error('[YouTube Callback] Error posting to opener:', e);
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
        Processing YouTube authorization…
      </div>
    </div>
  );
}

