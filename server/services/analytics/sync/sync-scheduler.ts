/**
 * Sync Scheduler
 * 
 * Background service that periodically syncs social platform data
 * for creators who have sync enabled. Also manages materialized view refreshes.
 */

import { db } from '../../../db';
import { pool } from '../../../db';
import {
  syncPreferences,
  socialConnections,
  platformAccountMetricsDaily,
  platformContent,
  platformContentMetrics,
  syncLog,
} from '@shared/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getSyncService } from './index';
import type { ContentItem, ContentMetricsData } from './types';

interface SchedulerConfig {
  /** How often to check for pending syncs (ms) */
  checkIntervalMs: number;
  /** Maximum syncs to process per check */
  batchSize: number;
  /** Enable verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  checkIntervalMs: 5 * 60 * 1000, // 5 minutes
  batchSize: 10,
  verbose: true,
};

class SyncScheduler {
  private config: SchedulerConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private viewRefreshInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isSyncing = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('[SyncScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[SyncScheduler] Starting (check every ${this.config.checkIntervalMs / 1000}s)`);

    // Start sync check interval
    this.syncInterval = setInterval(
      () => this.processPendingSyncs(),
      this.config.checkIntervalMs
    );

    // Start materialized view refresh (hourly)
    this.viewRefreshInterval = setInterval(
      () => this.refreshMaterializedViews(),
      60 * 60 * 1000 // 1 hour
    );

    // Run initial sync after a short delay
    setTimeout(() => this.processPendingSyncs(), 30 * 1000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.viewRefreshInterval) {
      clearInterval(this.viewRefreshInterval);
      this.viewRefreshInterval = null;
    }
    this.isRunning = false;
    console.log('[SyncScheduler] Stopped');
  }

  /**
   * Process all pending syncs
   */
  async processPendingSyncs() {
    if (this.isSyncing) {
      if (this.config.verbose) {
        console.log('[SyncScheduler] Sync already in progress, skipping');
      }
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Find sync preferences that are due
      const pendingPrefs = await db.query.syncPreferences.findMany({
        where: and(
          eq(syncPreferences.syncEnabled, true),
          lte(syncPreferences.nextSyncAt, new Date())
        ),
        limit: this.config.batchSize,
      });

      if (pendingPrefs.length === 0) {
        this.isSyncing = false;
        return;
      }

      if (this.config.verbose) {
        console.log(`[SyncScheduler] Processing ${pendingPrefs.length} pending syncs`);
      }

      let processed = 0;
      let failed = 0;

      for (const pref of pendingPrefs) {
        try {
          await this.syncPlatform(pref.userId, pref.platform, pref.id);
          processed++;
        } catch (error) {
          console.error(`[SyncScheduler] Error syncing ${pref.platform} for ${pref.userId}:`, error);
          failed++;

          // Mark as error
          await db
            .update(syncPreferences)
            .set({
              syncStatus: 'error',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              nextSyncAt: new Date(Date.now() + (pref.syncFrequencyMinutes || 60) * 60 * 1000),
            })
            .where(eq(syncPreferences.id, pref.id));
        }
      }

      const duration = Date.now() - startTime;
      if (this.config.verbose) {
        console.log(`[SyncScheduler] Completed in ${duration}ms - Processed: ${processed}, Failed: ${failed}`);
      }
    } catch (error) {
      console.error('[SyncScheduler] processPendingSyncs error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single platform for a user
   */
  async syncPlatform(userId: string, platform: string, prefId: string) {
    const syncService = getSyncService(platform);
    if (!syncService) {
      console.warn(`[SyncScheduler] No sync service for platform: ${platform}`);
      return;
    }

    // Mark as syncing
    await db
      .update(syncPreferences)
      .set({ syncStatus: 'syncing', errorMessage: null })
      .where(eq(syncPreferences.id, prefId));

    // Get the social connection
    const connection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.isActive, true)
      ),
    });

    if (!connection || !connection.accessToken) {
      throw new Error(`No active connection with token for ${platform}`);
    }

    const startedAt = new Date();

    // Create sync log entry
    const [logEntry] = await db.insert(syncLog).values({
      userId,
      platform,
      syncType: 'full',
      status: 'started',
      startedAt,
    }).returning();

    let totalItemsSynced = 0;

