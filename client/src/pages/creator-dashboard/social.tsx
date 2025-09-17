import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import CreatorFacebookConnect from "@/components/social/creator-facebook-connect";
import { FacebookSDKManager, FacebookPage } from "@/lib/facebook";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
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
  Unlink
} from "lucide-react";

export default function CreatorSocial() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Facebook connection state
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [isCheckingFacebookStatus, setIsCheckingFacebookStatus] = useState(true);
  const [showPageModal, setShowPageModal] = useState(false);

  // Check Facebook status on mount
  useEffect(() => {
    checkFacebookStatus();
  }, []);

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
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setFacebookConnected(false);
      setFacebookPages([]);
    } finally {
      setIsCheckingFacebookStatus(false);
    }
  };

  const loadFacebookPages = async () => {
    try {
      const pages = await FacebookSDKManager.getUserPages();
      setFacebookPages(pages);
      
      // Handle active page reconciliation
      if (pages.length > 0) {
        if (!activePage) {
          // Set first page as active by default if no active page is set
          setActivePage(pages[0]);
        } else {
          // Check if current active page still exists in the updated pages
          const activePageStillExists = pages.some(page => page.id === activePage.id);
          if (!activePageStillExists) {
            // Active page no longer exists, set to first available page
            setActivePage(pages[0]);
            toast({
              title: "Active Page Updated",
              description: `Your previous active page is no longer available. Switched to "${pages[0].name}".`,
              duration: 4000
            });
          }
        }
      } else {
        setActivePage(null);
      }
    } catch (error) {
      console.error('Error loading Facebook pages:', error);
      setFacebookPages([]);
      setActivePage(null);
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

  // Get real Facebook data and static data for other platforms
  const socialAccounts = [
    {
      platform: "Instagram",
      icon: Instagram,
      handle: "@aerialace_athletics",
      followers: "12.4K",
      engagement: "8.2%",
      connected: true,
      color: "text-pink-400",
      bgColor: "bg-pink-400/20"
    },
    {
      platform: "Twitter",
      icon: Twitter,
      handle: "@aerialace",
      followers: "8.9K",
      engagement: "5.7%",
      connected: true,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20"
    },
    {
      platform: "TikTok",
      icon: Music,
      handle: "@aerialaceflips",
      followers: "45.2K",
      engagement: "12.1%",
      connected: true,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20"
    },
    {
      platform: "YouTube",
      icon: Youtube,
      handle: "Aerial Ace Athletics",
      followers: "6.7K",
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
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
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
                <div className="text-2xl font-bold text-white mb-1">3</div>
                <div className="text-sm text-gray-400">Connected Platforms</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">72.2K</div>
                <div className="text-sm text-gray-400">Total Followers</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">8.7%</div>
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
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${account.bgColor} rounded-full flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${account.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-white font-medium">{account.platform}</h4>
                            {account.connected ? (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{account.handle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{account.followers}</div>
                        <p className="text-sm text-gray-400">{account.engagement} engagement</p>
                      </div>
                      <div className="flex items-center space-x-2">
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
                                  className="border-white/20 text-gray-300 hover:bg-white/10"
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
                        )}
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
                <CardTitle className="text-white flex items-center justify-between">
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
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-brand-secondary" />
                          <span className="text-sm text-white">{rule.triggered} triggered</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Settings className="h-4 w-4" />
                        </Button>
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

          {/* Simplified Facebook Integration */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Facebook Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatorFacebookConnect />
            </CardContent>
          </Card>

        </div>
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
    </div>
  );
}