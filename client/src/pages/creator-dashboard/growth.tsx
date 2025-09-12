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
  ArrowDownRight
} from "lucide-react";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

export default function CreatorGrowth() {
  // Mock growth data - in production this would come from API
  const growthMetrics = {
    fanGrowth: { current: 2847, previous: 2534, change: 12.3 },
    engagementRate: { current: 67.2, previous: 62.8, change: 7.0 },
    campaignParticipation: { current: 89.1, previous: 84.3, change: 5.7 },
    averagePointsPerFan: { current: 1450, previous: 1320, change: 9.8 }
  };

  const growthGoals = [
    { title: "Reach 3,000 Fans", current: 2847, target: 3000, progress: 94.9 },
    { title: "70% Engagement Rate", current: 67.2, target: 70, progress: 96.0 },
    { title: "95% Campaign Participation", current: 89.1, target: 95, progress: 93.8 }
  ];

  const getChangeColor = (change: number) => {
    return change > 0 ? "text-green-400" : "text-red-400";
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
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
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-6 w-6 text-brand-primary" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics.fanGrowth.change}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{growthMetrics.fanGrowth.current.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Fans</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{(growthMetrics.fanGrowth.current - growthMetrics.fanGrowth.previous).toLocaleString()} this month
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="h-6 w-6 text-brand-secondary" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics.engagementRate.change}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{growthMetrics.engagementRate.current}%</p>
                  <p className="text-sm text-gray-400">Engagement Rate</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{(growthMetrics.engagementRate.current - growthMetrics.engagementRate.previous).toFixed(1)}% vs last month
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-6 w-6 text-yellow-400" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics.campaignParticipation.change}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{growthMetrics.campaignParticipation.current}%</p>
                  <p className="text-sm text-gray-400">Campaign Participation</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{(growthMetrics.campaignParticipation.current - growthMetrics.campaignParticipation.previous).toFixed(1)}% improvement
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <PieChart className="h-6 w-6 text-purple-400" />
                  <Badge className="bg-green-500/20 text-green-400">+{growthMetrics.averagePointsPerFan.change}%</Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{growthMetrics.averagePointsPerFan.current.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Avg Points/Fan</p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{(growthMetrics.averagePointsPerFan.current - growthMetrics.averagePointsPerFan.previous).toLocaleString()} pts increase
                  </p>
                </div>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}
