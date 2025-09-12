import { useState, useEffect, useCallback } from "react";
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

export function useFacebookConnection() {
  const [state, setState] = useState<FacebookConnectionState>({
    isConnected: false,
    isConnecting: false,
    userInfo: null,
    connectedPages: [],
    selectedPage: null,
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Load Facebook connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    try {
      console.log('Checking unified Facebook connection status...');
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
      console.error('Error checking Facebook connection status:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  const loadUserDataFromToken = useCallback(async (accessToken: string) => {
    try {
      const facebookUser = await FacebookSDK.getUserInfo(accessToken);
      if (facebookUser) {
        console.log('Facebook user data loaded for unified state:', facebookUser);
        
        const userPages = await FacebookSDK.getUserPages(accessToken);
        console.log(`Loaded ${userPages.length} Facebook pages for unified state:`, userPages);
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          userInfo: facebookUser,
          connectedPages: userPages,
          selectedPage: userPages.length > 0 ? userPages[0] : null,
        }));
        
        return userPages.length;
      }
      return 0;
    } catch (error) {
      console.error('Error loading Facebook user data for unified state:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      return 0;
    }
  }, []);

  const connectFacebook = useCallback(async () => {
    if (state.isConnecting) return;
    
    setState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      console.log('Initiating unified Facebook connection...');
      
      // Use all your new permissions
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
      console.error('Unified Facebook connection error:', error);
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
      console.error('Error disconnecting Facebook:', error);
      toast({
        title: "Disconnection Error",
        description: "An error occurred while disconnecting from Facebook.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const selectPage = useCallback(async (page: FacebookPage) => {
    try {
      // Get enhanced page data if needed
      if (page.access_token) {
        const followerCount = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
        const engagementData = await FacebookSDK.getPageEngagementData(page.id, page.access_token);
        
        const enhancedPage = { 
          ...page, 
          followers_count: followerCount || page.followers_count,
          engagement_data: engagementData
        };
        
        setState(prev => ({ ...prev, selectedPage: enhancedPage }));
        
        toast({
          title: "Facebook Page Selected",
          description: `Now using ${page.name} with ${(followerCount || page.followers_count || 0).toLocaleString()} followers`,
        });
      } else {
        setState(prev => ({ ...prev, selectedPage: page }));
      }
    } catch (error) {
      console.error('Error selecting Facebook page:', error);
      setState(prev => ({ ...prev, selectedPage: page }));
    }
  }, [toast]);

  return {
    // State
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    userInfo: state.userInfo,
    connectedPages: state.connectedPages,
    selectedPage: state.selectedPage,
    
    // Actions
    connectFacebook,
    disconnectFacebook,
    selectPage,
    refreshConnection: checkConnectionStatus,
  };
}