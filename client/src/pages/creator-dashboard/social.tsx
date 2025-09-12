import { useAuth } from "@/hooks/use-auth";
import { useFacebookConnection } from "@/hooks/use-facebook-connection";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Zap,
  Unlink
} from "lucide-react";

export default function CreatorSocial() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { 
    isConnected: facebookConnected, 
    isConnecting: facebookConnecting,
    userInfo: facebookUser,
    connectedPages: facebookPages,
    selectedPage: facebookPage,
    connectFacebook,
    disconnectFacebook,
    selectPage
  } = useFacebookConnection();

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
    // Real Facebook data from your connected page
    {
      platform: "Facebook",
      icon: Facebook,
      handle: facebookPage?.name || "Connect Facebook Page",
      followers: facebookPage?.followers_count ? 
        (facebookPage.followers_count >= 1000 ? 
          `${(facebookPage.followers_count / 1000).toFixed(1)}K` : 
          facebookPage.followers_count.toString()) : 
        "0",
      engagement: (facebookPage as any)?.engagement_data ? "Analytics Available" : "N/A",
      connected: facebookConnected,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      realData: true // Flag to identify real Facebook data
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
                              {facebookPages.length > 1 && (
                                <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
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
        </div>
      </div>
    </div>
  );
}