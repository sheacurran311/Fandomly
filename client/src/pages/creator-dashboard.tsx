import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SimpleCreatorFacebookConnect from "@/components/social/simple-creator-facebook-connect";
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
  Facebook
} from "lucide-react";

export default function CreatorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();

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
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
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
            <DashboardCard
              title="Total Fans"
              value="2,847"
              change={{ value: 12.5, type: "increase", period: "this month" }}
              icon={<Users className="h-5 w-5" />}
              gradient
            />
            <DashboardCard
              title="Monthly Revenue"
              value="$4,892"
              change={{ value: 8.2, type: "increase", period: "vs last month" }}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <DashboardCard
              title="Engagement Rate"
              value="24.8%"
              change={{ value: 3.1, type: "increase", period: "this week" }}
              icon={<Heart className="h-5 w-5" />}
            />
            <DashboardCard
              title="Active Campaigns"
              value="5"
              description="2 ending soon"
              icon={<Target className="h-5 w-5" />}
            />
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
              {/* Facebook Integration */}
              <SimpleCreatorFacebookConnect />

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