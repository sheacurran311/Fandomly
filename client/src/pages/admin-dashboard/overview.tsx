import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Store, DollarSign, Target, Share2 } from 'lucide-react';
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
} from 'recharts';

interface PlatformStats {
  users: { total: number; fans: number; creators: number; admins: number; growth: number };
  creators: { total: number; active: number; tenants: number; growth: number };
  revenue: { total: number; thisMonth: number; growth: number };
  tasks: { total: number; platformTasks: number; completions: number; growth: number };
  referrals: { total: number; pending: number; revenueShared: number };
}

interface GrowthPoint {
  date: string;
  users: number;
  creators: number;
}

interface CompletionPoint {
  date: string;
  completions: number;
}

interface RecentUser {
  id: string;
  username: string;
  email: string | null;
  userType: string;
  createdAt: string;
}

const PERIOD_OPTIONS = [
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1y', value: '365d' },
] as const;

export default function AdminOverview() {
  const [growthPeriod, setGrowthPeriod] = useState('30d');
  const [completionPeriod, setCompletionPeriod] = useState('30d');

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<{ data: GrowthPoint[] }>({
    queryKey: ['/api/admin/stats/growth', growthPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/growth?period=${growthPeriod}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch growth data');
      return res.json();
    },
  });

  const { data: completionData, isLoading: completionsLoading } = useQuery<{
    data: CompletionPoint[];
  }>({
    queryKey: ['/api/admin/stats/completions', completionPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/completions?period=${completionPeriod}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch completion data');
      return res.json();
    },
  });

  const { data: recentUsers, isLoading: recentLoading } = useQuery<RecentUser[]>({
    queryKey: ['/api/admin/users/recent'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users/recent?limit=15', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch recent users');
      return res.json();
    },
  });

  return (
    <AdminLayout
      title="Platform Overview"
      description="Real-time metrics and key performance indicators"
    >
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            title="Total Users"
            value={stats?.users.total.toLocaleString() ?? '0'}
            description={`${stats?.users.fans ?? 0} fans, ${stats?.users.creators ?? 0} creators`}
            icon={Users}
            trend={stats?.users.growth}
            trendLabel="vs last 30d"
            loading={statsLoading}
          />
          <AdminStatCard
            title="Active Creators"
            value={stats?.creators.active.toLocaleString() ?? '0'}
            description={`${stats?.creators.tenants ?? 0} active tenants`}
            icon={Store}
            trend={stats?.creators.growth}
            trendLabel="vs last 30d"
            loading={statsLoading}
          />
          <AdminStatCard
            title="Platform Revenue"
            value={`$${(stats?.revenue.thisMonth ?? 0).toLocaleString()}`}
            description="This month"
            icon={DollarSign}
            trend={stats?.revenue.growth}
            trendLabel="vs last month"
            loading={statsLoading}
          />
          <AdminStatCard
            title="Task Completions"
            value={stats?.tasks.completions.toLocaleString() ?? '0'}
            description={`${stats?.tasks.platformTasks ?? 0} platform tasks active`}
            icon={Target}
            trend={stats?.tasks.growth}
            trendLabel="vs last 30d"
            loading={statsLoading}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="Active Referrals"
            value={stats?.referrals.total.toLocaleString() ?? '0'}
            description={`${stats?.referrals.pending ?? 0} pending`}
            icon={Share2}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Total Creators"
            value={stats?.creators.total.toLocaleString() ?? '0'}
            description={`${stats?.creators.active ?? 0} verified`}
            icon={Store}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Total Tasks"
            value={stats?.tasks.total.toLocaleString() ?? '0'}
            description={`${stats?.tasks.platformTasks ?? 0} platform-level`}
            icon={Target}
            loading={statsLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* User Growth Chart */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-white text-base">User Growth</CardTitle>
              <div className="flex gap-1">
                {PERIOD_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={growthPeriod === opt.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setGrowthPeriod(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {growthLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={growthData?.data ?? []}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
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
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#999' }}
                      itemStyle={{ color: '#fff' }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#8b5cf6"
                      fill="url(#colorUsers)"
                      name="New Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="creators"
                      stroke="#10b981"
                      fill="none"
                      strokeDasharray="4 4"
                      name="New Creators"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Task Completions Chart */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-white text-base">Task Completions</CardTitle>
              <div className="flex gap-1">
                {PERIOD_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={completionPeriod === opt.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCompletionPeriod(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {completionsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={completionData?.data ?? []}>
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
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#999' }}
                      itemStyle={{ color: '#fff' }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
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
        </div>

        {/* Recent Signups + Platform Health */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Signups */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentUsers?.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email || 'No email'}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge
                          variant="outline"
                          className={
                            user.userType === 'creator'
                              ? 'border-purple-500/50 text-purple-400'
                              : user.userType === 'fan'
                                ? 'border-blue-500/50 text-blue-400'
                                : 'border-gray-500/50 text-gray-400'
                          }
                        >
                          {user.userType}
                        </Badge>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!recentUsers || recentUsers.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No recent signups</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Health */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Platform Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">API Status</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Database</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total Admins</span>
                  <span className="text-sm text-white font-medium">{stats?.users.admins ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Active Tenants</span>
                  <span className="text-sm text-white font-medium">
                    {stats?.creators.tenants ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total Referrals</span>
                  <span className="text-sm text-white font-medium">
                    {stats?.referrals.total ?? 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
