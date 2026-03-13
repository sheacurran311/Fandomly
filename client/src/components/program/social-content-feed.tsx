/**
 * Social Content Feed
 *
 * Displays synced social content (posts, videos) from a program's creator.
 * Used on the public program page and optionally as a picker for task builders.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Play,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { PlatformIcon, getPlatformLabel } from '@/components/analytics/NetworkSelector';

interface ContentItem {
  id: string;
  platform: string;
  platformContentId: string;
  contentType: string;
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

interface SocialContentFeedProps {
  programId: string;
  /** When true, renders cards as selectable. Used for task content picker. */
  allowSelection?: boolean;
  /** Called when a content item is selected (picker mode). */
  onSelect?: (item: ContentItem) => void;
  /** Filter by specific platform (picker mode). */
  platformFilter?: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ContentTypeIcon({ type }: { type: string }) {
  if (type === 'video' || type === 'reel' || type === 'short') {
    return <Play className="h-3.5 w-3.5" />;
  }
  if (type === 'image' || type === 'photo') {
    return <ImageIcon className="h-3.5 w-3.5" />;
  }
  return <FileText className="h-3.5 w-3.5" />;
}

function ContentCard({
  item,
  selectable,
  onSelect,
}: {
  item: ContentItem;
  selectable: boolean;
  onSelect?: () => void;
}) {
  const title =
    item.title || item.description?.slice(0, 80) || `${item.contentType} on ${item.platform}`;

  return (
    <Card
      className={`bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden transition-all ${
        selectable ? 'cursor-pointer hover:border-brand-primary/50 hover:bg-white/10' : ''
      }`}
      onClick={selectable ? onSelect : undefined}
    >
      {/* Thumbnail */}
      {item.thumbnailUrl ? (
        <div className="relative aspect-video bg-black/20">
          <img
            src={item.thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {(item.contentType === 'video' ||
            item.contentType === 'reel' ||
            item.contentType === 'short') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-8 w-8 text-white/80" />
            </div>
          )}
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 gap-1 text-xs bg-black/60 text-white border-none"
          >
            <PlatformIcon platform={item.platform} className="h-3 w-3" />
            {getPlatformLabel(item.platform)}
          </Badge>
        </div>
      ) : (
        <div className="relative aspect-video bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
          <ContentTypeIcon type={item.contentType} />
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 gap-1 text-xs bg-black/60 text-white border-none"
          >
            <PlatformIcon platform={item.platform} className="h-3 w-3" />
            {getPlatformLabel(item.platform)}
          </Badge>
        </div>
      )}

      <CardContent className="p-3 space-y-2">
        <p className="text-sm text-white font-medium line-clamp-2">{title}</p>

        {/* Metrics row */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {item.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {formatCount(item.views)}
            </span>
          )}
          {item.likes > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> {formatCount(item.likes)}
            </span>
          )}
          {item.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {formatCount(item.comments)}
            </span>
          )}
          {item.shares > 0 && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" /> {formatCount(item.shares)}
            </span>
          )}
        </div>

        {/* Date + link */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(item.publishedAt)}</span>
          {!selectable && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialContentFeed({
  programId,
  allowSelection = false,
  onSelect,
  platformFilter: initialPlatformFilter,
}: SocialContentFeedProps) {
  const [platform, setPlatform] = useState(initialPlatformFilter || 'all');
  const [sortBy, setSortBy] = useState('recent');

  const { data, isLoading } = useQuery<{ content: ContentItem[]; total: number }>({
    queryKey: ['/api/programs', programId, 'content', platform, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy,
        limit: '24',
      });
      if (platform !== 'all') params.set('platform', platform);

      const res = await fetch(`/api/programs/${programId}/content?${params}`);
      if (!res.ok) {
        if (res.status === 403) return { content: [], total: 0 };
        throw new Error('Failed to fetch content');
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  // Extract unique platforms from content for the filter
  const availablePlatforms = [...new Set((data?.content || []).map((c) => c.platform))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 bg-white/10" />
          <Skeleton className="h-9 w-28 bg-white/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-56 w-full bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const content = data?.content || [];

  if (content.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No content available yet.</p>
        <p className="text-xs mt-1">Content syncs automatically from connected platforms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {!initialPlatformFilter && (
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {availablePlatforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {getPlatformLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            selectable={allowSelection}
            onSelect={() => onSelect?.(item)}
          />
        ))}
      </div>
    </div>
  );
}
