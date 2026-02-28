/**
 * PageLayoutTemplates - Pre-built page structure templates for the program builder.
 *
 * These templates define the section ordering, visibility, header style,
 * and widget arrangement of a creator's public program page.
 * Creators pick one and get a fully configured page layout instantly.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  LayoutGrid,
  LayoutList,
  Trophy,
  Star,
  Megaphone,
  Users,
  Activity,
  Gift,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import type { CreatorType } from './creator-program-templates';

// ─── Types ────────────────────────────────────────────────────────

export interface PageLayoutConfig {
  /** Ordered list of visible sections */
  sections: SectionId[];
  /** Header style */
  headerStyle: 'hero' | 'compact' | 'centered';
  /** Content width */
  contentWidth: 'full' | 'contained' | 'narrow';
  /** Show sidebar (leaderboard, stats) on desktop */
  showSidebar: boolean;
  /** Sidebar position (only if showSidebar) */
  sidebarPosition: 'left' | 'right';
  /** Card layout for tasks/rewards grids */
  cardLayout: 'grid' | 'list' | 'compact';
}

export type SectionId =
  | 'campaigns'
  | 'tasks'
  | 'rewards'
  | 'leaderboard'
  | 'activityFeed'
  | 'fanWidget'
  | 'stats';

export interface PageLayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof LayoutGrid;
  config: PageLayoutConfig;
  recommendedFor: CreatorType[];
  /** Visual diagram showing the layout structure */
  diagram: LayoutDiagramBlock[];
}

interface LayoutDiagramBlock {
  label: string;
  width: 'full' | 'half' | 'third' | 'two-thirds';
  height: 'sm' | 'md' | 'lg';
  accent?: boolean;
}

// ─── Templates ────────────────────────────────────────────────────

