/**
 * Content Picker Modal
 *
 * Dialog that fetches the creator's synced content and lets them
 * pick a piece of content to auto-fill a task URL field.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Heart, Play, Image as ImageIcon, FileText, Check } from 'lucide-react';
import { PlatformIcon, getPlatformLabel } from '@/components/analytics/NetworkSelector';
import { fetchApi } from '@/lib/queryClient';

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

interface ContentPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-filter to a specific platform (e.g. "twitter", "tiktok") */
  platform?: string;
  /** Called when user picks a content item */
  onSelect: (item: { url: string; title: string }) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ContentPickerModal({
  open,
  onClose,
  platform: initialPlatform,
  onSelect,
}: ContentPickerModalProps) {
  const [sortBy, setSortBy] = useState('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const platformParam = initialPlatform || 'all';

  const { data, isLoading } = useQuery<{ content: ContentItem[]; total: number }>({
    queryKey: ['/api/analytics/content', platformParam, sortBy],
    queryFn: () => {
      const params = new URLSearchParams({ sortBy, limit: '30' });
      if (platformParam !== 'all') params.set('platforms', platformParam);
      return fetchApi(`/api/analytics/content?${params}`);
    },
    enabled: open,
    staleTime: 30_000,
  });

  const content = data?.content || [];
  const selected = content.find((c) => c.id === selectedId);

  const handleConfirm = () => {
    if (selected?.url) {
      onSelect({
        url: selected.url,
        title: selected.title || selected.description?.slice(0, 80) || '',
      });
      onClose();
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pick from your content</DialogTitle>
        </DialogHeader>

        {/* Sort control */}
        <div className="flex items-center gap-2 pb-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="views">Most Viewed</SelectItem>
              <SelectItem value="engagement">Most Engaged</SelectItem>
            </SelectContent>
          </Select>
          {initialPlatform && (
            <Badge variant="outline" className="gap-1">
              <PlatformIcon platform={initialPlatform} className="h-3 w-3" />
              {getPlatformLabel(initialPlatform)}
            </Badge>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : content.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No synced content found.</p>
              <p className="text-xs mt-1">Sync your platforms from the Analytics page first.</p>
            </div>
          ) : (
            content.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedId === item.id
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-black/20">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.contentType === 'video' ? (
                        <Play className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {item.title || item.description?.slice(0, 60) || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <PlatformIcon platform={item.platform} className="h-3 w-3" />
                    <span>{getPlatformLabel(item.platform)}</span>
                    {item.views > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-3 w-3" /> {formatCount(item.views)}
                      </span>
                    )}
                    {item.likes > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" /> {formatCount(item.likes)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                {selectedId === item.id && (
                  <Check className="h-5 w-5 text-brand-primary flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selected?.url}>
            Use Selected Content
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
