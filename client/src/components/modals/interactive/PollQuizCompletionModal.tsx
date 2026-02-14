/**
 * Poll/Quiz Task Completion Modal
 *
 * Modal for completing poll and quiz tasks with consistent layout.
 */

import { useState } from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { HelpCircle, Trophy, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PollQuizViewer from "@/components/tasks/viewers/PollQuizViewer";
import type { PollQuizConfig } from "@/components/tasks/config/PollQuizBuilder";
import TaskCompletionModalLayout from "../TaskCompletionModalLayout";
import { invalidateTaskCompletionQueries } from "@/hooks/useTaskCompletion";

interface PollQuizCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
}

export default function PollQuizCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: PollQuizCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Get poll/quiz configuration
  const settings = task.customSettings as any;
  const pollQuizConfig = settings?.pollQuizConfig as PollQuizConfig;

  if (!pollQuizConfig) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-white/60">Invalid poll/quiz configuration</p>
        <Button onClick={onClose} variant="ghost" className="mt-4">Close</Button>
      </div>
    );
  }

  const isQuiz = pollQuizConfig.type === 'quiz';

  // Submit answers mutation
  const submitMutation = useMutation({
    mutationFn: async (answers: Record<string, number[]>) => {
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
          taskType: task.taskType,
          proofData: {
            answers,
            config: pollQuizConfig,
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
    onSuccess: (data) => {
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

      setResults(data);
      setShowResults(true);

      if (isQuiz) {
        const score = data.score || 0;
        const totalQuestions = pollQuizConfig.questions.length;
        const percentage = (score / totalQuestions) * 100;
        const passed = pollQuizConfig.requirePerfectScore
          ? percentage === 100
          : percentage >= (pollQuizConfig.passingScore || 0);

        toast({
          title: passed ? "Quiz Passed!" : "Quiz Complete",
          description: passed
            ? `You scored ${percentage}% and earned ${task.pointsToReward} points!`
            : `You scored ${percentage}%, but didn't meet the passing score.`,
          variant: passed ? "default" : "destructive",
        });

        if (passed) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      } else {
        toast({
          title: "Poll Submitted!",
          description: `Thanks for sharing your opinion! You earned ${task.pointsToReward} points.`,
        });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (answers: Record<string, number[]>) => {
    submitMutation.mutate(answers);
  };

  // Results view
  if (showResults && results) {
    const score = results.score || 0;
    const totalQuestions = pollQuizConfig.questions.length;
    const percentage = (score / totalQuestions) * 100;
    const passed = !isQuiz || (
      pollQuizConfig.requirePerfectScore
        ? percentage === 100
        : percentage >= (pollQuizConfig.passingScore || 0)
    );

    return (
      <div className="flex flex-col items-center py-6 space-y-5">
        {/* Result Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          passed
            ? "bg-green-500/10 border-2 border-green-500/30"
            : "bg-red-500/10 border-2 border-red-500/30"
        }`}>
          {passed ? (
            <Trophy className="w-10 h-10 text-green-400" />
          ) : (
            <XCircle className="w-10 h-10 text-red-400" />
          )}
        </div>

        {/* Result Title */}
        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold text-white">
            {!isQuiz ? "Poll Submitted!" : passed ? "Quiz Passed!" : "Not Quite..."}
          </h3>
          {isQuiz && (
            <p className="text-3xl font-bold text-white">{percentage}%</p>
          )}
          <p className="text-sm text-white/50">
            {!isQuiz
              ? "Thanks for sharing your opinion!"
              : `${score} out of ${totalQuestions} correct`}
          </p>
        </div>

        {/* Success/Fail Message */}
        {passed ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 w-full">
            <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">
              You earned <strong>{task.pointsToReward} points!</strong>
              {isQuiz && pollQuizConfig.perfectScoreMultiplier && percentage === 100 && (
                <> Perfect score bonus: {pollQuizConfig.perfectScoreMultiplier}x multiplier!</>
              )}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 w-full">
            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">
              You need {pollQuizConfig.passingScore}% to pass. Try again!
            </p>
          </div>
        )}

        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  // Main quiz/poll view
  return (
    <TaskCompletionModalLayout
      platform="interactive"
      icon={<HelpCircle className="h-5 w-5" />}
      taskName={task.name}
      taskDescription={task.description || (isQuiz ? 'Test your knowledge' : 'Share your opinion')}
      pointsReward={task.pointsToReward || 0}
      hideFooter={true}
    >
      <PollQuizViewer
        config={pollQuizConfig}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={submitMutation.isPending}
      />
    </TaskCompletionModalLayout>
  );
}
