import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import FacebookSDK, { type FacebookUser, type FacebookPage } from '@/lib/facebook';
import { socialManager } from '@/lib/social-integrations';
import { useToast } from './use-toast';

export interface FacebookConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  user: FacebookUser | null;
  pages: FacebookPage[];
  totalFollowers: number;
  error: string | null;
}

export function useFacebook() {
  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<FacebookConnectionState>({
    isConnected: false,
    isLoading: false,
    user: null,
    pages: [],
    totalFollowers: 0,
    error: null
  });

  // Connect to Facebook
  const connectMutation = useMutation({
    mutationFn: async () => {
      setConnectionState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use the social manager to connect Facebook account
      const socialAccount = await socialManager.connectAccount('facebook');
      
      if (!socialAccount) {
        throw new Error('Failed to connect Facebook account');
      }

      // Get detailed user info and pages using the access token
      const userInfo = await FacebookSDK.getUserInfo(socialAccount.accessToken!);
      const pages = await FacebookSDK.getUserPages(socialAccount.accessToken!);

      return {
        socialAccount,
        userInfo,
        pages
      };
    },
    onSuccess: (data) => {
      setConnectionState({
        isConnected: true,
        isLoading: false,
        user: data.userInfo,
        pages: data.pages,
        totalFollowers: data.socialAccount.followers,
        error: null
      });

      toast({
        title: "Facebook Connected",
        description: `Connected to Facebook with ${data.socialAccount.followers} total followers across ${data.pages.length} pages.`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      setConnectionState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect to Facebook'
      }));

      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Facebook. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Disconnect from Facebook
  const disconnect = useCallback(async () => {
    try {
      await FacebookSDK.logout();
      setConnectionState({
        isConnected: false,
        isLoading: false,
        user: null,
        pages: [],
        totalFollowers: 0,
        error: null
      });

      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect from Facebook.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Check current Facebook login status
  const checkLoginStatus = useCallback(async () => {
    try {
      const status = await FacebookSDK.getLoginStatus();
      
      if (status.isLoggedIn && status.accessToken) {
        const userInfo = await FacebookSDK.getUserInfo(status.accessToken);
        const pages = await FacebookSDK.getUserPages(status.accessToken);
        
        let totalFollowers = 0;
        for (const page of pages) {
          const followers = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
          totalFollowers += followers;
        }

        setConnectionState({
          isConnected: true,
          isLoading: false,
          user: userInfo,
          pages,
          totalFollowers,
          error: null
        });
      }
    } catch (error: any) {
      console.error('Error checking Facebook login status:', error);
    }
  }, []);

  // Refresh Facebook data
  const refreshData = useMutation({
    mutationFn: async () => {
      if (!connectionState.isConnected || !connectionState.user) {
        throw new Error('Not connected to Facebook');
      }

      const status = await FacebookSDK.getLoginStatus();
      if (!status.isLoggedIn || !status.accessToken) {
        throw new Error('Facebook session expired');
      }

      const pages = await FacebookSDK.getUserPages(status.accessToken);
      let totalFollowers = 0;
      
      for (const page of pages) {
        const followers = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
        totalFollowers += followers;
      }

      return { pages, totalFollowers };
    },
    onSuccess: (data) => {
      setConnectionState(prev => ({
        ...prev,
        pages: data.pages,
        totalFollowers: data.totalFollowers
      }));

      toast({
        title: "Data Refreshed",
        description: `Updated follower count: ${data.totalFollowers} total followers across ${data.pages.length} pages.`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh Facebook data.",
        variant: "destructive"
      });
    }
  });

  return {
    connectionState,
    connect: connectMutation.mutate,
    disconnect,
    checkLoginStatus,
    refreshData: refreshData.mutate,
    isConnecting: connectMutation.isPending,
    isRefreshing: refreshData.isPending
  };
}

export default useFacebook;