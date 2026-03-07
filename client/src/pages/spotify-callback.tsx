/**
 * Spotify OAuth Callback Page
 * ⛔ Spotify auth source of truth: client/src/lib/social-integrations.ts (SpotifyAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth callback from Spotify
 * Exchanges authorization code for access token
 * Saves the connection to the database
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Global flag to prevent duplicate execution across multiple renders/remounts
let spotifyCallbackProcessed = false;

export default function SpotifyCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || spotifyCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    spotifyCallbackProcessed = true;

    const run = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: { success: boolean; error?: string; displayName?: string }) => {
        if (state) {
          try {
            localStorage.setItem(`spotify_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Spotify Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "spotify-oauth-result", result }, window.location.origin);
          (window.opener as any).spotifyCallbackData = result;
          window.close();
          return true;
        }
        if (state && state.startsWith('spotify_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log("[Spotify Callback] Processing OAuth callback", {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error("[Spotify Callback] OAuth error:", error);
          const errorMsg = error || "Spotify authorization failed";
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({
            title: "Spotify Connection Failed",
            description: errorMsg,
            variant: "destructive",
          });
          setLocation("/creator-dashboard/social");
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error("Missing code or state parameter");
        }

        // Validate CSRF state
        const savedState = localStorage.getItem("spotify_oauth_state");
        if (!savedState || savedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        // Clear the state from localStorage
        localStorage.removeItem("spotify_oauth_state");

        console.log("[Spotify Callback] Exchanging code for token...");

        // Exchange code for access token
        const origin = window.location.origin;
        const redirectUri = `${origin}/spotify-callback`;

        const tokenResponse = await fetch("/api/social/spotify/token", {
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

        if (!accessToken) {
          throw new Error("No access token received");
        }

        console.log("[Spotify Callback] Token obtained, fetching user profile...");

        // Get user profile
        const userResponse = await fetch("/api/social/spotify/me", {
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

        const profileData = await userResponse.json();

        if (!profileData.id) {
          throw new Error("No profile data received");
        }

        console.log("[Spotify Callback] User profile fetched:", profileData.display_name || profileData.id);

        // Save the connection to the database
        const saveResponse = await fetch("/api/social-connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "spotify",
            platformUserId: profileData.id,
            platformUsername: profileData.id,
            platformDisplayName: profileData.display_name || profileData.id,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
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
              product: profileData.product,
            },
          }),
          credentials: "include",
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log("[Spotify Callback] Connection saved successfully");

        const displayName = profileData.display_name || profileData.id;
        if (sendResultToOpener({ success: true, displayName })) return;

        // Otherwise show toast and redirect
        toast({
          title: "Spotify Connected!",
          description: `Successfully connected ${displayName}`,
        });
        setLocation("/creator-dashboard/social");
      } catch (error) {
        console.error("[Spotify Callback] Error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to connect Spotify";
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        // Otherwise show toast and redirect
        toast({
          title: "Spotify Connection Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setLocation("/creator-dashboard/social");
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Spotify account...</p>
      </div>
    </div>
  );
}
