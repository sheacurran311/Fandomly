/**
 * Multiplier Service
 *
 * Calculates applicable point multipliers for task completions based on:
 * - Task-specific base multipliers
 * - Time-based multipliers (weekends, holidays, specific hours)
 * - Streak-based multipliers (consecutive day streaks)
 * - Tier-based multipliers (user membership levels)
 * - Event multipliers (special promotions)
 */

import { db } from '../db';
import { activeMultipliers, tasks, checkInStreaks } from '@shared/schema';
import { eq, and, gte, lte, isNull, or } from 'drizzle-orm';

export interface MultiplierCalculationRequest {
  userId: string;
  taskId: string;
  tenantId: string;
  taskType?: string;
  platform?: string;
  userTier?: string; // 'basic' | 'premium' | 'vip'
  userPointsBalance?: number;
}

export interface ApplicableMultiplier {
  id: string;
  name: string;
  type: string;
  value: number;
  priority: number;
  stackingType: 'additive' | 'multiplicative';
  reason: string;
}

export interface MultiplierCalculationResult {
  baseMultiplier: number;
  activeMultipliers: ApplicableMultiplier[];
  finalMultiplier: number;
  breakdown: string[];
  totalMultiplier: number;
}

export class MultiplierService {
  /**
   * Calculate total multiplier for a task completion
   */
  async calculateMultiplier(request: MultiplierCalculationRequest): Promise<MultiplierCalculationResult> {
    const { userId, taskId, tenantId, taskType, platform, userTier, userPointsBalance } = request;

    // 1. Get task-specific base multiplier
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    const baseMultiplier = task?.baseMultiplier ? parseFloat(task.baseMultiplier.toString()) : 1.0;
    const multiplierConfig = task?.multiplierConfig;
    const breakdown: string[] = [];

    if (baseMultiplier !== 1.0) {
      breakdown.push(`Task base multiplier: ${baseMultiplier}x`);
    }

    // 2. Get applicable active multipliers
    const now = new Date();
    const applicableMultipliers: ApplicableMultiplier[] = [];

    // Fetch all active multipliers for tenant and platform-wide
    const multipliers = await db.query.activeMultipliers.findMany({
      where: and(
        or(
          eq(activeMultipliers.tenantId, tenantId),
          isNull(activeMultipliers.tenantId) // Platform-wide multipliers
        ),
        eq(activeMultipliers.isActive, true)
      ),
    });

    // 3. Filter multipliers based on conditions
    for (const multiplier of multipliers) {
      const conditions = multiplier.conditions as any;
      const isApplicable = await this.checkMultiplierConditions({
        multiplier,
        conditions,
        now,
        userId,
        taskId,
        taskType,
        platform,
        userTier,
        userPointsBalance,
      });

      if (isApplicable) {
        applicableMultipliers.push({
          id: multiplier.id,
          name: multiplier.name,
          type: multiplier.type,
          value: parseFloat(multiplier.multiplier.toString()),
          priority: multiplier.priority || 0,
          stackingType: (multiplier.stackingType as 'additive' | 'multiplicative') || 'multiplicative',
          reason: this.getMultiplierReason(multiplier.type, conditions),
        });
      }
    }

    // 4. Sort by priority (higher priority first)
    applicableMultipliers.sort((a, b) => b.priority - a.priority);

    // 5. Calculate final multiplier based on stacking rules
    let finalMultiplier = baseMultiplier;
    const stackingType = multiplierConfig?.stackingType || 'multiplicative';

    if (stackingType === 'additive') {
      // Additive: sum all multipliers
      const additionalMultiplier = applicableMultipliers.reduce((sum, m) => sum + (m.value - 1), 0);
      finalMultiplier = baseMultiplier + additionalMultiplier;
    } else {
      // Multiplicative: multiply all multipliers
      finalMultiplier = applicableMultipliers.reduce((product, m) => product * m.value, baseMultiplier);
    }

    // 6. Apply max multiplier cap if configured
    const maxMultiplier = multiplierConfig?.maxMultiplier;
    if (maxMultiplier && finalMultiplier > maxMultiplier) {
      breakdown.push(`Multiplier capped at ${maxMultiplier}x (from ${finalMultiplier.toFixed(2)}x)`);
      finalMultiplier = maxMultiplier;
    }

    // 7. Add active multipliers to breakdown
    applicableMultipliers.forEach(m => {
      breakdown.push(`${m.name}: ${m.value}x (${m.reason})`);
    });

    return {
      baseMultiplier,
      activeMultipliers: applicableMultipliers,
      finalMultiplier: Math.round(finalMultiplier * 100) / 100, // Round to 2 decimals
      breakdown,
      totalMultiplier: finalMultiplier,
    };
  }

