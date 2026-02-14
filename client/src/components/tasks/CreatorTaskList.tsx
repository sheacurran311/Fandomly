import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  List,
  Layers,
  CheckCircle,
  Code,
  Eye,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskFilters, TaskFilterState, DEFAULT_FILTER_STATE } from "./TaskFilters";
import { VerificationBadge, getVerificationStatus, VerificationTierBadge } from "./VerificationBadge";

/**
 * View modes for the task list
 */
export type ViewMode = 'grid' | 'by-verification' | 'by-platform';

/**
 * Task type for the list
 */
interface TaskItem {
  id: string;
  name: string;
  description: string;
  platform: string;
  taskType: string;
  category?: string;
  verificationTier?: string | null;
  verificationMethod?: string | null;
  isStarterPack?: boolean;
  isGroupGoal?: boolean;
  pointsToReward?: number | null;
  isActive?: boolean;
}

/**
 * Props for CreatorTaskList component
 */
interface CreatorTaskListProps {
  tasks: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
  onTaskEdit?: (task: TaskItem) => void;
  onTaskDelete?: (task: TaskItem) => void;
  className?: string;
}

/**
 * Section configuration for grouped views
 */
const VERIFICATION_SECTIONS = [
  {
    key: 'automatic' as const,
    title: 'Automatic Verification',
    subtitle: 'Verified via API - highest trust',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    key: 'code_required' as const,
    title: 'Code Verification',
    subtitle: 'Fan includes unique code in comment/post',
    icon: Code,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    key: 'manual' as const,
    title: 'Manual Review',
    subtitle: 'You verify by checking fan profile',
    icon: Eye,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
];

/**
 * Platform display info
 */
const PLATFORM_DISPLAY: Record<string, { name: string; emoji: string; color: string }> = {
  twitter: { name: 'X (Twitter)', emoji: '𝕏', color: 'text-sky-400' },
  instagram: { name: 'Instagram', emoji: '📷', color: 'text-pink-400' },
  facebook: { name: 'Facebook', emoji: '📘', color: 'text-blue-400' },
  tiktok: { name: 'TikTok', emoji: '🎵', color: 'text-white' },
  youtube: { name: 'YouTube', emoji: '▶️', color: 'text-red-400' },
  spotify: { name: 'Spotify', emoji: '🎧', color: 'text-green-400' },
  discord: { name: 'Discord', emoji: '💬', color: 'text-indigo-400' },
  twitch: { name: 'Twitch', emoji: '🎮', color: 'text-purple-400' },
  kick: { name: 'Kick', emoji: '🟢', color: 'text-green-400' },
  patreon: { name: 'Patreon', emoji: '❤️', color: 'text-orange-400' },
  telegram: { name: 'Telegram', emoji: '✈️', color: 'text-sky-400' },
};

/**
 * CreatorTaskList Component
 * 
 * Displays a list of tasks with filtering and grouping options.
 * Supports three view modes:
 * - Grid: All tasks in a grid layout with filters
 * - By Verification: Grouped by verification status
 * - By Platform: Grouped by platform
 */
export function CreatorTaskList({
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  className,
}: CreatorTaskListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTER_STATE);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Calculate available platforms and categories from tasks
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(tasks.map((t) => t.platform));
    return Array.from(platforms).sort();
  }, [tasks]);

  const availableCategories = useMemo(() => {
    const categories = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(categories).sort() as string[];
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !task.name.toLowerCase().includes(query) &&
          !task.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Verification status
      if (filters.verificationStatus.length > 0) {
        const status = getVerificationStatus(task.verificationMethod, task.verificationTier);
        if (!filters.verificationStatus.includes(status)) {
          return false;
        }
      }

      // Platform
      if (filters.platforms.length > 0) {
        if (!filters.platforms.includes(task.platform)) {
          return false;
        }
      }

      // Category
      if (filters.categories.length > 0 && task.category) {
        if (!filters.categories.includes(task.category)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  // Calculate counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = { automatic: 0, code_required: 0, manual: 0 };
    tasks.forEach((task) => {
      const status = getVerificationStatus(task.verificationMethod, task.verificationTier);
      counts[status]++;
    });
    return counts;
  }, [tasks]);

  // Group tasks by verification status
  const tasksByVerification = useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {
      automatic: [],
      code_required: [],
      manual: [],
    };
    filteredTasks.forEach((task) => {
      const status = getVerificationStatus(task.verificationMethod, task.verificationTier);
      grouped[status].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  // Group tasks by platform
  const tasksByPlatform = useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {};
    filteredTasks.forEach((task) => {
      if (!grouped[task.platform]) {
        grouped[task.platform] = [];
      }
      grouped[task.platform].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const toggleSection = (sectionKey: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionKey)) {
      newCollapsed.delete(sectionKey);
    } else {
      newCollapsed.add(sectionKey);
    }
    setCollapsedSections(newCollapsed);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* View mode toggle and filters */}
      <div className="space-y-4">
        {/* View mode buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'by-verification' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('by-verification')}
                className="rounded-none border-x"
              >
                <Layers className="h-4 w-4 mr-1" />
                By Verification
              </Button>
              <Button
                variant={viewMode === 'by-platform' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('by-platform')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4 mr-1" />
                By Platform
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          counts={statusCounts}
          availablePlatforms={availablePlatforms}
          availableCategories={availableCategories}
        />
      </div>

      {/* Task list based on view mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
          {filteredTasks.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No tasks match your filters
            </div>
          )}
        </div>
      )}

      {viewMode === 'by-verification' && (
        <div className="space-y-6">
          {VERIFICATION_SECTIONS.map((section) => {
            const sectionTasks = tasksByVerification[section.key];
            const isCollapsed = collapsedSections.has(section.key);
            const Icon = section.icon;

            return (
              <div key={section.key} className="space-y-3">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border',
                    section.bgColor,
                    section.borderColor,
                    'hover:opacity-90 transition-opacity'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-5 w-5', section.color)} />
                    <div className="text-left">
                      <h3 className={cn('font-semibold', section.color)}>{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{sectionTasks.length} tasks</Badge>
                    {isCollapsed ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Section tasks */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                    {sectionTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                      />
                    ))}
                    {sectionTasks.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No tasks in this category
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'by-platform' && (
        <div className="space-y-6">
          {Object.entries(tasksByPlatform)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([platform, platformTasks]) => {
              const display = PLATFORM_DISPLAY[platform] || {
                name: platform,
                emoji: '🌐',
                color: 'text-gray-400',
              };
              const isCollapsed = collapsedSections.has(platform);

              return (
                <div key={platform} className="space-y-3">
                  {/* Platform header */}
                  <button
                    onClick={() => toggleSection(platform)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{display.emoji}</span>
                      <h3 className={cn('font-semibold', display.color)}>{display.name}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{platformTasks.length} tasks</Badge>
                      {isCollapsed ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Platform tasks */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                      {platformTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick?.(task)}
                          showPlatform={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          {Object.keys(tasksByPlatform).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tasks match your filters
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual task card component
 */
interface TaskCardProps {
  task: TaskItem;
  onClick?: () => void;
  showPlatform?: boolean;
}

function TaskCard({ task, onClick, showPlatform = true }: TaskCardProps) {
  const display = PLATFORM_DISPLAY[task.platform] || {
    name: task.platform,
    emoji: '🌐',
    color: 'text-gray-400',
  };
  const verificationStatus = getVerificationStatus(task.verificationMethod, task.verificationTier);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-primary/50 transition-colors',
        !task.isActive && 'opacity-60'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {showPlatform && <span className="text-xl">{display.emoji}</span>}
            <CardTitle className="text-base line-clamp-1">{task.name}</CardTitle>
          </div>
          <VerificationBadge status={verificationStatus} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showPlatform && (
              <Badge variant="outline" className="text-xs">
                {display.name}
              </Badge>
            )}
            {task.verificationTier && (
              <VerificationTierBadge tier={task.verificationTier as 'T1' | 'T2' | 'T3'} />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">{task.pointsToReward || 50} pts</span>
          </div>
        </div>

        {/* Task type badges */}
        <div className="flex flex-wrap gap-1">
          {task.isStarterPack && (
            <Badge variant="secondary" className="text-xs">Starter Pack</Badge>
          )}
          {task.isGroupGoal && (
            <Badge variant="secondary" className="text-xs">Group Goal</Badge>
          )}
          {task.category && (
            <Badge variant="outline" className="text-xs capitalize">
              {task.category.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatorTaskList;
