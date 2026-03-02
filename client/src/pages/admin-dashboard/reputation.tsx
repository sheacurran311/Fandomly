import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Award, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ReputationStats {
  totalUsers: number;
  stakingEligible: number;
  tokenEligible: number;
  avgScore: number;
  maxScore: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  pendingThresholds: number;
  thresholds: { FAN_STAKING: number; CREATOR_TOKEN: number };
}

interface SyncLog {
  id: string;
  syncType: string;
  usersProcessed: number;
  usersUpdated: number;
  usersFailed: number;
  txHashes: string[];
  durationMs: number;
  createdAt: string;
}

const tooltipStyle = {
  backgroundColor: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 8,
};

export default function AdminReputation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<ReputationStats>({
    queryKey: ['/api/admin/reputation/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reputation/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: SyncLog[] }>({
    queryKey: ['/api/admin/reputation/sync-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reputation/sync-logs?limit=20', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: blockchainData, isLoading: chartLoading } = useQuery<{
    distribution: Array<{ range: string; count: number }>;
  }>({
    queryKey: ['/api/admin/analytics/blockchain'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/blockchain', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/reputation/sync', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Batch sync complete',
        description: `${data.usersProcessed} processed, ${data.usersUpdated} updated, ${data.usersFailed} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reputation'] });
    },
    onError: () => {
      toast({ title: 'Sync failed', variant: 'destructive' });
    },
  });

  return (
    <AdminLayout
      title="Reputation System"
      description="Monitor reputation scores and on-chain sync status"
      actions={
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-brand-primary hover:bg-brand-primary/90"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing...' : 'Run Batch Sync'}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard
            title="Users Scored"
            value={stats?.totalUsers.toLocaleString() ?? '0'}
            description={`Avg score: ${stats?.avgScore ?? 0}`}
            icon={Award}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Staking Eligible"
            value={stats?.stakingEligible.toLocaleString() ?? '0'}
            description={`Score >= ${stats?.thresholds.FAN_STAKING ?? 500}`}
            icon={Award}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Token Eligible"
            value={stats?.tokenEligible.toLocaleString() ?? '0'}
            description={`Score >= ${stats?.thresholds.CREATOR_TOKEN ?? 750}`}
            icon={Award}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Pending Thresholds"
            value={stats?.pendingThresholds.toLocaleString() ?? '0'}
            description="Awaiting on-chain sync"
            icon={Clock}
            loading={statsLoading}
          />
        </div>

        {/* Sync Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="Synced"
            value={stats?.syncedCount.toLocaleString() ?? '0'}
            description="Successfully on-chain"
            icon={CheckCircle}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Pending"
            value={stats?.pendingCount.toLocaleString() ?? '0'}
            description="Awaiting next batch"
            icon={Clock}
            loading={statsLoading}
          />
          <AdminStatCard
            title="Failed"
            value={stats?.failedCount.toLocaleString() ?? '0'}
            description="Needs retry"
            icon={AlertTriangle}
            loading={statsLoading}
          />
        </div>

        {/* Score Distribution Chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={blockchainData?.distribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="range" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#999' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                    {(blockchainData?.distribution ?? []).map((entry, i) => {
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

        {/* Sync Logs */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Sync Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {logsData?.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-white/20 text-gray-300 text-xs">
                        {log.syncType}
                      </Badge>
                      <div>
                        <span className="text-sm text-white">
                          {log.usersProcessed} processed, {log.usersUpdated} updated
                        </span>
                        {log.usersFailed > 0 && (
                          <span className="text-sm text-red-400 ml-1">
                            ({log.usersFailed} failed)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{log.durationMs}ms</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {(!logsData?.logs || logsData.logs.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No sync logs yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
