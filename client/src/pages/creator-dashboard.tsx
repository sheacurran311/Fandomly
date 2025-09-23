import { useAuth } from "@/hooks/use-auth";
import { useCreatorStats, useCreatorActivity } from "@/hooks/use-creator-dashboard";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";
import CreatorFacebookConnect from "@/components/social/creator-facebook-connect";
import CreatorInstagramWidget from "@/components/social/creator-instagram-widget";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import InstagramSDKManager from "@/lib/instagram";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
// Removed unused FacebookSDK.getCreatorData reference
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageSquare,
  Target,
  Plus,
  BarChart3,
  Facebook,
  Instagram,
  Loader2
} from "lucide-react";

export default function CreatorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: creatorStats, isLoading: statsLoading, error: statsError } = useCreatorStats();
  const { data: recentActivity, isLoading: activityLoading } = useCreatorActivity();
  const { completeConnection } = useInstagramConnection();

  // Handle Instagram OAuth callback
  useEffect(() => {
    const handleInstagramCallback = async () => {
      console.log('[Creator Dashboard] Checking for Instagram callback params in URL:', window.location.search);
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      console.log('[Creator Dashboard] URL params found:', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        state: state,
        codeLength: code?.length
      });

      // Only process if we have Instagram callback parameters
      if (!code && !error) {
        console.log('[Creator Dashboard] No Instagram callback parameters found, skipping');
        return;
      }

      if (error) {
        const errorDescription = urlParams.get('error_description');
        toast({
          title: "Instagram Connection Failed",
          description: errorDescription || "Authorization was cancelled or failed",
          variant: "destructive"
        });
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/creator-dashboard');
        return;
      }

      if (code && state) {
        try {
          console.log('[Creator Dashboard] Processing Instagram OAuth callback');
          console.log('[Creator Dashboard] About to call InstagramSDKManager.handleCallback...');
          const result = await InstagramSDKManager.handleCallback(code, state);
          console.log('[Creator Dashboard] handleCallback result:', result);
          
          if (result.success) {
            console.log('[Creator Dashboard] Callback successful, calling completeConnection...');
            await completeConnection(result);
            console.log('[Creator Dashboard] completeConnection finished');
            
            toast({
              title: "Instagram Connected! 📸",
              description: `Successfully connected @${result.user?.username}`,
              duration: 4000
            });
          } else {
            console.error('[Creator Dashboard] Callback failed:', result.error);
            toast({
              title: "Instagram Connection Failed",
              description: result.error || "Failed to complete connection",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('[Creator Dashboard] Instagram callback error:', error);
          toast({
            title: "Instagram Connection Error",
            description: "An error occurred while connecting Instagram",
            variant: "destructive"
          });
        }
        
        // Clean up URL after processing
        console.log('[Creator Dashboard] Cleaning up URL parameters');
        window.history.replaceState({}, document.title, '/creator-dashboard');
      }
    };

    handleInstagramCallback();
  }, [completeConnection]);

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
        <div className="text-white">Please connect your wallet to access the dashboard.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-dark-bg flex overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.10),transparent_60%),radial-gradient(40%_40%_at_90%_10%,rgba(20,254,238,0.10),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.03]" />
      <SidebarNavigation userType="creator" />
      
      <div className="relative z-10 flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.username || "Creator"}!
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your community today.
            </p>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-16">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : statsError ? (
              <div className="col-span-4 text-center text-red-400">
                Failed to load stats. Please try again.
              </div>
            ) : (
              <>
                <DashboardCard
                  title="Total Fans"
                  value={creatorStats?.totalFans?.toLocaleString() || "0"}
                  change={creatorStats?.fansChange}
                  icon={<Users className="h-5 w-5" />}
                  gradient
                />
                <DashboardCard
                  title="Monthly Revenue"
                  value={`$${creatorStats?.monthlyRevenue?.toLocaleString() || "0"}`}
                  change={creatorStats?.revenueChange}
                  icon={<DollarSign className="h-5 w-5" />}
                />
                <DashboardCard
                  title="Engagement Rate"
                  value={`${creatorStats?.engagementRate || "0"}%`}
                  change={creatorStats?.engagementChange}
                  icon={<Heart className="h-5 w-5" />}
                />
                <DashboardCard
                  title="Active Campaigns"
                  value={creatorStats?.activeCampaigns?.toString() || "0"}
                  description={creatorStats?.activeCampaigns && creatorStats.activeCampaigns > 0 ? "campaigns running" : "no active campaigns"}
                  icon={<Target className="h-5 w-5" />}
                />
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Recent Activity</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                      onClick={() => window.location.href = '/creator-dashboard/campaigns'}
                    >
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { user: "Sarah M.", action: "joined your loyalty program", time: "2 hours ago", type: "join" },
                      { user: "Mike R.", action: "redeemed VIP Discord Access", time: "4 hours ago", type: "redeem" },
                      { user: "Emma L.", action: "earned 500 points from Instagram follow", time: "6 hours ago", type: "earn" },
                      { user: "Alex K.", action: "joined your loyalty program", time: "1 day ago", type: "join" },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          activity.type === 'join' ? 'bg-green-400' : 
                          activity.type === 'redeem' ? 'bg-yellow-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-medium">{activity.user}</span> {activity.action}
                          </p>
                          <p className="text-xs text-gray-400">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Stats */}
            <div className="space-y-6">
              {/* Social Media Integrations */}
              <CreatorFacebookConnect />
              <CreatorInstagramWidget />

              {/* Quick Actions */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80 justify-start"
                    onClick={() => window.location.href = '/campaign-builder'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#101636]/30 text-[#101636] hover:bg-[#101636]/10 justify-start"
                    onClick={() => {
                      // Placeholder: open Social page to manage Facebook campaigns
                      window.location.href = '/creator-dashboard/social';
                    }}
                    data-testid="button-facebook-campaign"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-pink-400/30 text-pink-400 hover:bg-pink-400/10 justify-start"
                    onClick={() => {
                      window.location.href = '/creator-dashboard/social';
                    }}
                    data-testid="button-instagram-campaign"
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-gray-300 hover:bg-white/10 justify-start"
                    onClick={() => window.location.href = '/creator-dashboard/analytics'}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>

              {/* Top Performing Content */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Top Performing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Instagram Posts</span>
                        <span className="text-sm font-medium text-white">1,247 likes</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">TikTok Videos</span>
                        <span className="text-sm font-medium text-white">892 views</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Twitter Engagement</span>
                        <span className="text-sm font-medium text-white">543 interactions</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}