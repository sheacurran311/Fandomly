import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import InstagramSDKManager, { InstagramUser, InstagramLoginResult } from '@/lib/instagram';
import { toast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';

interface InstagramConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  userInfo: InstagramUser | null;
  businessAccountId: string | null;
  accessToken: string | null;
  error: string | null;
}

interface InstagramConnectionContextType extends InstagramConnectionState {
  connectInstagram: () => Promise<void>;
  disconnectInstagram: () => Promise<void>;
  refreshConnection: () => Promise<void>;
  sendMessage: (recipientId: string, message: string) => Promise<boolean>;
  completeConnection: (result: InstagramLoginResult) => Promise<void>;
}

const InstagramConnectionContext = createContext<InstagramConnectionContextType | null>(null);

export function useInstagramConnection() {
  const context = useContext(InstagramConnectionContext);
  if (!context) {
    throw new Error('useInstagramConnection must be used within InstagramConnectionProvider');
  }
  return context;
}

export function InstagramConnectionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<InstagramConnectionState>({
    isConnected: false,
    isConnecting: false,
    userInfo: null,
    businessAccountId: null,
    accessToken: null,
    error: null,
  });

  // Stable references for effect dependencies (avoid re-running on every user object change)
  const userId = user?.id;
  const userType = user?.userType;

  // Initialize and check connection status (similar to Facebook pattern)
  useEffect(() => {
    // Wait for user data to load before checking user type
    if (isLoading) {
      return;
    }

    // Only initialize Instagram for authenticated creator users
    if (!userId || userType !== 'creator') {
      return;
    }

    console.log('[Instagram] Creator user detected - Instagram provider ready');
    
    // Register a global callback handler for Instagram OAuth results (similar to Facebook pattern)
    const instagramStatusCallback = (result: InstagramLoginResult) => {
      try {
        console.log('[Instagram] statusCallback ->', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success && result.user && result.accessToken) {
          loadUserDataFromResult(result).catch((error) => {
            console.error('[Instagram] statusCallback load error:', error);
            setState(prev => ({ ...prev, isConnected: false }));
          });
        } else {
          setState(prev => ({ 
            ...prev, 
            isConnected: false, 
            userInfo: null, 
            businessAccountId: null,
            accessToken: null,
            error: result.error || 'Connection failed'
          }));
        }
      } catch (error) {
        console.error('[Instagram] statusCallback error:', error);
        setState(prev => ({ ...prev, isConnected: false }));
      }
    };

    (window as any).handleInstagramConnectionResult = instagramStatusCallback;
    
    // Load saved connection data from database on mount and hot reload
    const loadSavedConnection = async () => {
      try {
        console.log('[Instagram] Loading saved connection from database...');
        const { getAuthHeaders } = await import('@/lib/queryClient');
        const response = await fetch('/api/social-connections/instagram', {
          headers: {
            ...getAuthHeaders(),
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
                followers_count: connection.profileData?.followers,
                media_count: connection.profileData?.mediaCount || connection.profileData?.media_count,
              },
              businessAccountId: connection.platformUserId || '',
              accessToken: '', // Don't store token in state for security
            }));
            console.log('[Instagram] ✅ Loaded saved connection for user:', connection.platformUsername);
          } else {
            console.log('[Instagram] No saved connection found');
          }
        }
      } catch (error) {
        console.error('[Instagram] Error loading saved connection:', error);
      }
    };

    loadSavedConnection();
  }, [userId, userType, isLoading]);

  const saveConnection = useCallback(async (data: {
    userInfo: InstagramUser;
    businessAccountId: string;
    accessToken: string;
  }) => {
    if (!user) return;

    try {
      const { saveSocialConnection } = await import('@/lib/social-connection-api');
      await saveSocialConnection({
        platform: 'instagram',
        platformUserId: data.userInfo.id,
        platformUsername: data.userInfo.username,
        platformDisplayName: data.userInfo.name,
        accessToken: data.accessToken,
        profileData: {
          profilePictureUrl: data.userInfo.profile_picture_url,
          followers: data.userInfo.followers_count,
          following: 0,
          mediaCount: data.userInfo.media_count,
        }
      });
      console.log('[Instagram] Connection saved to database');
    } catch (error) {
      console.error('[Instagram] Error saving connection:', error);
    }
  }, [user]);

  const clearConnection = useCallback(async () => {
    if (!user) return;

    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('instagram');
      console.log('[Instagram] Connection cleared from database');
    } catch (error) {
      console.error('[Instagram] Error clearing connection:', error);
    }
  }, [user]);

  const connectInstagram = useCallback(async () => {
    if (state.isConnecting || !user) return;

    console.log('[Instagram Context] Starting connection process for user type:', user.userType);
    console.log('[Instagram Context] Current URL:', window.location.href);
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Only creators can connect Instagram for messaging
      if (user.userType !== 'creator') {
        throw new Error('Instagram connection is only available for creators');
      }

      console.log('[Instagram Context] Calling InstagramSDKManager.secureLogin...');
      // With popup flow, this resolves with the result
      const result: InstagramLoginResult = await InstagramSDKManager.secureLogin('creator');
      
      console.log('[Instagram Context] secureLogin result:', result);
      
      if (result.success && result.user && result.accessToken) {
        await loadUserDataFromResult(result);
        toast({
          title: "Instagram Connected! 📸",
          description: `Successfully connected @${result.user.username}`,
          duration: 4000
        });
      } else {
        const errorMessage = result.error || 'Instagram connection failed. Please try again.';
        console.log('[Instagram Context] Login failed:', errorMessage);
        setState(prev => ({ ...prev, error: errorMessage }));
        
        toast({
          title: "Instagram Connection Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Instagram Context] Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Instagram Connection Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnecting, user]);

  // Load user data from Instagram result (similar to Facebook's loadUserDataFromToken)
  const loadUserDataFromResult = useCallback(async (result: InstagramLoginResult) => {
    console.log('[Instagram] loadUserDataFromResult start with result:', {
      success: result.success,
      hasUser: !!result.user,
      hasAccessToken: !!result.accessToken,
      username: result.user?.username
    });

    if (!result.success || !result.user || !result.accessToken) {
      console.log('[Instagram] loadUserDataFromResult - invalid result, skipping');
      setState(prev => ({ ...prev, isConnected: false, userInfo: null, error: 'Invalid connection result' }));
      return false;
    }

    try {
      console.log('[Instagram] user OK ->', result.user.id);
      
      const connectionData = {
        userInfo: result.user,
        businessAccountId: result.user.id,
        accessToken: result.accessToken,
      };

      console.log('[Instagram] setting state with connected=true');
      setState(prev => ({
        ...prev,
        isConnected: true,
        userInfo: result.user!,
        businessAccountId: result.user!.id,
        accessToken: result.accessToken!,
        error: null,
        isConnecting: false,
      }));

      // Save to database using the social_connections table
      await saveConnection(connectionData);
      console.log('[Instagram] Connection saved to database');
      
      // Invalidate shared social connections cache
      invalidateSocialConnections();
      
      console.log('[Instagram] loadUserDataFromResult COMPLETE');
      return true;
    } catch (error) {
      console.error('[Instagram] loadUserDataFromResult error:', error);
      setState(prev => ({ ...prev, isConnected: false, error: 'Failed to process connection' }));
      return false;
    }
  }, [saveConnection]);

  // Function to complete connection after OAuth callback
  const completeConnection = useCallback(async (result: InstagramLoginResult) => {
    console.log('[Instagram] completeConnection called, delegating to loadUserDataFromResult');
    await loadUserDataFromResult(result);
    // Don't return the boolean result since this function should return void
  }, [loadUserDataFromResult]);

  const disconnectInstagram = useCallback(async () => {
    try {
      await InstagramSDKManager.logout();
      
      setState({
        isConnected: false,
        isConnecting: false,
        userInfo: null,
        businessAccountId: null,
        accessToken: null,
        error: null,
      });

      clearConnection();

      toast({
        title: "Instagram Disconnected",
        description: "Your Instagram account has been disconnected.",
      });
    } catch (error) {
      console.error('[Instagram] Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Instagram. Please try again.",
        variant: "destructive"
      });
    }
  }, [clearConnection]);

  const refreshConnection = useCallback(async () => {
    if (!state.isConnected || !state.accessToken) return;

    try {
      setState(prev => ({ ...prev, isConnecting: true }));

      // Refresh user info
      const userInfo = await InstagramSDKManager.getBusinessAccount(state.accessToken);
      
      setState(prev => ({
        ...prev,
        userInfo: {
          ...userInfo,
          account_type: 'BUSINESS'
        } as InstagramUser,
      }));

      if (user) {
        saveConnection({
          userInfo: {
            ...userInfo,
            account_type: 'BUSINESS'
          } as InstagramUser,
          businessAccountId: userInfo.id,
          accessToken: state.accessToken,
        });
      }
    } catch (error) {
      console.error('[Instagram] Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh Instagram connection.",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnected, state.accessToken, user, saveConnection]);

  const sendMessage = useCallback(async (recipientId: string, message: string): Promise<boolean> => {
    if (!state.isConnected || !state.accessToken) {
      toast({
        title: "Instagram Not Connected",
        description: "Please connect your Instagram account first.",
        variant: "destructive"
      });
      return false;
    }

    try {
      await InstagramSDKManager.sendMessage(state.accessToken, {
        text: message,
        recipient_id: recipientId
      });

      toast({
        title: "Message Sent! 📩",
        description: "Your Instagram message has been sent successfully.",
      });

      return true;
    } catch (error) {
      console.error('[Instagram] Send message error:', error);
      toast({
        title: "Message Failed",
        description: "Failed to send Instagram message. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [state.isConnected, state.accessToken]);

  const contextValue: InstagramConnectionContextType = {
    ...state,
    connectInstagram,
    disconnectInstagram,
    refreshConnection,
    sendMessage,
    completeConnection,
  };

  return (
    <InstagramConnectionContext.Provider value={contextValue}>
      {children}
    </InstagramConnectionContext.Provider>
  );
}
