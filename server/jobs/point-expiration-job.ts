/**
 * Point Expiration Background Job
 * Sprint 5: Handles automatic point expiration and notification sending
 * 
 * Features:
 * - Marks expired points as void
 * - Deducts from user balances
 * - Sends "expiring soon" notifications (7-day and 1-day warnings)
 */

import { db } from '../db';
import { sql, eq, and, lte, isNull, gt } from 'drizzle-orm';

interface ExpiringPoints {
  id: string;
  userId: string;
  points: number;
  expiresAt: Date;
  type: 'creator' | 'platform';
  fanProgramId?: string;
}

class PointExpirationJob {
  private intervalId: NodeJS.Timer | null = null;
  private isRunning = false;
  private readonly RUN_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

  /**
   * Start the background job
   */
  start() {
    if (this.intervalId) {
      console.log('[PointExpirationJob] Already running');
      return;
    }

    console.log('[PointExpirationJob] Starting point expiration background job');
    
    // Run immediately on start, then on interval
    this.runJob().catch(err => console.error('[PointExpirationJob] Initial run failed:', err));
    
    this.intervalId = setInterval(() => {
      this.runJob().catch(err => console.error('[PointExpirationJob] Scheduled run failed:', err));
    }, this.RUN_INTERVAL_MS);
  }

