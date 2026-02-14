/**
 * Poll/Quiz Verification Service
 *
 * Auto-verified task type for interactive polls and quizzes.
 *
 * Features:
 * - Validate poll responses (any answer is valid)
 * - Calculate quiz scores (correct answers / total questions)
 * - Apply perfect score multipliers
 * - Store responses in pollQuizResponses table
 * - Auto-verify on submission (immediate points)
 */

import { db } from '../../db';
import { pollQuizResponses, taskCompletions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface PollQuizQuestion {
  id: string;
  questionText: string;
  questionType: 'single_choice' | 'multiple_choice' | 'true_false';
  options: Array<{
    id: number;
    text: string;
    isCorrect?: boolean; // Only for quizzes
  }>;
  correctAnswers?: number[]; // For quizzes - array of correct option IDs
  explanation?: string; // Optional explanation shown after answer
}

export interface PollQuizTaskSettings {
  type: 'poll' | 'quiz';
  questions: PollQuizQuestion[];

  // Quiz-specific settings
  passingScore?: number; // Percentage required to pass (e.g., 70)
  requirePerfectScore?: boolean; // Must get 100% to earn points
  perfectScoreMultiplier?: number; // Bonus multiplier for 100% (e.g., 1.5x)

  // Poll-specific settings
  allowMultipleSubmissions?: boolean; // Can users change their answers?
  showResults?: boolean; // Show aggregated results after submission
}

export interface UserResponse {
  questionId: string;
  questionText: string;
  selectedOptions: number[]; // Array of selected option IDs
}

export interface SubmitResponsesRequest {
  userId: string;
  taskId: string;
  taskCompletionId: number;
  tenantId: string;
  taskSettings: PollQuizTaskSettings;
  responses: UserResponse[];
}

export interface PollQuizVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: {
    score?: number; // Percentage 0-100
    totalQuestions?: number;
    correctAnswers?: number;
    isPerfectScore?: boolean;
    appliedMultiplier?: number;
    failedQuiz?: boolean;
    passingScore?: number;
  };
}

export class PollQuizVerificationService {
  /**
   * Submit poll/quiz responses and calculate score
   */
  async submitResponses(request: SubmitResponsesRequest): Promise<{
    score?: number;
    totalQuestions: number;
    correctAnswers?: number;
    isPerfectScore: boolean;
    responseId: string;
  }> {
    const { userId, taskId, taskCompletionId, tenantId, taskSettings, responses } = request;

    // Validate all questions were answered
    if (responses.length !== taskSettings.questions.length) {
      throw new Error(
        `All questions must be answered (answered: ${responses.length}, total: ${taskSettings.questions.length})`
      );
    }

    // Calculate score for quizzes
    let correctAnswers = 0;
    let score: number | undefined;
    const scoredResponses = responses.map(response => {
      const question = taskSettings.questions.find(q => q.id === response.questionId);
      if (!question) {
        throw new Error(`Question not found: ${response.questionId}`);
      }

      let isCorrect = false;

      // For quizzes, check if answer is correct
      if (taskSettings.type === 'quiz' && question.correctAnswers) {
        // Compare arrays (order doesn't matter for multiple choice)
        const selectedSorted = [...response.selectedOptions].sort((a, b) => a - b);
        const correctSorted = [...question.correctAnswers].sort((a, b) => a - b);

        isCorrect =
          selectedSorted.length === correctSorted.length &&
          selectedSorted.every((val, idx) => val === correctSorted[idx]);

        if (isCorrect) {
          correctAnswers++;
        }
      }

      return {
        ...response,
        isCorrect: taskSettings.type === 'quiz' ? isCorrect : undefined,
      };
    });

    // Calculate percentage score for quizzes
    if (taskSettings.type === 'quiz') {
      score = (correctAnswers / taskSettings.questions.length) * 100;
    }

    const isPerfectScore = taskSettings.type === 'quiz' && score === 100;

    // Store responses in database
    const [responseRecord] = await db
      .insert(pollQuizResponses)
      .values({
        userId,
        taskId,
        taskCompletionId: taskCompletionId.toString(),
        tenantId,
        responses: scoredResponses,
        score: score?.toString(),
        totalQuestions: taskSettings.questions.length,
        correctAnswers: taskSettings.type === 'quiz' ? correctAnswers : null,
        isPerfectScore,
        createdAt: new Date(),
        submittedAt: new Date(),
      })
      .returning();

    return {
      score,
      totalQuestions: taskSettings.questions.length,
      correctAnswers: taskSettings.type === 'quiz' ? correctAnswers : undefined,
      isPerfectScore,
      responseId: responseRecord.id,
    };
  }

