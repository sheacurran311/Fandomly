import { useState, useEffect, useCallback } from 'react';
import { TwitterSDKManager } from '@/lib/twitter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface TwitterUserInfo {
  id?: string;
  name?: string;
  username?: string;
  followersCount?: number;
  followers_count?: number;
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

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/social-connections/twitter', {
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
          
          // Extract follower count from multiple possible locations
          const followersCount = 
            conn.profileData?.user?.followersCount ||
            conn.profileData?.user?.followers_count ||
            conn.profileData?.followersCount ||
            conn.profileData?.followers_count ||
            conn.profileData?.user?.public_metrics?.followers_count ||
            0;
          
          // Debug log to see what we're receiving
          console.log('[Twitter Hook] Connection data:', {
            platformUsername: conn.platformUsername,
            hasProfileData: !!conn.profileData,
            profileDataKeys: conn.profileData ? Object.keys(conn.profileData) : [],
            followersCount,
            rawProfileData: conn.profileData
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
  }, [user?.id, user]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

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
      const userType = user.userType === 'creator' ? 'creator' : 'fan';
      const result = await TwitterSDKManager.secureLogin(
        userType,
        (user as any)?.dynamicUserId || user.id
      );

      if (result.success && result.user) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          userInfo: {
            id: result.user.id,
            name: result.user.name,
            username: result.user.username,
            followersCount: result.user.followersCount || 0,
            followers_count: result.user.followersCount || 0,
          },
          error: null,
        }));

        // Refresh from API to get latest data
        await checkStatus();

        toast({
          title: "X Connected! 🐦",
          description: `Successfully connected @${result.user.username}`,
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

