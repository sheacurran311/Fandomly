/**
 * Kick Verification Service
 * 
 * Handles verification of Kick-related tasks:
 * - T1 (API): Channel follows, subscriptions
 * - T2 (Code): Chat messages with verification codes
 * - T2 (Code): Channel point redemptions with code
 * 
 * Note: Kick API availability may be limited.
 */

import { db } from "../../../db";
import { socialConnections, verificationCodes, taskCompletions } from "../../../../shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { tokenRefreshService } from "../../auth/token-refresh";

const KICK_API_BASE = 'https://kick.com/api/v1'; // Placeholder - update when available

export interface KickVerificationParams {
  taskType: string;
  fanUserId: string;
  taskId: string;
  config?: {
    channelId?: string;
    channelUsername?: string;
    verificationCode?: string;
    targetUrl?: string;
  };
  creatorUserId?: string;
}

export interface KickVerificationResult {
  verified: boolean;
  method: 'api' | 'code' | 'manual';
  message: string;
  data?: any;
  requiresManualReview?: boolean;
}

class KickVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: KickVerificationParams): Promise<KickVerificationResult> {
    const { taskType, fanUserId, taskId, config } = params;

    try {
      switch (taskType) {
        case 'kick_follow':
          return await this.verifyChannelFollow(fanUserId, config?.channelUsername);
        
        case 'kick_subscribe':
          return await this.verifySubscription(fanUserId, config?.channelUsername);
        
        case 'kick_chat_code':
          return await this.verifyChatCode(fanUserId, taskId, config?.channelUsername);
        
        case 'kick_redeem_reward':
          // Channel point redemptions would require webhook integration
          return {
            verified: false,
            method: 'manual',
            message: 'Channel point redemptions require manual verification',
            requiresManualReview: true,
          };
        
        default:
          return {
            verified: false,
            method: 'manual',
            message: `Unknown Kick task type: ${taskType}`,
            requiresManualReview: true,
          };
      }
    } catch (error: any) {
      console.error('[KickVerification] Error:', error);
      return {
        verified: false,
        method: 'manual',
        message: error.message || 'Verification failed',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify channel follow (T1)
   */
  async verifyChannelFollow(
    fanUserId: string, 
    channelUsername?: string
  ): Promise<KickVerificationResult> {
    // Get fan's Kick connection
    const connection = await this.getConnection(fanUserId);
    if (!connection) {
      return {
        verified: false,
        method: 'api',
        message: 'Kick account not connected',
      };
    }

    // Ensure token is fresh
    await this.ensureValidToken(connection);

    try {
      // Fetch user's followed channels
      const response = await fetch(
        `${KICK_API_BASE}/user/${connection.platformUserId}/follows`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch follows');
      }

      const data = await response.json();
      const follows = data.data || [];

      // Check if the target channel is in the followed list
      const isFollowing = follows.some(
        (f: any) => f.channel?.username?.toLowerCase() === channelUsername?.toLowerCase()
      );

      return {
        verified: isFollowing,
        method: 'api',
        message: isFollowing 
          ? 'Following channel verified' 
          : 'Not following the required channel',
        data: { followCount: follows.length },
      };
    } catch (error: any) {
      console.error('[KickVerification] Follow check error:', error);
      // Fall back to manual verification if API fails
      return {
        verified: false,
        method: 'manual',
        message: 'Could not verify follow via API',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify channel subscription (T1)
   */
  async verifySubscription(
    fanUserId: string,
    channelUsername?: string
  ): Promise<KickVerificationResult> {
    const connection = await this.getConnection(fanUserId);
    if (!connection) {
      return {
        verified: false,
        method: 'api',
        message: 'Kick account not connected',
      };
    }

    await this.ensureValidToken(connection);

    try {
      // Fetch user's subscriptions
      const response = await fetch(
        `${KICK_API_BASE}/user/${connection.platformUserId}/subscriptions`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      const subscriptions = data.data || [];

      // Check if subscribed to the target channel
      const isSubscribed = subscriptions.some(
        (s: any) => s.channel?.username?.toLowerCase() === channelUsername?.toLowerCase()
      );

      return {
        verified: isSubscribed,
        method: 'api',
        message: isSubscribed 
          ? 'Subscription verified' 
          : 'Not subscribed to the required channel',
        data: { subscriptionCount: subscriptions.length },
      };
    } catch (error: any) {
      console.error('[KickVerification] Subscription check error:', error);
      return {
        verified: false,
        method: 'manual',
        message: 'Could not verify subscription via API',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify chat code (T2)
   * Note: This would typically be triggered by webhook for real-time verification.
   * This method provides a fallback polling approach.
   */
  async verifyChatCode(
    fanUserId: string,
    taskId: string,
    channelUsername?: string
  ): Promise<KickVerificationResult> {
    // Get the verification code for this task/user
    const code = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.taskId, taskId),
        eq(verificationCodes.fanId, fanUserId),
        eq(verificationCodes.isUsed, false),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!code) {
      return {
        verified: false,
        method: 'code',
        message: 'No active verification code found. Please generate a new code.',
      };
    }

    // Check if code was already verified (e.g., by webhook)
    const completion = await db.query.taskCompletions.findFirst({
      where: and(
        eq(taskCompletions.taskId, taskId),
        eq(taskCompletions.userId, fanUserId),
        eq(taskCompletions.status, 'completed')
      ),
    });

    if (completion) {
      return {
        verified: true,
        method: 'code',
        message: 'Code already verified!',
      };
    }

    // For Kick, we rely on webhook-based verification for chat codes
    // This endpoint returns pending status if webhook hasn't fired yet
    return {
      verified: false,
      method: 'code',
      message: 'Code is active. Post it in the Kick chat and wait for verification.',
      data: {
        code: code.code,
        expiresAt: code.expiresAt,
        hint: `Type "${code.code}" in ${channelUsername}'s Kick chat`,
      },
    };
  }

  /**
   * Process incoming chat message (called from webhook handler)
   */
  async processChatMessage(
    channelId: string,
    senderId: string,
    senderUsername: string,
    message: string
  ): Promise<{ matched: boolean; taskId?: string; userId?: string }> {
    // Look for verification codes in the message
    const codePattern = /[A-Z0-9]{6,8}/g;
    const potentialCodes = message.match(codePattern) || [];

    for (const potentialCode of potentialCodes) {
      // Check if this is an active verification code
      const code = await db.query.verificationCodes.findFirst({
        where: and(
          eq(verificationCodes.code, potentialCode),
          eq(verificationCodes.isUsed, false),
          gt(verificationCodes.expiresAt, new Date())
        ),
      });

      if (code) {
        // Verify the sender's Kick account matches
        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, code.fanId),
            eq(socialConnections.platform, 'kick'),
            eq(socialConnections.platformUserId, senderId)
          ),
        });

        if (connection) {
          // Mark code as used
          await db
            .update(verificationCodes)
            .set({ isUsed: true, usedAt: new Date() })
            .where(eq(verificationCodes.id, code.id));

          // Complete the task
          await db
            .update(taskCompletions)
            .set({
              status: 'completed',
              completedAt: new Date(),
              completionData: {
                metadata: {
                  verificationMethod: 'code',
                  platform: 'kick',
                  code: potentialCode,
                  chatMessage: message,
                  verifiedAt: new Date().toISOString(),
                },
              },
            })
            .where(
              and(
                eq(taskCompletions.taskId, code.taskId),
                eq(taskCompletions.userId, code.fanId)
              )
            );

          return {
            matched: true,
            taskId: code.taskId,
            userId: code.fanId,
          };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Get user's Kick connection
   */
  private async getConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'kick'),
        eq(socialConnections.isActive, true)
      ),
    });
  }

  /**
   * Ensure access token is valid
   */
  private async ensureValidToken(connection: any): Promise<void> {
    if (tokenRefreshService.isTokenExpired(connection.tokenExpiresAt)) {
      await tokenRefreshService.refreshIfNeeded(connection);
    }
  }
}

export const kickVerification = new KickVerificationService();
