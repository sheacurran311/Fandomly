import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { fetchApi } from '@/lib/queryClient';
import { socialManager } from '@/lib/social-integrations';
import { TwitterSDKManager } from '@/lib/twitter';
import InstagramSDKManager from '@/lib/instagram';
import { FacebookSDKManager } from '@/lib/facebook';

export type SocialPlatform =
  | 'twitter'
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'spotify'
  | 'twitch'
  | 'discord'
  | 'facebook'
  | 'kick'
  | 'patreon'
  | 'apple_music';

export interface SocialUserInfo {
  id?: string;
  name?: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  followersCount?: number;
  followers_count?: number;
  followingCount?: number;
  following_count?: number;
}

export interface SocialConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isLoading: boolean;
  userInfo: SocialUserInfo | null;
  error: string | null;
}

export interface UseSocialConnectionReturn extends SocialConnectionState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface PlatformConfig {
  name: string;
  emoji: string;
  connectEndpoint?: string;
  disconnectEndpoint?: string;
  statusEndpoint?: string;
  oauthHandler?: (
    userType: string,
    userId: string
  ) => Promise<{ success: boolean; user?: Record<string, unknown>; error?: string }>;
}

const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  twitter: {
    name: 'X/Twitter',
    emoji: '🐦',
  },
  tiktok: {
    name: 'TikTok',
    emoji: '🎵',
  },
  instagram: {
    name: 'Instagram',
    emoji: '📸',
  },
  youtube: {
    name: 'YouTube',
    emoji: '📺',
  },
  spotify: {
    name: 'Spotify',
    emoji: '🎧',
  },
  twitch: {
    name: 'Twitch',
    emoji: '🎮',
  },
  discord: {
    name: 'Discord',
    emoji: '💬',
  },
  facebook: {
    name: 'Facebook',
    emoji: '👍',
  },
  kick: {
    name: 'Kick',
    emoji: '🟢',
  },
  patreon: {
    name: 'Patreon',
    emoji: '🎨',
  },
  apple_music: {
    name: 'Apple Music',
    emoji: '🎵',
  },
};

/**
 * Factory function to create social connection hooks for any platform
 * Provides consistent connection status across all pages
 */
