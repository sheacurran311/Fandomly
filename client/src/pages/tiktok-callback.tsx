/**
 * TikTok OAuth Callback Page
 *
 * Handles the OAuth callback from TikTok
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
let tiktokCallbackProcessed = false;

export default function TikTokCallback() {
  const ranRef = useRef(false);
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);

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
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle OAuth errors
        if (errorParam) {
          const result = {
            success: false,
            error: errorDescription || errorParam
          };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              (window.opener as any).tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorDescription || errorParam);
          return;
        }

        // Validate state
        const savedState = localStorage.getItem('tiktok_oauth_state');
        if (state !== savedState) {
          const errorMsg = 'Invalid state parameter - possible CSRF attack';
          const result = { success: false, error: errorMsg };

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              (window.opener as any).tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
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
              window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
              (window.opener as any).tiktokCallbackData = result;
            } catch (e) {
              console.error('[TikTok Callback] Error posting to opener:', e);
            }
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Clear state from localStorage
        localStorage.removeItem('tiktok_oauth_state');

        // Exchange code for token
        const origin = window.location.origin;
        const redirectUri = `${origin}/tiktok-callback`;

        console.log('[TikTok Callback] Exchanging code for token...');
        const tokenResp = await fetch('/api/social/tiktok/token', {
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
        console.log('[TikTok Callback] Token response received');
        
        if (!tokenData.access_token) {
          console.error('[TikTok Callback] Token data missing access_token:', tokenData);
          throw new Error(`No access token received. Server returned: ${JSON.stringify(tokenData)}`);
        }

        // Fetch user info
        console.log('[TikTok Callback] Fetching user info...');
        const userResp = await fetch('/api/social/tiktok/user', {
          headers: {
            'X-Social-Token': `Bearer ${tokenData.access_token}`,
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

        const displayName = tiktokUser.display_name || tiktokUser.username;
        const platformUserId = tiktokUser.open_id || tiktokUser.union_id;

        // POPUP FLOW: If opened in popup, send data to parent
        if (window.opener) {
          const connectionData = {
            platform: 'tiktok',
            platformUserId: platformUserId,
            platformUsername: tiktokUser.username || tiktokUser.display_name,
            platformDisplayName: displayName,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
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
          };

          const result = {
            success: true,
            displayName,
            userId: platformUserId,
            username: tiktokUser.username || tiktokUser.display_name,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            connectionData,
            profileData: connectionData.profileData,
          };

          try {
            console.log('[TikTok Callback] Posting success result to opener');
            window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
            (window.opener as any).tiktokCallbackData = result;
          } catch (e) {
            console.error('[TikTok Callback] Error posting to opener:', e);
          }
          window.close();
          return;
        }

        if (!mounted) return;

        // DIRECT NAVIGATION FLOW: Handle authentication or social linking
        console.log('[TikTok Callback] Direct navigation detected, handling auth/linking flow...');

        // Clean up URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        } catch {}

        // Check if user is already authenticated
        const authCheck = await checkAuthState();
        console.log('[TikTok Callback] Auth check result:', authCheck);

        if (!authCheck.isAuthenticated) {
          // AUTHENTICATION FLOW: User is not logged in, authenticate with social
          console.log('[TikTok Callback] User not authenticated, initiating social auth...');
          
          const authResult = await authenticateWithSocial('tiktok', {
            access_token: tokenData.access_token,
            platform_user_id: platformUserId,
            email: undefined, // TikTok doesn't provide email
            username: tiktokUser.username || tiktokUser.display_name,
            display_name: displayName,
            profile_data: {
              open_id: tiktokUser.open_id,
              follower_count: tiktokUser.follower_count || 0,
              following_count: tiktokUser.following_count || 0,
              verified: tiktokUser.is_verified || false,
              profilePictureUrl: tiktokUser.avatar_url,
              bio: tiktokUser.bio_description,
            },
          });

          console.log('[TikTok Callback] Social auth result:', authResult);

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

          // Success - redirect based on user state
          toast({
            title: "Welcome to Fandomly!",
            description: `Successfully signed in as ${displayName}`,
          });

          const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
          console.log('[TikTok Callback] Auth successful, redirecting to:', redirectUrl);
          window.location.replace(redirectUrl);
          return;
        }

        // SOCIAL LINKING FLOW: User is already authenticated, save the connection
        console.log('[TikTok Callback] User already authenticated, saving social connection...');

        const saveResult = await saveSocialConnection({
          platform: 'tiktok',
          platformUserId: platformUserId,
          platformUsername: tiktokUser.username || tiktokUser.display_name,
          platformDisplayName: displayName,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
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
        });

        if (!saveResult.success) {
          console.error('[TikTok Callback] Failed to save connection:', saveResult.error);
        }

        // Invalidate social connections cache so all components get fresh data
        invalidateSocialConnections();

        toast({
          title: "TikTok Connected!",
          description: `Successfully connected ${displayName}`,
        });

        // Redirect to appropriate dashboard based on user type
        const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
        console.log('[TikTok Callback] Connection saved, redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error('[TikTok Callback] Error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
        const result = { success: false, error: errorMsg };

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'tiktok-oauth-result', result }, window.location.origin);
            (window.opener as any).tiktokCallbackData = result;
          } catch (e) {
            console.error('[TikTok Callback] Error posting to opener:', e);
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
            Please sign in with your existing account to link TikTok.
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
        Processing TikTok authorization…
      </div>
    </div>
  );
}
