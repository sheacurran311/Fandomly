import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import CreatorFacebookConnect from "@/components/social/creator-facebook-connect";
import CreatorInstagramConnect from "@/components/social/creator-instagram-connect";
import InstagramMessageTest from "@/components/social/instagram-message-test";
import InstagramWebhookSetup from "@/components/social/instagram-webhook-setup";
import { FacebookSDKManager, FacebookPage } from "@/lib/facebook";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Music, 
  Link as LinkIcon,
  Plus,
  Settings,
  Eye,
  Users,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Zap,
  Unlink,
  Video
} from "lucide-react";
import { TwitterSDKManager } from "@/lib/twitter";
import { socialManager } from "@/lib/social-integrations";

export default function CreatorSocial() {
  // Format follower counts: comma format below 10k, K-format at 10k+
  const formatFollowers = (num: number): string => {
    if (!num || num < 0) return '0';
    if (num >= 10000) {
      const val = num / 1000;
      const dec = val < 100 ? 1 : 0; // 10k-99.9k -> 1 decimal, 100k+ -> no decimals
      return `${val.toFixed(dec)}K`;
    }
    return num.toLocaleString();
  };
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Instagram connection state
  const { 
    isConnected: instagramConnected, 
    isConnecting: instagramConnecting,
    userInfo: instagramUserInfo,
    connectInstagram,
    disconnectInstagram
  } = useInstagramConnection();
  
  // Facebook connection state
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [isCheckingFacebookStatus, setIsCheckingFacebookStatus] = useState(true);
  const [showPageModal, setShowPageModal] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [twitterFollowers, setTwitterFollowers] = useState<number>(0);
  const [isCheckingTwitterStatus, setIsCheckingTwitterStatus] = useState(true);
  
  // TikTok connection state
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState<string | null>(null);
  const [tiktokFollowers, setTiktokFollowers] = useState<number>(0);
  const [isCheckingTiktokStatus, setIsCheckingTiktokStatus] = useState(true);

  // Check Facebook status, Twitter status, and TikTok status when user becomes available
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTwitterStatus();
      checkTiktokStatus();
      // Load saved active page ID from localStorage
      const savedActivePageId = localStorage.getItem('fandomly_active_facebook_page_id');
      if (savedActivePageId) {
        // We'll set this after pages are loaded in loadFacebookPages
      }
    }
  }, [user?.dynamicUserId]);

  const checkTwitterStatus = async () => {
    try {
      setIsCheckingTwitterStatus(true);
      
      // Fetch existing social connections from backend
      const response = await fetch('/api/social/accounts', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const connections = await response.json();
        console.log('[Creator Social] Existing connections:', connections);
        
        // Check if Twitter connection exists
        const twitterConnection = connections.find((conn: any) => conn.platform === 'twitter');
        if (twitterConnection) {
          console.log('[Creator Social] Found existing Twitter connection:', twitterConnection);
          setTwitterConnected(true);
          setTwitterHandle(twitterConnection.username || twitterConnection.displayName);
          setTwitterFollowers(twitterConnection.followers || 0);
        } else {
          console.log('[Creator Social] No Twitter connection found');
          setTwitterConnected(false);
          setTwitterHandle(null);
          setTwitterFollowers(0);
        }
      } else {
        console.warn('[Creator Social] Failed to fetch connections:', response.statusText);
        setTwitterConnected(false);
        setTwitterHandle(null);
      }
    } catch (error) {
      console.error('[Creator Social] Error checking Twitter status:', error);
      setTwitterConnected(false);
      setTwitterHandle(null);
    } finally {
      setIsCheckingTwitterStatus(false);
    }
  };

  const checkTiktokStatus = async () => {
    try {
      setIsCheckingTiktokStatus(true);
      // Check if TikTok connection exists in localStorage or API
      const savedTiktokData = localStorage.getItem('fandomly_tiktok_connection');
      if (savedTiktokData) {
        try {
          const tiktokData = JSON.parse(savedTiktokData);
          setTiktokConnected(true);
          setTiktokHandle(tiktokData.username);
          setTiktokFollowers(tiktokData.followers || 0);
        } catch {
          localStorage.removeItem('fandomly_tiktok_connection');
        }
      }
      
      // TODO: Add API call to check server-side TikTok connection status
      // This would be similar to checkTwitterStatus but for TikTok
    } catch (error) {
      console.error('Error checking TikTok status:', error);
      setTiktokConnected(false);
    } finally {
      setIsCheckingTiktokStatus(false);
    }
  };

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('creator');
      const status = await FacebookSDKManager.getLoginStatus();
      
      if (status.isLoggedIn) {
        setFacebookConnected(true);
        await loadFacebookPages();
      } else {
        setFacebookConnected(false);
        setFacebookPages([]);
        setActivePage(null); // Clear active page when not logged in
        localStorage.removeItem('fandomly_active_facebook_page_id'); // Clear saved page
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setFacebookConnected(false);
      setFacebookPages([]);
    } finally {
      setIsCheckingFacebookStatus(false);
    }
  };

  const connectTwitter = async () => {
    try {
      setTwitterConnecting(true);
      const result = await TwitterSDKManager.secureLogin('creator', user?.dynamicUserId || user?.id);
      if (result.success && result.user) {
        setTwitterConnected(true);
        setTwitterHandle(result.user.username);
        setTwitterFollowers(result.user.followersCount || 0);
        // Refresh connections to get latest data
        await checkTwitterStatus();
        toast({
          title: "X Connected! 🐦",
          description: `Connected @${result.user.username}`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Twitter login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Connection Error', description: e?.message || 'Failed to connect X', variant: 'destructive' });
    } finally {
      setTwitterConnecting(false);
    }
  };

  const disconnectTwitter = async () => {
    try {
      // Call backend to remove connection
      const response = await fetch('/api/social/twitter', {
        method: 'DELETE',
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setTwitterConnected(false);
        setTwitterHandle(null);
        setTwitterFollowers(0);
        toast({
          title: "X Disconnected",
          description: "Successfully disconnected from X",
          duration: 3000,
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Twitter disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from X. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const loadFacebookPages = async () => {
    try {
      const pages = await FacebookSDKManager.getUserPages();
      setFacebookPages(pages);
      
      // Handle active page reconciliation with localStorage persistence
      if (pages.length > 0) {
        const savedActivePageId = localStorage.getItem('fandomly_active_facebook_page_id');
        let pageToSet: FacebookPage | null = null;
        
        if (savedActivePageId) {
          // Try to find the saved page
          pageToSet = pages.find(page => page.id === savedActivePageId) || null;
        }
        
        if (!pageToSet && activePage) {
          // Check if current active page still exists
          pageToSet = pages.find(page => page.id === activePage.id) || null;
        }
        
        if (!pageToSet) {
          // Fall back to first page
          pageToSet = pages[0];
        }
        
        setActivePage(pageToSet);
        // Save to localStorage
        localStorage.setItem('fandomly_active_facebook_page_id', pageToSet.id);
        
        // Notify if we had to switch from a previously saved page
        if (savedActivePageId && pageToSet.id !== savedActivePageId) {
          toast({
            title: "Active Page Updated",
            description: `Your previous active page is no longer available. Switched to "${pageToSet.name}".`,
            duration: 4000
          });
        }
      } else {
        setActivePage(null);
        localStorage.removeItem('fandomly_active_facebook_page_id');
      }
    } catch (error) {
      console.error('Error loading Facebook pages:', error);
      setFacebookPages([]);
      setActivePage(null);
      localStorage.removeItem('fandomly_active_facebook_page_id');
    }
  };

  const connectTiktok = async () => {
    try {
      setTiktokConnecting(true);
      const authUrl = socialManager.getAuthUrl('tiktok');
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect TikTok. Please try again.',
        variant: 'destructive',
      });
      setTiktokConnecting(false);
    }
  };

  const disconnectTiktok = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('fandomly_tiktok_connection');
      setTiktokConnected(false);
      setTiktokHandle(null);
      setTiktokFollowers(0);
      
      // TODO: Add API call to disconnect TikTok on server side
      
      toast({
        title: "TikTok Disconnected",
        description: "Your TikTok account has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect TikTok. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const connectFacebook = async () => {
    setFacebookConnecting(true);
    try {
      const result = await FacebookSDKManager.secureLogin('creator');
      if (result.success) {
        setFacebookConnected(true);
        await loadFacebookPages();
        toast({
          title: "Facebook Connected! 🎉",
          description: "Successfully connected to Facebook for creator campaigns.",
          duration: 4000
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Facebook login was cancelled or failed.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
    } finally {
      setFacebookConnecting(false);
    }
  };

  const disconnectFacebook = async () => {
    try {
      await FacebookSDKManager.logoutFromFacebook();
      setFacebookConnected(false);
      setFacebookPages([]);
      setActivePage(null); // Clear active page on disconnect
      localStorage.removeItem('fandomly_active_facebook_page_id'); // Clear saved page
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    } catch (error) {
      console.error('Error during Facebook logout:', error);
      toast({
        title: "Logout Error", 
        description: "Error occurred while disconnecting. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Simplified: Using direct Facebook component instead of complex context

  // Load saved creator pages from backend
  // Note: In real app, use creatorId from user.creator.id
  // For brevity, fetch on mount and ignore errors
  // and show count in UI next to Facebook platform

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access social accounts.</div>
      </div>
    );
  }

  // Calculate dynamic stats
  const getConnectedPlatformsCount = () => {
    let count = 0;
    if (instagramConnected) count++;
    if (twitterConnected) count++;
    if (facebookConnected) count++;
    return count;
  };

  const getTotalFollowers = () => {
    let total = 0;
    if (instagramConnected && instagramUserInfo?.followers_count) {
      total += instagramUserInfo.followers_count;
    }
    if (twitterConnected) {
      total += twitterFollowers;
    }
    // Facebook page followers would be added here when available
    return total;
  };

  const getAverageEngagement = () => {
    if (!twitterConnected && !instagramConnected) return "0%";
    return "Active"; // For now, show Active when any platform is connected
  };

  // Get real Facebook and Instagram data, static data for other platforms
  const socialAccounts = [
    {
      platform: "Instagram",
      icon: Instagram,
      handle: instagramUserInfo ? `@${instagramUserInfo.username}` : "@aerialace_athletics",
      followers: instagramUserInfo ? 
        `${formatFollowers(instagramUserInfo.followers_count || 0)} Followers` : 
        "12.4K Followers",
      engagement: "8.2%",
      connected: instagramConnected,
      color: "text-pink-400",
      bgColor: "bg-pink-400/20"
    },
    {
      platform: "Twitter",
      icon: Twitter,
      handle: twitterConnected && twitterHandle ? `@${twitterHandle}` : '@yourhandle',
      followers: twitterConnected ? `${formatFollowers(twitterFollowers)} Followers` : "0 Followers",
      engagement: twitterConnected ? "Active" : "—",
      connected: twitterConnected,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20"
    },
    {
      platform: "TikTok",
      icon: Video,
      handle: tiktokConnected && tiktokHandle ? `@${tiktokHandle}` : '@yourhandle',
      followers: tiktokConnected ? `${formatFollowers(tiktokFollowers)} Followers` : "0 Followers",
      engagement: tiktokConnected ? "Active" : "—",
      connected: tiktokConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20"
    },
    {
      platform: "YouTube",
      icon: Youtube,
      handle: "Aerial Ace Athletics",
      followers: "6.7K Followers",
      engagement: "9.3%",
      connected: false,
      color: "text-red-400",
      bgColor: "bg-red-400/20"
    },
    // Facebook managed by state above
    {
      platform: "Facebook",
      icon: Facebook,
      handle: facebookConnected && activePage ? activePage.name : (facebookConnected ? "No active page" : "@your-page"),
      followers: facebookConnected && activePage?.followers_count ? 
        `${activePage.followers_count.toLocaleString()}` : "0",
      engagement: facebookConnected && activePage ? "Active" : (facebookConnected ? "Select page" : "Connect to view"), 
      connected: facebookConnected,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      isManaged: true // Flag to show it's managed separately
    }
  ];

  const automationRules = [
    {
      id: "1",
      name: "New Instagram Post",
      description: "Award 50 points when fans like and comment on new posts",
      active: true,
      triggered: 247
    },
    {
      id: "2",
      name: "Twitter Engagement",
      description: "Award 25 points for retweets and replies",
      active: true,
      triggered: 189
    },
    {
      id: "3",
      name: "TikTok Shares",
      description: "Award 75 points when fans share videos",
      active: false,
      triggered: 0
    }
  ];

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Social Accounts</h1>
              <p className="text-gray-400">
                Connect and manage your social media platforms for automated fan rewards.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Connect Platform
              </Button>
            </div>
          </div>

          {/* Connected Accounts Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{getConnectedPlatformsCount()}</div>
                <div className="text-sm text-gray-400">Connected Platforms</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {formatFollowers(getTotalFollowers())}
                </div>
                <div className="text-sm text-gray-400">Total Followers</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{getAverageEngagement()}</div>
                <div className="text-sm text-gray-400">Avg Engagement</div>
              </CardContent>
            </Card>
          </div>

          {/* Social Media Platforms */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Social Media Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialAccounts.map((account, index) => {
                  const Icon = account.icon;
                  return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      {/* Icon and Platform Info */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 flex-shrink-0 ${account.bgColor} rounded-full flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${account.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="text-white font-medium">{account.platform}</h4>
                            {account.connected ? (
                              <Badge className="bg-green-500/20 text-green-400 text-xs flex-shrink-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs flex-shrink-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">{account.handle}</p>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-bold text-white">{account.followers}</div>
                          <p className="text-xs sm:text-sm text-gray-400">{account.engagement} engagement</p>
                        </div>
                      
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                        {account.platform === "Facebook" ? (
                          // Facebook-specific buttons using unified state
                          account.connected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                                onClick={disconnectFacebook}
                                data-testid="button-disconnect-facebook-social"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                              {facebookPages.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg_white/10"
                                  onClick={() => setShowPageModal(true)}
                                  data-testid="button-switch-facebook-page"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Switch Page
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button 
                              className="bg-brand-primary hover:bg-brand-primary/80"
                              onClick={connectFacebook}
                              disabled={facebookConnecting}
                              data-testid="button-connect-facebook-social"
                            >
                              {facebookConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          )
                        ) : account.platform === "Instagram" ? (
                          // Instagram-specific buttons using real state
                          account.connected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectInstagram}
                                data-testid="button-disconnect-instagram-social"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                                onClick={() => window.open(`https://instagram.com/${instagramUserInfo?.username}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
                              onClick={connectInstagram}
                              disabled={instagramConnecting}
                              data-testid="button-connect-instagram-social"
                            >
                              {instagramConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          )
                        ) : (
                          account.platform === 'Twitter' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectTwitter}
                                  data-testid="button-disconnect-twitter-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg-white/10" 
                                  onClick={() => window.open(`https://twitter.com/${twitterHandle}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-black text-white hover:bg-black/80" 
                                onClick={connectTwitter} 
                                disabled={twitterConnecting}
                                data-testid="button-connect-twitter-social"
                              >
                                {twitterConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'TikTok' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectTiktok}
                                  data-testid="button-disconnect-tiktok-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg-white/10" 
                                  onClick={() => window.open(`https://tiktok.com/@${tiktokHandle}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700" 
                                onClick={connectTiktok} 
                                disabled={tiktokConnecting}
                                data-testid="button-connect-tiktok-social"
                              >
                                {tiktokConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : (
                            // Other platform buttons (static for now)
                            account.connected ? (
                            <>
                              <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                                <Settings className="h-4 w-4 mr-1" />
                                Settings
                              </Button>
                              <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                            ) : (
                              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                                Connect
                              </Button>
                            )
                          )
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Automation Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items_center justify-between">
                  <span>Automation Rules</span>
                  <Button variant="outline" size="sm" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationRules.map((rule) => (
                    <div key={rule.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{rule.name}</h4>
                        <Switch checked={rule.active} />
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{rule.description}</p>
                      <div className="flex items-center space-x-4">
                        <Zap className="h-4 w-4 text-brand-secondary" />
                        <span className="text-sm text-white">{rule.triggered} triggered</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Social Activity */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Social Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { platform: "Instagram", action: "New post received 247 likes", time: "2 hours ago", points: "12,350 points awarded" },
                    { platform: "TikTok", action: "Video shared 89 times", time: "4 hours ago", points: "6,675 points awarded" },
                    { platform: "Twitter", action: "Tweet retweeted 156 times", time: "6 hours ago", points: "3,900 points awarded" },
                    { platform: "Instagram", action: "Story viewed 1,234 times", time: "1 day ago", points: "8,600 points awarded" },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5">
                      <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-white">{activity.platform}</span>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                        <p className="text-sm text-gray-300">{activity.action}</p>
                        <p className="text-xs text-brand-secondary">{activity.points}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Social Media Integrations */}
          <Card className="bg-white/5 backdrop_blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Facebook Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatorFacebookConnect />
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop_blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Instagram Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreatorInstagramConnect />
              <InstagramWebhookSetup />
              <InstagramMessageTest />
            </CardContent>
          </Card>
        </div>
      
      {/* Facebook Page Selection Modal */}
      <Dialog open={showPageModal} onOpenChange={setShowPageModal}>
        <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Facebook Pages</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              Select which Facebook page to use for your campaigns. Only one page can be active at a time.
            </div>
            
            {facebookPages.length > 0 ? (
              <div className="space-y-3">
                {facebookPages.map((page, index) => (
                  <div 
                    key={page.id} 
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      activePage?.id === page.id 
                        ? 'border-brand-primary bg-brand-primary/10' 
                        : 'border-white/20 hover:border-white/30 bg-white/5'
                    }`}
                    onClick={() => {
                      setActivePage(page);
                      localStorage.setItem('fandomly_active_facebook_page_id', page.id);
                      toast({
                        title: "Active Page Changed",
                        description: `"${page.name}" is now your active Facebook page.`,
                        duration: 3000
                      });
                    }}
                    data-testid={`facebook-page-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={page.picture?.data?.url} alt={page.name} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400">
                          {page.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-white font-medium">{page.name}</div>
                          {activePage?.id === page.id && (
                            <Badge className="bg-brand-primary/20 text-brand-primary text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {page.category} • {page.followers_count?.toLocaleString() || 0} followers
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No Facebook pages found. Connect to Facebook first.
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                onClick={async () => {
                  try {
                    // Re-login to get access to potentially new pages
                    await FacebookSDKManager.secureLogin('creator');
                    await loadFacebookPages();
                    toast({
                      title: "Pages Refreshed",
                      description: "Successfully refreshed your Facebook pages.",
                      duration: 3000
                    });
                  } catch (error) {
                    console.error('Error refreshing pages:', error);
                    toast({
                      title: "Refresh Failed",
                      description: "Failed to refresh Facebook pages. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
                data-testid="button-refresh-facebook-pages"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Pages
              </Button>
              
              <Button 
                onClick={() => setShowPageModal(false)}
                className="bg-brand-primary hover:bg-brand-primary/80"
                data-testid="button-close-page-modal"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}