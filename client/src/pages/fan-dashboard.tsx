import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Heart, 
  Trophy, 
  Star, 
  Bell, 
  TrendingUp,
  Gift,
  Users,
  Plus,
  ExternalLink
} from "lucide-react";

export default function FanDashboard() {
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
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.username || "Fan"}!
            </h1>
            <p className="text-gray-400">
              Discover new campaigns and earn amazing rewards from your favorite creators.
            </p>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Points"
              value="12,450"
              change={{ value: 8.5, type: "increase", period: "this week" }}
              icon={<CreditCard className="h-5 w-5" />}
              gradient
            />
            <DashboardCard
              title="Following"
              value="18"
              description="Active creators"
              icon={<Heart className="h-5 w-5" />}
            />
            <DashboardCard
              title="Active Campaigns"
              value="7"
              change={{ value: 2, type: "increase", period: "new today" }}
              icon={<Trophy className="h-5 w-5" />}
            />
            <DashboardCard
              title="Rewards Earned"
              value="42"
              description="Total claimed"
              icon={<Star className="h-5 w-5" />}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Campaigns */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Active Campaigns</span>
                    <Button variant="outline" size="sm" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        creator: "Aerial Ace Athletics", 
                        campaign: "Follow for Points", 
                        points: 500, 
                        progress: 75, 
                        category: "Social",
                        timeLeft: "3 days left"
                      },
                      { 
                        creator: "Luna Music", 
                        campaign: "Stream & Earn", 
                        points: 1000, 
                        progress: 45, 
                        category: "Music",
                        timeLeft: "1 week left"
                      },
                      { 
                        creator: "Tech Creator Hub", 
                        campaign: "Referral Bonus", 
                        points: 2000, 
                        progress: 20, 
                        category: "Referral",
                        timeLeft: "2 weeks left"
                      },
                    ].map((campaign, index) => (
                      <div key={index} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-medium">{campaign.campaign}</h4>
                            <p className="text-sm text-gray-400">by {campaign.creator}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-brand-secondary">{campaign.points} pts</div>
                            <Badge variant="outline" className="text-xs border-brand-primary/30 text-brand-primary">
                              {campaign.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white">{campaign.progress}%</span>
                          </div>
                          <Progress value={campaign.progress} className="h-2" />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">{campaign.timeLeft}</span>
                            <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/80">
                              Continue
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-brand-secondary hover:bg-brand-secondary/80 justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Join New Campaign
                  </Button>
                  <Button variant="outline" className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 justify-start">
                    <Gift className="h-4 w-4 mr-2" />
                    Browse Rewards
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-gray-300 hover:bg-white/10 justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Discover Creators
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Rewards */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Recent Rewards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "VIP Discord Access", creator: "Aerial Ace", type: "Access", claimed: true },
                      { name: "Exclusive NFT", creator: "Luna Music", type: "NFT", claimed: true },
                      { name: "10% Merch Discount", creator: "Tech Hub", type: "Discount", claimed: false },
                    ].map((reward, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          reward.type === 'Access' ? 'bg-green-400/20 text-green-400' :
                          reward.type === 'NFT' ? 'bg-purple-400/20 text-purple-400' :
                          'bg-yellow-400/20 text-yellow-400'
                        }`}>
                          {reward.type === 'Access' && <Bell className="h-4 w-4" />}
                          {reward.type === 'NFT' && <Star className="h-4 w-4" />}
                          {reward.type === 'Discount' && <Gift className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{reward.name}</p>
                          <p className="text-xs text-gray-400">{reward.creator}</p>
                        </div>
                        {reward.claimed ? (
                          <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">
                            Claimed
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="text-xs border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                            Claim
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Points Breakdown */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Points by Creator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Aerial Ace Athletics</span>
                        <span className="text-sm font-medium text-white">4,250 pts</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Luna Music</span>
                        <span className="text-sm font-medium text-white">3,100 pts</span>
                      </div>
                      <Progress value={62} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Tech Creator Hub</span>
                        <span className="text-sm font-medium text-white">5,100 pts</span>
                      </div>
                      <Progress value={95} className="h-2" />
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