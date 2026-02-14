import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, CheckCircle2, Clock, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { transformImageUrl } from '@/lib/image-utils';
import { useStartTask, invalidateTaskCompletionQueries } from '@/hooks/useTaskCompletion';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Task, TaskCompletion } from '@shared/schema';
import TaskCompletionModalRouter from '@/components/modals/TaskCompletionModalRouter';
import { useSocialConnectionStatus } from '@/hooks/useSocialConnectionStatus';

type EnrichedTask = Omit<Task, 'platform'> & {
  creatorName?: string;
  creatorImage?: string;
  programName?: string;
  programSlug?: string;
  programImage?: string;
  platform?: Task['platform'];
};

interface FanTasksTableProps {
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

export function FanTasksTable({ tasks, completionMap }: FanTasksTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'creator' | 'platform' | 'points'>('creator');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());
  const [verifyingTasks, setVerifyingTasks] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);

  const startTask = useStartTask();

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
        // Sort by program name first, fall back to creator name
        const aName = a.programName || a.creatorName || '';
        const bName = b.programName || b.creatorName || '';
        compareValue = aName.localeCompare(bName);
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

  const handleStartTask = async (task: EnrichedTask) => {
    // Check if this is a social media task that requires a modal
    const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(
      task.platform?.toLowerCase() || ''
    );

    if (isSocialTask) {
      // Open modal for social tasks
      setSelectedTask(task);
      setIsModalOpen(true);
      return;
    }

    // For non-social tasks, start directly
    setProcessingTasks(prev => new Set(prev).add(task.id));
    try {
      await startTask.mutateAsync({ taskId: task.id, tenantId: task.tenantId ?? '' });
      toast({
        title: 'Task Started!',
        description: `You've started "${task.name}"`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

  // Handle modal success
  const handleModalSuccess = () => {
    // Invalidate all task completion related queries across the app
    invalidateTaskCompletionQueries(queryClient);
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleVerify = async (task: EnrichedTask, completion: TaskCompletion) => {
    setVerifyingTasks(prev => new Set(prev).add(task.id));
    try {
      const response = await apiRequest('POST', `/api/task-completions/${completion.id}/verify`, {
        platform: task.platform,
        taskType: task.taskType,
        targetData: (task.customSettings as Record<string, unknown>) || {},
      });

      const result = await response.json();

      if (result.verified) {
        // Invalidate all task completion related queries across the app
        invalidateTaskCompletionQueries(queryClient);

        toast({
          title: '✅ Task Verified!',
          description: result.message || 'Your task has been successfully verified',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: result.message || result.error || 'Could not verify task completion',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Error',
        description: error.message || 'An error occurred during verification',
        variant: 'destructive',
      });
    } finally {
      setVerifyingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

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
              Program <SortIcon column="creator" />
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
            <TableHead className="text-gray-300 text-center">Connection</TableHead>
            <TableHead className="text-gray-300 text-center">Status</TableHead>
            <TableHead className="text-gray-300 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow className="border-white/10">
              <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                No tasks available. Join creators to see their tasks!
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => {
              const completion = completionMap.get(task.id);
              const isCompleted = completion?.status === 'completed';
              const isInProgress = completion?.status === 'in_progress';
              const progress = completion?.progress || 0;
              const isProcessing = processingTasks.has(task.id);

              // Connection status component
              const ConnectionStatusCell = () => {
                const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok'].includes(task.platform?.toLowerCase() || '');
                const { connected, isLoading } = useSocialConnectionStatus(isSocialTask ? task.platform : undefined);

                if (!isSocialTask) {
                  return <span className="text-xs text-gray-500">N/A</span>;
                }

                if (isLoading) {
                  return <AlertCircle className="h-4 w-4 text-gray-400 animate-pulse" />;
                }

                return connected ? (
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-red-400">Disconnected</span>
                  </div>
                );
              };

              return (
                <TableRow
                  key={task.id}
                  className="border-white/10 hover:bg-white/5 transition-colors"
                >
                  {/* Program */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-white/20">
                        {task.programImage && (
                          <AvatarImage
                            src={transformImageUrl(task.programImage) ?? undefined}
                            alt={task.programName ?? ''}
                          />
                        )}
                        <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                          {task.programName?.charAt(0)?.toUpperCase() || task.creatorName?.charAt(0)?.toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium">
                          {task.programName || task.creatorName}
                        </span>
                        {task.programName && task.creatorName && (
                          <span className="text-xs text-gray-400">
                            by {task.creatorName}
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
                      className={`text-xs ${getTaskTypeBadgeColor(task.taskType || '')}`}
                    >
                      {formatTaskType(task.taskType || '')}
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

                  {/* Connection Status */}
                  <TableCell className="text-center">
                    <ConnectionStatusCell />
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {isCompleted ? (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : isInProgress ? (
                      <div className="flex flex-col items-center gap-1">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                        <Progress value={progress} className="h-1 w-16" />
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Started
                      </Badge>
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    {isCompleted ? (
                      <span className="text-xs text-green-400">
                        +{completion?.pointsEarned || 0} pts
                      </span>
                    ) : isInProgress ? (
                      // Show Verify button for social tasks in progress
                      (() => {
                        const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok'].includes(task.platform || '');
                        const isVerifying = verifyingTasks.has(task.id);

                        if (isSocialTask && completion) {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20"
                              onClick={() => handleVerify(task, completion)}
                              disabled={isVerifying}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {isVerifying ? 'Verifying...' : 'Verify'}
                            </Button>
                          );
                        }

                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                            disabled
                          >
                            In Progress
                          </Button>
                        );
                      })()
                    ) : (
                      <Button
                        size="sm"
                        className="bg-brand-primary hover:bg-brand-primary/80 text-white"
                        onClick={() => handleStartTask(task)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Starting...' : 'Start'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Task Completion Modal */}
      {selectedTask && (
        <TaskCompletionModalRouter
          task={{ ...selectedTask, platform: selectedTask.platform ?? 'system' }}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
          }}
          onSuccess={handleModalSuccess}
          completionId={completionMap.get(selectedTask.id)?.id}
        />
      )}
    </div>
  );
}
