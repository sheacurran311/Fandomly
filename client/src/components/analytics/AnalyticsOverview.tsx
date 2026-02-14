/**
 * Analytics Overview Component
 * 
 * Summary cards showing aggregated metrics across all connected platforms.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye, Heart, FileText, TrendingUp, Award, CheckCircle2, BarChart3 } from 'lucide-react';

interface OverviewData {
  totalFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  totalFans: number;
  totalTaskCompletions: number;
  followerGrowth: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  description,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  change?: number;
  description?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatNumber(value)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {change !== undefined && (
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change >= 0 ? '+' : ''}{change}%{' '}
            </span>
          )}
          {description || ''}
        </p>
      </CardContent>
    </Card>
  );
}

interface AnalyticsOverviewProps {
  data?: OverviewData;
  isLoading?: boolean;
  dateRangeLabel?: string;
}

export function AnalyticsOverviewCards({ data, isLoading, dateRangeLabel }: AnalyticsOverviewProps) {
  const period = dateRangeLabel || 'this period';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Followers"
        value={data?.totalFollowers || 0}
        icon={Users}
        change={data?.followerGrowth}
        description={`across all platforms`}
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Views"
        value={data?.totalViews || 0}
        icon={Eye}
        description={`content views ${period}`}
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Engagement"
        value={data?.totalLikes || 0}
        icon={Heart}
        description={`likes across platforms`}
        isLoading={isLoading}
      />
      <MetricCard
        title="Program Fans"
        value={data?.totalFans || 0}
        icon={Award}
        description={`joined your programs`}
        isLoading={isLoading}
      />
      <MetricCard
        title="Content Published"
        value={data?.totalPosts || 0}
        icon={FileText}
        description="total across platforms"
        isLoading={isLoading}
      />
      <MetricCard
        title="Tasks Completed"
        value={data?.totalTaskCompletions || 0}
        icon={CheckCircle2}
        description={period}
        isLoading={isLoading}
      />
      <MetricCard
        title="Growth Rate"
        value={data?.followerGrowth || 0}
        icon={TrendingUp}
        description="follower growth %"
        isLoading={isLoading}
      />
      <MetricCard
        title="Platforms Connected"
        value={0} // Will be overridden at parent level
        icon={BarChart3}
        description="active networks"
        isLoading={isLoading}
      />
    </div>
  );
}
