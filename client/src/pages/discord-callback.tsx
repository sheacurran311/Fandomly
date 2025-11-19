/**
 * Discord OAuth Callback Page
 *
 * Handles the OAuth callback from Discord
 * Exchanges authorization code for access token
 * Saves the connection to the database
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Global flag to prevent duplicate execution across multiple renders/remounts
let discordCallbackProcessed = false;

export default function DiscordCallback() {
  const navigate = useNavigate();
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
          navigate("/creator-dashboard/social");
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

        // Save the connection to the database
        const saveResponse = await fetch("/api/social-connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "discord",
            platformUserId: userData.id,
            username: userData.username,
            displayName: userData.global_name || userData.username,
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            profileUrl: `https://discord.com/users/${userData.id}`,
            profileImage: userData.avatar
              ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
              : "",
            verified: userData.verified || false,
            followers: 0, // Discord doesn't have a follower count
          }),
          credentials: "include",
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save connection: ${errorText}`);
        }

        console.log("[Discord Callback] Connection saved successfully");

        const displayName = userData.global_name || userData.username;

        // If opened in popup, send success to parent
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "discord-oauth-result",
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
          title: "Discord Connected! 🎉",
          description: `Successfully connected ${displayName}`,
        });
        navigate("/creator-dashboard/social");
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
        navigate("/creator-dashboard/social");
      }
    };

    run();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Discord account...</p>
      </div>
    </div>
  );
}
