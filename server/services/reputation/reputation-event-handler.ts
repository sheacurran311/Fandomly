/**
 * Reputation Event Handler
 *
 * Lightweight event-driven bridge between reputation signal changes and the oracle.
 * Called from bottleneck services (points, tasks, social, streaks, referrals)
 * when a user's reputation signals change.
 *
 * Key design decisions:
 * - **Debounced**: Multiple signal changes within 5 seconds for the same user
 *   are collapsed into a single recalculation. This prevents redundant work when
 *   a task completion triggers both a task_completions insert AND a point award.
 * - **Non-blocking**: Signal changes are processed asynchronously. The caller
 *   (e.g., awardPoints) does not wait for recalculation or chain sync.
 * - **Threshold-aware**: If recalculation detects a threshold crossing (500/750),
 *   an immediate on-chain sync is triggered.
 * - **Fail-safe**: Errors in reputation processing never propagate back to the
 *   caller. Points and tasks always succeed even if reputation sync fails.
 */

import { getReputationOracle } from './reputation-oracle-service';

const LOG_PREFIX = '[ReputationEvent]';

// Debounce window in milliseconds
const DEBOUNCE_MS = 5000;

// Map of userId -> debounce timer
const pendingRecalculations = new Map<string, NodeJS.Timeout>();

/**
 * Signal that a user's reputation-relevant data has changed.
 * Call this from any service that modifies reputation signals.
 *
 * This is non-blocking and debounced — safe to call from hot paths.
 *
 * @param userId - The user whose signals changed
 * @param signal - Which signal changed (for logging; does not affect calculation)
 */
export function onReputationSignalChanged(userId: string, signal: string): void {
  // Cancel any pending recalculation for this user
  const existing = pendingRecalculations.get(userId);
  if (existing) {
    clearTimeout(existing);
  }

  // Schedule a new recalculation after the debounce window
  const timer = setTimeout(() => {
    pendingRecalculations.delete(userId);
    processRecalculation(userId, signal).catch((err) => {
      console.error(`${LOG_PREFIX} Failed to process recalculation for user ${userId}:`, err);
    });
  }, DEBOUNCE_MS);

  pendingRecalculations.set(userId, timer);
}

/**
 * Internal: Recalculate a user's score and sync threshold crossings.
 */
async function processRecalculation(userId: string, signal: string): Promise<void> {
  const oracle = getReputationOracle();
  if (!oracle) {
    // Oracle not initialized (no DEPLOYER_PRIVATE_KEY) — skip silently
    return;
  }

  const startTime = Date.now();

  // Recalculate the user's score from all signals
  const { score, thresholdCrossed } = await oracle.recalculateUser(userId);

  const duration = Date.now() - startTime;
  console.log(
    `${LOG_PREFIX} Recalculated user ${userId} (signal: ${signal}): score=${score}, threshold=${thresholdCrossed ?? 'none'} (${duration}ms)`
  );

  // If a critical threshold was crossed, immediately push on-chain
  if (thresholdCrossed) {
    console.log(
      `${LOG_PREFIX} Threshold ${thresholdCrossed} crossed for user ${userId} — triggering immediate on-chain sync`
    );

    const syncResult = await oracle.syncThresholdCrossing(userId);

    if (syncResult.synced) {
      console.log(
        `${LOG_PREFIX} On-chain sync successful for user ${userId}: threshold=${thresholdCrossed}, txHash=${syncResult.txHash}`
      );
    } else {
      console.warn(
        `${LOG_PREFIX} On-chain sync failed for user ${userId}: threshold=${thresholdCrossed} (will retry in next batch)`
      );
    }
  }
}

/**
 * Get the number of pending recalculations (for monitoring/debugging).
 */
export function getPendingRecalculationCount(): number {
  return pendingRecalculations.size;
}
