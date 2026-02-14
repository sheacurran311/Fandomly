/**
 * Growth Chart Component
 * 
 * Line chart showing follower/engagement growth over time using recharts.
 * Supports per-platform and aggregated views.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { getPlatformLabel } from './NetworkSelector';
import type { GrowthData } from '@/hooks/use-analytics';

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  facebook: '#1877F2',
  tiktok: '#000000',
  twitch: '#9146FF',
  spotify: '#1DB954',
  discord: '#5865F2',
  kick: '#53FC18',
  patreon: '#FF424D',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface GrowthChartProps {
  data?: GrowthData;
  isLoading?: boolean;
}

export function GrowthChart({ data, isLoading }: GrowthChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Over Time</CardTitle>
          <CardDescription>Follower and engagement trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const aggregated = data?.aggregated || [];
  const platforms = Object.keys(data?.byPlatform || {});

  if (aggregated.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Over Time</CardTitle>
          <CardDescription>Follower and engagement trends</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No growth data available yet. Data will appear once syncing has run for multiple days.
        </CardContent>
      </Card>
    );
  }

  const chartData = aggregated.map((item) => ({
    date: formatDate(item.date),
    rawDate: item.date,
    followers: item.totalFollowers,
    views: item.totalViews,
    likes: item.totalLikes,
    ...Object.fromEntries(
      platforms.map(p => [`${p}_followers`, item.platforms[p]?.followers || 0])
    ),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Over Time</CardTitle>
        <CardDescription>Follower and engagement trends across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="followers">
          <TabsList className="mb-4">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="views">Views</TabsTrigger>
            <TabsTrigger value="platform">By Platform</TabsTrigger>
          </TabsList>

          <TabsContent value="followers">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), 'Followers']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="views">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), 'Views']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="platform">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip formatter={(value: number, name: string) => {
                  const platform = name.replace('_followers', '');
                  return [formatNumber(value), getPlatformLabel(platform)];
                }} />
                <Legend formatter={(value: string) => getPlatformLabel(value.replace('_followers', ''))} />
                {platforms.map((platform) => (
                  <Line
                    key={platform}
                    type="monotone"
                    dataKey={`${platform}_followers`}
                    stroke={PLATFORM_COLORS[platform] || '#888'}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
