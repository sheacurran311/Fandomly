import { Express } from "express";
import { z } from "zod";
import { db } from "./db";
import { loyaltyPrograms, campaigns, tasks } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/rbac";

// Validation schemas
const createProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  description: z.string().optional(),
  pointsName: z.string().default("Points"),
  pageConfig: z.object({
    headerImage: z.string().optional(),
    logo: z.string().optional(),
    brandColors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    }).optional(),
    customDomain: z.string().optional(),
    socialLinks: z.object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      discord: z.string().optional(),
      website: z.string().optional(),
    }).optional(),
  }).optional(),
  tiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    minPoints: z.number(),
    benefits: z.array(z.string()),
    color: z.string(),
  })).optional(),
});

const updateProgramSchema = createProgramSchema.partial();

const publishProgramSchema = z.object({
  slug: z.string().min(1, "URL slug is required"),
});

export function registerProgramRoutes(app: Express) {
  
  /**
   * GET /api/programs
   * Get all programs for the authenticated creator
   */
  app.get("/api/programs", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get all programs for this creator
      const programs = await db.select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.creatorId, creator.id))
        .orderBy(desc(loyaltyPrograms.createdAt));

      res.json(programs);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ error: "Failed to fetch programs" });
    }
  });

  /**
   * GET /api/programs/:id
   * Get a specific program with its campaigns and tasks
   */
  app.get("/api/programs/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get program
      const [program] = await db.select()
        .from(loyaltyPrograms)
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }

      // Get campaigns for this program
      const programCampaigns = await db.select()
        .from(campaigns)
        .where(eq(campaigns.programId, id))
        .orderBy(campaigns.displayOrder);

      // Get tasks for this creator (not necessarily in a campaign)
      const programTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.creatorId, creator.id))
        .orderBy(desc(tasks.createdAt));

      res.json({
        ...program,
        campaigns: programCampaigns,
        tasks: programTasks,
      });
    } catch (error) {
      console.error("Error fetching program:", error);
      res.status(500).json({ error: "Failed to fetch program" });
    }
  });

  /**
   * POST /api/programs
   * Create a new program
   */
  app.post("/api/programs", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator and tenant
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Validate request body
      const validatedData = createProgramSchema.parse(req.body);

      // Generate slug from name if not provided
      const slug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create program
      const [newProgram] = await db.insert(loyaltyPrograms).values({
        tenantId: creator.tenantId,
        creatorId: creator.id,
        name: validatedData.name,
        description: validatedData.description,
        pointsName: validatedData.pointsName,
        pageConfig: validatedData.pageConfig,
        tiers: validatedData.tiers,
        status: 'draft',
        slug: slug,
        isActive: false, // Not active until published
      }).returning();

      res.status(201).json(newProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error creating program:", error);
      res.status(500).json({ error: "Failed to create program" });
    }
  });

  /**
   * PUT /api/programs/:id
   * Update a program
   */
  app.put("/api/programs/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Validate request body
      const validatedData = updateProgramSchema.parse(req.body);

      // Update program
      const [updatedProgram] = await db.update(loyaltyPrograms)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .returning();

      if (!updatedProgram) {
        return res.status(404).json({ error: "Program not found" });
      }

      res.json(updatedProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      
      console.error("Error updating program:", error);
      res.status(500).json({ error: "Failed to update program" });
    }
  });

  /**
   * POST /api/programs/:id/publish
   * Publish a program (make it live)
   */
  app.post("/api/programs/:id/publish", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Optionally update slug from request
      const body = publishProgramSchema.safeParse(req.body);
      const slug = body.success ? body.data.slug : undefined;

      // Publish program
      const [publishedProgram] = await db.update(loyaltyPrograms)
        .set({
          status: 'published',
          isActive: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
          ...(slug && { slug }),
        })
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .returning();

      if (!publishedProgram) {
        return res.status(404).json({ error: "Program not found" });
      }

      res.json(publishedProgram);
    } catch (error) {
      console.error("Error publishing program:", error);
      res.status(500).json({ error: "Failed to publish program" });
    }
  });

  /**
   * POST /api/programs/:id/unpublish
   * Unpublish a program (make it draft)
   */
  app.post("/api/programs/:id/unpublish", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Unpublish program
      const [unpublishedProgram] = await db.update(loyaltyPrograms)
        .set({
          status: 'draft',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .returning();

      if (!unpublishedProgram) {
        return res.status(404).json({ error: "Program not found" });
      }

      res.json(unpublishedProgram);
    } catch (error) {
      console.error("Error unpublishing program:", error);
      res.status(500).json({ error: "Failed to unpublish program" });
    }
  });

  /**
   * DELETE /api/programs/:id
   * Delete a program
   */
  app.delete("/api/programs/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get creator record
      const { creators } = await import("@shared/schema");
      const [creator] = await db.select().from(creators).where(eq(creators.userId, userId)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Delete program
      await db.delete(loyaltyPrograms)
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ));

      res.json({ message: "Program deleted successfully" });
    } catch (error) {
      console.error("Error deleting program:", error);
      res.status(500).json({ error: "Failed to delete program" });
    }
  });

  /**
   * GET /api/programs/:id/preview
   * Get program preview (authenticated creators only, works for draft programs)
   */
  app.get("/api/programs/:id/preview", async (req, res) => {
    try {
      const { id } = req.params;
      const dynamicUserId = req.query.userId as string || req.headers['x-dynamic-user-id'] as string;

      if (!dynamicUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { creators: creatorsTable, users, campaigns, tasks: tasksTable } = await import("@shared/schema");

      // Get user ID from Dynamic user ID
      const [user] = await db.select()
        .from(users)
        .where(eq(users.dynamicUserId, dynamicUserId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Get creator record
      const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.userId, user.id)).limit(1);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get program by ID (creator must own it)
      const [program] = await db.select()
        .from(loyaltyPrograms)
        .where(and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.creatorId, creator.id)
        ))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }

      // Get creator profile data
      const [creatorUser] = await db.select()
        .from(users)
        .where(eq(users.id, creator.userId))
        .limit(1);

      // Get active campaigns for this program
      const programCampaigns = await db.select()
        .from(campaigns)
        .where(and(
          eq(campaigns.programId, program.id),
          eq(campaigns.status, 'active')
        ))
        .orderBy(desc(campaigns.createdAt));

      // Get active tasks for this program
      const programTasks = await db.select()
        .from(tasksTable)
        .where(and(
          eq(tasksTable.programId, program.id),
          eq(tasksTable.isActive, true)
        ))
        .orderBy(desc(tasksTable.createdAt));

      res.json({
        ...program,
        creator: {
          id: creator.id,
          displayName: creator.displayName || creatorUser?.username || 'Unknown Creator',
          bio: creator.bio,
          imageUrl: creator.imageUrl,
          bannerImage: creatorUser?.profileData?.bannerImage,
          socialLinks: creator.socialLinks || {},
        },
        campaigns: programCampaigns,
        tasks: programTasks,
      });
    } catch (error) {
      console.error("Error fetching program preview:", error);
      res.status(500).json({ error: "Failed to fetch program preview" });
    }
  });

  /**
   * GET /api/programs/public/:slug
   * Get public program page by slug (for fans to view)
   */
  app.get("/api/programs/public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const { creators: creatorsTable, users } = await import("@shared/schema");

      // Get published program by slug with creator and user data
      const result = await db.select({
        program: loyaltyPrograms,
        creator: creatorsTable,
        user: users,
      })
        .from(loyaltyPrograms)
        .leftJoin(creatorsTable, eq(loyaltyPrograms.creatorId, creatorsTable.id))
        .leftJoin(users, eq(creatorsTable.userId, users.id))
        .where(and(
          eq(loyaltyPrograms.slug, slug),
          eq(loyaltyPrograms.status, 'published')
        ))
        .limit(1);

      if (!result || result.length === 0) {
        return res.status(404).json({ error: "Program not found" });
      }

      const { program, creator, user } = result[0];

      // Get published campaigns for this program
      const programCampaigns = await db.select()
        .from(campaigns)
        .where(and(
          eq(campaigns.programId, program.id),
          eq(campaigns.status, 'active')
        ))
        .orderBy(campaigns.displayOrder);

      // Get active tasks for this program
      const programTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.programId, program.id),
          eq(tasks.isActive, true)
        ))
        .orderBy(desc(tasks.createdAt));

      res.json({
        ...program,
        creator: {
          ...creator,
          imageUrl: creator?.imageUrl,
          bannerImage: user?.profileData?.bannerImage,
          socialLinks: creator?.socialLinks,
          publicPageSettings: creator?.publicPageSettings,
        },
        campaigns: programCampaigns,
        tasks: programTasks,
      });
    } catch (error) {
      console.error("Error fetching public program:", error);
      res.status(500).json({ error: "Failed to fetch program" });
    }
  });

  /**
   * GET /api/programs/:programId/activity
   * Get recent activity for a program (task completions, etc.)
   */
  app.get("/api/programs/:programId/activity", async (req, res) => {
    try {
      const { programId } = req.params;
      const { taskCompletions, users } = await import("@shared/schema");

      // Fetch recent task completions with user data
      const activity = await db.select({
        completion: taskCompletions,
        user: users,
        task: tasks,
      })
        .from(taskCompletions)
        .leftJoin(users, eq(taskCompletions.userId, users.id))
        .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
        .where(eq(tasks.creatorId, programId))
        .orderBy(desc(taskCompletions.createdAt))
        .limit(20);

      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  /**
   * GET /api/programs/:programId/leaderboard
   * Get top fans leaderboard for a program
   */
  app.get("/api/programs/:programId/leaderboard", async (req, res) => {
    try {
      const { programId } = req.params;
      const { fanPrograms, users } = await import("@shared/schema");

      const leaderboard = await db.select({
        userId: fanPrograms.fanId,
        username: users.username,
        avatar: users.avatar,
        points: fanPrograms.totalPointsEarned,
        currentTier: fanPrograms.currentTier,
      })
        .from(fanPrograms)
        .leftJoin(users, eq(fanPrograms.fanId, users.id))
        .where(eq(fanPrograms.programId, programId))
        .orderBy(desc(fanPrograms.totalPointsEarned))
        .limit(50);

      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  /**
   * GET /api/programs/:programId/user-stats
   * Get current user's stats for a program
   */
  app.get("/api/programs/:programId/user-stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { programId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { fanPrograms, taskCompletions, tasks, loyaltyPrograms } = await import("@shared/schema");

      // Get user's fan program record
      const [fanProgram] = await db.select()
        .from(fanPrograms)
        .where(and(
          eq(fanPrograms.programId, programId),
          eq(fanPrograms.fanId, userId)
        ))
        .limit(1);

      // Get tasks completed count
      const completedTasks = await db.select({ count: sql<number>`count(*)` })
        .from(taskCompletions)
        .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
        .where(and(
          eq(taskCompletions.userId, userId),
          eq(tasks.creatorId, (
            db.select({ creatorId: loyaltyPrograms.creatorId })
              .from(loyaltyPrograms)
              .where(eq(loyaltyPrograms.id, programId))
              .limit(1)
          ))
        ));

      // Get user's rank on leaderboard
      const allFans = await db.select({
        fanId: fanPrograms.fanId,
        points: fanPrograms.totalPointsEarned
      })
        .from(fanPrograms)
        .where(eq(fanPrograms.programId, programId))
        .orderBy(desc(fanPrograms.totalPointsEarned));

      const userRank = allFans.findIndex(f => f.fanId === userId) + 1;

      res.json({
        points: fanProgram?.totalPointsEarned || 0,
        tasksCompleted: completedTasks[0]?.count || 0,
        leaderboardRank: userRank > 0 ? userRank : null,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  /**
   * GET /api/programs/:programId/social-task-completions
   * Get current user's social task completion status
   */
  app.get("/api/programs/:programId/social-task-completions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { programId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { taskCompletions, tasks } = await import("@shared/schema");

      // Get all completed social tasks for this user in this program
      const completedSocialTasks = await db.select({
        taskId: taskCompletions.taskId,
        taskType: tasks.taskType,
        platform: tasks.platform,
        completedAt: taskCompletions.completedAt,
      })
        .from(taskCompletions)
        .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
        .where(and(
          eq(taskCompletions.userId, userId),
          eq(tasks.programId, programId),
          eq(tasks.isActive, true)
        ));

      // Group by platform for easy lookup
      const completionsByPlatform: Record<string, { completed: boolean; completedAt?: Date }> = {};
      
      completedSocialTasks.forEach(task => {
        if (task.platform) {
          completionsByPlatform[task.platform] = {
            completed: true,
            completedAt: task.completedAt || undefined,
          };
        }
      });

      res.json(completionsByPlatform);
    } catch (error) {
      console.error("Error fetching social task completions:", error);
      res.status(500).json({ error: "Failed to fetch social task completions" });
    }
  });
}


