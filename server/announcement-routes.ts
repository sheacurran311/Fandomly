import { Express } from "express";
import { z } from "zod";
import { db } from "./db";
import { programAnnouncements, loyaltyPrograms, creators } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/rbac";

// Validation schemas
const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(['update', 'new_campaign', 'new_task', 'achievement']).default('update'),
  metadata: z.object({
    campaignId: z.string().optional(),
    taskId: z.string().optional(),
    imageUrl: z.string().optional(),
  }).optional(),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

export function registerAnnouncementRoutes(app: Express) {
  
  /**
   * GET /api/programs/:programId/announcements
   * Get all announcements for a program (public endpoint)
   */
  app.get("/api/programs/:programId/announcements", async (req, res) => {
    try {
      const { programId } = req.params;
      
      const announcements = await db.select()
        .from(programAnnouncements)
        .where(and(
          eq(programAnnouncements.programId, programId),
          eq(programAnnouncements.isPublished, true)
        ))
        .orderBy(
          desc(programAnnouncements.isPinned),
          desc(programAnnouncements.createdAt)
        );

      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  /**
   * POST /api/programs/:programId/announcements
   * Create a new announcement (creator only)
   */
  app.post("/api/programs/:programId/announcements", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { programId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Verify program belongs to creator
      const [program] = await db.select()
        .from(loyaltyPrograms)
        .where(and(
          eq(loyaltyPrograms.id, programId),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: "Program not found or access denied" });
      }

      // Validate request body
      const validatedData = createAnnouncementSchema.parse(req.body);

      // Create announcement
      const [newAnnouncement] = await db.insert(programAnnouncements).values({
        programId,
        creatorId: creator.id,
        title: validatedData.title,
        content: validatedData.content,
        type: validatedData.type,
        metadata: validatedData.metadata,
        isPinned: validatedData.isPinned,
        isPublished: validatedData.isPublished,
      }).returning();

      res.status(201).json(newAnnouncement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error creating announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  /**
   * PUT /api/announcements/:id
   * Update an announcement (creator only)
   */
  app.put("/api/announcements/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Validate request body
      const validatedData = updateAnnouncementSchema.parse(req.body);

      // Update announcement
      const [updatedAnnouncement] = await db.update(programAnnouncements)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(and(
          eq(programAnnouncements.id, id),
          eq(programAnnouncements.creatorId, creator.id)
        ))
        .returning();

      if (!updatedAnnouncement) {
        return res.status(404).json({ error: "Announcement not found or access denied" });
      }

      res.json(updatedAnnouncement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  /**
   * DELETE /api/announcements/:id
   * Delete an announcement (creator only)
   */
  app.delete("/api/announcements/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Delete announcement
      await db.delete(programAnnouncements)
        .where(and(
          eq(programAnnouncements.id, id),
          eq(programAnnouncements.creatorId, creator.id)
        ));

      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
}

