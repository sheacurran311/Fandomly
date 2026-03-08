/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@db';
import {
  taskCompletions,
  manualReviewQueue,
  verificationAttempts,
  socialConnections,
  loyaltyPrograms,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { twitterVerification } from './twitter-verification';
import { tiktokVerification } from './tiktok-verification';
import { instagramVerification } from './instagram-verification';
import { websiteVisitVerification } from './website-visit-verification';
import { pollQuizVerification } from './poll-quiz-verification';
import { validateProofUrl } from '../../middleware/upload';
import { multiplierService } from '../multiplier-service';
import { creatorPointsService } from '../points/points-service';

// New verification services for loyalty engine
import { commentFetcher } from './comment-fetcher';
import { discordVerification } from './platforms/discord-verification';
import { twitchVerification } from './platforms/twitch-verification';
import { spotifyVerification } from './platforms/spotify-verification';
import { youtubeVerification } from './platforms/youtube-verification';
import { kickVerification } from './platforms/kick-verification';
import { patreonVerification } from './platforms/patreon-verification';
import { facebookVerification } from './platforms/facebook-verification';
import { appleMusicVerification } from './platforms/apple-music-verification';
import { getTaskVerificationInfo } from '@shared/taskTemplates';

export interface UnifiedVerificationRequest {
  userId: string;
  taskCompletionId?: string;
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
  responses?: Array<{
    // For poll/quiz tasks
    questionId: string;
    questionText: string;
    selectedOptions: number[];
  }>;
}

export interface UnifiedVerificationResult {
  success: boolean;
  verified: boolean;
  requiresManualReview: boolean;
  completionId: string;
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
      if (
        proofUrl &&
        !['website_visit', 'poll', 'quiz', 'check_in'].includes(taskType.toLowerCase())
      ) {
        const urlValidation = validateProofUrl(proofUrl, platform);
        if (!urlValidation.valid) {
          return {
            success: false,
            verified: false,
            requiresManualReview: false,
            completionId: taskCompletionId || '',
            message: urlValidation.error || 'Invalid proof URL',
          };
        }
      }

      // Route to platform-specific or task-type-specific verification
      const verificationResult = await this.routeVerification({
        userId: userId,
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

      // Log verification attempt (verificationAttempts uses integer - cast if needed for legacy schema)
      await this.logVerificationAttempt({
        taskCompletionId: completion.id,
        userId,
        platform,
        verificationMethod: this.getVerificationMethod(taskType, platform),
        success: verificationResult.verified,
        errorMessage: (verificationResult as { reason?: string }).reason,
        verificationData: (verificationResult as { metadata?: Record<string, unknown> }).metadata,
      });

      // If requires manual review, add to queue
      if ((verificationResult as { requiresManualReview?: boolean }).requiresManualReview) {
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
          autoCheckResult: (verificationResult as { metadata?: unknown }).metadata,
        });

        return {
          success: true,
          verified: false,
          requiresManualReview: true,
          completionId: completion.id,
          message:
            'Task submitted for manual review. You will be notified when reviewed (usually within 24-48 hours).',
          metadata: (verificationResult as { metadata?: Record<string, unknown> }).metadata,
        };
      }

      // If verified, award points
      if ((verificationResult as { verified?: boolean }).verified) {
        const pointsAwarded = await this.awardPoints(completion.id, taskId);

        return {
          success: true,
          verified: true,
          requiresManualReview: false,
          completionId: completion.id,
          pointsAwarded,
          message: `Task verified! +${pointsAwarded} points awarded`,
          metadata: (verificationResult as { metadata?: Record<string, unknown> }).metadata,
        };
      }

      // Verification failed
      return {
        success: false,
        verified: false,
        requiresManualReview: false,
        completionId: completion.id,
        message:
          (verificationResult as { reason?: string }).reason ||
          'Verification failed. Please try again.',
        metadata: (verificationResult as { metadata?: Record<string, unknown> }).metadata,
      };
    } catch (error: any) {
      console.error('Unified verification error:', error);

      return {
        success: false,
        verified: false,
        requiresManualReview: false,
        completionId: taskCompletionId || '',
        message: error.message || 'Verification error occurred',
      };
    }
  }

  /**
   * Route to platform-specific or task-type-specific verification service
   */
  private async routeVerification(params: {
    userId: string;
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
    const {
      platform,
      taskType,
      taskSettings,
      proofUrl,
      screenshotUrl,
      userId,
      trackingToken,
      responses,
    } = params;

    // Sprint 2: Check task type first for interactive/auto-verified tasks
    switch (taskType.toLowerCase()) {
      case 'website_visit':
        return await websiteVisitVerification.verify({
          userId,
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
          userId,
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

    // Get verification info for this task type
    const verificationInfo = getTaskVerificationInfo(taskType);

    // ================================================================
    // STARTER PACK TASKS (T3 - Honor System)
    // ================================================================
    if (verificationInfo.isStarterPack || taskType.startsWith('starter_')) {
      // Starter pack tasks use honor system - always verify but with low confidence
      return {
        verified: true,
        requiresManualReview: false,
        confidence: 'low' as const,
        reason: 'Starter pack task - honor system verification',
        metadata: {
          verificationTier: 'T3',
          verificationMethod: 'starter_pack',
          isStarterPack: true,
        },
      };
    }

    // ================================================================
    // CODE-IN-COMMENT VERIFICATION (T2)
    // ================================================================
    if (taskType.includes('comment_code') || taskType.includes('keyword_comment')) {
      // Code-in-comment verification requires fetching comments
      // This would typically be triggered separately after the fan posts
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium' as const,
        reason: 'Code verification pending - please verify your code',
        metadata: {
          verificationTier: 'T2',
          verificationMethod: 'code_comment',
        },
      };
    }

    // ================================================================
    // CODE-IN-REPOST VERIFICATION (T2 - non-Twitter platforms)
    // ================================================================
    // Twitter quote tweets and retweets are handled by the Twitter verifier below.
    // Only intercept non-Twitter repost/quote tasks here.
    if (
      (taskType.includes('quote') || taskType.includes('repost')) &&
      !['twitter', 'x'].includes(platform.toLowerCase())
    ) {
      return {
        verified: false,
        requiresManualReview: true,
        confidence: 'medium' as const,
        reason: 'Quote/repost requires manual verification',
        metadata: {
          verificationTier: 'T2',
          verificationMethod: 'code_repost',
        },
      };
    }

    // ================================================================
    // GROUP GOALS (Hashtag-based)
    // ================================================================
    if (taskType.startsWith('group_')) {
      // Group goals are verified by the poller when the goal is reached
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium' as const,
        reason: 'Group goal - participation recorded',
        metadata: {
          verificationTier: 'T2',
          verificationMethod: 'hashtag',
          isGroupGoal: true,
        },
      };
    }

    // ================================================================
    // PLATFORM-SPECIFIC VERIFICATION
    // ================================================================
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        // Twitter with Basic tier can do T1 verification
        return await twitterVerification.verify({
          userId,
          taskType,
          proofUrl,
          taskSettings,
        });

      case 'discord':
        // Discord has full T1 API verification
        return await discordVerification.verifyTask({
          fanUserId: userId,
          taskType,
          taskSettings: taskSettings || {},
        });

      case 'twitch':
        // Twitch has full T1 API verification
        return await twitchVerification.verifyTask({
          fanUserId: userId,
          creatorUserId: taskSettings?.creatorUserId || '',
          taskType,
          taskSettings: taskSettings || {},
        });

      case 'spotify':
        // Spotify has T1 API verification for follows/saves
        return await spotifyVerification.verifyTask({
          fanUserId: userId,
          taskType,
          taskSettings: taskSettings || {},
        });

      case 'apple_music':
        // Apple Music has T1 API verification for library adds
        return await appleMusicVerification.verifyTask({
          fanUserId: userId,
          taskType,
          taskSettings: taskSettings || {},
        });

      case 'youtube':
        // YouTube has T1 verification for subscriptions, T2 for comments
        return await youtubeVerification.verifyTask({
          fanUserId: userId,
          taskType,
          taskSettings: taskSettings || {},
        });

      case 'kick':
        // Kick has T1 API verification for follows/subscriptions, T2 for chat codes
        return await kickVerification.verifyTask({
          taskType,
          fanUserId: userId,
          taskId: taskSettings?.taskId || '',
          config: {
            channelId: taskSettings?.channelId,
            channelUsername: taskSettings?.channelUsername,
            verificationCode: taskSettings?.verificationCode,
          },
          creatorUserId: taskSettings?.creatorUserId,
        });

      case 'patreon':
        // Patreon has full T1 API verification
        return await patreonVerification.verifyTask({
          taskType,
          fanUserId: userId,
          taskId: taskSettings?.taskId || '',
          config: {
            campaignId: taskSettings?.campaignId,
            creatorPatreonId: taskSettings?.creatorPatreonId,
            minimumCents: taskSettings?.minimumCents,
            requiredTierId: taskSettings?.requiredTierId,
            requiredTierTitle: taskSettings?.requiredTierTitle,
          },
          creatorUserId: taskSettings?.creatorUserId,
        });

      case 'tiktok':
        // TikTok verification - mostly T3 (manual) or T2 (code)
        let userTikTokUsername: string | undefined;
        if (taskType === 'tiktok_post') {
          const [tiktokConn] = await db
            .select()
            .from(socialConnections)
            .where(
              and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'tiktok'))
            );
          userTikTokUsername = tiktokConn?.platformUsername ?? undefined;
        }

        return await tiktokVerification.verify({
          taskType,
          proofUrl,
          screenshotUrl,
          taskSettings,
          userTikTokUsername,
        });

      case 'instagram':
        // Instagram verification - mostly T3 (manual) or T2 (code)
        return await instagramVerification.verify({
          userId,
          taskType,
          proofUrl,
          screenshotUrl,
          taskSettings,
        });

      case 'facebook':
        // Try API-based verification first for supported task types
        if (taskType === 'facebook_like_page' || taskType === 'facebook_join_group') {
          return await facebookVerification.verifyTask({
            fanUserId: userId,
            taskType,
            taskSettings: taskSettings || {},
          });
        }

        // Facebook comment tasks - try code-based verification if contentId is available
        if (
          (taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo') &&
          taskSettings?.contentId
        ) {
          try {
            // Try to get the creator's Facebook access token
            const creatorConnection = await db.query.socialConnections.findFirst({
              where: and(
                eq(socialConnections.userId, taskSettings.creatorUserId || ''),
                eq(socialConnections.platform, 'facebook'),
                eq(socialConnections.isActive, true)
              ),
            });

            if (creatorConnection?.accessToken) {
              // Attempt code-based verification
              const codeResult = await commentFetcher.verifyCodeInComments({
                platform: 'facebook',
                contentId: taskSettings.contentId,
                taskId: taskSettings.taskId || '',
                fanId: userId,
                creatorAccessToken: creatorConnection.accessToken,
              });

              if (codeResult.verified) {
                return {
                  verified: true,
                  requiresManualReview: false,
                  confidence: codeResult.confidence,
                  reason: codeResult.reason || 'Facebook comment verified via code',
                  metadata: {
                    verificationTier: 'T2',
                    verificationMethod: 'code_in_comment',
                    code: codeResult.code,
                    commentAuthor: codeResult.comment?.authorUsername,
                  },
                };
              }

              // Code not found yet - fall through to manual review
              return {
                verified: false,
                requiresManualReview: true,
                confidence: 'medium' as const,
                reason:
                  'Verification code not found in comments yet. Please make sure you included your unique code in your comment.',
                metadata: {
                  verificationTier: 'T2',
                  verificationMethod: 'code_in_comment',
                },
              };
            }
          } catch (error) {
            console.error('[Verification] Facebook code verification error:', error);
          }
        }

        // For other Facebook tasks, use the Facebook verification service
        return await facebookVerification.verifyTask({
          fanUserId: userId,
          taskType,
          taskSettings: taskSettings || {},
        });

      default:
        return {
          verified: false,
          requiresManualReview: true,
          confidence: 'low' as const,
          reason: `Unknown platform: ${platform}`,
          metadata: {
            verificationTier: 'T3',
            verificationMethod: 'manual',
          },
        };
    }
  }

  /**
   * Create or update task completion record
   */
  private async upsertTaskCompletion(params: {
    taskCompletionId?: string;
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
      proofUrl: _proofUrl,
      screenshotUrl: _screenshotUrl,
      proofNotes: _proofNotes,
      verificationResult,
    } = params;

    const status = verificationResult.verified
      ? 'completed' // Changed from 'verified' to match client expectations
      : verificationResult.requiresManualReview
        ? 'pending_review'
        : 'rejected';

    const completionData = {
      userId,
      taskId,
      tenantId,
      status,
      verifiedAt: (verificationResult as { verified?: boolean }).verified ? new Date() : null,
      completedAt: (verificationResult as { verified?: boolean }).verified ? new Date() : null,
      completionData: {
        metadata: (verificationResult as { metadata?: unknown }).metadata || {},
      } as Record<string, unknown>,
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
    taskCompletionId: string;
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
    taskCompletionId: string;
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
  async awardPoints(taskCompletionId: string, taskId: string): Promise<number> {
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
      tenantId: task.tenantId ?? '',
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
        pointsEarned: pointsToAward,
        completedAt: new Date(),
        completionData: {
          ...((completion.completionData as Record<string, unknown>) || {}),
          metadata: {
            ...(((completion.completionData as Record<string, unknown>)?.metadata as Record<
              string,
              unknown
            >) || {}),
            multiplierApplied: multiplierResult.finalMultiplier,
            multiplierBreakdown: multiplierResult.breakdown,
            basePoints: basePoints,
          },
        } as Record<string, unknown>,
      })
      .where(eq(taskCompletions.id, taskCompletionId));

    // Award points to user's balance via CreatorPointsService
    // This inserts into point_transactions table for proper tracking
    if (pointsToAward > 0 && task.tenantId) {
      try {
        // Use task.programId directly when available; fall back to tenant lookup
        let program: { id: string; creatorId: string | null } | undefined;
        if ((task as any).programId) {
          program = await db.query.loyaltyPrograms.findFirst({
            where: eq(loyaltyPrograms.id, (task as any).programId),
          });
        }
        if (!program) {
          program = await db.query.loyaltyPrograms.findFirst({
            where: eq(loyaltyPrograms.tenantId, task.tenantId),
          });
        }

        if (program?.creatorId) {
          await creatorPointsService.awardPoints(
            completion.userId,
            program.creatorId,
            task.tenantId,
            pointsToAward,
            'task_completion',
            `Task completed: ${task.name}`,
            { taskId: taskId, taskCompletionId: taskCompletionId, programId: program.id }
          );
          console.log(
            `[Points] Awarded ${pointsToAward} creator points to user ${completion.userId} for task ${task.name} (program ${program.id})`
          );
        } else {
          console.warn(
            `[Points] No loyalty program found for task ${taskId}, skipping points award to user balance`
          );
        }
      } catch (pointsError) {
        // Log but don't fail the verification - points on completion record are already saved
        console.error('[Points] Failed to award creator points:', pointsError);
      }
    }

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

    // Platform-based verification
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
      case 'youtube':
      case 'spotify':
      case 'apple_music':
      case 'twitch':
      case 'discord':
      case 'kick':
      case 'patreon':
        return 'api';
      case 'tiktok':
      case 'instagram':
        return 'smart_detection';
      case 'facebook':
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

    if (urgentTypes.some((type) => taskType.includes(type))) {
      return 'urgent';
    }

    if (highPriorityTypes.some((type) => taskType.includes(type))) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Admin: Approve manual review
   */
  async approveManualReview(
    reviewId: string,
    reviewerId: string,
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
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: reviewNotes,
      })
      .where(eq(manualReviewQueue.id, reviewId));

    // Update task completion
    await db
      .update(taskCompletions)
      .set({
        status: 'completed',
        verifiedAt: new Date(),
      })
      .where(eq(taskCompletions.id, review.taskCompletionId));

    // Award points
    await this.awardPoints(review.taskCompletionId, review.taskId);

    // TODO: Send notification to fan
  }

  /**
   * Admin: Reject manual review
   */
  async rejectManualReview(
    reviewId: string,
    reviewerId: string,
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
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: reviewNotes,
      })
      .where(eq(manualReviewQueue.id, reviewId));

    // Update task completion as rejected
    await db
      .update(taskCompletions)
      .set({
        status: 'rejected',
      })
      .where(eq(taskCompletions.id, review.taskCompletionId));

    // TODO: Send notification to fan
  }
}

// Export singleton instance
export const unifiedVerification = new UnifiedVerificationService();
