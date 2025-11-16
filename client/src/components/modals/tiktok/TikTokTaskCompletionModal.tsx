import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import {
  ExternalLink,
  CheckCircle2,
  Loader2,
  Heart,
  UserPlus,
  Share2,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TikTokTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
}

export default function TikTokTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: TikTokTaskCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const settings = task.customSettings as any;
  const taskType = task.taskType as string;

  // Submit task completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('platform', 'tiktok');
      formData.append('taskType', task.taskType || '');
      formData.append('proofUrl', proofUrl);
      formData.append('targetData', JSON.stringify(settings));

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const endpoint = completionId
        ? `/api/task-completions/${completionId}/verify`
        : `/api/tasks/${task.id}/complete`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });

      toast({
        title: "Task Submitted!",
        description: data.verified
          ? "Your task has been verified"
          : "Your task is being reviewed",
      });

      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Get task-specific instructions and UI
  const getTaskContent = () => {
    const username = settings?.username;
    const videoUrl = settings?.videoUrl || settings?.contentUrl;

    switch (taskType) {
      case 'tiktok_follow':
        const profileUrl = username
          ? `https://tiktok.com/@${username.replace('@', '')}`
          : null;

        return {
          icon: <UserPlus className="w-6 h-6" style={{ color: '#00f2ea' }} />,
          title: "Follow on TikTok",
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : "Follow the required account on TikTok",
          targetUrl: profileUrl,
          actionText: "Follow Account",
        };

      case 'tiktok_like':
        return {
          icon: <Heart className="w-6 h-6" style={{ color: '#fe2c55' }} />,
          title: "Like TikTok Video",
          description: "Like the specified video to earn points",
          targetUrl: videoUrl,
          actionText: "Open Video",
        };

      case 'tiktok_share':
        return {
          icon: <Share2 className="w-6 h-6" style={{ color: '#00f2ea' }} />,
          title: "Share TikTok Video",
          description: "Share the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video",
        };

      case 'tiktok_comment':
        return {
          icon: <Heart className="w-6 h-6" style={{ color: '#00f2ea' }} />,
          title: "Comment on Video",
          description: "Leave a comment on the specified video",
          targetUrl: videoUrl,
          actionText: "Open Video",
        };

      default:
        return {
          icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>,
          title: "Complete TikTok Task",
          description: task.description || "Complete the required TikTok action",
          targetUrl: videoUrl || profileUrl,
          actionText: "Open TikTok",
        };
    }
  };

  const content = getTaskContent();

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-2">
          {content.icon}
          <DialogTitle>{content.title}</DialogTitle>
        </div>
        <DialogDescription>{content.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Step 1: Go to TikTok */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Step 1: Complete the action</h4>
          {content.targetUrl && (
            <Button
              onClick={() => window.open(content.targetUrl!, '_blank')}
              className="w-full"
              style={{ backgroundColor: '#00f2ea', color: '#000' }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {content.actionText}
            </Button>
          )}
        </div>

        {/* Step 2: Upload Proof */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Step 2: Provide proof</h4>

          <div className="space-y-2">
            <Label>Screenshot (recommended):</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {screenshotFile && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a screenshot showing you completed the action
            </p>
          </div>

          <div className="space-y-2">
            <Label>Your TikTok Video URL (if applicable):</Label>
            <Input
              placeholder="https://tiktok.com/@username/video/..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>
        </div>

        {/* TikTok Verification Notice */}
        <Alert>
          <AlertDescription>
            TikTok tasks use smart detection. Your submission will be automatically verified or reviewed by the creator.
          </AlertDescription>
        </Alert>

        {/* Points Reward Display */}
        <div className="p-4 bg-gradient-to-r from-cyan-50 to-pink-50 dark:from-cyan-950/20 dark:to-pink-950/20 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reward:</span>
            <span className="text-lg font-bold" style={{ color: '#00f2ea' }}>
              +{task.pointsToReward || 0} points
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (!proofUrl && !screenshotFile)}
            className="flex-1"
            style={{ backgroundColor: '#00f2ea', color: '#000' }}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Submit Task
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