    try {
      // 1. Sync account metrics
      const accountResult = await syncService.syncAccountMetrics(userId, connection);
      if (accountResult.success && accountResult.data) {
        const today = new Date().toISOString().split('T')[0];
        await db
          .insert(platformAccountMetricsDaily)
          .values({
            userId,
            platform,
            date: today,
            followers: accountResult.data.followers ?? null,
            following: accountResult.data.following ?? null,
            totalPosts: accountResult.data.totalPosts ?? null,
            totalViews: accountResult.data.totalViews ?? null,
            totalLikes: accountResult.data.totalLikes ?? null,
            totalComments: accountResult.data.totalComments ?? null,
            engagementRate: accountResult.data.engagementRate?.toString() ?? null,
            subscribers: accountResult.data.subscribers ?? null,
            platformSpecific: accountResult.data.platformSpecific || {},
          })
          .onConflictDoUpdate({
            target: [platformAccountMetricsDaily.userId, platformAccountMetricsDaily.platform, platformAccountMetricsDaily.date],
            set: {
              followers: accountResult.data.followers ?? null,
              following: accountResult.data.following ?? null,
              totalPosts: accountResult.data.totalPosts ?? null,
              totalViews: accountResult.data.totalViews ?? null,
              totalLikes: accountResult.data.totalLikes ?? null,
              totalComments: accountResult.data.totalComments ?? null,
              engagementRate: accountResult.data.engagementRate?.toString() ?? null,
              subscribers: accountResult.data.subscribers ?? null,
              platformSpecific: accountResult.data.platformSpecific || {},
            },
          });
        totalItemsSynced++;
      }

      // 2. Sync content list
      const contentResult = await syncService.syncContentList(userId, connection);
      if (contentResult.success && contentResult.items?.length) {
        const contentIds: string[] = [];

        for (const item of contentResult.items) {
          try {
            const [savedContent] = await db
              .insert(platformContent)
              .values({
                userId,
                platform,
                platformContentId: item.platformContentId,
                contentType: item.contentType,
                title: item.title ?? null,
                description: item.description ?? null,
                url: item.url ?? null,
                thumbnailUrl: item.thumbnailUrl ?? null,
                publishedAt: item.publishedAt ?? null,
                rawData: item.rawData || {},
              })
              .onConflictDoUpdate({
                target: [platformContent.platform, platformContent.platformContentId],
                set: {
                  title: item.title ?? null,
                  description: item.description ?? null,
                  url: item.url ?? null,
                  thumbnailUrl: item.thumbnailUrl ?? null,
                  rawData: item.rawData || {},
                  updatedAt: new Date(),
                },
              })
              .returning();

            contentIds.push(item.platformContentId);
            totalItemsSynced++;
          } catch {
            // Skip individual content items that fail
          }
        }

        // 3. Sync content metrics
        if (contentIds.length > 0) {
          const metricsResult = await syncService.syncContentMetrics(userId, connection, contentIds);
          if (metricsResult.success && metricsResult.metrics?.length) {
            await this.saveContentMetrics(platform, metricsResult.metrics);
            totalItemsSynced += metricsResult.metrics.length;
          }
        }
      }

      // Update sync log as completed
      const completedAt = new Date();
      await db
        .update(syncLog)
        .set({
          status: 'completed',
          itemsSynced: totalItemsSynced,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        })
        .where(eq(syncLog.id, logEntry.id));

      // Update sync preferences
      const pref = await db.query.syncPreferences.findFirst({
        where: eq(syncPreferences.id, prefId),
      });

      const freq = pref?.syncFrequencyMinutes || 60;
      await db
        .update(syncPreferences)
        .set({
          syncStatus: 'idle',
          lastSyncAt: completedAt,
          nextSyncAt: new Date(Date.now() + freq * 60 * 1000),
          errorMessage: null,
        })
        .where(eq(syncPreferences.id, prefId));

      // Also update the social connection lastSyncedAt
      await db
        .update(socialConnections)
        .set({ lastSyncedAt: completedAt })
        .where(eq(socialConnections.id, connection.id));

    } catch (error) {
      // Update sync log as failed
      await db
        .update(syncLog)
        .set({
          status: 'failed',
          errorDetails: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
        })
        .where(eq(syncLog.id, logEntry.id));

      throw error;
    }
  }

  /**
   * Save content metrics to the database
   */
  private async saveContentMetrics(platform: string, metrics: ContentMetricsData[]) {
    const today = new Date().toISOString().split('T')[0];

    for (const metric of metrics) {
      try {
        // Look up the content ID
        const content = await db.query.platformContent.findFirst({
          where: and(
            eq(platformContent.platform, platform),
            eq(platformContent.platformContentId, metric.platformContentId)
          ),
        });

        if (!content) continue;

        await db
          .insert(platformContentMetrics)
          .values({
            contentId: content.id,
            date: today,
            views: metric.views ?? 0,
            likes: metric.likes ?? 0,
            comments: metric.comments ?? 0,
            shares: metric.shares ?? 0,
            saves: metric.saves ?? 0,
            impressions: metric.impressions ?? 0,
            reach: metric.reach ?? 0,
            engagementRate: metric.engagementRate?.toString() ?? null,
            watchTimeMinutes: metric.watchTimeMinutes?.toString() ?? null,
            platformSpecific: metric.platformSpecific || {},
          })
          .onConflictDoUpdate({
            target: [platformContentMetrics.contentId, platformContentMetrics.date],
            set: {
              views: metric.views ?? 0,
              likes: metric.likes ?? 0,
              comments: metric.comments ?? 0,
              shares: metric.shares ?? 0,
              saves: metric.saves ?? 0,
              impressions: metric.impressions ?? 0,
              reach: metric.reach ?? 0,
              engagementRate: metric.engagementRate?.toString() ?? null,
              watchTimeMinutes: metric.watchTimeMinutes?.toString() ?? null,
              platformSpecific: metric.platformSpecific || {},
            },
          });
      } catch {
        // Skip individual metric failures
      }
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshMaterializedViews() {
    try {
      if (this.config.verbose) {
        console.log('[SyncScheduler] Refreshing materialized views...');
      }
      
      const client = await pool.connect();
      try {
        // Refresh high-frequency views
        await client.query('SELECT refresh_hourly_analytics_views()');
        
        if (this.config.verbose) {
          console.log('[SyncScheduler] Materialized views refreshed');
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[SyncScheduler] Error refreshing materialized views:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
      config: this.config,
    };
  }
}

// Export singleton
export const syncScheduler = new SyncScheduler();
