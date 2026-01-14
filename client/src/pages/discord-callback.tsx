/**
 * Discord OAuth Callback Page
 *
 * Handles the OAuth callback from Discord
 * Exchanges authorization code for access token
 * Sends data back to parent window for saving (popup shares data, parent saves)
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Global flag to prevent duplicate execution across multiple renders/remounts
let discordCallbackProcessed = false;

export default function DiscordCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

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
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        console.log("[Discord Callback] Processing OAuth callback", {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error("[Discord Callback] OAuth error:", error, errorDescription);
          const errorMsg = errorDescription || error || "Discord authorization failed";

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

          // Otherwise show toast and redirect
          toast({
            title: "Discord Connection Failed",
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
        const savedState = localStorage.getItem("discord_oauth_state");
        if (!savedState || savedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
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

        // Prepare connection data to send to parent
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

        // If opened in popup, send data to parent for saving
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "discord-oauth-result",
              result: {
                success: true,
                displayName,
                connectionData, // Parent will save this
              },
            },
            window.location.origin
          );
          window.close();
          return;
        }

        // If not in popup (direct navigation), try to save here
        const saveResponse = await fetch("/api/social-connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(connectionData),
          credentials: "include",
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log("[Discord Callback] Connection saved successfully");

        toast({
          title: "Discord Connected! 🎉",
          description: `Successfully connected ${displayName}`,
        });
        setLocation("/creator-dashboard/social");
      } catch (error) {
        console.error("[Discord Callback] Error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to connect Discord";

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

        // Otherwise show toast and redirect
        toast({
          title: "Discord Connection Failed",
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
        <p className="text-muted-foreground">Connecting your Discord account...</p>
      </div>
    </div>
  );
}
