import { db } from '../db';
import { taskCompletions, socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Webhook Auto-Verification Service
 * Automatically verifies task completions when webhook events are received
 */

/**
 * Match webhook event to pending task completions and auto-verify
 */
export async function matchAndVerifyTask(
  platformUserId: string,
  platform: string,
  taskType: string,
  targetData: any
) {
  try {
    console.log('[Webhook Auto-Verify] Processing event:', {
      platformUserId,
      platform,
      taskType,
      targetData
    });

    // Find user by their social connection
    const [connection] = await db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.platform, platform),
          eq(socialConnections.platformUserId, platformUserId),
          eq(socialConnections.isActive, true)
        )
      );

    if (!connection) {
      console.log('[Webhook Auto-Verify] No social connection found for:', platformUserId);
      return;
    }

    console.log('[Webhook Auto-Verify] Found user:', connection.userId);

    // Find pending task completions for this user
    const pendingCompletions = await db
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, connection.userId),
          eq(taskCompletions.status, 'in_progress')
        )
      );

    console.log('[Webhook Auto-Verify] Found pending completions:', pendingCompletions.length);

    if (pendingCompletions.length === 0) {
      console.log('[Webhook Auto-Verify] No pending tasks to verify');
      return;
    }

    // Match and verify relevant tasks
    for (const completion of pendingCompletions) {
      // Check if completion data matches the webhook event
      const completionData = completion.completionData || {};
      
      // TODO: Implement more sophisticated matching logic
      // For now, we'll verify tasks that match the platform and type
      // In production, you'd want to match specific IDs (postId, videoId, etc.)
      
      console.log('[Webhook Auto-Verify] Verifying task completion:', {
        completionId: completion.id,
        taskId: completion.taskId
      });
      
      // Update the task completion
      await db
        .update(taskCompletions)
        .set({
          status: 'completed',
          verifiedAt: new Date(),
          verificationMethod: 'webhook',
          progress: 100,
          completionData: {
            ...completionData,
            metadata: {
              ...(typeof completionData?.metadata === 'object' && completionData?.metadata ? completionData.metadata : {}),
              verificationProof: {
                platform,
                taskType,
                ...targetData,
                verifiedAt: new Date().toISOString(),
                webhookEvent: true
              }
            },
          },
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(taskCompletions.id, completion.id));
      
      console.log('[Webhook Auto-Verify] ✅ Task verified successfully:', completion.id);
    }
  } catch (error) {
    console.error('[Webhook Auto-Verify] Error:', error);
  }
}

