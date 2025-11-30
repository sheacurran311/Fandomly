/**
 * Poll/Quiz Task Builder Component
 *
 * Creates interactive polls and quizzes for fan engagement
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, AlertCircle, Lock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import {
  PollQuizBuilder,
  type PollQuizConfig,
} from "./config";

interface PollQuizTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'poll' | 'quiz';
  initialData?: any;
  isEditMode?: boolean;
}

export default function PollQuizTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
}: PollQuizTaskBuilderProps) {
  const { toast } = useToast();

  // Basic task info
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);

  // Poll/Quiz configuration
  const [pollQuizConfig, setPollQuizConfig] = useState<PollQuizConfig>({
    type: taskType,
    questions: [],
  });

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults =
        taskType === 'poll'
          ? {
              name: 'Fan Poll',
              description: 'Share your opinion with us!',
              points: 25,
            }
          : {
              name: 'Trivia Quiz',
              description: 'Test your knowledge and earn points!',
              points: 50,
            };
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode, taskName]);

  // Load initial data if editing
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.points || 50);
      setPollQuizConfig(initialData.settings?.pollQuizConfig || { type: taskType, questions: [] });
    }
  }, [isEditMode, initialData, taskType]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (pollQuizConfig.questions.length === 0) errors.push('At least one question is required');

    // Validate questions
    pollQuizConfig.questions.forEach((q, idx) => {
      if (!q.questionText.trim()) {
        errors.push(`Question ${idx + 1}: Question text is required`);
      }
      if (q.options.some((o) => !o.text.trim())) {
        errors.push(`Question ${idx + 1}: All options must have text`);
      }
      if (pollQuizConfig.type === 'quiz' && q.questionType !== 'true_false') {
        if (!q.correctAnswers || q.correctAnswers.length === 0) {
          errors.push(`Question ${idx + 1}: At least one correct answer must be marked`);
        }
      }
    });

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, pollQuizConfig]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }

    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'interactive' as const,
      points,
      isDraft: false,
      verificationMethod: 'auto_interactive',
      settings: {
        pollQuizConfig,
      },
      // Polls/quizzes are typically one-time (multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'interactive' as const,
      points,
      isDraft: true,
      verificationMethod: 'auto_interactive',
      settings: {
        pollQuizConfig,
      },
      // Polls/quizzes are typically one-time (multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-purple-600/10 to-pink-400/10 rounded-lg border border-purple-500/20">
      <div className="flex items-center gap-3 mb-3">
        <HelpCircle className="h-5 w-5 text-purple-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-purple-400">Type:</span>{' '}
          {taskType === 'poll' ? 'Poll' : 'Quiz'}
        </p>
        <p>
          <span className="text-purple-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-purple-400">Questions:</span> {pollQuizConfig.questions.length}
        </p>
        <p>
          <span className="text-purple-400">Points:</span> {points} points
        </p>
        {pollQuizConfig.type === 'quiz' && pollQuizConfig.passingScore && (
          <p>
            <span className="text-purple-400">Passing Score:</span>{' '}
            {pollQuizConfig.passingScore}%
          </p>
        )}
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<HelpCircle className="h-6 w-6 text-purple-400" />}
      title={taskType === 'poll' ? 'Poll Task' : 'Quiz Task'}
      description={
        taskType === 'poll'
          ? 'Create interactive polls to gather fan opinions'
          : 'Create quizzes to engage and reward your fans'
      }
      category="Interactive"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText={
        taskType === 'poll'
          ? 'Polls are great for getting fan feedback and opinions. Any answer earns points!'
          : 'Quizzes test fan knowledge. Set a passing score or require perfect answers.'
      }
      exampleUse={
        taskType === 'poll'
          ? 'Ask fans which content they want to see next, favorite songs, merchandise ideas, etc.'
          : 'Test fan knowledge about your content, trivia about your journey, fun facts, etc.'
      }
    >
      {/* Basic Task Info */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {taskType === 'poll' ? 'Poll' : 'Quiz'} Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder={taskType === 'poll' ? 'e.g., Help Us Choose!' : 'e.g., Fan Trivia Quiz'}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder={
                taskType === 'poll'
                  ? 'e.g., Share your opinion and earn points!'
                  : 'e.g., Test your knowledge and win rewards!'
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Points Reward</Label>
            <NumberInput
              value={points}
              onChange={(val) => setPoints(val || 1)}
              min={1}
              max={10000}
              allowEmpty={false}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              {taskType === 'poll'
                ? 'Points awarded for any answer'
                : 'Points awarded for passing the quiz'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Poll/Quiz Builder */}
      <PollQuizBuilder value={pollQuizConfig} onChange={setPollQuizConfig} />

      {/* Locked Frequency Display */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-white font-semibold">Reward Frequency</Label>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400">
                {taskType === 'poll' ? 'Polls' : 'Quizzes'} are typically completed once
              </p>
            </div>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              One-time
            </Badge>
          </div>
          <Alert className="mt-3 bg-purple-500/10 border-purple-500/20">
            <Info className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-purple-400 text-sm">
              This task can only be completed once per user. Multipliers can be configured at the campaign level.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Auto-verification notice */}
      <Alert className="bg-green-500/10 border-green-500/20">
        <AlertCircle className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-400">
          <strong>Auto-verified:</strong> {taskType === 'poll' ? 'Polls' : 'Quizzes'} are
          instantly verified when fans submit their responses. No manual review needed!
        </AlertDescription>
      </Alert>
    </TaskBuilderBase>
  );
}
