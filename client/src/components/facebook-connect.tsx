import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Users, TrendingUp, Check } from 'lucide-react';
import { FacebookSDK, type FacebookPage, type FacebookUser } from '@/lib/facebook';

interface FacebookConnectProps {
  onConnectionSuccess?: (pageData: FacebookPage) => void;
  className?: string;
}

export function FacebookConnect({ onConnectionSuccess, className }: FacebookConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<FacebookUser | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up global handler for Facebook login status (used by checkLoginState in HTML)
    (window as any).handleFacebookLoginStatus = handleFacebookResponse;
    
    // Parse Facebook XFBML elements after component mounts
    const parseXFBML = () => {
      if (window.FB && (window.FB as any).XFBML) {
        console.log('Parsing Facebook XFBML elements...');
        (window.FB as any).XFBML.parse();
      } else {
        // Retry after a short delay if FB SDK isn't ready yet
        setTimeout(parseXFBML, 1000);
      }
    };
    
    // Wait for Facebook SDK to load before parsing
    setTimeout(parseXFBML, 500);
    
    // Check connection status when component mounts
    checkConnectionStatus();
    
    // Also check for stored tokens from previous session
    const storedToken = FacebookSDK.getStoredAccessToken();
    const storedUserID = FacebookSDK.getStoredUserID();
    
    if (storedToken && storedUserID && FacebookSDK.isTokenValid()) {
      console.log('Found valid stored Facebook token');
      // Don't auto-set connected - let checkConnectionStatus handle it
      loadUserDataFromStoredToken(storedToken);
    }
    
    // Cleanup
    return () => {
      delete (window as any).handleFacebookLoginStatus;
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('Checking Facebook connection status...');
      const status = await FacebookSDK.getLoginStatus();
      console.log('Facebook connection status:', status);
      
      if (status.isLoggedIn && status.accessToken) {
        console.log('User is connected to Facebook');
        setIsConnected(true);
        await loadUserDataFromStoredToken(status.accessToken);
      } else {
        console.log('User is not connected to Facebook, status:', status.status);
        setIsConnected(false);
        setUserInfo(null);
        setPages([]);
        setSelectedPage(null);
      }
    } catch (error) {
      console.error('Error checking Facebook connection status:', error);
      setIsConnected(false);
    }
  };

  const loadUserDataFromStoredToken = async (accessToken: string) => {
    try {
      const user = await FacebookSDK.getUserInfo(accessToken);
      if (user) {
        setUserInfo(user);
        const userPages = await FacebookSDK.getUserPages(accessToken);
        setPages(userPages);
        console.log(`Loaded ${userPages.length} Facebook pages for user ${user.name}`);
      }
    } catch (error) {
      console.error('Error loading Facebook user data:', error);
      // If there's an error, the token might be invalid
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // First check if Facebook SDK is ready
      await FacebookSDK.waitForSDK();
      console.log('Facebook SDK ready, starting login...');
      
      // Use only the basic permissions we have access to
      const loginResult = await FacebookSDK.login('public_profile,email');
      console.log('Facebook login result (basic permissions):', loginResult);
      
      if (loginResult.success && loginResult.accessToken) {
        setIsConnected(true);
        await loadUserDataFromStoredToken(loginResult.accessToken);
        
        toast({
          title: "Facebook Connected",
          description: `Connected successfully! Found ${pages.length} page(s).`,
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
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook. Make sure you're logged into Facebook.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePageSelect = async (page: FacebookPage) => {
    setSelectedPage(page);
    
    // Get follower count for the selected page
    try {
      const followerCount = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
      const pageWithFollowers = { ...page, followers_count: followerCount };
      
      onConnectionSuccess?.(pageWithFollowers);
      
      toast({
        title: "Page Selected",
        description: `Connected to ${page.name} with ${followerCount.toLocaleString()} followers`,
      });
    } catch (error) {
      console.error('Error getting page follower count:', error);
      onConnectionSuccess?.(page);
    }
  };

  const handleFacebookResponse = async (response: any) => {
    console.log('Handling Facebook response:', response);
    
    if (response.status === 'connected' && response.authResponse) {
      setIsConnected(true);
      await loadUserDataFromStoredToken(response.authResponse.accessToken);
      
      toast({
        title: "Facebook Connected",
        description: `Connected successfully! Found ${pages.length} page(s).`,
      });
    } else if (response.status === 'not_authorized') {
      toast({
        title: "Authorization Required",
        description: "Please authorize Fandomly to access your Facebook account",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Facebook Login Required",
        description: "Please log into Facebook to continue",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await FacebookSDK.logout();
      setIsConnected(false);
      setUserInfo(null);
      setPages([]);
      setSelectedPage(null);
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Facebook",
      });
    } catch (error) {
      console.error('Facebook disconnect error:', error);
    }
  };

  if (!isConnected) {
    return (
      <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Facebook className="h-5 w-5 text-blue-400" />
            Connect Facebook Page
          </CardTitle>
          <p className="text-gray-300 text-sm">
            Connect your Facebook page to run social media campaigns and track engagement for your loyalty program.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Official Facebook Login Button */}
            <div 
              className="fb-login-button" 
              data-size="large"
              data-button-type="continue_with"
              data-layout="default"
              data-auto-logout-link="false"
              data-use-continue-as="true"
              data-scope="public_profile,email,pages_show_list,pages_read_engagement"
              data-onlogin="checkLoginState"
              data-testid="facebook-login-button"
              style={{minHeight: '40px', display: 'block'}}
            ></div>
            
            {/* Fallback if Facebook button doesn't render */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-facebook-connect-fallback"
            >
              <Facebook className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Facebook"}
            </Button>
            
            <div className="text-xs text-gray-400 text-center">
              Use either button above to connect your Facebook page
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <p>Required permissions:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Access to your Facebook pages</li>
              <li>Read page engagement metrics</li>
              <li>View follower counts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-400" />
            Facebook Connected
            <Check className="h-4 w-4 text-green-400" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="text-gray-300 border-gray-600 hover:bg-red-500/10"
            data-testid="button-facebook-disconnect"
          >
            Disconnect
          </Button>
        </CardTitle>
        {userInfo && (
          <div className="text-gray-300 text-sm space-y-1">
            <p>Connected as {userInfo.name}</p>
            {userInfo.email && <p className="text-xs">Email: {userInfo.email}</p>}
            <p className="text-xs">ID: {userInfo.id}</p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {pages.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-3">Select Your Page for Campaigns:</h4>
            <div className="space-y-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPage?.id === page.id
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-gray-600 hover:border-gray-500 bg-white/5'
                  }`}
                  onClick={() => handlePageSelect(page)}
                  data-testid={`card-facebook-page-${page.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium">{page.name}</h5>
                      <p className="text-gray-400 text-sm capitalize">{page.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {page.fan_count && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {page.fan_count.toLocaleString()}
                        </Badge>
                      )}
                      {selectedPage?.id === page.id && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedPage && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Campaign Ready</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your Facebook page "{selectedPage.name}" is connected and ready for social media campaigns.
            </p>
          </div>
        )}
        
        {pages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">
              No Facebook pages found. Make sure you're an admin of at least one Facebook page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FacebookConnect;