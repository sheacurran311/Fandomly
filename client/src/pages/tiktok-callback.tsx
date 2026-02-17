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
    console.error('[TikTok Callback] Error getting dynamicUserId:', error);
  }
  
  return null;
}

// Global flag to prevent duplicate execution across component remounts
let tiktokCallbackProcessed = false;

export default function TikTokCallback() {
  const ranRef = useRef(false);

  useEffect(() => {
    // Double-check: component-level AND global-level to prevent any duplicates
    if (ranRef.current || tiktokCallbackProcessed) {
      console.log('[TikTok Callback] Already processed, skipping duplicate execution');
      return;
    }
    ranRef.current = true;
    tiktokCallbackProcessed = true;

    let mounted = true;
    const run = async () => {
      console.log('[TikTok Callback] Starting TikTok OAuth callback processing...');
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          const result = {
            success: false,
            error: errorDescription || error
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              window.opener.tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[TikTok Callback] OAuth error:', result);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('tiktok_oauth_state');
        if (state !== savedState) {
          const result = {
            success: false,
            error: 'Invalid state parameter - possible CSRF attack'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              window.opener.tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[TikTok Callback] State mismatch');
          return;
        }

        if (!code) {
          const result = {
            success: false,
            error: 'Missing authorization code'
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              window.opener.tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          console.error('[TikTok Callback] No code provided');
          return;
        }

        // Exchange code for token
        const dynamicUserId = getDynamicUserId() || (user as any)?.dynamicUserId || user?.id;
        const origin = window.location.origin;
        const redirectUri = `${origin}/tiktok-callback`;

        console.log('[TikTok Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/tiktok/token', {
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
        console.log('[TikTok Callback] Token response:', JSON.stringify(tokenData));
        
        if (!tokenData.access_token) {
          console.error('[TikTok Callback] Token data missing access_token:', tokenData);
          throw new Error(`No access token received. Server returned: ${JSON.stringify(tokenData)}`);
        }

        // Fetch user info
        console.log('[TikTok Callback] Fetching user info...');
        const userResp = await fetch('/api/social/tiktok/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'x-dynamic-user-id': dynamicUserId || ''
          },
          credentials: 'include'
        });

        if (!userResp.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userData = await userResp.json();
        const tiktokUser = userData.data?.user;

        if (!tiktokUser) {
          throw new Error('No user data received');
        }

        // Save connection to database
        console.log('[TikTok Callback] Saving connection to database...');
        const saveResp = await fetch('/api/social-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dynamic-user-id': dynamicUserId || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            platform: 'tiktok',
            platformUserId: tiktokUser.open_id || tiktokUser.union_id,
            platformUsername: tiktokUser.username || tiktokUser.display_name,
            platformDisplayName: tiktokUser.display_name,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
            profileData: {
              open_id: tiktokUser.open_id,
              display_name: tiktokUser.display_name,
              username: tiktokUser.username || tiktokUser.display_name,
              follower_count: tiktokUser.follower_count || 0,
              followers: tiktokUser.follower_count || 0,
              following: tiktokUser.following_count || 0,
              verified: tiktokUser.is_verified || false,
              profilePictureUrl: tiktokUser.avatar_url,
              bio: tiktokUser.bio_description
            }
          })
        });

        if (!saveResp.ok) {
          console.warn('[TikTok Callback] Failed to save connection to database');
        }

        const result = {
          success: true
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
            console.log('[TikTok Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
            window.opener.tiktokCallbackData = result;
            console.log('[TikTok Callback] Closing popup');
          } catch (e) {
            console.error('[TikTok Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }

        if (!mounted) return;
        // Not a popup - redirect to dashboard
        window.location.replace('/creator-dashboard/social');
      } catch (error) {
        console.error('[TikTok Callback] Error:', error);
        const result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error'
        };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
            window.opener.tiktokCallbackData = result;
          } catch (e) {
            console.error('[TikTok Callback] Error posting to opener:', e);
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
        Processing TikTok authorization…
      </div>
    </div>
  );
}


