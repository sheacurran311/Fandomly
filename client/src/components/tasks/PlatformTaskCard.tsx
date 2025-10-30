import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Clock, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";

interface PlatformTaskCardProps {
  task: Task & {
    completion?: {
      id: string;
      status: string;
      pointsAwarded: number;
      completedAt: Date | null;
    } | null;
  };
}

export function PlatformTaskCard({ task }: PlatformTaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isCompleted = task.completion?.status === 'completed' || task.completion?.status === 'verified';
  const isPending = task.completion?.status === 'pending';

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/platform-tasks/${task.id}/complete`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${data.pointsAwarded} Fandomly Points!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/platform-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platform-points/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      facebook: '📘',
      twitter: '𝕏',
      instagram: '📷',
      tiktok: '🎵',
      youtube: '▶️',
      spotify: '🎧',
      discord: '💬',
      telegram: '✈️',
    };
    return icons[platform.toLowerCase()] || '🌐';
  };

  const getTaskTypeLabel = (taskType: string) => {
    const labels: Record<string, string> = {
      follow: 'Follow',
      like: 'Like',
      share: 'Share',
      comment: 'Comment',
      subscribe: 'Subscribe',
      join: 'Join',
      visit: 'Visit',
      complete_profile: 'Complete Profile',
    };
    return labels[taskType] || taskType;
  };

  return (
    <Card className="bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border-brand-primary/30 hover:border-brand-primary/60 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getPlatformIcon(task.platform)}</span>
            <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/40">
              Platform Points
            </Badge>
          </div>
          {isCompleted && (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
          {isPending && (
            <Clock className="h-5 w-5 text-yellow-400" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Task Title */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {task.name}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {task.description}
          </p>
        </div>

        {/* Task Details */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
              {getTaskTypeLabel(task.taskType)}
            </Badge>
            <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
              {task.platform}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-brand-primary fill-brand-primary" />
            <span className="text-sm font-semibold text-brand-primary">
              +{task.pointsToReward || 50} pts
            </span>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 italic">
          Redeemable for Fandomly rewards, NFTs, and special offers
        </p>

        {/* Action Button */}
        {isCompleted ? (
          <Button
            disabled
            className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/20 cursor-default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
          </Button>
        ) : isPending ? (
          <Button
            disabled
            className="w-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 cursor-default"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending Verification
          </Button>
        ) : (
          <div className="space-y-2">
            {task.targetUrl && (
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open(task.targetUrl!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to {task.platform}
              </Button>
            )}
            <Button
              className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-semibold"
              onClick={() => completeTaskMutation.mutate()}
              disabled={completeTaskMutation.isPending}
            >
              {completeTaskMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

