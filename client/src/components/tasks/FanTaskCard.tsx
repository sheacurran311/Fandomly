import { useState } from 'react';
import {
  CheckCircle2, Clock, Star, Trophy, Users, Target,
  Flame, Gift, ArrowRight, Lock, Shield
} from 'lucide-react';
import type { Task, TaskCompletion } from '@shared/schema';
import {
  useStartTask,
  useCompleteTask,
  useCheckIn,
  isTaskCompleted,
  isTaskInProgress,
  getCurrentStreak,
  canCheckInToday
} from '@/hooks/useTaskCompletion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import TaskCompletionModalRouter from '@/components/modals/TaskCompletionModalRouter';

interface FanTaskCardProps {
  task: Task;
  completion?: TaskCompletion;
  tenantId: string;
  // Optional theme customization for public pages
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

  // Calculate completion state first (before using these values)
  const completed = isTaskCompleted(completion);
  const inProgress = isTaskInProgress(completion);
  const progress = completion?.progress || 0;
  const streak = getCurrentStreak(completion);
  const canCheckIn = canCheckInToday(completion);
  const isVerified = completion?.verifiedAt != null;

  // Check if task is a social media task that can be verified
  const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok'].includes(task.platform || '');
  const needsVerification = isSocialTask && inProgress && !completed;

  // Task icon mapping
  const getTaskIcon = () => {
    switch (task.taskType) {
      case 'check_in':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'referral':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'follower_milestone':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'complete_profile':
        return <Star className="w-5 h-5 text-yellow-500" />;
      default:
        return <Trophy className="w-5 h-5 text-green-500" />;
    }
  };

  // Handle task start
  const handleStart = async () => {
    // For social media tasks, show completion modal directly
    const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok'].includes(task.platform || '');

    if (isSocialTask) {
      // Open modal for social tasks
      setIsModalOpen(true);
      return;
    }

    // For non-social tasks (check-in, referral, etc.), create task completion
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

  // Handle modal success (task completion submitted)
  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });
    setIsModalOpen(false);
  };

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      setIsProcessing(true);
      const result = await checkIn.mutateAsync({ 
        taskId: task.id, 
        tenantId 
      });
      
      toast({
        title: '🔥 Check-In Successful!',
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

  // Handle task completion
  const handleComplete = async () => {
    if (!completion) return;
    
    try {
      setIsProcessing(true);
      const result = await completeTask.mutateAsync({
        completionId: completion.id,
        verificationMethod: 'auto',
      });
      
      toast({
        title: '✅ Task Completed!',
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

  // Handle social task verification
  const handleVerify = async () => {
    if (!completion) return;
    
    try {
      setIsVerifying(true);
      
      // Call verification endpoint
      const response = await apiRequest('POST', `/api/task-completions/${completion.id}/verify`, {
        platform: task.platform,
        taskType: task.taskType,
        targetData: task.targetData || {}, // Task metadata with IDs to verify
      });
      
      const result = await response.json();
      
      if (result.verified) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
        
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
        description: error.message || 'Failed to verify task',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Check if task is available
  const isAvailable = () => {
    if (task.startTime && new Date() < new Date(task.startTime)) {
      return false;
    }
    if (task.endTime && new Date() > new Date(task.endTime)) {
      return false;
    }
    return true;
  };

  const available = isAvailable();

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg ${
        completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
        inProgress ? 'border-blue-200 dark:border-blue-800' :
        !available ? 'opacity-60' : ''
      }`}
      style={themeColors ? {
        backgroundColor: isThemeDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        borderColor: isThemeDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
      } : undefined}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getTaskIcon()}
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold text-lg leading-tight mb-1"
                style={brandColors ? { color: brandColors.primary } : undefined}
              >
                {task.name}
              </h3>
              <p
                className="text-sm text-muted-foreground line-clamp-2"
                style={themeColors ? { color: themeColors.text?.secondary } : undefined}
              >
                {task.description}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {completed && isVerified && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
          {completed && !isVerified && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
          {inProgress && !completed && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
              <Clock className="w-3 h-3 mr-1" />
              In Progress
            </Badge>
          )}
          {!available && (
            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>

        {/* Progress Bar (for in-progress tasks) */}
        {inProgress && !completed && progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Check-in Streak Display */}
        {task.taskType === 'check_in' && streak > 0 && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                  {streak} Day Streak! 🔥
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Keep it going!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reward Display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span
              className="text-sm font-medium"
              style={themeColors ? { color: themeColors.text?.primary } : undefined}
            >
              {task.pointsToReward || 0} {pointsName}
            </span>
          </div>

          {task.rewardFrequency === 'daily' && (
            <Badge variant="secondary" className="text-xs">
              Daily
            </Badge>
          )}
          {task.rewardFrequency === 'recurring' && (
            <Badge variant="secondary" className="text-xs">
              Recurring
            </Badge>
          )}
          {task.rewardFrequency === 'one_time' && (
            <Badge variant="secondary" className="text-xs">
              One-Time
            </Badge>
          )}
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          {!available && (
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </Button>
          )}

          {available && completed && task.rewardFrequency === 'one_time' && (
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed
            </Button>
          )}

          {available && !inProgress && !completed && (
            <Button
              onClick={handleStart}
              disabled={isProcessing}
              className="w-full text-white hover:opacity-90"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Starting...' : 'Start Task'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {available && task.taskType === 'check_in' && inProgress && (
            <Button
              onClick={handleCheckIn}
              disabled={isProcessing || !canCheckIn}
              className="w-full text-white hover:opacity-90"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Checking in...' :
               !canCheckIn ? 'Already Checked In Today' :
               'Check In'}
              <Flame className="w-4 h-4 ml-2" />
            </Button>
          )}

          {available && task.taskType !== 'check_in' && inProgress && !completed && !needsVerification && (
            <Button
              onClick={handleComplete}
              disabled={isProcessing || progress < 100}
              className="w-full text-white hover:opacity-90"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isProcessing ? 'Completing...' : 'Complete Task'}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          )}

          {available && needsVerification && !isVerified && (
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              variant="default"
              className="w-full text-white hover:opacity-90"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {isVerifying ? 'Verifying...' : 'Verify Task'}
              <Shield className="w-4 h-4 ml-2" />
            </Button>
          )}

          {available && completed && task.rewardFrequency !== 'one_time' && (
            <Button
              onClick={task.taskType === 'check_in' ? handleCheckIn : handleComplete}
              disabled={isProcessing || (task.taskType === 'check_in' && !canCheckIn)}
              className="w-full text-white hover:opacity-90"
              style={brandColors ? { backgroundColor: brandColors.primary } : undefined}
            >
              {task.taskType === 'check_in' && !canCheckIn ? 'Already Checked In' : 'Do Again'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Time Constraints Info */}
        {(task.startTime || task.endTime) && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {task.startTime && new Date() < new Date(task.startTime) && (
              <p>Starts: {new Date(task.startTime).toLocaleDateString()}</p>
            )}
            {task.endTime && (
              <p>Ends: {new Date(task.endTime).toLocaleDateString()}</p>
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

