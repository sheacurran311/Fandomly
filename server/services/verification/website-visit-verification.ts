/**
 * Website Visit Verification Service
 *
 * Auto-verified task type for tracking link clicks and website visits.
 *
 * Features:
 * - Generate unique tracking tokens per user/task
 * - Track click events
 * - Verify time on site requirements (optional)
 * - Verify action completion via postMessage (optional)
 * - Auto-award points after criteria met
 */

import { db } from '../../db';
import { websiteVisitTracking, taskCompletions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface WebsiteVisitTaskSettings {
  destinationUrl: string;
  requireMinTimeOnSite?: boolean;
  minTimeOnSiteSeconds?: number; // e.g., 30 seconds
  requireActionCompletion?: boolean; // e.g., form submission, video watch
  actionType?: string; // 'form_submit' | 'video_watch' | 'button_click' | 'custom'
}

export interface GenerateTrackingTokenRequest {
  userId: string;
  taskId: string;
  taskCompletionId: number;
  tenantId: string;
  destinationUrl: string;
}

export interface TrackClickRequest {
  token: string;
  metadata?: {
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface VerifyTimeOnSiteRequest {
  token: string;
  timeOnSiteSeconds: number;
}

export interface VerifyActionCompletedRequest {
  token: string;
  actionType: string;
}

export interface WebsiteVisitVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

export class WebsiteVisitVerificationService {
  /**
   * Generate unique tracking token for website visit
   */
  async generateTrackingToken(request: GenerateTrackingTokenRequest): Promise<string> {
    const { userId, taskId, taskCompletionId, tenantId, destinationUrl } = request;

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create tracking record
    await db.insert(websiteVisitTracking).values({
      userId,
      taskId,
      taskCompletionId: taskCompletionId.toString(),
      tenantId,
      uniqueToken: token,
      destinationUrl,
      clickedAt: null, // Will be set when user clicks
      timeOnSite: null,
      actionCompleted: false,
      completedAt: null,
      metadata: {},
    });

    return token;
  }

  /**
   * Track when user clicks the link
   */
  async trackClick(request: TrackClickRequest): Promise<void> {
    const { token, metadata } = request;

    const visit = await db.query.websiteVisitTracking.findFirst({
      where: eq(websiteVisitTracking.uniqueToken, token),
    });

    if (!visit) {
      throw new Error('Invalid tracking token');
    }

    // Update click timestamp
    await db
      .update(websiteVisitTracking)
      .set({
        clickedAt: new Date(),
        metadata: metadata || {},
      })
      .where(eq(websiteVisitTracking.uniqueToken, token));
  }

  /**
   * Verify time on site requirement
   */
  async verifyTimeOnSite(request: VerifyTimeOnSiteRequest): Promise<void> {
    const { token, timeOnSiteSeconds } = request;

    const visit = await db.query.websiteVisitTracking.findFirst({
      where: eq(websiteVisitTracking.uniqueToken, token),
    });

    if (!visit) {
      throw new Error('Invalid tracking token');
    }

    // Update time on site
    await db
      .update(websiteVisitTracking)
      .set({
        timeOnSite: timeOnSiteSeconds,
      })
      .where(eq(websiteVisitTracking.uniqueToken, token));
  }

  /**
   * Verify action completion (e.g., form submission)
   */
  async verifyActionCompleted(request: VerifyActionCompletedRequest): Promise<void> {
    const { token, actionType } = request;

    const visit = await db.query.websiteVisitTracking.findFirst({
      where: eq(websiteVisitTracking.uniqueToken, token),
    });

    if (!visit) {
      throw new Error('Invalid tracking token');
    }

    // Update action completion
    await db
      .update(websiteVisitTracking)
      .set({
        actionCompleted: true,
        completedAt: new Date(),
        metadata: {
          ...(visit.metadata as any || {}),
          actionType,
          completedAt: new Date().toISOString(),
        },
      })
      .where(eq(websiteVisitTracking.uniqueToken, token));
  }

  /**
   * Main verification method
   *
   * Called by unified-verification.ts to check if website visit is complete
   */
  async verify(params: {
    userId: string;
    taskType: string;
    proofUrl?: string; // Not used for website visits
    screenshotUrl?: string; // Not used for website visits
    taskSettings: WebsiteVisitTaskSettings;
    trackingToken?: string; // Token from frontend
  }): Promise<WebsiteVisitVerificationResult> {
    const { userId, taskSettings, trackingToken } = params;

    if (!trackingToken) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No tracking token provided',
      };
    }

    // Get visit tracking record
    const visit = await db.query.websiteVisitTracking.findFirst({
      where: and(
        eq(websiteVisitTracking.uniqueToken, trackingToken),
        eq(websiteVisitTracking.userId, userId)
      ),
    });

    if (!visit) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Invalid or expired tracking token',
      };
    }

    // Check if link was clicked
    if (!visit.clickedAt) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Link not clicked yet',
      };
    }

    // Check time on site requirement
    if (taskSettings.requireMinTimeOnSite && taskSettings.minTimeOnSiteSeconds) {
      if (!visit.timeOnSite || visit.timeOnSite < taskSettings.minTimeOnSiteSeconds) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'medium',
          reason: `Minimum time on site not met (required: ${taskSettings.minTimeOnSiteSeconds}s, actual: ${visit.timeOnSite || 0}s)`,
          metadata: {
            minTimeRequired: taskSettings.minTimeOnSiteSeconds,
            actualTime: visit.timeOnSite || 0,
          },
        };
      }
    }

    // Check action completion requirement
    if (taskSettings.requireActionCompletion) {
      if (!visit.actionCompleted) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'medium',
          reason: `Required action not completed (${taskSettings.actionType || 'custom action'})`,
          metadata: {
            requiredAction: taskSettings.actionType,
          },
        };
      }
    }

    // All criteria met - auto-verify!
    return {
      verified: true,
      requiresManualReview: false,
      confidence: 'high',
      metadata: {
        clickedAt: visit.clickedAt,
        timeOnSite: visit.timeOnSite,
        actionCompleted: visit.actionCompleted,
        destinationUrl: visit.destinationUrl,
      },
    };
  }

  /**
   * Get tracking URL with embedded token
   *
   * This creates a redirect URL through our server that tracks the click
   * before redirecting to the actual destination.
   */
  getTrackingUrl(token: string, baseUrl: string): string {
    // Construct tracking URL
    // Example: https://app.fandomly.com/track/visit?token=abc123
    return `${baseUrl}/api/track/visit?token=${token}`;
  }

  /**
   * Get visit stats for a user/task
   */
  async getVisitStats(userId: string, taskId: string): Promise<{
    totalClicks: number;
    completedVisits: number;
    averageTimeOnSite: number;
    lastVisitAt?: Date;
  }> {
    const visits = await db.query.websiteVisitTracking.findMany({
      where: and(
        eq(websiteVisitTracking.userId, userId),
        eq(websiteVisitTracking.taskId, taskId)
      ),
    });

    const totalClicks = visits.filter(v => v.clickedAt).length;
    const completedVisits = visits.filter(v => v.actionCompleted).length;
    const totalTime = visits.reduce((sum, v) => sum + (v.timeOnSite || 0), 0);
    const averageTimeOnSite = totalClicks > 0 ? totalTime / totalClicks : 0;
    const lastVisitAtRaw = visits
      .filter(v => v.clickedAt)
      .sort((a, b) => (b.clickedAt?.getTime() || 0) - (a.clickedAt?.getTime() || 0))[0]?.clickedAt;

    return {
      totalClicks,
      completedVisits,
      averageTimeOnSite: Math.round(averageTimeOnSite),
      lastVisitAt: lastVisitAtRaw ?? undefined,
    };
  }

  /**
   * Clean up old tracking tokens (e.g., > 7 days old and not completed)
   */
  async cleanupOldTokens(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(websiteVisitTracking)
      .where(
        and(
          eq(websiteVisitTracking.actionCompleted, false),
          // @ts-ignore - Drizzle type issue with date comparison
          eq(websiteVisitTracking.createdAt, cutoffDate)
        )
      );

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const websiteVisitVerification = new WebsiteVisitVerificationService();
