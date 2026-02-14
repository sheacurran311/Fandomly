/**
 * Content Performance Component
 * 
 * Ranked list of top content across platforms with engagement metrics.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { PlatformIcon, PlatformBadge } from './NetworkSelector';
import type { TopContent } from '@/hooks/use-analytics';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });
}

interface ContentPerformanceProps {
  content: TopContent[];
  isLoading?: boolean;
  title?: string;
}

export function ContentPerformance({ content, isLoading, title = 'Top Content' }: ContentPerformanceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Best performing content across platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-16 w-24 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!content || content.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Best performing content across platforms</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No content data available. Connect platforms and enable syncing to see your top content.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Best performing content across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {content.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>

              {/* Thumbnail */}
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 object-cover rounded"
                />
              ) : (
                <div className="flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 bg-muted rounded flex items-center justify-center">
                  <PlatformIcon platform={item.platform} className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              {/* Content info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PlatformBadge platform={item.platform} />
                  <Badge variant="outline" className="text-xs">
                    {item.contentType}
                  </Badge>
                  {item.publishedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.publishedAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{item.title || 'Untitled'}</p>
                
                {/* Metrics row */}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  {item.totalViews > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(item.totalViews)}
                    </span>
                  )}
                  {item.totalLikes > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(item.totalLikes)}
                    </span>
                  )}
                  {item.totalComments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatNumber(item.totalComments)}
                    </span>
                  )}
                </div>
              </div>

              {/* Link */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
