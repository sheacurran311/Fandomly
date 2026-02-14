import { groupGoalService } from '../services/group-goals/group-goal-service';
import { db } from '../db';
import { socialConnections, creators } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Group Goal Poller Job
 * 
 * Background job that polls platform APIs to check progress on active group goals.
 * Runs on a schedule (every 15 minutes recommended) to:
 * 
 * 1. Fetch all active group goals
 * 2. Get current metric values from platform APIs
 * 3. Update goal progress
 * 4. Complete goals that have met their targets
 * 5. Expire goals that have passed their end time
 */

// Platform API endpoints for metrics
const PLATFORM_METRICS = {
  instagram: {
    likes: async (mediaId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.like_count || 0;
    },
    comments: async (mediaId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=comments_count&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.comments_count || 0;
    },
  },
  youtube: {
    likes: async (videoId: string, accessToken: string) => {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      return parseInt(data.items?.[0]?.statistics?.likeCount || '0');
    },
    views: async (videoId: string, accessToken: string) => {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      return parseInt(data.items?.[0]?.statistics?.viewCount || '0');
    },
    comments: async (videoId: string, accessToken: string) => {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      return parseInt(data.items?.[0]?.statistics?.commentCount || '0');
    },
    subscribers: async (channelId: string, accessToken: string) => {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      return parseInt(data.items?.[0]?.statistics?.subscriberCount || '0');
    },
  },
  facebook: {
    likes: async (postId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=likes.limit(0).summary(true)&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.likes?.summary?.total_count || 0;
    },
    reactions: async (postId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=reactions.limit(0).summary(true)&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.reactions?.summary?.total_count || 0;
    },
    comments: async (postId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=comments.limit(0).summary(true)&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.comments?.summary?.total_count || 0;
    },
    shares: async (postId: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=shares&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.shares?.count || 0;
    },
  },
  twitter: {
    // Twitter metrics would use Twitter API v2 Basic tier
    likes: async (tweetId: string, bearerToken: string) => {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
        { headers: { 'Authorization': `Bearer ${bearerToken}` } }
      );
      const data = await response.json();
      return data.data?.public_metrics?.like_count || 0;
    },
    shares: async (tweetId: string, bearerToken: string) => {
      // Retweet count
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
        { headers: { 'Authorization': `Bearer ${bearerToken}` } }
      );
      const data = await response.json();
      return data.data?.public_metrics?.retweet_count || 0;
    },
    comments: async (tweetId: string, bearerToken: string) => {
      // Reply count
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
        { headers: { 'Authorization': `Bearer ${bearerToken}` } }
      );
      const data = await response.json();
      return data.data?.public_metrics?.reply_count || 0;
    },
  },
  tiktok: {
    // TikTok would use Business/Marketing API
    likes: async (videoId: string, accessToken: string) => {
      // Placeholder - actual implementation depends on API access
      console.warn('[GroupGoalPoller] TikTok metrics not yet implemented');
      return 0;
    },
    views: async (videoId: string, accessToken: string) => {
      console.warn('[GroupGoalPoller] TikTok metrics not yet implemented');
      return 0;
    },
  },
};

/**
 * Get creator's access token for a platform
 */
async function getCreatorAccessToken(creatorId: string, platform: string): Promise<string | null> {
  // First, get the creator's user ID
  const creator = await db.query.creators.findFirst({
    where: eq(creators.id, creatorId),
  });
  
  if (!creator) {
    return null;
  }
  
  // Then get their social connection
  const connection = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.userId, creator.userId),
      eq(socialConnections.platform, platform),
      eq(socialConnections.isActive, true),
    ),
  });
  
  return connection?.accessToken || null;
}

/**
 * Fetch current metric value from platform API
 */
async function fetchMetricValue(
  platform: string,
  metricType: string,
  contentId: string,
  accessToken: string
): Promise<number | null> {
  const platformMetrics = PLATFORM_METRICS[platform as keyof typeof PLATFORM_METRICS];
  
  if (!platformMetrics) {
    console.warn(`[GroupGoalPoller] No metrics implementation for platform: ${platform}`);
    return null;
  }
  
  const metricFetcher = platformMetrics[metricType as keyof typeof platformMetrics];
  
  if (!metricFetcher) {
    console.warn(`[GroupGoalPoller] No metric fetcher for ${platform}/${metricType}`);
    return null;
  }
  
  try {
    return await metricFetcher(contentId, accessToken);
  } catch (error) {
    console.error(`[GroupGoalPoller] Error fetching ${platform}/${metricType}:`, error);
    return null;
  }
}

