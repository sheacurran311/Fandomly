/**
 * Website Visit Task Completion Modal
 *
 * Modal for completing website visit tasks with tracked links
 */

import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { ExternalLink, CheckCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WebsiteVisitCard from "@/components/tasks/viewers/WebsiteVisitCard";
import type { WebsiteVisitConfig as WebsiteVisitConfigType } from "@/components/tasks/config/WebsiteVisitConfig";

interface WebsiteVisitCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
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
      <Alert variant="destructive">
        <AlertDescription>Invalid website visit configuration</AlertDescription>
      </Alert>
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
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });

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

  // Show completion success
  if (isCompleted) {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <DialogTitle>Task Complete!</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border-2 border-green-500">
              <Sparkles className="w-12 h-12 text-green-400" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                +{task.pointsToReward} Points!
              </h3>
              <p className="text-gray-400">
                Thanks for visiting!
              </p>
            </div>

            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                Your visit has been tracked and verified. Points have been added to your account!
              </AlertDescription>
            </Alert>
          </div>

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-2">
          <ExternalLink className="w-6 h-6 text-blue-500" />
          <DialogTitle>{task.name}</DialogTitle>
        </div>
        <DialogDescription>
          {task.description || 'Visit the link below to earn points'}
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <WebsiteVisitCard
          config={websiteConfig}
          taskId={task.id}
          onComplete={handleComplete}
          onCancel={onClose}
        />
      </div>
    </>
  );
}
