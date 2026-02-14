/**
 * Platform Breakdown Component
 * 
 * Shows per-platform metric cards for comparison.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformIcon, getPlatformLabel } from './NetworkSelector';
import type { PlatformMetrics } from '@/hooks/use-analytics';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface PlatformBreakdownProps {
  platforms: PlatformMetrics[];
  isLoading?: boolean;
}

export function PlatformBreakdown({ platforms, isLoading }: PlatformBreakdownProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!platforms || platforms.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No platform data available. Connect social platforms and enable syncing to see metrics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => (
        <Card key={platform.platform}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <PlatformIcon platform={platform.platform} className="h-4 w-4" />
                {getPlatformLabel(platform.platform)}
              </span>
              {platform.engagementRate !== null && (
                <Badge variant="secondary" className="text-xs">
                  {platform.engagementRate}% ER
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Followers</div>
                <div className="font-semibold">{formatNumber(platform.followers)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Views</div>
                <div className="font-semibold">{formatNumber(platform.views)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Likes</div>
                <div className="font-semibold">{formatNumber(platform.likes)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Posts</div>
                <div className="font-semibold">{formatNumber(platform.posts)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
