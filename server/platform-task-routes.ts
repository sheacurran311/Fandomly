import { Express } from "express";
import { db } from "./db";
import { tasks, platformTaskCompletions, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from "./middleware/rbac";
import { platformPointsService } from "./platform-points-service";
import { z } from "zod";

const completeTaskSchema = z.object({
  verificationUrl: z.string().url().optional(),
  screenshotUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export function registerPlatformTaskRoutes(app: Express) {
  /**
   * GET /api/platform-tasks
   * Get all active platform tasks filtered by user's account type
   */
  app.get("/api/platform-tasks", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's account type to filter tasks
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Determine user's account type
      let userAccountType = 'fan'; // Default
      
      if (user.userType === 'creator') {
        // Check creator's specific type from creator table if available
        const creator = await db.query.creators.findFirst({
          where: (creators, { eq }) => eq(creators.userId, userId),
        });
        
        if (creator) {
          const creatorType = creator.category;
          if (creatorType === 'athlete') {
            userAccountType = 'creator-athlete';
          } else if (creatorType === 'musician') {
            userAccountType = 'creator-musician';
          } else if (creatorType === 'content_creator') {
            userAccountType = 'creator-content-creator';
          } else {
            userAccountType = 'creator'; // Generic creator
          }
        } else {
          userAccountType = 'creator';
        }
      }

      // Get all active platform tasks
      const platformTasks = await db.query.tasks.findMany({
        where: and(
          eq(tasks.ownershipLevel, 'platform'),
          eq(tasks.isActive, true),
          eq(tasks.isDraft, false)
        ),
      });

      // Filter tasks by eligible account types
      const eligibleTasks = platformTasks.filter(task => {
        const eligibleTypes = (task as any).eligibleAccountTypes || ['fan'];
        return eligibleTypes.includes(userAccountType) || eligibleTypes.includes('creator');
      });

      // Get user's completion status for these tasks
      const completions = await db.query.platformTaskCompletions.findMany({
        where: (completions, { eq }) => eq(completions.userId, userId),
      });

      const completionMap = new Map(completions.map(c => [c.taskId, c]));

      // Attach completion status to each task
      const tasksWithStatus = eligibleTasks.map(task => ({
        ...task,
        completion: completionMap.get(task.id) || null,
      }));

      res.json({
        tasks: tasksWithStatus,
        userAccountType,
        count: tasksWithStatus.length,
      });
    } catch (error) {
      console.error("Error fetching platform tasks:", error);
      res.status(500).json({ error: "Failed to fetch platform tasks" });
    }
  });

  /**
   * POST /api/platform-tasks/:taskId/complete
   * Mark a platform task as completed
   */
  app.post("/api/platform-tasks/:taskId/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.id;
      
      const validatedData = completeTaskSchema.parse(req.body);

      // Check if task exists and is a platform task
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.ownershipLevel, 'platform'),
          eq(tasks.isActive, true)
        ),
      });

      if (!task) {
        return res.status(404).json({ error: "Platform task not found" });
      }

      // Check if user already completed this task
      const existingCompletion = await db.query.platformTaskCompletions.findFirst({
        where: and(
          eq(platformTaskCompletions.taskId, taskId),
          eq(platformTaskCompletions.userId, userId)
        ),
      });

      if (existingCompletion) {
        return res.status(400).json({ error: "Task already completed" });
      }

      // Get points to award from task
      const pointsToAward = task.pointsToReward || 50;

      // Create completion record
      const [completion] = await db
        .insert(platformTaskCompletions)
        .values({
          taskId,
          userId,
          status: 'completed', // Auto-approve for MVP
          pointsAwarded: pointsToAward,
          completionData: {
            socialPlatform: task.platform,
            verificationUrl: validatedData.verificationUrl,
            screenshotUrl: validatedData.screenshotUrl,
            metadata: validatedData.metadata,
          },
          completedAt: new Date(),
          verifiedAt: new Date(), // Auto-verified for MVP
        })
        .returning();

      // Award platform points
      await platformPointsService.awardPoints(
        userId,
        pointsToAward,
        `platform_task_completion`,
        {
          taskId,
          taskName: task.name,
          completionId: completion.id,
        }
      );

      // Update task completion count
      await db
        .update(tasks)
        .set({
          totalCompletions: sql`${tasks.totalCompletions} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      console.log(`[Platform Tasks] User ${userId} completed task ${taskId}, awarded ${pointsToAward} points`);

      res.json({
        success: true,
        completion,
        pointsAwarded: pointsToAward,
      });
    } catch (error) {
      console.error("Error completing platform task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to complete platform task" });
    }
  });

  /**
   * GET /api/platform-tasks/completions
   * Get current user's platform task completion history
   */
  app.get("/api/platform-tasks/completions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const completions = await db.query.platformTaskCompletions.findMany({
        where: (completions, { eq }) => eq(completions.userId, userId),
        orderBy: (completions, { desc }) => [desc(completions.createdAt)],
        with: {
          task: true,
        },
      });

      res.json({
        completions,
        count: completions.length,
      });
    } catch (error) {
      console.error("Error fetching platform task completions:", error);
      res.status(500).json({ error: "Failed to fetch platform task completions" });
    }
  });

  /**
   * POST /api/platform-tasks/:completionId/verify
   * Admin verify a platform task completion (for manual verification)
   */
  app.post("/api/platform-tasks/:completionId/verify", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { completionId } = req.params;
      const { approved, reason } = req.body;

      const completion = await db.query.platformTaskCompletions.findFirst({
        where: eq(platformTaskCompletions.id, completionId),
      });

      if (!completion) {
        return res.status(404).json({ error: "Completion not found" });
      }

      if (approved) {
        // Approve and award points if not already awarded
        const [updated] = await db
          .update(platformTaskCompletions)
          .set({
            status: 'verified',
            verifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(platformTaskCompletions.id, completionId))
          .returning();

        // Award points if not already awarded
        if (completion.pointsAwarded > 0 && completion.status === 'pending') {
          await platformPointsService.awardPoints(
            completion.userId,
            completion.pointsAwarded,
            'platform_task_verification',
            {
              completionId,
              verifiedBy: req.user!.id,
            }
          );
        }

        res.json({
          success: true,
          completion: updated,
          message: "Task completion verified and points awarded",
        });
      } else {
        // Reject completion
        await db
          .update(platformTaskCompletions)
          .set({
            status: 'pending',
            completionData: {
              ...(completion.completionData || {}),
              rejectionReason: reason,
            },
            updatedAt: new Date(),
          })
          .where(eq(platformTaskCompletions.id, completionId));

        res.json({
          success: false,
          message: "Task completion rejected",
          reason,
        });
      }
    } catch (error) {
      console.error("Error verifying platform task completion:", error);
      res.status(500).json({ error: "Failed to verify platform task completion" });
    }
  });
}

