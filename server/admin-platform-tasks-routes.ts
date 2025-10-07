import { Express } from "express";
import { z } from "zod";
import { eq, count } from "drizzle-orm";
import { db } from "./db";
import { platformTasks } from "@shared/schema";
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from "./middleware/rbac";

// Platform task schema
const createPlatformTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(['profile', 'social', 'engagement']),
  category: z.string().min(1, "Category is required"),
  points: z.number().min(1, "Points must be at least 1"),
  requiredFields: z.array(z.string()).optional().default([]),
  socialPlatform: z.string().optional(),
});

const updatePlatformTaskSchema = createPlatformTaskSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export function registerAdminPlatformTasksRoutes(app: Express) {
  // Get all platform tasks
  app.get("/api/admin/platform-tasks", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tasks = await db.select().from(platformTasks).orderBy(platformTasks.createdAt);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching platform tasks:", error);
      res.status(500).json({ error: "Failed to fetch platform tasks" });
    }
  });

  // Create a new platform task
  app.post("/api/admin/platform-tasks", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = createPlatformTaskSchema.parse(req.body);
      
      const [newTask] = await db.insert(platformTasks).values({
        ...validatedData,
        isActive: true,
        createdAt: new Date(),
      }).returning();
      
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error creating platform task:", error);
      res.status(500).json({ error: "Failed to create platform task" });
    }
  });

  // Update a platform task
  app.put("/api/admin/platform-tasks/:id", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = updatePlatformTaskSchema.parse(req.body);
      
      const [updatedTask] = await db.update(platformTasks)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(platformTasks.id, id))
        .returning();
      
      if (!updatedTask) {
        return res.status(404).json({ error: "Platform task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error updating platform task:", error);
      res.status(500).json({ error: "Failed to update platform task" });
    }
  });

  // Delete a platform task
  app.delete("/api/admin/platform-tasks/:id", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      const deletedTask = await db.delete(platformTasks)
        .where(eq(platformTasks.id, id))
        .returning();
      
      if (!deletedTask.length) {
        return res.status(404).json({ error: "Platform task not found" });
      }
      
      res.json({ message: "Platform task deleted successfully" });
    } catch (error) {
      console.error("Error deleting platform task:", error);
      res.status(500).json({ error: "Failed to delete platform task" });
    }
  });

  // Get platform task statistics
  app.get("/api/admin/platform-tasks/stats", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // This would need to be implemented with task completion tracking
      // For now, return basic stats
      const totalTasks = await db.select({ count: count() }).from(platformTasks);
      const activeTasks = await db.select({ count: count() }).from(platformTasks).where(eq(platformTasks.isActive, true));
      
      res.json({
        totalTasks: totalTasks[0]?.count || 0,
        activeTasks: activeTasks[0]?.count || 0,
        totalPointsAwarded: 0, // Would need to calculate from task completions
        completionsThisMonth: 0, // Would need to calculate from task completions
      });
    } catch (error) {
      console.error("Error fetching platform task stats:", error);
      res.status(500).json({ error: "Failed to fetch platform task statistics" });
    }
  });

  console.log("[Admin Platform Tasks] Routes registered ✅");
}
