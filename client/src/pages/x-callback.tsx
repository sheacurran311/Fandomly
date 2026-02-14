import { useEffect, useRef, useState } from "react";
import { TwitterSDKManager, TwitterLoginResult } from "@/lib/twitter";
import {
  getPostAuthRedirect,
  getSocialLinkingRedirect,
  checkAuthState,
  authenticateWithSocial,
  saveSocialConnection,
} from "@/lib/auth-redirect";
import { invalidateSocialConnections } from "@/hooks/use-social-connections";

export default function XCallback() {
  const ranRef = useRef(false);
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);
  
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let mounted = true;
    const run = async () => {
      console.log('[X-Callback] Starting Twitter OAuth callback processing...');
      console.log('[X-Callback] URL search params:', window.location.search);
      console.log('[X-Callback] Has opener window:', !!(window as any).opener);
      
      const search = new URLSearchParams(window.location.search);
      const state = search.get('state') || undefined;

      let result = await TwitterSDKManager.handleCallbackFromWindow();
      console.log('[X-Callback] handleCallbackFromWindow result:', result);

      // If duplicate-callback was blocked OR if we got an error, try to reuse the cached success
      // This handles React StrictMode double-rendering in development
      if ((!result?.success || result?.error === 'Callback already processed') && state) {
        console.log('[X-Callback] Got error/failure, checking for cached success...');
        try {
          // First check immediately
          let cached = sessionStorage.getItem(`tw_cb_result_${state}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.success) {
              console.log('[X-Callback] Found cached success result immediately');
              result = parsed;
            }
          }
          
          // If still no success, wait and try again (for race conditions)
          if (!result?.success) {
            console.log('[X-Callback] No cached result yet, waiting 600ms...');
            await new Promise(r => setTimeout(r, 600));
            cached = sessionStorage.getItem(`tw_cb_result_${state}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed?.success) {
                console.log('[X-Callback] Found cached success result after wait');
                result = parsed;
              }
            }
          }
        } catch (e) {
          console.error('[X-Callback] Error checking cached result:', e);
        }
      }

      // Strip ?code&state after we've processed them to avoid re-trigger
      try {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      } catch {}

      // POPUP FLOW: If this is a popup, send result to parent and close
      if ((window as any).opener) {
        try {
          console.log('[X-Callback] Posting result to opener:', result);
          (window as any).opener.postMessage({ type: "twitter-oauth-result", result }, window.location.origin);
          (window as any).opener.twitterCallbackData = result; // fallback
          console.log('[X-Callback] Posted to opener, closing popup...');
        } catch (error) {
          console.error('[X-Callback] Error posting to opener:', error);
        }
        window.close();
        return;
      }

      if (!mounted) return;

      // DIRECT NAVIGATION FLOW: Handle authentication or social linking
      console.log('[X-Callback] Direct navigation detected, handling auth/linking flow...');

      // Check if OAuth was successful
      if (!result?.success || !result?.accessToken || !result?.user) {
        console.error('[X-Callback] OAuth failed:', result?.error);
        if (mounted) {
          setStatus('error');
          setError(result?.error || 'Twitter authorization failed');
        }
        return;
      }

      // Check if user is already authenticated
      const authCheck = await checkAuthState();
      console.log('[X-Callback] Auth check result:', authCheck);

      if (!authCheck.isAuthenticated) {
        // AUTHENTICATION FLOW: User is not logged in, authenticate with social
        console.log('[X-Callback] User not authenticated, initiating social auth...');
        
        const authResult = await authenticateWithSocial('twitter', {
          access_token: result.accessToken,
          platform_user_id: result.user.id,
          email: undefined, // Twitter doesn't provide email without special permissions
          username: result.user.username,
          display_name: result.user.name,
          profile_data: {
            profileImageUrl: result.user.profileImageUrl,
            followersCount: result.user.followersCount,
            followingCount: result.user.followingCount,
          },
        });

        console.log('[X-Callback] Social auth result:', authResult);

        if (authResult.linkRequired) {
          // Account linking required
          if (mounted) {
            setStatus('link_required');
            setLinkInfo({
              existingProviders: authResult.existingProviders || [],
              message: authResult.message || 'An account with this email already exists.',
            });
          }
          return;
        }

        if (!authResult.success) {
          if (mounted) {
            setStatus('error');
            setError(authResult.error || 'Authentication failed');
          }
          return;
        }

        // Success - redirect based on user state
        const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
        console.log('[X-Callback] Auth successful, redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);
        return;
      }

      // SOCIAL LINKING FLOW: User is already authenticated, save the connection
      console.log('[X-Callback] User already authenticated, saving social connection...');

      const saveResult = await saveSocialConnection({
        platform: 'twitter',
        platformUserId: result.user.id,
        platformUsername: result.user.username,
        platformDisplayName: result.user.name,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        profileData: {
          profileImageUrl: result.user.profileImageUrl,
          followersCount: result.user.followersCount,
          followingCount: result.user.followingCount,
        },
      });

      if (!saveResult.success) {
        console.error('[X-Callback] Failed to save connection:', saveResult.error);
        // Still redirect to dashboard even if save failed - user is authenticated
      }

      // Invalidate social connections cache so all components get fresh data
      invalidateSocialConnections();

      // Redirect to appropriate dashboard based on user type
      const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
      console.log('[X-Callback] Connection saved, redirecting to:', redirectUrl);
      window.location.replace(redirectUrl);
    };

    run();
    return () => { mounted = false; };
  }, []);

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <div className="bg-brand-card rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-white mb-4">Authorization Failed</h2>
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
            Please sign in with your existing account to link X/Twitter.
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
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white text-lg">Processing X authorization…</p>
      </div>
    </div>
  );
}
