/* eslint-disable @typescript-eslint/no-explicit-any */
import { Express } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { loyaltyPrograms, campaigns, tasks } from '@shared/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { publicEndpointLimiter } from '../../middleware/rate-limit';
import { enforceSubscriptionLimitForUser } from '../../services/subscription-limit-service';

// Validation schemas
const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  description: z.string().optional(),
  pointsName: z.string().default('Points'),
  pageConfig: z
    .object({
      headerImage: z.string().optional(),
      logo: z.string().optional(),
      brandColors: z
        .object({
          primary: z.string(),
          secondary: z.string(),
          accent: z.string(),
        })
        .optional(),
      // Theme settings - supports both Phase 0 (basic) and Phase 1 (enhanced) structures
      theme: z
        .object({
          mode: z.enum(['light', 'dark', 'custom']).optional(),
          backgroundColor: z.string().optional(),
          textColor: z.string().optional(),
          // Phase 1 enhanced theme structure (optional)
          templateId: z.string().optional(),
          name: z.string().optional(),
          colors: z.any().optional(), // Complex nested structure, validated by schema.ts
          typography: z.any().optional(),
          layout: z.any().optional(),
        })
        .optional(),
      // Visibility settings
      visibility: z
        .object({
          showProfile: z.boolean().optional(),
          showCampaigns: z.boolean().optional(),
          showTasks: z.boolean().optional(),
          showRewards: z.boolean().optional(),
          showLeaderboard: z.boolean().optional(),
          showActivityFeed: z.boolean().optional(),
          showFanWidget: z.boolean().optional(),
          profileData: z
            .object({
              showBio: z.boolean().optional(),
              showLocation: z.boolean().optional(),
              showWebsite: z.boolean().optional(),
              showSocialLinks: z.boolean().optional(),
              showJoinDate: z.boolean().optional(),
              showFollowerCount: z.boolean().optional(),
              showVerificationBadge: z.boolean().optional(),
              showTiers: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      customDomain: z.string().optional(),
      socialLinks: z
        .object({
          twitter: z.string().optional(),
          instagram: z.string().optional(),
          discord: z.string().optional(),
          website: z.string().optional(),
        })
        .optional(),
      // Creator details - type-specific info (sport, position, genre, etc.)
      // Replaces the old separate profile data with program-as-source-of-truth
      creatorDetails: z.record(z.any()).optional(),
      // Location for the creator
      location: z.string().optional(),
    })
    .optional(),
  tiers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        minPoints: z.number(),
        benefits: z.array(z.string()),
        color: z.string(),
      })
    )
    .optional(),
});

const updateProgramSchema = createProgramSchema.partial();

const publishProgramSchema = z.object({
  slug: z.string().min(1, 'URL slug is required'),
});

