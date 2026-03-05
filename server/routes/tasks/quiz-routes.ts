/* eslint-disable @typescript-eslint/no-explicit-any */
import { Express } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { pollQuizResponses, tasks, taskCompletions } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { pointsService } from '../../services/points/points-service';

interface PollQuizQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswers?: number[]; // For quiz questions - array of correct option indices
  allowMultiple?: boolean; // Allow multiple selections
}

interface PollQuizConfig {
  questions: PollQuizQuestion[];
  passingScore?: number; // For quizzes - percentage required to pass (0-100)
  allowRetakes?: boolean;
}

interface SubmissionAnswer {
  questionId: string;
  selectedOptions: number[]; // Array of selected option indices
}

export function registerQuizRoutes(app: Express) {
  // POST /api/tasks/:taskId/quiz/submit
  // Submit a poll/quiz response
  app.post(
    '/api/tasks/:taskId/quiz/submit',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { taskId } = req.params;
        const { answers } = req.body as { answers: SubmissionAnswer[] };
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        if (!answers || !Array.isArray(answers)) {
          return res.status(400).json({ error: 'Answers array is required' });
        }

        // 1. Validate task exists and is a poll/quiz type
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, taskId),
        });

        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (task.taskType !== 'poll' && task.taskType !== 'quiz') {
          return res.status(400).json({ error: 'Task is not a poll or quiz' });
        }

        // Get quiz/poll configuration
        const config = (task.customSettings || {}) as unknown as PollQuizConfig;
        if (!config.questions || config.questions.length === 0) {
          return res.status(400).json({ error: 'Task has no questions configured' });
        }

        // 2. Check if user has already submitted (unless task allows retakes)
        const existingResponse = await db.query.pollQuizResponses.findFirst({
          where: and(eq(pollQuizResponses.taskId, taskId), eq(pollQuizResponses.userId, userId)),
        });

        if (existingResponse && !config.allowRetakes) {
          return res
            .status(400)
            .json({ error: 'You have already submitted a response for this task' });
        }

        // 3. Validate and grade the answers
        const totalQuestions = config.questions.length;
        let correctAnswers = 0;
        let isPerfectScore = false;

        const processedResponses = answers.map((answer) => {
          const question = config.questions.find((q) => q.questionId === answer.questionId);

          if (!question) {
            throw new Error(`Question ${answer.questionId} not found`);
          }

          let isCorrect = undefined;

          // For quiz questions, check correctness
          if (task.taskType === 'quiz' && question.correctAnswers) {
            // Sort both arrays for comparison
            const selectedSorted = [...answer.selectedOptions].sort();
            const correctSorted = [...question.correctAnswers].sort();

            isCorrect =
              selectedSorted.length === correctSorted.length &&
              selectedSorted.every((val, idx) => val === correctSorted[idx]);

            if (isCorrect) {
              correctAnswers++;
            }
          }

          return {
            questionId: answer.questionId,
            questionText: question.questionText,
            selectedOptions: answer.selectedOptions,
            isCorrect,
          };
        });

        // Calculate score for quizzes
        let score = null;
        if (task.taskType === 'quiz') {
          score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
          isPerfectScore = correctAnswers === totalQuestions;
        }

        // 4. Check if task completion already exists
        const existingCompletion = await db.query.taskCompletions.findFirst({
          where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.userId, userId)),
        });

        let taskCompletionId: string;

        if (existingCompletion) {
          // If retaking, use existing completion
          taskCompletionId = existingCompletion.id;
        } else {
          // Create new task completion (initially pending for quiz)
          const [newCompletion] = await db
            .insert(taskCompletions)
            .values({
              taskId,
              userId,
              tenantId: task.tenantId ?? '',
              status: task.taskType === 'quiz' ? 'pending' : 'completed',
              startedAt: new Date(),
              completedAt: task.taskType === 'poll' ? new Date() : null,
              verificationMethod: 'self_reported',
              completionData: {
                submissionType: task.taskType,
              } as Record<string, unknown>,
            })
            .returning();

          taskCompletionId = newCompletion.id;
        }

        // 5. Save response to pollQuizResponses
        if (existingResponse) {
          // Update existing response (for retakes)
          await db
            .update(pollQuizResponses)
            .set({
              responses: processedResponses as any,
              score: score?.toFixed(2),
              totalQuestions,
              correctAnswers,
              isPerfectScore,
              submittedAt: new Date(),
            })
            .where(eq(pollQuizResponses.id, existingResponse.id));
        } else {
          // Create new response
          await db.insert(pollQuizResponses).values({
            userId,
            taskId,
            taskCompletionId,
            tenantId: task.tenantId ?? '',
            responses: processedResponses as any,
            score: score?.toFixed(2),
            totalQuestions,
            correctAnswers,
            isPerfectScore,
          });
        }

        // 6. For quiz: check if passed. For poll: always mark as completed
        const passed =
          task.taskType === 'poll' || (score !== null && score >= (config.passingScore || 70));

        if (passed) {
          // Update task completion to completed
          await db
            .update(taskCompletions)
            .set({
              status: 'completed',
              completedAt: new Date(),
              verifiedAt: new Date(),
            })
            .where(eq(taskCompletions.id, taskCompletionId));

          // 7. Award points
          const points = task.pointsToReward ?? 0;
          if (points > 0 && task.tenantId && task.creatorId) {
            await pointsService.creator.awardPoints(
              userId,
              task.creatorId,
              task.tenantId,
              points,
              'task_completion',
              `Completed ${task.taskType}: ${task.name}`,
              {
                taskId: task.id,
                taskCompletionId,
                taskType: task.taskType,
              }
            );
          }

          res.json({
            success: true,
            passed: true,
            score,
            correctAnswers,
            totalQuestions,
            pointsAwarded: points,
            message:
              task.taskType === 'quiz'
                ? 'Quiz completed successfully!'
                : 'Poll response submitted!',
          });
        } else {
          res.json({
            success: true,
            passed: false,
            score,
            correctAnswers,
            totalQuestions,
            requiredScore: config.passingScore || 70,
            message: 'Quiz not passed. Try again!',
            canRetake: config.allowRetakes,
          });
        }
      } catch (error: any) {
        console.error('Error submitting poll/quiz:', error);
        res.status(500).json({ error: error.message || 'Failed to submit response' });
      }
    }
  );

  // GET /api/tasks/:taskId/quiz/results
  // Get aggregated results for a poll/quiz (creator only)
  app.get(
    '/api/tasks/:taskId/quiz/results',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Verify task exists
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, taskId),
        });

        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // 2. Verify user is the task creator
        if (task.creatorId !== userId) {
          return res.status(403).json({ error: 'Only the task creator can view results' });
        }

        // 3. Get all responses
        const responses = await db.query.pollQuizResponses.findMany({
          where: eq(pollQuizResponses.taskId, taskId),
        });

        if (responses.length === 0) {
          return res.json({
            taskId,
            taskType: task.taskType,
            totalResponses: 0,
            results: [],
          });
        }

        // 4. Aggregate results
        if (task.taskType === 'poll') {
          // For polls: count votes per option for each question
          const config = (task.customSettings || {}) as unknown as PollQuizConfig;
          const questionResults = config.questions.map((question) => {
            const optionCounts = new Array(question.options.length).fill(0);

            responses.forEach((response) => {
              const answer = response.responses?.find(
                (r: any) => r.questionId === question.questionId
              );
              if (answer && answer.selectedOptions) {
                answer.selectedOptions.forEach((optionIdx: number) => {
                  if (optionIdx >= 0 && optionIdx < optionCounts.length) {
                    optionCounts[optionIdx]++;
                  }
                });
              }
            });

            return {
              questionId: question.questionId,
              questionText: question.questionText,
              options: question.options.map((option, idx) => ({
                text: option,
                votes: optionCounts[idx],
                percentage:
                  responses.length > 0
                    ? ((optionCounts[idx] / responses.length) * 100).toFixed(1)
                    : '0',
              })),
            };
          });

          res.json({
            taskId,
            taskType: 'poll',
            totalResponses: responses.length,
            results: questionResults,
          });
        } else {
          // For quizzes: average score, pass rate
          const scores = responses.map((r) => parseFloat(r.score ?? '0'));
          const averageScore =
            scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

          const passingScore =
            (task.customSettings as unknown as PollQuizConfig)?.passingScore || 70;
          const passedCount = scores.filter((s) => s >= passingScore).length;
          const passRate = responses.length > 0 ? (passedCount / responses.length) * 100 : 0;

          const perfectScores = responses.filter((r) => r.isPerfectScore).length;

          res.json({
            taskId,
            taskType: 'quiz',
            totalResponses: responses.length,
            averageScore: averageScore.toFixed(2),
            passRate: passRate.toFixed(1),
            passedCount,
            perfectScores,
            passingScore,
          });
        }
      } catch (error: any) {
        console.error('Error fetching poll/quiz results:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch results' });
      }
    }
  );

  // GET /api/tasks/:taskId/quiz/my-response
  // Get user's own response
  app.get(
    '/api/tasks/:taskId/quiz/my-response',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const response = await db.query.pollQuizResponses.findFirst({
          where: and(eq(pollQuizResponses.taskId, taskId), eq(pollQuizResponses.userId, userId)),
        });

        if (!response) {
          return res.status(404).json({ error: 'No response found' });
        }

        res.json({
          id: response.id,
          taskId: response.taskId,
          responses: response.responses,
          score: response.score,
          totalQuestions: response.totalQuestions,
          correctAnswers: response.correctAnswers,
          isPerfectScore: response.isPerfectScore,
          createdAt: response.createdAt,
          submittedAt: response.submittedAt,
        });
      } catch (error: any) {
        console.error('Error fetching user response:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch response' });
      }
    }
  );

  console.log('✅ Quiz/Poll routes registered');
}
