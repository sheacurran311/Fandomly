/**
 * Verification Analytics Dashboard
 * 
 * Displays verification metrics, platform health, and audit data
 * for creators and admins.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Server,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationMetrics {
  totalVerifications: number;
  successRate: number;
  byTier: {
    tier1: { total: number; success: number; rate: number };
    tier2: { total: number; success: number; rate: number };
    tier3: { total: number; success: number; rate: number };
  };
  byPlatform: Record<string, { total: number; success: number; rate: number }>;
  pendingManualReview: number;
  avgReviewTime: number;
}

interface PlatformHealth {
  platform: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccessAt?: string;
  failureRate24h: number;
  activeConnections: number;
  issues: string[];
}

interface DailyStats {
  date: string;
  verifications: number;
  successes: number;
  failures: number;
  manualReviews: number;
}

interface VerificationAnalyticsDashboardProps {
  creatorId?: string;
  className?: string;
}

export function VerificationAnalyticsDashboard({ 
  creatorId, 
  className 
}: VerificationAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<VerificationMetrics>({
    queryKey: ['verification-metrics', timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      const res = await fetch(`/api/analytics/verification/metrics?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
  });

  // Fetch platform health
  const { data: platformHealth, isLoading: healthLoading } = useQuery<PlatformHealth[]>({
    queryKey: ['platform-health'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/verification/platform-health', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch health');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch daily stats
  const { data: dailyStats } = useQuery<DailyStats[]>({
    queryKey: ['verification-daily', timeRange],
    queryFn: async () => {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const res = await fetch(`/api/analytics/verification/daily?days=${days}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch daily stats');
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Degraded</Badge>;
      case 'down':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Analytics</h2>
          <p className="text-muted-foreground">
            Monitor verification performance and platform health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range as typeof timeRange)}
              >
                {range}
              </Button>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchMetrics()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Verifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {metrics?.totalVerifications.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {metrics?.successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics?.successRate || 0} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {metrics?.pendingManualReview}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Review Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">
                  {metrics?.avgReviewTime.toFixed(1)}h
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Tier Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Verification by Tier</CardTitle>
              <CardDescription>
                Breakdown of T1 (API), T2 (Code), and T3 (Manual) verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(metrics?.byTier || {}).map(([tier, data]) => (
                    <div key={tier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{tier.toUpperCase()}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {data.success} / {data.total} verified
                          </span>
                        </div>
                        <span className="font-medium">{data.rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={data.rate} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
              <CardDescription>
                Verification attempts over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              {dailyStats && dailyStats.length > 0 ? (
                <div className="w-full h-full flex items-end gap-1">
                  {dailyStats.slice(-30).map((day, i) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-primary/20 rounded-t"
                      style={{
                        height: `${Math.max(5, (day.verifications / Math.max(...dailyStats.map(d => d.verifications))) * 100)}%`,
                      }}
                      title={`${day.date}: ${day.verifications} verifications`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>
                Verification success rates by social platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(metrics?.byPlatform || {})
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([platform, data]) => (
                      <div key={platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{platform}</span>
                            <span className="text-sm text-muted-foreground">
                              {data.total.toLocaleString()} verifications
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {data.rate >= 90 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : data.rate >= 70 ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{data.rate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <Progress 
                          value={data.rate} 
                          className={cn(
                            'h-2',
                            data.rate >= 90 ? '[&>div]:bg-green-500' : 
                            data.rate >= 70 ? '[&>div]:bg-yellow-500' : 
                            '[&>div]:bg-red-500'
                          )}
                        />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['tier1', 'tier2', 'tier3'].map((tier) => {
              const tierData = metrics?.byTier[tier as keyof typeof metrics.byTier];
              const tierInfo = {
                tier1: { name: 'T1 - API Verified', description: 'Automatic verification via platform APIs', icon: Zap, color: 'text-green-500' },
                tier2: { name: 'T2 - Code Verified', description: 'Code/hashtag verification in comments', icon: CheckCircle2, color: 'text-blue-500' },
                tier3: { name: 'T3 - Manual Review', description: 'Creator manual verification', icon: Clock, color: 'text-yellow-500' },
              }[tier]!;
              
              return (
                <Card key={tier}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <tierInfo.icon className={cn('h-5 w-5', tierInfo.color)} />
                      {tierInfo.name}
                    </CardTitle>
                    <CardDescription>{tierInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (
                      <div className="space-y-2">
                        <div className="text-3xl font-bold">
                          {tierData?.rate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tierData?.success.toLocaleString()} / {tierData?.total.toLocaleString()} verified
                        </p>
                        <Progress value={tierData?.rate || 0} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Platform Health Status
              </CardTitle>
              <CardDescription>
                Real-time status of social platform integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {platformHealth?.map((platform) => (
                    <div
                      key={platform.platform}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn('h-3 w-3 rounded-full', 
                          platform.status === 'healthy' ? 'bg-green-500' :
                          platform.status === 'degraded' ? 'bg-yellow-500' :
                          'bg-red-500'
                        )} />
                        <div>
                          <p className="font-medium capitalize">{platform.platform}</p>
                          <p className="text-sm text-muted-foreground">
                            {platform.activeConnections.toLocaleString()} active connections
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            {platform.failureRate24h.toFixed(1)}% failures (24h)
                          </p>
                          {platform.lastSuccessAt && (
                            <p className="text-xs text-muted-foreground">
                              Last success: {new Date(platform.lastSuccessAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(platform.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
