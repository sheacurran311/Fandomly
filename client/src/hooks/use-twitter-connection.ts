import { useState, useEffect, useCallback, useRef } from 'react';
import { TwitterSDKManager } from '@/lib/twitter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { fetchApi } from '@/lib/queryClient';

interface TwitterUserInfo {
  id?: string;
  name?: string;
  username?: string;
  followersCount?: number;
  followers_count?: number;
  followingCount?: number;
  following_count?: number;
}

interface TwitterConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  userInfo: TwitterUserInfo | null;
  error: string | null;
}

interface UseTwitterConnectionReturn extends TwitterConnectionState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Unified hook for Twitter/X connection across all pages
 * Handles OAuth popup flow, connection status checks, and cleanup
 */
export function useTwitterConnection(): UseTwitterConnectionReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<TwitterConnectionState>({
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    userInfo: null,
    error: null,
  });

  // Stable references for user fields to avoid re-render loops
  const userIdRef = useRef(user?.id);
  const dynamicUserIdRef = useRef((user as any)?.dynamicUserId || user?.id);
  userIdRef.current = user?.id;
  dynamicUserIdRef.current = (user as any)?.dynamicUserId || user?.id;

  // Check connection status
  const checkStatus = useCallback(async () => {
    const uid = userIdRef.current;
    const dynamicUid = dynamicUserIdRef.current;
    if (!uid) return;

    try {
      const response = await fetch('/api/social-connections/twitter', {
        headers: {
          'x-dynamic-user-id': dynamicUid || uid || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.connection) {
          const conn = data.connection;
          
          // Extract follower and following counts from multiple possible locations
          const followersCount =
            conn.profileData?.user?.followersCount ||
            conn.profileData?.user?.followers_count ||
            conn.profileData?.followersCount ||
            conn.profileData?.followers_count ||
            conn.profileData?.user?.public_metrics?.followers_count ||
            0;

          const followingCount =
            conn.profileData?.user?.followingCount ||
            conn.profileData?.user?.following_count ||
            conn.profileData?.followingCount ||
            conn.profileData?.following_count ||
            conn.profileData?.user?.public_metrics?.following_count ||
            0;

          console.log('[Twitter Hook] Connection data:', {
            platformUsername: conn.platformUsername,
            hasProfileData: !!conn.profileData,
            followersCount,
            followingCount,
          });

          setState(prev => ({
            ...prev,
            isConnected: true,
            userInfo: {
              id: conn.platformUserId,
              name: conn.platformDisplayName,
              username: conn.platformUsername,
              followersCount: followersCount,
              followers_count: followersCount,
              followingCount: followingCount,
              following_count: followingCount,
            },
            error: null,
          }));
        } else {
          setState(prev => ({
            ...prev,
            isConnected: false,
            userInfo: null,
          }));
        }
      }
    } catch (error) {
      console.error('[Twitter Hook] Error checking status:', error);
    }
  }, []);  // Stable callback - uses refs for user data

  // Initial status check (runs once on mount + when user ID changes)
  useEffect(() => {
    if (user?.id) {
      checkStatus();
    }
  }, [user?.id, checkStatus]);

  // Listen for PKCE verifier requests from popup
  useEffect(() => {
    const handlePKCERequest = (event: MessageEvent) => {
      if (event.data?.type === 'twitter-pkce-request' && event.data?.state) {
        try {
          const pkceMap = JSON.parse(localStorage.getItem('twitter_pkce_map') || '{}');
          const verifier = pkceMap[event.data.state]?.verifier;
          
          if (verifier) {
            event.source?.postMessage({
              type: 'twitter-pkce-response',
              state: event.data.state,
              verifier: verifier
            }, { targetOrigin: event.origin });
          }
        } catch (error) {
          console.error('[Twitter Hook] Error handling PKCE request:', error);
        }
      }
    };

    window.addEventListener('message', handlePKCERequest);
    return () => window.removeEventListener('message', handlePKCERequest);
  }, []);

  // Connect to Twitter
  const connect = useCallback(async () => {
    if (!user?.id || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const userType = user.userType || 'auth';
      const result = await TwitterSDKManager.secureLogin(
        userType
      );

      if (result.success && result.user) {
        // Save connection from parent window (reliable - has JWT/cookie auth)
        try {
          await fetchApi('/api/social-connections', {
            method: 'POST',
            body: JSON.stringify({
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
            }),
          });
          console.log('[Twitter Hook] Connection saved from parent window');
        } catch (saveErr) {
          console.warn('[Twitter Hook] Parent save failed (popup may have already saved):', saveErr);
        }

        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          userInfo: {
            id: result.user!.id,
            name: result.user!.name,
            username: result.user!.username,
            followersCount: result.user!.followersCount || 0,
            followers_count: result.user!.followersCount || 0,
            followingCount: result.user!.followingCount || 0,
            following_count: result.user!.followingCount || 0,
          },
          error: null,
        }));

        // Refresh from API to get latest data
        await checkStatus();
        invalidateSocialConnections();

        toast({
          title: "X Connected! 🐦",
          description: `Successfully connected @${result.user!.username}`,
          duration: 3000,
        });
      } else {
        const errorMsg = result.error || 'Failed to connect';
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: errorMsg,
        }));

        toast({
          title: "Connection Failed",
          description: errorMsg,
          variant: 'destructive',
        });
      }
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
  }, [user, state.isConnecting, checkStatus, toast]);

  // Disconnect from Twitter
  const disconnect = useCallback(async () => {
    if (!user?.id || state.isDisconnecting) return;

    setState(prev => ({ ...prev, isDisconnecting: true }));

    try {
      const response = await fetch('/api/social/twitter', {
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
          userInfo: null,
          error: null,
        });

        invalidateSocialConnections();

        toast({
          title: "X Disconnected",
          description: "Successfully disconnected from X",
          duration: 3000,
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('[Twitter Hook] Error disconnecting:', error);
      setState(prev => ({ ...prev, isDisconnecting: false }));

      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from X. Please try again.",
        variant: 'destructive',
      });
    }
  }, [user, state.isDisconnecting, toast]);

  return {
    ...state,
    connect,
    disconnect,
    refresh: checkStatus,
  };
}

