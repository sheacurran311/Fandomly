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
  const { user } = useAuth();

  const reinitForCurrentUser = useCallback(async () => {
    try {
      const defaults = (window as any).__FB_DEFAULTS__;
      const reinit = (window as any).reinitializeFacebookApp;
      if (!defaults || !reinit) return;
      const appId = user?.userType === 'creator' ? defaults.CREATOR_APP_ID : defaults.FAN_APP_ID;
      reinit(appId);
      await new Promise((r) => setTimeout(r, 120));
    } catch {}
  }, [user]);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    try {
      await reinitForCurrentUser();
      console.log('[FB] checkConnectionStatus');
      const status = await FacebookSDK.getLoginStatus();
      console.log('[FB] getLoginStatus ->', status?.status);
      if (status.isLoggedIn && status.accessToken) {
        await loadUserDataFromToken(status.accessToken);
      } else {
        setState(prev => ({ ...prev, isConnected: false, userInfo: null, connectedPages: [], selectedPage: null }));
      }
    } catch (error) {
      console.error('[FB] checkConnectionStatus error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  const loadUserDataFromToken = useCallback(async (accessToken: string) => {
    try {
      console.log('[FB] loadUserDataFromToken start');
      const facebookUser = await FacebookSDK.getUserInfo(accessToken);
      if (facebookUser) {
        console.log('[FB] user OK ->', facebookUser?.id);
        const userPages = await FacebookSDK.getUserPages(accessToken);
        console.log('[FB] pages count ->', userPages?.length);
        const savedPageId = localStorage.getItem('fandomly_selected_facebook_page');
        const selectedPage = savedPageId ? userPages.find(page => page.id === savedPageId) || userPages[0] : userPages[0];
        setState(prev => ({ ...prev, isConnected: true, userInfo: facebookUser, connectedPages: userPages, selectedPage: selectedPage || null }));
        return userPages.length;
      }
      return 0;
    } catch (error) {
      console.error('[FB] loadUserDataFromToken error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      return 0;
    }
  }, []);

  const connectFacebook = useCallback(async () => {
    if (state.isConnecting) return;
    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      if (!window.FB || typeof window.FB.login !== 'function') {
        await reinitForCurrentUser();
      }
      if (!window.FB || typeof window.FB.login !== 'function') {
        throw new Error('Facebook SDK not ready');
      }

      try {
        const defaults = (window as any).__FB_DEFAULTS__;
        const reinit = (window as any).reinitializeFacebookApp;
        if (defaults?.CREATOR_APP_ID && defaults?.FAN_APP_ID && reinit) {
          const appId = user?.userType === 'creator' ? defaults.CREATOR_APP_ID : defaults.FAN_APP_ID;
          reinit(appId);
        }
      } catch {}

      const scopes = user?.userType === 'creator'
        ? 'public_profile,email,pages_show_list,business_management,instagram_basic,pages_read_engagement'
        : 'public_profile,email';

      console.log('[FB] launching FB.login with scopes:', scopes);
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };
        // Fallback timer: if callback never fires, check status and resolve
        const t = setTimeout(async () => {
          console.warn('[FB] FB.login timeout fallback - checking status');
          try {
            const st = await FacebookSDK.getLoginStatus();
            if (st?.isLoggedIn && st.accessToken) {
              await loadUserDataFromToken(st.accessToken);
              toast({ title: 'Facebook Connected', description: 'Loaded session from status.' });
            }
          } catch {}
          done();
        }, 8000);

        window.FB.login((response: any) => {
          (async () => {
            try {
              console.log('[FB] FB.login callback status:', response?.status);
              if (response && response.status === 'connected' && response.authResponse?.accessToken) {
                await loadUserDataFromToken(response.authResponse.accessToken);
                toast({ title: 'Facebook Connected Successfully! 🎉', description: 'Connected to Facebook and loaded your pages.', duration: 4000 });
              } else {
                toast({ title: 'Connection Failed', description: 'Please authorize access', variant: 'destructive' });
              }
            } catch (err) {
              console.error('[FB] FB.login handler error:', err);
              toast({ title: 'Connection Error', description: 'Could not complete Facebook login', variant: 'destructive' });
            } finally {
              clearTimeout(t);
              done();
            }
          })();
        }, { scope: scopes });
      });
    } catch (error) {
      console.error('Facebook connection error (Context):', error);
      toast({ title: 'Connection Error', description: (error as any)?.message || 'An error occurred while connecting to Facebook.', variant: 'destructive' });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnecting, loadUserDataFromToken, toast, reinitForCurrentUser, user?.userType]);

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