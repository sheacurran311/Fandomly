/**
 * Task Referral Widget
 * 
 * Allows fans to share specific tasks/campaigns and earn creator points
 * Features:
 * - Auto-generate task-specific referral links
 * - Social share buttons with pre-filled text
 * - Track shares, clicks, and completions
 * - Show points earned from referrals
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy, 
  Check, 
  Share2,
  ExternalLink,
  Users,
  Coins,
  TrendingUp
} from "lucide-react";
import { useCreateTaskReferral, useTaskReferralStats } from "@/hooks/useReferrals";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskReferralWidgetProps {
  taskId: string;
  taskName: string;
  taskDescription: string;
  creatorId: string;
  creatorName: string;
  pointsReward: number;
}

export default function TaskReferralWidget({
  taskId,
  taskName,
  taskDescription,
  creatorId,
  creatorName,
  pointsReward
}: TaskReferralWidgetProps) {
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const createReferral = useCreateTaskReferral();
  const { data: stats } = useTaskReferralStats(creatorId);

  // Generate referral link on mount
  useEffect(() => {
    generateReferralLink();
  }, [taskId, creatorId]);

  const generateReferralLink = async () => {
    try {
      const result = await createReferral.mutateAsync({
        taskId,
        creatorId
      });
      setReferralLink(result.referralUrl);
    } catch (error: any) {
      console.error('Error generating referral:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral link",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareText = `Check out this cool task from ${creatorName}! Complete it and earn ${pointsReward} points 🎉`;

  // Find this task's referral in stats
  const taskReferral = stats?.referrals?.find(r => r.taskId === taskId);

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share This Task
            </CardTitle>
            <CardDescription>
              Earn {pointsReward} creator points when friends complete it
            </CardDescription>
          </div>
          {taskReferral && (
            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300">
              <Coins className="h-3 w-3 mr-1" />
              {taskReferral.pointsEarned} earned
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Task Preview */}
        <Alert className="bg-white/5 border-white/10">
          <AlertDescription className="text-gray-300">
            <strong className="text-white">{taskName}</strong>
            <p className="text-sm mt-1">{taskDescription}</p>
          </AlertDescription>
        </Alert>

        {/* Referral Link */}
        {createReferral.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : referralLink ? (
          <div>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="border-white/20 hover:bg-white/10 shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Share this link to earn points when friends complete the task
            </p>
          </div>
        ) : null}

        {/* Share Buttons */}
        <div className="space-y-2">
          <p className="text-sm text-gray-300 font-medium">Quick Share:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const url = encodeURIComponent(referralLink || '');
                const text = encodeURIComponent(shareText);
                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
              }}
              size="sm"
              className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/80"
              disabled={!referralLink}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Twitter
            </Button>
            <Button
              onClick={() => {
                const url = encodeURIComponent(referralLink || '');
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
              }}
              size="sm"
              className="bg-[#1877F2] hover:bg-[#1877F2]/80"
              disabled={!referralLink}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Facebook
            </Button>
            <Button
              onClick={copyToClipboard}
              size="sm"
              variant="outline"
              className="border-white/20 hover:bg-white/10"
              disabled={!referralLink}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Link
            </Button>
          </div>
        </div>

        {/* Stats */}
        {taskReferral && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{taskReferral.clicks}</p>
              <p className="text-xs text-gray-400">Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {taskReferral.friendJoined ? '1' : '0'}
              </p>
              <p className="text-xs text-gray-400">Friends</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {taskReferral.taskCompleted ? '1' : '0'}
              </p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
          </div>
        )}

        {/* Overall Creator Stats */}
        {stats && stats.totalShares > 0 && (
          <Alert className="bg-purple-500/10 border-purple-500/20">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-gray-300">
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-sm font-medium text-white">{stats.totalShares}</p>
                  <p className="text-xs text-gray-400">Total Shares</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stats.totalPointsEarned}</p>
                  <p className="text-xs text-gray-400">Points Earned</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

