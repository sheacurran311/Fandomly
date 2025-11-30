import type { IStorage } from '../../core/storage';
import type { Task, User, TaskCompletion } from '@shared/schema';

/**
 * Rewards Service
 * 
 * Handles all reward calculation, distribution, and validation logic
 * for the Fandomly rewards engine.
 */

export interface RewardCalculationResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  multiplier?: number;
  breakdown: Array<{
    source: string;
    amount: number;
    description: string;
  }>;
}

export class RewardsService {
  constructor(private storage: IStorage) {}

  /**
   * Calculate total rewards for completing a task
   */
  async calculateTaskRewards(
    task: Task,
    completion: TaskCompletion,
    user: User
  ): Promise<RewardCalculationResult> {
    const breakdown: Array<{ source: string; amount: number; description: string }> = [];
    
    // Base points from task
    const basePoints = task.pointsToReward || 0;
    breakdown.push({
      source: 'base_reward',
      amount: basePoints,
      description: `Base reward for completing ${task.name}`,
    });

    let bonusPoints = 0;

    // Handle task-specific bonuses
    switch (task.taskType) {
      case 'check_in':
        bonusPoints += await this.calculateCheckInBonus(task, completion, breakdown);
        break;
      case 'referral':
        bonusPoints += await this.calculateReferralBonus(task, completion, breakdown);
        break;
      case 'follower_milestone':
        bonusPoints += await this.calculateMilestoneBonus(task, completion, breakdown);
        break;
    }

    // Apply any active multipliers
    const multiplier = await this.getActiveMultiplier(user, task);
    
    const totalPoints = Math.floor((basePoints + bonusPoints) * (multiplier || 1));

    if (multiplier && multiplier > 1) {
      breakdown.push({
        source: 'multiplier',
        amount: totalPoints - (basePoints + bonusPoints),
        description: `${multiplier}x multiplier applied`,
      });
    }

    return {
      basePoints,
      bonusPoints,
      totalPoints,
      multiplier,
      breakdown,
    };
  }

  /**
   * Calculate check-in streak bonuses
   */
  private async calculateCheckInBonus(
    task: Task,
    completion: TaskCompletion,
    breakdown: Array<{ source: string; amount: number; description: string }>
  ): Promise<number> {
    let bonus = 0;
    const currentStreak = completion.completionData?.currentStreak || 0;
    const taskConfig = task.customSettings as any;
    const streakRewards = taskConfig?.streakRewards || [];

    // Check for streak milestone bonuses
    for (const milestone of streakRewards) {
      if (currentStreak === milestone.days) {
        bonus += milestone.bonusPoints;
        breakdown.push({
          source: 'streak_milestone',
          amount: milestone.bonusPoints,
          description: `${milestone.days}-day streak milestone!`,
        });
      }
    }

    return bonus;
  }

  /**
   * Calculate referral bonuses
   */
  private async calculateReferralBonus(
    task: Task,
    completion: TaskCompletion,
    breakdown: Array<{ source: string; amount: number; description: string }>
  ): Promise<number> {
    let bonus = 0;
    const taskConfig = task.customSettings as any;
    const referredUsers = completion.completionData?.referredUsers || [];
    
    // Count qualified referrals
    const qualifiedCount = referredUsers.filter((r: any) => r.qualified).length;
    
    if (taskConfig?.rewardStructure === 'percentage') {
      // Percentage-based rewards
      const percentagePerReferral = taskConfig?.percentagePerReferral || 10;
      const baseReward = task.pointsToReward || 0;
      const percentageBonus = Math.floor((baseReward * percentagePerReferral / 100) * qualifiedCount);
      
      if (percentageBonus > 0) {
        bonus += percentageBonus;
        breakdown.push({
          source: 'referral_percentage',
          amount: percentageBonus,
          description: `${percentagePerReferral}% bonus per ${qualifiedCount} qualified referral(s)`,
        });
      }
    } else {
      // Fixed amount per referral
      const fixedPerReferral = taskConfig?.fixedPerReferral || 0;
      const fixedBonus = fixedPerReferral * qualifiedCount;
      
      if (fixedBonus > 0) {
        bonus += fixedBonus;
        breakdown.push({
          source: 'referral_fixed',
          amount: fixedBonus,
          description: `${fixedPerReferral} points per ${qualifiedCount} qualified referral(s)`,
        });
      }
    }

    return bonus;
  }

  /**
   * Calculate follower milestone bonuses
   */
  private async calculateMilestoneBonus(
    task: Task,
    completion: TaskCompletion,
    breakdown: Array<{ source: string; amount: number; description: string }>
  ): Promise<number> {
    let bonus = 0;
    const taskConfig = task.customSettings as any;
    const milestonesReached = completion.completionData?.milestonesReached || [];
    
    // Award bonus for each new milestone reached
    const newMilestones = milestonesReached.filter((m: any) => {
      const reachedDate = new Date(m.reachedAt);
      const completionDate = completion.completedAt || new Date();
      return reachedDate.getTime() === completionDate.getTime();
    });

    for (const milestone of newMilestones) {
      bonus += milestone.pointsAwarded;
      breakdown.push({
        source: 'milestone_reached',
        amount: milestone.pointsAwarded,
        description: `Reached ${milestone.threshold} followers!`,
      });
    }

    return bonus;
  }

  /**
   * Get any active multipliers for the user
   */
  private async getActiveMultiplier(user: User, task: Task): Promise<number | undefined> {
    // TODO: Check for active multiplier tasks/rewards
    // For now, return base 1x (no multiplier)
    return undefined;
  }

