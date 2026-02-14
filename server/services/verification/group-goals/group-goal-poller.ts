/**
 * Group Goal Poller Service
 * 
 * Scheduled service that polls and tracks progress of group goals.
 * Runs periodically to fetch aggregate metrics from platform APIs
 * and update goal progress.
 */

import { db } from '@db';
import { 
  groupGoals, 
  groupGoalParticipants, 
  tasks, 
  taskCompletions,
  socialConnections,
  creators,
} from '@shared/schema';
import { eq, and, gt, lte, sql } from 'drizzle-orm';

// Import metric fetchers
import { fetchFacebookMetrics } from './metric-fetchers/facebook-metrics';
import { fetchInstagramMetrics } from './metric-fetchers/instagram-metrics';
import { fetchYouTubeMetrics } from './metric-fetchers/youtube-metrics';
import { fetchTwitterMetrics } from './metric-fetchers/twitter-metrics';
import { fetchTwitchMetrics } from './metric-fetchers/twitch-metrics';

export interface MetricFetchResult {
  success: boolean;
  currentValue: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for the poller
 */
export interface PollerConfig {
  /** Interval between polls in minutes */
  pollIntervalMinutes: number;
  /** Maximum number of goals to process per run */
  batchSize: number;
  /** Whether to log progress */
  verbose: boolean;
}

const DEFAULT_CONFIG: PollerConfig = {
  pollIntervalMinutes: 5,
  batchSize: 50,
  verbose: true,
};

class GroupGoalPollerService {
  private config: PollerConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<PollerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the poller
   */
  start() {
    if (this.isRunning) {
      console.log('[GroupGoalPoller] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[GroupGoalPoller] Starting with ${this.config.pollIntervalMinutes} minute interval`);

    // Run immediately
    this.pollActiveGoals();

    // Set up interval
    this.intervalId = setInterval(
      () => this.pollActiveGoals(),
      this.config.pollIntervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the poller
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[GroupGoalPoller] Stopped');
  }

  /**
   * Main polling function
   */
  async pollActiveGoals() {
    const startTime = Date.now();
    
    if (this.config.verbose) {
      console.log('[GroupGoalPoller] Starting poll run...');
    }

    try {
      // Get active goals that haven't expired
      const activeGoals = await db.query.groupGoals.findMany({
        where: and(
          eq(groupGoals.status, 'active'),
          gt(groupGoals.endTime, new Date()),
        ),
        limit: this.config.batchSize,
      });

      if (this.config.verbose) {
        console.log(`[GroupGoalPoller] Found ${activeGoals.length} active goals`);
      }

      let updated = 0;
      let completed = 0;
      let failed = 0;

      for (const goal of activeGoals) {
        try {
          const result = await this.processGoal(goal);
          
          if (result.completed) {
            completed++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`[GroupGoalPoller] Error processing goal ${goal.id}:`, error);
          failed++;
        }
      }

      const duration = Date.now() - startTime;
      
      if (this.config.verbose) {
        console.log(`[GroupGoalPoller] Completed in ${duration}ms - Updated: ${updated}, Completed: ${completed}, Failed: ${failed}`);
      }
    } catch (error) {
      console.error('[GroupGoalPoller] Poll run failed:', error);
    }
  }

  /**
   * Process a single goal
   */
  private async processGoal(goal: typeof groupGoals.$inferSelect): Promise<{ completed: boolean }> {
    // Get the task to find creator's social connection
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, goal.taskId),
    });

    if (!task) {
      console.warn(`[GroupGoalPoller] Task not found for goal ${goal.id}`);
      return { completed: false };
    }

    // Get creator's user ID and social connection for this platform
    const creator = task.creatorId ? await db.query.creators.findFirst({
      where: eq(creators.id, task.creatorId),
    }) : null;
    const creatorUserId = creator?.userId;
    if (!creatorUserId) {
      console.warn(`[GroupGoalPoller] Creator not found for goal ${goal.id}`);
      return { completed: false };
    }
    const creatorConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, creatorUserId),
        eq(socialConnections.platform, goal.platform as any),
        eq(socialConnections.isActive, true),
      ),
    });

    if (!creatorConnection?.accessToken) {
      console.warn(`[GroupGoalPoller] No access token for goal ${goal.id}`);
      return { completed: false };
    }

    // Fetch current metric
    const metricResult = await this.fetchMetric(goal, creatorConnection.accessToken);

    if (!metricResult.success) {
      console.warn(`[GroupGoalPoller] Failed to fetch metric for goal ${goal.id}: ${metricResult.error}`);
      return { completed: false };
    }

    const currentValue = metricResult.currentValue;
    const previousValue = goal.currentValue || 0;

    // Update progress
    await db
      .update(groupGoals)
      .set({
        currentValue,
        lastCheckedAt: new Date(),
        checkCount: (goal.checkCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(groupGoals.id, goal.id));

    // Check if goal is complete
    if (currentValue >= goal.targetValue) {
      await this.completeGoal(goal);
      return { completed: true };
    }

    return { completed: false };
  }

  /**
   * Fetch metric from platform API
   */
  private async fetchMetric(
    goal: typeof groupGoals.$inferSelect,
    accessToken: string
  ): Promise<MetricFetchResult> {
    const platform = goal.platform.toLowerCase();
    const metricType = goal.metricType;
    const contentId = goal.contentId || '';

    switch (platform) {
      case 'facebook':
        return fetchFacebookMetrics(contentId, metricType, accessToken);
        
      case 'instagram':
        return fetchInstagramMetrics(contentId, metricType, accessToken);
        
      case 'youtube':
        return fetchYouTubeMetrics(contentId, metricType, accessToken);
        
      case 'twitter':
        return fetchTwitterMetrics(contentId, metricType, accessToken);
        
      case 'twitch':
        return fetchTwitchMetrics(contentId, metricType, accessToken);
        
      default:
        return {
          success: false,
          currentValue: 0,
          error: `Unsupported platform: ${platform}`,
        };
    }
  }

  /**
   * Complete a goal and distribute rewards
   */
  private async completeGoal(goal: typeof groupGoals.$inferSelect) {
    console.log(`[GroupGoalPoller] Completing goal ${goal.id}`);

    // Update goal status
    await db
      .update(groupGoals)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupGoals.id, goal.id));

    // Distribute rewards to all participants
    await this.distributeRewards(goal);
  }

  /**
   * Distribute rewards to all participants
   */
  private async distributeRewards(goal: typeof groupGoals.$inferSelect) {
    // Get all participants
    const participants = await db.query.groupGoalParticipants.findMany({
      where: eq(groupGoalParticipants.groupGoalId, goal.id),
    });

    console.log(`[GroupGoalPoller] Distributing rewards to ${participants.length} participants`);

    // Get the task for reward info
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, goal.taskId),
    });

    if (!task) {
      console.error(`[GroupGoalPoller] Task not found for reward distribution`);
      return;
    }

    const pointsPerParticipant = task.pointsToReward || goal.pointsPerParticipant || 0;

    for (const participant of participants) {
      try {
        // Create task completion for participant
        await db.insert(taskCompletions).values({
          taskId: goal.taskId!,
          userId: participant.fanId,
          tenantId: goal.tenantId,
          status: 'completed',
          pointsEarned: pointsPerParticipant,
          verifiedAt: new Date(),
          verificationMethod: 'auto',
          completionData: {
            metadata: {
              type: 'group_goal',
              groupGoalId: goal.id,
              goalTitle: task.name,
              completedAt: new Date().toISOString(),
            },
          },
        });

        // Update participant record
        await db
          .update(groupGoalParticipants)
          .set({
            rewardedAt: new Date(),
            pointsAwarded: pointsPerParticipant,
          })
          .where(eq(groupGoalParticipants.id, participant.id));

        console.log(`[GroupGoalPoller] Awarded ${pointsPerParticipant} points to ${participant.fanId}`);
      } catch (error) {
        console.error(`[GroupGoalPoller] Failed to reward participant ${participant.fanId}:`, error);
      }
    }
  }

  /**
   * Manually trigger a poll (for testing or admin actions)
   */
  async triggerPoll() {
    return this.pollActiveGoals();
  }

  /**
   * Get poller status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}

// Export singleton
export const groupGoalPoller = new GroupGoalPollerService();
