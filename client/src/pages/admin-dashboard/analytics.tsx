import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { VerificationAnalyticsDashboard } from '@/components/analytics/VerificationAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, Share2, Award } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PERIOD_OPTIONS = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
] as const;

const CHART_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const tooltipStyle = {
  backgroundColor: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 8,
};

function PeriodToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// USER ANALYTICS TAB
// ============================================================================

function UserAnalyticsTab() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery<{
    growth: Array<{ date: string; signups: number; fans: number; creators: number }>;
    providers: Array<{ provider: string; count: number }>;
    totals: { dau: number; wau: number; mau: number; total: number };
  }>({
    queryKey: ['/api/admin/analytics/users', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/users?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          title="DAU"
          value={data?.totals.dau.toLocaleString() ?? '0'}
          description="Daily active users"
          icon={Users}
          loading={isLoading}
        />
        <AdminStatCard
          title="WAU"
          value={data?.totals.wau.toLocaleString() ?? '0'}
          description="Weekly active users"
          icon={Users}
          loading={isLoading}
        />
        <AdminStatCard
          title="MAU"
          value={data?.totals.mau.toLocaleString() ?? '0'}
          description="Monthly active users"
          icon={Users}
          loading={isLoading}
        />
        <AdminStatCard
          title="Total Users"
          value={data?.totals.total.toLocaleString() ?? '0'}
          description="All registered users"
          icon={Users}
          loading={isLoading}
        />
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-white text-base">Signups Over Time</CardTitle>
          <PeriodToggle value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.growth ?? []}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#999', fontSize: 11 }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#999' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="#8b5cf6"
                  fill="url(#colorSignups)"
                  name="Total Signups"
                />
                <Area
                  type="monotone"
                  dataKey="fans"
                  stroke="#3b82f6"
                  fill="none"
                  strokeDasharray="4 4"
                  name="Fans"
                />
                <Area
                  type="monotone"
                  dataKey="creators"
                  stroke="#10b981"
                  fill="none"
                  strokeDasharray="4 4"
                  name="Creators"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">Auth Provider Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.providers ?? []}
                  dataKey="count"
                  nameKey="provider"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ provider, count }) => `${provider} (${count})`}
                  labelLine={{ stroke: '#666' }}
                >
                  {(data?.providers ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#999' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TASK ANALYTICS TAB
// ============================================================================

function TaskAnalyticsTab() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery<{
    byPlatform: Array<{ platform: string; completions: number }>;
    byTier: Array<{ tier: string; completions: number; verified: number }>;
    byType: Array<{ taskType: string; completions: number }>;
    daily: Array<{ date: string; completions: number }>;
  }>({
    queryKey: ['/api/admin/analytics/tasks', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/tasks?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-white text-base">Daily Completions</CardTitle>
          <PeriodToggle value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#999', fontSize: 11 }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#999' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar
                  dataKey="completions"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  name="Completions"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Completions by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.byPlatform ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#999' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar
                    dataKey="completions"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    name="Completions"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">By Verification Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-3">
                {(data?.byTier ?? []).map((t) => {
                  const rate =
                    t.completions > 0 ? Math.round((t.verified / t.completions) * 100) : 0;
                  return (
                    <div key={t.tier} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Tier {t.tier}</span>
                        <span className="text-gray-400">
                          {t.completions} completions ({rate}% verified)
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!data?.byTier || data.byTier.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No tier data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">Top Task Types</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.byType ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="taskType"
                  stroke="#666"
                  tick={{ fill: '#999', fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#999' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar
                  dataKey="completions"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  name="Completions"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SOCIAL ANALYTICS TAB
// ============================================================================

function SocialAnalyticsTab() {
  const { data, isLoading } = useQuery<{
    platforms: Array<{ platform: string; connections: number }>;
    trend: Array<{ date: string; connections: number }>;
  }>({
    queryKey: ['/api/admin/analytics/social'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/social', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const totalConnections = data?.platforms.reduce((sum, p) => sum + p.connections, 0) ?? 0;

  return (
    <div className="space-y-6">
      <AdminStatCard
        title="Total Social Connections"
        value={totalConnections.toLocaleString()}
        description={`${data?.platforms.length ?? 0} platforms connected`}
        icon={Share2}
        loading={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Connections by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.platforms ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#999' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="connections" name="Connections">
                    {(data?.platforms ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">New Connections (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.trend ?? []}>
                  <defs>
                    <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 11 }}
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#999' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="connections"
                    stroke="#3b82f6"
                    fill="url(#colorSocial)"
                    name="Connections"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// BLOCKCHAIN ANALYTICS TAB
// ============================================================================

function BlockchainAnalyticsTab() {
  const { data, isLoading } = useQuery<{
    distribution: Array<{ range: string; count: number }>;
    syncStats: {
      total: number;
      synced: number;
      pending: number;
      failed: number;
      avgScore: number;
      stakingEligible: number;
      tokenEligible: number;
    };
  }>({
    queryKey: ['/api/admin/analytics/blockchain'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/blockchain', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const s = data?.syncStats;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          title="Avg Reputation Score"
          value={s?.avgScore ?? 0}
          description="Across all users"
          icon={Award}
          loading={isLoading}
        />
        <AdminStatCard
          title="Staking Eligible"
          value={s?.stakingEligible?.toLocaleString() ?? '0'}
          description="Score >= 500"
          icon={Award}
          loading={isLoading}
        />
        <AdminStatCard
          title="Token Eligible"
          value={s?.tokenEligible?.toLocaleString() ?? '0'}
          description="Score >= 750"
          icon={Award}
          loading={isLoading}
        />
        <AdminStatCard
          title="On-Chain Synced"
          value={s?.synced?.toLocaleString() ?? '0'}
          description={`${s?.pending ?? 0} pending, ${s?.failed ?? 0} failed`}
          icon={Activity}
          loading={isLoading}
        />
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">Reputation Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.distribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#999' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                  {(data?.distribution ?? []).map((entry, i) => {
                    const start = parseInt(entry.range);
                    let color = '#6b7280';
                    if (start >= 750) color = '#f59e0b';
                    else if (start >= 500) color = '#10b981';
                    else if (start >= 250) color = '#8b5cf6';
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN ANALYTICS PAGE
// ============================================================================

export default function AdminAnalytics() {
  return (
    <AdminLayout
      title="Analytics & Insights"
      description="Platform-wide analytics across users, tasks, social, and blockchain"
    >
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserAnalyticsTab />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskAnalyticsTab />
        </TabsContent>

        <TabsContent value="social">
          <SocialAnalyticsTab />
        </TabsContent>

        <TabsContent value="blockchain">
          <BlockchainAnalyticsTab />
        </TabsContent>

        <TabsContent value="verification">
          <VerificationAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