  /**
   * Check if a multiplier's conditions are met
   */
  private async checkMultiplierConditions(params: {
    multiplier: any;
    conditions: any;
    now: Date;
    userId: string;
    taskId: string;
    taskType?: string;
    platform?: string;
    userTier?: string;
    userPointsBalance?: number;
  }): Promise<boolean> {
    const { multiplier, conditions, now, userId, taskId, taskType, platform, userTier, userPointsBalance } = params;

    if (!conditions) return true; // No conditions = always applicable

    // Time-based conditions
    if (conditions.startDate && new Date(conditions.startDate) > now) return false;
    if (conditions.endDate && new Date(conditions.endDate) < now) return false;

    // Day of week condition
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      if (!conditions.daysOfWeek.includes(currentDay)) return false;
    }

    // Time range condition (e.g., only between 6pm-10pm)
    if (conditions.timeRanges && conditions.timeRanges.length > 0) {
      const timeInRange = conditions.timeRanges.some((range: { start: string; end: string }) => {
        const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
        return currentTime >= range.start && currentTime <= range.end;
      });
      if (!timeInRange) return false;
    }

    // Streak-based conditions
    if (conditions.requiredStreak) {
      const streak = await db.query.checkInStreaks.findFirst({
        where: and(
          eq(checkInStreaks.userId, userId),
          eq(checkInStreaks.taskId, taskId)
        ),
      });
      if (!streak || (streak.currentStreak ?? 0) < conditions.requiredStreak) return false;
    }

    // Tier-based conditions
    if (conditions.requiredTier && userTier !== conditions.requiredTier) return false;
    if (conditions.minPointsBalance && (!userPointsBalance || userPointsBalance < conditions.minPointsBalance)) return false;

    // Task/platform conditions
    if (conditions.applicableTaskTypes && taskType && !conditions.applicableTaskTypes.includes(taskType)) return false;
    if (conditions.applicableTaskIds && !conditions.applicableTaskIds.includes(taskId)) return false;
    if (conditions.applicablePlatforms && platform && !conditions.applicablePlatforms.includes(platform)) return false;

    // User registration conditions
    // TODO: Add user registration date check if needed

    return true;
  }

  /**
   * Get human-readable reason for multiplier
   */
  private getMultiplierReason(type: string, conditions: any): string {
    switch (type) {
      case 'time_based':
        if (conditions.daysOfWeek) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayNames = conditions.daysOfWeek.map((d: number) => days[d]).join(', ');
          return `Active on ${dayNames}`;
        }
        if (conditions.timeRanges) {
          return `Active during specific hours`;
        }
        return 'Time-based bonus';

      case 'streak_based':
        return `${conditions.requiredStreak}+ day streak bonus`;

      case 'tier_based':
        return `${conditions.requiredTier} tier bonus`;

      case 'event':
        return 'Special event bonus';

      default:
        return 'Active multiplier';
    }
  }

  /**
   * Get active multipliers for display (e.g., showing "2x Weekend Bonus" badge)
   */
  async getActiveMultipliersForTask(taskId: string, tenantId: string): Promise<ApplicableMultiplier[]> {
    const now = new Date();
    const applicableMultipliers: ApplicableMultiplier[] = [];

    const multipliers = await db.query.activeMultipliers.findMany({
      where: and(
        or(
          eq(activeMultipliers.tenantId, tenantId),
          isNull(activeMultipliers.tenantId)
        ),
        eq(activeMultipliers.isActive, true)
      ),
    });

    for (const multiplier of multipliers) {
      const conditions = multiplier.conditions as any;

      // Basic time checks (without user-specific checks)
      let isCurrentlyActive = true;

      if (conditions.startDate && new Date(conditions.startDate) > now) isCurrentlyActive = false;
      if (conditions.endDate && new Date(conditions.endDate) < now) isCurrentlyActive = false;

      if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
        const currentDay = now.getDay();
        if (!conditions.daysOfWeek.includes(currentDay)) isCurrentlyActive = false;
      }

      // Check if task-specific
      if (conditions.applicableTaskIds && !conditions.applicableTaskIds.includes(taskId)) {
        isCurrentlyActive = false;
      }

      if (isCurrentlyActive) {
        applicableMultipliers.push({
          id: multiplier.id,
          name: multiplier.name,
          type: multiplier.type,
          value: parseFloat(multiplier.multiplier.toString()),
          priority: multiplier.priority || 0,
          stackingType: (multiplier.stackingType as 'additive' | 'multiplicative') || 'multiplicative',
          reason: this.getMultiplierReason(multiplier.type, conditions),
        });
      }
    }

    return applicableMultipliers;
  }
}

// Export singleton instance
export const multiplierService = new MultiplierService();