/**
 * Process a single group goal
 */
async function processGoal(goalId: string): Promise<void> {
  const goalData = await groupGoalService.getGoalProgress(goalId);
  
  if (!goalData) {
    console.warn(`[GroupGoalPoller] Goal ${goalId} not found`);
    return;
  }
  
  const { goal, progress } = goalData;
  
  // Check if goal has expired
  if (goal.endTime && new Date() > goal.endTime) {
    console.log(`[GroupGoalPoller] Goal ${goalId} has expired`);
    await groupGoalService.expireGoal(goalId);
    return;
  }
  
  // Check if goal hasn't started yet
  if (goal.startTime && new Date() < goal.startTime) {
    console.log(`[GroupGoalPoller] Goal ${goalId} hasn't started yet`);
    return;
  }
  
  // Skip if no content ID (can't fetch metrics)
  if (!goal.contentId) {
    console.warn(`[GroupGoalPoller] Goal ${goalId} has no content ID for metric tracking`);
    return;
  }
  
  // Get creator's access token
  const accessToken = await getCreatorAccessToken(goal.creatorId, goal.platform);
  
  if (!accessToken) {
    console.warn(`[GroupGoalPoller] No access token for creator ${goal.creatorId} on ${goal.platform}`);
    return;
  }
  
  // Fetch current metric value
  const currentValue = await fetchMetricValue(
    goal.platform,
    goal.metricType,
    goal.contentId,
    accessToken
  );
  
  if (currentValue === null) {
    console.warn(`[GroupGoalPoller] Could not fetch metric for goal ${goalId}`);
    return;
  }
  
  // Update progress
  const updatedProgress = await groupGoalService.updateProgress(goalId, currentValue);
  
  console.log(`[GroupGoalPoller] Goal ${goalId}: ${currentValue}/${goal.targetValue} (${updatedProgress.percentComplete}%)`);
  
  // Check if goal is complete
  if (updatedProgress.isComplete) {
    console.log(`[GroupGoalPoller] Goal ${goalId} completed! Distributing rewards...`);
    const result = await groupGoalService.completeGoal(goalId);
    console.log(`[GroupGoalPoller] Rewarded ${result.participantsRewarded} participants, ${result.totalPointsDistributed} points distributed`);
  }
}

/**
 * Main poller function
 * Run this on a schedule (e.g., every 15 minutes via cron)
 */
export async function pollGroupGoals(): Promise<{
  processed: number;
  completed: number;
  expired: number;
  errors: number;
}> {
  console.log('[GroupGoalPoller] Starting poll...');
  
  const stats = {
    processed: 0,
    completed: 0,
    expired: 0,
    errors: 0,
  };
  
  try {
    // Get all active goals
    const activeGoals = await groupGoalService.getAllActiveGoals();
    
    console.log(`[GroupGoalPoller] Found ${activeGoals.length} active goals`);
    
    for (const goal of activeGoals) {
      try {
        await processGoal(goal.id);
        stats.processed++;
        
        // Re-fetch to check status
        const updatedGoal = await groupGoalService.getGoal(goal.id);
        if (updatedGoal?.status === 'completed') {
          stats.completed++;
        } else if (updatedGoal?.status === 'expired') {
          stats.expired++;
        }
      } catch (error) {
        console.error(`[GroupGoalPoller] Error processing goal ${goal.id}:`, error);
        stats.errors++;
      }
    }
    
    console.log(`[GroupGoalPoller] Poll complete:`, stats);
  } catch (error) {
    console.error('[GroupGoalPoller] Fatal error:', error);
    stats.errors++;
  }
  
  return stats;
}

/**
 * Start the poller with a specified interval
 * Note: In production, use a proper job scheduler like node-cron or BullMQ
 */
export function startGroupGoalPoller(intervalMs = 15 * 60 * 1000): NodeJS.Timeout {
  console.log(`[GroupGoalPoller] Starting with ${intervalMs}ms interval`);
  
  // Run immediately
  pollGroupGoals().catch(console.error);
  
  // Then run on interval
  return setInterval(() => {
    pollGroupGoals().catch(console.error);
  }, intervalMs);
}

/**
 * Stop the poller
 */
export function stopGroupGoalPoller(timer: NodeJS.Timeout): void {
  clearInterval(timer);
  console.log('[GroupGoalPoller] Stopped');
}
