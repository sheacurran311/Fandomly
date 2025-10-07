import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Store, 
  DollarSign, 
  TrendingUp, 
  Target,
  Share2,
  Activity,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlatformStats {
  users: {
    total: number;
    fans: number;
    creators: number;
    admins: number;
    growth: number;
  };
  creators: {
    total: number;
    active: number;
    tenants: number;
    growth: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    growth: number;
  };
  tasks: {
    total: number;
    platformTasks: number;
    completions: number;
    growth: number;
  };
  referrals: {
    total: number;
    pending: number;
    revenueShared: number;
  };
  engagement: {
    activeUsers: number;
    avgSessionTime: number;
    dailyActive: number;
  };
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  trendLabel,
  loading 
}: { 
  title: string;
  value: string | number;
  description: string;
  icon: any;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-brand-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-400">{description}</p>
              {trend !== undefined && (
                <Badge 
                  variant="outline" 
                  className={trend >= 0 ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}
                >
                  <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(trend)}% {trendLabel}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
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
          <StatCard
            title="Total Users"
            value={stats?.users.total.toLocaleString() || '0'}
            description={`${stats?.users.fans || 0} fans, ${stats?.users.creators || 0} creators`}
            icon={Users}
            trend={stats?.users.growth}
            trendLabel="this month"
            loading={isLoading}
          />
          
          <StatCard
            title="Active Creators"
            value={stats?.creators.active.toLocaleString() || '0'}
            description={`${stats?.creators.tenants || 0} active tenants`}
            icon={Store}
            trend={stats?.creators.growth}
            trendLabel="this month"
            loading={isLoading}
          />
          
          <StatCard
            title="Platform Revenue"
            value={`$${(stats?.revenue.thisMonth || 0).toLocaleString()}`}
            description="This month"
            icon={DollarSign}
            trend={stats?.revenue.growth}
            trendLabel="vs last month"
            loading={isLoading}
          />
          
          <StatCard
            title="Task Completions"
            value={stats?.tasks.completions.toLocaleString() || '0'}
            description={`${stats?.tasks.platformTasks || 0} platform tasks active`}
            icon={Target}
            trend={stats?.tasks.growth}
            trendLabel="this week"
            loading={isLoading}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Active Referrals"
            value={stats?.referrals.total.toLocaleString() || '0'}
            description={`${stats?.referrals.pending || 0} pending payouts`}
            icon={Share2}
            loading={isLoading}
          />
          
          <StatCard
            title="Daily Active Users"
            value={stats?.engagement.dailyActive.toLocaleString() || '0'}
            description={`${stats?.engagement.activeUsers || 0} weekly active`}
            icon={Activity}
            loading={isLoading}
          />
          
          <StatCard
            title="Avg Session Time"
            value={`${stats?.engagement.avgSessionTime || 0}m`}
            description="Per user session"
            icon={Zap}
            loading={isLoading}
          />
        </div>

        {/* Quick Actions / Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400">
                Activity feed coming soon...
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Platform Health</CardTitle>
              <CardDescription>System status and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">API Status</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Database</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Uptime</span>
                  <span className="text-sm text-white font-medium">99.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

