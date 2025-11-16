import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import {
  CheckCircle2,
  Loader2,
  Upload,
  ExternalLink,
  Target,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GenericTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
  platform?: string;
}

export default function GenericTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
  platform,
}: GenericTaskCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const settings = task.customSettings as any;

  // Submit task completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('platform', platform || 'generic');
      formData.append('taskType', task.taskType || '');
      formData.append('proofUrl', proofUrl);
      formData.append('proofNotes', proofNotes);
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
        description: "Your submission is being reviewed by the creator",
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

  // Get platform-specific action URL if available
  const getActionUrl = () => {
    const contentUrl = settings?.contentUrl || settings?.postUrl || settings?.videoUrl || settings?.mediaUrl;
    const username = settings?.username || settings?.handle;

    if (contentUrl) {
      return contentUrl;
    }

    // Construct profile URL based on platform and username
    if (username && platform) {
      switch (platform) {
        case 'facebook':
          return `https://facebook.com/${username.replace('@', '')}`;
        case 'spotify':
          return `https://open.spotify.com/user/${username.replace('@', '')}`;
        case 'twitch':
          return `https://twitch.tv/${username.replace('@', '')}`;
        case 'discord':
          return null; // Discord doesn't have web profile URLs
        default:
          return null;
      }
    }

    return null;
  };

  const actionUrl = getActionUrl();

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-primary" />
          <DialogTitle>{task.name}</DialogTitle>
        </div>
        <DialogDescription>
          {task.description || "Complete this task to earn points"}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Task Instructions */}
        {task.description && (
          <Alert>
            <AlertDescription>{task.description}</AlertDescription>
          </Alert>
        )}

        {/* Action Link */}
        {actionUrl && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Step 1: Complete the action</h4>
            <Button
              onClick={() => window.open(actionUrl, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to {platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Task'}
            </Button>
          </div>
        )}

        {/* Proof Submission */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">
            {actionUrl ? 'Step 2: Provide proof' : 'Submit Proof'}
          </h4>

          <div className="space-y-2">
            <Label>Screenshot (optional):</Label>
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
              Upload a screenshot showing you completed the task
            </p>
          </div>

          <div className="space-y-2">
            <Label>Link/URL (optional):</Label>
            <Input
              placeholder="Paste relevant link here"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes (optional):</Label>
            <Textarea
              placeholder="Add any additional information about your submission..."
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Manual Review Notice */}
        <Alert>
          <AlertDescription>
            This task requires manual review. Your submission will be verified by the creator within 24-48 hours.
          </AlertDescription>
        </Alert>

        {/* Points Reward Display */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reward:</span>
            <span className="text-lg font-bold text-primary">
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
            disabled={submitMutation.isPending}
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
