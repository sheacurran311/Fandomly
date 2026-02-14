import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  Gift,
  CheckCircle,
  Calendar,
  Settings,
  AlertTriangle,
} from "lucide-react";

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-yellow-200">
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="flex-shrink-0">
          Retry
        </Button>
      )}
    </div>
  );
}
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { NetworkSelector } from "@/components/analytics/NetworkSelector";
import { AnalyticsOverviewCards } from "@/components/analytics/AnalyticsOverview";
import { PlatformBreakdown } from "@/components/analytics/PlatformBreakdown";
import { GrowthChart } from "@/components/analytics/GrowthChart";
import { ContentPerformance } from "@/components/analytics/ContentPerformance";
import { PlatformComparison } from "@/components/analytics/PlatformComparison";
import {
  useAnalyticsOverview,
  useGrowthAnalytics,
  useContentAnalytics,
  useComparisonAnalytics,
} from "@/hooks/use-analytics";
import { AIInsightsPanel } from "@/components/analytics/AIInsightsPanel";

export default function AnalyticsOverview() {
  const { user } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");

  const platformsParam = selectedPlatforms || "all";

  // Fetch real analytics data
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useAnalyticsOverview(platformsParam, dateRange);
  const { data: growthData, isLoading: growthLoading, isError: growthError } = useGrowthAnalytics(platformsParam, dateRange);
  const { data: contentData, isLoading: contentLoading, isError: contentError } = useContentAnalytics(platformsParam, 'views', 5);
  const { data: comparisonData, isLoading: comparisonLoading, isError: comparisonError } = useComparisonAnalytics(dateRange);

  // Fetch weekly metrics from database (platform metrics)
  const { data: weeklyMetrics, isLoading: weeklyLoading, isError: weeklyError } = useQuery({
    queryKey: ['/api/creator/weekly-metrics', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/creator/weekly-metrics/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch weekly metrics');
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const hasError = overviewError || growthError || contentError || comparisonError || weeklyError;

  return (
    <DashboardLayout userType="creator">
      <div className="p-6 space-y-6">
        {hasError && (
          <ErrorBanner
            message="Some analytics data couldn't be loaded. Please try refreshing."
            onRetry={() => window.location.reload()}
          />
        )}
        {/* Header with controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Overview</h1>
            <p className="text-gray-400">
              Cross-platform performance, growth, and engagement metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Link href="/creator-dashboard/social">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Sync Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Network Selector */}
        <NetworkSelector
          connectedPlatforms={overview?.connectedPlatforms || []}
          selectedPlatforms={selectedPlatforms}
          onSelectionChange={setSelectedPlatforms}
        />

        {/* Weekly Metrics Cards (Platform Data) */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-brand-primary" />
            <h2 className="text-xl font-bold text-white">This Week</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-lg border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-200">New Fans</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {weeklyLoading ? '...' : (weeklyMetrics?.newFans || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-300 mt-1">Joined this week</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-lg border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-200">Points Redeemed</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {weeklyLoading ? '...' : (weeklyMetrics?.revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-green-300 mt-1">This week</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-lg border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-200">Tasks Completed</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {weeklyLoading ? '...' : (weeklyMetrics?.tasksCompleted || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-purple-300 mt-1">Fan engagement</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-lg border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-200">Rewards Redeemed</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {weeklyLoading ? '...' : (weeklyMetrics?.rewardsRedeemed || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-yellow-300 mt-1">This week</p>
                  </div>
                  <Gift className="h-10 w-10 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cross-Platform Analytics */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AnalyticsOverviewCards
              data={overview?.overview}
              isLoading={overviewLoading}
              dateRangeLabel={dateRange === '7d' ? 'this week' : dateRange === '30d' ? 'this month' : 'this quarter'}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PlatformBreakdown
                  platforms={overview?.platforms || []}
                  isLoading={overviewLoading}
                />
              </div>
              <div>
                <AIInsightsPanel maxInsights={4} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <GrowthChart data={growthData} isLoading={growthLoading} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/creator-dashboard/growth">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                        <span>Detailed Growth Analytics</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-primary transition-colors" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">
                      View detailed growth trends, fan engagement metrics, and platform-specific insights
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <ContentPerformance
              content={contentData?.content || []}
              isLoading={contentLoading}
              title="Top Performing Content"
            />
          </TabsContent>

          <TabsContent value="comparison">
            <PlatformComparison data={comparisonData} isLoading={comparisonLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
