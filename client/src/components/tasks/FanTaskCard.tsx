import { useState } from 'react';
import {
  CheckCircle2, Clock, Star, Trophy, Users, Target,
  Flame, Gift, ArrowRight, Lock, Shield, RefreshCw
} from 'lucide-react';
import type { Task, TaskCompletion } from '@shared/schema';
import {
  useStartTask,
  useCompleteTask,
  useCheckIn,
  isTaskCompleted,
  isTaskInProgress,
  getCurrentStreak,
  canCheckInToday,
  invalidateTaskCompletionQueries
} from '@/hooks/useTaskCompletion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import TaskCompletionModalRouter from '@/components/modals/TaskCompletionModalRouter';
import { cn } from '@/lib/utils';

interface FanTaskCardProps {
  task: Task;
  completion?: TaskCompletion;
  tenantId: string;
  themeColors?: {
    background?: string;
    text?: {
      primary?: string;
      secondary?: string;
      tertiary?: string;
    };
  };
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  pointsName?: string;
  isThemeDark?: boolean;
}

export function FanTaskCard({
  task,
  completion,
  tenantId,
  themeColors,
  brandColors,
  pointsName = 'points',
  isThemeDark = false
}: FanTaskCardProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const checkIn = useCheckIn();

  const completed = isTaskCompleted(completion);
  const inProgress = isTaskInProgress(completion);
  const canStartAgain = (completion as any)?.isAvailableAgain === true;
  const progress = completion?.progress || 0;
  const streak = getCurrentStreak(completion);
  const canCheckIn = canCheckInToday(completion);
  const isVerified = completion?.verifiedAt != null;

  const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok'].includes(task.platform || '');
  const needsVerification = isSocialTask && inProgress && !completed;

  // Task icon mapping
  const getTaskIcon = () => {
    switch (task.taskType) {
      case 'check_in': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'referral': return <Users className="w-5 h-5 text-blue-500" />;
      case 'follower_milestone': return <Target className="w-5 h-5 text-purple-500" />;
      case 'complete_profile': return <Star className="w-5 h-5 text-yellow-500" />;
      default: return <Trophy className="w-5 h-5 text-green-500" />;
    }
  };

  // Handle task start
  const handleStart = async () => {
    if (isSocialTask) {
      setIsModalOpen(true);
      return;
    }

    try {
      setIsProcessing(true);
      await startTask.mutateAsync({ taskId: task.id, tenantId });
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
      setIsProcessing(false);
    }
  };

  const handleModalSuccess = () => {
    // Invalidate all task completion related queries across the app
    invalidateTaskCompletionQueries(queryClient);
    setIsModalOpen(false);
  };

  const handleCheckIn = async () => {
    try {
      setIsProcessing(true);
      const result = await checkIn.mutateAsync({ taskId: task.id, tenantId });
      toast({
        title: 'Check-In Successful!',
        description: (
          <div>
            <p className="font-semibold">+{result.pointsAwarded} points</p>
            <p className="text-sm">Streak: {result.streak} days</p>
          </div>
        ),
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!completion) return;
    try {
      setIsProcessing(true);
      const result = await completeTask.mutateAsync({
        completionId: completion.id,
        verificationMethod: 'auto',
      });
      toast({
        title: 'Task Completed!',
        description: (
          <div>
            <p className="font-semibold">{task.name}</p>
            <p className="text-sm">+{result.pointsAwarded} points earned</p>
          </div>
        ),
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!completion) return;
    try {
      setIsVerifying(true);
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
          title: 'Task Verified!',
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
        description: error.message || 'Failed to verify task',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isAvailable = () => {
    if (task.startTime && new Date() < new Date(task.startTime)) return false;
    if (task.endTime && new Date() > new Date(task.endTime)) return false;
    return true;
  };

  const available = isAvailable();

  // Theme-aware styles
  const cardBg = isThemeDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder = isThemeDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const cardHoverBorder = isThemeDark ? 'rgba(255,255,255,0.15)' : '#d1d5db';
  const subtleBg = isThemeDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const subtleBorder = isThemeDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-lg",
        !themeColors && (
          canStartAgain ? 'border-blue-400 dark:border-blue-600' :
          completed ? 'border-green-500/20' :
          inProgress ? 'border-blue-500/20' :
          !available ? 'opacity-60' : ''
        )
      )}
      style={themeColors ? {
        backgroundColor: cardBg,
        borderColor: cardBorder,
      } : undefined}
      onMouseEnter={(e) => {
        if (themeColors) {
          (e.currentTarget as HTMLElement).style.borderColor = cardHoverBorder;
        }
      }}
      onMouseLeave={(e) => {
        if (themeColors) {
          (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
        }
      }}
    >
      {/* Top accent */}
      {completed && (
        <div className="h-px bg-green-500/40" />
      )}

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0">{getTaskIcon()}</div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-base leading-tight mb-1 truncate"
                style={brandColors ? { color: brandColors.primary } : undefined}
              >
                {task.name}
              </h3>
              <p
                className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
                style={themeColors ? { color: themeColors.text?.secondary } : undefined}
              >
                {task.description}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 ml-2">
            {completed && isVerified && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/25 text-[10px] px-1.5 h-5">
                <Shield className="w-2.5 h-2.5 mr-1" />
                Verified
              </Badge>
            )}
            {completed && !isVerified && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/25 text-[10px] px-1.5 h-5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                Done
              </Badge>
            )}
            {inProgress && !completed && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/25 text-[10px] px-1.5 h-5">
                <Clock className="w-2.5 h-2.5 mr-1" />
                Active
              </Badge>
            )}
            {!available && (
              <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 text-[10px] px-1.5 h-5">
                <Lock className="w-2.5 h-2.5 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        {inProgress && !completed && progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span style={themeColors ? { color: themeColors.text?.tertiary } : undefined} className="text-muted-foreground">Progress</span>
              <span className="font-medium" style={themeColors ? { color: themeColors.text?.primary } : undefined}>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Streak */}
        {task.taskType === 'check_in' && streak > 0 && (
          <div
            className="mb-3 p-2.5 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: isThemeDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)', border: `1px solid ${isThemeDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)'}` }}
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold" style={themeColors ? { color: themeColors.text?.primary } : undefined}>
              {streak} Day Streak
            </span>
          </div>
        )}

        {/* Reward */}
        <div
          className="flex items-center justify-between mb-3 p-2.5 rounded-lg"
          style={{ backgroundColor: subtleBg, border: `1px solid ${subtleBorder}` }}
        >
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" style={brandColors ? { color: brandColors.primary } : undefined} />
            <span
              className="text-sm font-semibold"
              style={themeColors ? { color: themeColors.text?.primary } : undefined}
            >
              {task.pointsToReward || 0} {pointsName}
            </span>
          </div>
          {task.rewardFrequency && task.rewardFrequency !== 'one_time' && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {task.rewardFrequency === 'daily' ? 'Daily' : task.rewardFrequency === 'weekly' ? 'Weekly' : 'Recurring'}
            </Badge>
          )}
          {task.rewardFrequency === 'one_time' && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">One-Time</Badge>
          )}
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          {!available && (
            <Button variant="outline" className="w-full" disabled size="sm">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Locked
            </Button>
          )}

          {completed && canStartAgain && (
            <Button
              onClick={handleStart}
              disabled={!available || isProcessing}
              className="w-full text-white"
              size="sm"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Complete Again
            </Button>
          )}

          {completed && !canStartAgain && (completion as any)?.nextAvailableAt && (
            <div className="space-y-1.5 w-full">
              <Button disabled className="w-full bg-green-500/10 text-green-400" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Completed
              </Button>
              {(completion as any).timeRemaining && (
                <p className="text-[10px] text-center" style={themeColors ? { color: themeColors.text?.tertiary } : undefined}>
                  Available in {(completion as any).timeRemaining.hours}h {(completion as any).timeRemaining.minutes}m
                </p>
              )}
            </div>
          )}

          {available && completed && !canStartAgain && !(completion as any)?.nextAvailableAt && (
            <Button variant="outline" className="w-full bg-green-500/10 text-green-400 border-green-500/20" disabled size="sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Completed
            </Button>
          )}

          {available && !inProgress && !completed && (
            <Button
              onClick={handleStart}
              disabled={isProcessing}
              className="w-full text-white"
              size="sm"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Starting...' : 'Start Task'}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}

          {available && task.taskType === 'check_in' && inProgress && (
            <Button
              onClick={handleCheckIn}
              disabled={isProcessing || !canCheckIn}
              className="w-full text-white"
              size="sm"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Checking in...' : !canCheckIn ? 'Already Checked In' : 'Check In'}
              <Flame className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}

          {available && task.taskType !== 'check_in' && inProgress && !completed && !needsVerification && (
            <Button
              onClick={handleComplete}
              disabled={isProcessing || progress < 100}
              className="w-full text-white"
              size="sm"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Completing...' : 'Complete Task'}
              <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}

          {available && needsVerification && !isVerified && (
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full text-white"
              size="sm"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isVerifying ? 'Verifying...' : 'Verify Task'}
              <Shield className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>

        {/* Time Constraints */}
        {(task.startTime || task.endTime) && (
          <div className="mt-3 pt-2.5 border-t text-[10px]" style={themeColors ? { borderColor: subtleBorder, color: themeColors.text?.tertiary } : undefined}>
            {task.startTime && new Date() < new Date(task.startTime) && (
              <p className="text-muted-foreground">Starts: {new Date(task.startTime).toLocaleDateString()}</p>
            )}
            {task.endTime && (
              <p className="text-muted-foreground">Ends: {new Date(task.endTime).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Task Completion Modal */}
      <TaskCompletionModalRouter
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        completionId={completion?.id}
      />
    </Card>
  );
}
