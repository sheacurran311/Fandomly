/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Manual Review Routes
 *
 * API endpoints for creators to manage T3 manual task verification.
 * Handles the review queue, approvals, and rejections.
 */

import { Express, Response } from 'express';
import { db } from '../../db';
import {
  manualReviewQueue,
  taskCompletions,
  tasks,
  users,
  creators,
  fanPlatformHandles,
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { unifiedVerification } from '../../services/verification/unified-verification';

// Request schemas
const approveReviewSchema = z.object({
  reviewNotes: z.string().optional(),
});

const rejectReviewSchema = z.object({
  reviewNotes: z.string().min(1, 'Rejection reason is required'),
});

const bulkActionSchema = z.object({
  reviewIds: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
});

export function registerReviewRoutes(app: Express) {
  /**
   * Get review queue for a creator
   * GET /api/creators/:creatorId/review-queue
   *
   * Returns pending manual review items with fan details and platform handles
   */
  app.get(
    '/api/creators/:creatorId/review-queue',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { creatorId } = req.params;
        const userId = req.user!.id;

        // Verify user owns this creator profile
        const creator = await db.query.creators.findFirst({
          where: eq(creators.id, creatorId),
        });

        if (!creator || creator.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get pending reviews (creatorId in manual_review_queue is integer; compare via cast)
        const reviews = await db.query.manualReviewQueue.findMany({
          where: and(
            sql`${manualReviewQueue.creatorId}::text = ${creatorId}`,
            eq(manualReviewQueue.status, 'pending')
          ),
          orderBy: [desc(manualReviewQueue.createdAt)],
          with: {
            task: true,
            taskCompletion: true,
          },
        });

        // Enrich with fan data and platform handles
        const enrichedReviews = await Promise.all(
          reviews.map(async (review) => {
            // Get fan user data
            const fan = await db.query.users.findFirst({
              where: eq(users.id, String(review.fanId)),
            });

            // Get fan's platform handle for this platform (fanId is int in legacy schema)
            const platformHandle = await db.query.fanPlatformHandles.findFirst({
              where: and(
                eq(fanPlatformHandles.userId, String(review.fanId)),
                eq(fanPlatformHandles.platform, review.platform as any)
              ),
            });

            return {
              id: review.id,
              taskId: review.taskId,
              taskName: review.taskName,
              taskType: review.taskType,
              platform: review.platform,
              status: review.status,
              priority: review.priority,
              createdAt: review.createdAt,

              // Fan info
              fanId: review.fanId,
              fanUsername: fan?.username,
              fanDisplayName: fan?.profileData?.name ?? fan?.username,
              fanEmail: fan?.email,

              // Platform handle
              platformHandle: platformHandle?.handle,
              platformHandleNormalized: platformHandle?.normalizedHandle,
              handleFormatValid: platformHandle?.formatValid,
              handleManuallyVerified: platformHandle?.manuallyVerified,

              // Proof data
              proofUrl: review.proofUrl,
              proofNotes: review.proofNotes,
              screenshotUrl: review.screenshotUrl,

              // Auto-check result
              autoCheckResult: review.autoCheckResult,
            };
          })
        );

        res.json(enrichedReviews);
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
   * Get review queue statistics
   * GET /api/creators/:creatorId/review-queue/stats
   */
  app.get(
    '/api/creators/:creatorId/review-queue/stats',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { creatorId } = req.params;
        const userId = req.user!.id;

        // Verify user owns this creator profile
        const creator = await db.query.creators.findFirst({
          where: eq(creators.id, creatorId),
        });

        if (!creator || creator.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get counts by status
        const stats = await db
          .select({
            status: manualReviewQueue.status,
            count: sql<number>`count(*)::int`,
          })
          .from(manualReviewQueue)
          .where(sql`${manualReviewQueue.creatorId}::text = ${creatorId}`)
          .groupBy(manualReviewQueue.status);

        // Get counts by platform
        const platformStats = await db
          .select({
            platform: manualReviewQueue.platform,
            count: sql<number>`count(*)::int`,
          })
          .from(manualReviewQueue)
          .where(
            and(
              sql`${manualReviewQueue.creatorId}::text = ${creatorId}`,
              eq(manualReviewQueue.status, 'pending')
            )
          )
          .groupBy(manualReviewQueue.platform);

        const statusCounts: Record<string, number> = {
          pending: 0,
          approved: 0,
          rejected: 0,
        };

        for (const s of stats) {
          statusCounts[s.status] = s.count;
        }

        res.json({
          total: stats.reduce((sum, s) => sum + s.count, 0),
          ...statusCounts,
          byPlatform: platformStats.reduce(
            (acc, p) => {
              acc[p.platform] = p.count;
              return acc;
            },
            {} as Record<string, number>
          ),
        });
      } catch (error: any) {
        console.error('Error fetching review stats:', error);
        res.status(500).json({
          error: 'Failed to fetch review stats',
          message: error.message,
        });
      }
    }
  );

  /**
   * Approve a task completion
   * POST /api/task-completions/:completionId/approve
   */
  app.post(
    '/api/task-completions/:completionId/approve',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { completionId } = req.params;
        const userId = req.user!.id;
        const validatedData = approveReviewSchema.parse(req.body);

        // Get the completion to verify ownership
        const completion = await db.query.taskCompletions.findFirst({
          where: eq(taskCompletions.id, completionId),
          with: {
            task: {
              with: {
                creator: true,
              },
            },
          },
        });

        if (!completion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Verify user is the creator
        if (completion.task.creator?.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Find associated review queue item (taskCompletionId is int in legacy schema; cast for comparison)
        const review = await db.query.manualReviewQueue.findFirst({
          where: sql`${manualReviewQueue.taskCompletionId}::text = ${completionId}`,
        });

        if (review) {
          // Use unified verification service
          await unifiedVerification.approveManualReview(
            review.id,
            userId,
            validatedData.reviewNotes
          );
        } else {
          // Direct approval without review queue (task_completions has no reviewedBy/reviewNotes)
          await db
            .update(taskCompletions)
            .set({
              status: 'completed', // Changed from 'verified' to match client expectations
              verifiedAt: new Date(),
              completedAt: new Date(),
              verificationMethod: 'manual',
            })
            .where(eq(taskCompletions.id, completionId));

          // Award points for the completed task
          try {
            await unifiedVerification.awardPoints(completionId, completion.taskId);
          } catch (pointsError) {
            console.error('Error awarding points on direct approval:', pointsError);
            // Don't fail the approval if points fail - task is still marked completed
          }
        }

        res.json({ success: true, message: 'Task approved' });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error approving task completion:', error);
        res.status(500).json({
          error: 'Failed to approve task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Reject a task completion
   * POST /api/task-completions/:completionId/reject
   */
  app.post(
    '/api/task-completions/:completionId/reject',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { completionId } = req.params;
        const userId = req.user!.id;
        const validatedData = rejectReviewSchema.parse(req.body);

        // Get the completion to verify ownership
        const completion = await db.query.taskCompletions.findFirst({
          where: eq(taskCompletions.id, completionId),
          with: {
            task: {
              with: {
                creator: true,
              },
            },
          },
        });

        if (!completion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Verify user is the creator
        if (completion.task.creator?.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Find associated review queue item (taskCompletionId is int in legacy schema; cast for comparison)
        const review = await db.query.manualReviewQueue.findFirst({
          where: sql`${manualReviewQueue.taskCompletionId}::text = ${completionId}`,
        });

        if (review) {
          // Use unified verification service
          await unifiedVerification.rejectManualReview(
            review.id,
            userId,
            validatedData.reviewNotes ?? ''
          );
        } else {
          // Direct rejection without review queue (task_completions has no reviewedBy/reviewNotes)
          await db
            .update(taskCompletions)
            .set({
              status: 'rejected',
              verificationMethod: 'manual',
            })
            .where(eq(taskCompletions.id, completionId));
        }

        // TODO: Send notification to fan

        res.json({ success: true, message: 'Task rejected' });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error rejecting task completion:', error);
        res.status(500).json({
          error: 'Failed to reject task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Bulk approve/reject reviews
   * POST /api/creators/:creatorId/review-queue/bulk
   */
  app.post(
    '/api/creators/:creatorId/review-queue/bulk',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { creatorId } = req.params;
        const userId = req.user!.id;
        const validatedData = bulkActionSchema.parse(req.body);

        // Verify user owns this creator profile
        const creator = await db.query.creators.findFirst({
          where: eq(creators.id, creatorId),
        });

        if (!creator || creator.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        const results = {
          successful: 0,
          failed: 0,
          errors: [] as string[],
        };

        for (const reviewId of validatedData.reviewIds) {
          try {
            if (validatedData.action === 'approve') {
              await unifiedVerification.approveManualReview(
                reviewId,
                userId,
                validatedData.reviewNotes
              );
            } else {
              if (!validatedData.reviewNotes) {
                throw new Error('Review notes required for rejection');
              }
              await unifiedVerification.rejectManualReview(
                reviewId,
                userId,
                validatedData.reviewNotes
              );
            }
            results.successful++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Review ${reviewId}: ${error.message}`);
          }
        }

        res.json(results);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        console.error('Error processing bulk review action:', error);
        res.status(500).json({
          error: 'Failed to process bulk action',
          message: error.message,
        });
      }
    }
  );
}
