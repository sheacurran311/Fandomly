import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Flame,
  TrendingUp,
  CheckCircle,
  Clock,
  Coins,
  Target,
  Trophy,
  Award,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { type Task } from "@shared/schema";
import TaskCompletionModalRouter from "@/components/modals/TaskCompletionModalRouter";

interface FanTaskCardProps {
  task: Task;
  progress?: {
    completed: boolean;
    progress: number;
    currentStreak?: number;
  };
  onStart?: () => void;
  onContinue?: () => void;
  onClaim?: () => void;
}

export default function FanTaskCard({
  task,
  progress,
  onStart,
  onContinue,
  onClaim,
}: FanTaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isCompleted = progress?.completed || false;
  const progressPercent = progress?.progress || 0;
  const hasProgress = progressPercent > 0 && progressPercent < 100;

  // Check if task is a social media task
  const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(
    task.platform?.toLowerCase() || ''
  );

  // Handle start button click
  const handleStartClick = () => {
    if (isSocialTask) {
      setIsModalOpen(true);
    } else if (onStart) {
      onStart();
    }
  };

  // Handle modal success
  const handleModalSuccess = () => {
    setIsModalOpen(false);
    if (onStart) {
      onStart();
    }
  };

  // Get icon based on task type
  const getTaskIcon = () => {
    switch (task.taskType) {
      case 'referral':
        return Users;
      case 'checkin':
        return Flame;
      case 'follower_milestone':
        return TrendingUp;
      case 'complete_profile':
        return CheckCircle;
      default:
        return Target;
    }
  };

  // Get color based on task type
  const getTaskColor = () => {
    switch (task.taskType) {
      case 'referral':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'checkin':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'follower_milestone':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'complete_profile':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  // Get points to display
  const getPoints = () => {
    if (task.taskType === 'checkin' && task.customSettings) {
      const settings = task.customSettings as any;
      return settings.pointsPerCheckIn || task.pointsToReward;
    }
    return task.pointsToReward;
  };

  // Get task type label
  const getTaskTypeLabel = () => {
    switch (task.taskType) {
      case 'referral':
        return 'Referral';
      case 'checkin':
        return 'Check-In';
      case 'follower_milestone':
        return 'Milestone';
      case 'complete_profile':
        return 'Profile';
      default:
        return 'Task';
    }
  };

  const TaskIcon = getTaskIcon();
  const colorClass = getTaskColor();
  const points = getPoints();

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02] group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              <TaskIcon className="h-6 w-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-semibold text-lg truncate">
                  {task.name}
                </h3>
                {isCompleted && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-400 shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
              
              {task.description && (
                <p className="text-gray-400 text-sm line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <Badge variant="outline" className={`${colorClass} shrink-0 ml-2`}>
            {getTaskTypeLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reward Display */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-semibold">
              {points} points
            </span>
          </div>
          
          {task.rewardFrequency !== 'one_time' && (
            <Badge variant="outline" className="text-xs text-brand-secondary border-brand-secondary">
              {task.rewardFrequency}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {hasProgress && !isCompleted && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Streak Display (for check-in tasks) */}
        {task.taskType === 'checkin' && progress?.currentStreak && (
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Flame className="h-5 w-5 text-orange-400" />
            <div className="flex-1">
              <div className="text-white font-semibold">{progress.currentStreak} Day Streak</div>
              <div className="text-xs text-gray-400">Keep it going!</div>
            </div>
          </div>
        )}

        {/* Task-Specific Info */}
        {task.taskType === 'referral' && task.customSettings && (
          <div className="text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand-secondary" />
              <span>
                {(task.customSettings as any).rewardStructure === 'percentage'
                  ? `Earn ${(task.customSettings as any).percentageOfReferred}% of friend's points`
                  : `You: ${(task.customSettings as any).referrerPoints} pts, Friend: ${(task.customSettings as any).referredPoints} pts`}
              </span>
            </div>
          </div>
        )}

        {task.taskType === 'follower_milestone' && task.customSettings && (
          <div className="text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-400" />
              <span>
                {(task.customSettings as any).milestoneType === 'single'
                  ? `Reach ${(task.customSettings as any).singleFollowerCount?.toLocaleString()} followers`
                  : `${(task.customSettings as any).tiers?.length || 0} milestone tiers`}
              </span>
            </div>
          </div>
        )}

        {/* Time Limit Display */}
        {task.endTime && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>
              Ends {new Date(task.endTime).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <Button 
              className="w-full bg-green-500/20 text-green-400 border border-green-400 hover:bg-green-500/30"
              disabled
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </Button>
          ) : hasProgress ? (
            <Button 
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
              onClick={onContinue}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
              onClick={handleStartClick}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Task
            </Button>
          )}
        </div>
      </CardContent>

      {/* Task Completion Modal */}
      {isSocialTask && (
        <TaskCompletionModalRouter
          task={task}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </Card>
  );
}

