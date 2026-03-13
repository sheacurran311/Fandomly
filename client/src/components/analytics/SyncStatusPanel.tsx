/**
 * Sync Status Panel
 *
 * Compact diagnostics card showing per-platform sync health.
 * Displays last sync time, status badge, items synced, and Sync Now button.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, KeyRound, Activity } from 'lucide-react';
import { PlatformIcon, getPlatformLabel } from './NetworkSelector';
import { useSyncStatus, type PlatformSyncStatus } from '@/hooks/use-analytics';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

function StatusBadge({ platform }: { platform: PlatformSyncStatus }) {
  if (!platform.hasToken) {
    return (
      <Badge variant="outline" className="gap-1 text-yellow-300 border-yellow-500/50">
        <KeyRound className="h-3 w-3" /> No Token
      </Badge>
    );
  }
  if (platform.syncStatus === 'syncing') {
    return (
      <Badge variant="secondary" className="gap-1 text-blue-300 bg-blue-500/20 border-blue-500/30">
        <Loader2 className="h-3 w-3 animate-spin" /> Syncing
      </Badge>
    );
  }
  if (platform.syncStatus === 'error' || platform.lastLogStatus === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" /> Error
      </Badge>
    );
  }
  if (!platform.syncEnabled) {
    return (
      <Badge variant="outline" className="gap-1 text-gray-400 border-gray-600">
        Disabled
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-green-300 bg-green-500/20 border-green-500/30">
      <CheckCircle2 className="h-3 w-3" /> Active
    </Badge>
  );
}

function PlatformRow({
  platform,
  onSyncNow,
  isSyncing,
}: {
  platform: PlatformSyncStatus;
  onSyncNow: () => void;
  isSyncing: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <PlatformIcon platform={platform.platform} className="h-5 w-5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {getPlatformLabel(platform.platform)}
          </div>
          <div className="text-xs text-gray-400">
            {platform.lastSyncAt
              ? `Synced ${formatRelativeTime(platform.lastSyncAt)}`
              : 'Never synced'}
            {platform.lastLogItemsSynced != null && platform.lastLogItemsSynced > 0 && (
              <span className="text-gray-500"> · {platform.lastLogItemsSynced} items</span>
            )}
          </div>
          {(platform.errorMessage || platform.lastLogError) && (
            <div className="text-xs text-red-400 mt-0.5 truncate">
              {platform.errorMessage || platform.lastLogError}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <StatusBadge platform={platform} />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSyncNow}
          disabled={isSyncing || platform.syncStatus === 'syncing' || !platform.hasToken}
          className="gap-1 text-xs h-7 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>
    </div>
  );
}

export function SyncStatusPanel() {
  const { data, isLoading, syncNow } = useSyncStatus();

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-primary" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data?.platforms?.length) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-primary" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-3">
            Connect social platforms to start syncing analytics data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-primary" />
            Sync Status
          </CardTitle>
          {data.schedulerRunning ? (
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/40">
              Scheduler Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/40">
              Scheduler Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.platforms.map((platform) => (
          <PlatformRow
            key={platform.platform}
            platform={platform}
            onSyncNow={() => syncNow.mutate(platform.platform)}
            isSyncing={syncNow.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
