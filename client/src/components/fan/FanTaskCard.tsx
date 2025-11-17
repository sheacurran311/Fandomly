import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Music,
  Video,
} from "lucide-react";
import { type Task } from "@shared/schema";
import TaskCompletionModalRouter from "@/components/modals/TaskCompletionModalRouter";
import { transformImageUrl } from "@/lib/image-utils";
import { useSocialConnectionStatus } from "@/hooks/useSocialConnectionStatus";

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
  // Program information (enriched from parent)
  programName?: string;
  programImage?: string;
  creatorName?: string;
}

export default function FanTaskCard({
  task,
  progress,
  onStart,
  onContinue,
  onClaim,
  programName,
  programImage,
  creatorName,
}: FanTaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isCompleted = progress?.completed || false;
  const progressPercent = progress?.progress || 0;
  const hasProgress = progressPercent > 0 && progressPercent < 100;

  // Check if task is a social media task
  const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(
    task.platform?.toLowerCase() || ''
  );

  // Get platform icon
  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x':
        return <Twitter className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'spotify':
        return <Music className="h-4 w-4" />;
      case 'tiktok':
        return <Video className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get platform badge color
  const getPlatformBadgeColor = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'instagram':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'facebook':
        return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
      case 'youtube':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'tiktok':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'spotify':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Format task type for display
  const formatTaskType = (type?: string) => {
    return type
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Task';
  };

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

  // Check connection status for social tasks
  const { connected, isLoading: connectionLoading } = useSocialConnectionStatus(
    isSocialTask ? task.platform : undefined
  );

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02] group relative">
      {/* Connection Status Indicator (Top-Left) */}
      {isSocialTask && (
        <div className="absolute top-3 right-3 z-10">
          {connectionLoading ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 border border-gray-500/30 rounded-full">
              <Clock className="h-3 w-3 text-gray-400 animate-pulse" />
              <span className="text-xs text-gray-400">Checking...</span>
            </div>
          ) : connected ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
              <CheckCircle className="h-3 w-3 text-red-400" />
              <span className="text-xs text-red-400">Not Connected</span>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        {/* Program/Creator Info */}
        {(programName || creatorName) && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
            {programImage && (
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarImage src={transformImageUrl(programImage)} alt={programName || creatorName} />
                <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                  {(programName || creatorName)?.charAt(0)?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {programName || creatorName}
              </p>
              {programName && creatorName && (
                <p className="text-xs text-gray-400 truncate">
                  by {creatorName}
                </p>
              )}
            </div>
          </div>
        )}

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

              {/* Platform and Task Type Badges */}
              <div className="flex items-center gap-2 mb-2">
                {task.platform && (
                  <Badge variant="outline" className={`text-xs ${getPlatformBadgeColor(task.platform)}`}>
                    {getPlatformIcon(task.platform)}
                    <span className="ml-1 capitalize">{task.platform}</span>
                  </Badge>
                )}
                {task.taskType && (
                  <Badge variant="outline" className={`text-xs ${colorClass}`}>
                    {formatTaskType(task.taskType)}
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

