/**
 * Reputation Score Calculator
 *
 * Calculates a normalized 0-1000 reputation score from multiple off-chain signals.
 * This is a pure calculation module — no blockchain interaction, no DB writes.
 *
 * Scoring model:
 * 1. Collect raw signal values from the database
 * 2. Normalize each signal to 0-1000 using diminishing returns curves
 * 3. Apply configurable weights to each signal
 * 4. Sum weighted scores and clamp to 0-1000
 *
 * Designed for extensibility — add new signals by adding entries to SIGNAL_CONFIG.
 */

import { db } from '../../db';
import { sql, eq, count } from 'drizzle-orm';
import {
  fanPrograms,
  taskCompletions,
  socialConnections,
  checkInStreaks,
  fanReferrals,
  users,
} from '@shared/schema';

// ============================================================================
// SIGNAL CONFIGURATION
// ============================================================================

/**
 * Each signal defines:
 * - weight: relative importance (all weights sum to 1.0)
 * - maxRaw: the raw value that maps to 1000 (diminishing returns above this)
 * - curve: 'log' for logarithmic diminishing returns, 'linear' for linear scaling
 */
export const SIGNAL_CONFIG = {
  totalPoints: {
    weight: 0.3,
    maxRaw: 50000,
    curve: 'log' as const,
    description: 'Total points earned across all creator programs',
  },
  taskCompletions: {
    weight: 0.25,
    maxRaw: 200,
    curve: 'log' as const,
    description: 'Total verified task completions',
  },
  socialConnections: {
    weight: 0.15,
    maxRaw: 8,
    curve: 'linear' as const,
    description: 'Number of verified social platform connections',
  },
  streakDays: {
    weight: 0.1,
    maxRaw: 90,
    curve: 'log' as const,
    description: 'Longest active check-in streak in days',
  },
  referralCount: {
    weight: 0.1,
    maxRaw: 25,
    curve: 'log' as const,
    description: 'Number of successful referrals',
  },
  accountAgeDays: {
    weight: 0.1,
    maxRaw: 365,
    curve: 'linear' as const,
    description: 'Days since account creation',
  },
} as const;

export type SignalName = keyof typeof SIGNAL_CONFIG;

const MAX_SCORE = 1000;

// ============================================================================
// RAW SIGNAL COLLECTION
// ============================================================================

export interface RawSignals {
  totalPoints: number;
  taskCompletions: number;
  socialConnections: number;
  streakDays: number;
  referralCount: number;
  accountAgeDays: number;
}

export interface ScoreBreakdown {
  totalPoints: number;
  taskCompletions: number;
  socialConnections: number;
  streakDays: number;
  referralCount: number;
  accountAgeDays: number;
  weightedScores: Record<string, number>;
  normalizedScore: number;
}

/**
 * Collect raw signal values for a single user from the database.
 */
export async function collectSignals(userId: string): Promise<RawSignals> {
  // Run all queries in parallel for performance
  const [pointsResult, tasksResult, socialsResult, streakResult, referralResult, userResult] =
    await Promise.all([
      // Total points earned across all programs
      db
        .select({ total: sql<number>`COALESCE(SUM(${fanPrograms.totalPointsEarned}), 0)` })
        .from(fanPrograms)
        .where(eq(fanPrograms.fanId, userId)),

      // Total verified task completions
      db.select({ total: count() }).from(taskCompletions).where(eq(taskCompletions.userId, userId)),

      // Active social connections
      db
        .select({ total: count() })
        .from(socialConnections)
        .where(eq(socialConnections.userId, userId)),

      // Longest streak
      db
        .select({
          longest: sql<number>`COALESCE(MAX(${checkInStreaks.longestStreak}), 0)`,
        })
        .from(checkInStreaks)
        .where(eq(checkInStreaks.userId, userId)),

      // Successful referrals
      db
        .select({ total: count() })
        .from(fanReferrals)
        .where(eq(fanReferrals.referringFanId, userId)),

      // Account age
      db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)),
    ]);

  const accountCreatedAt = userResult[0]?.createdAt;
  const accountAgeDays = accountCreatedAt
    ? Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    totalPoints: Number(pointsResult[0]?.total) || 0,
    taskCompletions: Number(tasksResult[0]?.total) || 0,
    socialConnections: Number(socialsResult[0]?.total) || 0,
    streakDays: Number(streakResult[0]?.longest) || 0,
    referralCount: Number(referralResult[0]?.total) || 0,
    accountAgeDays,
  };
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize a raw value to 0-1000 using the specified curve.
 * - 'linear': linear scaling capped at maxRaw
 * - 'log': logarithmic diminishing returns — fast early gains, slower later
 */
function normalizeSignal(rawValue: number, maxRaw: number, curve: 'log' | 'linear'): number {
  if (rawValue <= 0) return 0;
  if (curve === 'linear') {
    return Math.min(MAX_SCORE, Math.round((rawValue / maxRaw) * MAX_SCORE));
  }
  // Logarithmic: score = MAX * log(1 + raw) / log(1 + maxRaw)
  const normalizedLog = Math.log(1 + rawValue) / Math.log(1 + maxRaw);
  return Math.min(MAX_SCORE, Math.round(normalizedLog * MAX_SCORE));
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

/**
 * Calculate the final reputation score from raw signals.
 * Returns both the final normalized score and the full breakdown.
 */
export function calculateScore(signals: RawSignals): ScoreBreakdown {
  const weightedScores: Record<string, number> = {};
  let totalWeightedScore = 0;

  for (const [signalName, config] of Object.entries(SIGNAL_CONFIG)) {
    const rawValue = signals[signalName as SignalName];
    const normalized = normalizeSignal(rawValue, config.maxRaw, config.curve);
    const weighted = normalized * config.weight;
    weightedScores[signalName] = Math.round(weighted);
    totalWeightedScore += weighted;
  }

  const normalizedScore = Math.min(MAX_SCORE, Math.max(0, Math.round(totalWeightedScore)));

  return {
    ...signals,
    weightedScores,
    normalizedScore,
  };
}

/**
 * Full pipeline: collect signals from DB and calculate score for a user.
 */
export async function calculateUserScore(
  userId: string
): Promise<{ score: number; breakdown: ScoreBreakdown }> {
  const signals = await collectSignals(userId);
  const breakdown = calculateScore(signals);
  return { score: breakdown.normalizedScore, breakdown };
}
