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

  // Load saved selected page from localStorage
  useEffect(() => {
    const savedPageId = localStorage.getItem('fandomly_selected_facebook_page');
    if (savedPageId && state.connectedPages.length > 0) {
      const savedPage = state.connectedPages.find(page => page.id === savedPageId);
      if (savedPage && savedPage.id !== state.selectedPage?.id) {
        setState(prev => ({ ...prev, selectedPage: savedPage }));
      }
    }
  }, [state.connectedPages]);

  // Save selected page to localStorage
  useEffect(() => {
    if (state.selectedPage) {
      localStorage.setItem('fandomly_selected_facebook_page', state.selectedPage.id);
    }
  }, [state.selectedPage]);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    try {
      console.log('Checking Facebook connection status (Context)...');
      const status = await FacebookSDK.getLoginStatus();
      
      if (status.isLoggedIn && status.accessToken) {
        await loadUserDataFromToken(status.accessToken);
      } else {
        setState(prev => ({
          ...prev,
          isConnected: false,
          userInfo: null,
          connectedPages: [],
          selectedPage: null,
        }));
      }
    } catch (error) {
      console.error('Error checking Facebook connection status (Context):', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  const loadUserDataFromToken = useCallback(async (accessToken: string) => {
    try {
      const facebookUser = await FacebookSDK.getUserInfo(accessToken);
      if (facebookUser) {
        console.log('Facebook user data loaded (Context):', facebookUser);
        
        const userPages = await FacebookSDK.getUserPages(accessToken);
        console.log(`Loaded ${userPages.length} Facebook pages (Context):`, userPages);
        
        // Get saved selected page or use first page
        const savedPageId = localStorage.getItem('fandomly_selected_facebook_page');
        const selectedPage = savedPageId ? 
          userPages.find(page => page.id === savedPageId) || userPages[0] : 
          userPages[0];
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          userInfo: facebookUser,
          connectedPages: userPages,
          selectedPage: selectedPage || null,
        }));
        
        return userPages.length;
      }
      return 0;
    } catch (error) {
      console.error('Error loading Facebook user data (Context):', error);
      setState(prev => ({ ...prev, isConnected: false }));
      return 0;
    }
  }, []);

  const connectFacebook = useCallback(async () => {
    if (state.isConnecting) return;
    
    setState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      console.log('Initiating Facebook connection (Context)...');
      
      // Use all enhanced permissions
      const loginResult = await FacebookSDK.login(
        'public_profile,email,pages_show_list,business_management,instagram_basic,pages_read_engagement'
      );
      
      if (loginResult.success && loginResult.accessToken) {
        const pageCount = await loadUserDataFromToken(loginResult.accessToken);
        
        toast({
          title: "Facebook Connected Successfully! 🎉",
          description: `Connected to Facebook with ${pageCount} page(s) found.`,
          duration: 4000,
        });
      } else {
        let errorMessage = "Failed to connect to Facebook";
        if (loginResult.error === 'not_authorized') {
          errorMessage = "Please authorize Fandomly to access your Facebook account";
        } else if (loginResult.error === 'unknown') {
          errorMessage = "Please log into Facebook first, then try connecting again";
        }
        
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Facebook connection error (Context):', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnecting, loadUserDataFromToken, toast]);

  const disconnectFacebook = useCallback(async () => {
    try {
      await FacebookSDK.logout();
      localStorage.removeItem('fandomly_selected_facebook_page');
      setState({
        isConnected: false,
        isConnecting: false,
        userInfo: null,
        connectedPages: [],
        selectedPage: null,
      });
      
      toast({
        title: "Facebook Disconnected",
        description: "Your Facebook account has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting Facebook (Context):', error);
      toast({
        title: "Disconnection Error",
        description: "An error occurred while disconnecting from Facebook.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const selectPage = useCallback(async (page: FacebookPage) => {
    try {
      // Get enhanced page data if access token is available
      if (page.access_token) {
        const followerCount = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
        const engagementData = await FacebookSDK.getPageEngagementData(page.id, page.access_token);
        
        const enhancedPage = { 
          ...page, 
          followers_count: followerCount || page.followers_count || page.fan_count,
          engagement_data: engagementData
        };
        
        setState(prev => ({ ...prev, selectedPage: enhancedPage }));
        
        toast({
          title: "Facebook Page Selected",
          description: `Now using ${page.name} with ${(followerCount || page.followers_count || page.fan_count || 0).toLocaleString()} followers`,
        });
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