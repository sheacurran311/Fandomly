/**
 * Website Visit Task Completion Modal
 *
 * Modal for completing website visit tasks with tracked links.
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { ExternalLink, CheckCircle, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WebsiteVisitCard from "@/components/tasks/viewers/WebsiteVisitCard";
import type { WebsiteVisitConfig as WebsiteVisitConfigType } from "@/components/tasks/config/WebsiteVisitConfig";
import TaskCompletionModalLayout from "../TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface WebsiteVisitCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
}

export default function WebsiteVisitCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: WebsiteVisitCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompleted, setIsCompleted] = useState(false);

  // Get website visit configuration
  const settings = task.customSettings as any;
  const websiteConfig = settings?.websiteConfig as WebsiteVisitConfigType;

  if (!websiteConfig) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-white/60">Invalid website visit configuration</p>
        <Button onClick={onClose} variant="ghost" className="mt-4">Close</Button>
      </div>
    );
  }

  // Submit completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const endpoint = completionId
        ? `/api/task-completions/${completionId}/verify`
        : `/api/tasks/${task.id}/complete`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'interactive',
          taskType: 'website_visit',
          proofData: {
            destinationUrl: websiteConfig.destinationUrl,
            timestamp: new Date().toISOString(),
          },
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

      setIsCompleted(true);

      toast({
        title: "Task Complete!",
        description: `You earned ${task.pointsToReward} points!`,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    submitMutation.mutate();
  };

  // Success state
  if (isCompleted) {
    return (
      <div className="flex flex-col items-center py-6 space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-500/10 border-2 border-green-500/30">
          <Sparkles className="w-10 h-10 text-green-400" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold text-white">Task Complete!</h3>
          <p className="text-3xl font-bold text-green-400">+{task.pointsToReward} pts</p>
          <p className="text-sm text-white/50">Thanks for visiting!</p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 w-full">
          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">
            Your visit has been tracked and verified. Points added to your account!
          </p>
        </div>

        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <TaskCompletionModalLayout
      platform="interactive"
      icon={<ExternalLink className="h-5 w-5" />}
      taskName={task.name}
      taskDescription={task.description || 'Visit the link below to earn points'}
      pointsReward={task.pointsToReward || 0}
      hideFooter={true}
    >
      <WebsiteVisitCard
        config={websiteConfig}
        taskId={task.id}
        onComplete={handleComplete}
        onCancel={onClose}
      />
    </TaskCompletionModalLayout>
  );
}
