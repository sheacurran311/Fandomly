/**
 * Poll/Quiz Task Completion Modal
 *
 * Modal for completing poll and quiz tasks
 */

import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { HelpCircle, Trophy, Sparkles, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PollQuizViewer from "@/components/tasks/viewers/PollQuizViewer";
import type { PollQuizConfig } from "@/components/tasks/config/PollQuizBuilder";

interface PollQuizCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
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
      <Alert variant="destructive">
        <AlertDescription>Invalid poll/quiz configuration</AlertDescription>
      </Alert>
    );
  }

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
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/published'] });

      // Show results
      setResults(data);
      setShowResults(true);

      // Calculate score for quizzes
      if (pollQuizConfig.type === 'quiz') {
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
        // Poll - always success
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

  // Show results view
  if (showResults && results) {
    const score = results.score || 0;
    const totalQuestions = pollQuizConfig.questions.length;
    const percentage = (score / totalQuestions) * 100;
    const passed = pollQuizConfig.type === 'poll' || (
      pollQuizConfig.requirePerfectScore
        ? percentage === 100
        : percentage >= (pollQuizConfig.passingScore || 0)
    );

    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {passed ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <HelpCircle className="w-6 h-6 text-red-500" />
            )}
            <DialogTitle>
              {pollQuizConfig.type === 'poll' ? 'Poll Submitted!' : passed ? 'Quiz Passed!' : 'Quiz Complete'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {pollQuizConfig.type === 'quiz' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500">
                <Trophy className="w-12 h-12 text-purple-400" />
              </div>

              <div>
                <h3 className="text-3xl font-bold text-white mb-2">{percentage}%</h3>
                <p className="text-gray-400">
                  {score} out of {totalQuestions} questions correct
                </p>
              </div>

              {passed && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-400">
                    <strong>Congratulations!</strong> You earned {task.pointsToReward} points!
                    {pollQuizConfig.perfectScoreMultiplier && percentage === 100 && (
                      <p className="mt-1">
                        Perfect score bonus: {pollQuizConfig.perfectScoreMultiplier}x multiplier applied!
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!passed && (
                <Alert variant="destructive">
                  <AlertDescription>
                    You need {pollQuizConfig.passingScore}% to pass. Try again!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {pollQuizConfig.type === 'poll' && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                <strong>Thank you!</strong> Your opinion has been recorded. You earned {task.pointsToReward} points!
              </AlertDescription>
            </Alert>
          )}

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
          <HelpCircle className="w-6 h-6 text-purple-500" />
          <DialogTitle>{task.name}</DialogTitle>
        </div>
        <DialogDescription>
          {task.description || (pollQuizConfig.type === 'poll' ? 'Share your opinion' : 'Test your knowledge')}
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <PollQuizViewer
          config={pollQuizConfig}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitting={submitMutation.isPending}
        />
      </div>
    </>
  );
}
