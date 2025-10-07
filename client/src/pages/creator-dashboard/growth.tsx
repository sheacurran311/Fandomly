import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";

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

        // TODO: Get historical data for previous period comparison
        // For now, simulate some growth
        const previousFans = Math.max(0, currentFans - Math.floor(currentFans * 0.1));
        const fanGrowthChange = previousFans > 0 ? ((currentFans - previousFans) / previousFans) * 100 : 0;

        return {
          fanGrowth: { 
            current: currentFans, 
            previous: previousFans, 
            change: fanGrowthChange 
          },
          engagementRate: { 
            current: engagementRate, 
            previous: Math.max(0, engagementRate - 5), 
            change: 5 
          },
          campaignParticipation: { 
            current: engagementRate, 
            previous: Math.max(0, engagementRate - 3), 
            change: 3 
          },
          averagePointsPerFan: { 
            current: averagePoints, 
            previous: Math.max(0, averagePoints - 100), 
            change: averagePoints > 100 ? 100 : 0 
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

            {/* Growth Chart Placeholder */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <LineChart className="mr-2 h-5 w-5 text-brand-secondary" />
                  Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Growth Chart</h3>
                  <p className="text-gray-400 mb-4">Visual growth analytics will appear here</p>
                  <Button variant="outline" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                    View Detailed Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Insights */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Growth Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
                      <div>
                        <h4 className="text-green-400 font-medium">Strong Growth</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          Your fan base has grown 12.3% this month. Keep up the momentum with consistent campaign launches.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start space-x-3">
                      <Target className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="text-yellow-400 font-medium">Goal Progress</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          You're 94.9% towards your 3,000 fan goal. Just 153 more fans to reach your target!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-blue-400 font-medium">Optimal Timing</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          Your fans are most active on Tuesday and Thursday evenings. Schedule campaigns accordingly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-start space-x-3">
                      <BarChart3 className="h-5 w-5 text-purple-400 mt-0.5" />
                      <div>
                        <h4 className="text-purple-400 font-medium">Engagement Boost</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          Social media integration campaigns show 23% higher engagement than standard campaigns.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}
