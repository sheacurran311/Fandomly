import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  Code,
  Eye,
  Filter,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationInfoButton } from "./VerificationBadge";

/**
 * Filter state type
 */
export interface TaskFilterState {
  verificationStatus: ('automatic' | 'code_required' | 'manual')[];
  platforms: string[];
  categories: string[];
  searchQuery: string;
}

/**
 * Props for TaskFilters component
 */
interface TaskFiltersProps {
  filters: TaskFilterState;
  onFiltersChange: (filters: TaskFilterState) => void;
  /** Counts for verification status badges */
  counts?: {
    automatic: number;
    code_required: number;
    manual: number;
  };
  /** Available platforms to filter by */
  availablePlatforms?: string[];
  /** Available categories */
  availableCategories?: string[];
  /** Optional class name */
  className?: string;
}

/**
 * Verification status filter buttons configuration
 */
const VERIFICATION_STATUS_OPTIONS = [
  {
    value: 'automatic' as const,
    label: 'Automatic',
    icon: CheckCircle,
    color: 'green',
  },
  {
    value: 'code_required' as const,
    label: 'Code Required',
    icon: Code,
    color: 'blue',
  },
  {
    value: 'manual' as const,
    label: 'Manual',
    icon: Eye,
    color: 'amber',
  },
];

/**
 * Platform display info
 */
const PLATFORM_DISPLAY: Record<string, { name: string; emoji: string }> = {
  twitter: { name: 'X (Twitter)', emoji: '𝕏' },
  instagram: { name: 'Instagram', emoji: '📷' },
  facebook: { name: 'Facebook', emoji: '📘' },
  tiktok: { name: 'TikTok', emoji: '🎵' },
  youtube: { name: 'YouTube', emoji: '▶️' },
  spotify: { name: 'Spotify', emoji: '🎧' },
  discord: { name: 'Discord', emoji: '💬' },
  twitch: { name: 'Twitch', emoji: '🎮' },
  kick: { name: 'Kick', emoji: '🟢' },
  patreon: { name: 'Patreon', emoji: '❤️' },
  telegram: { name: 'Telegram', emoji: '✈️' },
};

/**
 * TaskFilters Component
 * 
 * Provides filtering controls for task lists including:
 * - Verification status toggle buttons
 * - Platform filter dropdown
 * - Category filter dropdown
 * - Search input
 */
export function TaskFilters({
  filters,
  onFiltersChange,
  counts,
  availablePlatforms = [],
  availableCategories = [],
  className,
}: TaskFiltersProps) {
  const hasActiveFilters =
    filters.verificationStatus.length > 0 ||
    filters.platforms.length > 0 ||
    filters.categories.length > 0 ||
    filters.searchQuery.length > 0;

  const toggleVerificationStatus = (status: 'automatic' | 'code_required' | 'manual') => {
    const newStatuses = filters.verificationStatus.includes(status)
      ? filters.verificationStatus.filter((s) => s !== status)
      : [...filters.verificationStatus, status];
    onFiltersChange({ ...filters, verificationStatus: newStatuses });
  };

  const togglePlatform = (platform: string) => {
    const newPlatforms = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    onFiltersChange({ ...filters, platforms: newPlatforms });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const clearFilters = () => {
    onFiltersChange({
      verificationStatus: [],
      platforms: [],
      categories: [],
      searchQuery: '',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and verification status row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Verification status toggle buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">Verification:</span>
          {VERIFICATION_STATUS_OPTIONS.map((option) => {
            const isActive = filters.verificationStatus.includes(option.value);
            const Icon = option.icon;
            const count = counts?.[option.value];
            
            return (
              <Button
                key={option.value}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleVerificationStatus(option.value)}
                className={cn(
                  'gap-1.5 transition-colors',
                  isActive && option.color === 'green' && 'bg-green-600 hover:bg-green-700',
                  isActive && option.color === 'blue' && 'bg-blue-600 hover:bg-blue-700',
                  isActive && option.color === 'amber' && 'bg-amber-600 hover:bg-amber-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
                {count !== undefined && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
          <VerificationInfoButton className="ml-1" />
        </div>
      </div>

      {/* Platform and category filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Platform filter dropdown */}
        {availablePlatforms.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Platforms
                {filters.platforms.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {filters.platforms.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availablePlatforms.map((platform) => {
                const display = PLATFORM_DISPLAY[platform] || { name: platform, emoji: '🌐' };
                return (
                  <DropdownMenuCheckboxItem
                    key={platform}
                    checked={filters.platforms.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                  >
                    <span className="mr-2">{display.emoji}</span>
                    {display.name}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category filter dropdown */}
        {availableCategories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Category
                {filters.categories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {filters.categories.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                >
                  {formatCategoryName(category)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Active filter pills */}
        {filters.platforms.map((platform) => {
          const display = PLATFORM_DISPLAY[platform] || { name: platform, emoji: '🌐' };
          return (
            <Badge
              key={platform}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => togglePlatform(platform)}
            >
              <span>{display.emoji}</span>
              {display.name}
              <X className="h-3 w-3 ml-0.5" />
            </Badge>
          );
        })}

        {filters.categories.map((category) => (
          <Badge
            key={category}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80"
            onClick={() => toggleCategory(category)}
          >
            {formatCategoryName(category)}
            <X className="h-3 w-3 ml-0.5" />
          </Badge>
        ))}

        {/* Clear all button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    social: 'Social',
    trust_anchor: 'Trust Anchor',
    code_verification: 'Code Verification',
    starter_pack: 'Starter Pack',
    group_goal: 'Group Goal',
  };
  return names[category] || category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE: TaskFilterState = {
  verificationStatus: [],
  platforms: [],
  categories: [],
  searchQuery: '',
};

export default TaskFilters;
