/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Express, Response } from 'express';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { taskCompletions, manualReviewQueue, creators, socialConnections } from '@shared/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { uploadScreenshot, getFileUrl } from '../../middleware/upload';
import { unifiedVerification } from '../../services/verification/unified-verification';
import { taskFrequencyService } from '../../services/task-frequency-service';

export function registerTaskExecutionRoutes(app: Express) {
  // ============================================================================
  // TASK COMPLETION & VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * Complete a task (submit for verification)
   * POST /api/tasks/:taskId/complete
   *
   * Accepts proof data from frontend modals:
   * - proofUrl: Link to social media post/profile
   * - screenshot: Image file upload (multipart/form-data)
   * - proofNotes: Additional text notes
   * - platform: Social platform name
   * - taskType: Specific task type
   * - targetData: Task settings for verification
   */
  app.post(
    '/api/tasks/:taskId/complete',
    authenticateUser,
    uploadScreenshot.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Get uploaded screenshot if present
        const screenshotFile = req.file;
        const screenshotUrl = screenshotFile
          ? getFileUrl(screenshotFile.filename, 'screenshot')
          : undefined;

        // Parse form data
        const { platform, taskType, proofUrl, proofNotes, targetData } = req.body;

        // Parse targetData if it's a JSON string
        const taskSettings = typeof targetData === 'string' ? JSON.parse(targetData) : targetData;

        // Get task details
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Check reward frequency eligibility (Sprint 1 feature)
        const frequencyCheck = await taskFrequencyService.checkEligibility({
          userId,
          taskId,
          tenantId: task.tenantId ?? '',
        });

        if (!frequencyCheck.isEligible) {
          // Calculate time until available
          const timeUntil = await taskFrequencyService.getTimeUntilAvailable({
            userId,
            taskId,
            tenantId: task.tenantId ?? '',
          });

          let availabilityMessage = frequencyCheck.reason || 'Task not available';
          if (timeUntil) {
            if (timeUntil.hours > 24) {
              const days = Math.floor(timeUntil.hours / 24);
              availabilityMessage += `. Available again in ${days} day${days > 1 ? 's' : ''}`;
            } else if (timeUntil.hours > 0) {
              availabilityMessage += `. Available again in ${timeUntil.hours} hour${timeUntil.hours > 1 ? 's' : ''}`;
            } else if (timeUntil.minutes > 0) {
              availabilityMessage += `. Available again in ${timeUntil.minutes} minute${timeUntil.minutes > 1 ? 's' : ''}`;
            }
          }

          return res.status(403).json({
            error: 'Task not available',
            message: availabilityMessage,
            nextAvailableAt: frequencyCheck.nextAvailableAt,
            reason: frequencyCheck.reason,
          });
        }

        // Verify unified verification service
        const result = await unifiedVerification.verify({
          userId,
          taskId: taskId,
          tenantId: task.tenantId ?? '',
          creatorId: task.creatorId ?? '',
          platform: platform || task.platform || 'unknown',
          taskType: taskType || task.taskType,
          taskName: task.name,
          taskSettings: taskSettings || task.customSettings || {},
          proofUrl,
          screenshotUrl,
          proofNotes,
        });

        res.json(result);
      } catch (error: any) {
        console.error('Task completion error:', error);
        res.status(500).json({
          error: 'Failed to complete task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Verify an existing task completion
   * POST /api/task-completions/:completionId/verify
   *
   * For tasks that were started but need verification
   * (e.g., user clicked "Start Task" earlier, now submitting proof)
   */
  app.post(
    '/api/task-completions/:completionId/verify',
    authenticateUser,
    uploadScreenshot.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { completionId } = req.params;
        const userId = req.user!.id;

        // Get uploaded screenshot if present
        const screenshotFile = req.file;
        const screenshotUrl = screenshotFile
          ? getFileUrl(screenshotFile.filename, 'screenshot')
          : undefined;

        // Parse form data
        const { platform, taskType, proofUrl, proofNotes, targetData } = req.body;

        // Parse targetData if it's a JSON string
        const taskSettings = typeof targetData === 'string' ? JSON.parse(targetData) : targetData;

        // Get task completion
        const completion = await db.query.taskCompletions.findFirst({
          where: eq(taskCompletions.id, completionId),
          with: {
            task: true,
          },
        });

        if (!completion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Verify user owns this completion
        if (completion.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        const task = completion.task;

        // Run verification
        const result = await unifiedVerification.verify({
          userId,
          taskCompletionId: completionId,
          taskId: task.id,
          tenantId: task.tenantId ?? '',
          creatorId: task.creatorId ?? '',
          platform: platform || task.platform || 'unknown',
          taskType: taskType || task.taskType,
          taskName: task.name,
          taskSettings: taskSettings || task.customSettings || {},
          proofUrl,
          screenshotUrl,
          proofNotes,
        });

        res.json(result);
      } catch (error: any) {
        console.error('Task verification error:', error);
        res.status(500).json({
          error: 'Failed to verify task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get user's task completions
   * GET /api/task-completions/me
   */
  app.get(
    '/api/task-completions/me',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { status, tenantId } = req.query;

        // Build WHERE conditions
        const conditions = [eq(taskCompletions.userId, userId)];

        if (status) {
          conditions.push(eq(taskCompletions.status, status as string));
        }

        if (tenantId) {
          conditions.push(eq(taskCompletions.tenantId, tenantId as string));
        }

        // Use single condition or AND based on array length
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

        const completions = await db.select().from(taskCompletions).where(whereClause);

        res.json(completions);
      } catch (error: any) {
        console.error('Error fetching task completions:', error);
        res.status(500).json({
          error: 'Failed to fetch task completions',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get manual review queue for creator
   * GET /api/manual-review/queue
   */
  app.get(
    '/api/manual-review/queue',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { status = 'pending', limit = 50 } = req.query;

        // Get creator record
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });

        if (!creator) {
          return res.status(403).json({ error: 'Only creators can access review queue' });
        }

        // Get pending reviews for this creator
        const reviews = await db
          .select()
          .from(manualReviewQueue)
          .where(
            and(
              eq(manualReviewQueue.creatorId, creator.id),
              eq(manualReviewQueue.status, status as string),
              isNull(manualReviewQueue.deletedAt)
            )
          )
          .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.submittedAt))
          .limit(Number(limit));

        res.json(reviews);
      } catch (error: any) {
        console.error('Error fetching review queue:', error);
        res.status(500).json({
          error: 'Failed to fetch review queue',
          message: error.message,
        });
      }
    }
  );

  /**
   * Approve manual review
   * POST /api/manual-review/:reviewId/approve
   */
  app.post(
    '/api/manual-review/:reviewId/approve',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { reviewId } = req.params;
        const { reviewNotes } = req.body;
        const userId = req.user!.id;

        // Verify user is creator who owns this review
        const review = await db.query.manualReviewQueue.findFirst({
          where: eq(manualReviewQueue.id, reviewId),
        });

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        const creatorForApprove = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });
        if (!creatorForApprove || String(creatorForApprove.id) !== String(review.creatorId)) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        await unifiedVerification.approveManualReview(reviewId, userId, reviewNotes);

        res.json({ success: true, message: 'Task approved' });
      } catch (error: any) {
        console.error('Error approving review:', error);
        res.status(500).json({
          error: 'Failed to approve review',
          message: error.message,
        });
      }
    }
  );

  /**
   * Reject manual review
   * POST /api/manual-review/:reviewId/reject
   */
  app.post(
    '/api/manual-review/:reviewId/reject',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { reviewId } = req.params;
        const { reviewNotes } = req.body;
        const userId = req.user!.id;

        if (!reviewNotes) {
          return res.status(400).json({ error: 'Review notes required for rejection' });
        }

        // Verify user is creator who owns this review
        const review = await db.query.manualReviewQueue.findFirst({
          where: eq(manualReviewQueue.id, reviewId),
        });

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        const creatorForReject = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });
        if (!creatorForReject || String(creatorForReject.id) !== String(review.creatorId)) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        await unifiedVerification.rejectManualReview(reviewId, userId, reviewNotes);

        res.json({ success: true, message: 'Task rejected' });
      } catch (error: any) {
        console.error('Error rejecting review:', error);
        res.status(500).json({
          error: 'Failed to reject review',
          message: error.message,
        });
      }
    }
  );

  // ============================================================================
  // CODE VERIFICATION ENDPOINTS (T2)
  // ============================================================================

  /**
   * Get or generate verification code for a task
   * GET /api/tasks/:taskId/verification-code
   *
   * Returns the fan's unique code for code-based (T2) verification
   */
  app.get(
    '/api/tasks/:taskId/verification-code',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Import code service
        const { codeService } = await import('../../services/verification/code-service');

        // Get the task to get tenant info
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Get or create code
        const result = await codeService.getOrCreateCode({
          taskId,
          fanId: userId,
          tenantId: task.tenantId ?? '',
          codeType: 'comment',
        });

        if (!result.success || !result.code) {
          return res.status(500).json({ error: result.error || 'Failed to generate code' });
        }

        const codeRecord = await codeService.getCodeForFan(taskId, userId);
        res.json({
          code: result.code,
          expiresAt: codeRecord?.expiresAt ?? null,
          isUsed: codeRecord?.isUsed ?? false,
        });
      } catch (error: any) {
        console.error('Error getting verification code:', error);
        res.status(500).json({
          error: 'Failed to get verification code',
          message: error.message,
        });
      }
    }
  );

  /**
   * Check if a verification code has been found
   * POST /api/tasks/:taskId/verify-code
   *
   * Called when fan clicks "I posted my code" - triggers immediate check
   */
  app.post(
    '/api/tasks/:taskId/verify-code',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Get task details
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Import services
        const { codeService } = await import('../../services/verification/code-service');
        const { commentFetcher } = await import('../../services/verification/comment-fetcher');

        // Get the fan's code
        const codeRecord = await codeService.getCodeForFan(taskId, userId);
        if (!codeRecord) {
          return res.status(400).json({ error: 'No verification code found' });
        }

        if (codeRecord.isUsed) {
          return res.json({
            verified: true,
            message: 'Code already verified!',
          });
        }

        // Get task settings (customSettings in schema)
        const settings = (task.customSettings || task) as Record<string, unknown>;
        const rawContentId = settings?.contentId || settings?.postId || settings?.videoId;
        const contentId =
          typeof rawContentId === 'string' ? rawContentId : String(rawContentId ?? '');

        if (!contentId) {
          return res.status(400).json({
            error: 'Task not properly configured for code verification',
          });
        }

        // Get creator's access token for the platform
        const creatorConnection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, task.creatorId!),
            eq(socialConnections.platform, task.platform),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!creatorConnection?.accessToken) {
          return res.json({
            verified: false,
            message: 'Creator has not connected their account. Code verification may take longer.',
            pendingCheck: true,
          });
        }

        // Try to verify code in comments
        const result = await commentFetcher.verifyCodeInComments({
          platform: task.platform,
          contentId,
          taskId,
          fanId: userId,
          creatorAccessToken: creatorConnection.accessToken,
        });

        if (result.verified) {
          // Complete the task
          const verificationResult = await unifiedVerification.verify({
            userId,
            taskId,
            tenantId: task.tenantId ?? '',
            creatorId: task.creatorId!,
            platform: task.platform,
            taskType: task.taskType,
            taskName: task.name,
            taskSettings: settings,
          });

          return res.json({
            verified: true,
            message: 'Code found! Task verified.',
            pointsAwarded: verificationResult.pointsAwarded,
          });
        }

        // Code not found yet
        res.json({
          verified: false,
          message:
            result.reason ||
            'Code not found yet. Please make sure you included your code in your comment.',
          code: codeRecord.code,
        });
      } catch (error: any) {
        console.error('Error verifying code:', error);
        res.status(500).json({
          error: 'Failed to verify code',
          message: error.message,
        });
      }
    }
  );
}
