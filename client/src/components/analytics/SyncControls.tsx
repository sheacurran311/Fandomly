/**
 * Sync Controls Component
 * 
 * Per-platform sync toggle, status display, and manual sync trigger.
 * Allows creators to control their data syncing per platform.
 */

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { PlatformIcon, getPlatformLabel } from './NetworkSelector';
import { useSyncPreferences, type SyncPreference } from '@/hooks/use-analytics';

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

function formatNextSync(dateStr: string | null): string {
  if (!dateStr) return 'Not scheduled';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin <= 0) return 'Pending...';
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  return `in ${diffHrs}h`;
}

function SyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'syncing':
      return (
        <Badge variant="secondary" className="gap-1 text-blue-700 bg-blue-100">
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Error
        </Badge>
      );
    case 'idle':
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100">
          <CheckCircle2 className="h-3 w-3" /> Active
        </Badge>
      );
  }
}

interface SyncControlItemProps {
  platform: string;
  preference: SyncPreference | null;
  onToggle: (platform: string, enabled: boolean) => void;
  onSyncNow: (platform: string) => void;
  onFrequencyChange: (platform: string, minutes: number) => void;
  isTogglingSync: boolean;
  isSyncingNow: boolean;
}

function SyncControlItem({
  platform,
  preference,
  onToggle,
  onSyncNow,
  onFrequencyChange,
  isTogglingSync,
  isSyncingNow,
}: SyncControlItemProps) {
  const isEnabled = preference?.syncEnabled ?? true;
  const status = preference?.syncStatus || 'idle';

  return (
    <div className="flex items-center justify-between py-3 px-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <PlatformIcon platform={platform} className="h-5 w-5" />
        <div>
          <div className="font-medium text-sm">{getPlatformLabel(platform)}</div>
          <div className="text-xs text-muted-foreground">
            {isEnabled ? (
              <>
                Last synced: {formatRelativeTime(preference?.lastSyncAt || null)}
                {preference?.nextSyncAt && ` · Next: ${formatNextSync(preference.nextSyncAt)}`}
              </>
            ) : (
              'Syncing disabled'
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {isEnabled && <SyncStatusBadge status={status} />}

        {isEnabled && (
          <Select
            value={String(preference?.syncFrequencyMinutes || 60)}
            onValueChange={(val) => onFrequencyChange(platform, Number(val))}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">Every 15m</SelectItem>
              <SelectItem value="30">Every 30m</SelectItem>
              <SelectItem value="60">Hourly</SelectItem>
              <SelectItem value="360">Every 6h</SelectItem>
              <SelectItem value="720">Every 12h</SelectItem>
              <SelectItem value="1440">Daily</SelectItem>
            </SelectContent>
          </Select>
        )}

        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSyncNow(platform)}
            disabled={isSyncingNow || status === 'syncing'}
            className="gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}

        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onToggle(platform, checked)}
          disabled={isTogglingSync}
        />
      </div>
    </div>
  );
}

interface SyncControlsProps {
  connectedPlatforms?: string[];
  compact?: boolean;
}

export function SyncControls({ connectedPlatforms, compact = false }: SyncControlsProps) {
  const { data, isLoading, toggleSync, updateFrequency, syncNow } = useSyncPreferences();

  const platforms = connectedPlatforms || data?.connectedPlatforms || [];
  const prefsByPlatform = new Map(
    (data?.preferences || []).map((p) => [p.platform, p])
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (platform: string, enabled: boolean) => {
    toggleSync.mutate({ platform, syncEnabled: enabled });
  };

  const handleSyncNow = (platform: string) => {
    syncNow.mutate(platform);
  };

  const handleFrequencyChange = (platform: string, minutes: number) => {
    updateFrequency.mutate({ platform, syncFrequencyMinutes: minutes });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {platforms.map((platform) => (
          <SyncControlItem
            key={platform}
            platform={platform}
            preference={prefsByPlatform.get(platform) || null}
            onToggle={handleToggle}
            onSyncNow={handleSyncNow}
            onFrequencyChange={handleFrequencyChange}
            isTogglingSync={toggleSync.isPending}
            isSyncingNow={syncNow.isPending}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Data Sync Settings
        </CardTitle>
        <CardDescription>
          Control which platforms sync analytics data. When enabled, metrics are periodically fetched from each platform's API.
          Your data stays private and is only visible to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {platforms.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Connect social platforms to enable analytics syncing.
          </p>
        ) : (
          platforms.map((platform) => (
            <SyncControlItem
              key={platform}
              platform={platform}
              preference={prefsByPlatform.get(platform) || null}
              onToggle={handleToggle}
              onSyncNow={handleSyncNow}
              onFrequencyChange={handleFrequencyChange}
              isTogglingSync={toggleSync.isPending}
              isSyncingNow={syncNow.isPending}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
