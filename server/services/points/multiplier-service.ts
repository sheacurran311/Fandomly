/**
 * Points Multiplier Service
 *
 * Calculates effective point multipliers for task completions considering:
 * - Task base multiplier
 * - Campaign multiplier
 * - Active event multipliers
 * - Streak bonuses
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '../../db';
import { activeMultipliers, tasks, campaigns, checkInStreaks } from '@shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

export interface MultiplierParams {
  userId: string;
  taskId?: string;
  campaignId?: string;
  tenantId?: string;
}

export interface MultiplierResult {
  multiplier: number;
  breakdown: Record<string, number>;
}

export class PointsMultiplierService {
  /**
   * Calculate the effective multiplier for a user's task completion.
   * Considers: task base multiplier, campaign multiplier, active event multipliers, streak bonuses
   */
  async calculateMultiplier(params: MultiplierParams): Promise<MultiplierResult> {
    const { userId, taskId, campaignId, tenantId } = params;

    let totalMultiplier = 1.0;
    const breakdown: Record<string, number> = { base: 1.0 };

    // 1. Get task base multiplier if taskId provided
    if (taskId) {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      if (task?.baseMultiplier) {
        const taskMultiplier = parseFloat(task.baseMultiplier.toString());
        if (taskMultiplier !== 1.0) {
          totalMultiplier *= taskMultiplier;
          breakdown.taskBase = taskMultiplier;
        }
      }
    }

    // 2. Get campaign multiplier if campaignId provided
    if (campaignId) {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, campaignId),
      });

      if (campaign?.campaignMultiplier) {
        const campaignMultiplier = parseFloat(campaign.campaignMultiplier.toString());
        if (campaignMultiplier !== 1.0) {
          totalMultiplier *= campaignMultiplier;
          breakdown.campaign = campaignMultiplier;
        }
      }
    }

    // 3. Check active event multipliers (from activeMultipliers table)
    const now = new Date();
    const eventMultipliers = await this.getActiveEventMultipliers(tenantId, now, taskId);

    for (const mult of eventMultipliers) {
      const multiplierValue = parseFloat(mult.multiplier.toString());
      totalMultiplier *= multiplierValue;
      breakdown[`event_${mult.name}`] = multiplierValue;
    }

    // 4. Check user streak bonus
    if (taskId && userId) {
      const streakMultiplier = await this.getStreakMultiplier(userId, taskId);
      if (streakMultiplier > 1.0) {
        totalMultiplier *= streakMultiplier;
        breakdown.streak = streakMultiplier;
      }
    }

    return {
      multiplier: Math.round(totalMultiplier * 100) / 100, // Round to 2 decimal places
      breakdown,
    };
  }

  /**
   * Get all currently active multiplier events
   */
  async getActiveMultipliers(tenantId?: string): Promise<any[]> {
    const now = new Date();

    const multipliers = await db.query.activeMultipliers.findMany({
      where: and(
        eq(activeMultipliers.isActive, true),
        or(
          isNull(activeMultipliers.tenantId),
          tenantId ? eq(activeMultipliers.tenantId, tenantId) : undefined
        )
      ),
    });

    // Filter by date conditions
    return multipliers.filter((m) => {
      const conditions = m.conditions as any;
      if (!conditions) return true;

      // Check date range
      if (conditions.startDate && new Date(conditions.startDate) > now) return false;
      if (conditions.endDate && new Date(conditions.endDate) < now) return false;

      return true;
    });
  }

  /**
   * Get active event multipliers that apply to the current context
   */
  private async getActiveEventMultipliers(
    tenantId: string | undefined,
    now: Date,
    taskId?: string
  ): Promise<any[]> {
    const multipliers = await db.query.activeMultipliers.findMany({
      where: and(
        eq(activeMultipliers.isActive, true),
        or(
          isNull(activeMultipliers.tenantId),
          tenantId ? eq(activeMultipliers.tenantId, tenantId) : undefined
        )
      ),
    });

    // Filter multipliers based on conditions
    return multipliers.filter((m) => {
      const conditions = m.conditions as any;
      if (!conditions) return true;

      // Check date range
      if (conditions.startDate && new Date(conditions.startDate) > now) return false;
      if (conditions.endDate && new Date(conditions.endDate) < now) return false;

      // Check day of week
      if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
        const currentDay = now.getDay();
        if (!conditions.daysOfWeek.includes(currentDay)) return false;
      }

      // Check time ranges
      if (conditions.timeRanges && conditions.timeRanges.length > 0) {
        const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
        const inRange = conditions.timeRanges.some((range: { start: string; end: string }) => {
          return currentTime >= range.start && currentTime <= range.end;
        });
        if (!inRange) return false;
      }

      // Check task-specific conditions
      if (taskId && conditions.applicableTaskIds && conditions.applicableTaskIds.length > 0) {
        if (!conditions.applicableTaskIds.includes(taskId)) return false;
      }

      return true;
    });
  }

  /**
   * Calculate streak-based multiplier for a user
   */
  private async getStreakMultiplier(userId: string, taskId: string): Promise<number> {
    const streak = await db.query.checkInStreaks.findFirst({
      where: and(eq(checkInStreaks.userId, userId), eq(checkInStreaks.taskId, taskId)),
    });

    if (!streak || !streak.currentStreak) return 1.0;

    // Apply streak bonuses (example: every 7 days adds 0.1x)
    // Adjust this logic based on your business rules
    const streakDays = streak.currentStreak;
    if (streakDays >= 30) return 1.5; // 30+ day streak: 1.5x
    if (streakDays >= 14) return 1.3; // 14+ day streak: 1.3x
    if (streakDays >= 7) return 1.2; // 7+ day streak: 1.2x
    if (streakDays >= 3) return 1.1; // 3+ day streak: 1.1x

    return 1.0;
  }
}

// Export singleton instance
export const pointsMultiplierService = new PointsMultiplierService();
