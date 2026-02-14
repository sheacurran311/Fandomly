/**
 * Network Selector
 * 
 * Multi-select filter for choosing which platforms to view analytics for.
 * Supports "All Networks" aggregate, individual platforms, and custom combinations.
 */

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Twitter, Instagram, Youtube, Facebook, Music2, 
  Twitch, MessageCircle, Radio, DollarSign, Globe
} from 'lucide-react';

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  twitter: { icon: Twitter, label: 'X / Twitter', color: 'bg-black text-white' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'bg-red-600 text-white' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'bg-blue-600 text-white' },
  tiktok: { icon: Music2, label: 'TikTok', color: 'bg-black text-white' },
  twitch: { icon: Twitch, label: 'Twitch', color: 'bg-purple-600 text-white' },
  spotify: { icon: Music2, label: 'Spotify', color: 'bg-green-600 text-white' },
  discord: { icon: MessageCircle, label: 'Discord', color: 'bg-indigo-600 text-white' },
  kick: { icon: Radio, label: 'Kick', color: 'bg-green-500 text-white' },
  patreon: { icon: DollarSign, label: 'Patreon', color: 'bg-orange-500 text-white' },
};

interface NetworkSelectorProps {
  connectedPlatforms: string[];
  selectedPlatforms: string | null; // null = all, comma-separated = specific
  onSelectionChange: (platforms: string | null) => void;
  compact?: boolean;
}

export function NetworkSelector({
  connectedPlatforms,
  selectedPlatforms,
  onSelectionChange,
  compact = false,
}: NetworkSelectorProps) {
  const selected = selectedPlatforms ? selectedPlatforms.split(',') : null;
  const isAll = selected === null;

  const togglePlatform = useCallback((platform: string) => {
    if (isAll) {
      // Switching from "all" to single platform
      onSelectionChange(platform);
      return;
    }

    const current = new Set(selected!);
    if (current.has(platform)) {
      current.delete(platform);
      if (current.size === 0) {
        onSelectionChange(null); // Back to all
        return;
      }
    } else {
      current.add(platform);
    }

    // If all platforms selected, switch to "all"
    if (current.size === connectedPlatforms.length) {
      onSelectionChange(null);
      return;
    }

    onSelectionChange(Array.from(current).join(','));
  }, [isAll, selected, connectedPlatforms, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange(null);
  }, [onSelectionChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={isAll ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={selectAll}
        className="gap-1.5"
      >
        <Globe className="h-3.5 w-3.5" />
        All Networks
      </Button>

      {connectedPlatforms.map((platform) => {
        const config = PLATFORM_CONFIG[platform];
        if (!config) return null;

        const isSelected = isAll || selected?.includes(platform);
        const Icon = config.icon;

        return (
          <Button
            key={platform}
            variant={isSelected && !isAll ? 'default' : 'outline'}
            size={compact ? 'sm' : 'default'}
            onClick={() => togglePlatform(platform)}
            className={`gap-1.5 ${isSelected && !isAll ? '' : 'opacity-70 hover:opacity-100'}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && config.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Platform icon component for use in lists/cards
 */
export function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return <Globe className={className} />;
  const Icon = config.icon;
  return <Icon className={className} />;
}

/**
 * Platform badge with colored background
 */
export function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return <Badge variant="secondary">{platform}</Badge>;
  
  return (
    <Badge className={`${config.color} border-none gap-1`}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

/**
 * Get platform display name
 */
export function getPlatformLabel(platform: string): string {
  return PLATFORM_CONFIG[platform]?.label || platform;
}
