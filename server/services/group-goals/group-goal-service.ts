import { db } from '../../db';
import { groupGoals, groupGoalParticipants, tasks, users } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { GroupGoal, GroupGoalParticipant, InsertGroupGoal, InsertGroupGoalParticipant } from '@shared/schema';

/**
 * Group Goal Service
 * 
 * Manages community goals where all participants are rewarded when
 * the collective goal is met.
 * 
 * Example: "Help this post reach 10,000 likes - everyone enrolled gets 100 points!"
 * 
 * Supported metrics:
 * - followers, likes, views, comments, shares, reactions, subscribers
 * 
 * Features:
 * - Hashtag tracking for participation proof
 * - Progress tracking via scheduled polling
 * - Automatic reward distribution on completion
 */

export interface GroupGoalCreateParams {
  taskId: string;
  tenantId: string;
  creatorId: string;
  platform: string;
  metricType: 'followers' | 'likes' | 'views' | 'comments' | 'shares' | 'reactions' | 'subscribers';
  targetValue: number;
  hashtag?: string;
  contentId?: string;
  contentUrl?: string;
  pointsPerParticipant: number;
  bonusPointsOnCompletion?: number;
  startTime?: Date;
  endTime?: Date;
}

export interface JoinGoalResult {
  success: boolean;
  participantId?: string;
  error?: string;
  alreadyJoined?: boolean;
}

export interface GoalProgressResult {
  goalId: string;
  currentValue: number;
  targetValue: number;
  percentComplete: number;
  participantCount: number;
  status: string;
  isComplete: boolean;
}

export interface CompleteGoalResult {
  success: boolean;
  participantsRewarded: number;
  totalPointsDistributed: number;
  error?: string;
}

/**
 * Group Goal Service
 */
export class GroupGoalService {
  /**
   * Create a new group goal
   */
  async createGoal(params: GroupGoalCreateParams): Promise<GroupGoal> {
    const [goal] = await db
      .insert(groupGoals)
      .values({
        taskId: params.taskId,
        tenantId: params.tenantId,
        creatorId: params.creatorId,
        platform: params.platform as any,
        metricType: params.metricType as any,
        targetValue: params.targetValue,
        currentValue: 0,
        hashtag: params.hashtag || null,
        contentId: params.contentId || null,
        contentUrl: params.contentUrl || null,
        pointsPerParticipant: params.pointsPerParticipant,
        bonusPointsOnCompletion: params.bonusPointsOnCompletion || 0,
        status: 'active',
        startTime: params.startTime || null,
        endTime: params.endTime || null,
      })
      .returning();
    
    console.log(`[GroupGoalService] Created goal ${goal.id} for task ${params.taskId}`);
    return goal;
  }
  
  /**
   * Get a group goal by ID
   */
  async getGoal(goalId: string): Promise<GroupGoal | null> {
    const goal = await db.query.groupGoals.findFirst({
      where: eq(groupGoals.id, goalId),
    });
    
    return goal || null;
  }
  
  /**
   * Get group goal by task ID
   */
  async getGoalByTaskId(taskId: string): Promise<GroupGoal | null> {
    const goal = await db.query.groupGoals.findFirst({
      where: eq(groupGoals.taskId, taskId),
    });
    
    return goal || null;
  }
  
  /**
   * Get all active goals for a tenant
   */
  async getActiveGoals(tenantId: string): Promise<GroupGoal[]> {
    const goals = await db.query.groupGoals.findMany({
      where: and(
        eq(groupGoals.tenantId, tenantId),
        eq(groupGoals.status, 'active'),
      ),
      orderBy: desc(groupGoals.createdAt),
    });
    
    return goals;
  }
  
  /**
   * Get all goals (for polling job)
   */
  async getAllActiveGoals(): Promise<GroupGoal[]> {
    const goals = await db.query.groupGoals.findMany({
      where: eq(groupGoals.status, 'active'),
    });
    
    return goals;
  }
  