export function registerProgramRoutes(app: Express) {
  /**
   * GET /api/programs
   * Get all programs for the authenticated creator
   */
  app.get('/api/programs', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get creator record
      const { creators } = await import('@shared/schema');
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get all programs for this creator
      const programs = await db
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.creatorId, creator.id))
        .orderBy(desc(loyaltyPrograms.createdAt));

      res.json(programs);
    } catch (error) {
      console.error('Error fetching programs:', error);
      res.status(500).json({ error: 'Failed to fetch programs' });
    }
  });

  /**
   * GET /api/programs/:id
   * Get a specific program with its campaigns and tasks
   */
  app.get('/api/programs/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get creator record
      const { creators } = await import('@shared/schema');
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get program
      const [program] = await db
        .select()
        .from(loyaltyPrograms)
        .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Get campaigns for this program
      const programCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.programId, id))
        .orderBy(campaigns.displayOrder);

      // Get tasks for this creator (not necessarily in a campaign)
      const programTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.creatorId, creator.id))
        .orderBy(desc(tasks.createdAt));

      const payload = {
        ...program,
        campaigns: programCampaigns,
        tasks: programTasks,
      };

      // Sanitize for JSON: BigInt and other non-serializable values cause 500
      const safePayload = JSON.parse(
        JSON.stringify(payload, (_key, value) =>
          typeof value === 'bigint' ? Number(value) : value
        )
      );

      res.json(safePayload);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching program:', err?.message ?? error);
      console.error('Stack:', err?.stack);
      res.status(500).json({
        error: 'Failed to fetch program',
        details: err?.message ?? String(error),
      });
    }
  });

  /**
   * POST /api/programs
   * Create a new program
   */
  app.post('/api/programs', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get creator and tenant
      const { creators } = await import('@shared/schema');
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Enforce subscription limit for program creation
      if (creator.tenantId) {
        try {
          await enforceSubscriptionLimitForUser(creator.tenantId, 'programs', req.user?.role);
        } catch (limitErr: any) {
          if (limitErr.code === 'LIMIT_EXCEEDED') {
            return res.status(403).json({
              error: limitErr.message,
              code: 'LIMIT_EXCEEDED',
              ...limitErr.details,
            });
          }
          throw limitErr;
        }
      }

      // Validate request body
      const validatedData = createProgramSchema.parse(req.body);

      // Generate slug from name if not provided
      const slug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create program - normalize theme.mode for schema compatibility
      const pageConfig = validatedData.pageConfig
        ? {
            ...validatedData.pageConfig,
            theme: validatedData.pageConfig.theme
              ? {
                  ...validatedData.pageConfig.theme,
                  mode: (validatedData.pageConfig.theme.mode ?? 'light') as
                    | 'light'
                    | 'dark'
                    | 'custom',
                }
              : undefined,
          }
        : undefined;

      const [newProgram] = await db
        .insert(loyaltyPrograms)
        .values({
          tenantId: creator.tenantId,
          creatorId: creator.id,
          name: validatedData.name,
          description: validatedData.description,
          pointsName: validatedData.pointsName,
          pageConfig,
          tiers: validatedData.tiers,
          status: 'draft',
          slug: slug,
          isActive: false, // Not active until published
        })
        .returning();

      res.status(201).json(newProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      console.error('Error creating program:', error);
      res.status(500).json({ error: 'Failed to create program' });
    }
  });

  /**
   * PUT /api/programs/:id
   * Update a program
   */
  app.put('/api/programs/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get creator record
      const { creators } = await import('@shared/schema');
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Validate request body
      const validatedData = updateProgramSchema.parse(req.body);

      // Update program - normalize theme.mode for schema compatibility
      const updatePayload = validatedData.pageConfig
        ? {
            ...validatedData,
            pageConfig: {
              ...validatedData.pageConfig,
              theme: validatedData.pageConfig.theme
                ? {
                    ...validatedData.pageConfig.theme,
                    mode: (validatedData.pageConfig.theme.mode ?? 'light') as
                      | 'light'
                      | 'dark'
                      | 'custom',
                  }
                : undefined,
            },
          }
        : validatedData;

      const [updatedProgram] = await db
        .update(loyaltyPrograms)
        .set({
          ...updatePayload,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
        .returning();

      if (!updatedProgram) {
        return res.status(404).json({ error: 'Program not found' });
      }

      res.json(updatedProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[Program] Validation error:', error.errors);
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      const err = error as Error;
      console.error('Error updating program:', err?.message ?? error);
      console.error('Stack:', err?.stack);
      res.status(500).json({
        error: 'Failed to update program',
        details: err?.message ?? String(error),
      });
    }
  });

  /**
   * POST /api/programs/:id/publish
   * Publish a program (make it live)
   */
  app.post(
    '/api/programs/:id/publish',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get creator record
        const { creators } = await import('@shared/schema');
        const [creator] = await db
          .select()
          .from(creators)
          .where(eq(creators.userId, userId))
          .limit(1);

        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        // Optionally update slug from request
        const body = publishProgramSchema.safeParse(req.body);
        const slug = body.success ? body.data.slug : undefined;

        // First, fetch the existing program to check if it's already published
        const [existingProgram] = await db
          .select()
          .from(loyaltyPrograms)
          .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
          .limit(1);

        if (!existingProgram) {
          return res.status(404).json({ error: 'Program not found' });
        }

        // Validate publish requirements (skip for republish/URL updates)
        if (!existingProgram.publishedAt) {
          const missingFields: string[] = [];
          const pageConfig = (existingProgram.pageConfig as any) || {};
          const creatorDetails = pageConfig.creatorDetails || {};
          const creatorCategory = creator.category;

          // Universal requirements
          if (!existingProgram.name?.trim()) missingFields.push('Program Name');
          if (!existingProgram.description?.trim()) missingFields.push('Bio / Description');
          if (!pageConfig.logo) missingFields.push('Profile Image (Logo)');

          // Creator-type-specific requirements
          if (creatorCategory === 'athlete') {
            if (!creatorDetails.athlete?.sport) missingFields.push('Sport');
            if (!creatorDetails.athlete?.education?.level && !creatorDetails.athlete?.education)
              missingFields.push('Education Level');
          } else if (creatorCategory === 'musician') {
            if (!creatorDetails.musician?.bandArtistName) missingFields.push('Artist / Band Name');
            if (!creatorDetails.musician?.artistType) missingFields.push('Artist Type');
            if (!creatorDetails.musician?.musicGenre) missingFields.push('Music Genre');
            if (!creatorDetails.musician?.musicCatalogUrl) missingFields.push('Music Catalog URL');
          } else if (creatorCategory === 'content_creator') {
            const cc = creatorDetails.contentCreator || {};
            if (!cc.contentType || (Array.isArray(cc.contentType) && cc.contentType.length === 0))
              missingFields.push('Content Type');
            if (
              !cc.topicsOfFocus ||
              (Array.isArray(cc.topicsOfFocus) && cc.topicsOfFocus.length === 0)
            )
              missingFields.push('Topics of Focus');
            if (!cc.aboutMe?.trim()) missingFields.push('About Me');
          }

          // Require at least 1 connected social account
          const { socialConnections } = await import('@shared/schema');
          const connectedAccounts = await db
            .select()
            .from(socialConnections)
            .where(eq(socialConnections.userId, userId))
            .limit(1);

          if (connectedAccounts.length === 0) {
            missingFields.push('At least 1 connected social account');
          }

          if (missingFields.length > 0) {
            return res.status(400).json({
              error: 'Cannot publish program. Please complete the following:',
              missingFields,
            });
          }
        }

        // Determine if this is a republish (already has publishedAt)
        const isRepublish = !!existingProgram.publishedAt;
        const now = new Date();

        // Publish/republish program - preserve original publishedAt
        const [publishedProgram] = await db
          .update(loyaltyPrograms)
          .set({
            status: 'published',
            isActive: true,
            // Preserve original publishedAt for republishes
            publishedAt: existingProgram.publishedAt || now,
            updatedAt: now,
            ...(slug && { slug }),
          })
          .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
          .returning();

        if (!publishedProgram) {
          return res.status(404).json({ error: 'Failed to update program' });
        }

        // Log whether this was a new publish or republish
        console.log(
          `Program ${id} ${isRepublish ? 'republished' : 'published'} by creator ${creator.id}`
        );

        res.json(publishedProgram);
      } catch (error) {
        console.error('Error publishing program:', error);
        res.status(500).json({ error: 'Failed to publish program' });
      }
    }
  );

  /**
   * POST /api/programs/:id/unpublish
   * Unpublish a program (make it draft)
   */
  app.post(
    '/api/programs/:id/unpublish',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get creator record
        const { creators } = await import('@shared/schema');
        const [creator] = await db
          .select()
          .from(creators)
          .where(eq(creators.userId, userId))
          .limit(1);

        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        // Unpublish program
        const [unpublishedProgram] = await db
          .update(loyaltyPrograms)
          .set({
            status: 'draft',
            isActive: false,
            updatedAt: new Date(),
          })
          .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
          .returning();

        if (!unpublishedProgram) {
          return res.status(404).json({ error: 'Program not found' });
        }

        res.json(unpublishedProgram);
      } catch (error) {
        console.error('Error unpublishing program:', error);
        res.status(500).json({ error: 'Failed to unpublish program' });
      }
    }
  );

  /**
   * DELETE /api/programs/:id
   * Delete a program
   */
  app.delete('/api/programs/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get creator record
      const { creators } = await import('@shared/schema');
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Delete program
      await db
        .delete(loyaltyPrograms)
        .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)));

      res.json({ message: 'Program deleted successfully' });
    } catch (error) {
      console.error('Error deleting program:', error);
      res.status(500).json({ error: 'Failed to delete program' });
    }
  });

  /**
   * GET /api/programs/:id/preview
   * Get program preview (authenticated creators only, works for draft programs)
   */
  app.get('/api/programs/:id/preview', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const {
        creators: creatorsTable,
        campaigns,
        tasks: tasksTable,
        users,
      } = await import('@shared/schema');

      // Get creator record
      const [creator] = await db
        .select()
        .from(creatorsTable)
        .where(eq(creatorsTable.userId, userId))
        .limit(1);

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get program by ID (creator must own it)
      const [program] = await db
        .select()
        .from(loyaltyPrograms)
        .where(and(eq(loyaltyPrograms.id, id), eq(loyaltyPrograms.creatorId, creator.id)))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Get creator profile data
      const [creatorUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, creator.userId))
        .limit(1);

      // Get active campaigns for this program
      const programCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.programId, program.id), eq(campaigns.status, 'active')))
        .orderBy(desc(campaigns.createdAt));

      // Get active tasks for this program
      const programTasks = await db
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.programId, program.id), eq(tasksTable.isActive, true)))
        .orderBy(desc(tasksTable.createdAt));

      // Program is the single source of truth; fall back to creator for legacy data
      const previewPageConfig = (program.pageConfig as any) || {};
      res.json({
        ...program,
        creator: {
          id: creator.id,
          displayName:
            program.name || creator.displayName || creatorUser?.username || 'Unknown Creator',
          bio: program.description || creator.bio,
          imageUrl: previewPageConfig.logo || creator.imageUrl,
          bannerImage: previewPageConfig.headerImage || creatorUser?.profileData?.bannerImage,
          socialLinks: previewPageConfig.socialLinks || creator.socialLinks || {},
          category: creator.category,
          creatorDetails: previewPageConfig.creatorDetails || {},
        },
        campaigns: programCampaigns,
        tasks: programTasks,
      });
    } catch (error) {
      console.error('Error fetching program preview:', error);
      res.status(500).json({ error: 'Failed to fetch program preview' });
    }
  });

  /**
   * GET /api/programs/public/:slug
   * Get public program page by slug (for fans to view)
   */
  app.get('/api/programs/public/:slug', publicEndpointLimiter, async (req, res) => {
    try {
      const { slug } = req.params;
      const { creators: creatorsTable, users, tenants } = await import('@shared/schema');

      // Try 1: Get published program by program slug with creator and user data
      let result = await db
        .select({
          program: loyaltyPrograms,
          creator: creatorsTable,
          user: users,
        })
        .from(loyaltyPrograms)
        .leftJoin(creatorsTable, eq(loyaltyPrograms.creatorId, creatorsTable.id))
        .leftJoin(users, eq(creatorsTable.userId, users.id))
        .where(and(eq(loyaltyPrograms.slug, slug), eq(loyaltyPrograms.status, 'published')))
        .limit(1);

      // Try 2: If not found, lookup by tenant slug
      if (!result || result.length === 0) {
        // Find tenant by slug
        const tenantResult = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

        if (tenantResult && tenantResult.length > 0) {
          const tenant = tenantResult[0];

          // Find most recent published program for this tenant
          result = await db
            .select({
              program: loyaltyPrograms,
              creator: creatorsTable,
              user: users,
            })
            .from(loyaltyPrograms)
            .leftJoin(creatorsTable, eq(loyaltyPrograms.creatorId, creatorsTable.id))
            .leftJoin(users, eq(creatorsTable.userId, users.id))
            .where(
              and(eq(loyaltyPrograms.tenantId, tenant.id), eq(loyaltyPrograms.status, 'published'))
            )
            .orderBy(desc(loyaltyPrograms.createdAt))
            .limit(1);
        }
      }

      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Program not found' });
      }

      const { program, creator, user } = result[0];

      // Get visibility settings from pageConfig
      const visibility = (program.pageConfig as any)?.visibility || {};
      const profileDataVisibility = visibility.profileData || {};

      // Get published campaigns for this program (only if showCampaigns is not explicitly false)
      const programCampaigns =
        visibility.showCampaigns !== false
          ? await db
              .select()
              .from(campaigns)
              .where(and(eq(campaigns.programId, program.id), eq(campaigns.status, 'active')))
              .orderBy(campaigns.displayOrder)
          : [];

      // Get active, published tasks for this program (only if showTasks is not explicitly false)
      const programTasks =
        visibility.showTasks !== false
          ? await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.programId, program.id),
                  eq(tasks.isDraft, false),
                  eq(tasks.isActive, true)
                )
              )
              .orderBy(desc(tasks.createdAt))
          : [];

      // Build creator data - program is the single source of truth for fan-facing data
      const pageConfig = (program.pageConfig as any) || {};
      const creatorData: any = {
        id: creator?.id,
        // Program is canonical source; fall back to creator table for legacy data
        displayName: program.name || creator?.displayName,
        imageUrl: pageConfig.logo || creator?.imageUrl,
        category: creator?.category,
      };

      // Add bio only if showBio is not explicitly false
      if (profileDataVisibility.showBio !== false) {
        creatorData.bio = program.description || creator?.bio;
      }

      // Add social links only if showSocialLinks is not explicitly false
      if (profileDataVisibility.showSocialLinks !== false) {
        creatorData.socialLinks = pageConfig.socialLinks || creator?.socialLinks || {};
      }

      // Add banner image - program is canonical source
      if (profileDataVisibility.showBio !== false) {
        creatorData.bannerImage = pageConfig.headerImage || user?.profileData?.bannerImage;
      }

      // Add location from program pageConfig
      if (profileDataVisibility.showLocation !== false && pageConfig.location) {
        creatorData.location = pageConfig.location;
      }

      // Add creator details (type-specific info) from program
      if (pageConfig.creatorDetails) {
        creatorData.creatorDetails = pageConfig.creatorDetails;
      }

      res.json({
        ...program,
        creator: creatorData,
        campaigns: programCampaigns,
        tasks: programTasks,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching public program:', err?.message ?? error);
      console.error('Stack:', err?.stack);
      res.status(500).json({
        error: 'Failed to fetch program',
        details: err?.message ?? String(error),
      });
    }
  });

  /**
   * GET /api/programs/:programId/activity
   * Get recent activity for a program (task completions, etc.)
   */
  app.get('/api/programs/:programId/activity', async (req, res) => {
    try {
      const { programId } = req.params;
      const { taskCompletions, users } = await import('@shared/schema');

      // Get program to check visibility settings
      const [program] = await db
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.id, programId))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Check if activity feed is enabled (default to true if not set)
      const visibility = (program.pageConfig as any)?.visibility || {};
      if (visibility.showActivityFeed === false) {
        return res.status(403).json({
          error: 'Activity feed is not enabled for this program',
        });
      }

      // Fetch recent COMPLETED task completions with user data
      // Only show tasks that have actually been completed (completedAt is not null)

      // First try by programId
      let activity = await db
        .select({
          completion: taskCompletions,
          user: users,
          task: tasks,
        })
        .from(taskCompletions)
        .leftJoin(users, eq(taskCompletions.userId, users.id))
        .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
        .where(
          and(
            eq(tasks.programId, programId),
            or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed'))
          )
        )
        .orderBy(desc(sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`)) // Order by completion time, not created time
        .limit(20);

      // If no results by programId and program has tenantId, try by tenantId
      if (activity.length === 0 && program.tenantId) {
        activity = await db
          .select({
            completion: taskCompletions,
            user: users,
            task: tasks,
          })
          .from(taskCompletions)
          .leftJoin(users, eq(taskCompletions.userId, users.id))
          .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
          .where(
            and(
              eq(tasks.tenantId, program.tenantId),
              or(eq(taskCompletions.status, 'completed'), eq(taskCompletions.status, 'claimed'))
            )
          )
          .orderBy(
            desc(sql`COALESCE(${taskCompletions.completedAt}, ${taskCompletions.updatedAt})`)
          )
          .limit(20);
      }

      res.json(activity);
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  /**
   * GET /api/programs/:programId/leaderboard
   * Get top fans leaderboard for a program
   */
  app.get('/api/programs/:programId/leaderboard', async (req, res) => {
    try {
      const { programId } = req.params;
      const { fanPrograms, users } = await import('@shared/schema');

      // Get program to check visibility settings
      const [program] = await db
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.id, programId))
        .limit(1);

      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Check if leaderboard is enabled (default to true if not set)
      const visibility = (program.pageConfig as any)?.visibility || {};
      if (visibility.showLeaderboard === false) {
        return res.status(403).json({
          error: 'Leaderboard is not enabled for this program',
        });
      }

      const leaderboard = await db
        .select({
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
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  /**
   * GET /api/programs/:programId/user-stats
   * Get current user's stats for a program
   */
  app.get(
    '/api/programs/:programId/user-stats',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { programId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { fanPrograms, taskCompletions, tasks, loyaltyPrograms } =
          await import('@shared/schema');

        // Get user's fan program record
        const [fanProgram] = await db
          .select()
          .from(fanPrograms)
          .where(and(eq(fanPrograms.programId, programId), eq(fanPrograms.fanId, userId)))
          .limit(1);

        // Get tasks completed count
        const completedTasks = await db
          .select({ count: sql<number>`count(*)` })
          .from(taskCompletions)
          .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
          .where(
            and(
              eq(taskCompletions.userId, userId),
              eq(
                tasks.creatorId,
                db
                  .select({ creatorId: loyaltyPrograms.creatorId })
                  .from(loyaltyPrograms)
                  .where(eq(loyaltyPrograms.id, programId))
                  .limit(1)
              )
            )
          );

        // Get user's rank on leaderboard
        const allFans = await db
          .select({
            fanId: fanPrograms.fanId,
            points: fanPrograms.totalPointsEarned,
          })
          .from(fanPrograms)
          .where(eq(fanPrograms.programId, programId))
          .orderBy(desc(fanPrograms.totalPointsEarned));

        const userRank = allFans.findIndex((f) => f.fanId === userId) + 1;

        res.json({
          points: fanProgram?.totalPointsEarned || 0,
          tasksCompleted: completedTasks[0]?.count || 0,
          leaderboardRank: userRank > 0 ? userRank : null,
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
      }
    }
  );

  /**
   * GET /api/programs/:programId/social-task-completions
   * Get current user's social task completion status
   */
  app.get(
    '/api/programs/:programId/social-task-completions',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { programId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { taskCompletions, tasks } = await import('@shared/schema');

        // Get all completed social tasks for this user in this program
        const completedSocialTasks = await db
          .select({
            taskId: taskCompletions.taskId,
            taskType: tasks.taskType,
            platform: tasks.platform,
            completedAt: taskCompletions.completedAt,
          })
          .from(taskCompletions)
          .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
          .where(
            and(
              eq(taskCompletions.userId, userId),
              eq(tasks.programId, programId),
              eq(tasks.isActive, true)
            )
          );

        // Group by platform for easy lookup
        const completionsByPlatform: Record<string, { completed: boolean; completedAt?: Date }> =
          {};

        completedSocialTasks.forEach((task) => {
          if (task.platform) {
            completionsByPlatform[task.platform] = {
              completed: true,
              completedAt: task.completedAt || undefined,
            };
          }
        });

        res.json(completionsByPlatform);
      } catch (error) {
        console.error('Error fetching social task completions:', error);
        res.status(500).json({ error: 'Failed to fetch social task completions' });
      }
    }
  );
}
