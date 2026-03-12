/**
 * Loyalty tier thresholds and helpers — single source of truth.
 *
 * Previously hardcoded in pages/creator-dashboard/fans.tsx.
 * TODO: Eventually pull from loyalty program configuration via the API
 * so creators can customize tier thresholds per program.
 */

export const DEFAULT_TIER_THRESHOLDS = {
  platinum: 10_000,
  gold: 5_000,
  silver: 1_000,
  bronze: 0,
} as const;

export type TierName = 'platinum' | 'gold' | 'silver' | 'bronze';

/** Calculate the tier for a given point total. */
export function calculateTier(points: number): TierName {
  if (points >= DEFAULT_TIER_THRESHOLDS.platinum) return 'platinum';
  if (points >= DEFAULT_TIER_THRESHOLDS.gold) return 'gold';
  if (points >= DEFAULT_TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export const TIER_CONFIGS: Record<TierName, { label: string; color: string; bgColor: string }> = {
  platinum: { label: 'Platinum', color: 'text-purple-300', bgColor: 'bg-purple-500/20' },
  gold: { label: 'Gold', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  silver: { label: 'Silver', color: 'text-gray-300', bgColor: 'bg-gray-500/20' },
  bronze: { label: 'Bronze', color: 'text-amber-600', bgColor: 'bg-amber-700/20' },
};