  /**
   * Main verification method
   *
   * Called by unified-verification.ts to verify poll/quiz completion
   */
  async verify(params: {
    userId: string;
    taskType: string;
    taskSettings: PollQuizTaskSettings;
    responses: UserResponse[];
  }): Promise<PollQuizVerificationResult> {
    const { taskSettings, responses } = params;

    // Validate responses exist
    if (!responses || responses.length === 0) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No responses provided',
      };
    }

    // Validate all questions answered
    if (responses.length !== taskSettings.questions.length) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: `All questions must be answered (${responses.length}/${taskSettings.questions.length})`,
      };
    }

    // Calculate score (if quiz)
    let correctAnswers = 0;
    let score: number | undefined;

    if (taskSettings.type === 'quiz') {
      responses.forEach(response => {
        const question = taskSettings.questions.find(q => q.id === response.questionId);
        if (question && question.correctAnswers) {
          const selectedSorted = [...response.selectedOptions].sort((a, b) => a - b);
          const correctSorted = [...question.correctAnswers].sort((a, b) => a - b);

          const isCorrect =
            selectedSorted.length === correctSorted.length &&
            selectedSorted.every((val, idx) => val === correctSorted[idx]);

          if (isCorrect) {
            correctAnswers++;
          }
        }
      });

      score = (correctAnswers / taskSettings.questions.length) * 100;
    }

    const isPerfectScore = taskSettings.type === 'quiz' && score === 100;

    // Check passing requirements for quizzes
    if (taskSettings.type === 'quiz') {
      // Require perfect score if configured
      if (taskSettings.requirePerfectScore && !isPerfectScore) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'high',
          reason: `Perfect score required (scored: ${score?.toFixed(0)}%)`,
          metadata: {
            score,
            totalQuestions: taskSettings.questions.length,
            correctAnswers,
            isPerfectScore: false,
            failedQuiz: true,
            passingScore: 100,
          },
        };
      }

      // Check passing score if configured
      if (taskSettings.passingScore && score! < taskSettings.passingScore) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'high',
          reason: `Passing score not met (required: ${taskSettings.passingScore}%, scored: ${score?.toFixed(0)}%)`,
          metadata: {
            score,
            totalQuestions: taskSettings.questions.length,
            correctAnswers,
            isPerfectScore: false,
            failedQuiz: true,
            passingScore: taskSettings.passingScore,
          },
        };
      }
    }

    // Auto-verify! (Polls always verify, quizzes verify if passing score met)
    return {
      verified: true,
      requiresManualReview: false,
      confidence: 'high',
      metadata: {
        score,
        totalQuestions: taskSettings.questions.length,
        correctAnswers: taskSettings.type === 'quiz' ? correctAnswers : undefined,
        isPerfectScore,
        appliedMultiplier: isPerfectScore ? taskSettings.perfectScoreMultiplier : undefined,
      },
    };
  }

  /**
   * Get aggregated poll results (for showing to users)
   */
  async getPollResults(taskId: string): Promise<{
    totalResponses: number;
    questionResults: Array<{
      questionId: string;
      questionText: string;
      optionCounts: Array<{
        optionId: number;
        optionText: string;
        count: number;
        percentage: number;
      }>;
    }>;
  }> {
    const responses = await db.query.pollQuizResponses.findMany({
      where: eq(pollQuizResponses.taskId, taskId),
    });

    const totalResponses = responses.length;

    // Get task settings to know question structure
    // This would need to be passed in or queried from tasks table
    // For now, we'll aggregate based on stored responses

    const questionResults: any[] = [];

    // Group responses by question
    const questionMap = new Map<string, Map<number, number>>();

    responses.forEach(response => {
      const userResponses = response.responses as any[];

      userResponses.forEach(ur => {
        if (!questionMap.has(ur.questionId)) {
          questionMap.set(ur.questionId, new Map());
        }

        const optionCounts = questionMap.get(ur.questionId)!;

        ur.selectedOptions.forEach((optionId: number) => {
          optionCounts.set(optionId, (optionCounts.get(optionId) || 0) + 1);
        });
      });
    });

    // Convert to result format
    questionMap.forEach((optionCounts, questionId) => {
      const optionResults: any[] = [];

      optionCounts.forEach((count, optionId) => {
        optionResults.push({
          optionId,
          count,
          percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
        });
      });

      questionResults.push({
        questionId,
        optionCounts: optionResults,
      });
    });

    return {
      totalResponses,
      questionResults,
    };
  }

  /**
   * Get user's quiz/poll history
   */
  async getUserResponseHistory(userId: string, taskId: string): Promise<Array<{
    id: string;
    submittedAt: Date;
    score?: number;
    correctAnswers?: number;
    totalQuestions: number;
    isPerfectScore: boolean;
  }>> {
    const responses = await db.query.pollQuizResponses.findMany({
      where: and(
        eq(pollQuizResponses.userId, userId),
        eq(pollQuizResponses.taskId, taskId)
      ),
    });

    return responses.map(r => ({
      id: r.id,
      submittedAt: (r.submittedAt ?? r.createdAt) ?? new Date(),
      score: r.score ? parseFloat(r.score) : undefined,
      correctAnswers: r.correctAnswers || undefined,
      totalQuestions: r.totalQuestions || 0,
      isPerfectScore: r.isPerfectScore ?? false,
    }));
  }

  /**
   * Check if user has already submitted (for single-submission polls)
   */
  async hasUserSubmitted(userId: string, taskId: string): Promise<boolean> {
    const existing = await db.query.pollQuizResponses.findFirst({
      where: and(
        eq(pollQuizResponses.userId, userId),
        eq(pollQuizResponses.taskId, taskId)
      ),
    });

    return !!existing;
  }
}

// Export singleton instance
export const pollQuizVerification = new PollQuizVerificationService();
