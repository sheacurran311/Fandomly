import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export type SocialPlatform = 'twitter' | 'tiktok' | 'instagram' | 'youtube' | 'spotify' | 'twitch' | 'discord' | 'facebook';

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
  oauthHandler?: (userType: string, userId: string) => Promise<{ success: boolean; user?: any; error?: string }>;
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

    // Check connection status from API
    const checkStatus = useCallback(async () => {
      if (!user?.id) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await fetch(`/api/social-connections/${platform}`, {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
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

            setState(prev => ({
              ...prev,
              isConnected: true,
              isLoading: false,
              userInfo: {
                id: conn.platformUserId,
                name: conn.platformDisplayName,
                username: conn.platformUsername,
                displayName: conn.platformDisplayName,
                profileImage: conn.profileData?.profileImage || conn.profileData?.picture || conn.profileData?.avatar,
                followersCount,
                followers_count: followersCount,
                followingCount,
                following_count: followingCount,
              },
              error: null,
            }));
          } else {
            setState(prev => ({
              ...prev,
              isConnected: false,
              isLoading: false,
              userInfo: null,
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            userInfo: null,
          }));
        }
      } catch (error) {
        console.error(`[${config.name} Hook] Error checking status:`, error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to check connection status',
        }));
      }
    }, [user?.id, user, config.name]);

    // Initial status check
    useEffect(() => {
      checkStatus();
    }, [checkStatus]);

    // Connect to the platform via OAuth
    const connect = useCallback(async () => {
      if (!user?.id || state.isConnecting) return;

      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      try {
        const userType = user.userType === 'creator' ? 'creator' : 'fan';
        const dynamicUserId = (user as any)?.dynamicUserId || user.id;

        // Start OAuth flow via popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          `/api/auth/${platform}?userType=${userType}&dynamicUserId=${dynamicUserId}`,
          `${platform}_oauth`,
          `width=${width},height=${height},left=${left},top=${top},popup=yes`
        );

        if (!popup) {
          throw new Error('Popup was blocked. Please allow popups for this site.');
        }

        // Poll for popup close and check connection
        const pollInterval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(pollInterval);
            // Give the backend a moment to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            await checkStatus();
            
            // Check if we're now connected
            const response = await fetch(`/api/social-connections/${platform}`, {
              headers: {
                'x-dynamic-user-id': dynamicUserId,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.connected) {
                toast({
                  title: `${config.name} Connected! ${config.emoji}`,
                  description: data.connection?.platformUsername 
                    ? `Successfully connected @${data.connection.platformUsername}`
                    : 'Successfully connected',
                  duration: 3000,
                });
              }
            }
            
            setState(prev => ({ ...prev, isConnecting: false }));
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!popup.closed) {
            popup.close();
          }
          setState(prev => ({ ...prev, isConnecting: false }));
        }, 5 * 60 * 1000);

      } catch (error: any) {
        const errorMsg = error?.message || 'An error occurred';
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: errorMsg,
        }));

        toast({
          title: 'Connection Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    }, [user, state.isConnecting, checkStatus, toast, config.name, config.emoji]);

    // Disconnect from the platform
    const disconnect = useCallback(async () => {
      if (!user?.id || state.isDisconnecting) return;

      setState(prev => ({ ...prev, isDisconnecting: true }));

      try {
        const response = await fetch(`/api/social/${platform}`, {
          method: 'DELETE',
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          setState({
            isConnected: false,
            isConnecting: false,
            isDisconnecting: false,
            isLoading: false,
            userInfo: null,
            error: null,
          });

          toast({
            title: `${config.name} Disconnected`,
            description: `Successfully disconnected from ${config.name}`,
            duration: 3000,
          });
        } else {
          throw new Error('Failed to disconnect');
        }
      } catch (error) {
        console.error(`[${config.name} Hook] Error disconnecting:`, error);
        setState(prev => ({ ...prev, isDisconnecting: false }));

        toast({
          title: "Disconnect Failed",
          description: `Failed to disconnect from ${config.name}. Please try again.`,
          variant: 'destructive',
        });
      }
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

// Generic hook for dynamic platform selection
export function useSocialConnection(platform: SocialPlatform): UseSocialConnectionReturn {
  const hook = createSocialConnectionHook(platform);
  return hook();
}

