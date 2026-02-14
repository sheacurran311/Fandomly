import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Share2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { GrowthChart } from "@/components/analytics/GrowthChart";
import { PlatformBreakdown } from "@/components/analytics/PlatformBreakdown";
import { NetworkSelector } from "@/components/analytics/NetworkSelector";
import { useGrowthAnalytics, useAnalyticsOverview } from "@/hooks/use-analytics";

interface GrowthMetrics {
  fanGrowth: { current: number; previous: number; change: number };
  engagementRate: { current: number; previous: number; change: number };
  campaignParticipation: { current: number; previous: number; change: number };
  averagePointsPerFan: { current: number; previous: number; change: number };
}

interface GrowthGoal {
  title: string;
  current: number;
  target: number;
  progress: number;
}

export default function CreatorGrowth() {
  const { user } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");

  // Social analytics data
  const platformsParam = selectedPlatforms || "all";
  const { data: socialGrowth, isLoading: socialGrowthLoading } = useGrowthAnalytics(platformsParam, dateRange);
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(platformsParam, dateRange);

  // Get creator info
  const { data: creator } = useQuery({
    queryKey: ['/api/creators/user', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/creators/user/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  // Fetch real growth data
  const { data: growthMetrics, isLoading: growthLoading } = useQuery<GrowthMetrics>({
    queryKey: ['/api/analytics/growth', creator?.id],
    queryFn: async (): Promise<GrowthMetrics> => {
      if (!creator?.id) {
        return {
          fanGrowth: { current: 0, previous: 0, change: 0 },
          engagementRate: { current: 0, previous: 0, change: 0 },
          campaignParticipation: { current: 0, previous: 0, change: 0 },
          averagePointsPerFan: { current: 0, previous: 0, change: 0 }
        };
      }

      try {
        // Get current fan data
        const membershipsResponse = await apiRequest('GET', `/api/tenant-memberships/${creator.tenantId}`);
        const memberships = await membershipsResponse.json();
        
        const currentFans = memberships.length;
        const activeFans = memberships.filter((m: any) => (m.memberData?.points || 0) > 0).length;
        const totalPoints = memberships.reduce((sum: number, m: any) => sum + (m.memberData?.points || 0), 0);
        const averagePoints = currentFans > 0 ? totalPoints / currentFans : 0;
        const engagementRate = currentFans > 0 ? (activeFans / currentFans) * 100 : 0;

        // Calculate real historical data (30 days ago)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const previousMemberships = memberships.filter((m: any) => 
          new Date(m.joinedAt) < thirtyDaysAgo
        );
        const previousFans = previousMemberships.length;
        const previousActiveFans = previousMemberships.filter((m: any) => (m.memberData?.points || 0) > 0).length;
        const previousTotalPoints = previousMemberships.reduce((sum: number, m: any) => sum + (m.memberData?.points || 0), 0);
        const previousAveragePoints = previousFans > 0 ? previousTotalPoints / previousFans : 0;
        const previousEngagementRate = previousFans > 0 ? (previousActiveFans / previousFans) * 100 : 0;

        // Calculate percentage changes
        const fanGrowthChange = previousFans > 0 ? ((currentFans - previousFans) / previousFans) * 100 : 0;
        const engagementChange = previousEngagementRate > 0 ? ((engagementRate - previousEngagementRate) / previousEngagementRate) * 100 : 0;
        const averagePointsChange = previousAveragePoints > 0 ? ((averagePoints - previousAveragePoints) / previousAveragePoints) * 100 : 0;

        // Get campaign participation data
        const programsResponse = await apiRequest('GET', `/api/loyalty-programs/creator/${creator.id}`);
        const programs = await programsResponse.json();
        
        let currentCampaignParticipants = 0;
        let previousCampaignParticipants = 0;
        
        for (const program of programs) {
          try {
            const transactionsResponse = await apiRequest('GET', `/api/point-transactions/program/${program.id}`);
            const transactions = await transactionsResponse.json();
            
            // Current period (last 30 days)
            const recentTransactions = transactions.filter((tx: any) => 
              new Date(tx.timestamp) > thirtyDaysAgo
            );
            const recentUniqueFans = new Set(recentTransactions.map((tx: any) => tx.fanId));
            currentCampaignParticipants += recentUniqueFans.size;
            
            // Previous period (30-60 days ago)
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const previousTransactions = transactions.filter((tx: any) => {
              const txDate = new Date(tx.timestamp);
              return txDate > sixtyDaysAgo && txDate <= thirtyDaysAgo;
            });
            const previousUniqueFans = new Set(previousTransactions.map((tx: any) => tx.fanId));
            previousCampaignParticipants += previousUniqueFans.size;
          } catch (error) {
            console.warn(`Failed to get campaign data for program ${program.id}:`, error);
          }
        }

        const currentParticipationRate = currentFans > 0 ? (currentCampaignParticipants / currentFans) * 100 : 0;
        const previousParticipationRate = previousFans > 0 ? (previousCampaignParticipants / previousFans) * 100 : 0;
        const participationChange = previousParticipationRate > 0 ? ((currentParticipationRate - previousParticipationRate) / previousParticipationRate) * 100 : 0;

        return {
          fanGrowth: { 
            current: currentFans, 
            previous: previousFans, 
            change: parseFloat(fanGrowthChange.toFixed(1))
          },
          engagementRate: { 
            current: parseFloat(engagementRate.toFixed(1)), 
            previous: parseFloat(previousEngagementRate.toFixed(1)), 
            change: parseFloat(engagementChange.toFixed(1))
          },
          campaignParticipation: { 
            current: parseFloat(currentParticipationRate.toFixed(1)), 
            previous: parseFloat(previousParticipationRate.toFixed(1)), 
            change: parseFloat(participationChange.toFixed(1))
          },
          averagePointsPerFan: { 
            current: parseFloat(averagePoints.toFixed(0)), 
            previous: parseFloat(previousAveragePoints.toFixed(0)), 
            change: parseFloat(averagePointsChange.toFixed(1))
          }
        };
      } catch (error) {
        console.error('Failed to fetch growth data:', error);
        return {
          fanGrowth: { current: 0, previous: 0, change: 0 },
          engagementRate: { current: 0, previous: 0, change: 0 },
          campaignParticipation: { current: 0, previous: 0, change: 0 },
          averagePointsPerFan: { current: 0, previous: 0, change: 0 }
        };
      }
    },
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  // Calculate growth goals based on current metrics
  const growthGoals: GrowthGoal[] = growthMetrics ? [
    { 
      title: `Reach ${Math.ceil(((growthMetrics?.fanGrowth?.current || 0) + 500) / 100) * 100} Fans`, 
      current: growthMetrics?.fanGrowth?.current || 0, 
      target: Math.ceil(((growthMetrics?.fanGrowth?.current || 0) + 500) / 100) * 100, 
      progress: ((growthMetrics?.fanGrowth?.current || 0) / Math.ceil(((growthMetrics?.fanGrowth?.current || 0) + 500) / 100) * 100) * 100 
    },
    { 
      title: "70% Engagement Rate", 
      current: growthMetrics?.engagementRate?.current || 0, 
      target: 70, 
      progress: ((growthMetrics?.engagementRate?.current || 0) / 70) * 100 
    },
    { 
      title: "95% Campaign Participation", 
      current: growthMetrics?.campaignParticipation?.current || 0, 
      target: 95, 
      progress: ((growthMetrics?.campaignParticipation?.current || 0) / 95) * 100 
    }
  ] : [];

  const getChangeColor = (change: number) => {
    return change > 0 ? "text-green-400" : "text-red-400";
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <TrendingUp className="mr-3 h-8 w-8 text-brand-primary" />
              Growth Analytics
            </h1>
            <p className="text-gray-400">
              Track your community growth and engagement trends over time.
            </p>
          </div>

          {/* Growth Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {growthLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-16">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : !growthMetrics ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-400">No data available</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-6 w-6 text-brand-primary" />
                    <Badge className="bg-green-500/20 text-green-400">+{growthMetrics?.fanGrowth?.change || 0}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(growthMetrics?.fanGrowth?.current || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Fans</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{((growthMetrics?.fanGrowth?.current || 0) - (growthMetrics?.fanGrowth?.previous || 0)).toLocaleString()} this month
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="h-6 w-6 text-brand-secondary" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics?.engagementRate?.change || 0}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(growthMetrics?.engagementRate?.current || 0).toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Engagement Rate</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{((growthMetrics?.engagementRate?.current || 0) - (growthMetrics?.engagementRate?.previous || 0)).toFixed(1)}% vs last month
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-6 w-6 text-yellow-400" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics?.campaignParticipation?.change || 0}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(growthMetrics?.campaignParticipation?.current || 0).toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Campaign Participation</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{((growthMetrics?.campaignParticipation?.current || 0) - (growthMetrics?.campaignParticipation?.previous || 0)).toFixed(1)}% improvement
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <PieChart className="h-6 w-6 text-purple-400" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics?.averagePointsPerFan?.change || 0}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(growthMetrics?.averagePointsPerFan?.current || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Avg Points/Fan</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{(growthMetrics?.averagePointsPerFan?.current || 0) - (growthMetrics?.averagePointsPerFan?.previous || 0)} pts increase
                  </p>
                </div>
              </CardContent>
            </Card>
              </>
            )
          }
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Growth Goals */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Target className="mr-2 h-5 w-5 text-brand-primary" />
                  Growth Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {growthGoals.map((goal, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{goal.title}</span>
                      <span className="text-sm text-gray-400">{goal.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2 mb-1" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{goal.current.toLocaleString()}</span>
                      <span>{goal.target.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Growth Chart - Real Data */}
            <GrowthChart data={socialGrowth} isLoading={socialGrowthLoading} />
          </div>

          {/* Social Network Analytics - Real Data */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-brand-primary" />
              Social Network Analytics
            </h2>
            <div className="mb-4 flex items-center gap-3">
              <NetworkSelector
                connectedPlatforms={overview?.connectedPlatforms || []}
                selectedPlatforms={selectedPlatforms}
                onSelectionChange={setSelectedPlatforms}
                compact
              />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PlatformBreakdown
              platforms={overview?.platforms || []}
              isLoading={overviewLoading}
            />
          </div>

          {/* Growth Insights */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Growth Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Fan Growth Insight - Dynamic */}
                  {growthMetrics && (
                    <div className={`p-4 rounded-lg border ${
                      growthMetrics.fanGrowth.change > 0 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : growthMetrics.fanGrowth.change < 0 
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-gray-500/10 border-gray-500/20'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {growthMetrics.fanGrowth.change >= 0 ? (
                          <TrendingUp className={`h-5 w-5 mt-0.5 ${
                            growthMetrics.fanGrowth.change > 0 ? 'text-green-400' : 'text-gray-400'
                          }`} />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-400 mt-0.5" />
                        )}
                        <div>
                          <h4 className={`font-medium ${
                            growthMetrics.fanGrowth.change > 0 ? 'text-green-400' : 
                            growthMetrics.fanGrowth.change < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {growthMetrics.fanGrowth.change > 0 ? 'Growing' : 
                             growthMetrics.fanGrowth.change < 0 ? 'Declining' : 'Steady'}
                          </h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {growthMetrics.fanGrowth.current === 0 ? (
                              'No fans yet. Share your program to start growing your community!'
                            ) : growthMetrics.fanGrowth.change === 0 ? (
                              `You have ${growthMetrics.fanGrowth.current} fan${growthMetrics.fanGrowth.current !== 1 ? 's' : ''}. Create engaging tasks to attract more.`
                            ) : (
                              `Your fan base has ${growthMetrics.fanGrowth.change > 0 ? 'grown' : 'decreased'} ${Math.abs(growthMetrics.fanGrowth.change)}% this month (${growthMetrics.fanGrowth.current} total fans).`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Engagement Insight - Dynamic */}
                  {growthMetrics && (
                    <div className={`p-4 rounded-lg border ${
                      growthMetrics.engagementRate.current > 50 
                        ? 'bg-yellow-500/10 border-yellow-500/20' 
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <Target className={`h-5 w-5 mt-0.5 ${
                          growthMetrics.engagementRate.current > 50 ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                        <div>
                          <h4 className={`font-medium ${
                            growthMetrics.engagementRate.current > 50 ? 'text-yellow-400' : 'text-blue-400'
                          }`}>
                            {growthMetrics.engagementRate.current > 50 ? 'High Engagement' : 'Room to Grow'}
                          </h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {growthMetrics.fanGrowth.current === 0 ? (
                              'Build your fan base to start tracking engagement metrics.'
                            ) : (
                              `${growthMetrics.engagementRate.current.toFixed(0)}% of your fans have earned points. ${
                                growthMetrics.engagementRate.current < 30 
                                  ? 'Create easier entry-level tasks to boost participation.'
                                  : growthMetrics.engagementRate.current < 60
                                    ? 'Good participation! Consider adding varied task types.'
                                    : 'Excellent engagement! Your fans are highly active.'
                              }`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Points Distribution Insight - Dynamic */}
                  {growthMetrics && (
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-start space-x-3">
                        <BarChart3 className="h-5 w-5 text-purple-400 mt-0.5" />
                        <div>
                          <h4 className="text-purple-400 font-medium">Points Overview</h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {growthMetrics.fanGrowth.current === 0 ? (
                              'Points will be tracked once fans join and complete tasks.'
                            ) : growthMetrics.averagePointsPerFan.current === 0 ? (
                              'No points distributed yet. Fans will earn points by completing tasks.'
                            ) : (
                              `Average ${growthMetrics.averagePointsPerFan.current.toLocaleString()} points per fan. ${
                                growthMetrics.averagePointsPerFan.change > 0
                                  ? `Up ${growthMetrics.averagePointsPerFan.change.toFixed(0)}% from last month.`
                                  : growthMetrics.averagePointsPerFan.change < 0
                                    ? `Down ${Math.abs(growthMetrics.averagePointsPerFan.change).toFixed(0)}% from last month.`
                                    : 'Stable from last month.'
                              }`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Participation Insight - Dynamic */}
                  {growthMetrics && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="text-blue-400 font-medium">Campaign Activity</h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {growthMetrics.fanGrowth.current === 0 ? (
                              'Launch campaigns after building your fan community.'
                            ) : growthMetrics.campaignParticipation.current === 0 ? (
                              'No campaign activity yet. Create tasks and campaigns to engage your fans.'
                            ) : (
                              `${growthMetrics.campaignParticipation.current.toFixed(0)}% of fans participated in campaigns this month. ${
                                growthMetrics.campaignParticipation.change > 0
                                  ? 'Great momentum!'
                                  : growthMetrics.campaignParticipation.change < 0
                                    ? 'Consider launching new campaigns to re-engage.'
                                    : 'Maintain consistency with regular campaigns.'
                              }`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}
