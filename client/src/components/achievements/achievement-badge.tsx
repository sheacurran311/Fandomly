import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Star, 
  Medal, 
  Crown, 
  Diamond,
  Lock,
  CheckCircle,
  Gift
} from "lucide-react";
import { type Achievement, type UserAchievement } from "@shared/schema";

interface AchievementBadgeProps {
  achievement: Achievement;
  userAchievement?: Partial<Pick<UserAchievement, 'progress' | 'completed' | 'claimed'>>;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  onClaim?: () => void;
}

export default function AchievementBadge({ 
  achievement, 
  userAchievement, 
  size = "md",
  showProgress = true,
  onClaim 
}: AchievementBadgeProps) {
  const isCompleted = userAchievement?.completed || false;
  const isClaimed = userAchievement?.claimed || false;
  const progress = userAchievement?.progress || 0;
  const progressPercentage = (achievement.actionCount ?? 0) > 0 
    ? Math.min((progress / (achievement.actionCount ?? 1)) * 100, 100)
    : 0;

  const getTierIcon = (type: string) => {
    switch (type) {
      case "diamond": return Diamond;
      case "platinum": return Crown;
      case "gold": return Trophy;
      case "silver": return Medal;
      case "bronze": return Star;
      default: return Trophy;
    }
  };

  const getTierColor = (type: string) => {
    switch (type) {
      case "diamond": return "from-cyan-400 to-blue-500";
      case "platinum": return "from-gray-300 to-gray-500";
      case "gold": return "from-yellow-400 to-yellow-600";
      case "silver": return "from-gray-400 to-gray-600";
      case "bronze": return "from-orange-400 to-orange-600";
      default: return "from-gray-400 to-gray-600";
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "diamond": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "platinum": return "bg-gray-300/20 text-gray-300 border-gray-300/30";
      case "gold": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "silver": return "bg-gray-400/20 text-gray-300 border-gray-400/30";
      case "bronze": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      default: return "bg-gray-400/20 text-gray-300 border-gray-400/30";
    }
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6"
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const TierIcon = getTierIcon(achievement.type);

  return (
    <Card className={`bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-300 ${
      isCompleted ? 'ring-2 ring-brand-secondary/50' : ''
    } ${!isCompleted && progress === 0 ? 'opacity-60' : ''}`}>
      <CardContent className={sizeClasses[size]}>
        <div className="text-center space-y-3">
          {/* Achievement Icon */}
          <div className="relative mx-auto">
            <div className={`
              ${iconSizes[size]} mx-auto rounded-full bg-gradient-to-br ${getTierColor(achievement.type)} 
              flex items-center justify-center relative overflow-hidden
              ${isCompleted ? 'animate-pulse' : ''}
            `}>
              {isCompleted ? (
                <CheckCircle className={`${iconSizes[size]} text-white`} />
              ) : progress === 0 ? (
                <Lock className={`${iconSizes[size]} text-white/60`} />
              ) : (
                <TierIcon className={`${iconSizes[size]} text-white`} />
              )}
            </div>
            
            {/* Completion Ring */}
            {isCompleted && (
              <div className="absolute inset-0 rounded-full border-2 border-brand-secondary animate-ping" />
            )}
          </div>

          {/* Achievement Details */}
          <div>
            <div className="flex items-center justify-center space-x-2 mb-1">
              <h4 className={`font-semibold text-white ${
                size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
              }`}>
                {achievement.name}
              </h4>
              <Badge variant="outline" className={`text-xs ${getBadgeColor(achievement.type)}`}>
                {achievement.type}
              </Badge>
            </div>
            <p className={`text-gray-400 ${
              size === 'sm' ? 'text-xs' : 'text-sm'
            }`}>
              {achievement.description}
            </p>
          </div>

          {/* Progress Bar */}
          {showProgress && (achievement.actionCount ?? 0) > 0 && !isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{progress}/{achievement.actionCount ?? 0}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Reward Info */}
          {(achievement.rewardPoints ?? 0) > 0 && (
            <div className="flex items-center justify-center space-x-1 text-brand-secondary">
              <Gift className="h-4 w-4" />
              <span className="text-sm font-medium">{achievement.rewardPoints ?? 0} points</span>
            </div>
          )}

          {/* Claim Button */}
          {isCompleted && !isClaimed && onClaim && (
            <Button
              onClick={onClaim}
              className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-dark-bg"
              size="sm"
            >
              Claim Reward
            </Button>
          )}

          {/* Status */}
          {isClaimed && (
            <Badge className="bg-green-500/20 text-green-400 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Claimed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}