export const PAGE_LAYOUT_TEMPLATES: PageLayoutTemplate[] = [
  {
    id: 'showcase',
    name: 'Showcase',
    description:
      'Big hero banner with campaigns front and center. Great for promoting active engagement.',
    icon: LayoutGrid,
    config: {
      sections: ['campaigns', 'tasks', 'leaderboard', 'rewards', 'activityFeed'],
      headerStyle: 'hero',
      contentWidth: 'full',
      showSidebar: true,
      sidebarPosition: 'right',
      cardLayout: 'grid',
    },
    recommendedFor: ['athlete', 'musician', 'content_creator'],
    diagram: [
      { label: 'Hero Banner', width: 'full', height: 'lg', accent: true },
      { label: 'Campaigns', width: 'two-thirds', height: 'md' },
      { label: 'Leaderboard', width: 'third', height: 'md' },
      { label: 'Tasks', width: 'full', height: 'sm' },
      { label: 'Rewards', width: 'half', height: 'sm' },
      { label: 'Activity', width: 'half', height: 'sm' },
    ],
  },
  {
    id: 'community',
    name: 'Community Hub',
    description:
      'Leaderboard and activity feed take priority. Perfect for highly engaged fanbases.',
    icon: Users,
    config: {
      sections: ['leaderboard', 'activityFeed', 'campaigns', 'tasks', 'rewards'],
      headerStyle: 'compact',
      contentWidth: 'contained',
      showSidebar: true,
      sidebarPosition: 'left',
      cardLayout: 'list',
    },
    recommendedFor: ['content_creator', 'athlete'],
    diagram: [
      { label: 'Profile', width: 'full', height: 'sm' },
      { label: 'Leaderboard', width: 'third', height: 'lg' },
      { label: 'Activity', width: 'two-thirds', height: 'lg' },
      { label: 'Campaigns', width: 'full', height: 'sm' },
      { label: 'Tasks', width: 'half', height: 'sm' },
      { label: 'Rewards', width: 'half', height: 'sm' },
    ],
  },
  {
    id: 'rewards-first',
    name: 'Rewards First',
    description:
      'Highlights rewards catalog and tasks. Best for loyalty programs with physical perks.',
    icon: Gift,
    config: {
      sections: ['rewards', 'tasks', 'campaigns', 'leaderboard', 'activityFeed'],
      headerStyle: 'centered',
      contentWidth: 'contained',
      showSidebar: false,
      sidebarPosition: 'right',
      cardLayout: 'grid',
    },
    recommendedFor: ['musician', 'content_creator'],
    diagram: [
      { label: 'Centered Profile', width: 'full', height: 'md', accent: true },
      { label: 'Rewards', width: 'full', height: 'md' },
      { label: 'Tasks', width: 'half', height: 'sm' },
      { label: 'Campaigns', width: 'half', height: 'sm' },
      { label: 'Leaderboard', width: 'full', height: 'sm' },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description:
      'Clean and focused with only essential sections. Lets your content speak for itself.',
    icon: LayoutList,
    config: {
      sections: ['tasks', 'campaigns', 'rewards'],
      headerStyle: 'compact',
      contentWidth: 'narrow',
      showSidebar: false,
      sidebarPosition: 'right',
      cardLayout: 'list',
    },
    recommendedFor: ['musician'],
    diagram: [
      { label: 'Profile', width: 'full', height: 'sm' },
      { label: 'Tasks', width: 'full', height: 'md' },
      { label: 'Campaigns', width: 'full', height: 'sm' },
      { label: 'Rewards', width: 'full', height: 'sm' },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Stats-heavy layout with all widgets visible. Best for creators who love data.',
    icon: BarChart3,
    config: {
      sections: [
        'stats',
        'campaigns',
        'tasks',
        'leaderboard',
        'rewards',
        'activityFeed',
        'fanWidget',
      ],
      headerStyle: 'hero',
      contentWidth: 'full',
      showSidebar: true,
      sidebarPosition: 'right',
      cardLayout: 'compact',
    },
    recommendedFor: ['athlete', 'content_creator'],
    diagram: [
      { label: 'Hero Banner', width: 'full', height: 'md', accent: true },
      { label: 'Stats', width: 'full', height: 'sm' },
      { label: 'Campaigns', width: 'two-thirds', height: 'md' },
      { label: 'Sidebar', width: 'third', height: 'md' },
      { label: 'Tasks', width: 'half', height: 'sm' },
      { label: 'Rewards', width: 'half', height: 'sm' },
    ],
  },
];

// ─── Section metadata ─────────────────────────────────────────────

const SECTION_META: Record<SectionId, { label: string; icon: typeof Star }> = {
  campaigns: { label: 'Campaigns', icon: Megaphone },
  tasks: { label: 'Tasks', icon: Star },
  rewards: { label: 'Rewards', icon: Gift },
  leaderboard: { label: 'Leaderboard', icon: Trophy },
  activityFeed: { label: 'Activity', icon: Activity },
  fanWidget: { label: 'Fan Widget', icon: Users },
  stats: { label: 'Stats', icon: BarChart3 },
};

// ─── Component ────────────────────────────────────────────────────

interface PageLayoutTemplatesProps {
  creatorType: CreatorType;
  currentLayoutId?: string;
  onSelect: (template: PageLayoutTemplate) => void;
}

export function PageLayoutTemplates({
  creatorType,
  currentLayoutId,
  onSelect,
}: PageLayoutTemplatesProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Sort: recommended first
  const sorted = [...PAGE_LAYOUT_TEMPLATES].sort((a, b) => {
    const aRec = a.recommendedFor.includes(creatorType) ? 0 : 1;
    const bRec = b.recommendedFor.includes(creatorType) ? 0 : 1;
    return aRec - bRec;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Page Layout</h3>
          <p className="text-sm text-gray-400">Choose how your program page is structured</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((template) => {
          const Icon = template.icon;
          const isSelected = currentLayoutId === template.id;
          const isHovered = hoveredId === template.id;
          const isRecommended = template.recommendedFor.includes(creatorType);

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/8 ring-1 ring-brand-primary/25'
                  : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2.5 right-3">
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-2 py-0">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    Recommended
                  </Badge>
                </div>
              )}

              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Layout diagram */}
              <LayoutDiagram blocks={template.diagram} active={isSelected || isHovered} />

              {/* Info */}
              <div className="mt-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-white">{template.name}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
              </div>

              {/* Section pills */}
              <div className="flex flex-wrap gap-1 mt-3">
                {template.config.sections.slice(0, 4).map((sectionId) => {
                  const meta = SECTION_META[sectionId];
                  if (!meta) return null;
                  const SIcon = meta.icon;
                  return (
                    <span
                      key={sectionId}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5"
                    >
                      <SIcon className="h-2.5 w-2.5" />
                      {meta.label}
                    </span>
                  );
                })}
                {template.config.sections.length > 4 && (
                  <span className="text-[10px] text-gray-500 px-1">
                    +{template.config.sections.length - 4} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Layout Diagram ───────────────────────────────────────────────

function LayoutDiagram({ blocks, active }: { blocks: LayoutDiagramBlock[]; active: boolean }) {
  const heightMap = { sm: 'h-4', md: 'h-6', lg: 'h-8' };
  const widthMap = {
    full: 'col-span-6',
    half: 'col-span-3',
    third: 'col-span-2',
    'two-thirds': 'col-span-4',
  };

  return (
    <div className="grid grid-cols-6 gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/5">
      {blocks.map((block, i) => (
        <div
          key={i}
          className={`${widthMap[block.width]} ${heightMap[block.height]} rounded transition-colors duration-200 ${
            block.accent
              ? active
                ? 'bg-brand-primary/25'
                : 'bg-brand-primary/12'
              : active
                ? 'bg-white/12'
                : 'bg-white/6'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Convert a layout template config to the pageConfig visibility format
 * used by the program builder's save mutation.
 */
export function layoutConfigToVisibility(config: PageLayoutConfig) {
  const allSections: SectionId[] = [
    'campaigns',
    'tasks',
    'rewards',
    'leaderboard',
    'activityFeed',
    'fanWidget',
    'stats',
  ];

  const visibility: Record<string, boolean> = {
    showProfile: true, // Always show profile
  };

  for (const section of allSections) {
    const key =
      section === 'campaigns'
        ? 'showCampaigns'
        : section === 'tasks'
          ? 'showTasks'
          : section === 'rewards'
            ? 'showRewards'
            : section === 'leaderboard'
              ? 'showLeaderboard'
              : section === 'activityFeed'
                ? 'showActivityFeed'
                : section === 'fanWidget'
                  ? 'showFanWidget'
                  : null;

    if (key) {
      visibility[key] = config.sections.includes(section);
    }
  }

  return visibility;
}

/**
 * Get the layout template by ID.
 */
export function getPageLayoutTemplate(id: string): PageLayoutTemplate | null {
  return PAGE_LAYOUT_TEMPLATES.find((t) => t.id === id) || null;
}

export default PageLayoutTemplates;
