/**
 * Reputation Sync Background Job
 *
 * Runs on an hourly interval to:
 * 1. Recalculate all user reputation scores from off-chain signals
 * 2. Batch-push updated scores to the on-chain ReputationRegistry
 * 3. Process any pending threshold crossings immediately
 *
 * Follows the same pattern as PointExpirationJob and SyncScheduler.
 */

import { getReputationOracle } from '../services/reputation/reputation-oracle-service';

class ReputationSyncJob {
  private intervalId: NodeJS.Timer | null = null;
  private isRunning = false;

  // Run every hour (matches the batch cadence described in the architecture)
  private readonly RUN_INTERVAL_MS = 60 * 60 * 1000;

  start() {
    if (this.intervalId) {
      console.log('[ReputationSyncJob] Already running');
      return;
    }

    console.log('[ReputationSyncJob] Starting reputation sync background job (hourly)');

    // Delay initial run by 2 minutes to let server fully initialize
    setTimeout(
      () => {
        this.runJob().catch((err) => console.error('[ReputationSyncJob] Initial run failed:', err));
      },
      2 * 60 * 1000
    );

    this.intervalId = setInterval(() => {
      this.runJob().catch((err) => console.error('[ReputationSyncJob] Scheduled run failed:', err));
    }, this.RUN_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ReputationSyncJob] Stopped');
    }
  }

  async runJob() {
    if (this.isRunning) {
      console.log('[ReputationSyncJob] Previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('[ReputationSyncJob] Starting job run');

    try {
      const oracle = getReputationOracle();
      if (!oracle) {
        console.warn(
          '[ReputationSyncJob] Oracle not initialized (missing DEPLOYER_PRIVATE_KEY), skipping'
        );
        return;
      }

      // Step 1: Run full batch sync (recalculate + push on-chain)
      const result = await oracle.runBatchSync();

      // Step 2: Process any threshold crossings that happened during recalculation
      const thresholdsSynced = await oracle.processPendingThresholds();

      const duration = Date.now() - startTime;
      console.log(`[ReputationSyncJob] Completed in ${duration}ms`, {
        usersProcessed: result.usersProcessed,
        usersUpdated: result.usersUpdated,
        usersFailed: result.usersFailed,
        thresholdsSynced,
        txCount: result.txHashes.length,
      });
    } catch (error) {
      console.error('[ReputationSyncJob] Job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const reputationSyncJob = new ReputationSyncJob();
