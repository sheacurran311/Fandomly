/**
 * Reputation Score Calculator
 *
 * Calculates a normalized 0-1000 reputation score from multiple off-chain signals.
 * This is a pure calculation module — no blockchain interaction, no DB writes.
 *
 * Scoring model:
 * 1. Detect user type (fan or creator) from the database
 * 2. Collect raw signal values appropriate for that user type
 * 3. Normalize each signal to 0-1000 using diminishing returns curves
 * 4. Apply configurable weights to each signal
 * 5. Sum weighted scores and clamp to 0-1000
 *
 * Fan and creator signal sets are independent — each set of weights sums to 1.0.
 * The ReputationRegistry contract is user-type agnostic (stores any address -> score).
 */

import { db } from '../../db';
import { sql, eq, and, count } from 'drizzle-orm';
import {
  fanPrograms,
  taskCompletions,
  socialConnections,
  checkInStreaks,
  fanReferrals,
  users,
  creators,
  loyaltyPrograms,
  tasks,
  rewards,
  rewardRedemptions,
} from '@shared/schema';

// ============================================================================
// SIGNAL CONFIGURATION
// ============================================================================

type UserType = 'fan' | 'creator' | 'both';

interface SignalConfig {
  weight: number;
  maxRaw: number;
  curve: 'log' | 'linear';
  description: string;
  userType: UserType;
}

/**
 * Each signal defines:
 * - weight: relative importance (fan weights sum to 1.0, creator weights sum to 1.0)
 * - maxRaw: the raw value that maps to 1000 (diminishing returns above this)
 * - curve: 'log' for logarithmic diminishing returns, 'linear' for linear scaling
 * - userType: which user type this signal applies to ('fan', 'creator', or 'both')
 */
export const SIGNAL_CONFIG: Record<string, SignalConfig> = {
  // ── Fan Signals ──────────────────────────────────────────────────────────
  totalPoints: {
    weight: 0.3,
    maxRaw: 50000,
    curve: 'log',
    description: 'Total points earned across all creator programs',
    userType: 'fan',
  },
  taskCompletions: {
    weight: 0.25,
    maxRaw: 200,
    curve: 'log',
    description: 'Total verified task completions',
    userType: 'fan',
  },
  socialConnections: {
    weight: 0.15,
    maxRaw: 8,
    curve: 'linear',
    description: 'Number of verified social platform connections',
    userType: 'fan',
  },
  streakDays: {
    weight: 0.1,
    maxRaw: 90,
    curve: 'log',
    description: 'Longest active check-in streak in days',
    userType: 'fan',
  },
  referralCount: {
    weight: 0.1,
    maxRaw: 25,
    curve: 'log',
    description: 'Number of successful referrals',
    userType: 'fan',
  },
  accountAgeDays: {
    weight: 0.1,
    maxRaw: 365,
    curve: 'linear',
    description: 'Days since account creation',
    userType: 'fan',
  },

  // ── Creator Signals ──────────────────────────────────────────────────────
  activeFanCount: {
    weight: 0.25,
    maxRaw: 1000,
    curve: 'log',
    description: 'Fans enrolled in creator programs',
    userType: 'creator',
  },
  programEngagement: {
    weight: 0.25,
    maxRaw: 10000,
    curve: 'log',
    description: 'Task completions across creator programs',
    userType: 'creator',
  },
  verifiedStatus: {
    weight: 0.15,
    maxRaw: 1,
    curve: 'linear',
    description: 'Creator verification status',
    userType: 'creator',
  },
  creatorSocialConnections: {
    weight: 0.15,
    maxRaw: 8,
    curve: 'linear',
    description: 'Connected social accounts',
    userType: 'creator',
  },
  fanRewardRedemptions: {
    weight: 0.1,
    maxRaw: 500,
    curve: 'log',
    description: 'Reward redemptions by fans',
    userType: 'creator',
  },
  creatorAccountAgeDays: {
    weight: 0.1,
    maxRaw: 365,
    curve: 'linear',
    description: 'Days since account creation',
    userType: 'creator',
  },
};

export type SignalName = keyof typeof SIGNAL_CONFIG;

const MAX_SCORE = 1000;

// ============================================================================
// RAW SIGNAL TYPES
// ============================================================================

export interface FanSignals {
  totalPoints: number;
  taskCompletions: number;
  socialConnections: number;
  streakDays: number;
  referralCount: number;
  accountAgeDays: number;
}

export interface CreatorSignals {
  activeFanCount: number;
  programEngagement: number;
  verifiedStatus: number;
  creatorSocialConnections: number;
  fanRewardRedemptions: number;
  creatorAccountAgeDays: number;
}

