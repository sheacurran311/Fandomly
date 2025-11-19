/**
 * Twitch OAuth Callback Page
 *
 * Handles the OAuth callback from Twitch
 * Exchanges authorization code for access token
 * Saves the connection to the database
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Global flag to prevent duplicate execution across multiple renders/remounts
let twitchCallbackProcessed = false;

export default function TwitchCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || twitchCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    twitchCallbackProcessed = true;

    const run = async () => {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        console.log("[Twitch Callback] Processing OAuth callback", {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error("[Twitch Callback] OAuth error:", error, errorDescription);
          const errorMsg = errorDescription || error || "Twitch authorization failed";

          // If opened in popup, send error to parent
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: "twitch-oauth-result",
                result: { success: false, error: errorMsg },
              },
              window.location.origin
            );
            window.close();
            return;
          }

          // Otherwise show toast and redirect
          toast({
            title: "Twitch Connection Failed",
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
        const savedState = localStorage.getItem("twitch_oauth_state");
        if (!savedState || savedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        // Clear the state from localStorage
        localStorage.removeItem("twitch_oauth_state");

        console.log("[Twitch Callback] Exchanging code for token...");

        // Exchange code for access token
        const origin = window.location.origin;
        const redirectUri = `${origin}/twitch-callback`;

        const tokenResponse = await fetch("/api/social/twitch/token", {
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

        console.log("[Twitch Callback] Token obtained, fetching user profile...");

        // Get user profile
        const userResponse = await fetch("/api/social/twitch/me", {
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
        console.log("[Twitch Callback] User profile fetched:", userData.login);

        // Save the connection to the database
        const saveResponse = await fetch("/api/social-connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "twitch",
            platformUserId: userData.id,
            username: userData.login,
            displayName: userData.display_name,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            profileUrl: `https://twitch.tv/${userData.login}`,
            profileImage: userData.profile_image_url || "",
            verified: userData.broadcaster_type === "partner",
            followers: 0, // Would need additional API call to get follower count
          }),
          credentials: "include",
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log("[Twitch Callback] Connection saved successfully");

        const displayName = userData.display_name;

        // If opened in popup, send success to parent
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "twitch-oauth-result",
              result: {
                success: true,
                displayName,
              },
            },
            window.location.origin
          );
          window.close();
          return;
        }

        // Otherwise show toast and redirect
        toast({
          title: "Twitch Connected! 🎉",
          description: `Successfully connected ${displayName}`,
        });
        setLocation("/creator-dashboard/social");
      } catch (error) {
        console.error("[Twitch Callback] Error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to connect Twitch";

        // If opened in popup, send error to parent
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "twitch-oauth-result",
              result: { success: false, error: errorMsg },
            },
            window.location.origin
          );
          window.close();
          return;
        }

        // Otherwise show toast and redirect
        toast({
          title: "Twitch Connection Failed",
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
        <p className="text-muted-foreground">Connecting your Twitch account...</p>
      </div>
    </div>
  );
}
