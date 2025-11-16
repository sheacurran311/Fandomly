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
  Instagram,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Heart,
  UserPlus,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InstagramTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
}

export default function InstagramTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: InstagramTaskCompletionModalProps) {
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
      formData.append('platform', 'instagram');
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
        description: "Your task is being reviewed by the creator",
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
    const contentUrl = settings?.contentUrl || settings?.postUrl;

    switch (taskType) {
      case 'instagram_follow':
        const profileUrl = username
          ? `https://instagram.com/${username.replace('@', '')}`
          : null;

        return {
          icon: <UserPlus className="w-6 h-6 text-pink-500" />,
          title: "Follow on Instagram",
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : "Follow the required account on Instagram",
          targetUrl: profileUrl,
          actionText: "Follow Account",
        };

      case 'instagram_like_post':
        return {
          icon: <Heart className="w-6 h-6 text-pink-500" />,
          title: "Like Instagram Post",
          description: "Like the specified post to earn points",
          targetUrl: contentUrl,
          actionText: "Open Post",
        };

      case 'instagram_comment':
        return {
          icon: <Heart className="w-6 h-6 text-pink-500" />,
          title: "Comment on Post",
          description: "Leave a comment on the specified post",
          targetUrl: contentUrl,
          actionText: "Open Post",
        };

      case 'instagram_story_view':
        return {
          icon: <Instagram className="w-6 h-6 text-pink-500" />,
          title: "View Instagram Story",
          description: "View the story from the specified account",
          targetUrl: profileUrl,
          actionText: "View Story",
        };

      default:
        return {
          icon: <Instagram className="w-6 h-6 text-pink-500" />,
          title: "Complete Instagram Task",
          description: task.description || "Complete the required Instagram action",
          targetUrl: contentUrl || profileUrl,
          actionText: "Open Instagram",
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
        {/* Step 1: Go to Instagram */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Step 1: Complete the action</h4>
          {content.targetUrl && (
            <Button
              onClick={() => window.open(content.targetUrl!, '_blank')}
              className="w-full"
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
            <Label>Screenshot (required for Instagram):</Label>
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
            <Label>Link (optional):</Label>
            <Input
              placeholder="Paste Instagram URL here (if applicable)"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Instagram Verification Notice */}
        <Alert>
          <AlertDescription>
            Instagram tasks require manual review. Your submission will be verified by the creator within 24-48 hours.
          </AlertDescription>
        </Alert>

        {/* Points Reward Display */}
        <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reward:</span>
            <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
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
            disabled={submitMutation.isPending || !screenshotFile}
            className="flex-1"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