export function createSocialConnectionHook(platform: SocialPlatform) {
  return function useSocialConnection(): UseSocialConnectionReturn {
    const { user } = useAuth();
    const { toast } = useToast();
    const config = PLATFORM_CONFIGS[platform];

    const [state, setState] = useState<SocialConnectionState>({
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      isLoading: true,
      userInfo: null,
      error: null,
    });

    // Stable reference for user ID to avoid re-render loops
    const userIdRef = useRef(user?.id);
    userIdRef.current = user?.id;

    // Check connection status from API
    const checkStatus = useCallback(async () => {
      const uid = userIdRef.current;
      if (!uid) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { getAuthHeaders } = await import('@/lib/queryClient');
        const response = await fetch(`/api/social-connections/${platform}`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();

          if (data.connected && data.connection) {
            const conn = data.connection;

            // Extract follower counts from multiple possible locations
            const followersCount =
              conn.profileData?.user?.followersCount ||
              conn.profileData?.user?.followers_count ||
              conn.profileData?.followersCount ||
              conn.profileData?.followers_count ||
              conn.profileData?.user?.public_metrics?.followers_count ||
              conn.followersCount ||
              conn.followers_count ||
              0;

            const followingCount =
              conn.profileData?.user?.followingCount ||
              conn.profileData?.user?.following_count ||
              conn.profileData?.followingCount ||
              conn.profileData?.following_count ||
              conn.profileData?.user?.public_metrics?.following_count ||
              conn.followingCount ||
              conn.following_count ||
              0;

            console.log(`[${config.name} Hook] Connection data:`, {
              platformUsername: conn.platformUsername,
              hasProfileData: !!conn.profileData,
              followersCount,
              followingCount,
            });

            setState((prev) => ({
              ...prev,
              isConnected: true,
              isLoading: false,
              userInfo: {
                id: conn.platformUserId,
                name: conn.platformDisplayName,
                username: conn.platformUsername,
                displayName: conn.platformDisplayName,
                profileImage:
                  conn.profileData?.profileImage ||
                  conn.profileData?.picture ||
                  conn.profileData?.avatar,
                followersCount,
                followers_count: followersCount,
                followingCount,
                following_count: followingCount,
              },
              error: null,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isLoading: false,
              userInfo: null,
            }));
          }
        } else {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            userInfo: null,
          }));
        }
      } catch (error) {
        console.error(`[${config.name} Hook] Error checking status:`, error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to check connection status',
        }));
      }
    }, [config.name]); // Stable callback - uses refs for user data

    // Initial status check (runs once on mount + when user ID changes)
    useEffect(() => {
      if (user?.id) {
        checkStatus();
      }
    }, [user?.id, checkStatus]);

    // Connect to the platform via OAuth using the standardized secureLogin() approach
    const connect = useCallback(async () => {
      if (!user?.id || state.isConnecting) return;

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        // Normalize userType: only 'creator' or 'fan' are valid for SDK managers
        const rawUserType = user.userType || 'fan';
        const userType = rawUserType === 'creator' || rawUserType === 'brand' ? 'creator' : 'fan';

        // Call the appropriate secureLogin() method for each platform
        // These open popups directly to the OAuth provider (e.g. Google, TikTok)
        // and use postMessage to communicate results back via callback pages
        let result: { success: boolean; error?: string };

        switch (platform) {
          case 'twitter': {
            const twitterResult = await TwitterSDKManager.secureLogin(userType);
            result = twitterResult;
            // Twitter secureLogin doesn't save the connection from the popup (auth context issue)
            // So we need to save it from the parent window which has proper auth
            if (twitterResult.success && twitterResult.user) {
              try {
                await fetchApi('/api/social-connections', {
                  method: 'POST',
                  body: JSON.stringify({
                    platform: 'twitter',
                    platformUserId: twitterResult.user.id,
                    platformUsername: twitterResult.user.username,
                    platformDisplayName: twitterResult.user.name,
                    accessToken: twitterResult.accessToken,
                    refreshToken: twitterResult.refreshToken,
                    profileData: {
                      profileImageUrl: twitterResult.user.profileImageUrl,
                      followersCount: twitterResult.user.followersCount,
                      followingCount: twitterResult.user.followingCount,
                    },
                  }),
                });
                console.log('[useSocialConnection] Twitter connection saved from parent window');
              } catch (saveErr) {
                console.warn(
                  '[useSocialConnection] Twitter save failed (popup may have saved):',
                  saveErr
                );
              }
            }
            break;
          }
          case 'instagram':
            // Instagram only supports creator/business auth -- always use 'creator'
            result = await InstagramSDKManager.secureLogin('creator');
            break;
          case 'facebook':
            result = await FacebookSDKManager.secureLogin(userType);
            break;
          case 'tiktok':
          case 'youtube':
          case 'spotify':
          case 'discord':
          case 'twitch':
          case 'kick':
          case 'patreon':
            result = await socialManager[platform].secureLogin();
            break;
          case 'apple_music': {
            const { AppleMusicAPI } = await import('@/lib/social-integrations');
            const appleMusicApi = new AppleMusicAPI();
            result = await appleMusicApi.secureLogin();
            break;
          }
          default:
            result = { success: false, error: `Unsupported platform: ${platform}` };
        }

        if (result.success) {
          // Refresh connection status from API to get full user info
          await checkStatus();
          // Invalidate shared social connections cache
          invalidateSocialConnections();

          toast({
            title: `${config.name} Connected! ${config.emoji}`,
            description: 'Successfully connected',
            duration: 3000,
          });
        } else if (result.error && result.error !== 'Authorization cancelled') {
          // Only show error toast for actual errors, not user cancellations
          toast({
            title: 'Connection Failed',
            description: result.error || `Failed to connect ${config.name}. Please try again.`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));

        toast({
          title: 'Connection Error',
          description: errorMsg,
          variant: 'destructive',
        });
      } finally {
        setState((prev) => ({ ...prev, isConnecting: false }));
      }
    }, [user, state.isConnecting, checkStatus, toast, config.name, config.emoji]);

    // Disconnect from the platform using the standard API endpoint
    const disconnect = useCallback(async () => {
      if (!user?.id || state.isDisconnecting) return;

      setState((prev) => ({ ...prev, isDisconnecting: true }));

      try {
        const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
        const result = await disconnectSocialPlatform(platform);

        if (result.success) {
          setState({
            isConnected: false,
            isConnecting: false,
            isDisconnecting: false,
            isLoading: false,
            userInfo: null,
            error: null,
          });

          // Invalidate shared social connections cache
          invalidateSocialConnections();

          toast({
            title: `${config.name} Disconnected`,
            description: `Successfully disconnected from ${config.name}`,
            duration: 3000,
          });
        } else {
          throw new Error(result.error || 'Failed to disconnect');
        }
      } catch (error) {
        console.error(`[${config.name} Hook] Error disconnecting:`, error);
        setState((prev) => ({ ...prev, isDisconnecting: false }));

        toast({
          title: 'Disconnect Failed',
          description: `Failed to disconnect from ${config.name}. Please try again.`,
          variant: 'destructive',
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, state.isDisconnecting, toast, config.name]);

    return {
      ...state,
      connect,
      disconnect,
      refresh: checkStatus,
    };
  };
}

// Pre-built hooks for each platform - use these in components
export const useTikTokConnection = createSocialConnectionHook('tiktok');
export const useSpotifyConnection = createSocialConnectionHook('spotify');
export const useTwitchConnection = createSocialConnectionHook('twitch');
export const useYouTubeConnection = createSocialConnectionHook('youtube');
export const useDiscordConnection = createSocialConnectionHook('discord');
export const useFacebookConnection = createSocialConnectionHook('facebook');
export const useInstagramConnection = createSocialConnectionHook('instagram');
export const useKickConnection = createSocialConnectionHook('kick');
export const usePatreonConnection = createSocialConnectionHook('patreon');
export const useAppleMusicConnection = createSocialConnectionHook('apple_music');

// Generic hook for dynamic platform selection
export function useSocialConnection(platform: SocialPlatform): UseSocialConnectionReturn {
  const hook = createSocialConnectionHook(platform);
  return hook();
}
