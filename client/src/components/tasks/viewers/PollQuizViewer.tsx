/**
 * Poll/Quiz Viewer Component
 *
 * Displays poll/quiz questions to fans and handles their responses
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Sparkles,
} from "lucide-react";
import type { PollQuizConfig, PollQuizQuestion } from "@/components/tasks/config/PollQuizBuilder";

interface PollQuizViewerProps {
  config: PollQuizConfig;
  onSubmit: (answers: Record<string, number[]>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export default function PollQuizViewer({
  config,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PollQuizViewerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = config.questions[currentQuestionIndex];
  const totalQuestions = config.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Handle single choice answer
  const handleSingleChoiceChange = (questionId: string, optionId: number) => {
    setAnswers({
      ...answers,
      [questionId]: [optionId],
    });
  };

  // Handle multiple choice answer
  const handleMultipleChoiceToggle = (questionId: string, optionId: number) => {
    const currentAnswers = answers[questionId] || [];
    const newAnswers = currentAnswers.includes(optionId)
      ? currentAnswers.filter(id => id !== optionId)
      : [...currentAnswers, optionId];

    setAnswers({
      ...answers,
      [questionId]: newAnswers,
    });
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    const questionAnswers = answers[currentQuestion.id];
    return questionAnswers && questionAnswers.length > 0;
  };

  // Navigate to next question
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Check if all questions are answered
  const areAllQuestionsAnswered = () => {
    return config.questions.every(q => {
      const questionAnswers = answers[q.id];
      return questionAnswers && questionAnswers.length > 0;
    });
  };

  // Handle submission
  const handleSubmit = () => {
    if (areAllQuestionsAnswered()) {
      onSubmit(answers);
    }
  };

  // Calculate quiz score
  const calculateScore = (): { score: number; percentage: number; passed: boolean } => {
    if (config.type !== 'quiz') {
      return { score: 0, percentage: 0, passed: true };
    }

    let correctCount = 0;
    config.questions.forEach(q => {
      const userAnswers = answers[q.id] || [];
      const correctAnswers = q.correctAnswers || [];

      // Check if answers match exactly
      if (
        userAnswers.length === correctAnswers.length &&
        userAnswers.every(a => correctAnswers.includes(a))
      ) {
        correctCount++;
      }
    });

    const percentage = (correctCount / totalQuestions) * 100;
    const passingScore = config.passingScore || 0;
    const requirePerfect = config.requirePerfectScore || false;

    return {
      score: correctCount,
      percentage,
      passed: requirePerfect ? percentage === 100 : percentage >= passingScore,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">
              {config.type === 'poll' ? 'Fan Poll' : 'Trivia Quiz'}
            </h2>
          </div>
          <Badge variant="outline" className="text-purple-400 border-purple-400">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {currentQuestion.questionText}
          </CardTitle>
          {config.type === 'quiz' && (
            <p className="text-sm text-gray-400 mt-2">
              {currentQuestion.questionType === 'single_choice' && 'Select one answer'}
              {currentQuestion.questionType === 'multiple_choice' && 'Select all that apply'}
              {currentQuestion.questionType === 'true_false' && 'True or False?'}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Single Choice / True-False */}
          {(currentQuestion.questionType === 'single_choice' || currentQuestion.questionType === 'true_false') && (
            <RadioGroup
              value={answers[currentQuestion.id]?.[0]?.toString()}
              onValueChange={(value) => handleSingleChoiceChange(currentQuestion.id, parseInt(value))}
            >
              {currentQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                  <Label
                    htmlFor={`option-${option.id}`}
                    className="flex-1 cursor-pointer text-white"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Multiple Choice */}
          {currentQuestion.questionType === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Checkbox
                    id={`option-${option.id}`}
                    checked={answers[currentQuestion.id]?.includes(option.id)}
                    onCheckedChange={() => handleMultipleChoiceToggle(currentQuestion.id, option.id)}
                  />
                  <Label
                    htmlFor={`option-${option.id}`}
                    className="flex-1 cursor-pointer text-white"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Answer indicator */}
          {!isCurrentQuestionAnswered() && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <Info className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                Please select an answer to continue
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quiz Settings Info */}
      {config.type === 'quiz' && currentQuestionIndex === 0 && (
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400">
            {config.requirePerfectScore ? (
              <p><strong>Perfect score required:</strong> You must answer all questions correctly.</p>
            ) : config.passingScore ? (
              <p><strong>Passing score:</strong> You need {config.passingScore}% to pass.</p>
            ) : (
              <p>Answer the questions to earn points!</p>
            )}
            {config.perfectScoreMultiplier && config.perfectScoreMultiplier > 1 && (
              <p className="mt-1">
                <Trophy className="h-3 w-3 inline mr-1" />
                Get 100% for a <strong>{config.perfectScoreMultiplier}x</strong> bonus!
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="border-white/10"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex-1" />

        {currentQuestionIndex < totalQuestions - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!isCurrentQuestionAnswered()}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!areAllQuestionsAnswered() || isSubmitting}
            className="bg-green-500 hover:bg-green-600"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </Button>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-gray-400 hover:text-white"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
