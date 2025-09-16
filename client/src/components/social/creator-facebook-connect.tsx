import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FacebookSDKManager, FacebookUser, FacebookPage, FacebookLoginResult } from "@/lib/facebook";

export default function CreatorFacebookConnect() {
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
      setIsConnected(false);
      setUserInfo(null);
      setPages([]);
      setSelectedPage(null);
      setPermissionStatus({});
    }
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
          setIsConnected(false);
          setUserInfo(null);
          setPages([]);
          setSelectedPage(null);
        }
      });
    } catch (error) {
      console.error('[Creator FB] Error in loadUserInfo:', error);
      setIsConnected(false);
      setUserInfo(null);
      setPages([]);
      setSelectedPage(null);
    }
  };

  const loadPages = async () => {
    try {
      const loadedPages = await FacebookSDKManager.getUserPages();
      setPages(loadedPages);
      
      if (loadedPages.length > 0) {
        // Auto-select first page or previously selected page
        const savedPageId = localStorage.getItem('fandomly_selected_facebook_page_creator');
        let pageToSelect = loadedPages.find((page: FacebookPage) => page.id === savedPageId) || loadedPages[0];
        
        setSelectedPage(pageToSelect);
        if (pageToSelect) {
          localStorage.setItem('fandomly_selected_facebook_page_creator', pageToSelect.id);
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

        // Load pages after successful login
        loadPages();

        // Check if any important permissions were denied
        const importantPermissions = ['public_profile', 'email', 'pages_show_list'];
        const deniedImportant = result.deniedScopes?.filter(scope => 
          importantPermissions.includes(scope)
        ) || [];

        if (deniedImportant.length > 0) {
          toast({
            title: "Limited Access",
            description: `Connected but some permissions were denied: ${deniedImportant.join(', ')}. Some features may not work properly.`,
            variant: "destructive",
            duration: 6000
          });
        } else {
          toast({
            title: "Facebook Connected! 🎉",
            description: "Successfully connected to Facebook for creator campaigns.",
            duration: 4000
          });
        }
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
      setIsConnected(false);
      setUserInfo(null);
      setPages([]);
      setSelectedPage(null);
      setPermissionStatus({});
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

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center">
          <Facebook className="h-4 w-4 mr-2 text-blue-500" />
          Facebook Creator Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && userInfo ? (
          <div className="space-y-3">
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

            {/* Selected Page Info */}
            {selectedPage && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Facebook className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{selectedPage.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <Users className="h-3 w-3" />
                        <span>{selectedPage.fan_count || 0} followers</span>
                        <span>•</span>
                        <span>{selectedPage.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Permission Status */}
            {permissionStatus.deniedScopes && permissionStatus.deniedScopes.length > 0 && (
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Limited Permissions</p>
                    <p className="text-xs text-yellow-300">
                      Some permissions denied: {permissionStatus.deniedScopes.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Ready to manage creator campaigns!</p>
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
              <p className="text-sm text-white font-medium mb-1">Connect Facebook</p>
              <p className="text-xs text-gray-400">Manage pages and campaigns</p>
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
                Connect to manage your Facebook pages and campaigns
              </p>
              <p className="text-xs text-gray-600">
                Required: Public profile, Email, Pages access
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}