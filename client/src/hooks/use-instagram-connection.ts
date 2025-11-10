import { useState, useEffect, useCallback } from 'react';
import InstagramSDKManager, { type InstagramLoginResult, type InstagramUser } from '@/lib/instagram';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface InstagramConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  userInfo: InstagramUser | null;
  businessAccountId: string | null;
  error: string | null;
}

interface UseInstagramConnectionReturn extends InstagramConnectionState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Unified hook for Instagram connection across all pages
 * Handles OAuth popup flow, connection status checks, and persistence
 */
export function useInstagramConnection(): UseInstagramConnectionReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<InstagramConnectionState>({
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    userInfo: null,
    businessAccountId: null,
    error: null,
  });

  // Check connection status - uses direct fetch for hot reload persistence
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('[Instagram Hook] Checking connection status...');
      const response = await fetch('/api/social-connections/instagram', {
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.connection) {
          const connection = data.connection;
          setState(prev => ({
            ...prev,
            isConnected: true,
            userInfo: {
              id: connection.platformUserId || '',
              username: connection.platformUsername || '',
              name: connection.platformDisplayName || '',
              profile_picture_url: connection.profileData?.profilePictureUrl,
              followers_count: connection.profileData?.followers || 0,
              media_count: connection.profileData?.following || 0,
            },
            businessAccountId: connection.platformUserId || '',
            error: null,
          }));
          console.log('[Instagram Hook] ✅ Loaded saved connection:', connection.platformUsername);
        } else {
          setState(prev => ({
            ...prev,
            isConnected: false,
            userInfo: null,
            businessAccountId: null,
          }));
          console.log('[Instagram Hook] No saved connection found');
        }
      }
    } catch (error) {
      console.error('[Instagram Hook] Error checking status:', error);
    }
  }, [user?.id]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Register global callback handler for Instagram OAuth results
  useEffect(() => {
    const handleInstagramResult = async (result: InstagramLoginResult) => {
      try {
        console.log('[Instagram Hook] Global callback triggered:', result.success);
        
        if (result.success && result.user && result.accessToken) {
          // Save connection immediately
          try {
            const { saveSocialConnection } = await import('@/lib/social-connection-api');
            await saveSocialConnection({
              platform: 'instagram',
              platformUserId: result.user.id,
              platformUsername: result.user.username,
              platformDisplayName: result.user.name || result.user.username,
              accessToken: result.accessToken,
              profileData: {
                profilePictureUrl: result.user.profile_picture_url,
                followers: result.user.followers_count || 0,
                following: result.user.media_count || 0,
              }
            });
            console.log('[Instagram Hook] Connection saved successfully');
          } catch (saveError) {
            console.error('[Instagram Hook] Error saving connection:', saveError);
          }

          // Update state
          setState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            userInfo: result.user!,
            businessAccountId: result.user!.id,
            error: null,
          }));

          // Refresh from database
          await checkStatus();

          toast({
            title: "Instagram Connected! 📸",
            description: `Successfully connected @${result.user.username}`,
            duration: 3000,
          });
        } else {
          setState(prev => ({
            ...prev,
            isConnecting: false,
            error: result.error || 'Connection failed',
          }));

          if (result.error) {
            toast({
              title: "Connection Failed",
              description: result.error,
              variant: 'destructive',
            });
          }
        }
      } catch (error: any) {
        console.error('[Instagram Hook] Global callback error:', error);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: error?.message || 'An error occurred',
        }));
      }
    };

    // Register global handler
    (window as any).handleInstagramConnectionResult = handleInstagramResult;

    return () => {
      delete (window as any).handleInstagramConnectionResult;
    };
  }, [checkStatus, toast]);

  // Connect to Instagram
  const connect = useCallback(async () => {
    if (!user?.id || state.isConnecting) return;

    // Only creators can connect Instagram
    if (user.userType !== 'creator') {
      toast({
        title: "Not Available",
        description: "Instagram connection is only available for creators",
        variant: 'destructive',
      });
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('[Instagram Hook] Starting connection process...');
      const result: InstagramLoginResult = await InstagramSDKManager.secureLogin('creator');

      if (result.success && result.user && result.accessToken) {
        // Save connection immediately
        try {
          const { saveSocialConnection } = await import('@/lib/social-connection-api');
          await saveSocialConnection({
            platform: 'instagram',
            platformUserId: result.user.id,
            platformUsername: result.user.username,
            platformDisplayName: result.user.name || result.user.username,
            accessToken: result.accessToken,
            profileData: {
              profilePictureUrl: result.user.profile_picture_url,
              followers: result.user.followers_count || 0,
              following: result.user.media_count || 0,
            }
          });
          console.log('[Instagram Hook] Connection saved successfully');
        } catch (saveError) {
          console.error('[Instagram Hook] Error saving connection:', saveError);
        }

        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          userInfo: result.user,
          businessAccountId: result.user.id,
          error: null,
        }));

        // Refresh from database to ensure sync
        await checkStatus();

        toast({
          title: "Instagram Connected! 📸",
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

  // Disconnect from Instagram
  const disconnect = useCallback(async () => {
    if (!user?.id || state.isDisconnecting) return;

    setState(prev => ({ ...prev, isDisconnecting: true }));

    try {
      await InstagramSDKManager.logout();

      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('instagram');

      setState({
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        userInfo: null,
        businessAccountId: null,
        error: null,
      });

      toast({
        title: "Instagram Disconnected",
        description: "Successfully disconnected from Instagram",
        duration: 3000,
      });
    } catch (error) {
      console.error('[Instagram Hook] Error disconnecting:', error);
      setState(prev => ({ ...prev, isDisconnecting: false }));

      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from Instagram. Please try again.",
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

