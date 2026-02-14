import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Upload,
} from "lucide-react";
import TaskCompletionModalLayout, {
  ModalHint,
  ProofSection,
} from "./TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface GenericTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
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
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

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

  // Get platform-specific action URL
  const getActionUrl = () => {
    const contentUrl = settings?.contentUrl || settings?.postUrl || settings?.videoUrl || settings?.mediaUrl;
    const username = settings?.username || settings?.handle;

    if (contentUrl) return contentUrl;

    if (username && platform) {
      switch (platform) {
        case 'facebook':
          return `https://facebook.com/${username.replace('@', '')}`;
        case 'spotify':
          return `https://open.spotify.com/user/${username.replace('@', '')}`;
        case 'twitch':
          return `https://twitch.tv/${username.replace('@', '')}`;
        case 'discord':
          return null;
        default:
          return null;
      }
    }

    return null;
  };

  const actionUrl = getActionUrl();
  const platformLabel = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Task';

  const steps = actionUrl
    ? [{ label: "Action" }, { label: "Proof" }, { label: "Submit" }]
    : [{ label: "Proof" }, { label: "Submit" }];

  return (
    <TaskCompletionModalLayout
      platform={platform || "generic"}
      taskName={task.name}
      taskDescription={task.description || "Complete this task to earn points"}
      pointsReward={task.pointsToReward || 0}
      steps={steps}
      currentStep={0}
      onCancel={onClose}
      onSubmit={() => submitMutation.mutate()}
      submitLabel="Submit for Review"
      isSubmitting={submitMutation.isPending}
      canSubmit={true}
    >
      {/* Action Link */}
      {actionUrl && (
        <Button
          onClick={() => window.open(actionUrl, '_blank')}
          className="w-full"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Go to {platformLabel}
        </Button>
      )}

      {/* Proof Submission */}
      <ProofSection title="Provide Proof">
        <div className="space-y-4">
          {/* Screenshot upload */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Screenshot (optional)</Label>
            <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-white/10 hover:border-brand-primary/30 bg-white/[0.02] hover:bg-brand-primary/5 cursor-pointer transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {screenshotFile ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{screenshotFile.name}</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-7 h-7 text-white/20" />
                  <span className="text-sm text-white/40">Click to upload screenshot</span>
                </>
              )}
            </label>
          </div>

          {/* Link/URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Link/URL (optional)</Label>
            <Input
              placeholder="Paste relevant link here"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Additional Notes (optional)</Label>
            <Textarea
              placeholder="Add any additional information..."
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={2}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none"
            />
          </div>
        </div>
      </ProofSection>

      {/* Manual Review Notice */}
      <ModalHint>
        <Upload className="h-4 w-4 shrink-0 mt-0.5" />
        <span>This task requires manual review. Your submission will be verified by the creator within 24-48 hours.</span>
      </ModalHint>
    </TaskCompletionModalLayout>
  );
}
