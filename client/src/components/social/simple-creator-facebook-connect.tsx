import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus, Users, BarChart3, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FacebookSDKManager, FacebookUser, FacebookPage, FacebookLoginResult } from "@/lib/facebook";

export default function SimpleCreatorFacebookConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<FacebookUser | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    grantedScopes?: string[];
    deniedScopes?: string[];
  }>({});
  const { toast } = useToast();

  // Initialize Facebook SDK when component mounts
  useEffect(() => {
    initializeFacebookForCreator();
  }, []);

  const initializeFacebookForCreator = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('creator');
      checkLoginStatus();
    } catch (error) {
      console.error('[Creator FB] Failed to initialize Facebook SDK:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to initialize Facebook. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const checkLoginStatus = async () => {
    try {
      const status = await FacebookSDKManager.getLoginStatus();
      if (status.isLoggedIn) {
        // Load user info and pages if connected
        await loadUserInfo();
      } else {
        setIsConnected(false);
        setUserInfo(null);
        setPages([]);
        setSelectedPage(null);
        setPermissionStatus({});
      }
    } catch (error) {
      console.error('[Creator FB] Error checking login status:', error);
      resetConnectionState();
    }
  };

  const resetConnectionState = () => {
    setIsConnected(false);
    setUserInfo(null);
    setPages([]);
    setSelectedPage(null);
    setPermissionStatus({});
  };

  const loadUserInfo = async () => {
    try {
      // Use FB API directly since we know we're connected
      window.FB.api('/me', 'GET', { fields: 'id,name,email,picture.width(200).height(200)' }, (response: any) => {
        if (response && !response.error) {
          setUserInfo({
            id: response.id,
            name: response.name,
            email: response.email,
            picture: response.picture
          });
          setIsConnected(true);
          loadPages();
        } else {
          console.error('[Creator FB] Error loading user info:', response?.error?.message || 'Unknown error');
          resetConnectionState();
        }
      });
    } catch (error) {
      console.error('[Creator FB] Error in loadUserInfo:', error);
      resetConnectionState();
    }
  };

  const loadPages = async () => {
    try {
      const loadedPages = await FacebookSDKManager.getUserPages();
      setPages(loadedPages);
      
      if (loadedPages.length > 0) {
        // Auto-select first page or previously selected page
        const savedPageId = localStorage.getItem('fandomly_selected_facebook_page_creator');
        let pageToSelect = null;
        
        if (savedPageId) {
          pageToSelect = loadedPages.find((page: FacebookPage) => page.id === savedPageId);
        }
        
        if (!pageToSelect) {
          pageToSelect = loadedPages[0];
        }
        
        setSelectedPage(pageToSelect);
        if (pageToSelect) {
          localStorage.setItem('fandomly_selected_facebook_page_creator', pageToSelect.id);
        }
      } else {
        // No pages found - could be permissions issue
        if (permissionStatus.deniedScopes?.includes('pages_show_list')) {
          toast({
            title: "Pages Access Denied",
            description: "Cannot load Facebook pages. You denied pages access permission.",
            variant: "destructive",
            duration: 6000
          });
        } else {
          toast({
            title: "No Pages Found",
            description: "No Facebook pages found. You may need to create a Facebook page first.",
            variant: "destructive",
            duration: 6000
          });
        }
      }
    } catch (error) {
      console.error('[Creator FB] Error loading pages:', error);
    }
  };

  const connectFacebook = async () => {
    setIsConnecting(true);

    try {
      const result: FacebookLoginResult = await FacebookSDKManager.secureLogin('creator');
      
      if (result.success && result.user) {
        setUserInfo(result.user);
        setIsConnected(true);
        setPermissionStatus({
          grantedScopes: result.grantedScopes,
          deniedScopes: result.deniedScopes
        });

        // Check if any important permissions were denied
        const importantPermissions = ['pages_show_list', 'business_management', 'pages_read_engagement'];
        const deniedImportant = result.deniedScopes?.filter(scope => 
          importantPermissions.includes(scope)
        ) || [];

        if (deniedImportant.length > 0) {
          toast({
            title: "Limited Business Access",
            description: `Connected but some business permissions were denied: ${deniedImportant.join(', ')}. Page management may be limited.`,
            variant: "destructive",
            duration: 8000
          });
        } else {
          toast({
            title: "Facebook Business Connected! 🎉",
            description: "Successfully connected to Facebook and loaded your business pages.",
            duration: 4000
          });
        }

        // Load pages after successful connection
        await loadPages();
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Facebook login was cancelled or failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Creator FB] Connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFacebook = async () => {
    try {
      await FacebookSDKManager.secureLogout();
      resetConnectionState();
      localStorage.removeItem('fandomly_selected_facebook_page_creator');
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    } catch (error) {
      console.error('[Creator FB] Error during logout:', error);
      toast({
        title: "Logout Error",
        description: "Error occurred while disconnecting. Please try again.",
        variant: "destructive"
      });
    }
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
                {userInfo.picture?.data?.url ? (
                  <img 
                    src={userInfo.picture.data.url} 
                    alt={userInfo.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userInfo.name}</p>
                <p className="text-xs text-gray-400">Connected to Facebook</p>
                {userInfo.email && (
                  <p className="text-xs text-gray-500">{userInfo.email}</p>
                )}
              </div>
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            {/* Permission Status */}
            {permissionStatus.deniedScopes && permissionStatus.deniedScopes.length > 0 && (
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Limited Business Permissions</p>
                    <p className="text-xs text-yellow-300">
                      Denied: {permissionStatus.deniedScopes.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Page */}
            {selectedPage ? (
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
                          data-testid={`button-select-page-${page.id}`}
                        >
                          {page.name} {page.fan_count ? `(${page.fan_count.toLocaleString()})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : pages.length === 0 ? (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-400 font-medium">No Pages Found</p>
                    <p className="text-xs text-red-300">
                      Create a Facebook page first or check permissions
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">
                {selectedPage ? 'Ready for campaign management!' : 'Need pages for campaigns'}
              </p>
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
            
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">
                Connect your Facebook Business account to create and manage campaigns
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Required: Public profile, Email, Page access</p>
                <p>Optional: Business management, Insights</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}