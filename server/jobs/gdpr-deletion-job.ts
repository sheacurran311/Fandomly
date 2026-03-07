/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GDPR Account Deletion Background Job
 *
 * Runs daily to process confirmed deletion requests whose grace period
 * (30 days) has expired. Calls the anonymize_user() DB function for each
 * request, then marks it complete.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

class GdprDeletionJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  // Run every 6 hours
  private readonly RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;

  start() {
    if (this.intervalId) {
      console.log('[GdprDeletionJob] Already running');
      return;
    }

    console.log('[GdprDeletionJob] Starting GDPR deletion background job');

    // Run after a 30-second delay on startup to avoid DB contention at boot
    setTimeout(() => {
      this.runJob().catch((err) => console.error('[GdprDeletionJob] Initial run failed:', err));
    }, 30_000);

    this.intervalId = setInterval(() => {
      this.runJob().catch((err) => console.error('[GdprDeletionJob] Scheduled run failed:', err));
    }, this.RUN_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GdprDeletionJob] Stopped');
    }
  }

  async runJob() {
    if (this.isRunning) {
      console.log('[GdprDeletionJob] Previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Find confirmed deletion requests past their scheduled deletion date
      const result = await db.execute(sql`
        SELECT id, user_id, request_type
        FROM account_deletion_requests
        WHERE status = 'confirmed'
          AND scheduled_deletion_at <= NOW()
        ORDER BY scheduled_deletion_at ASC
        LIMIT 50
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requests = (result as any).rows || [];

      if (requests.length === 0) {
        return;
      }

      console.log(`[GdprDeletionJob] Processing ${requests.length} deletion request(s)`);

      let completed = 0;
      let failed = 0;

      for (const req of requests) {
        try {
          // Mark as processing
          await db.execute(sql`
            UPDATE account_deletion_requests
            SET status = 'processing'
            WHERE id = ${req.id}
          `);

          if (req.request_type === 'anonymization') {
            // Use the DB function to anonymize user data
            await db.execute(sql`SELECT anonymize_user(${req.user_id})`);
          } else {
            // Full deletion — anonymize first, then soft-delete the user record
            await db.execute(sql`SELECT anonymize_user(${req.user_id})`);
            await db.execute(sql`
              UPDATE users SET deleted_at = NOW() WHERE id = ${req.user_id}
            `);
          }

          // Mark request as completed
          await db.execute(sql`
            UPDATE account_deletion_requests
            SET status = 'completed', completed_at = NOW()
            WHERE id = ${req.id}
          `);

          // Audit trail
          await db
            .execute(
              sql`
            INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details)
            VALUES (
              ${req.user_id},
              'gdpr_deletion_completed',
              'account_deletion_request',
              ${req.id},
              ${JSON.stringify({ requestType: req.request_type })}::jsonb
            )
          `
            )
            .catch(() => {
              // Audit insert may fail if audit_trail table doesn't exist — non-fatal
            });

          completed++;
          console.log(
            `[GdprDeletionJob] Completed deletion for user ${req.user_id} (${req.request_type})`
          );
        } catch (err) {
          failed++;
          console.error(`[GdprDeletionJob] Failed to process request ${req.id}:`, err);

          // Mark as failed but don't remove — will be retried next run
          await db
            .execute(
              sql`
            UPDATE account_deletion_requests
            SET status = 'confirmed',
                metadata = jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{lastError}',
                  ${JSON.stringify(String(err))}::jsonb
                )
            WHERE id = ${req.id}
          `
            )
            .catch(() => {
              /* non-fatal */
            });
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[GdprDeletionJob] Completed in ${duration}ms: ${completed} processed, ${failed} failed`
      );
    } catch (error) {
      console.error('[GdprDeletionJob] Job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const gdprDeletionJob = new GdprDeletionJob();
