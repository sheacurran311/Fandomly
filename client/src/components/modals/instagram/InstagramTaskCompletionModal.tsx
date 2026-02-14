import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import {
  Instagram,
  ExternalLink,
  CheckCircle2,
  Heart,
  UserPlus,
  Upload,
  ImageIcon,
} from "lucide-react";
import TaskCompletionModalLayout, {
  ModalHint,
  ProofSection,
} from "../TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface InstagramTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
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
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

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

  // Get task-specific content
  const getTaskContent = () => {
    const username = settings?.username;
    const contentUrl = settings?.contentUrl || settings?.postUrl;
    const profileUrl = username
      ? `https://instagram.com/${username.replace('@', '')}`
      : null;

    switch (taskType) {
      case 'instagram_follow':
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: "Follow on Instagram",
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : "Follow the required account on Instagram",
          targetUrl: profileUrl,
          actionText: `Follow @${username?.replace('@', '') || 'account'}`,
        };

      case 'instagram_like_post':
        return {
          icon: <Heart className="h-5 w-5" />,
          title: "Like Instagram Post",
          description: "Like the specified post to earn points",
          targetUrl: contentUrl,
          actionText: "Open Post to Like",
        };

      case 'instagram_comment':
        return {
          icon: <Heart className="h-5 w-5" />,
          title: "Comment on Post",
          description: "Leave a comment on the specified post",
          targetUrl: contentUrl,
          actionText: "Open Post to Comment",
        };

      case 'instagram_story_view':
        return {
          icon: <Instagram className="h-5 w-5" />,
          title: "View Instagram Story",
          description: "View the story from the specified account",
          targetUrl: profileUrl,
          actionText: "View Story",
        };

      default:
        return {
          icon: <Instagram className="h-5 w-5" />,
          title: "Complete Instagram Task",
          description: task.description || "Complete the required Instagram action",
          targetUrl: contentUrl || profileUrl,
          actionText: "Open Instagram",
        };
    }
  };

  const content = getTaskContent();

  return (
    <TaskCompletionModalLayout
      platform="instagram"
      icon={content.icon}
      taskName={content.title}
      taskDescription={content.description}
      pointsReward={task.pointsToReward || 0}
      steps={[
        { label: "Action" },
        { label: "Proof" },
        { label: "Submit" },
      ]}
      currentStep={screenshotFile ? 2 : 0}
      onCancel={onClose}
      onSubmit={() => submitMutation.mutate()}
      submitLabel="Submit for Review"
      isSubmitting={submitMutation.isPending}
      canSubmit={!!screenshotFile}
    >
      {/* Action Button */}
      {content.targetUrl && (
        <Button
          onClick={() => window.open(content.targetUrl!, '_blank')}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {content.actionText}
        </Button>
      )}

      {/* Screenshot Upload */}
      <ProofSection title="Upload Proof">
        <div className="space-y-3">
          <Label className="text-xs text-white/50">Screenshot (required for Instagram)</Label>
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-white/10 hover:border-pink-500/30 bg-white/[0.02] hover:bg-pink-500/5 cursor-pointer transition-all">
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
                <ImageIcon className="w-8 h-8 text-white/20" />
                <span className="text-sm text-white/40">Click to upload screenshot</span>
                <span className="text-xs text-white/20">PNG, JPG up to 10MB</span>
              </>
            )}
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Link (optional)</Label>
            <Input
              placeholder="Paste Instagram URL here (if applicable)"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </div>
      </ProofSection>

      {/* Manual review notice */}
      <ModalHint variant="info">
        <Upload className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Instagram tasks require manual review. Your submission will be verified within 24-48 hours.</span>
      </ModalHint>
    </TaskCompletionModalLayout>
  );
}
