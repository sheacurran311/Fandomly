import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFanStats, useActiveCampaigns, useRecommendations } from "@/hooks/use-fan-dashboard";
import { useRewardRedemptions } from "@/hooks/use-points";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SimplifiedSocialWidgets from "@/components/fan/simplified-social-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
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
  ExternalLink,
  Loader2
} from "lucide-react";
import { TimeframeSelector, type Timeframe } from "@/components/charts/TimeframeSelector";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { apiRequest } from "@/lib/queryClient";
import { format } from 'date-fns';

export default function FanDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: fanStats, isLoading: statsLoading, error: statsError } = useFanStats();
  const { data: activeCampaigns, isLoading: campaignsLoading } = useActiveCampaigns();
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations();
  const { data: redemptionHistory = [], isLoading: redemptionsLoading } = useRewardRedemptions();
  
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  // Fetch points history
  const { data: pointsHistory } = useQuery({
    queryKey: ['/api/fan/dashboard/points-history', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fan/dashboard/points-history?timeframe=${timeframe}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch task completion stats
  const { data: taskStats } = useQuery({
    queryKey: ['/api/fan/dashboard/task-completion-stats', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fan/dashboard/task-completion-stats?timeframe=${timeframe}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch points breakdown
  const { data: pointsBreakdown } = useQuery({
    queryKey: ['/api/fan/points/breakdown'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/fan/points/breakdown');
      return response.json();
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
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
    <DashboardLayout userType="fan">
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
              <Card className="col-span-4 bg-red-500/10 backdrop-blur-lg border border-red-500/20">
                <CardContent className="p-6 text-center">
                  <p className="text-red-400">Failed to load stats. Using offline mode.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <DashboardCard
                  title="Platform Points"
                  value={fanStats?.platformPoints?.toLocaleString() || "0"}
                  description="Fandomly rewards"
                  change={fanStats?.pointsChange || undefined}
                  icon={<Star className="h-5 w-5" />}
                  gradient
                />
                <DashboardCard
                  title="Creator Points"
                  value={fanStats?.creatorPoints?.toLocaleString() || "0"}
                  description="From creators"
                  icon={<CreditCard className="h-5 w-5" />}
                />
                <DashboardCard
                  title="Following"
                  value={fanStats?.followingCount?.toString() || "0"}
                  description="Active creators"
                  icon={<Heart className="h-5 w-5" />}
                />
                <DashboardCard
                  title="Active Campaigns"
                  value={fanStats?.activeCampaignsCount?.toString() || "0"}
                  description="Join and earn"
                  icon={<Trophy className="h-5 w-5" />}
                />
              </>
            )}
          </div>

          {/* Activity & Insights Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Activity & Insights</h2>
              <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Points History Chart */}
              <LineChartCard
                title="Points Earned"
                description="Track your points over time"
                data={pointsHistory?.platformPoints?.concat(pointsHistory?.creatorPoints || []).reduce((acc: any[], curr: any) => {
                  const existing = acc.find(item => item.period === curr.period);
                  if (existing) {
                    existing.platformPoints = (existing.platformPoints || 0) + (curr.points || 0);
                  } else {
                    acc.push({ 
                      period: curr.period, 
                      platformPoints: pointsHistory?.platformPoints?.find((p: any) => p.period === curr.period)?.points || 0,
                      creatorPoints: pointsHistory?.creatorPoints?.find((p: any) => p.period === curr.period)?.points || 0
                    });
                  }
                  return acc;
                }, []) || []}
                dataKeys={[
                  { key: 'platformPoints', color: '#8b5cf6', name: 'Platform Points' },
                  { key: 'creatorPoints', color: '#3b82f6', name: 'Creator Points' }
                ]}
                xAxisKey="period"
                height={300}
              />

              {/* Task Completion Chart */}
              <BarChartCard
                title="Task Completions"
                description="Your task completion activity"
                data={taskStats?.completions || []}
                dataKeys={[
                  { key: 'completed', color: '#10b981', name: 'Tasks Completed' }
                ]}
                xAxisKey="period"
                height={300}
              />

              {/* Points Breakdown Pie Chart */}
              <PieChartCard
                title="Points by Source"
                description="Where your points come from"
                data={[
                  ...(pointsBreakdown?.platformPoints?.map((item: any) => ({
                    name: item.source || 'Platform',
                    value: Number(item.total_points) || 0,
                    color: '#8b5cf6'
                  })) || []),
                  ...(pointsBreakdown?.creatorPoints?.map((item: any) => ({
                    name: item.source || 'Creator',
                    value: Number(item.total_points) || 0,
                    color: '#3b82f6'
                  })) || [])
                ].filter(item => item.value > 0)}
                height={300}
              />

              {/* Campaign Participation */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Campaign Participation</CardTitle>
                  <p className="text-sm text-gray-400">Your engagement status</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div>
                        <p className="text-sm text-gray-400">Active Campaigns</p>
                        <p className="text-2xl font-bold text-white">{fanStats?.activeCampaignsCount || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div>
                        <p className="text-sm text-gray-400">Following</p>
                        <p className="text-2xl font-bold text-white">{fanStats?.followingCount || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div>
                        <p className="text-sm text-gray-400">Rewards Earned</p>
                        <p className="text-2xl font-bold text-white">{fanStats?.rewardsEarned || 0}</p>
                      </div>
                      <Trophy className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Campaigns */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Active Campaigns</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                      onClick={() => window.location.href = '/fan-dashboard/campaigns'}
                    >
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaignsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center space-x-3">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400">Loading campaigns...</span>
                          </div>
                        </div>
                      ))
                    ) : !activeCampaigns || activeCampaigns.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No active campaigns yet</p>
                        <Link href="/find-creators">
                          <Button variant="outline" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                            Discover Creators
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      activeCampaigns.map((campaign, index) => (
                        <div key={campaign.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
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
                      ))
                    )}
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
                  <Button 
                    className="w-full bg-brand-secondary hover:bg-brand-secondary/80 justify-start"
                    onClick={() => window.location.href = '/fan-dashboard/campaigns'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Join New Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 justify-start"
                    onClick={() => window.location.href = '/marketplace'}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Browse Rewards
                  </Button>
                  <Link href="/find-creators">
                    <Button 
                      variant="outline" 
                      className="w-full border-white/20 text-gray-300 hover:bg-white/10 justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Discover Creators
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Social Accounts Widget */}
              <SimplifiedSocialWidgets />

              {/* Recent Rewards */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Recent Rewards</CardTitle>
                </CardHeader>
                <CardContent>
                  {redemptionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : redemptionHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Gift className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No rewards redeemed yet</p>
                      <Link href="/fan-dashboard/points">
                        <Button size="sm" variant="outline" className="mt-3 text-xs border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                          Browse Rewards
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {redemptionHistory.slice(0, 3).map((redemption: any) => {
                        const rewardType = redemption.reward?.rewardType || 'other';
                        return (
                          <div key={redemption.id} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              rewardType === 'access' ? 'bg-green-400/20 text-green-400' :
                              rewardType === 'nft' ? 'bg-purple-400/20 text-purple-400' :
                              rewardType === 'physical_item' ? 'bg-blue-400/20 text-blue-400' :
                              'bg-yellow-400/20 text-yellow-400'
                            }`}>
                              {rewardType === 'access' && <Bell className="h-4 w-4" />}
                              {rewardType === 'nft' && <Star className="h-4 w-4" />}
                              {rewardType === 'discount' && <Gift className="h-4 w-4" />}
                              {rewardType === 'physical_item' && <Gift className="h-4 w-4" />}
                              {rewardType === 'custom_experience' && <Trophy className="h-4 w-4" />}
                              {rewardType === 'other' && <Gift className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{redemption.reward?.name || 'Reward'}</p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(redemption.redeemedAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-xs ${
                              redemption.status === 'fulfilled' ? 'border-green-400/30 text-green-400' :
                              redemption.status === 'pending' ? 'border-yellow-400/30 text-yellow-400' :
                              'border-gray-400/30 text-gray-400'
                            }`}>
                              {redemption.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
    </DashboardLayout>
  );
}