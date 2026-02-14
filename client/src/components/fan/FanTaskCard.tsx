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
  HelpCircle,
  ExternalLink,
  Target,
  Coins,
} from "lucide-react";
import { type Task } from "@shared/schema";
import TaskCompletionModalRouter from "@/components/modals/TaskCompletionModalRouter";
import { transformImageUrl } from "@/lib/image-utils";
import { useSocialConnectionStatus } from "@/hooks/useSocialConnectionStatus";
import { cn } from "@/lib/utils";

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

  const isSocialTask = ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(
    task.platform?.toLowerCase() || ''
  );
  const isInteractiveTask = task.platform?.toLowerCase() === 'interactive';

  // Platform icon
  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'twitter': case 'x': return <Twitter className="h-3.5 w-3.5" />;
      case 'instagram': return <Instagram className="h-3.5 w-3.5" />;
      case 'facebook': return <Facebook className="h-3.5 w-3.5" />;
      case 'youtube': return <Youtube className="h-3.5 w-3.5" />;
      case 'spotify': return <Music className="h-3.5 w-3.5" />;
      case 'tiktok': return <Video className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  // Platform colors
  const getPlatformColor = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'twitter': case 'x': return { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25', accent: 'bg-blue-500' };
      case 'instagram': return { badge: 'bg-pink-500/15 text-pink-400 border-pink-500/25', accent: 'bg-pink-500' };
      case 'facebook': return { badge: 'bg-blue-600/15 text-blue-400 border-blue-600/25', accent: 'bg-blue-600' };
      case 'youtube': return { badge: 'bg-red-500/15 text-red-400 border-red-500/25', accent: 'bg-red-500' };
      case 'tiktok': return { badge: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/25', accent: 'bg-cyan-400' };
      case 'spotify': return { badge: 'bg-green-500/15 text-green-400 border-green-500/25', accent: 'bg-green-500' };
      default: return { badge: 'bg-white/10 text-white/50 border-white/15', accent: 'bg-brand-primary' };
    }
  };

  // Format task type
  const formatTaskType = (type?: string) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Task';
  };

  // Handle start button
  const handleStartClick = () => {
    if (isSocialTask || isInteractiveTask) {
      setIsModalOpen(true);
    } else if (onStart) {
      onStart();
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    if (onStart) onStart();
  };

  // Task type icon
  const getTaskIcon = () => {
    switch (task.taskType) {
      case 'referral': return Users;
      case 'check_in': return Flame;
      case 'follower_milestone': return TrendingUp;
      case 'complete_profile': return CheckCircle;
      case 'poll': case 'quiz': return HelpCircle;
      case 'website_visit': return ExternalLink;
      default: return Target;
    }
  };

  // Task type color
  const getTaskColor = () => {
    switch (task.taskType) {
      case 'referral': return 'text-blue-400 bg-blue-500/15 border-blue-500/25';
      case 'check_in': return 'text-orange-400 bg-orange-500/15 border-orange-500/25';
      case 'follower_milestone': return 'text-green-400 bg-green-500/15 border-green-500/25';
      case 'complete_profile': return 'text-purple-400 bg-purple-500/15 border-purple-500/25';
      case 'poll': case 'quiz': return 'text-purple-400 bg-purple-500/15 border-purple-500/25';
      case 'website_visit': return 'text-blue-400 bg-blue-500/15 border-blue-500/25';
      default: return 'text-white/50 bg-white/10 border-white/15';
    }
  };

  const getPoints = () => {
    if (task.taskType === 'check_in' && task.customSettings) {
      const settings = task.customSettings as any;
      return settings.pointsPerCheckIn || task.pointsToReward;
    }
    return task.pointsToReward;
  };

  const TaskIcon = getTaskIcon();
  const colorClass = getTaskColor();
  const points = getPoints();
  const platformColors = getPlatformColor(task.platform);

  const { connected, isLoading: connectionLoading } = useSocialConnectionStatus(
    isSocialTask ? task.platform : undefined
  );

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      "bg-white/[0.04] backdrop-blur-lg border-white/[0.08]",
      "hover:bg-white/[0.07] hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/10",
      isCompleted && "border-green-500/20"
    )}>
      {/* Subtle top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-px",
        isCompleted ? "bg-green-500/40" : `${platformColors.accent}/30`
      )} />

      <CardHeader className="pb-3 pt-5">
        {/* Program/Creator Info */}
        {(programName || creatorName) && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.06]">
            {programImage && (
              <Avatar className="h-7 w-7 border border-white/10">
                <AvatarImage src={transformImageUrl(programImage) ?? undefined} alt={programName || creatorName} />
                <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-[10px]">
                  {(programName || creatorName)?.charAt(0)?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-medium truncate">
                {programName || creatorName}
              </p>
              {programName && creatorName && (
                <p className="text-[10px] text-white/30 truncate">by {creatorName}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Task Icon */}
            <div className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition-transform",
              colorClass,
              "group-hover:scale-105"
            )}>
              <TaskIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-white font-semibold text-base truncate">{task.name}</h3>
                {isCompleted && (
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {task.platform && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", platformColors.badge)}>
                    {getPlatformIcon(task.platform)}
                    <span className="capitalize">{task.platform}</span>
                  </Badge>
                )}
                {task.taskType && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", colorClass)}>
                    {formatTaskType(task.taskType)}
                  </Badge>
                )}
              </div>

              {task.description && (
                <p className="text-white/35 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
              )}
            </div>
          </div>

          {/* Connection Status */}
          {isSocialTask && (
            <div className="shrink-0">
              {connectionLoading ? (
                <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
              ) : connected ? (
                <div className="w-2 h-2 rounded-full bg-green-400" title="Connected" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-400" title="Not connected" />
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Reward Display */}
        <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500/15 flex items-center justify-center">
              <Coins className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <span className="text-white font-semibold text-sm">{points} pts</span>
          </div>
          {task.rewardFrequency !== 'one_time' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-brand-secondary border-brand-secondary/30 bg-brand-secondary/10">
              {task.rewardFrequency}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {hasProgress && !isCompleted && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Progress</span>
              <span className="text-white font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Streak Display */}
        {task.taskType === 'check_in' && progress?.currentStreak && progress.currentStreak > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-orange-500/8 border border-orange-500/15 rounded-lg">
            <Flame className="h-4 w-4 text-orange-400" />
            <div className="flex-1">
              <span className="text-white text-sm font-semibold">{progress.currentStreak} Day Streak</span>
              <span className="text-orange-400/60 text-xs ml-2">Keep it going!</span>
            </div>
          </div>
        )}

        {/* Task-Specific Info */}
        {task.taskType === 'referral' && task.customSettings && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Trophy className="h-3.5 w-3.5 text-brand-secondary" />
            <span>
              {(task.customSettings as any).rewardStructure === 'percentage'
                ? `Earn ${(task.customSettings as any).percentageOfReferred}% of friend's points`
                : `You: ${(task.customSettings as any).referrerPoints} pts, Friend: ${(task.customSettings as any).referredPoints} pts`}
            </span>
          </div>
        )}

        {task.taskType === 'follower_milestone' && task.customSettings && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Award className="h-3.5 w-3.5 text-green-400" />
            <span>
              {(task.customSettings as any).milestoneType === 'single'
                ? `Reach ${(task.customSettings as any).singleFollowerCount?.toLocaleString()} followers`
                : `${(task.customSettings as any).tiers?.length || 0} milestone tiers`}
            </span>
          </div>
        )}

        {/* Time Limit */}
        {task.endTime && (
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Clock className="h-3 w-3" />
            <span>Ends {new Date(task.endTime).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-1">
          {isCompleted ? (
            <Button
              className="w-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/15"
              disabled
              size="sm"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Completed
            </Button>
          ) : hasProgress ? (
            <Button
              className="w-full"
              onClick={onContinue}
              size="sm"
            >
              Continue
              <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleStartClick}
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Start Task
            </Button>
          )}
        </div>
      </CardContent>

      {/* Task Completion Modal */}
      {(isSocialTask || isInteractiveTask) && (
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
