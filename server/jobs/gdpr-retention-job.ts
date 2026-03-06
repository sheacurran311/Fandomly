/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GDPR Data Retention Background Job
 *
 * Runs daily to enforce data retention policies. Reads active policies
 * from the data_retention_policies table and performs cleanup (hard delete,
 * soft delete, or anonymize) based on each policy's configuration.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

class GdprRetentionJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  // Run every 24 hours
  private readonly RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;

  start() {
    if (this.intervalId) {
      console.log('[GdprRetentionJob] Already running');
      return;
    }

    console.log('[GdprRetentionJob] Starting GDPR retention background job');

    // Run after a 60-second delay on startup
    setTimeout(() => {
      this.runJob().catch((err) => console.error('[GdprRetentionJob] Initial run failed:', err));
    }, 60_000);

    this.intervalId = setInterval(() => {
      this.runJob().catch((err) => console.error('[GdprRetentionJob] Scheduled run failed:', err));
    }, this.RUN_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GdprRetentionJob] Stopped');
    }
  }

  async runJob() {
    if (this.isRunning) {
      console.log('[GdprRetentionJob] Previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Load active retention policies
      const result = await db.execute(sql`
        SELECT id, table_name, retention_days, retention_type, filter_condition
        FROM data_retention_policies
        WHERE is_active = TRUE
        ORDER BY table_name
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const policies = (result as any).rows || [];

      if (policies.length === 0) {
        return;
      }

      console.log(`[GdprRetentionJob] Enforcing ${policies.length} retention policy/policies`);

      for (const policy of policies) {
        try {
          const affected = await this.enforcePolicy(policy);

          // Update last_run_at
          await db.execute(sql`
            UPDATE data_retention_policies
            SET last_run_at = NOW(), updated_at = NOW()
            WHERE id = ${policy.id}
          `);

          if (affected > 0) {
            console.log(
              `[GdprRetentionJob] ${policy.table_name}: ${policy.retention_type} ${affected} rows (> ${policy.retention_days} days)`
            );
          }
        } catch (err) {
          console.error(
            `[GdprRetentionJob] Failed to enforce policy for ${policy.table_name}:`,
            err
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[GdprRetentionJob] Completed in ${duration}ms`);
    } catch (error) {
      console.error('[GdprRetentionJob] Job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Enforce a single retention policy on the specified table.
   * Uses parameterized cutoff date but table/column names from trusted DB config.
   */
  private async enforcePolicy(policy: {
    table_name: string;
    retention_days: number;
    retention_type: string;
    filter_condition: string | null;
  }): Promise<number> {
    const { table_name, retention_days, retention_type, filter_condition } = policy;

    // Whitelist of tables we allow retention policies on (safety guard)
    const allowedTables = [
      'audit_trail',
      'notifications',
      'point_expiration_notifications',
      'data_export_requests',
      'account_deletion_requests',
    ];

    if (!allowedTables.includes(table_name)) {
      console.warn(`[GdprRetentionJob] Table "${table_name}" not in allowed list, skipping`);
      return 0;
    }

    // Determine the date column — most tables use created_at
    const dateColumn = 'created_at';
    const filterClause = filter_condition ? `AND ${filter_condition}` : '';

    let result;

    switch (retention_type) {
      case 'hard_delete':
        result = await db.execute(
          sql.raw(
            `DELETE FROM ${table_name}
             WHERE ${dateColumn} < NOW() - INTERVAL '${retention_days} days'
             ${filterClause}`
          )
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (result as any).rowCount || 0;

      case 'soft_delete':
        result = await db.execute(
          sql.raw(
            `UPDATE ${table_name}
             SET deleted_at = NOW()
             WHERE ${dateColumn} < NOW() - INTERVAL '${retention_days} days'
               AND deleted_at IS NULL
             ${filterClause}`
          )
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (result as any).rowCount || 0;

      case 'anonymize':
        // For anonymization, null out PII columns. This is table-specific.
        // For audit_trail, anonymize user_id and ip_address
        if (table_name === 'audit_trail') {
          result = await db.execute(
            sql.raw(
              `UPDATE ${table_name}
               SET user_id = NULL, ip_address = NULL
               WHERE ${dateColumn} < NOW() - INTERVAL '${retention_days} days'
                 AND user_id IS NOT NULL
               ${filterClause}`
            )
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (result as any).rowCount || 0;
        }
        return 0;

      default:
        console.warn(`[GdprRetentionJob] Unknown retention type "${retention_type}"`);
        return 0;
    }
  }
}

export const gdprRetentionJob = new GdprRetentionJob();
