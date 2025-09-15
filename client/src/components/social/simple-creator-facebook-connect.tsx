import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus, Users, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacebookUser {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  fan_count?: number;
}

export default function SimpleCreatorFacebookConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<FacebookUser | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const { toast } = useToast();

  // Initialize Facebook SDK when component mounts
  useEffect(() => {
    // Check if Facebook SDK is loaded
    if (typeof window !== 'undefined' && window.FB) {
      checkLoginStatus();
    } else {
      // Wait for FB SDK to load
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          checkLoginStatus();
        }
      }, 100);
    }
  }, []);

  const checkLoginStatus = () => {
    console.log('[Creator FB Simple] Checking login status...');
    window.FB.getLoginStatus((response: any) => {
      console.log('[Creator FB Simple] Login status:', response);
      if (response.status === 'connected' && response.authResponse?.accessToken) {
        loadUserInfo(response.authResponse.accessToken);
      } else {
        setIsConnected(false);
        setUserInfo(null);
        setPages([]);
        setSelectedPage(null);
      }
    });
  };

  const loadUserInfo = async (accessToken: string) => {
    try {
      console.log('[Creator FB Simple] Loading user info...');
      window.FB.api('/me', 'GET', { fields: 'name,email' }, (response: any) => {
        console.log('[Creator FB Simple] User info response:', response);
        if (response && !response.error) {
          setUserInfo({
            id: response.id,
            name: response.name,
            email: response.email
          });
          setIsConnected(true);
          loadPages(accessToken);
          console.log('[Creator FB Simple] User connected successfully');
        } else {
          console.error('[Creator FB Simple] Error loading user info:', response?.error);
          setIsConnected(false);
          setUserInfo(null);
        }
      });
    } catch (error) {
      console.error('[Creator FB Simple] Error in loadUserInfo:', error);
      setIsConnected(false);
      setUserInfo(null);
    }
  };

  const loadPages = async (accessToken: string) => {
    try {
      console.log('[Creator FB Simple] Loading pages...');
      window.FB.api('/me/accounts', 'GET', { fields: 'name,category,fan_count,access_token' }, (response: any) => {
        console.log('[Creator FB Simple] Pages response:', response);
        if (response && response.data && !response.error) {
          setPages(response.data);
          
          // Auto-select first page or previously selected page
          const savedPageId = localStorage.getItem('fandomly_selected_facebook_page_creator');
          if (savedPageId) {
            const savedPage = response.data.find((page: FacebookPage) => page.id === savedPageId);
            if (savedPage) {
              setSelectedPage(savedPage);
            } else if (response.data.length > 0) {
              setSelectedPage(response.data[0]);
              localStorage.setItem('fandomly_selected_facebook_page_creator', response.data[0].id);
            }
          } else if (response.data.length > 0) {
            setSelectedPage(response.data[0]);
            localStorage.setItem('fandomly_selected_facebook_page_creator', response.data[0].id);
          }
        } else {
          console.error('[Creator FB Simple] Error loading pages:', response?.error);
        }
      });
    } catch (error) {
      console.error('[Creator FB Simple] Error in loadPages:', error);
    }
  };

  const connectFacebook = async () => {
    console.log('[Creator FB Simple] Connecting to Facebook...');
    setIsConnecting(true);

    try {
      // Creator-specific permissions for page management
      const creatorScopes = 'public_profile,email,pages_show_list,business_management,instagram_basic,pages_read_engagement';
      
      window.FB.login((response: any) => {
        console.log('[Creator FB Simple] Login response:', response);
        
        if (response.authResponse && response.status === 'connected') {
          console.log('[Creator FB Simple] Login successful, loading user info...');
          loadUserInfo(response.authResponse.accessToken);
          toast({
            title: "Facebook Connected! 🎉",
            description: "Successfully connected to Facebook and loaded your pages.",
            duration: 4000
          });
        } else {
          console.log('[Creator FB Simple] Login failed or cancelled');
          toast({
            title: "Connection Failed",
            description: "Facebook login was cancelled or failed. Please try again.",
            variant: "destructive"
          });
        }
        
        setIsConnecting(false);
      }, { 
        scope: creatorScopes
      });
    } catch (error) {
      console.error('[Creator FB Simple] Connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const disconnectFacebook = () => {
    console.log('[Creator FB Simple] Disconnecting Facebook...');
    window.FB.logout(() => {
      setIsConnected(false);
      setUserInfo(null);
      setPages([]);
      setSelectedPage(null);
      localStorage.removeItem('fandomly_selected_facebook_page_creator');
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    });
  };

  const selectPage = (page: FacebookPage) => {
    setSelectedPage(page);
    localStorage.setItem('fandomly_selected_facebook_page_creator', page.id);
    toast({
      title: "Page Selected",
      description: `Now using "${page.name}" for campaigns.`,
    });
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center">
          <Facebook className="h-4 w-4 mr-2 text-blue-500" />
          Facebook Business
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && userInfo ? (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userInfo.name}</p>
                <p className="text-xs text-gray-400">Connected to Facebook</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            {/* Selected Page */}
            {selectedPage && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{selectedPage.name}</p>
                      <p className="text-xs text-gray-400">{selectedPage.category}</p>
                    </div>
                  </div>
                  {selectedPage.fan_count && (
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3 text-blue-400" />
                        <span className="text-xs text-blue-400">{selectedPage.fan_count.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Page Selection */}
                {pages.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Switch Page:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => selectPage(page)}
                          className={`w-full text-left p-2 rounded text-xs transition-colors ${
                            selectedPage?.id === page.id 
                              ? 'bg-brand-primary/20 text-brand-primary' 
                              : 'hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          {page.name} {page.fan_count ? `(${page.fan_count.toLocaleString()})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Ready for campaign management!</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                onClick={disconnectFacebook}
                data-testid="button-disconnect-facebook-creator"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Facebook className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Connect Facebook Business</p>
              <p className="text-xs text-gray-400">Manage pages and create campaigns</p>
            </div>
            
            <Button 
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              onClick={connectFacebook}
              disabled={isConnecting}
              data-testid="button-connect-facebook-creator"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Facebook'}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Connect your Facebook Business account to create and manage campaigns
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}