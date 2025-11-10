import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, DollarSign, Target, Trophy, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgencyAnalytics {
  totalBrands: number;
  totalFans: number;
  totalRevenue: number;
  totalTasks: number;
  totalCampaigns: number;
  totalPoints: number;
  avgEngagementRate: number;
  topPerformingBrand?: {
    name: string;
    fans: number;
    revenue: number;
  };
  recentActivity: Array<{
    brandName: string;
    activityType: string;
    description: string;
    timestamp: string;
  }>;
  brandBreakdown: Array<{
    brandName: string;
    fans: number;
    revenue: number;
    tasks: number;
    campaigns: number;
  }>;
}

export default function AgencyDashboard() {
  const { user } = useAuth();
  const { activeTenantId } = useActiveTenant();

  const { data: analytics, isLoading, error } = useQuery<AgencyAnalytics>({
    queryKey: ['/api/agencies/analytics', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID found');
      
      const response = await fetch(`/api/agencies/${user.agencyId}/analytics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch agency analytics');
      return response.json();
    },
    enabled: !!user?.agencyId && user.brandType === 'agency',
  });

  // Only show for agency users
  if (!user || user.brandType !== 'agency') {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <Alert className="max-w-lg">
          <AlertDescription>
            This page is only accessible to agency users. If you believe this is an error, please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Agency Dashboard</h1>
          </div>
          <p className="text-gray-400">Aggregated analytics across all your managed brands</p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>
              Failed to load agency analytics. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Brands</CardTitle>
              <Building2 className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">{analytics?.totalBrands || 0}</div>
              )}
              <p className="text-xs text-gray-400 mt-1">Under management</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Fans</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">{analytics?.totalFans?.toLocaleString() || 0}</div>
              )}
              <p className="text-xs text-gray-400 mt-1">Across all brands</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  ${(analytics?.totalRevenue || 0).toLocaleString()}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">All-time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {(analytics?.avgEngagementRate || 0).toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Across brands</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Tasks</CardTitle>
              <Target className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-white">{analytics?.totalTasks || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
              <Calendar className="h-4 w-4 text-brand-accent" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-white">{analytics?.totalCampaigns || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Points</CardTitle>
              <Trophy className="h-4 w-4 text-brand-secondary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {analytics?.totalPoints?.toLocaleString() || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Brand */}
        {analytics?.topPerformingBrand && (
          <Card className="bg-white/5 border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand-secondary" />
                Top Performing Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{analytics.topPerformingBrand.name}</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-400">Fans: </span>
                    <span className="text-white font-semibold">{analytics.topPerformingBrand.fans.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Revenue: </span>
                    <span className="text-white font-semibold">${analytics.topPerformingBrand.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand Breakdown Table */}
        {analytics?.brandBreakdown && analytics.brandBreakdown.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Brand Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Brand</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Fans</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Revenue</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Tasks</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Campaigns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.brandBreakdown.map((brand, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">{brand.brandName}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{brand.fans.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-300">${brand.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{brand.tasks}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{brand.campaigns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

