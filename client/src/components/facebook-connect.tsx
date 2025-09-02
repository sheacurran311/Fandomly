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
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = await FacebookSDK.getLoginStatus();
      if (status.isLoggedIn && status.accessToken) {
        setIsConnected(true);
        const user = await FacebookSDK.getUserInfo(status.accessToken);
        if (user) {
          setUserInfo(user);
          const userPages = await FacebookSDK.getUserPages(status.accessToken);
          setPages(userPages);
        }
      }
    } catch (error) {
      console.error('Error checking Facebook connection status:', error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const loginResult = await FacebookSDK.login();
      
      if (loginResult.success && loginResult.accessToken) {
        setIsConnected(true);
        
        // Get user info
        const user = await FacebookSDK.getUserInfo(loginResult.accessToken);
        if (user) {
          setUserInfo(user);
        }
        
        // Get user's Facebook pages
        const userPages = await FacebookSDK.getUserPages(loginResult.accessToken);
        setPages(userPages);
        
        toast({
          title: "Facebook Connected",
          description: `Connected successfully! Found ${userPages.length} page(s).`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: loginResult.error || "Failed to connect to Facebook",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook",
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
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-facebook-connect"
          >
            <Facebook className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect Facebook"}
          </Button>
          
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
          <p className="text-gray-300 text-sm">
            Connected as {userInfo.name}
          </p>
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