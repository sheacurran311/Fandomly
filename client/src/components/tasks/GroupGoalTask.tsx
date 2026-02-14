import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Instagram, 
  Facebook, 
  Music2, 
  Youtube,
  Twitter,
  Users,
  Target,
  Trophy,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  UserPlus,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * GroupGoalTask Component
 * 
 * Displays a community goal task where all participants are rewarded
 * when the collective goal is met.
 * 
 * Features:
 * - Progress bar showing current vs target
 * - Participant count
 * - Recent participants avatars
 * - Join/enrolled state
 * - Countdown timer (if time-limited)
 * - Completion celebration state
 */

export interface GroupGoalTaskProps {
  task: {
    id: string;
    name: string;
    description: string;
    platform: string;
    taskType: string;
    pointsToReward: number;
    customSettings?: {
      contentUrl?: string;
      hashtag?: string;
    };
  };
  goal: {
    id: string;
    metricType: string;
    targetValue: number;
    currentValue: number;
    hashtag?: string;
    status: 'active' | 'completed' | 'expired';
    endTime?: string;
  };
  participantCount: number;
  recentParticipants?: Array<{
    id: string;
    avatar?: string;
    username?: string;
  }>;
  hasJoined: boolean;
  hasBeenRewarded: boolean;
  onJoin: (goalId: string) => Promise<void>;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <Music2 className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  x: <Twitter className="h-5 w-5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
  tiktok: 'bg-black',
  facebook: 'bg-blue-600',
  youtube: 'bg-red-600',
  twitter: 'bg-sky-500',
  x: 'bg-black',
};

const METRIC_ICONS: Record<string, React.ReactNode> = {
  likes: <Heart className="h-4 w-4" />,
  views: <Eye className="h-4 w-4" />,
  comments: <MessageCircle className="h-4 w-4" />,
  shares: <Share2 className="h-4 w-4" />,
  followers: <UserPlus className="h-4 w-4" />,
  subscribers: <UserPlus className="h-4 w-4" />,
  reactions: <Heart className="h-4 w-4" />,
};

const METRIC_LABELS: Record<string, string> = {
  likes: 'likes',
  views: 'views',
  comments: 'comments',
  shares: 'shares',
  followers: 'followers',
  subscribers: 'subscribers',
  reactions: 'reactions',
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function GroupGoalTask({
  task,
  goal,
  participantCount,
  recentParticipants = [],
  hasJoined,
  hasBeenRewarded,
  onJoin,
}: GroupGoalTaskProps) {
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const platform = task.platform.toLowerCase();
  const platformIcon = PLATFORM_ICONS[platform];
  const platformColor = PLATFORM_COLORS[platform] || 'bg-gray-600';
  const metricIcon = METRIC_ICONS[goal.metricType] || <Target className="h-4 w-4" />;
  const metricLabel = METRIC_LABELS[goal.metricType] || goal.metricType;

  const progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  const isCompleted = goal.status === 'completed' || goal.currentValue >= goal.targetValue;
  const isExpired = goal.status === 'expired';

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin(goal.id);
      toast({
        title: 'You joined the goal!',
        description: `You'll earn ${task.pointsToReward} points when the goal is reached.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join goal',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Completed and rewarded state
  if (isCompleted && hasBeenRewarded) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg text-white ${platformColor}`}>
                {platformIcon}
              </div>
              <div>
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <Badge variant="outline" className="mt-1 bg-green-100 text-green-800 border-green-300">
                  <Trophy className="h-3 w-3 mr-1" />
                  Goal Reached!
                </Badge>
              </div>
            </div>
            <Badge variant="secondary">+{task.pointsToReward} pts earned</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-lg font-semibold">Congratulations!</p>
            <p className="text-sm text-muted-foreground">
              The community reached {formatNumber(goal.targetValue)} {metricLabel}!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expired state
  if (isExpired && !isCompleted) {
    return (
      <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 opacity-75">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg text-white ${platformColor} opacity-50`}>
                {platformIcon}
              </div>
              <div>
                <CardTitle className="text-lg text-muted-foreground">{task.name}</CardTitle>
                <Badge variant="outline" className="mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Goal Expired
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Final progress:</span>
              <span>{formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {metricLabel}</span>
            </div>
            <Progress value={progress} className="h-2 opacity-50" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isCompleted ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg text-white ${platformColor}`}>
              {platformIcon}
            </div>
            <div>
              <CardTitle className="text-lg">{task.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Community Goal
                </Badge>
                {hasJoined && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Enrolled
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge variant="default" className="text-lg">
            +{task.pointsToReward} pts
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription>{task.description}</CardDescription>

        {/* Goal progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              {metricIcon}
              <span>
                {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {metricLabel}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Time remaining */}
        {goal.endTime && !isCompleted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTimeRemaining(goal.endTime)}</span>
          </div>
        )}

        {/* Hashtag */}
        {goal.hashtag && (
          <div className="text-sm">
            <span className="text-muted-foreground">Campaign hashtag: </span>
            <span className="font-mono font-medium">#{goal.hashtag}</span>
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {recentParticipants.slice(0, 5).map((participant, index) => (
                <Avatar key={participant.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="text-xs">
                    {participant.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {participantCount > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{participantCount - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {participantCount} {participantCount === 1 ? 'fan' : 'fans'} enrolled
            </span>
          </div>
        </div>

        {/* Completed state awaiting rewards */}
        {isCompleted && hasJoined && !hasBeenRewarded && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
            <Trophy className="h-6 w-6 mx-auto text-yellow-600 dark:text-yellow-400 mb-1" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Goal reached! Rewards distributing...
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {hasJoined ? (
          <div className="w-full text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            You're enrolled! You'll earn {task.pointsToReward} points when the goal is reached.
          </div>
        ) : (
          <Button 
            className="w-full"
            onClick={handleJoin}
            disabled={isJoining || isExpired}
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Join Goal - Earn {task.pointsToReward} pts when reached
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default GroupGoalTask;
