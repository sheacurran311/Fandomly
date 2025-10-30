import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { FacebookSDK, FacebookUser, FacebookPage } from "@/lib/facebook";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FanFacebookConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  userInfo: FacebookUser | null;
}

interface FanFacebookConnectionContextType extends FanFacebookConnectionState {
  connectFacebook: () => Promise<void>;
  disconnectFacebook: () => Promise<void>;
  refreshConnection: () => Promise<void>;
}

const FanFacebookConnectionContext = createContext<FanFacebookConnectionContextType | undefined>(undefined);

export function FanFacebookConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FanFacebookConnectionState>({
    isConnected: false,
    isConnecting: false,
    userInfo: null,
  });
  
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const reinitForFan = useCallback(async () => {
    try {
      const defaults = (window as any).__FB_DEFAULTS__;
      const reinit = (window as any).reinitializeFacebookApp;
      if (!defaults || !reinit) return;
      const appId = defaults.FAN_APP_ID || "4233782626946744"; // Fan App ID
      reinit(appId);
      await new Promise((r) => setTimeout(r, 120));
    } catch {}
  }, []);

  useEffect(() => {
    // Wait for user data to load before checking user type
    if (isLoading) {
      return;
    }

    // Only initialize Facebook for authenticated fan users
    if (!user || user.userType !== 'fan') {
      return;
    }

    // Register a basic statusChangeCallback for fans
    const statusChangeCallback = (response: any) => {
      try {
        console.log('[Fan FB] statusChangeCallback ->', response?.status);
        if (response && response.status === 'connected' && response.authResponse?.accessToken) {
          const token = response.authResponse.accessToken;
          loadUserDataFromToken(token).catch((error) => {
            console.error('[Fan FB] statusChangeCallback load error:', error);
            setState(prev => ({ ...prev, isConnected: false }));
          });
        } else {
          setState(prev => ({ ...prev, isConnected: false, userInfo: null }));
        }
      } catch (error) {
        console.error('[Fan FB] statusChangeCallback error:', error);
        setState(prev => ({ ...prev, isConnected: false }));
      }
    };

    (window as any).handleFanFacebookLoginStatus = statusChangeCallback;

    console.log('[Fan FB] Fan user detected - Facebook provider ready');
  }, [user, isLoading]);

  const loadUserDataFromToken = async (accessToken: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isConnecting: true }));
      
      console.log('[Fan FB] Loading user data...');
      const userInfo = await FacebookSDK.getUserInfo(accessToken);
      
      if (userInfo) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          userInfo,
        }));
        console.log('[Fan FB] User data loaded successfully');
      }
    } catch (error) {
      console.error('[Fan FB] Error loading user data:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        userInfo: null 
      }));
      toast({
        title: "Facebook Connection Error",
        description: "Failed to load Facebook user data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const connectFacebook = async (): Promise<void> => {
    if (state.isConnecting || !user || user.userType !== 'fan') return;

    try {
      setState(prev => ({ ...prev, isConnecting: true }));
      await reinitForFan();
      
      // Fan-specific permissions (no page management)
      const fanScopes = 'public_profile,email';
      
      const response = await FacebookSDK.login(fanScopes);
      
      if (response && response.success && response.accessToken) {
        await loadUserDataFromToken(response.accessToken);
        
        toast({
          title: "Facebook Connected",
          description: "Your Facebook account has been connected successfully!",
        });
      } else {
        throw new Error('Facebook login failed or was cancelled');
      }
    } catch (error) {
      console.error('[Fan FB] Connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        userInfo: null 
      }));
      
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Facebook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const disconnectFacebook = async (): Promise<void> => {
    try {
      await FacebookSDK.logout();
      setState({
        isConnected: false,
        isConnecting: false,
        userInfo: null,
      });
      
      toast({
        title: "Facebook Disconnected",
        description: "Your Facebook account has been disconnected.",
      });
    } catch (error) {
      console.error('[Fan FB] Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Facebook. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshConnection = async (): Promise<void> => {
    if (!user || user.userType !== 'fan') return;
    
    try {
      await reinitForFan();
      const loginStatus = await FacebookSDK.getLoginStatus();
      
      if (loginStatus.isLoggedIn && loginStatus.accessToken) {
        await loadUserDataFromToken(loginStatus.accessToken);
      } else {
        setState({
          isConnected: false,
          isConnecting: false,
          userInfo: null,
        });
      }
    } catch (error) {
      console.error('[Fan FB] Refresh error:', error);
      setState({
        isConnected: false,
        isConnecting: false,
        userInfo: null,
      });
    }
  };

  const contextValue: FanFacebookConnectionContextType = {
    ...state,
    connectFacebook,
    disconnectFacebook,
    refreshConnection,
  };

  return (
    <FanFacebookConnectionContext.Provider value={contextValue}>
      {children}
    </FanFacebookConnectionContext.Provider>
  );
}

export function useFanFacebookConnection(): FanFacebookConnectionContextType {
  const context = useContext(FanFacebookConnectionContext);
  if (context === undefined) {
    throw new Error('useFanFacebookConnection must be used within a FanFacebookConnectionProvider');
  }
  return context;
}