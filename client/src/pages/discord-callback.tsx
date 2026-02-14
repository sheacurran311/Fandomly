/**
 * Discord OAuth Callback Page
 *
 * Handles the OAuth callback from Discord
 * Supports both authentication (login/signup) and social account linking
 */

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getPostAuthRedirect,
  getSocialLinkingRedirect,
  checkAuthState,
  authenticateWithSocial,
  saveSocialConnection,
} from "@/lib/auth-redirect";
import { invalidateSocialConnections } from "@/hooks/use-social-connections";

// Global flag to prevent duplicate execution across multiple renders/remounts
let discordCallbackProcessed = false;

export default function DiscordCallback() {
  const { toast } = useToast();
  const ranRef = useRef(false);
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || discordCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    discordCallbackProcessed = true;

    const run = async () => {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");

        console.log("[Discord Callback] Processing OAuth callback", {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!errorParam,
        });

        // Handle OAuth error
        if (errorParam) {
          console.error("[Discord Callback] OAuth error:", errorParam, errorDescription);
          const errorMsg = errorDescription || errorParam || "Discord authorization failed";

          // If opened in popup, send error to parent
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: "discord-oauth-result",
                result: { success: false, error: errorMsg },
              },
              window.location.origin
            );
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          const errorMsg = "Missing code or state parameter";
          
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: "discord-oauth-result",
                result: { success: false, error: errorMsg },
              },
              window.location.origin
            );
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Validate CSRF state
        const savedState = localStorage.getItem("discord_oauth_state");
        if (!savedState || savedState !== state) {
          const errorMsg = "Invalid state parameter - possible CSRF attack";
          
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: "discord-oauth-result",
                result: { success: false, error: errorMsg },
              },
              window.location.origin
            );
            window.close();
            return;
          }

          setStatus('error');
          setError(errorMsg);
          return;
        }

        // Clear the state from localStorage
        localStorage.removeItem("discord_oauth_state");

        console.log("[Discord Callback] Exchanging code for token...");

        // Exchange code for access token
        const origin = window.location.origin;
        const redirectUri = `${origin}/discord-callback`;

        const tokenResponse = await fetch("/api/social/discord/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
          credentials: "include",
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        console.log("[Discord Callback] Token obtained, fetching user profile...");

        // Get user profile
        const userResponse = await fetch("/api/social/discord/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          throw new Error(`Failed to fetch user profile: ${errorText}`);
        }

        const userData = await userResponse.json();
        console.log("[Discord Callback] User profile fetched:", userData.username);

        const displayName = userData.global_name || userData.username;

        // POPUP FLOW: If opened in popup, send data to parent for handling
        if (window.opener && !window.opener.closed) {
          const connectionData = {
            platform: "discord",
            platformUserId: userData.id,
            platformUsername: userData.username,
            platformDisplayName: displayName,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            profileData: {
              avatar: userData.avatar,
              verified: userData.verified || false,
            },
          };

          window.opener.postMessage(
            {
              type: "discord-oauth-result",
              result: {
                success: true,
                displayName,
                connectionData,
                userId: userData.id,
                username: userData.username,
                accessToken,
              },
            },
            window.location.origin
          );
          // Small delay to ensure postMessage is received before popup closes
          setTimeout(() => window.close(), 150);
          return;
        }

        // DIRECT NAVIGATION FLOW: Handle authentication or social linking
        console.log('[Discord Callback] Direct navigation detected, handling auth/linking flow...');

        // Check if user is already authenticated
        const authCheck = await checkAuthState();
        console.log('[Discord Callback] Auth check result:', authCheck);

        if (!authCheck.isAuthenticated) {
          // AUTHENTICATION FLOW: User is not logged in, authenticate with social
          console.log('[Discord Callback] User not authenticated, initiating social auth...');
          
          const authResult = await authenticateWithSocial('discord', {
            access_token: accessToken,
            platform_user_id: userData.id,
            email: userData.email, // Discord provides email
            username: userData.username,
            display_name: displayName,
            profile_data: {
              avatar: userData.avatar,
              verified: userData.verified || false,
              discriminator: userData.discriminator,
            },
          });

          console.log('[Discord Callback] Social auth result:', authResult);

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
          console.log('[Discord Callback] Auth successful, redirecting to:', redirectUrl);
          window.location.replace(redirectUrl);
          return;
        }

        // SOCIAL LINKING FLOW: User is already authenticated, save the connection
        console.log('[Discord Callback] User already authenticated, saving social connection...');

        const saveResult = await saveSocialConnection({
          platform: 'discord',
          platformUserId: userData.id,
          platformUsername: userData.username,
          platformDisplayName: displayName,
          accessToken: accessToken,
          refreshToken: tokenData.refresh_token,
          profileData: {
            avatar: userData.avatar,
            verified: userData.verified || false,
          },
        });

        if (!saveResult.success) {
          console.error('[Discord Callback] Failed to save connection:', saveResult.error);
          // Continue anyway - show success toast
        }

        // Invalidate social connections cache so all components get fresh data
        invalidateSocialConnections();

        toast({
          title: "Discord Connected!",
          description: `Successfully connected ${displayName}`,
        });

        // Redirect to appropriate dashboard based on user type
        const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
        console.log('[Discord Callback] Connection saved, redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error("[Discord Callback] Error:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to connect Discord";

        // If opened in popup, send error to parent
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "discord-oauth-result",
              result: { success: false, error: errorMsg },
            },
            window.location.origin
          );
          window.close();
          return;
        }

        setStatus('error');
        setError(errorMsg);
      }
    };

    run();
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
            Please sign in with your existing account to link Discord.
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
    <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400">Connecting your Discord account...</p>
      </div>
    </div>
  );
}
