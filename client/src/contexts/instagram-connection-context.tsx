import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import InstagramSDKManager, { InstagramUser, InstagramLoginResult } from '@/lib/instagram';
import { toast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const [state, setState] = useState<InstagramConnectionState>({
    isConnected: false,
    isConnecting: false,
    userInfo: null,
    businessAccountId: null,
    accessToken: null,
    error: null,
  });

  // Load saved Instagram connection on mount
  useEffect(() => {
    const loadSavedConnection = () => {
      if (!user) return;

      try {
        const savedData = localStorage.getItem(`instagram_connection_${user.id}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setState(prev => ({
            ...prev,
            isConnected: true,
            userInfo: parsed.userInfo,
            businessAccountId: parsed.businessAccountId,
            accessToken: parsed.accessToken,
          }));
        }
      } catch (error) {
        console.error('[Instagram] Error loading saved connection:', error);
        // Clear invalid data
        localStorage.removeItem(`instagram_connection_${user.id}`);
      }
    };

    loadSavedConnection();
  }, [user]);

  const saveConnection = useCallback((data: {
    userInfo: InstagramUser;
    businessAccountId: string;
    accessToken: string;
  }) => {
    if (!user) return;

    try {
      localStorage.setItem(`instagram_connection_${user.id}`, JSON.stringify(data));
    } catch (error) {
      console.error('[Instagram] Error saving connection:', error);
    }
  }, [user]);

  const clearConnection = useCallback(() => {
    if (!user) return;

    try {
      localStorage.removeItem(`instagram_connection_${user.id}`);
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
      // This will redirect to Instagram OAuth, so we don't wait for the result here
      const result: InstagramLoginResult = await InstagramSDKManager.secureLogin('creator');
      
      console.log('[Instagram Context] secureLogin result:', result);
      
      // If we get here, it means there was an error (since successful login redirects)
      if (!result.success) {
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

  // Function to complete connection after OAuth callback
  const completeConnection = useCallback(async (result: InstagramLoginResult) => {
    console.log('[Instagram Context] completeConnection called with result:', {
      success: result.success,
      hasUser: !!result.user,
      hasAccessToken: !!result.accessToken,
      username: result.user?.username
    });

    if (!result.success || !result.user || !result.accessToken) {
      console.log('[Instagram Context] completeConnection - invalid result, skipping');
      return;
    }

    const connectionData = {
      userInfo: result.user,
      businessAccountId: result.user.id,
      accessToken: result.accessToken,
    };

    console.log('[Instagram Context] Updating state with connection data');
    setState(prev => {
      console.log('[Instagram Context] Previous state:', {
        isConnected: prev.isConnected,
        hasUserInfo: !!prev.userInfo
      });
      
      const newState = {
        ...prev,
        isConnected: true,
        userInfo: result.user!,
        businessAccountId: result.user!.id,
        accessToken: result.accessToken!,
        error: null,
        isConnecting: false,
      };
      
      console.log('[Instagram Context] New state:', {
        isConnected: newState.isConnected,
        hasUserInfo: !!newState.userInfo,
        username: newState.userInfo?.username
      });
      
      return newState;
    });

    saveConnection(connectionData);
    console.log('[Instagram Context] Connection data saved to localStorage');

    // Save Instagram Business Account to database
    try {
      console.log('[Instagram Context] Saving to database...');
      const response = await fetch('/api/creators/instagram-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramUserId: result.user.id,
          username: result.user.username,
          accessToken: result.accessToken,
          accountType: result.user.account_type || 'BUSINESS'
        })
      });
      
      if (response.ok) {
        console.log('[Instagram Context] Successfully saved to database');
      } else {
        console.error('[Instagram Context] Database save failed:', response.status);
      }
    } catch (dbError) {
      console.error('[Instagram Context] Error saving to database:', dbError);
      // Don't fail the connection for DB errors
    }
  }, [saveConnection]);

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