  /**
   * Fan joins a group goal
   */
  async joinGoal(goalId: string, fanId: string): Promise<JoinGoalResult> {
    try {
      // Check if goal exists and is active
      const goal = await this.getGoal(goalId);
      
      if (!goal) {
        return { success: false, error: 'Group goal not found' };
      }
      
      if (goal.status !== 'active') {
        return { success: false, error: `Group goal is ${goal.status}` };
      }
      
      // Check if already joined
      const existing = await db.query.groupGoalParticipants.findFirst({
        where: and(
          eq(groupGoalParticipants.groupGoalId, goalId),
          eq(groupGoalParticipants.fanId, fanId),
        ),
      });
      
      if (existing) {
        return { 
          success: true, 
          participantId: existing.id,
          alreadyJoined: true,
        };
      }
      
      // Add participant
      const [participant] = await db
        .insert(groupGoalParticipants)
        .values({
          groupGoalId: goalId,
          fanId,
        })
        .returning();
      
      console.log(`[GroupGoalService] Fan ${fanId} joined goal ${goalId}`);
      
      return {
        success: true,
        participantId: participant.id,
        alreadyJoined: false,
      };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: true, alreadyJoined: true };
      }
      
      console.error('[GroupGoalService] Error joining goal:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if a fan has joined a goal
   */
  async hasJoined(goalId: string, fanId: string): Promise<boolean> {
    const participant = await db.query.groupGoalParticipants.findFirst({
      where: and(
        eq(groupGoalParticipants.groupGoalId, goalId),
        eq(groupGoalParticipants.fanId, fanId),
      ),
    });
    
    return !!participant;
  }
  
  /**
   * Get all participants for a goal
   */
  async getParticipants(goalId: string): Promise<GroupGoalParticipant[]> {
    const participants = await db.query.groupGoalParticipants.findMany({
      where: eq(groupGoalParticipants.groupGoalId, goalId),
    });
    
    return participants;
  }
  
  /**
   * Get participant count for a goal
   */
  async getParticipantCount(goalId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(groupGoalParticipants)
      .where(eq(groupGoalParticipants.groupGoalId, goalId));
    
    return result[0]?.count || 0;
  }
  
  /**
   * Update goal progress (called by polling job)
   */
  async updateProgress(goalId: string, currentValue: number): Promise<GoalProgressResult> {
    const goal = await this.getGoal(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Update current value
    await db
      .update(groupGoals)
      .set({
        currentValue,
        lastCheckedAt: new Date(),
        checkCount: sql`${groupGoals.checkCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(groupGoals.id, goalId));
    
    const participantCount = await this.getParticipantCount(goalId);
    const percentComplete = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));
    const isComplete = currentValue >= goal.targetValue;
    
    return {
      goalId,
      currentValue,
      targetValue: goal.targetValue,
      percentComplete,
      participantCount,
      status: goal.status ?? 'active',
      isComplete,
    };
  }
  
  /**
   * Complete a goal and distribute rewards to all participants
   */
  async completeGoal(goalId: string): Promise<CompleteGoalResult> {
    const goal = await this.getGoal(goalId);
    
    if (!goal) {
      return { success: false, participantsRewarded: 0, totalPointsDistributed: 0, error: 'Goal not found' };
    }
    
    if (goal.status !== 'active') {
      return { success: false, participantsRewarded: 0, totalPointsDistributed: 0, error: `Goal is already ${goal.status}` };
    }
    
    // Get all participants who haven't been rewarded yet
    const participants = await db.query.groupGoalParticipants.findMany({
      where: and(
        eq(groupGoalParticipants.groupGoalId, goalId),
        // Only get participants who haven't been rewarded
        sql`${groupGoalParticipants.rewardedAt} IS NULL`,
      ),
    });
    
    if (participants.length === 0) {
      // Mark goal as completed even with no participants
      await db
        .update(groupGoals)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(groupGoals.id, goalId));
      
      return { success: true, participantsRewarded: 0, totalPointsDistributed: 0 };
    }
    
    // Calculate points per participant
    const basePoints = goal.pointsPerParticipant;
    const bonusPoints = goal.bonusPointsOnCompletion || 0;
    const totalPerParticipant = basePoints + bonusPoints;
    
    // Award points to each participant
    // Note: In a real implementation, you would also update the user's points balance
    const now = new Date();
    
    for (const participant of participants) {
      await db
        .update(groupGoalParticipants)
        .set({
          rewardedAt: now,
          pointsAwarded: totalPerParticipant,
        })
        .where(eq(groupGoalParticipants.id, participant.id));
      
      // TODO: Update user's points balance in users table or point_transactions table
      // This would typically be done via the rewards service
    }
    
    // Mark goal as completed
    await db
      .update(groupGoals)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(groupGoals.id, goalId));
    
    console.log(`[GroupGoalService] Completed goal ${goalId}, rewarded ${participants.length} participants`);
    
    return {
      success: true,
      participantsRewarded: participants.length,
      totalPointsDistributed: participants.length * totalPerParticipant,
    };
  }
  
  /**
   * Expire a goal (time limit reached without meeting target)
   */
  async expireGoal(goalId: string): Promise<boolean> {
    try {
      await db
        .update(groupGoals)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(groupGoals.id, goalId));
      
      console.log(`[GroupGoalService] Expired goal ${goalId}`);
      return true;
    } catch (error) {
      console.error('[GroupGoalService] Error expiring goal:', error);
      return false;
    }
  }
  
  /**
   * Cancel a goal (creator cancellation)
   */
  async cancelGoal(goalId: string): Promise<boolean> {
    try {
      await db
        .update(groupGoals)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(groupGoals.id, goalId));
      
      console.log(`[GroupGoalService] Cancelled goal ${goalId}`);
      return true;
    } catch (error) {
      console.error('[GroupGoalService] Error cancelling goal:', error);
      return false;
    }
  }
  
  /**
   * Get goal progress with participant info (for UI display)
   */
  async getGoalProgress(goalId: string): Promise<{
    goal: GroupGoal;
    progress: GoalProgressResult;
    recentParticipants: Array<{ id: string; joinedAt: Date }>;
  } | null> {
    const goal = await this.getGoal(goalId);
    
    if (!goal) {
      return null;
    }
    
    const participantCount = await this.getParticipantCount(goalId);
    const currVal = goal.currentValue ?? 0;
    const percentComplete = Math.min(100, Math.round((currVal / goal.targetValue) * 100));
    
    // Get recent participants (last 10)
    const recentParticipants = await db.query.groupGoalParticipants.findMany({
      where: eq(groupGoalParticipants.groupGoalId, goalId),
      orderBy: desc(groupGoalParticipants.joinedAt),
      limit: 10,
    });
    
    return {
      goal,
      progress: {
        goalId,
        currentValue: currVal,
        targetValue: goal.targetValue,
        percentComplete,
        participantCount,
        status: goal.status ?? 'active',
        isComplete: currVal >= goal.targetValue,
      },
      recentParticipants: recentParticipants.map(p => ({
        id: p.fanId,
        joinedAt: p.joinedAt || new Date(),
      })),
    };
  }
  
  /**
   * Get goals a fan has participated in
   */
  async getFanGoals(fanId: string, tenantId?: string): Promise<GroupGoal[]> {
    const participations = await db.query.groupGoalParticipants.findMany({
      where: eq(groupGoalParticipants.fanId, fanId),
    });
    
    const goalIds = participations.map(p => p.groupGoalId);
    
    if (goalIds.length === 0) {
      return [];
    }
    
    const goals = await db.query.groupGoals.findMany({
      where: and(
        sql`${groupGoals.id} IN ${goalIds}`,
        tenantId ? eq(groupGoals.tenantId, tenantId) : undefined,
      ),
    });
    
    return goals;
  }
}

// Export singleton instance
export const groupGoalService = new GroupGoalService();
