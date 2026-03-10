/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useFanStats, useActiveCampaigns } from '@/hooks/use-fan-dashboard';
import { useRewardRedemptions } from '@/hooks/use-points';
import DashboardLayout from '@/components/layout/dashboard-layout';
import DashboardCard from '@/components/dashboard/dashboard-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'wouter';
import {
  Trophy,
  Star,
  Gift,
  Users,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { TimeframeSelector, type Timeframe } from '@/components/charts/TimeframeSelector';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { PieChartCard } from '@/components/charts/PieChartCard';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

function getRedemptionStatusMeta(redemption: any) {
  const nftStatus = redemption.metadata?.nftMintStatus;

  if (nftStatus === 'completed') {
    return { label: 'nft minted', className: 'border-green-400/30 text-green-400' };
  }
  if (nftStatus === 'pending_wallet') {
    return { label: 'wallet needed', className: 'border-yellow-400/30 text-yellow-400' };
  }
  if (nftStatus === 'pending_manual') {
    return { label: 'awaiting mint', className: 'border-yellow-400/30 text-yellow-400' };
  }
  if (nftStatus === 'failed') {
    return { label: 'mint failed', className: 'border-red-400/30 text-red-400' };
  }
  if (redemption.status === 'fulfilled' || redemption.status === 'completed') {
    return { label: redemption.status, className: 'border-green-400/30 text-green-400' };
  }
  if (redemption.status === 'pending') {
    return { label: 'pending', className: 'border-yellow-400/30 text-yellow-400' };
  }
  return { label: redemption.status || 'unknown', className: 'border-gray-400/30 text-gray-400' };
}

export default function FanDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: fanStats, isLoading: statsLoading, error: statsError } = useFanStats();
  const { data: activeCampaigns, isLoading: campaignsLoading } = useActiveCampaigns();
  const { data: redemptionHistory = [], isLoading: redemptionsLoading } = useRewardRedemptions();

  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  // Fetch points history
  const { data: pointsHistory } = useQuery({
    queryKey: ['/api/fan/dashboard/points-history', timeframe],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/fan/dashboard/points-history?timeframe=${timeframe}`
      );
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch task completion stats
  const { data: taskStats } = useQuery({
    queryKey: ['/api/fan/dashboard/task-completion-stats', timeframe],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/fan/dashboard/task-completion-stats?timeframe=${timeframe}`
      );
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

  // Fetch user task completions for total count
  const { data: userCompletions } = useQuery({
    queryKey: ['/api/task-completions/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/task-completions/me');
      return response.json();
    },
    enabled: !!user,
  });

  // Calculate total tasks completed
  const totalTasksCompleted = useMemo(
    () =>
      userCompletions?.completions?.filter(
        (c: any) => c.status === 'completed' || c.status === 'claimed'
      ).length || 0,
    [userCompletions?.completions]
  );

  // Calculate total points (platform + creator)
  const totalPoints = (fanStats?.platformPoints || 0) + (fanStats?.creatorPoints || 0);

  // Memoize merged points history data for chart
  const mergedPointsHistory = useMemo(() => {
    const periodMap = new Map<
      string,
      { period: string; platformPoints: number; creatorPoints: number }
    >();

    // Process platform points
    (pointsHistory?.platformPoints || []).forEach((item: any) => {
      const period = item.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, { period, platformPoints: 0, creatorPoints: 0 });
      }
      periodMap.get(period)!.platformPoints = Number(item.points) || 0;
    });

    // Process creator points
    (pointsHistory?.creatorPoints || []).forEach((item: any) => {
      const period = item.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, { period, platformPoints: 0, creatorPoints: 0 });
      }
      periodMap.get(period)!.creatorPoints = Number(item.points) || 0;
    });

    return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [pointsHistory]);

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
      <div className="p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.username || 'Fan'}!
          </h1>
          <p className="text-gray-400">
            Track your progress, complete tasks, and earn rewards from your favorite creators.
          </p>
        </div>

        {/* Key Metrics Row - 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p className="text-red-400">Failed to load stats. Please try again later.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <DashboardCard
                title="Total Points"
                value={totalPoints.toLocaleString()}
                description={`${fanStats?.platformPoints?.toLocaleString() || 0} platform + ${fanStats?.creatorPoints?.toLocaleString() || 0} creator`}
                change={fanStats?.pointsChange || undefined}
                icon={<Star className="h-5 w-5" />}
                gradient
              />
              <DashboardCard
                title="Tasks Completed"
                value={totalTasksCompleted.toString()}
                description="Total tasks done"
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <DashboardCard
                title="Creators Joined"
                value={
                  (fanStats?.creatorsEnrolledCount ?? fanStats?.followingCount)?.toString() || '0'
                }
                description="Active memberships"
                icon={<Users className="h-5 w-5" />}
              />
              <DashboardCard
                title="Rewards Redeemed"
                value={fanStats?.rewardsEarned?.toString() || '0'}
                description="Total rewards claimed"
                icon={<Gift className="h-5 w-5" />}
              />
            </>
          )}
        </div>

        {/* Activity Section - 2 column charts */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Activity</h2>
            <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points History Chart - Stacked Bar */}
            <BarChartCard
              title="Points Earned"
              description="Platform and creator points over time"
              data={mergedPointsHistory}
              dataKeys={[
                { key: 'platformPoints', color: '#8b5cf6', name: 'Platform' },
                { key: 'creatorPoints', color: '#3b82f6', name: 'Creator' },
              ]}
              xAxisKey="period"
              height={280}
              stacked
            />

            {/* Task Completion Chart */}
            <BarChartCard
              title="Task Completions"
              description="Your task activity over time"
              data={(taskStats as any)?.completions || []}
              dataKeys={[{ key: 'completed', color: '#10b981', name: 'Tasks Completed' }]}
              xAxisKey="period"
              height={280}
            />
          </div>
        </div>

        {/* Insights Row - 3 columns */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Insights</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Points Breakdown Pie Chart */}
            <PieChartCard
              title="Points by Source"
              description="Where your points come from"
              data={[
                ...(pointsBreakdown?.platformPoints?.map((item: any) => ({
                  name: item.source || 'Platform',
                  value: Number(item.total_points) || 0,
                  color: '#8b5cf6',
                })) || []),
                ...(pointsBreakdown?.creatorPoints?.map((item: any) => ({
                  name: item.source || 'Creator',
                  value: Number(item.total_points) || 0,
                  color: '#3b82f6',
                })) || []),
              ].filter((item) => item.value > 0)}
              height={260}
            />

            {/* Programs Overview */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center justify-between">
                  <span>Programs Overview</span>
                  <Link href="/fan-dashboard/joined">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white h-7 px-2"
                    >
                      View All <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaignsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : !activeCampaigns || activeCampaigns.length === 0 ? (
                  <div className="text-center py-6">
                    <Trophy className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-3">No programs yet</p>
                    <Link href="/find-creators">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                      >
                        Discover Creators
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {activeCampaigns.slice(0, 4).map((campaign: any) => (
                      <div
                        key={campaign.id}
                        className="flex items-center space-x-3 p-2 rounded-lg bg-white/5"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={campaign.creatorImageUrl || (campaign as any).creatorImage}
                          />
                          <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                            {campaign.creator?.substring(0, 2).toUpperCase() || 'CR'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {campaign.creator}
                          </p>
                          <p className="text-xs text-gray-400">
                            {campaign.points.toLocaleString()} pts earned
                          </p>
                        </div>
                      </div>
                    ))}
                    {activeCampaigns.length > 4 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{activeCampaigns.length - 4} more programs
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Redeemed Rewards */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center justify-between">
                  <span>Redeemed Rewards</span>
                  <Link href="/fan-dashboard/rewards-store">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white h-7 px-2"
                    >
                      View All <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {redemptionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : redemptionHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-1">No redeemed rewards yet</p>
                    <p className="text-xs text-gray-500">
                      Visit the{' '}
                      <Link
                        href="/fan-dashboard/rewards-store"
                        className="text-brand-primary hover:underline"
                      >
                        Rewards Store
                      </Link>{' '}
                      to redeem your points!
                    </p>
                  </div>
                ) : (
                  <>
                    {redemptionHistory.slice(0, 5).map((redemption: any) => {
                      const statusMeta = getRedemptionStatusMeta(redemption);
                      return (
                        <div
                          key={redemption.id}
                          className="flex items-center space-x-3 p-2 rounded-lg bg-white/5"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              statusMeta.className.includes('green')
                                ? 'bg-green-400/20 text-green-400'
                                : statusMeta.className.includes('yellow')
                                  ? 'bg-yellow-400/20 text-yellow-400'
                                  : statusMeta.className.includes('red')
                                    ? 'bg-red-400/20 text-red-400'
                                    : 'bg-gray-400/20 text-gray-400'
                            }`}
                          >
                            <Gift className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {redemption.reward?.name || 'Reward'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {redemption.pointsSpent?.toLocaleString() || 0} pts &middot;{' '}
                              {formatDistanceToNow(new Date(redemption.redeemedAt), {
                                addSuffix: true,
                              })}
                            </p>
                            {redemption.metadata?.nftMintMessage && (
                              <p className="text-xs text-yellow-300 mt-1">
                                {redemption.metadata.nftMintMessage}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>
                      );
                    })}
                    {redemptionHistory.length > 5 && (
                      <Link href="/fan-dashboard/rewards-store">
                        <p className="text-xs text-brand-primary text-center hover:underline cursor-pointer pt-1">
                          +{redemptionHistory.length - 5} more redemptions
                        </p>
                      </Link>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Points by Program Section */}
        {pointsBreakdown?.creatorPoints && pointsBreakdown.creatorPoints.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Points by Program</h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const maxPoints = Math.max(
                      ...pointsBreakdown.creatorPoints.map((p: any) => Number(p.total_points) || 0)
                    );
                    return pointsBreakdown.creatorPoints.map((program: any, index: number) => {
                      const points = Number(program.total_points) || 0;
                      const percentage = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
                      return (
                        <div key={index} className="p-4 rounded-lg bg-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 truncate max-w-[70%] font-medium">
                              {program.source}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {points.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-white/10">
          <Link href="/find-creators">
            <Button className="bg-brand-primary hover:bg-brand-primary/80">
              <Users className="h-4 w-4 mr-2" />
              Discover Creators
            </Button>
          </Link>
          <Link href="/fan-dashboard/rewards-store">
            <Button
              variant="outline"
              className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
            >
              <Gift className="h-4 w-4 mr-2" />
              Browse Rewards
            </Button>
          </Link>
          <Link href="/fan-dashboard/tasks">
            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              View All Tasks
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
