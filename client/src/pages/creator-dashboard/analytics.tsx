import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  ArrowRight,
  Eye,
  Heart,
} from "lucide-react";

export default function AnalyticsOverview() {
  // Mock data - replace with actual API calls
  const metrics = {
    totalFans: 2847,
    totalRevenue: 7420,
    engagementRate: 24.5,
    activeCampaigns: 12,
  };

  const growthMetrics = {
    newFansThisMonth: 342,
    growthPercentage: 18.5,
    topSource: "Instagram",
  };

  const revenueMetrics = {
    thisMonth: 7420,
    lastMonth: 6850,
    growth: 8.3,
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Overview</h1>
          <p className="text-gray-400">
            Track your performance, growth, and revenue metrics
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Fans</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {metrics.totalFans.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-brand-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Engagement Rate</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {metrics.engagementRate}%
                  </p>
                </div>
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Campaigns</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {metrics.activeCampaigns}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Growth Card */}
          <Link href="/creator-dashboard/growth">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <span>Growth Analytics</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-primary transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">New Fans This Month</span>
                    <span className="text-lg font-bold text-white">
                      +{growthMetrics.newFansThisMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Growth Rate</span>
                    <span className="text-lg font-bold text-green-400">
                      +{growthMetrics.growthPercentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Top Source</span>
                    <span className="text-lg font-bold text-white">
                      {growthMetrics.topSource}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    View detailed growth trends, acquisition sources, and fan demographics
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Revenue Card */}
          <Link href="/creator-dashboard/revenue">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    <span>Revenue Analytics</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-primary transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">This Month</span>
                    <span className="text-lg font-bold text-white">
                      ${revenueMetrics.thisMonth.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Last Month</span>
                    <span className="text-lg font-bold text-gray-400">
                      ${revenueMetrics.lastMonth.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Growth</span>
                    <span className="text-lg font-bold text-green-400">
                      +{revenueMetrics.growth}%
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Track revenue streams, conversion rates, and monetization performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts Placeholder - You can add actual charts later */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-primary" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>Performance charts coming soon</p>
                <p className="text-sm mt-2">View detailed analytics in Growth and Revenue pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
