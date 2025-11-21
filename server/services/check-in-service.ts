/**
 * Check-in Service
 *
 * Manages daily check-ins and streak tracking.
 * Reference: https://docs.snagsolutions.io/loyalty/rules/check-in
 *
 * Features:
 * - Track daily check-ins
 * - Calculate and update streaks
 * - Award streak bonus multipliers (7-day, 30-day milestones)
 * - Reset streaks on missed days
 * - Provide streak statistics
 */

import { db } from '../../../db';
import { checkInStreaks, taskCompletions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface CheckInRequest {
  userId: string;
  taskId: string;
  tenantId: string;
}

export interface CheckInResult {
  success: boolean;
  newStreak: number;
  previousStreak: number;
  totalCheckIns: number;
  longestStreak: number;
  isNewRecord: boolean;
  streakMilestone?: {
    days: number;
    bonusMultiplier: number;
  };
  message: string;
  nextCheckInAvailableAt: Date;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastCheckIn?: Date;
  nextMilestone?: {
    days: number;
    bonusMultiplier: number;
    daysRemaining: number;
  };
  isEligibleToday: boolean;
}

export class CheckInService {
  // Streak milestones with bonus multipliers
  private readonly MILESTONES = [
    { days: 3, bonusMultiplier: 1.1, message: '3-day streak!' },
    { days: 7, bonusMultiplier: 1.25, message: '7-day streak!' },
    { days: 14, bonusMultiplier: 1.5, message: '2-week streak!' },
    { days: 30, bonusMultiplier: 2.0, message: '30-day streak!' },
    { days: 60, bonusMultiplier: 2.5, message: '60-day streak!' },
    { days: 90, bonusMultiplier: 3.0, message: '90-day streak!' },
    { days: 180, bonusMultiplier: 4.0, message: '180-day streak!' },
    { days: 365, bonusMultiplier: 5.0, message: '1-year streak!' },
  ];

  /**
   * Process daily check-in
   */
  async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    const { userId, taskId, tenantId } = request;

    // Get or create streak record
    let streakRecord = await db.query.checkInStreaks.findFirst({
      where: and(
        eq(checkInStreaks.userId, userId),
        eq(checkInStreaks.taskId, taskId)
      ),
    });

    const now = new Date();
    const previousStreak = streakRecord?.currentStreak || 0;

    if (!streakRecord) {
      // First check-in ever
      const [newStreak] = await db
        .insert(checkInStreaks)
        .values({
          userId,
          taskId,
          tenantId,
          currentStreak: 1,
          longestStreak: 1,
          totalCheckIns: 1,
          lastCheckIn: now,
          lastStreakReset: null,
          metadata: {
            streakMilestones: [],
            missedDays: 0,
          },
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const nextAvailable = this.getNextCheckInTime(now);

      return {
        success: true,
        newStreak: 1,
        previousStreak: 0,
        totalCheckIns: 1,
        longestStreak: 1,
        isNewRecord: true,
        message: 'First check-in! Start your streak today! 🎉',
        nextCheckInAvailableAt: nextAvailable,
      };
    }

    // Check if already checked in today
    const lastCheckIn = new Date(streakRecord.lastCheckIn!);
    if (this.isSameDay(now, lastCheckIn)) {
      const nextAvailable = this.getNextCheckInTime(lastCheckIn);

      return {
        success: false,
        newStreak: streakRecord.currentStreak,
        previousStreak: streakRecord.currentStreak,
        totalCheckIns: streakRecord.totalCheckIns,
        longestStreak: streakRecord.longestStreak,
        isNewRecord: false,
        message: 'You already checked in today! Come back tomorrow. 📅',
        nextCheckInAvailableAt: nextAvailable,
      };
    }

    // Check if streak is broken (missed yesterday)
    const wasYesterday = this.isYesterday(lastCheckIn, now);
    let newStreak: number;
    let streakReset = false;

    if (wasYesterday) {
      // Continuing streak
      newStreak = streakRecord.currentStreak + 1;
    } else {
      // Streak broken - reset to 1
      newStreak = 1;
      streakReset = true;
    }

    const totalCheckIns = streakRecord.totalCheckIns + 1;
    const longestStreak = Math.max(newStreak, streakRecord.longestStreak);
    const isNewRecord = longestStreak > streakRecord.longestStreak;

    // Check for milestone achievement
    const milestone = this.checkMilestone(newStreak);
    const metadata = streakRecord.metadata as any || {};
    const streakMilestones = metadata.streakMilestones || [];

    if (milestone && !this.hasMilestone(streakMilestones, milestone.days)) {
      streakMilestones.push({
        days: milestone.days,
        awardedAt: now.toISOString(),
      });
    }

    // Update streak record
    await db
      .update(checkInStreaks)
      .set({
        currentStreak: newStreak,
        longestStreak,
        totalCheckIns,
        lastCheckIn: now,
        lastStreakReset: streakReset ? now : streakRecord.lastStreakReset,
        metadata: {
          ...metadata,
          streakMilestones,
          missedDays: streakReset ? (metadata.missedDays || 0) + 1 : metadata.missedDays,
          longestStreakAchievedAt: isNewRecord ? now.toISOString() : metadata.longestStreakAchievedAt,
        },
        updatedAt: now,
      })
      .where(eq(checkInStreaks.id, streakRecord.id));

    const nextAvailable = this.getNextCheckInTime(now);

    // Build message
    let message = '';
    if (streakReset) {
      message = `Streak reset. Starting fresh! Current streak: ${newStreak} day 💪`;
    } else if (milestone) {
      message = `${milestone.message} ${milestone.bonusMultiplier}x bonus! 🔥`;
    } else if (isNewRecord) {
      message = `New personal record! ${newStreak}-day streak! 🏆`;
    } else {
      message = `Check-in successful! ${newStreak}-day streak! 🎯`;
    }

    return {
      success: true,
      newStreak,
      previousStreak,
      totalCheckIns,
      longestStreak,
      isNewRecord,
      streakMilestone: milestone,
      message,
      nextCheckInAvailableAt: nextAvailable,
    };
  }

  /**
   * Get user's streak statistics
   */
  async getStreakStats(userId: string, taskId: string): Promise<StreakStats> {
    const streakRecord = await db.query.checkInStreaks.findFirst({
      where: and(
        eq(checkInStreaks.userId, userId),
        eq(checkInStreaks.taskId, taskId)
      ),
    });

    if (!streakRecord) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCheckIns: 0,
        isEligibleToday: true,
      };
    }

    const now = new Date();
    const lastCheckIn = new Date(streakRecord.lastCheckIn!);

    // Check if streak is still valid (not missed today)
    const isStillValid = this.isSameDay(now, lastCheckIn) || this.isYesterday(lastCheckIn, now);
    const currentStreak = isStillValid ? streakRecord.currentStreak : 0;

    // Check eligibility for today
    const isEligibleToday = !this.isSameDay(now, lastCheckIn);

    // Get next milestone
    const nextMilestone = this.getNextMilestone(currentStreak);

    return {
      currentStreak,
      longestStreak: streakRecord.longestStreak,
      totalCheckIns: streakRecord.totalCheckIns,
      lastCheckIn: streakRecord.lastCheckIn || undefined,
      nextMilestone: nextMilestone
        ? {
            days: nextMilestone.days,
            bonusMultiplier: nextMilestone.bonusMultiplier,
            daysRemaining: nextMilestone.days - currentStreak,
          }
        : undefined,
      isEligibleToday,
    };
  }

  /**
   * Get streak multiplier for current streak
   */
  async getStreakMultiplier(userId: string, taskId: string): Promise<number> {
    const stats = await this.getStreakStats(userId, taskId);
    const milestone = this.checkMilestone(stats.currentStreak);
    return milestone?.bonusMultiplier || 1.0;
  }

  /**
   * Helper: Check if two dates are the same calendar day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Helper: Check if date1 is yesterday relative to date2
   */
  private isYesterday(date1: Date, date2: Date): boolean {
    const yesterday = new Date(date2);
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDay(date1, yesterday);
  }

  /**
   * Helper: Get next check-in time (midnight tomorrow)
   */
  private getNextCheckInTime(currentDate: Date): Date {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  /**
   * Helper: Check if streak has reached a milestone
   */
  private checkMilestone(streak: number): { days: number; bonusMultiplier: number; message: string } | null {
    // Return the highest milestone reached
    for (let i = this.MILESTONES.length - 1; i >= 0; i--) {
      if (streak >= this.MILESTONES[i].days) {
        return this.MILESTONES[i];
      }
    }
    return null;
  }

  /**
   * Helper: Get next milestone after current streak
   */
  private getNextMilestone(currentStreak: number): { days: number; bonusMultiplier: number; message: string } | null {
    for (const milestone of this.MILESTONES) {
      if (milestone.days > currentStreak) {
        return milestone;
      }
    }
    return null; // Already at max milestone
  }

  /**
   * Helper: Check if user already achieved a milestone
   */
  private hasMilestone(milestones: Array<{ days: number; awardedAt: string }>, days: number): boolean {
    return milestones.some(m => m.days === days);
  }

  /**
   * Get leaderboard of top streaks for a task
   */
  async getLeaderboard(taskId: string, limit: number = 10): Promise<Array<{
    userId: string;
    currentStreak: number;
    longestStreak: number;
    totalCheckIns: number;
    lastCheckIn: Date;
  }>> {
    const streaks = await db.query.checkInStreaks.findMany({
      where: eq(checkInStreaks.taskId, taskId),
    });

    // Sort by current streak (descending)
    const sorted = streaks
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, limit);

    return sorted.map(s => ({
      userId: s.userId,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      totalCheckIns: s.totalCheckIns,
      lastCheckIn: s.lastCheckIn!,
    }));
  }

  /**
   * Get check-in eligibility (for frequency service integration)
   */
  async isEligibleForCheckIn(userId: string, taskId: string): Promise<{
    isEligible: boolean;
    reason?: string;
    nextAvailableAt?: Date;
  }> {
    const stats = await this.getStreakStats(userId, taskId);

    if (stats.isEligibleToday) {
      return { isEligible: true };
    }

    const streakRecord = await db.query.checkInStreaks.findFirst({
      where: and(
        eq(checkInStreaks.userId, userId),
        eq(checkInStreaks.taskId, taskId)
      ),
    });

    const nextAvailable = this.getNextCheckInTime(new Date(streakRecord!.lastCheckIn!));

    return {
      isEligible: false,
      reason: 'You already checked in today',
      nextAvailableAt: nextAvailable,
    };
  }
}

// Export singleton instance
export const checkInService = new CheckInService();