export type RawSignals = FanSignals | CreatorSignals;

export interface ScoreBreakdown extends Record<string, unknown> {
  weightedScores: Record<string, number>;
  normalizedScore: number;
}

// ============================================================================
// USER TYPE DETECTION
// ============================================================================

async function getCreatorRecord(userId: string) {
  return db.query.creators.findFirst({
    where: eq(creators.userId, userId),
  });
}

// ============================================================================
// SIGNAL COLLECTION
// ============================================================================

/**
 * Collect fan-specific signal values from the database.
 */
async function collectFanSignals(userId: string): Promise<FanSignals> {
  const [pointsResult, tasksResult, socialsResult, streakResult, referralResult, userResult] =
    await Promise.all([
      db
        .select({ total: sql<number>`COALESCE(SUM(${fanPrograms.totalPointsEarned}), 0)` })
        .from(fanPrograms)
        .where(eq(fanPrograms.fanId, userId)),

      db.select({ total: count() }).from(taskCompletions).where(eq(taskCompletions.userId, userId)),

      db
        .select({ total: count() })
        .from(socialConnections)
        .where(and(eq(socialConnections.userId, userId), eq(socialConnections.isActive, true))),

      db
        .select({
          longest: sql<number>`COALESCE(MAX(${checkInStreaks.longestStreak}), 0)`,
        })
        .from(checkInStreaks)
        .where(eq(checkInStreaks.userId, userId)),

      db
        .select({ total: count() })
        .from(fanReferrals)
        .where(eq(fanReferrals.referringFanId, userId)),

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

/**
 * Collect creator-specific signal values from the database.
 */
async function collectCreatorSignals(
  userId: string,
  creator: { id: string; tenantId: string; isVerified: boolean | null }
): Promise<CreatorSignals> {
  const [fansResult, engagementResult, socialsResult, redemptionsResult, userResult] =
    await Promise.all([
      // Active fan count across all creator's programs
      db
        .select({ total: count() })
        .from(fanPrograms)
        .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.id, fanPrograms.programId))
        .where(eq(loyaltyPrograms.tenantId, creator.tenantId)),

      // Total task completions in creator's tasks
      db
        .select({ total: count() })
        .from(taskCompletions)
        .innerJoin(tasks, eq(tasks.id, taskCompletions.taskId))
        .where(eq(tasks.tenantId, creator.tenantId)),

      // Connected social accounts (active only)
      db
        .select({ total: count() })
        .from(socialConnections)
        .where(and(eq(socialConnections.userId, userId), eq(socialConnections.isActive, true))),

      // Reward redemptions by fans
      db
        .select({ total: count() })
        .from(rewardRedemptions)
        .innerJoin(rewards, eq(rewards.id, rewardRedemptions.rewardId))
        .where(eq(rewards.tenantId, creator.tenantId)),

      // Account age
      db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)),
    ]);

  const accountCreatedAt = userResult[0]?.createdAt;
  const accountAgeDays = accountCreatedAt
    ? Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    activeFanCount: Number(fansResult[0]?.total) || 0,
    programEngagement: Number(engagementResult[0]?.total) || 0,
    verifiedStatus: creator.isVerified ? 1 : 0,
    creatorSocialConnections: Number(socialsResult[0]?.total) || 0,
    fanRewardRedemptions: Number(redemptionsResult[0]?.total) || 0,
    creatorAccountAgeDays: accountAgeDays,
  };
}

/**
 * Collect raw signal values for a single user from the database.
 * Automatically detects user type and collects appropriate signals.
 */
export async function collectSignals(userId: string): Promise<RawSignals> {
  const creator = await getCreatorRecord(userId);

  if (creator) {
    return collectCreatorSignals(userId, {
      id: creator.id,
      tenantId: creator.tenantId,
      isVerified: creator.isVerified,
    });
  }

  return collectFanSignals(userId);
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
 * Determine which user type a signal set represents.
 */
function detectSignalUserType(signals: RawSignals): 'fan' | 'creator' {
  return 'activeFanCount' in signals ? 'creator' : 'fan';
}

/**
 * Calculate the final reputation score from raw signals.
 * Only applies signal configs matching the detected user type.
 */
export function calculateScore(signals: RawSignals): ScoreBreakdown {
  const userType = detectSignalUserType(signals);
  const weightedScores: Record<string, number> = {};
  let totalWeightedScore = 0;

  for (const [signalName, config] of Object.entries(SIGNAL_CONFIG)) {
    // Only apply signals for this user type
    if (config.userType !== userType && config.userType !== 'both') continue;

    const rawValue = (signals as unknown as Record<string, number>)[signalName] ?? 0;
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
