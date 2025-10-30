import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { FacebookSDK, FacebookUser, FacebookPage } from "@/lib/facebook";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FacebookConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  userInfo: FacebookUser | null;
  connectedPages: FacebookPage[];
  selectedPage: FacebookPage | null;
}

interface FacebookConnectionContextType extends FacebookConnectionState {
  connectFacebook: () => Promise<void>;
  disconnectFacebook: () => Promise<void>;
  selectPage: (page: FacebookPage) => Promise<void>;
  refreshConnection: () => Promise<void>;
}

const FacebookConnectionContext = createContext<FacebookConnectionContextType | undefined>(undefined);

export function FacebookConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FacebookConnectionState>({
    isConnected: false,
    isConnecting: false,
    userInfo: null,
    connectedPages: [],
    selectedPage: null,
  });
  
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const reinitForCreator = useCallback(async () => {
    try {
      const defaults = (window as any).__FB_DEFAULTS__;
      const reinit = (window as any).reinitializeFacebookApp;
      if (!defaults || !reinit) return;
      const appId = defaults.CREATOR_APP_ID || "4233782626946744"; // Creator App ID
      reinit(appId);
      await new Promise((r) => setTimeout(r, 120));
    } catch {}
  }, []);

  useEffect(() => {
    // Wait for user data to load before checking user type
    if (isLoading) {
      return;
    }

    // Only initialize Facebook for authenticated creator users
    if (!user || user.userType !== 'creator') {
      return;
    }

    // Register a basic statusChangeCallback for creators
    const statusChangeCallback = (response: any) => {
      try {
        console.log('[Creator FB] statusChangeCallback ->', response?.status);
        if (response && response.status === 'connected' && response.authResponse?.accessToken) {
          const token = response.authResponse.accessToken;
          loadUserDataFromToken(token).catch((error) => {
            console.error('[Creator FB] statusChangeCallback load error:', error);
            setState(prev => ({ ...prev, isConnected: false }));
          });
        } else {
          setState(prev => ({ ...prev, isConnected: false, userInfo: null, connectedPages: [], selectedPage: null }));
        }
      } catch (error) {
        console.error('[Creator FB] statusChangeCallback error:', error);
        setState(prev => ({ ...prev, isConnected: false }));
      }
    };

    (window as any).handleCreatorFacebookLoginStatus = statusChangeCallback;

    console.log('[Creator FB] Creator user detected - Facebook provider ready');
  }, [user, isLoading]);

  const checkConnectionStatus = useCallback(async () => {
    try {
      console.log('[FB] checkConnectionStatus');
      // First, check status without reinitializing (per FB docs)
      if (typeof window !== 'undefined' && (window as any).FB && typeof (window as any).FB.getLoginStatus === 'function') {
        await new Promise<void>((resolve) => {
          (window as any).FB.getLoginStatus((response: any) => {
            console.log('[FB] getLoginStatus ->', response?.status);
            if (response?.status === 'connected' && response.authResponse?.accessToken) {
              loadUserDataFromToken(response.authResponse.accessToken)
                .catch((error) => {
                  console.error('[FB] getLoginStatus load error:', error);
                  setState(prev => ({ ...prev, isConnected: false }));
                })
                .finally(() => resolve());
            } else {
              setState(prev => ({ ...prev, isConnected: false, userInfo: null, connectedPages: [], selectedPage: null }));
              resolve();
            }
          });
        });
      } else {
        // SDK wrapper fallback
        const status = await FacebookSDK.getLoginStatus();
        console.log('[FB] wrapper getLoginStatus ->', status?.status);
        if (status.isLoggedIn && status.accessToken) {
          await loadUserDataFromToken(status.accessToken);
        } else {
          setState(prev => ({ ...prev, isConnected: false, userInfo: null, connectedPages: [], selectedPage: null }));
        }
      }
    } catch (error) {
      console.error('[FB] checkConnectionStatus error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  const loadUserDataFromToken = useCallback(async (accessToken: string) => {
    try {
      console.log('[Creator FB] loadUserDataFromToken start with token:', accessToken?.substring(0, 10) + '...');
      
      console.log('[Creator FB] calling getUserInfo...');
      const facebookUser = await FacebookSDK.getUserInfo(accessToken);
      console.log('[Creator FB] getUserInfo result:', facebookUser ? 'SUCCESS' : 'NULL');
      
      if (facebookUser) {
        console.log('[Creator FB] user OK ->', facebookUser?.id);
        
        console.log('[Creator FB] calling getUserPages...');
        const userPages = await FacebookSDK.getUserPages(accessToken);
        console.log('[Creator FB] getUserPages result:', userPages?.length || 0, 'pages');
        
        const savedPageId = localStorage.getItem('fandomly_selected_facebook_page_creator');
        const selectedPage = savedPageId ? userPages.find((page: any) => page.id === savedPageId) || userPages[0] : userPages[0];
        
        console.log('[Creator FB] setting state with connected=true, pages:', userPages?.length);
        setState(prev => ({ ...prev, isConnected: true, userInfo: facebookUser, connectedPages: userPages, selectedPage: selectedPage || null }));
        
        console.log('[Creator FB] loadUserDataFromToken COMPLETE');
        return userPages.length;
      } else {
        console.log('[Creator FB] loadUserDataFromToken - no user data returned');
        setState(prev => ({ ...prev, isConnected: false }));
        return 0;
      }
    } catch (error) {
      console.error('[Creator FB] loadUserDataFromToken error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      return 0;
    }
  }, []);

  const connectFacebook = useCallback(async () => {
    if (state.isConnecting) return;
    
    console.log('[Creator FB] connectFacebook called, current state.isConnected:', state.isConnected);
    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      if (!window.FB || typeof window.FB.login !== 'function') {
        await reinitForCreator();
      }
      if (!window.FB || typeof window.FB.login !== 'function') {
        throw new Error('Facebook SDK not ready');
      }

      // Ensure correct app id before login only if different
      try {
        const defaults = (window as any).__FB_DEFAULTS__;
        const reinit = (window as any).reinitializeFacebookApp;
        const current = (window as any).__FB_CURRENT_APP_ID__;
        if (defaults?.CREATOR_APP_ID && defaults?.FAN_APP_ID && reinit) {
          const desired = user?.userType === 'creator' ? defaults.CREATOR_APP_ID : defaults.FAN_APP_ID;
          console.log('[FB] current appId:', current, 'desired:', desired);
          if (current !== desired) {
            console.log('[FB] reinitializing with desired appId:', desired);
            reinit(desired);
          }
        }
      } catch {}

      const scopes = user?.userType === 'creator'
        ? 'public_profile,email,pages_show_list,business_management,instagram_basic,pages_read_engagement'
        : 'public_profile,email';

      console.log('[FB] launching FB.login with scopes:', scopes);
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };
        
        // Timeout to prevent stuck "Connecting..." state
        const timeout = setTimeout(() => {
          console.warn('[FB] FB.login timeout - forcing resolve');
          toast({ title: 'Connection Timeout', description: 'Facebook login took too long. Please try again.', variant: 'destructive' });
          done();
        }, 15000);
        
        window.FB.login(function(response: any) {
          try {
            console.log('[FB] FB.login callback status:', response?.status);
            if (response && response.status === 'connected' && response.authResponse?.accessToken) {
              const token = response.authResponse.accessToken;
              loadUserDataFromToken(token)
                .then(() => {
                  toast({ title: 'Facebook Connected Successfully! 🎉', description: 'Connected to Facebook and loaded your pages.', duration: 4000 });
                })
                .catch((err) => {
                  console.error('[FB] FB.login handler error:', err);
                  toast({ title: 'Connection Error', description: 'Could not complete Facebook login', variant: 'destructive' });
                })
                .finally(() => {
                  clearTimeout(timeout);
                  done();
                });
            } else {
              toast({ title: 'Connection Failed', description: 'Please authorize access', variant: 'destructive' });
              clearTimeout(timeout);
              done();
            }
          } catch (err) {
            console.error('[FB] FB.login handler error:', err);
            toast({ title: 'Connection Error', description: 'Could not complete Facebook login', variant: 'destructive' });
            clearTimeout(timeout);
            done();
          }
        }, { scope: scopes });
      });
    } catch (error) {
      console.error('Facebook connection error (Context):', error);
      toast({ title: 'Connection Error', description: (error as any)?.message || 'An error occurred while connecting to Facebook.', variant: 'destructive' });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnecting, loadUserDataFromToken, toast, reinitForCreator, user?.userType]);

  const disconnectFacebook = useCallback(async () => {
    try {
      await FacebookSDK.logout();
      localStorage.removeItem('fandomly_selected_facebook_page');
      setState({ isConnected: false, isConnecting: false, userInfo: null, connectedPages: [], selectedPage: null });
      toast({ title: 'Facebook Disconnected', description: 'Your Facebook account has been disconnected.' });
    } catch (error) {
      console.error('Error disconnecting Facebook (Context):', error);
      toast({ title: 'Disconnection Error', description: 'An error occurred while disconnecting.', variant: 'destructive' });
    }
  }, [toast]);

  const selectPage = useCallback(async (page: FacebookPage) => {
    try {
      if ((page as any).access_token) {
        const followerCount = await FacebookSDK.getPageFollowerCount(page.id, (page as any).access_token);
        const engagementData = await FacebookSDK.getPageEngagementData(page.id, (page as any).access_token);
        const enhancedPage = { ...page, followers_count: followerCount || (page as any).followers_count || (page as any).fan_count, engagement_data: engagementData } as FacebookPage & any;
        setState(prev => ({ ...prev, selectedPage: enhancedPage }));
        toast({ title: 'Facebook Page Selected', description: `Now using ${page.name}` });
      } else {
        setState(prev => ({ ...prev, selectedPage: page }));
      }
    } catch (error) {
      console.error('Error selecting Facebook page (Context):', error);
      setState(prev => ({ ...prev, selectedPage: page }));
    }
  }, [toast]);

  const contextValue: FacebookConnectionContextType = {
    ...state,
    connectFacebook,
    disconnectFacebook,
    selectPage,
    refreshConnection: checkConnectionStatus,
  };

  return (
    <FacebookConnectionContext.Provider value={contextValue}>
      {children}
    </FacebookConnectionContext.Provider>
  );
}

export function useFacebookConnection() {
  const context = useContext(FacebookConnectionContext);
  if (context === undefined) {
    throw new Error('useFacebookConnection must be used within a FacebookConnectionProvider');
  }
  return context;
}