  /**
   * Stop the background job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[PointExpirationJob] Stopped');
    }
  }

  /**
   * Main job execution
   */
  async runJob() {
    if (this.isRunning) {
      console.log('[PointExpirationJob] Previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('[PointExpirationJob] Starting job run');

    try {
      // 1. Expire points that have passed their expiration date
      const expiredCount = await this.expirePoints();
      
      // 2. Send 7-day warning notifications
      const sevenDayWarnings = await this.sendExpirationWarnings(7);
      
      // 3. Send 1-day warning notifications
      const oneDayWarnings = await this.sendExpirationWarnings(1);

      const duration = Date.now() - startTime;
      console.log(`[PointExpirationJob] Completed in ${duration}ms`, {
        expiredTransactions: expiredCount,
        sevenDayWarnings,
        oneDayWarnings,
      });
    } catch (error) {
      console.error('[PointExpirationJob] Job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Expire points that have passed their expiration date
   */
  private async expirePoints(): Promise<number> {
    const now = new Date();
    let totalExpired = 0;

    // Expire creator points
    const creatorExpired = await db.execute(sql`
      WITH expired_transactions AS (
        UPDATE point_transactions
        SET is_expired = TRUE, expired_at = ${now.toISOString()}
        WHERE expires_at <= ${now.toISOString()}
          AND is_expired = FALSE
          AND points > 0
        RETURNING id, fan_program_id, points
      ),
      balance_updates AS (
        UPDATE fan_programs fp
        SET current_points = GREATEST(0, fp.current_points - et.points)
        FROM expired_transactions et
        WHERE fp.id = et.fan_program_id
        RETURNING fp.id
      )
      SELECT COUNT(*) as count FROM expired_transactions
    `);

    totalExpired += parseInt((creatorExpired as any).rows?.[0]?.count || '0');

    // Expire platform points
    const platformExpired = await db.execute(sql`
      WITH expired_transactions AS (
        UPDATE platform_points_transactions
        SET is_expired = TRUE, expired_at = ${now.toISOString()}
        WHERE expires_at <= ${now.toISOString()}
          AND is_expired = FALSE
          AND points > 0
        RETURNING id, user_id, points
      )
      SELECT COUNT(*) as count FROM expired_transactions
    `);

    totalExpired += parseInt((platformExpired as any).rows?.[0]?.count || '0');

    if (totalExpired > 0) {
      console.log(`[PointExpirationJob] Expired ${totalExpired} point transactions`);
    }

    return totalExpired;
  }

  /**
   * Send expiration warning notifications
   * @param daysAhead Number of days before expiration to send warning
   */
  private async sendExpirationWarnings(daysAhead: number): Promise<number> {
    const now = new Date();
    const warningDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const notificationType = daysAhead === 7 ? '7_day_warning' : '1_day_warning';
    
    let notificationsSent = 0;

    // Find creator points expiring soon that haven't been notified
    const expiringCreatorPoints = await db.execute(sql`
      SELECT 
        pt.id,
        fp.fan_id as user_id,
        pt.points,
        pt.expires_at,
        pt.fan_program_id
      FROM point_transactions pt
      INNER JOIN fan_programs fp ON pt.fan_program_id = fp.id
      WHERE pt.expires_at > ${now.toISOString()}
        AND pt.expires_at <= ${warningDate.toISOString()}
        AND pt.is_expired = FALSE
        AND pt.points > 0
        AND NOT EXISTS (
          SELECT 1 FROM point_expiration_notifications pen
          WHERE pen.transaction_id = pt.id
            AND pen.notification_type = ${notificationType}
        )
      LIMIT 1000
    `);

    // Insert notifications for creator points
    for (const row of (expiringCreatorPoints as any).rows || []) {
      try {
        await db.execute(sql`
          INSERT INTO point_expiration_notifications 
            (user_id, transaction_id, transaction_type, notification_type, points_amount, expires_at)
          VALUES 
            (${row.user_id}, ${row.id}, 'creator', ${notificationType}, ${row.points}, ${row.expires_at})
          ON CONFLICT (transaction_id, notification_type) DO NOTHING
        `);
        notificationsSent++;
        
        // TODO: Actually send the notification via email/push
        // For now, just record that we would send it
        console.log(`[PointExpirationJob] Would send ${notificationType} to user ${row.user_id} for ${row.points} points`);
      } catch (error) {
        console.error('[PointExpirationJob] Failed to create notification:', error);
      }
    }

    // Find platform points expiring soon
    const expiringPlatformPoints = await db.execute(sql`
      SELECT 
        ppt.id,
        ppt.user_id,
        ppt.points,
        ppt.expires_at
      FROM platform_points_transactions ppt
      WHERE ppt.expires_at > ${now.toISOString()}
        AND ppt.expires_at <= ${warningDate.toISOString()}
        AND ppt.is_expired = FALSE
        AND ppt.points > 0
        AND NOT EXISTS (
          SELECT 1 FROM point_expiration_notifications pen
          WHERE pen.transaction_id = ppt.id
            AND pen.notification_type = ${notificationType}
        )
      LIMIT 1000
    `);

    // Insert notifications for platform points
    for (const row of (expiringPlatformPoints as any).rows || []) {
      try {
        await db.execute(sql`
          INSERT INTO point_expiration_notifications 
            (user_id, transaction_id, transaction_type, notification_type, points_amount, expires_at)
          VALUES 
            (${row.user_id}, ${row.id}, 'platform', ${notificationType}, ${row.points}, ${row.expires_at})
          ON CONFLICT (transaction_id, notification_type) DO NOTHING
        `);
        notificationsSent++;
        
        console.log(`[PointExpirationJob] Would send ${notificationType} to user ${row.user_id} for ${row.points} platform points`);
      } catch (error) {
        console.error('[PointExpirationJob] Failed to create platform notification:', error);
      }
    }

    return notificationsSent;
  }

  /**
   * Get summary of expiring points for a user
   */
  async getExpiringPointsSummary(userId: string): Promise<{
    creatorPoints: { total: number; expiringIn7Days: number; expiringIn30Days: number };
    platformPoints: { total: number; expiringIn7Days: number; expiringIn30Days: number };
  }> {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const creatorResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN pt.expires_at IS NOT NULL AND pt.is_expired = FALSE THEN pt.points ELSE 0 END), 0) as total_expiring,
        COALESCE(SUM(CASE WHEN pt.expires_at <= ${sevenDays.toISOString()} AND pt.expires_at > ${now.toISOString()} AND pt.is_expired = FALSE THEN pt.points ELSE 0 END), 0) as expiring_7d,
        COALESCE(SUM(CASE WHEN pt.expires_at <= ${thirtyDays.toISOString()} AND pt.expires_at > ${now.toISOString()} AND pt.is_expired = FALSE THEN pt.points ELSE 0 END), 0) as expiring_30d
      FROM point_transactions pt
      INNER JOIN fan_programs fp ON pt.fan_program_id = fp.id
      WHERE fp.fan_id = ${userId}
        AND pt.points > 0
    `);

    const platformResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND is_expired = FALSE THEN points ELSE 0 END), 0) as total_expiring,
        COALESCE(SUM(CASE WHEN expires_at <= ${sevenDays.toISOString()} AND expires_at > ${now.toISOString()} AND is_expired = FALSE THEN points ELSE 0 END), 0) as expiring_7d,
        COALESCE(SUM(CASE WHEN expires_at <= ${thirtyDays.toISOString()} AND expires_at > ${now.toISOString()} AND is_expired = FALSE THEN points ELSE 0 END), 0) as expiring_30d
      FROM platform_points_transactions
      WHERE user_id = ${userId}
        AND points > 0
    `);

    const creatorRow = (creatorResult as any).rows?.[0] || {};
    const platformRow = (platformResult as any).rows?.[0] || {};

    return {
      creatorPoints: {
        total: parseInt(creatorRow.total_expiring) || 0,
        expiringIn7Days: parseInt(creatorRow.expiring_7d) || 0,
        expiringIn30Days: parseInt(creatorRow.expiring_30d) || 0,
      },
      platformPoints: {
        total: parseInt(platformRow.total_expiring) || 0,
        expiringIn7Days: parseInt(platformRow.expiring_7d) || 0,
        expiringIn30Days: parseInt(platformRow.expiring_30d) || 0,
      },
    };
  }
}

export const pointExpirationJob = new PointExpirationJob();
