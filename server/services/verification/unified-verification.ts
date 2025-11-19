import { db } from '@db';
import { taskCompletions, manualReviewQueue, verificationAttempts, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { twitterVerification } from './twitter-verification';
import { tiktokVerification } from './tiktok-verification';
import { instagramVerification } from './instagram-verification';
import { websiteVisitVerification } from './website-visit-verification';
import { pollQuizVerification } from './poll-quiz-verification';
import { validateProofUrl } from '../../middleware/upload';
import { multiplierService } from '../multiplier-service';
import { checkInService } from '../check-in-service';

export interface UnifiedVerificationRequest {
  userId: string;
  taskCompletionId?: number;
  taskId: string; // UUID
  tenantId: string;
  creatorId: string;

  platform: string;
  taskType: string;
  taskName: string;
  taskSettings: any;

  // Proof data from frontend
  proofUrl?: string;
  screenshotUrl?: string;
  proofNotes?: string;

  // Sprint 2: Interactive task data
  trackingToken?: string; // For website_visit tasks
  responses?: Array<{ // For poll/quiz tasks
    questionId: string;
    questionText: string;
    selectedOptions: number[];
  }>;
}

export interface UnifiedVerificationResult {
  success: boolean;
  verified: boolean;
  requiresManualReview: boolean;
  completionId: number;
  pointsAwarded?: number;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Unified Verification Service
 *
 * Central service that:
 * 1. Routes verification to platform-specific services
 * 2. Handles manual review queue creation
 * 3. Updates task completion status
 * 4. Logs verification attempts
 * 5. Awards points on successful verification
 */
export class UnifiedVerificationService {
  /**
   * Main verification entry point
   */
  async verify(request: UnifiedVerificationRequest): Promise<UnifiedVerificationResult> {
    const {
      userId,
      taskCompletionId,
      taskId,
      tenantId,
      creatorId,
      platform,
      taskType,
      taskName,
      taskSettings,
      proofUrl,
      screenshotUrl,
      proofNotes,
      trackingToken,
      responses,
    } = request;

    try {
      // Validate proof URL if provided (skip for interactive task types)
      if (proofUrl && !['website_visit', 'poll', 'quiz', 'check_in'].includes(taskType.toLowerCase())) {
        const urlValidation = validateProofUrl(proofUrl, platform);
        if (!urlValidation.valid) {
          return {
            success: false,
            verified: false,
            requiresManualReview: false,
            completionId: taskCompletionId || 0,
            message: urlValidation.error || 'Invalid proof URL',
          };
        }
      }

      // Route to platform-specific or task-type-specific verification
      const verificationResult = await this.routeVerification({
        userId,
        platform,
        taskType,
        taskSettings,
        proofUrl,
        screenshotUrl,
        trackingToken,
        responses,
      });

      // Create or update task completion
      const completion = await this.upsertTaskCompletion({
        taskCompletionId,
        userId,
        taskId,
        tenantId,
        proofUrl,
        screenshotUrl,
        proofNotes,
        verificationResult,
      });

      // Log verification attempt
      await this.logVerificationAttempt({
        taskCompletionId: completion.id,
        userId,
        platform,
        verificationMethod: this.getVerificationMethod(taskType, platform),
        success: verificationResult.verified,
        errorMessage: verificationResult.reason,
        verificationData: verificationResult.metadata,
      });

      // If requires manual review, add to queue
      if (verificationResult.requiresManualReview) {
        await this.createManualReview({
          taskCompletionId: completion.id,
          tenantId,
          creatorId,
          fanId: userId,
          taskId,
          platform,
          taskType,
          taskName,
          screenshotUrl,
          proofUrl,
          proofNotes,
          autoCheckResult: verificationResult.metadata,
        });

        return {
          success: true,
          verified: false,
          requiresManualReview: true,
          completionId: completion.id,
          message: 'Task submitted for manual review. You will be notified when reviewed (usually within 24-48 hours).',
          metadata: verificationResult.metadata,
        };
      }

      // If verified, award points
      if (verificationResult.verified) {
        const pointsAwarded = await this.awardPoints(completion.id, taskId);

        return {
          success: true,
          verified: true,
          requiresManualReview: false,
          completionId: completion.id,
          pointsAwarded,
          message: `Task verified! +${pointsAwarded} points awarded`,
          metadata: verificationResult.metadata,
        };
      }

      // Verification failed
      return {
        success: false,
        verified: false,
        requiresManualReview: false,
        completionId: completion.id,
        message: verificationResult.reason || 'Verification failed. Please try again.',
        metadata: verificationResult.metadata,
      };
    } catch (error: any) {
      console.error('Unified verification error:', error);

      return {
        success: false,
        verified: false,
        requiresManualReview: false,
        completionId: taskCompletionId || 0,
        message: error.message || 'Verification error occurred',
      };
    }
  }

  /**
   * Route to platform-specific or task-type-specific verification service
   */
  private async routeVerification(params: {
    userId: number;
    platform: string;
    taskType: string;
    taskSettings: any;
    proofUrl?: string;
    screenshotUrl?: string;
    trackingToken?: string;
    responses?: Array<{
      questionId: string;
      questionText: string;
      selectedOptions: number[];
    }>;
  }) {
    const { platform, taskType, taskSettings, proofUrl, screenshotUrl, userId, trackingToken, responses } = params;

    // Sprint 2: Check task type first for interactive/auto-verified tasks
    switch (taskType.toLowerCase()) {
      case 'website_visit':
        return await websiteVisitVerification.verify({
          userId: userId.toString(),
          taskType,
          taskSettings,
          trackingToken,
        });

      case 'poll':
      case 'quiz':
        if (!responses || responses.length === 0) {
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low' as const,
            reason: 'No responses provided',
          };
        }
        return await pollQuizVerification.verify({
          userId: userId.toString(),
          taskType,
          taskSettings,
          responses,
        });

      case 'check_in':
        // Check-ins are handled separately via checkInService
        // This is called after check-in is processed
        return {
          verified: true,
          requiresManualReview: false,
          confidence: 'high' as const,
          metadata: {
            checkInProcessed: true,
          },
        };
    }

    // Platform-based verification (existing)
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return await twitterVerification.verify({
          userId,
          taskType,
          proofUrl,
          taskSettings,
        });

      case 'tiktok':
        // Get user's TikTok username for post verification
        let userTikTokUsername: string | undefined;
        if (taskType === 'tiktok_post') {
          const user = await db.query.users.findFirst({
            where: eq(users.id, userId.toString()),
          });
          userTikTokUsername = (user?.socialLinks as any)?.tiktok;
        }

        return await tiktokVerification.verify({
          taskType,
          proofUrl,
          screenshotUrl,
          taskSettings,
          userTikTokUsername,
        });

      case 'instagram':
        return await instagramVerification.verify({
          userId,
          taskType,
          proofUrl,
          screenshotUrl,
          taskSettings,
        });

      case 'youtube':
        // TODO: Implement YouTube verification
        return {
          verified: false,
          requiresManualReview: true,
          confidence: 'low' as const,
          reason: 'YouTube verification not yet implemented',
        };

      case 'facebook':
      case 'spotify':
      case 'twitch':
      case 'discord':
        // These platforms require manual review (no API access or custom hooks available)
        return {
          verified: false,
          requiresManualReview: true,
          confidence: 'medium' as const,
          reason: `${platform} tasks require manual review`,
        };

      default:
        return {
          verified: false,
          requiresManualReview: true,
          confidence: 'low' as const,
          reason: `Unknown platform: ${platform}`,
        };
    }
  }

  /**
   * Create or update task completion record
   */
  private async upsertTaskCompletion(params: {
    taskCompletionId?: number;
    userId: string;
    taskId: string;
    tenantId: string;
    proofUrl?: string;
    screenshotUrl?: string;
    proofNotes?: string;
    verificationResult: any;
  }) {
    const {
      taskCompletionId,
      userId,
      taskId,
      tenantId,
      proofUrl,
      screenshotUrl,
      proofNotes,
      verificationResult,
    } = params;

    const status = verificationResult.verified
      ? 'verified'
      : verificationResult.requiresManualReview
      ? 'pending_review'
      : 'rejected';

    const completionData = {
      userId: userId,
      taskId: taskId,
      tenantId: tenantId,
      status,
      proofUrl: proofUrl,
      proofScreenshotUrl: screenshotUrl,
      proofNotes: proofNotes,
      verificationMetadata: verificationResult.metadata || {},
      requiresManualReview: verificationResult.requiresManualReview,
      verifiedAt: verificationResult.verified ? new Date() : null,
      updatedAt: new Date(),
    };

    if (taskCompletionId) {
      // Update existing completion
      const [updated] = await db
        .update(taskCompletions)
        .set(completionData)
        .where(eq(taskCompletions.id, taskCompletionId))
        .returning();

      return updated;
    } else {
      // Create new completion
      const [created] = await db
        .insert(taskCompletions)
        .values({
          ...completionData,
          createdAt: new Date(),
        })
        .returning();

      return created;
    }
  }

  /**
   * Create manual review queue entry
   */
  private async createManualReview(params: {
    taskCompletionId: number;
    tenantId: string;
    creatorId: string;
    fanId: string;
    taskId: string;
    platform: string;
    taskType: string;
    taskName: string;
    screenshotUrl?: string;
    proofUrl?: string;
    proofNotes?: string;
    autoCheckResult?: any;
  }) {
    const priority = this.calculateReviewPriority(params.taskType);

    await db.insert(manualReviewQueue).values({
      taskCompletionId: params.taskCompletionId,
      tenantId: params.tenantId,
      creatorId: params.creatorId,
      fanId: params.fanId,
      taskId: params.taskId,
      platform: params.platform,
      taskType: params.taskType,
      taskName: params.taskName,
      screenshotUrl: params.screenshotUrl,
      proofUrl: params.proofUrl,
      proofNotes: params.proofNotes,
      autoCheckResult: params.autoCheckResult || {},
      priority,
      status: 'pending',
      createdAt: new Date(),
    });
  }

  /**
   * Log verification attempt for debugging and analytics
   */
  private async logVerificationAttempt(params: {
    taskCompletionId: number;
    userId: string;
    platform: string;
    verificationMethod: string;
    success: boolean;
    errorMessage?: string;
    verificationData?: any;
  }) {
    await db.insert(verificationAttempts).values({
      taskCompletionId: params.taskCompletionId,
      userId: params.userId,
      platform: params.platform,
      verificationMethod: params.verificationMethod,
      success: params.success,
      errorMessage: params.errorMessage,
      verificationData: params.verificationData || {},
      attemptedAt: new Date(),
      createdAt: new Date(),
    });
  }

  /**
   * Award points for verified task completion
   */
  private async awardPoints(taskCompletionId: number, taskId: string): Promise<number> {
    // Get task completion to get userId
    const completion = await db.query.taskCompletions.findFirst({
      where: eq(taskCompletions.id, taskCompletionId),
    });

    if (!completion) {
      throw new Error('Task completion not found');
    }

    // Get task to know how many points to award
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId),
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const basePoints = task.pointsToReward || 0;

    // Calculate multiplier (Sprint 1 feature)
    const multiplierResult = await multiplierService.calculateMultiplier({
      userId: completion.userId,
      taskId: taskId,
      tenantId: task.tenantId,
      taskType: task.taskType,
      platform: task.platform,
      // TODO: Get user tier and points balance from user service
      // userTier: userTier,
      // userPointsBalance: userPointsBalance,
    });

    // Apply multiplier to base points
    const pointsToAward = Math.round(basePoints * multiplierResult.finalMultiplier);

    console.log(`[Multiplier] Task: ${task.name}`);
    console.log(`[Multiplier] Base points: ${basePoints}`);
    console.log(`[Multiplier] Final multiplier: ${multiplierResult.finalMultiplier}x`);
    console.log(`[Multiplier] Points awarded: ${pointsToAward}`);
    if (multiplierResult.breakdown.length > 0) {
      console.log(`[Multiplier] Breakdown:`, multiplierResult.breakdown);
    }

    // Update completion with points awarded and multiplier info
    await db
      .update(taskCompletions)
      .set({
        pointsAwarded: pointsToAward,
        completedAt: new Date(),
        verificationMetadata: {
          ...(completion.verificationMetadata as any || {}),
          multiplierApplied: multiplierResult.finalMultiplier,
          multiplierBreakdown: multiplierResult.breakdown,
          basePoints: basePoints,
        },
      })
      .where(eq(taskCompletions.id, taskCompletionId));

    // TODO: Update user's total points
    // This should be done in a separate service that handles loyalty points

    return pointsToAward;
  }

  /**
   * Get verification method for task type / platform
   */
  private getVerificationMethod(taskType: string, platform: string): string {
    // Sprint 2: Check task type first
    switch (taskType.toLowerCase()) {
      case 'website_visit':
        return 'auto_tracking';
      case 'poll':
      case 'quiz':
        return 'auto_interactive';
      case 'check_in':
        return 'auto_check_in';
    }

    // Platform-based verification (existing)
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
      case 'youtube':
        return 'api';
      case 'tiktok':
      case 'instagram':
        return 'smart_detection';
      case 'facebook':
      case 'spotify':
      case 'twitch':
      case 'discord':
        return 'manual';
      default:
        return 'manual';
    }
  }

  /**
   * Calculate review priority based on task type and value
   */
  private calculateReviewPriority(taskType: string): 'low' | 'normal' | 'high' | 'urgent' {
    // High-value tasks get higher priority
    const highPriorityTypes = ['purchase', 'subscription', 'referral_complete'];
    const urgentTypes = ['time_limited', 'event'];

    if (urgentTypes.some(type => taskType.includes(type))) {
      return 'urgent';
    }

    if (highPriorityTypes.some(type => taskType.includes(type))) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Admin: Approve manual review
   */
  async approveManualReview(
    reviewId: number,
    reviewerId: number,
    reviewNotes?: string
  ): Promise<void> {
    const review = await db.query.manualReviewQueue.findFirst({
      where: eq(manualReviewQueue.id, reviewId),
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Update review queue
    await db
      .update(manualReviewQueue)
      .set({
        status: 'approved',
        reviewed_at: new Date(),
        reviewed_by: reviewerId,
        review_notes: reviewNotes,
      })
      .where(eq(manualReviewQueue.id, reviewId));

    // Update task completion
    await db
      .update(taskCompletions)
      .set({
        status: 'verified',
        verified_at: new Date(),
        reviewed_by: reviewerId,
        review_notes: reviewNotes,
        requires_manual_review: false,
      })
      .where(eq(taskCompletions.id, review.task_completion_id));

    // Award points
    await this.awardPoints(review.task_completion_id, review.task_id);

    // TODO: Send notification to fan
  }

  /**
   * Admin: Reject manual review
   */
  async rejectManualReview(
    reviewId: number,
    reviewerId: number,
    reviewNotes: string
  ): Promise<void> {
    const review = await db.query.manualReviewQueue.findFirst({
      where: eq(manualReviewQueue.id, reviewId),
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Update review queue
    await db
      .update(manualReviewQueue)
      .set({
        status: 'rejected',
        reviewed_at: new Date(),
        reviewed_by: reviewerId,
        review_notes: reviewNotes,
      })
      .where(eq(manualReviewQueue.id, reviewId));

    // Update task completion
    await db
      .update(taskCompletions)
      .set({
        status: 'rejected',
        reviewed_by: reviewerId,
        review_notes: reviewNotes,
        requires_manual_review: false,
      })
      .where(eq(taskCompletions.id, review.task_completion_id));

    // TODO: Send notification to fan
  }
}

// Export singleton instance
export const unifiedVerification = new UnifiedVerificationService();
