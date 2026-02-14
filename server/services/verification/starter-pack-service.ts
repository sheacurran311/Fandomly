import { db } from '../../db';
import { starterPackCompletions, taskCompletions, tasks, socialConnections } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { StarterPackCompletion, InsertStarterPackCompletion } from '@shared/schema';

/**
 * Starter Pack Service
 * 
 * Manages one-time starter pack task completions per platform per tenant.
 * 
 * Key Rules:
 * 1. A fan can only complete ONE starter pack task per platform per creator (tenant), EVER
 * 2. Exception: If a creator adds a starter pack task to a specific campaign,
 *    the fan can earn points for that campaign instance
 * 3. Fans must have their social account connected to claim starter pack tasks
 * 4. Points are reduced (50%) due to unverifiable nature
 */

export interface StarterPackCheckResult {
  canComplete: boolean;
  reason?: string;
  existingCompletion?: StarterPackCompletion;
  requiresConnection?: boolean;
}

export interface StarterPackCompletionResult {
  success: boolean;
  completionId?: string;
  pointsAwarded?: number;
  error?: string;
}

/**
 * Starter Pack Service
 */
export class StarterPackService {
  /**
   * Check if a fan can complete a starter pack task
   * 
   * @param fanId - The fan's user ID
   * @param platform - The social platform (instagram, tiktok, facebook)
   * @param tenantId - The creator's tenant ID
   * @param campaignId - Optional campaign ID (for campaign-specific starter packs)
   */
  async canCompleteStarterPack(params: {
    fanId: string;
    platform: string;
    tenantId: string;
    campaignId?: string | null;
  }): Promise<StarterPackCheckResult> {
    const { fanId, platform, tenantId, campaignId } = params;
    
    try {
      // First, check if fan has the social account connected
      const connection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, fanId),
          eq(socialConnections.platform, platform),
          eq(socialConnections.isActive, true),
        ),
      });
      
      if (!connection) {
        return {
          canComplete: false,
          reason: `You must connect your ${this.getPlatformDisplayName(platform)} account before completing this task.`,
          requiresConnection: true,
        };
      }
      
      // Check for existing completion
      let existingCompletion: StarterPackCompletion | undefined;
      
      if (campaignId) {
        // Check for campaign-specific completion
        existingCompletion = await db.query.starterPackCompletions.findFirst({
          where: and(
            eq(starterPackCompletions.fanId, fanId),
            eq(starterPackCompletions.tenantId, tenantId),
            eq(starterPackCompletions.platform, platform as any),
            eq(starterPackCompletions.campaignId, campaignId),
          ),
        });
      } else {
        // Check for global (non-campaign) completion
        existingCompletion = await db.query.starterPackCompletions.findFirst({
          where: and(
            eq(starterPackCompletions.fanId, fanId),
            eq(starterPackCompletions.tenantId, tenantId),
            eq(starterPackCompletions.platform, platform as any),
            isNull(starterPackCompletions.campaignId),
          ),
        });
      }
      
      if (existingCompletion) {
        const completedDate = existingCompletion.completedAt 
          ? new Date(existingCompletion.completedAt).toLocaleDateString()
          : 'previously';
        
        return {
          canComplete: false,
          reason: campaignId 
            ? `You already completed this starter pack task for this campaign on ${completedDate}.`
            : `You already completed the ${this.getPlatformDisplayName(platform)} starter pack task on ${completedDate}. Starter pack tasks can only be completed once per platform.`,
          existingCompletion,
        };
      }
      
      return { canComplete: true };
    } catch (error) {
      console.error('[StarterPackService] Error checking completion eligibility:', error);
      return {
        canComplete: false,
        reason: 'Error checking eligibility. Please try again.',
      };
    }
  }
  
  /**
   * Record a starter pack completion
   * 
   * This should be called AFTER the fan clicks "I followed!" and we've validated eligibility
   */
  async recordCompletion(params: {
    fanId: string;
    platform: string;
    tenantId: string;
    taskId: string;
    taskCompletionId?: string;
    campaignId?: string | null;
    pointsAwarded: number;
  }): Promise<StarterPackCompletionResult> {
    const { fanId, platform, tenantId, taskId, taskCompletionId, campaignId, pointsAwarded } = params;
    
    try {
      // Double-check eligibility (race condition protection)
      const eligibility = await this.canCompleteStarterPack({
        fanId,
        platform,
        tenantId,
        campaignId,
      });
      
      if (!eligibility.canComplete) {
        return {
          success: false,
          error: eligibility.reason,
        };
      }
      
      // Record the completion
      const [completion] = await db
        .insert(starterPackCompletions)
        .values({
          fanId,
          tenantId,
          platform: platform as any,
          campaignId: campaignId || null,
          taskCompletionId: taskCompletionId || null,
          taskId,
          pointsAwarded,
          completedAt: new Date(),
        })
        .returning();
      
      console.log(`[StarterPackService] Recorded ${platform} starter pack completion for fan ${fanId}, tenant ${tenantId}`);
      
      return {
        success: true,
        completionId: completion.id,
        pointsAwarded,
      };
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') { // PostgreSQL unique violation
        return {
          success: false,
          error: 'This starter pack task has already been completed.',
        };
      }
      
      console.error('[StarterPackService] Error recording completion:', error);
      return {
        success: false,
        error: 'Error recording completion. Please try again.',
      };
    }
  }
  
  /**
   * Get all starter pack completions for a fan for a specific tenant
   */
  async getFanCompletions(fanId: string, tenantId: string): Promise<StarterPackCompletion[]> {
    const completions = await db.query.starterPackCompletions.findMany({
      where: and(
        eq(starterPackCompletions.fanId, fanId),
        eq(starterPackCompletions.tenantId, tenantId),
      ),
    });
    
    return completions;
  }
  
  /**
   * Get completed platforms for a fan (for displaying in UI)
   */
  async getCompletedPlatforms(fanId: string, tenantId: string): Promise<string[]> {
    const completions = await this.getFanCompletions(fanId, tenantId);
    
    // Return unique platforms (ignoring campaign-specific ones)
    const globalCompletions = completions.filter(c => !c.campaignId);
    return [...new Set(globalCompletions.map(c => c.platform))];
  }
  
  /**
   * Check if a fan has completed all starter pack tasks (for badge/trust scoring)
   */
  async hasCompletedAllStarterPacks(
    fanId: string, 
    tenantId: string, 
    requiredPlatforms: string[] = ['instagram', 'tiktok', 'facebook']
  ): Promise<boolean> {
    const completedPlatforms = await this.getCompletedPlatforms(fanId, tenantId);
    return requiredPlatforms.every(p => completedPlatforms.includes(p));
  }
  
  /**
   * Calculate starter pack points with T3 reduction
   * Starter pack tasks receive 50% of base points due to unverifiable nature
   */
  calculateStarterPackPoints(basePoints: number): number {
    const T3_MULTIPLIER = 0.5; // 50% of base points
    return Math.floor(basePoints * T3_MULTIPLIER);
  }
  
  /**
   * Get starter pack completion statistics for a tenant
   */
  async getTenantStats(tenantId: string): Promise<{
    totalCompletions: number;
    byPlatform: Record<string, number>;
    uniqueFans: number;
  }> {
    const completions = await db.query.starterPackCompletions.findMany({
      where: eq(starterPackCompletions.tenantId, tenantId),
    });
    
    const byPlatform: Record<string, number> = {};
    const uniqueFanIds = new Set<string>();
    
    for (const completion of completions) {
      byPlatform[completion.platform] = (byPlatform[completion.platform] || 0) + 1;
      uniqueFanIds.add(completion.fanId);
    }
    
    return {
      totalCompletions: completions.length,
      byPlatform,
      uniqueFans: uniqueFanIds.size,
    };
  }
  
  /**
   * Get display name for a platform
   */
  private getPlatformDisplayName(platform: string): string {
    const displayNames: Record<string, string> = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      twitter: 'X (Twitter)',
      youtube: 'YouTube',
      spotify: 'Spotify',
      discord: 'Discord',
      twitch: 'Twitch',
    };
    
    return displayNames[platform.toLowerCase()] || platform;
  }
  
  /**
   * Revoke a starter pack completion (admin function)
   * Use with caution - this allows the fan to complete the task again
   */
  async revokeCompletion(completionId: string): Promise<boolean> {
    try {
      await db
        .delete(starterPackCompletions)
        .where(eq(starterPackCompletions.id, completionId));
      
      console.log(`[StarterPackService] Revoked completion ${completionId}`);
      return true;
    } catch (error) {
      console.error('[StarterPackService] Error revoking completion:', error);
      return false;
    }
  }
}

// Export singleton instance
export const starterPackService = new StarterPackService();
