/* eslint-disable @typescript-eslint/no-explicit-any */
import { Express } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { websiteVisitTracking, tasks, taskCompletions } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { pointsService } from '../../services/points/points-service';

interface WebsiteVisitConfig {
  url: string; // Destination URL
  minimumDuration?: number; // Minimum seconds to spend on page (optional)
  requireConfirmation?: boolean; // Require client-side confirmation of time spent
}

export function registerVisitTrackingRoutes(app: Express) {
  // POST /api/tasks/:taskId/visit-link
  // Generate a unique tracking link for a user+task
  app.post(
    '/api/tasks/:taskId/visit-link',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Validate task exists and is website_visit type
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, taskId),
        });

        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (task.taskType !== 'website_visit') {
          return res.status(400).json({ error: 'Task is not a website visit task' });
        }

        const config = (task.customSettings || {}) as unknown as WebsiteVisitConfig;
        if (!config.url) {
          return res.status(400).json({ error: 'Task has no destination URL configured' });
        }

        // Check if user already has a tracking link for this task
        const existingTracking = await db.query.websiteVisitTracking.findFirst({
          where: and(
            eq(websiteVisitTracking.taskId, taskId),
            eq(websiteVisitTracking.userId, userId)
          ),
        });

        let trackingToken: string;

        if (existingTracking && !existingTracking.actionCompleted) {
          // Reuse existing token if visit not yet confirmed
          trackingToken = existingTracking.uniqueToken;
        } else {
          // 2. Generate unique token
          trackingToken = nanoid(32);

          // 3. Create or get task completion
          let taskCompletionId: string | null = null;

          const existingCompletion = await db.query.taskCompletions.findFirst({
            where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.userId, userId)),
          });

          if (existingCompletion) {
            taskCompletionId = existingCompletion.id;
          } else {
            // Create pending completion
            const [newCompletion] = await db
              .insert(taskCompletions)
              .values({
                taskId,
                userId,
                tenantId: task.tenantId ?? '',
                status: 'pending',
                startedAt: new Date(),
                verificationMethod: 'website_visit',
                completionData: {
                  trackingToken,
                } as Record<string, unknown>,
              })
              .returning();

            taskCompletionId = newCompletion.id;
          }

          // 4. Create websiteVisitTracking record
          await db
            .insert(websiteVisitTracking)
            .values({
              userId,
              taskId,
              taskCompletionId: taskCompletionId ?? undefined,
              tenantId: task.tenantId ?? '',
              uniqueToken: trackingToken,
              destinationUrl: config.url,
            })
            .returning();
        }

        // 5. Return tracking URL and destination
        const trackingUrl = `/api/track/${trackingToken}`;

        res.json({
          trackingUrl,
          destinationUrl: config.url,
          requireConfirmation: config.requireConfirmation || false,
          minimumDuration: config.minimumDuration,
          trackingToken,
        });
      } catch (error: any) {
        console.error('Error creating visit tracking link:', error);
        res.status(500).json({ error: error.message || 'Failed to create tracking link' });
      }
    }
  );

  // GET /api/track/:token
  // Redirect to destination URL and mark visit as started
  // This is the public tracking endpoint (no auth required)
  app.get('/api/track/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // 1. Look up tracking record by token
      const tracking = await db.query.websiteVisitTracking.findFirst({
        where: eq(websiteVisitTracking.uniqueToken, token),
      });

      if (!tracking) {
        return res.status(404).json({ error: 'Tracking link not found or expired' });
      }

      // Get task to check config
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, tracking.taskId),
      });

      if (!task) {
        return res.status(404).json({ error: 'Associated task not found' });
      }

      const config = (task.customSettings || {}) as unknown as WebsiteVisitConfig;

      // 2. Record visit timestamp, user agent, IP (if not already clicked)
      if (!tracking.clickedAt) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
          req.socket.remoteAddress ||
          'unknown';

        await db
          .update(websiteVisitTracking)
          .set({
            clickedAt: new Date(),
            metadata: {
              userAgent,
              ipAddress,
            },
          })
          .where(eq(websiteVisitTracking.id, tracking.id));
      }

      // 3. If no confirmation required and no minimum duration, mark as complete immediately
      if (!config.requireConfirmation && !config.minimumDuration) {
        await db
          .update(websiteVisitTracking)
          .set({
            actionCompleted: true,
            timeOnSite: 0,
            completedAt: new Date(),
          })
          .where(eq(websiteVisitTracking.id, tracking.id));

        // Mark task as completed
        if (tracking.taskCompletionId) {
          await db
            .update(taskCompletions)
            .set({
              status: 'completed',
              completedAt: new Date(),
              verifiedAt: new Date(),
            })
            .where(eq(taskCompletions.id, tracking.taskCompletionId));

          // Award points
          const points = task.pointsToReward ?? 0;
          if (points > 0 && task.tenantId && task.creatorId) {
            await pointsService.creator.awardPoints(
              tracking.userId,
              task.creatorId,
              task.tenantId,
              points,
              'task_completion',
              `Visited website: ${task.name}`,
              {
                taskId: task.id,
                taskCompletionId: tracking.taskCompletionId,
                trackingToken: token,
              }
            );
          }
        }
      }

      // 5. Redirect to destination URL
      res.redirect(tracking.destinationUrl);
    } catch (error: any) {
      console.error('Error processing tracking redirect:', error);
      res.status(500).json({ error: error.message || 'Failed to process tracking' });
    }
  });

  // POST /api/track/:token/confirm
  // Called by client after minimum time spent on page
  app.post('/api/track/:token/confirm', async (req, res) => {
    try {
      const { token } = req.params;
      const { timeSpent } = req.body as { timeSpent?: number }; // Time in seconds

      // 1. Look up tracking record
      const tracking = await db.query.websiteVisitTracking.findFirst({
        where: eq(websiteVisitTracking.uniqueToken, token),
      });

      if (!tracking) {
        return res.status(404).json({ error: 'Tracking link not found' });
      }

      if (tracking.actionCompleted) {
        return res.json({ success: true, message: 'Visit already confirmed' });
      }

      if (!tracking.clickedAt) {
        return res.status(400).json({ error: 'Visit not started yet' });
      }

      // Get task to check config
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, tracking.taskId),
      });

      if (!task) {
        return res.status(404).json({ error: 'Associated task not found' });
      }

      const config = (task.customSettings || {}) as unknown as WebsiteVisitConfig;

      // 2. Calculate time since initial visit
      const clickedAt = new Date(tracking.clickedAt);
      const now = new Date();
      const actualTimeSpent = Math.floor((now.getTime() - clickedAt.getTime()) / 1000);

      // Use the greater of client-reported time or server-calculated time
      const finalTimeSpent = Math.max(timeSpent || 0, actualTimeSpent);

      // 3. Check if enough time has passed
      const minimumDuration = config.minimumDuration || 0;
      if (finalTimeSpent < minimumDuration) {
        return res.status(400).json({
          error: 'Minimum time requirement not met',
          required: minimumDuration,
          actual: finalTimeSpent,
        });
      }

      // 4. Mark as confirmed
      await db
        .update(websiteVisitTracking)
        .set({
          actionCompleted: true,
          timeOnSite: finalTimeSpent,
          completedAt: new Date(),
        })
        .where(eq(websiteVisitTracking.id, tracking.id));

      // 5. Mark task completion as verified and award points
      if (tracking.taskCompletionId) {
        await db
          .update(taskCompletions)
          .set({
            status: 'completed',
            completedAt: new Date(),
            verifiedAt: new Date(),
            completionData: {
              trackingToken: token,
              timeSpentSeconds: finalTimeSpent,
            } as Record<string, unknown>,
          })
          .where(eq(taskCompletions.id, tracking.taskCompletionId));

        // Award points
        const points = task.pointsToReward ?? 0;
        if (points > 0 && task.tenantId && task.creatorId) {
          await pointsService.creator.awardPoints(
            tracking.userId,
            task.creatorId,
            task.tenantId,
            points,
            'task_completion',
            `Completed website visit: ${task.name}`,
            {
              taskId: task.id,
              taskCompletionId: tracking.taskCompletionId,
              trackingToken: token,
              timeSpentSeconds: finalTimeSpent,
            }
          );

          return res.json({
            success: true,
            message: 'Visit confirmed and points awarded!',
            pointsAwarded: points,
            timeSpent: finalTimeSpent,
          });
        }
      }

      res.json({
        success: true,
        message: 'Visit confirmed!',
        timeSpent: finalTimeSpent,
      });
    } catch (error: any) {
      console.error('Error confirming visit:', error);
      res.status(500).json({ error: error.message || 'Failed to confirm visit' });
    }
  });

  // GET /api/tasks/:taskId/visit-status
  // Check visit status for current user
  app.get(
    '/api/tasks/:taskId/visit-status',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const tracking = await db.query.websiteVisitTracking.findFirst({
          where: and(
            eq(websiteVisitTracking.taskId, taskId),
            eq(websiteVisitTracking.userId, userId)
          ),
        });

        if (!tracking) {
          return res.json({ visited: false, confirmed: false });
        }

        res.json({
          visited: !!tracking.clickedAt,
          confirmed: tracking.actionCompleted,
          clickedAt: tracking.clickedAt,
          timeSpent: tracking.timeOnSite,
          trackingToken: tracking.uniqueToken,
        });
      } catch (error: any) {
        console.error('Error fetching visit status:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch visit status' });
      }
    }
  );

  console.log('✅ Website visit tracking routes registered');
}
