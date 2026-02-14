/**
 * Task Frequency Service
 *
 * Manages reward frequency limits for tasks:
 * - Checks if user is eligible to complete task based on frequency rules
 * - Calculates when task will be available again
 * - Supports: one_time, daily, weekly, monthly, custom intervals
 */

import { db } from '../db';
import { taskCompletions, tasks } from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';

export interface FrequencyCheckRequest {
  userId: string;
  taskId: string;
  tenantId?: string;
}

export interface FrequencyCheckResult {
  isEligible: boolean;
  reason?: string;
  nextAvailableAt?: Date;
  completionsCount?: number;
  lastCompletedAt?: Date;
}

export class TaskFrequencyService {
  /**
   * Check if user is eligible to complete a task based on frequency rules
   */
  async checkEligibility(request: FrequencyCheckRequest): Promise<FrequencyCheckResult> {
    const { userId, taskId } = request;

    // 1. Get task frequency configuration
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return {
        isEligible: false,
        reason: 'Task not found',
      };
    }

    const rewardFrequency = task.rewardFrequency; // 'one_time' | 'daily' | 'weekly' | 'monthly'

    // 2. Get user's completion history for this task
    const completions = await db.query.taskCompletions.findMany({
      where: and(
        eq(taskCompletions.userId, userId),
        eq(taskCompletions.taskId, taskId),
        eq(taskCompletions.status, 'completed')
      ),
      orderBy: [desc(taskCompletions.completedAt)],
    });

    const lastCompletion = completions[0];
    const completionsCount = completions.length;

    // 3. Check eligibility based on frequency type
    switch (rewardFrequency) {
      case 'one_time':
        return this.checkOneTime(completionsCount, lastCompletion);

      case 'daily':
        return this.checkDaily(lastCompletion);

      case 'weekly':
        return this.checkWeekly(lastCompletion);

      case 'monthly':
        return this.checkMonthly(lastCompletion);

      default:
        // If no frequency rule, always eligible
        return { isEligible: true };
    }
  }

  /**
   * Check one-time frequency (can only be completed once ever)
   */
  private checkOneTime(completionsCount: number, lastCompletion: any): FrequencyCheckResult {
    if (completionsCount > 0) {
      return {
        isEligible: false,
        reason: 'This task can only be completed once',
        completionsCount,
        lastCompletedAt: lastCompletion?.completedAt,
      };
    }

    return { isEligible: true };
  }

  /**
   * Check daily frequency (can be completed once per day)
   */
  private checkDaily(lastCompletion: any): FrequencyCheckResult {
    if (!lastCompletion || !lastCompletion.completedAt) {
      return { isEligible: true };
    }

    const now = new Date();
    const lastCompletedAt = new Date(lastCompletion.completedAt);

    // Check if last completion was today (same calendar day)
    const isSameDay = this.isSameCalendarDay(now, lastCompletedAt);

    if (isSameDay) {
      // Calculate next available time (midnight tomorrow)
      const nextAvailable = new Date(now);
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      nextAvailable.setHours(0, 0, 0, 0);

      return {
        isEligible: false,
        reason: 'This task can only be completed once per day',
        nextAvailableAt: nextAvailable,
        lastCompletedAt,
      };
    }

    return {
      isEligible: true,
      lastCompletedAt,
    };
  }

  /**
   * Check weekly frequency (can be completed once per week)
   */
  private checkWeekly(lastCompletion: any): FrequencyCheckResult {
    if (!lastCompletion || !lastCompletion.completedAt) {
      return { isEligible: true };
    }

    const now = new Date();
    const lastCompletedAt = new Date(lastCompletion.completedAt);

    // Check if last completion was this week (same week starting Monday)
    const isSameWeek = this.isSameWeek(now, lastCompletedAt);

    if (isSameWeek) {
      // Calculate next available time (Monday 00:00 next week)
      const nextAvailable = this.getNextMonday(now);

      return {
        isEligible: false,
        reason: 'This task can only be completed once per week',
        nextAvailableAt: nextAvailable,
        lastCompletedAt,
      };
    }

    return {
      isEligible: true,
      lastCompletedAt,
    };
  }

  /**
   * Check monthly frequency (can be completed once per calendar month)
   */
  private checkMonthly(lastCompletion: any): FrequencyCheckResult {
    if (!lastCompletion || !lastCompletion.completedAt) {
      return { isEligible: true };
    }

    const now = new Date();
    const lastCompletedAt = new Date(lastCompletion.completedAt);

    // Check if last completion was this month
    const isSameMonth =
      now.getFullYear() === lastCompletedAt.getFullYear() &&
      now.getMonth() === lastCompletedAt.getMonth();

    if (isSameMonth) {
      // Calculate next available time (1st of next month 00:00)
      const nextAvailable = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

      return {
        isEligible: false,
        reason: 'This task can only be completed once per month',
        nextAvailableAt: nextAvailable,
        lastCompletedAt,
      };
    }

    return {
      isEligible: true,
      lastCompletedAt,
    };
  }

  /**
   * Get time remaining until task is available again
   */
  async getTimeUntilAvailable(request: FrequencyCheckRequest): Promise<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null> {
    const eligibility = await this.checkEligibility(request);

    if (eligibility.isEligible || !eligibility.nextAvailableAt) {
      return null; // Already available
    }

    const now = new Date();
    const nextAvailable = eligibility.nextAvailableAt;
    const diff = nextAvailable.getTime() - now.getTime();

    if (diff <= 0) {
      return null; // Already available
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours,
      minutes,
      seconds,
      totalSeconds,
    };
  }

  /**
   * Helper: Check if two dates are the same calendar day
   */
  private isSameCalendarDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Helper: Check if two dates are in the same week (week starts Monday)
   */
  private isSameWeek(date1: Date, date2: Date): boolean {
    const mondayDate1 = this.getMondayOfWeek(date1);
    const mondayDate2 = this.getMondayOfWeek(date2);

    return this.isSameCalendarDay(mondayDate1, mondayDate2);
  }

  /**
   * Helper: Get Monday of the week for a given date
   */
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Helper: Get next Monday 00:00
   */
  private getNextMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day; // Days until next Monday
    const nextMonday = new Date(d);
    nextMonday.setDate(d.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }

  /**
   * Get user's completion stats for a task
   */
  async getCompletionStats(userId: string, taskId: string): Promise<{
    totalCompletions: number;
    lastCompletedAt?: Date;
    firstCompletedAt?: Date;
  }> {
    const completions = await db.query.taskCompletions.findMany({
      where: and(
        eq(taskCompletions.userId, userId),
        eq(taskCompletions.taskId, taskId),
        eq(taskCompletions.status, 'completed')
      ),
      orderBy: [desc(taskCompletions.completedAt)],
    });

    return {
      totalCompletions: completions.length,
      lastCompletedAt: completions[0]?.completedAt ?? undefined,
      firstCompletedAt: completions[completions.length - 1]?.completedAt ?? undefined,
    };
  }
}

// Export singleton instance
export const taskFrequencyService = new TaskFrequencyService();
