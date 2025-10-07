import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Eye, 
  Heart, 
  Share2,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function CreatorAnalytics() {
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
        <div className="text-white">Please connect your wallet to access analytics.</div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
              <p className="text-gray-400">
                Track your fan engagement and campaign performance.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 days
              </Button>
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Fans"
              value="2,847"
              change={{ value: 12.5, type: "increase", period: "this month" }}
              icon={<Users className="h-5 w-5" />}
              gradient
            />
            <DashboardCard
              title="Engagement Rate"
              value="24.8%"
              change={{ value: 3.1, type: "increase", period: "vs last month" }}
              icon={<Heart className="h-5 w-5" />}
            />
            <DashboardCard
              title="Campaign Views"
              value="18.2K"
              change={{ value: 8.7, type: "increase", period: "this week" }}
              icon={<Eye className="h-5 w-5" />}
            />
            <DashboardCard
              title="Conversion Rate"
              value="5.2%"
              change={{ value: 1.2, type: "decrease", period: "vs last week" }}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="fans" className="data-[state=active]:bg-brand-primary">
                <Users className="h-4 w-4 mr-2" />
                Fan Analytics
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-brand-primary">
                <TrendingUp className="h-4 w-4 mr-2" />
                Campaign Performance
              </TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-brand-primary">
                <Share2 className="h-4 w-4 mr-2" />
                Social Media
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fan Growth Chart */}
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Fan Growth</span>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Chart visualization would go here</p>
                        <p className="text-sm text-gray-500">+347 new fans this month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Engagement Metrics */}
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Engagement Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-300">Campaign Participation</span>
                          <div className="flex items-center text-green-400">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span className="text-sm font-medium">89%</span>
                          </div>
                        </div>
                        <Progress value={89} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-300">Social Sharing</span>
                          <div className="flex items-center text-green-400">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span className="text-sm font-medium">67%</span>
                          </div>
                        </div>
                        <Progress value={67} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-300">Reward Redemption</span>
                          <div className="flex items-center text-red-400">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            <span className="text-sm font-medium">43%</span>
                          </div>
                        </div>
                        <Progress value={43} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-300">Repeat Engagement</span>
                          <div className="flex items-center text-green-400">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span className="text-sm font-medium">78%</span>
                          </div>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Campaigns */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Top Performing Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Welcome Bonus Campaign", participants: 1247, conversion: "89%", revenue: "$3,420" },
                      { name: "Social Media Follow", participants: 892, conversion: "67%", revenue: "$2,180" },
                      { name: "Referral Program", participants: 543, conversion: "34%", revenue: "$1,650" },
                      { name: "Birthday Special", participants: 412, conversion: "78%", revenue: "$1,240" },
                    ].map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div>
                          <h4 className="text-white font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-400">{campaign.participants} participants</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-brand-secondary">{campaign.revenue}</div>
                          <p className="text-sm text-gray-400">{campaign.conversion} conversion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fans" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Fan Demographics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">Demographic charts would go here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Fan Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Daily Active</span>
                            <span className="text-white">1,847</span>
                          </div>
                          <Progress value={75} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Weekly Active</span>
                            <span className="text-white">2,341</span>
                          </div>
                          <Progress value={85} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Monthly Active</span>
                            <span className="text-white">2,687</span>
                          </div>
                          <Progress value={95} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Campaign Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Detailed Campaign Analytics</h3>
                    <p className="text-gray-400">
                      Advanced campaign performance metrics and insights would be displayed here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Social Media Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Share2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Social Media Analytics</h3>
                    <p className="text-gray-400">
                      Cross-platform social media engagement and growth metrics would be shown here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
}