  /**
   * Distribute rewards to a user
   */
  async distributeRewards(
    userId: string,
    taskId: string,
    completionId: string,
    tenantId: string,
    rewardResult: RewardCalculationResult,
    task: Task
  ) {
    const distributions = [];

    // Create main reward distribution
    const mainDistribution = await this.storage.createRewardDistribution({
      userId,
      taskId,
      taskCompletionId: completionId,
      tenantId,
      rewardType: 'points',
      amount: rewardResult.totalPoints,
      currency: task.pointCurrency || 'default',
      reason: 'task_completion',
      description: `Completed task: ${task.name}`,
      metadata: {
        taskName: task.name,
        taskType: task.taskType,
        basePoints: rewardResult.basePoints,
        bonusPoints: rewardResult.bonusPoints,
        multiplier: rewardResult.multiplier,
        breakdown: rewardResult.breakdown,
      },
    });

    distributions.push(mainDistribution);

    // Create individual distribution records for each bonus
    for (const item of rewardResult.breakdown) {
      if (item.source !== 'base_reward' && item.amount > 0) {
        const bonusDistribution = await this.storage.createRewardDistribution({
          userId,
          taskId,
          taskCompletionId: completionId,
          tenantId,
          rewardType: 'bonus',
          amount: item.amount,
          currency: task.pointCurrency || 'default',
          reason: item.source,
          description: item.description,
          metadata: {
            taskName: task.name,
            taskType: task.taskType,
          },
        });
        distributions.push(bonusDistribution);
      }
    }

    return distributions;
  }

  /**
   * Validate if a user can complete a task
   */
  async validateTaskCompletion(
    userId: string,
    taskId: string,
    tenantId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const task = await this.storage.getTask(taskId, tenantId);
    
    if (!task) {
      return { valid: false, reason: 'Task not found' };
    }

    if (task.isDraft) {
      return { valid: false, reason: 'Task is not published' };
    }

    // Check time constraints
    if (task.startTime && new Date() < new Date(task.startTime)) {
      return { valid: false, reason: 'Task has not started yet' };
    }

    if (task.endTime && new Date() > new Date(task.endTime)) {
      return { valid: false, reason: 'Task has ended' };
    }

    // Check if task is one-time and already completed
    if (task.rewardFrequency === 'one_time') {
      const completion = await this.storage.getTaskCompletionByUserAndTask(userId, taskId);
      if (completion && completion.status === 'completed') {
        return { valid: false, reason: 'Task already completed' };
      }
    }

    // Check prerequisites (if any)
    if (task.isRequired) {
      // TODO: Check if user has completed prerequisite tasks
    }

    return { valid: true };
  }

  /**
   * Process a check-in with streak tracking
   */
  async processCheckIn(
    userId: string,
    taskId: string,
    tenantId: string
  ): Promise<{
    completion: TaskCompletion;
    rewards: any[];
    pointsAwarded: number;
    streak: number;
    nextCheckIn: Date;
  }> {
    const task = await this.storage.getTask(taskId, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.taskType !== 'check_in') {
      throw new Error('This method is only for check-in tasks');
    }

    // Get or create completion
    let completion = await this.storage.getTaskCompletionByUserAndTask(userId, taskId);
    if (!completion) {
      completion = await this.storage.createTaskCompletion({
        taskId,
        userId,
        tenantId,
        status: 'in_progress',
        progress: 0,
        completionData: {
          currentStreak: 0,
          streakMilestones: [],
        },
        pointsEarned: 0,
        totalRewardsEarned: 0,
      });
    }

    const now = new Date();
    const lastCheckIn = completion.completionData?.lastCheckIn ? 
      new Date(completion.completionData.lastCheckIn) : null;

    // Check if already checked in today
    if (lastCheckIn) {
      const isToday = lastCheckIn.toDateString() === now.toDateString();
      if (isToday) {
        throw new Error('Already checked in today');
      }
    }

    // Calculate streak
    let currentStreak = completion.completionData?.currentStreak || 0;
    const isConsecutive = lastCheckIn && 
      (now.getTime() - lastCheckIn.getTime()) < (48 * 60 * 60 * 1000);

    if (isConsecutive) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    // Update completion data with new streak
    const updatedCompletionData = {
      ...completion.completionData,
      currentStreak,
      lastCheckIn: now.toISOString(),
      streakMilestones: completion.completionData?.streakMilestones || [],
    };

    // Update completion with new data before calculating rewards
    completion = await this.storage.updateTaskCompletion(completion.id, {
      completionData: updatedCompletionData,
      lastActivityAt: now,
    }) as TaskCompletion;

    // Calculate rewards including streak bonuses
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const rewardResult = await this.calculateTaskRewards(task, completion, user);

    // Distribute rewards
    const distributions = await this.distributeRewards(
      userId,
      taskId,
      completion.id,
      tenantId,
      rewardResult,
      task
    );

    // Update final completion with points
    const finalCompletion = await this.storage.updateTaskCompletion(completion.id, {
      pointsEarned: (completion.pointsEarned || 0) + rewardResult.totalPoints,
      totalRewardsEarned: (completion.totalRewardsEarned || 0) + rewardResult.totalPoints,
      lastActivityAt: now,
    });

    return {
      completion: finalCompletion!,
      rewards: distributions,
      pointsAwarded: rewardResult.totalPoints,
      streak: currentStreak,
      nextCheckIn: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}

