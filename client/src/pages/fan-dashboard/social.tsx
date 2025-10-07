import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { FacebookSDKManager } from "@/lib/facebook";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Unlink,
  Target,
  Heart,
  ThumbsUp,
  MessageSquare,
  Share,
  Award,
  Video
} from "lucide-react";
import { TwitterSDKManager } from "@/lib/twitter";
import { socialManager } from "@/lib/social-integrations";

export default function FanSocial() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [isCheckingTwitterStatus, setIsCheckingTwitterStatus] = useState(true);
  
  // TikTok connection state
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState<string | null>(null);
  const [tiktokFollowers, setTiktokFollowers] = useState<number>(0);
  const [isCheckingTiktokStatus, setIsCheckingTiktokStatus] = useState(true);
  
  // Check social connections status when user becomes available
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTwitterStatus();
      checkTiktokStatus();
    }
  }, [user?.dynamicUserId]);

  const checkTwitterStatus = async () => {
    try {
      setIsCheckingTwitterStatus(true);
      const response = await fetch('/api/social/accounts', {
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const connections = await response.json();
        const tw = connections.find((c: any) => c.platform === 'twitter');
        if (tw) {
          setTwitterConnected(true);
          setTwitterHandle(tw.username);
        } else {
          setTwitterConnected(false);
          setTwitterHandle(null);
        }
      } else {
        setTwitterConnected(false);
        setTwitterHandle(null);
      }
    } catch (error) {
      console.error('[Fan Social] Error checking Twitter status:', error);
      setTwitterConnected(false);
      setTwitterHandle(null);
    } finally {
      setIsCheckingTwitterStatus(false);
    }
  };

  const checkTiktokStatus = async () => {
    try {
      setIsCheckingTiktokStatus(true);
      // Check TikTok connection from database
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected, connection } = await getSocialConnection('tiktok');
      
      if (connected && connection) {
        setTiktokConnected(true);
        setTiktokHandle(connection.platformUsername || null);
        setTiktokFollowers(connection.profileData?.followers || 0);
      } else {
        setTiktokConnected(false);
        setTiktokHandle(null);
        setTiktokFollowers(0);
      }
    } catch (error) {
      console.error('Error checking TikTok status:', error);
      setTiktokConnected(false);
    } finally {
      setIsCheckingTiktokStatus(false);
    }
  };

  const connectTiktok = async () => {
    try {
      setTiktokConnecting(true);
      const authUrl = socialManager.getAuthUrl('tiktok');
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      setTiktokConnecting(false);
    }
  };

  const disconnectTiktok = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('tiktok');
      
      if (result.success) {
        setTiktokConnected(false);
        setTiktokHandle(null);
        setTiktokFollowers(0);
      } else {
        console.error('Failed to disconnect TikTok:', result.error);
      }
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
    }
  };

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('fan');
      const status = await FacebookSDKManager.getLoginStatus();
      setFacebookConnected(status.isLoggedIn);
    } catch (error) {
      console.error('[Fan Social] Error checking Facebook status:', error);
      setFacebookConnected(false);
    }
  };

  const connectFacebook = async () => {
    try {
      setFacebookConnecting(true);
      await FacebookSDKManager.ensureFBReady('fan');
      const result = await FacebookSDKManager.secureLogin('fan');
      if (result.success) {
        setFacebookConnected(true);
        toast({
          title: "Facebook Connected! 🎉",
          description: "Successfully connected to Facebook for fan campaigns.",
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
      await FacebookSDKManager.secureLogout();
      setFacebookConnected(false);
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

  const connectTwitter = async () => {
    try {
      setTwitterConnecting(true);
      const result = await TwitterSDKManager.secureLogin('fan', (user as any)?.dynamicUserId || user?.id);
      if (result.success && result.user) {
        setTwitterConnected(true);
        setTwitterHandle(result.user.username);
      }
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
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setTwitterConnected(false);
        setTwitterHandle(null);
      }
    } catch (error) {
      console.error('Twitter disconnect error:', error);
    }
  };
  
  // For now, we'll use the simple Facebook connect component in the sidebar
  // The social accounts display will show placeholder data except Facebook

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

  // Social accounts configured for fan participation
  const socialAccounts = [
    {
      platform: "Instagram",
      icon: Instagram,
      handle: "@yourhandle",
      connected: false,
      color: "text-pink-400",
      bgColor: "bg-pink-400/20",
      description: "Connect to participate in Instagram campaigns"
    },
    {
      platform: "Twitter",
      icon: Twitter,
      handle: twitterConnected && twitterHandle ? `@${twitterHandle}` : "@yourhandle",
      connected: twitterConnected,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
      description: "Connect to participate in Twitter campaigns"
    },
    {
      platform: "TikTok",
      icon: Video,
      handle: tiktokConnected && tiktokHandle ? `@${tiktokHandle}` : "@yourhandle",
      connected: tiktokConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
      description: "Connect to participate in TikTok campaigns"
    },
    {
      platform: "YouTube",
      icon: Youtube,
      handle: "Your Channel",
      connected: false,
      color: "text-red-400",
      bgColor: "bg-red-400/20",
      description: "Connect to participate in YouTube campaigns"
    },
    {
      platform: "Facebook",
      icon: Facebook,
      handle: facebookConnected ? (user?.email || "Connected") : "Connect Facebook",
      connected: facebookConnected,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      description: "Connect to participate in Facebook campaigns and earn rewards"
    }
  ];

  // Available campaigns fans can participate in
  const availableCampaigns = [
    {
      id: "1",
      title: "Like & Follow Campaign",
      creator: "Aerial Ace Athletics",
      platform: "Facebook",
      icon: ThumbsUp,
      points: 50,
      description: "Like our latest post and follow our page",
      participants: 247,
      timeLeft: "5 days left",
      requirements: ["Follow page", "Like post", "Valid for 24 hours"]
    },
    {
      id: "2", 
      title: "Comment Engagement",
      creator: "Luna Music",
      platform: "Instagram",
      icon: MessageSquare,
      points: 100,
      description: "Comment on our latest track release",
      participants: 189,
      timeLeft: "3 days left",
      requirements: ["Follow account", "Comment with #LunaVibes", "Tag a friend"]
    },
    {
      id: "3",
      title: "Share Campaign",
      creator: "Tech Hub",
      platform: "Twitter",
      icon: Share,
      points: 200,
      description: "Share our tech tips thread",
      participants: 156,
      timeLeft: "1 week left",
      requirements: ["Follow @TechHub", "Retweet with comment", "Use #TechTips"]
    }
  ];

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Social Accounts</h1>
            <p className="text-gray-400">
              Connect your social media accounts to participate in creator campaigns and earn rewards.
            </p>
          </div>

          {/* Social Media Platforms */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialAccounts.map((account, index) => {
                  const Icon = account.icon;
                  const isFacebook = account.platform === "Facebook";
                  
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
                          <p className="text-xs text-gray-500">{account.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isFacebook ? (
                          // Facebook - show connection status
                          <div className="flex items-center space-x-2">
                            {facebookConnected ? (
                              <div className="flex gap-2">
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-white/20 text-gray-300 hover:bg-white/10"
                                  onClick={disconnectFacebook}
                                  data-testid="button-disconnect-facebook-fan"
                                >
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                                onClick={connectFacebook}
                                disabled={facebookConnecting}
                                data-testid="button-connect-facebook-fan"
                              >
                                {facebookConnecting ? 'Connecting…' : 'Connect'}
                              </Button>
                            )}
                          </div>
                        ) : (
                          account.platform === 'Twitter' ? (
                            account.connected ? (
                              <div className="flex gap-2">
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-white/20 text-gray-300 hover:bg-white/10"
                                  onClick={disconnectTwitter}
                                  data-testid="button-disconnect-twitter-fan"
                                >
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                className="border-brand-primary/30 text-brand-primary"
                                onClick={connectTwitter}
                                disabled={twitterConnecting}
                                data-testid="button-connect-twitter-fan"
                              >
                                {twitterConnecting ? 'Connecting…' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'TikTok' ? (
                            account.connected ? (
                              <div className="flex gap-2">
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-white/20 text-gray-300 hover:bg-white/10"
                                  onClick={disconnectTiktok}
                                  data-testid="button-disconnect-tiktok-fan"
                                >
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                className="border-purple-600/30 text-purple-400 hover:bg-purple-600/10"
                                onClick={connectTiktok}
                                disabled={tiktokConnecting}
                                data-testid="button-connect-tiktok-fan"
                              >
                                {tiktokConnecting ? 'Connecting…' : 'Connect'}
                              </Button>
                            )
                          ) : (
                            // Other platform buttons (coming soon)
                            <Button 
                              variant="outline" 
                              className="border-gray-500/30 text-gray-400"
                              disabled
                            >
                              Coming Soon
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

          {/* Available Social Campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Available Campaigns</span>
                  <Button variant="outline" size="sm" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableCampaigns.map((campaign) => {
                    const Icon = campaign.icon;
                    return (
                      <div key={campaign.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-brand-primary/20">
                              <Icon className="h-5 w-5 text-brand-primary" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{campaign.title}</h4>
                              <p className="text-sm text-gray-400">{campaign.creator}</p>
                            </div>
                          </div>
                          <Badge className="bg-brand-primary/20 text-brand-primary">
                            +{campaign.points} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{campaign.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{campaign.participants} participants</span>
                            <span>{campaign.timeLeft}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <strong>Requirements:</strong> {campaign.requirements.join(" • ")}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-3 bg-brand-primary hover:bg-brand-primary/80"
                        >
                          Participate
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Campaign Stats & Tips */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Personal Stats */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Your Activity</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Campaigns Joined</span>
                        <span className="text-sm font-medium text-white">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Total Points Earned</span>
                        <span className="text-sm font-medium text-white">2,450</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Success Rate</span>
                        <span className="text-sm font-medium text-white">92%</span>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Earning Tips</h4>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Connect multiple platforms to access more campaigns</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-secondary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Engage authentically to maximize your rewards</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-accent mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Join campaigns early for bonus multipliers</p>
                      </div>
                    </div>
                  </div>

                  {/* Platform Performance */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Platform Performance</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-300">Facebook Campaigns</span>
                          <span className="text-xs font-medium text-white">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-300">Instagram Campaigns</span>
                          <span className="text-xs font-medium text-white">67%</span>
                        </div>
                        <Progress value={67} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-300">Twitter Campaigns</span>
                          <span className="text-xs font-medium text-white">42%</span>
                        </div>
                        <Progress value={42} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </DashboardLayout>
  );
}