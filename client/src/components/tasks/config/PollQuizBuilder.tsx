/**
 * Poll/Quiz Builder Component
 *
 * Allows creators to build interactive polls and quizzes:
 * - Add multiple questions with options
 * - Mark correct answers (for quizzes)
 * - Set passing score requirements
 * - Configure perfect score bonuses
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Check,
  Plus,
  Trash2,
  GripVertical,
  HelpCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface PollQuizQuestion {
  id: string;
  questionText: string;
  questionType: 'single_choice' | 'multiple_choice' | 'true_false';
  options: Array<{
    id: number;
    text: string;
    isCorrect?: boolean;
  }>;
  correctAnswers?: number[];
  explanation?: string;
}

export interface PollQuizConfig {
  type: 'poll' | 'quiz';
  questions: PollQuizQuestion[];
  // Quiz-specific settings
  passingScore?: number;
  requirePerfectScore?: boolean;
  perfectScoreMultiplier?: number;
  allowMultipleSubmissions?: boolean;
  showResults?: boolean;
}

interface PollQuizBuilderProps {
  value: PollQuizConfig;
  onChange: (config: PollQuizConfig) => void;
}

export function PollQuizBuilder({ value, onChange }: PollQuizBuilderProps) {
  const addQuestion = () => {
    const newQuestion: PollQuizQuestion = {
      id: `q-${Date.now()}`,
      questionText: '',
      questionType: 'single_choice',
      options: [
        { id: 0, text: '', isCorrect: false },
        { id: 1, text: '', isCorrect: false },
      ],
    };

    onChange({
      ...value,
      questions: [...value.questions, newQuestion],
    });
  };

  const removeQuestion = (questionId: string) => {
    onChange({
      ...value,
      questions: value.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<PollQuizQuestion>) => {
    onChange({
      ...value,
      questions: value.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    });
  };

  const addOption = (questionId: string) => {
    const question = value.questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptionId = Math.max(...question.options.map((o) => o.id), -1) + 1;
    updateQuestion(questionId, {
      options: [...question.options, { id: newOptionId, text: '', isCorrect: false }],
    });
  };

  const removeOption = (questionId: string, optionId: number) => {
    const question = value.questions.find((q) => q.id === questionId);
    if (!question || question.options.length <= 2) return;

    updateQuestion(questionId, {
      options: question.options.filter((o) => o.id !== optionId),
    });
  };

  const updateOption = (questionId: string, optionId: number, text: string) => {
    const question = value.questions.find((q) => q.id === questionId);
    if (!question) return;

    updateQuestion(questionId, {
      options: question.options.map((o) =>
        o.id === optionId ? { ...o, text } : o
      ),
    });
  };

  const toggleCorrectAnswer = (questionId: string, optionId: number) => {
    const question = value.questions.find((q) => q.id === questionId);
    if (!question || value.type === 'poll') return;

    if (question.questionType === 'single_choice') {
      // Single choice: only one correct answer
      updateQuestion(questionId, {
        options: question.options.map((o) => ({
          ...o,
          isCorrect: o.id === optionId,
        })),
        correctAnswers: [optionId],
      });
    } else {
      // Multiple choice: toggle this option
      const updatedOptions = question.options.map((o) =>
        o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o
      );
      updateQuestion(questionId, {
        options: updatedOptions,
        correctAnswers: updatedOptions.filter((o) => o.isCorrect).map((o) => o.id),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-500" />
          <CardTitle>Poll/Quiz Builder</CardTitle>
        </div>
        <CardDescription>
          Create interactive polls or quizzes for your fans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={value.type}
            onValueChange={(type: 'poll' | 'quiz') => onChange({ ...value, type })}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="poll">
                <div className="flex flex-col items-start">
                  <span>Poll</span>
                  <span className="text-xs text-muted-foreground">
                    Any answer is valid - used for opinions/feedback
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="quiz">
                <div className="flex flex-col items-start">
                  <span>Quiz</span>
                  <span className="text-xs text-muted-foreground">
                    Has correct answers - users must pass to earn points
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Questions ({value.questions.length})</Label>
            <Button onClick={addQuestion} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {value.questions.length === 0 && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Add at least one question to get started
              </AlertDescription>
            </Alert>
          )}

          {value.questions.map((question, qIndex) => (
            <Card key={question.id} className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline">Q{qIndex + 1}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Text */}
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={question.questionText}
                    onChange={(e) =>
                      updateQuestion(question.id, { questionText: e.target.value })
                    }
                    placeholder="Enter your question here..."
                    rows={2}
                  />
                </div>

                {/* Question Type */}
                {value.type === 'quiz' && (
                  <div className="space-y-2">
                    <Label>Answer Type</Label>
                    <Select
                      value={question.questionType}
                      onValueChange={(type: typeof question.questionType) =>
                        updateQuestion(question.id, { questionType: type })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    {question.options.length < 10 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(question.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      {value.type === 'quiz' && (
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={() =>
                            toggleCorrectAnswer(question.id, option.id)
                          }
                          className="data-[state=checked]:bg-green-500"
                        />
                      )}
                      <Input
                        value={option.text}
                        onChange={(e) =>
                          updateOption(question.id, option.id, e.target.value)
                        }
                        placeholder={`Option ${option.id + 1}`}
                      />
                      {question.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(question.id, option.id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {value.type === 'quiz' && (
                    <p className="text-xs text-muted-foreground">
                      Check the box next to correct answer(s)
                    </p>
                  )}
                </div>

                {/* Explanation (Quiz only) */}
                {value.type === 'quiz' && (
                  <div className="space-y-2">
                    <Label>Explanation (Optional)</Label>
                    <Textarea
                      value={question.explanation || ''}
                      onChange={(e) =>
                        updateQuestion(question.id, { explanation: e.target.value })
                      }
                      placeholder="Explain the correct answer..."
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quiz Settings */}
        {value.type === 'quiz' && value.questions.length > 0 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Quiz Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Passing Score */}
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={value.passingScore || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      passingScore: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="70"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum score required to earn points (leave empty for no minimum)
                </p>
              </div>

              {/* Require Perfect Score */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Perfect Score (100%)</Label>
                  <p className="text-xs text-muted-foreground">
                    Users must get all answers correct
                  </p>
                </div>
                <Switch
                  checked={value.requirePerfectScore}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, requirePerfectScore: checked })
                  }
                />
              </div>

              {/* Perfect Score Bonus */}
              <div className="space-y-2">
                <Label htmlFor="perfectScoreMultiplier">Perfect Score Bonus Multiplier</Label>
                <Input
                  id="perfectScoreMultiplier"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={value.perfectScoreMultiplier || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      perfectScoreMultiplier: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="1.5"
                />
                <p className="text-xs text-muted-foreground">
                  Bonus multiplier for 100% score (e.g., 1.5x = 50% more points)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Poll Settings */}
        {value.type === 'poll' && value.questions.length > 0 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Poll Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show Results */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Results After Submission</Label>
                  <p className="text-xs text-muted-foreground">
                    Let users see aggregated poll results
                  </p>
                </div>
                <Switch
                  checked={value.showResults ?? true}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, showResults: checked })
                  }
                />
              </div>

              {/* Allow Multiple Submissions */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Users to Change Answers</Label>
                  <p className="text-xs text-muted-foreground">
                    Users can resubmit different answers
                  </p>
                </div>
                <Switch
                  checked={value.allowMultipleSubmissions ?? false}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, allowMultipleSubmissions: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
