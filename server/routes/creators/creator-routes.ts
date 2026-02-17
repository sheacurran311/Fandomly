/**
 * Creator Routes - Creator CRUD and profile management
 * Extracted from main.ts for better modularity
 */

import type { Express } from "express";
import type { IStorage } from "../../core/storage";
import { insertCreatorSchema } from "@shared/schema";
import { authenticateUser, requireRole, AuthenticatedRequest } from "../../middleware/rbac";
import { db } from "../../db";

export function registerCreatorRoutes(app: Express, storage: IStorage) {
  // Create creator (authenticated, admin only)
  app.post("/api/creators", authenticateUser, requireRole(['customer_admin', 'fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Creating creator with data:", req.body);
      const creatorData = insertCreatorSchema.parse(req.body);
      const creator = await storage.createCreator(creatorData);
      res.json(creator);
    } catch (error) {
      console.error("Creator creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid creator data" });
    }
  });

  // Get all creators (public)
  app.get("/api/creators", async (req, res) => {
    try {
      const creators = await storage.getAllCreators();
      console.log(`📊 GET /api/creators - Fetched ${creators.length} creators from database`);
      
      // Enrich with active campaign info, task counts, and user/tenant data
      const enriched = await Promise.all(creators.map(async (c) => {
        try {
          const activeCampaigns = await storage.getActiveCampaignsByCreator(c.id);
          
          // Get published tasks count
          let publishedTasks: any[] = [];
          try {
            const allTasks = await storage.getTasks(c.id, c.tenantId);
            const now = new Date();
            publishedTasks = allTasks.filter((task: any) => {
              if (task.isDraft || !task.isActive) return false;
              if (task.startTime && new Date(task.startTime) > now) return false;
              if (task.endTime && new Date(task.endTime) < now) return false;
              return true;
            });
          } catch (taskError) {
            console.warn(`Failed to fetch tasks for creator ${c.id}:`, taskError);
          }
          
          // Get user data for username
          let user = null;
          try {
            user = await storage.getUser(c.userId);
          } catch (userError) {
            console.warn(`Failed to fetch user for creator ${c.id}:`, userError);
          }
          
          // Get tenant data
          let tenant = null;
          try {
            tenant = await storage.getTenant(c.tenantId);
          } catch (tenantError) {
            console.warn(`Failed to fetch tenant for creator ${c.id}:`, tenantError);
          }

          // Get creator's program (single source of truth for fan-facing data)
          let hasPublishedProgram = false;
          let program = null;
          try {
            const { loyaltyPrograms } = await import("@shared/schema");
            const { eq, desc } = await import("drizzle-orm");

            // Get the most recent program for this creator
            const programs = await db.select()
              .from(loyaltyPrograms)
              .where(eq(loyaltyPrograms.creatorId, c.id))
              .orderBy(desc(loyaltyPrograms.createdAt))
              .limit(1);

            if (programs.length > 0) {
              program = programs[0];
              hasPublishedProgram = program.status === 'published';
            }
          } catch (programError) {
            console.warn(`Failed to check programs for creator ${c.id}:`, programError);
          }

          // Build response using program as canonical source, falling back to creator/user data
          const pageConfig = (program?.pageConfig as any) || {};
          return {
            ...c,
            displayName: program?.name || c.displayName,
            bio: program?.description || c.bio,
            imageUrl: pageConfig.logo || c.imageUrl,
            brandColors: pageConfig.brandColors || c.brandColors,
            socialLinks: pageConfig.socialLinks || c.socialLinks,
            hasActiveCampaign: activeCampaigns.length > 0,
            activeCampaignsCount: activeCampaigns.length,
            publishedTasksCount: publishedTasks.length,
            isLive: activeCampaigns.length > 0 || publishedTasks.length > 0,
            hasPublishedProgram,
            program: program ? {
              id: program.id,
              name: program.name,
              slug: program.slug,
              status: program.status,
              pointsName: program.pointsName,
              pageConfig: program.pageConfig,
            } : null,
            user: user ? { username: user.username, profileData: user.profileData } : null,
            tenant: tenant ? { slug: tenant.slug, branding: tenant.branding } : null,
          };
        } catch (enrichError) {
          console.error(`Failed to enrich creator ${c.id}:`, enrichError);
          return {
            ...c,
            hasActiveCampaign: false,
            activeCampaignsCount: 0,
            publishedTasksCount: 0,
            isLive: false,
            hasPublishedProgram: false,
            user: null,
            tenant: null,
          };
        }
      }));
      
      // Sort by creation date (newest first)
      const sorted = enriched.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      console.log(`✅ Returning ${sorted.length} creators (sorted by newest first)`);
      res.json(sorted);
    } catch (error) {
      console.error('Error fetching creators:', error);
      res.status(500).json({ error: "Failed to fetch creators" });
    }
  });

  // Get creator by ID (public)
  app.get("/api/creators/:id", async (req, res) => {
    try {
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // Update creator profile (authenticated)
  app.put("/api/creators/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }
      
      // Verify the creator belongs to this user
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      if (creator.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this creator" });
      }
      
      // Extract update fields
      const {
        displayName,
        bio,
        imageUrl,
        storeColors,
        typeSpecificData,
        publicFields
      } = req.body;
      
      const updates: any = {};
      
      if (displayName !== undefined) updates.displayName = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (storeColors !== undefined) updates.storeColors = storeColors;
      if (typeSpecificData !== undefined) updates.typeSpecificData = typeSpecificData;
      if (publicFields !== undefined) updates.publicFields = publicFields;
      
      const updatedCreator = await storage.updateCreator(id, updates);
      res.json(updatedCreator);
    } catch (error) {
      console.error('Creator update error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update creator" });
    }
  });

  // Get public creator page data (no auth required)
  app.get("/api/creators/public/:creatorUrl", async (req, res) => {
    try {
      const { creatorUrl } = req.params;
      
      // First try to find by tenant slug
      const tenant = await storage.getTenantBySlug(creatorUrl);
      if (!tenant) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      // Get creator by tenant ID
      const allCreators = await storage.getAllCreators();
      const creators = allCreators.filter(c => c.tenantId === tenant.id);
      if (!creators || creators.length === 0) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      const creator = creators[0]; // Primary creator for this tenant
      
      // Get user data
      const user = await storage.getUser(creator.userId);
      if (!user) {
        return res.status(404).json({ error: "Creator user not found" });
      }
      
      // Get published tasks
      const allTasks = await storage.getTasks(creator.id, creator.tenantId);
      const now = new Date();
      const publishedTasks = allTasks.filter((task: any) => {
        if (task.isDraft || !task.isActive) return false;
        if (task.startTime && new Date(task.startTime) > now) return false;
        if (task.endTime && new Date(task.endTime) < now) return false;
        return true;
      });
      
      // Get active campaigns
      const activeCampaigns = await storage.getActiveCampaignsByCreator(creator.id);
      
      // Get fan count
      const tenantMembers = await storage.getTenantMembers(tenant.id);
      const fanCount = tenantMembers.length;
      
      // Construct response
      res.json({
        creator: {
          ...creator,
          user: {
            username: user.username,
            displayName: (user.profileData as any)?.displayName || creator.displayName,
            profileData: user.profileData
          },
          tenant: {
            slug: tenant.slug,
            branding: tenant.branding
          }
        },
        tasks: publishedTasks,
        campaigns: activeCampaigns,
        fanCount,
        stats: {
          activeCampaigns: activeCampaigns.length,
          totalRewards: 0,
          engagementRate: undefined
        }
      });
    } catch (error) {
      console.error('Public creator page error:', error);
      res.status(500).json({ error: "Failed to fetch creator data" });
    }
  });

  // Update creator public page settings (authenticated)
  app.patch("/api/creators/:id/public-settings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }
      
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      if (creator.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this creator" });
      }
      
      const { publicPageSettings } = req.body;
      if (!publicPageSettings) {
        return res.status(400).json({ error: "Public page settings required" });
      }
      
      const updatedCreator = await storage.updateCreator(id, {
        publicPageSettings
      });
      
      res.json(updatedCreator);
    } catch (error) {
      console.error('Public settings update error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update settings" });
    }
  });

  // Get creator by user ID
  app.get("/api/creators/user/:userId", async (req, res) => {
    try {
      const creator = await storage.getCreatorByUserId(req.params.userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });
}
