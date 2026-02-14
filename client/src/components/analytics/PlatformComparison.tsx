/**
 * Platform Comparison Component
 * 
 * Side-by-side comparison of metrics across all connected platforms.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PlatformIcon, getPlatformLabel } from './NetworkSelector';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ComparisonData } from '@/hooks/use-analytics';

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  facebook: '#1877F2',
  tiktok: '#010101',
  twitch: '#9146FF',
  spotify: '#1DB954',
  discord: '#5865F2',
  kick: '#53FC18',
  patreon: '#FF424D',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function GrowthIndicator({ growth }: { growth: number }) {
  if (growth > 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-600 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +{growth}%
      </span>
    );
  }
  if (growth < 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {growth}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}

interface PlatformComparisonProps {
  data?: ComparisonData;
  isLoading?: boolean;
}

export function PlatformComparison({ data, isLoading }: PlatformComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const comparison = data?.comparison || [];

  if (comparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Comparison</CardTitle>
          <CardDescription>Compare performance across platforms</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No comparison data available. Connect and sync platforms to compare performance.
        </CardContent>
      </Card>
    );
  }

  const maxFollowers = Math.max(...comparison.map(p => p.followers), 1);

  // Chart data for bar chart
  const chartData = comparison.map(p => ({
    name: getPlatformLabel(p.platform),
    platform: p.platform,
    followers: p.followers,
    views: p.totalViews,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Comparison</CardTitle>
        <CardDescription>Side-by-side view of your performance across platforms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Bar dataKey="followers" name="Followers" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || '#888'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Detailed breakdown */}
        <div className="space-y-3">
          {comparison.map((platform) => (
            <div
              key={platform.platform}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border"
            >
              <PlatformIcon platform={platform.platform} className="h-5 w-5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{getPlatformLabel(platform.platform)}</span>
                  {platform.username && (
                    <span className="text-xs text-muted-foreground">@{platform.username}</span>
                  )}
                  <GrowthIndicator growth={platform.followerGrowth} />
                </div>
                <Progress
                  value={(platform.followers / maxFollowers) * 100}
                  className="h-1.5"
                />
              </div>

              <div className="flex items-center gap-3 sm:gap-6 text-sm flex-shrink-0 flex-wrap">
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(platform.followers)}</div>
                  <div className="text-xs text-muted-foreground">followers</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(platform.totalViews)}</div>
                  <div className="text-xs text-muted-foreground">views</div>
                </div>
                {platform.engagementRate !== null && (
                  <div className="text-right">
                    <div className="font-semibold">{platform.engagementRate}%</div>
                    <div className="text-xs text-muted-foreground">engagement</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
