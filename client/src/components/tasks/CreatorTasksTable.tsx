import { useState } from 'react';
import { Link } from 'wouter';
import { ExternalLink, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { transformImageUrl } from '@/lib/image-utils';
import type { Task, TaskCompletion } from '@shared/schema';

interface EnrichedTask extends Task {
  creatorName?: string;
  creatorImage?: string;
  programName?: string;
  programSlug?: string;
  platform?: string;
}

interface CreatorTasksTableProps {
  tasks: EnrichedTask[];
  completionMap: Map<string, TaskCompletion>;
}

const getPlatformBadgeColor = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'twitter': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'instagram': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    case 'facebook': return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
    case 'youtube': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'tiktok': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'spotify': return 'bg-green-500/20 text-green-300 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

const getTaskTypeBadgeColor = (type: string) => {
  if (type?.includes('follow')) return 'bg-brand-primary/20 text-brand-primary border-brand-primary/30';
  if (type?.includes('like')) return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
  if (type?.includes('comment')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (type?.includes('share') || type?.includes('retweet')) return 'bg-green-500/20 text-green-300 border-green-500/30';
  return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

const formatTaskType = (type: string) => {
  return type
    ?.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Task';
};

export function CreatorTasksTable({ tasks, completionMap }: CreatorTasksTableProps) {
  const [sortBy, setSortBy] = useState<'creator' | 'platform' | 'points'>('creator');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (column: 'creator' | 'platform' | 'points') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'creator':
        compareValue = (a.creatorName || '').localeCompare(b.creatorName || '');
        break;
      case 'platform':
        compareValue = (a.platform || '').localeCompare(b.platform || '');
        break;
      case 'points':
        compareValue = (a.pointsToReward || 0) - (b.pointsToReward || 0);
        break;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const SortIcon = ({ column }: { column: 'creator' | 'platform' | 'points' }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="inline h-4 w-4 ml-1" /> : 
      <ChevronDown className="inline h-4 w-4 ml-1" />;
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-white/5">
            <TableHead 
              className="text-gray-300 cursor-pointer select-none hover:text-white transition-colors"
              onClick={() => toggleSort('creator')}
            >
              Creator <SortIcon column="creator" />
            </TableHead>
            <TableHead 
              className="text-gray-300 cursor-pointer select-none hover:text-white transition-colors"
              onClick={() => toggleSort('platform')}
            >
              Platform <SortIcon column="platform" />
            </TableHead>
            <TableHead className="text-gray-300">Task Type</TableHead>
            <TableHead className="text-gray-300">Task Name</TableHead>
            <TableHead 
              className="text-gray-300 text-right cursor-pointer select-none hover:text-white transition-colors"
              onClick={() => toggleSort('points')}
            >
              Points <SortIcon column="points" />
            </TableHead>
            <TableHead className="text-gray-300 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow className="border-white/10">
              <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                No tasks available. Join creators to see their tasks!
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => {
              const completion = completionMap.get(task.id);
              const isCompleted = completion?.status === 'completed';
              
              return (
                <TableRow 
                  key={task.id} 
                  className="border-white/10 hover:bg-white/5 transition-colors"
                >
                  {/* Creator */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-white/20">
                        {task.creatorImage && (
                          <AvatarImage 
                            src={transformImageUrl(task.creatorImage)} 
                            alt={task.creatorName}
                          />
                        )}
                        <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                          {task.creatorName?.charAt(0)?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium">
                          {task.creatorName}
                        </span>
                        {task.programName && (
                          <span className="text-xs text-gray-400">
                            {task.programName}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Platform */}
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs capitalize ${getPlatformBadgeColor(task.platform || '')}`}
                    >
                      {task.platform || 'Other'}
                    </Badge>
                  </TableCell>

                  {/* Task Type */}
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getTaskTypeBadgeColor(task.type || '')}`}
                    >
                      {formatTaskType(task.type || '')}
                    </Badge>
                  </TableCell>

                  {/* Task Name */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium">
                        {task.name}
                      </span>
                      {task.description && (
                        <span className="text-xs text-gray-400 line-clamp-1">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Points */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-white font-semibold">
                        {task.pointsToReward || 0}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    {isCompleted ? (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        Completed
                      </Badge>
                    ) : (
                      <Link href={`/tasks/${task.id}`}>
                        <Button 
                          size="sm" 
                          className="bg-brand-primary hover:bg-brand-primary/80 text-white"
                        >
                          Start
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

