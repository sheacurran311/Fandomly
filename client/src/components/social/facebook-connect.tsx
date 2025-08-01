import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Facebook, Check, AlertCircle, ExternalLink, Loader2,
  Users, Heart, TrendingUp, Settings
} from "lucide-react";
import { facebookSDK, type FacebookUserData, type FacebookPageData } from "@/lib/facebook-sdk";
import { useToast } from "@/hooks/use-toast";

interface FacebookAccount {
  type: 'personal' | 'page';
  id: string;
  name: string;
  email?: string;
  followers: number;
  verified: boolean;
  profileImage: string;
  accessToken?: string;
  category?: string;
}

interface FacebookConnectProps {
  onAccountConnected?: (account: FacebookAccount) => void;
  onAccountDisconnected?: () => void;
  showMetrics?: boolean;
}

export default function FacebookConnect({ 
  onAccountConnected, 
  onAccountDisconnected,
  showMetrics = true 
}: FacebookConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<FacebookAccount | null>(null);
  const [availablePages, setAvailablePages] = useState<FacebookPageData[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [showPageSelection, setShowPageSelection] = useState(false);
  const { toast } = useToast();

  // Check if user is already logged in on component mount
  useEffect(() => {
    checkExistingLogin();
  }, []);

  const checkExistingLogin = async () => {
    try {
      const loginStatus = await facebookSDK.getLoginStatus();
      if (loginStatus.status === 'connected') {
        await handleSuccessfulLogin();
      }
    } catch (error) {
      console.error('Error checking Facebook login status:', error);
    }
  };

  const handleSuccessfulLogin = async () => {
    try {
      const [userData, pagesData] = await Promise.all([
        facebookSDK.getUserData(),
        facebookSDK.getUserPages()
      ]);

      // Set personal account as default
      const personalAccount: FacebookAccount = {
        type: 'personal',
        id: userData.id,
        name: userData.name,
        email: userData.email,
        followers: userData.followers_count || 0,
        verified: false,
        profileImage: userData.picture?.data?.url || '',
      };

      setConnectedAccount(personalAccount);
      setAvailablePages(pagesData);
      
      if (pagesData.length > 0) {
        setShowPageSelection(true);
      }

      onAccountConnected?.(personalAccount);

      toast({
        title: "Facebook Connected",
        description: `Successfully connected as ${userData.name}`,
      });

    } catch (error) {
      console.error('Error fetching Facebook user data:', error);
      toast({
        title: "Connection Error",
        description: "Failed to fetch Facebook account information",
        variant: "destructive"
      });
    }
  };

  const connectFacebook = async () => {

    setIsConnecting(true);
    try {
      const loginResponse = await facebookSDK.login();
      
      if (loginResponse.status === 'connected') {
        await handleSuccessfulLogin();
      } else {
        toast({
          title: "Connection Failed",
          description: "Facebook login was cancelled or failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Facebook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const selectPage = async (pageId: string) => {
    const selectedPage = availablePages.find(page => page.id === pageId);
    if (!selectedPage) return;

    const pageAccount: FacebookAccount = {
      type: 'page',
      id: selectedPage.id,
      name: selectedPage.name,
      followers: selectedPage.fan_count || 0,
      verified: false,
      profileImage: selectedPage.picture?.data?.url || '',
      accessToken: selectedPage.access_token,
      category: selectedPage.category,
    };

    setConnectedAccount(pageAccount);
    setSelectedPageId(pageId);
    setShowPageSelection(false);
    onAccountConnected?.(pageAccount);

    toast({
      title: "Page Selected",
      description: `Now using ${selectedPage.name} page`,
    });
  };

  const disconnectFacebook = async () => {
    try {
      await facebookSDK.logout();
      setConnectedAccount(null);
      setAvailablePages([]);
      setSelectedPageId('');
      setShowPageSelection(false);
      onAccountDisconnected?.();

      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook",
      });
    } catch (error) {
      console.error('Facebook logout error:', error);
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect from Facebook",
        variant: "destructive"
      });
    }
  };

  // Facebook SDK integration available

  return (
    <div className="space-y-4">
      <Card className={`bg-white/10 border-white/20 transition-all duration-300 ${
        connectedAccount ? 'border-blue-500/30 bg-blue-500/5' : 'hover:bg-white/15'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">Facebook</CardTitle>
                {connectedAccount && (
                  <p className="text-sm text-gray-300">
                    {connectedAccount.name} ({connectedAccount.type})
                  </p>
                )}
              </div>
            </div>
            {connectedAccount && (
              <Badge className="bg-blue-600 text-white">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Connect your Facebook account or page to track followers and engagement
          </p>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-white text-sm font-medium">Benefits:</p>
            <ul className="text-xs text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-brand-primary rounded-full" />
                Page and profile management
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-brand-primary rounded-full" />
                Follower and engagement tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-brand-primary rounded-full" />
                Content performance insights
              </li>
            </ul>
          </div>

          {/* Connection Stats */}
          {connectedAccount && showMetrics && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-white font-semibold">
                  <Users className="h-3 w-3" />
                  {connectedAccount.followers.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">
                  {connectedAccount.type === 'page' ? 'Page Likes' : 'Friends'}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-400 font-semibold">
                  <Check className="h-3 w-3" />
                  Active
                </div>
                <p className="text-xs text-gray-400">Status</p>
              </div>
            </div>
          )}

          {/* Page Selection */}
          {showPageSelection && availablePages.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <p className="text-white text-sm font-medium">Select a Page (Optional):</p>
              <div className="grid gap-2 max-h-32 overflow-y-auto">
                {availablePages.map((page) => (
                  <Button
                    key={page.id}
                    variant="outline"
                    size="sm"
                    onClick={() => selectPage(page.id)}
                    className="justify-start border-white/20 text-white hover:bg-white/10"
                  >
                    {page.name}
                    {page.fan_count && (
                      <Badge variant="secondary" className="ml-auto">
                        {page.fan_count.toLocaleString()} likes
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPageSelection(false)}
                className="text-gray-400 hover:text-white"
              >
                Use Personal Account
              </Button>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {!connectedAccount ? (
              <Button
                onClick={connectFacebook}
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Facebook className="h-4 w-4 mr-2" />
                    Connect Facebook
                  </>
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={disconnectFacebook}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Disconnect
                </Button>
                {availablePages.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPageSelection(!showPageSelection)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.open(`https://facebook.com/${connectedAccount.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}