import { db } from '@db';
import { taskCompletions, manualReviewQueue, verificationAttempts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { twitterVerification } from './twitter-verification';
import { tiktokVerification } from './tiktok-verification';
import { validateProofUrl } from '../../middleware/upload';

export interface UnifiedVerificationRequest {
  userId: number;
  taskCompletionId?: number;
  taskId: number;
  tenantId: number;
  creatorId: number;

  platform: string;
  taskType: string;
  taskName: string;
  taskSettings: any;

  // Proof data from frontend
  proofUrl?: string;
  screenshotUrl?: string;
  proofNotes?: string;
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
    } = request;

    try {
      // Validate proof URL if provided
      if (proofUrl) {
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

      // Route to platform-specific verification
      const verificationResult = await this.routeVerification({
        userId,
        platform,
        taskType,
        taskSettings,
        proofUrl,
        screenshotUrl,
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
        verificationMethod: this.getVerificationMethod(platform),
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
   * Route to platform-specific verification service
   */
  private async routeVerification(params: {
    userId: number;
    platform: string;
    taskType: string;
    taskSettings: any;
    proofUrl?: string;
    screenshotUrl?: string;
  }) {
    const { platform, taskType, taskSettings, proofUrl, screenshotUrl, userId } = params;

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
        return await tiktokVerification.verify({
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

      case 'instagram':
      case 'facebook':
      case 'spotify':
      case 'twitch':
      case 'discord':
        // These platforms always require manual review
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
    userId: number;
    taskId: number;
    tenantId: number;
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
      user_id: userId,
      task_id: taskId,
      tenant_id: tenantId,
      status,
      proof_url: proofUrl,
      proof_screenshot_url: screenshotUrl,
      proof_notes: proofNotes,
      verification_metadata: verificationResult.metadata || {},
      requires_manual_review: verificationResult.requiresManualReview,
      verified_at: verificationResult.verified ? new Date() : null,
      updated_at: new Date(),
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
          created_at: new Date(),
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
    tenantId: number;
    creatorId: number;
    fanId: number;
    taskId: number;
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
      task_completion_id: params.taskCompletionId,
      tenant_id: params.tenantId,
      creator_id: params.creatorId,
      fan_id: params.fanId,
      task_id: params.taskId,
      platform: params.platform,
      task_type: params.taskType,
      task_name: params.taskName,
      screenshot_url: params.screenshotUrl,
      proof_url: params.proofUrl,
      proof_notes: params.proofNotes,
      auto_check_result: params.autoCheckResult || {},
      priority,
      status: 'pending',
      created_at: new Date(),
    });
  }

  /**
   * Log verification attempt for debugging and analytics
   */
  private async logVerificationAttempt(params: {
    taskCompletionId: number;
    userId: number;
    platform: string;
    verificationMethod: string;
    success: boolean;
    errorMessage?: string;
    verificationData?: any;
  }) {
    await db.insert(verificationAttempts).values({
      task_completion_id: params.taskCompletionId,
      user_id: params.userId,
      platform: params.platform,
      verification_method: params.verificationMethod,
      success: params.success,
      error_message: params.errorMessage,
      verification_data: params.verificationData || {},
      attempted_at: new Date(),
      created_at: new Date(),
    });
  }

  /**
   * Award points for verified task completion
   */
  private async awardPoints(taskCompletionId: number, taskId: number): Promise<number> {
    // Get task to know how many points to award
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId),
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const pointsToAward = task.points_to_reward || 0;

    // Update completion with points awarded
    await db
      .update(taskCompletions)
      .set({
        points_awarded: pointsToAward,
        completed_at: new Date(),
      })
      .where(eq(taskCompletions.id, taskCompletionId));

    // TODO: Update user's total points
    // This should be done in a separate service that handles loyalty points

    return pointsToAward;
  }

  /**
   * Get verification method for platform
   */
  private getVerificationMethod(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
      case 'youtube':
        return 'api';
      case 'tiktok':
        return 'smart_detection';
      case 'instagram':
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
