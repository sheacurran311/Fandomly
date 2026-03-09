/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Express, Request, Response } from 'express';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { enforceSubscriptionLimitForUser } from '../../services/subscription-limit-service';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import {
  socialTaskSettings,
  twitterTaskSettings,
  instagramTaskSettings,
  tiktokTaskSettings,
  youtubeTaskSettings,
  facebookTaskSettings,
  spotifyTaskSettings,
  twitchTaskSettings,
  discordTaskSettings,
  migrateLegacyTaskSettings,
  validateTaskSettings,
  normalizeUsername,
  extractContentId,
  type SocialTaskSettings,
} from '@shared/taskFieldSchemas';
import { taskCompletions, manualReviewQueue, creators, socialConnections } from '@shared/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { uploadScreenshot, getFileUrl } from '../../middleware/upload';
import { unifiedVerification } from '../../services/verification/unified-verification';
import { taskFrequencyService } from '../../services/task-frequency-service';

// Task configuration schemas based on our task builders
const baseTaskSchemaFields = {
  name: z.string().min(1),
  description: z.string().optional(),
  ownershipLevel: z.enum(['platform', 'creator']).default('creator'),
  section: z
    .enum([
      'user_onboarding',
      'social_engagement',
      'community_building',
      'content_creation',
      'streaming_music',
      'token_activity',
      'custom',
    ])
    .default('custom'),
  programId: z.string().optional(), // Associate task with a loyalty program
  campaignId: z.string().optional(), // Associate task with a campaign
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isRequired: z.boolean().default(false),
  hideFromUI: z.boolean().default(false),
  isDraft: z.boolean().default(true),

  // REWARD CONFIGURATION (Snag-inspired)
  rewardType: z.enum(['points', 'multiplier']).default('points'),

  // Points reward fields
  pointsToReward: z.number().min(1).max(10000).optional(),
  pointCurrency: z.string().default('default'),

  // Multiplier reward fields
  multiplierValue: z.number().min(1.01).max(10.0).optional(),
  currenciesToApply: z.array(z.string()).optional(),
  applyToExistingBalance: z.boolean().default(false),

  // TIMING CONFIGURATION (Snag-inspired)
  updateCadence: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('immediate'),
  rewardFrequency: z.enum(['one_time', 'daily', 'weekly', 'monthly']).default('one_time'),

  // Task-specific multiplier for ALL tasks
  baseMultiplier: z.number().min(1.0).max(10.0).optional().default(1.0),
  multiplierConfig: z
    .object({
      stackingType: z.enum(['additive', 'multiplicative']).optional(),
      maxMultiplier: z.number().min(1.0).optional(),
      allowEventMultipliers: z.boolean().optional(),
    })
    .optional(),
};

const baseTaskSchema = z.object(baseTaskSchemaFields);

const referralTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('referral'),
  customSettings: z.object({
    referralTier: z.enum([
      'platform_creator_to_creator',
      'platform_fan_to_fan',
      'campaign_fan_to_fan',
    ]),
    rewardStructure: z.enum(['fixed', 'percentage', 'revenue_share']),
    referrerPoints: z.number().optional(),
    referredPoints: z.number().optional(),
    percentageOfReferred: z.number().min(1).max(100).optional(),
    revenueSharePercentage: z.number().min(1).max(50).optional(),
    revenueShareDuration: z.enum(['lifetime', '12_months', '6_months', '3_months']).optional(),
    dualRewards: z
      .object({
        enabled: z.boolean(),
        creatorPoints: z.number().min(0).optional(),
        platformPoints: z.number().min(0).optional(),
      })
      .optional(),
    qualifyingConditions: z
      .array(
        z.object({
          type: z.enum(['quest_completion', 'point_threshold', 'account_age', 'revenue_threshold']),
          value: z.union([z.string(), z.number()]),
        })
      )
      .optional(),
    maxReferralsPerUser: z.number().nullable().optional(),
    totalMaxReferrals: z.number().nullable().optional(),
  }),
});

const checkInTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('check_in'),
  customSettings: z.object({
    pointsPerCheckIn: z.number().min(1),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    enableStreak: z.boolean(),
    rewardOnlyStreakCompletions: z.boolean().optional(),
    streakMilestones: z
      .array(
        z.object({
          consecutiveDays: z.number().min(1),
          bonusPoints: z.number().min(1),
        })
      )
      .optional(),
    celebrationType: z.enum(['none', 'image', 'video']).optional(),
    celebrationUrl: z.string().url().optional().or(z.literal('')),
    countAnyRuleAsCheckIn: z.boolean().optional(),
  }),
});

const followerMilestoneSchema = baseTaskSchema.extend({
  taskType: z.literal('follower_milestone'),
  platform: z.enum(['twitter', 'instagram', 'tiktok', 'youtube', 'spotify']),
  customSettings: z.object({
    milestoneType: z.enum(['single', 'tiered']),
    singleFollowerCount: z.number().optional(),
    singlePoints: z.number().optional(),
    tiers: z
      .array(
        z.object({
          followers: z.number().min(1),
          points: z.number().min(1),
        })
      )
      .optional(),
  }),
});

const completeProfileTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('complete_profile'),
  customSettings: z.object({
    requiredFields: z.array(z.string()),
    rewardType: z.enum(['all_or_nothing', 'per_field']),
    totalPoints: z.number().optional(),
    pointsPerField: z.number().optional(),
  }),
});

// Social media task schemas - NOW USING UNIFIED SCHEMAS
// These extend baseTaskSchema with standardized social settings

const twitterTaskSchema = baseTaskSchema.extend({
  taskType: z.enum(['twitter_follow', 'twitter_like', 'twitter_retweet', 'twitter_quote_tweet']),
  platform: z.literal('twitter'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: twitterTaskSettings.omit({ platform: true }), // Use unified schema
});

const facebookTaskSchema = baseTaskSchema.extend({
  taskType: z.enum([
    'facebook_like_page',
    'facebook_like_post',
    'facebook_comment_post',
    'facebook_comment_photo',
    'facebook_share',
    'facebook_join_group',
  ]),
  platform: z.literal('facebook'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: facebookTaskSettings.omit({ platform: true }), // Use unified schema
});

const instagramTaskSchema = baseTaskSchema.extend({
  taskType: z.enum([
    'instagram_follow',
    'instagram_like_post',
    'comment_code',
    'mention_story',
    'keyword_comment',
  ]),
  platform: z.literal('instagram'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: instagramTaskSettings.omit({ platform: true }), // Use unified schema
});

const youtubeTaskSchema = baseTaskSchema.extend({
  taskType: z.enum([
    'youtube_subscribe',
    'youtube_like',
    'youtube_comment',
    'youtube_watch',
    'youtube_share',
  ]),
  platform: z.literal('youtube'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: youtubeTaskSettings.omit({ platform: true }), // Use unified schema
});

const tiktokTaskSchema = baseTaskSchema.extend({
  taskType: z.enum([
    'tiktok_follow',
    'tiktok_like',
    'tiktok_comment',
    'tiktok_share',
    'tiktok_duet',
    'tiktok_stitch',
    'tiktok_post',
  ]),
  platform: z.literal('tiktok'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: tiktokTaskSettings.omit({ platform: true }).optional(), // Use unified schema
});

const spotifyTaskSchema = baseTaskSchema.extend({
  taskType: z.enum([
    'spotify_follow',
    'spotify_playlist',
    'spotify_save_track',
    'spotify_save_album',
  ]),
  platform: z.literal('spotify'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: spotifyTaskSettings.omit({ platform: true }), // Use unified schema
});

const twitchTaskSchema = baseTaskSchema.extend({
  taskType: z.enum(['twitch_follow', 'twitch_subscribe', 'twitch_watch']),
  platform: z.literal('twitch'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: twitchTaskSettings.omit({ platform: true }), // Use unified schema
});

const discordTaskSchema = baseTaskSchema.extend({
  taskType: z.enum(['discord_join', 'discord_verify', 'discord_react', 'discord_message']),
  platform: z.literal('discord'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  settings: discordTaskSettings.omit({ platform: true }), // Use unified schema
});

// Sprint 3: Interactive task schemas
const pollTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('poll'),
  platform: z.literal('interactive'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  verificationMethod: z.literal('auto_interactive').optional(),
  settings: z.object({
    pollQuizConfig: z.object({
      type: z.literal('poll'),
      questions: z.array(
        z.object({
          id: z.string(),
          questionText: z.string(),
          questionType: z.enum(['single_choice', 'multiple_choice', 'true_false']),
          options: z.array(
            z.object({
              id: z.number(),
              text: z.string(),
              isCorrect: z.boolean().optional(),
            })
          ),
          explanation: z.string().optional(),
        })
      ),
      showResults: z.boolean().optional(),
      allowMultipleSubmissions: z.boolean().optional(),
    }),
  }),
});

const quizTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('quiz'),
  platform: z.literal('interactive'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  verificationMethod: z.literal('auto_interactive').optional(),
  settings: z.object({
    pollQuizConfig: z.object({
      type: z.literal('quiz'),
      questions: z.array(
        z.object({
          id: z.string(),
          questionText: z.string(),
          questionType: z.enum(['single_choice', 'multiple_choice', 'true_false']),
          options: z.array(
            z.object({
              id: z.number(),
              text: z.string(),
              isCorrect: z.boolean().optional(),
            })
          ),
          correctAnswers: z.array(z.number()).optional(),
          explanation: z.string().optional(),
        })
      ),
      passingScore: z.number().min(0).max(100).optional(),
      requirePerfectScore: z.boolean().optional(),
      perfectScoreMultiplier: z.number().min(1).max(5).optional(),
      allowMultipleSubmissions: z.boolean().optional(),
    }),
  }),
});

const websiteVisitTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('website_visit'),
  platform: z.literal('interactive'),
  points: z.number().min(1).max(10000).optional(), // Legacy support
  verificationMethod: z.literal('auto_tracking').optional(),
  settings: z.object({
    websiteConfig: z.object({
      destinationUrl: z.string().url(),
      requireMinTimeOnSite: z.boolean().optional(),
      minTimeOnSiteSeconds: z.number().min(5).max(600).optional(),
      requireActionCompletion: z.boolean().optional(),
      actionType: z.enum(['form_submit', 'video_watch', 'button_click', 'custom']).optional(),
    }),
  }),
});

// Union of all task schemas with validation
const createTaskSchema = z
  .discriminatedUnion('taskType', [
    referralTaskSchema,
    checkInTaskSchema,
    followerMilestoneSchema,
    completeProfileTaskSchema,
    twitterTaskSchema,
    facebookTaskSchema,
    instagramTaskSchema,
    youtubeTaskSchema,
    tiktokTaskSchema,
    spotifyTaskSchema,
    twitchTaskSchema,
    discordTaskSchema,
    // Sprint 3: Interactive tasks
    pollTaskSchema,
    quizTaskSchema,
    websiteVisitTaskSchema,
  ])
  .refine(
    (data) => {
      // If reward type is 'points', pointsToReward is required (unless legacy 'points' field exists)
      if (data.rewardType === 'points' && !data.pointsToReward && !('points' in data)) {
        // Allow task types that manage their own points via customSettings
        const selfManagedTypes = ['referral', 'check_in', 'follower_milestone', 'complete_profile'];
        if (!selfManagedTypes.includes(data.taskType)) {
          return false;
        }
      }
      // If reward type is 'multiplier', multiplierValue is required
      if (data.rewardType === 'multiplier' && !data.multiplierValue) {
        return false;
      }
      return true;
    },
    {
      message: 'Points reward requires pointsToReward; Multiplier reward requires multiplierValue',
    }
  );

export function registerTaskRoutes(app: Express) {
  // Get all published tasks (for fans) - REQUIRES AUTH
  // Returns ONLY tasks from programs the fan has joined
  app.get(
    '/api/tasks/published',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Import necessary modules
        const { fanPrograms: fanProgramsTable } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');

        // Get the fan's joined programs to filter tasks
        const fanPrograms = await db
          .select()
          .from(fanProgramsTable)
          .where(eq(fanProgramsTable.fanId, userId));

        console.log(
          `[Tasks API] Fan ${userId} joined programs:`,
          fanPrograms.map((fp) => ({
            programId: fp.programId,
            tenantId: fp.tenantId,
          }))
        );

        // Extract tenant IDs AND program IDs from joined programs
        const joinedTenantIds = fanPrograms.map((fp) => fp.tenantId);
        const joinedProgramIds = fanPrograms.map((fp) => fp.programId);

        console.log(
          `[Tasks API] Fan ${userId} has joined ${joinedTenantIds.length} programs (tenant IDs):`,
          joinedTenantIds
        );
        console.log(
          `[Tasks API] Fan ${userId} has joined ${joinedProgramIds.length} programs (program IDs):`,
          joinedProgramIds
        );

        // If fan hasn't joined any programs, return empty array
        if (joinedTenantIds.length === 0) {
          console.log(`[Tasks API] Fan ${userId} hasn't joined any programs yet`);
          return res.json({ tasks: [] });
        }

        // Get all tasks from programs the fan has joined
        // CRITICAL: Filter by program_id, not just tenant_id
        let tasks = await db.query.tasks.findMany({
          where: (tasks, { eq, and, inArray }) =>
            and(
              inArray(tasks.programId, joinedProgramIds), // Filter by program IDs
              eq(tasks.isDraft, false),
              eq(tasks.isActive, true),
              eq(tasks.ownershipLevel, 'creator')
            ),
          with: {
            tenant: true,
            creator: true, // Direct creator relation from task
            program: true,
          },
        });

        console.log(
          `[Tasks API] Query filter: programId IN [${joinedProgramIds.join(', ')}], isDraft=false, isActive=true, ownershipLevel='creator'`
        );
        console.log(`[Tasks API] Found ${tasks.length} published tasks for fan ${userId}`);

        if (tasks.length > 0) {
          console.log(
            `[Tasks API] Task details:`,
            tasks.map((t) => ({
              id: t.id,
              name: t.name,
              programId: t.programId,
              tenantId: t.tenantId,
              isDraft: t.isDraft,
              isActive: t.isActive,
            }))
          );
        }

        // Filter by time availability
        const now = new Date();
        tasks = tasks.filter((task) => {
          if (task.startTime && new Date(task.startTime) > now) {
            return false;
          }
          if (task.endTime && new Date(task.endTime) < now) {
            return false;
          }
          return true;
        });

        console.log(`[Tasks API] After time filtering: ${tasks.length} tasks available`);

        // Import the transformation function
        const { buildTargetDataFromSettings } = await import('@shared/taskFieldSchemas');

        // Enrich tasks with creator information AND targetData
        const enrichedTasks = tasks.map((task) => {
          // Build targetData from customSettings for verification
          const targetData = buildTargetDataFromSettings(
            task.customSettings || {},
            task.platform || 'other',
            task.taskType || ''
          );

          // Log the transformation for debugging
          if (Object.keys(targetData).length > 0) {
            console.log(`[Tasks API] Built targetData for task ${task.id} (${task.taskType}):`, {
              customSettings: task.customSettings,
              targetData,
            });
          }

          return {
            ...task,
            creatorName: task.creator?.displayName || task.tenant?.name || 'Unknown Creator',
            creatorImage:
              (task.creator as { avatar?: string })?.avatar ||
              (task.tenant as { branding?: { logo?: string } })?.branding?.logo ||
              null,
            programName: task.program?.name || null,
            programSlug: task.program?.slug || null,
            programImage:
              (task.program?.pageConfig as { headerImage?: string; logo?: string })?.headerImage ||
              (task.program?.pageConfig as { headerImage?: string; logo?: string })?.logo ||
              null,
            platform: task.platform || 'other', // Use the platform field directly
            type: task.taskType || 'other',
            targetData, // Add the transformed targetData for Fan verification
          };
        });

        res.json({ tasks: enrichedTasks });
      } catch (error) {
        console.error('Error fetching published tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
      }
    }
  );

  // Get published tasks for a specific creator (public endpoint)
  app.get('/api/tasks/creator/:creatorId', async (req: Request, res: Response) => {
    try {
      const { creatorId } = req.params;

      // Get creator to find their tenant
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Query tasks directly using Drizzle
      const now = new Date();
      const publishedTasks = await db.query.tasks.findMany({
        where: (tasks, { eq, and }) =>
          and(
            eq(tasks.tenantId, creator.tenantId),
            eq(tasks.isDraft, false),
            eq(tasks.isActive, true),
            eq(tasks.ownershipLevel, 'creator')
          ),
      });

      // Filter by time constraints
      const filteredTasks = publishedTasks.filter((task) => {
        if (task.startTime && new Date(task.startTime) > now) {
          return false;
        }
        if (task.endTime && new Date(task.endTime) < now) {
          return false;
        }
        return true;
      });

      res.json(filteredTasks);
    } catch (error) {
      console.error('Error fetching creator tasks:', error);
      res.status(500).json({ error: 'Failed to fetch creator tasks' });
    }
  });

  // Create new task
  app.post('/api/tasks', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id; // Use internal database user ID

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate task data
      const validatedData = createTaskSchema.parse(req.body);

      // Normalize and migrate task settings if it's a social task
      if ('settings' in validatedData && 'platform' in validatedData) {
        const platform = validatedData.platform;
        const rawSettings = validatedData.settings;

        // Migrate legacy fields and normalize
        const migratedSettings = migrateLegacyTaskSettings(rawSettings, platform);

        // Auto-extract username and contentId from URLs if provided
        if (migratedSettings.username) {
          migratedSettings.username = normalizeUsername(migratedSettings.username);
        }

        if (migratedSettings.contentUrl && !migratedSettings.contentId) {
          const extractedId = extractContentId(migratedSettings.contentUrl, platform);
          if (extractedId) {
            migratedSettings.contentId = extractedId;
          }
        }

        // Update validatedData with migrated settings
        (validatedData as any).settings = migratedSettings;

        console.log('[Task Creation] Normalized settings:', {
          platform,
          before: rawSettings,
          after: migratedSettings,
        });
      }

      // Check if this is a platform task
      const isPlatformTask = validatedData.ownershipLevel === 'platform';

      // Platform tasks can only be created by Fandomly admins
      if (isPlatformTask && user.role !== 'fandomly_admin') {
        return res.status(403).json({ error: 'Only Fandomly admins can create platform tasks' });
      }

      // Creator tasks MUST have programId (enforced at DB level, but validate early for better UX)
      if (!isPlatformTask && !validatedData.programId) {
        return res.status(400).json({
          error: 'Creator tasks must be associated with a program. Please create a program first.',
          code: 'PROGRAM_REQUIRED',
        });
      }

      // Platform tasks must NOT have programId or campaignId
      if (isPlatformTask && (validatedData.programId || validatedData.campaignId)) {
        return res.status(400).json({
          error: 'Platform tasks cannot be associated with programs or campaigns.',
          code: 'INVALID_PLATFORM_TASK',
        });
      }

      // Creator tasks require a creator profile
      let creator = null;
      let tenantId = null;
      let creatorId = null;

      if (!isPlatformTask) {
        // Verify user is a creator for creator-level tasks
        if (user.userType !== 'creator') {
          return res.status(403).json({ error: 'Only creators can create creator tasks' });
        }

        creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(404).json({ error: 'Creator profile not found' });
        }

        tenantId = creator.tenantId;
        creatorId = creator.id;

        // Enforce subscription limit for task creation
        if (tenantId) {
          try {
            await enforceSubscriptionLimitForUser(tenantId, 'tasks', req.user?.role);
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
      }

      // Prepare task data for storage
      const taskData = {
        ownershipLevel: validatedData.ownershipLevel,
        tenantId,
        creatorId,
        programId: validatedData.programId || null, // Save program association
        campaignId: validatedData.campaignId || null, // Save campaign association
        name: validatedData.name,
        description: validatedData.description || '',
        taskType: validatedData.taskType,
        platform: 'platform' in validatedData ? validatedData.platform : ('system' as const),
        section: validatedData.section,
        startTime: validatedData.startTime || null,
        endTime: validatedData.endTime || null,
        isRequired: validatedData.isRequired,
        hideFromUI: validatedData.hideFromUI,
        isDraft: validatedData.isDraft,

        // Reward configuration (Snag-inspired)
        rewardType: validatedData.rewardType || 'points',
        pointsToReward:
          validatedData.pointsToReward ||
          ('points' in validatedData
            ? validatedData.points
            : 'customSettings' in validatedData
              ? 'pointsPerCheckIn' in validatedData.customSettings
                ? validatedData.customSettings.pointsPerCheckIn
                : 'referrerPoints' in validatedData.customSettings &&
                    validatedData.customSettings.referrerPoints
                  ? validatedData.customSettings.referrerPoints
                  : 'singlePoints' in validatedData.customSettings &&
                      validatedData.customSettings.singlePoints
                    ? validatedData.customSettings.singlePoints
                    : 'tiers' in validatedData.customSettings &&
                        Array.isArray(validatedData.customSettings.tiers) &&
                        validatedData.customSettings.tiers.length > 0
                      ? validatedData.customSettings.tiers[0].points
                      : 50
              : 50),
        pointCurrency: validatedData.pointCurrency || 'default',

        // Multiplier reward configuration
        multiplierValue: validatedData.multiplierValue || null,
        currenciesToApply: validatedData.currenciesToApply || null,
        applyToExistingBalance: validatedData.applyToExistingBalance || false,

        // Timing configuration (Snag-inspired)
        updateCadence: validatedData.updateCadence,
        rewardFrequency: validatedData.rewardFrequency,

        // Task-specific multiplier (applied to ALL tasks)
        baseMultiplier: validatedData.baseMultiplier,
        multiplierConfig: validatedData.multiplierConfig || null,

        // Verification method (for Twitter tasks)
        verificationMethod:
          'verificationMethod' in validatedData ? validatedData.verificationMethod : undefined,

        // Custom settings (task-specific configuration)
        customSettings:
          'settings' in validatedData
            ? validatedData.settings
            : 'customSettings' in validatedData
              ? validatedData.customSettings
              : {},
      };

      // Create task in database
      const task = await storage.createTask(taskData as any);

      res.status(201).json({
        success: true,
        task,
        message: validatedData.isDraft ? 'Task saved as draft' : 'Task published successfully',
      });
    } catch (error: any) {
      console.error('Error creating task:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid task data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to create task',
        message: error.message,
      });
    }
  });

  // Get all tasks for a creator
  app.get('/api/tasks', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id; // Use internal database user ID

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'creator') {
        return res.status(403).json({ error: 'Only creators can view tasks' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: 'Creator profile not found' });
      }

      // Get all tasks for this creator's tenant
      const tasks = await storage.getTasksByTenantId(creator.tenantId);

      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        error: 'Failed to fetch tasks',
        message: error.message,
      });
    }
  });

  // Get single task by ID
  app.get(
    '/api/tasks/:taskId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id; // Use internal database user ID

        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Only allow the creator who owns this task to fetch it
        if (userId) {
          const creator = await storage.getCreatorByUserId(userId);
          if (creator && task.creatorId === creator.id) {
            return res.json(task);
          }
        }

        // For non-owners, only return if task is published
        if (!task.isDraft && task.isActive) {
          return res.json(task);
        }

        return res.status(401).json({ error: 'Unauthorized to view this task' });
      } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
      }
    }
  );

  // Update task
  app.put(
    '/api/tasks/:taskId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id; // Use internal database user ID

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await storage.getUser(userId);
        if (!user || user.userType !== 'creator') {
          return res.status(403).json({ error: 'Only creators can update tasks' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(404).json({ error: 'Creator profile not found' });
        }

        const existingTask = await storage.getTask(taskId);
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (existingTask.tenantId !== creator.tenantId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Validate update data
        const validatedData = createTaskSchema.parse(req.body);

        // Prepare update data - PRESERVE ALL FIELDS including settings for social tasks
        const updateData: Record<string, any> = {
          name: validatedData.name,
          description: validatedData.description || '',
          section: validatedData.section,
          startTime: validatedData.startTime || null,
          endTime: validatedData.endTime || null,
          isRequired: validatedData.isRequired,
          hideFromUI: validatedData.hideFromUI,
          isDraft: validatedData.isDraft,
          updateCadence: validatedData.updateCadence,
          rewardFrequency: validatedData.rewardFrequency,
          // Preserve verificationMethod
          verificationMethod:
            (validatedData as any).verificationMethod || existingTask.verificationMethod,
        };

        // Handle points - support both pointsToReward and legacy 'points' field
        if ('pointsToReward' in validatedData && validatedData.pointsToReward) {
          updateData.pointsToReward = validatedData.pointsToReward;
        } else if ('points' in validatedData && (validatedData as any).points) {
          updateData.pointsToReward = (validatedData as any).points;
        }

        // Handle settings for social tasks (pageUrl, channelUrl, handle, etc.)
        if ('settings' in validatedData && validatedData.settings) {
          updateData.settings = validatedData.settings;
        }

        // Handle customSettings for non-social tasks (checkin, referral, follower_milestone)
        if ('customSettings' in validatedData && validatedData.customSettings) {
          updateData.customSettings = validatedData.customSettings;
        }

        const updatedTask = await storage.updateTask(taskId, updateData);

        res.json({
          success: true,
          task: updatedTask,
          message: validatedData.isDraft
            ? 'Task updated and saved as draft'
            : 'Task updated and published',
        });
      } catch (error: any) {
        console.error('Error updating task:', error);

        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: 'Invalid task data',
            details: error.errors,
          });
        }

        res.status(500).json({
          error: 'Failed to update task',
          message: error.message,
        });
      }
    }
  );

  // Delete task
  app.delete(
    '/api/tasks/:taskId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id; // Use internal database user ID

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await storage.getUser(userId);
        if (!user || user.userType !== 'creator') {
          return res.status(403).json({ error: 'Only creators can delete tasks' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(404).json({ error: 'Creator profile not found' });
        }

        const existingTask = await storage.getTask(taskId);
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (existingTask.tenantId !== creator.tenantId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        await storage.deleteTask(taskId);

        res.json({
          success: true,
          message: 'Task deleted successfully',
        });
      } catch (error: any) {
        console.error('Error deleting task:', error);
        res.status(500).json({
          error: 'Failed to delete task',
          message: error.message,
        });
      }
    }
  );

  // Publish draft task (change isDraft to false)
  app.post(
    '/api/tasks/:taskId/publish',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user?.id; // Use internal database user ID

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await storage.getUser(userId);
        if (!user || user.userType !== 'creator') {
          return res.status(403).json({ error: 'Only creators can publish tasks' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(404).json({ error: 'Creator profile not found' });
        }

        const existingTask = await storage.getTask(taskId);
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (existingTask.tenantId !== creator.tenantId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const publishedTask = await storage.updateTask(taskId, { isDraft: false });

        res.json({
          success: true,
          task: publishedTask,
          message: 'Task published successfully',
        });
      } catch (error: any) {
        console.error('Error publishing task:', error);
        res.status(500).json({
          error: 'Failed to publish task',
          message: error.message,
        });
      }
    }
  );

  // Get available tasks for fans (only published, non-hidden tasks)
  app.get('/api/tasks/available/:creatorId', async (req: Request, res: Response) => {
    try {
      const { creatorId } = req.params;

      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get all tasks for this creator's tenant
      const allTasks = await storage.getTasksByTenantId(creator.tenantId);

      // Filter to only published, non-hidden tasks within active date range
      const now = new Date();
      const availableTasks = allTasks.filter((task) => {
        if (task.isDraft || task.hideFromUI) return false;
        if (task.startTime && new Date(task.startTime) > now) return false;
        if (task.endTime && new Date(task.endTime) < now) return false;
        return true;
      });

      res.json(availableTasks);
    } catch (error: any) {
      console.error('Error fetching available tasks:', error);
      res.status(500).json({
        error: 'Failed to fetch available tasks',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // TASK COMPLETION & VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * Complete a task (submit for verification)
   * POST /api/tasks/:taskId/complete
   *
   * Accepts proof data from frontend modals:
   * - proofUrl: Link to social media post/profile
   * - screenshot: Image file upload (multipart/form-data)
   * - proofNotes: Additional text notes
   * - platform: Social platform name
   * - taskType: Specific task type
   * - targetData: Task settings for verification
   */
  app.post(
    '/api/tasks/:taskId/complete',
    authenticateUser,
    uploadScreenshot.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Get uploaded screenshot if present
        const screenshotFile = req.file;
        const screenshotUrl = screenshotFile
          ? getFileUrl(screenshotFile.filename, 'screenshot')
          : undefined;

        // Parse form data
        const { platform, taskType, proofUrl, proofNotes, targetData } = req.body;

        // Parse targetData if it's a JSON string
        const taskSettings = typeof targetData === 'string' ? JSON.parse(targetData) : targetData;

        // Get task details
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Check reward frequency eligibility (Sprint 1 feature)
        const frequencyCheck = await taskFrequencyService.checkEligibility({
          userId,
          taskId,
          tenantId: task.tenantId ?? '',
        });

        if (!frequencyCheck.isEligible) {
          // Calculate time until available
          const timeUntil = await taskFrequencyService.getTimeUntilAvailable({
            userId,
            taskId,
            tenantId: task.tenantId ?? '',
          });

          let availabilityMessage = frequencyCheck.reason || 'Task not available';
          if (timeUntil) {
            if (timeUntil.hours > 24) {
              const days = Math.floor(timeUntil.hours / 24);
              availabilityMessage += `. Available again in ${days} day${days > 1 ? 's' : ''}`;
            } else if (timeUntil.hours > 0) {
              availabilityMessage += `. Available again in ${timeUntil.hours} hour${timeUntil.hours > 1 ? 's' : ''}`;
            } else if (timeUntil.minutes > 0) {
              availabilityMessage += `. Available again in ${timeUntil.minutes} minute${timeUntil.minutes > 1 ? 's' : ''}`;
            }
          }

          return res.status(403).json({
            error: 'Task not available',
            message: availabilityMessage,
            nextAvailableAt: frequencyCheck.nextAvailableAt,
            reason: frequencyCheck.reason,
          });
        }

        // Verify unified verification service
        const result = await unifiedVerification.verify({
          userId,
          taskId: taskId,
          tenantId: task.tenantId ?? '',
          creatorId: task.creatorId ?? '',
          platform: platform || task.platform || 'unknown',
          taskType: taskType || task.taskType,
          taskName: task.name,
          taskSettings: taskSettings || task.customSettings || {},
          proofUrl,
          screenshotUrl,
          proofNotes,
        });

        res.json(result);
      } catch (error: any) {
        console.error('Task completion error:', error);
        res.status(500).json({
          error: 'Failed to complete task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Verify an existing task completion
   * POST /api/task-completions/:completionId/verify
   *
   * For tasks that were started but need verification
   * (e.g., user clicked "Start Task" earlier, now submitting proof)
   */
  app.post(
    '/api/task-completions/:completionId/verify',
    authenticateUser,
    uploadScreenshot.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { completionId } = req.params;
        const userId = req.user!.id;

        // Get uploaded screenshot if present
        const screenshotFile = req.file;
        const screenshotUrl = screenshotFile
          ? getFileUrl(screenshotFile.filename, 'screenshot')
          : undefined;

        // Parse form data
        const { platform, taskType, proofUrl, proofNotes, targetData } = req.body;

        // Parse targetData if it's a JSON string
        const taskSettings = typeof targetData === 'string' ? JSON.parse(targetData) : targetData;

        // Get task completion
        const completion = await db.query.taskCompletions.findFirst({
          where: eq(taskCompletions.id, completionId),
          with: {
            task: true,
          },
        });

        if (!completion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Verify user owns this completion
        if (completion.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        const task = completion.task;

        // Run verification
        const result = await unifiedVerification.verify({
          userId,
          taskCompletionId: completionId,
          taskId: task.id,
          tenantId: task.tenantId ?? '',
          creatorId: task.creatorId ?? '',
          platform: platform || task.platform || 'unknown',
          taskType: taskType || task.taskType,
          taskName: task.name,
          taskSettings: taskSettings || task.customSettings || {},
          proofUrl,
          screenshotUrl,
          proofNotes,
        });

        res.json(result);
      } catch (error: any) {
        console.error('Task verification error:', error);
        res.status(500).json({
          error: 'Failed to verify task',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get user's task completions
   * GET /api/task-completions/me
   */
  app.get(
    '/api/task-completions/me',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { status, tenantId } = req.query;

        // Build WHERE conditions
        const conditions = [eq(taskCompletions.userId, userId)];

        if (status) {
          conditions.push(eq(taskCompletions.status, status as string));
        }

        if (tenantId) {
          conditions.push(eq(taskCompletions.tenantId, tenantId as string));
        }

        // Use single condition or AND based on array length
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

        const completions = await db.select().from(taskCompletions).where(whereClause);

        res.json(completions);
      } catch (error: any) {
        console.error('Error fetching task completions:', error);
        res.status(500).json({
          error: 'Failed to fetch task completions',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get manual review queue for creator
   * GET /api/manual-review/queue
   */
  app.get(
    '/api/manual-review/queue',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user!.id;
        const { status = 'pending', limit = 50 } = req.query;

        // Get creator record
        const creator = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });

        if (!creator) {
          return res.status(403).json({ error: 'Only creators can access review queue' });
        }

        // Get pending reviews for this creator
        const reviews = await db
          .select()
          .from(manualReviewQueue)
          .where(
            and(
              eq(manualReviewQueue.creatorId, creator.id),
              eq(manualReviewQueue.status, status as string),
              isNull(manualReviewQueue.deletedAt)
            )
          )
          .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.submittedAt))
          .limit(Number(limit));

        res.json(reviews);
      } catch (error: any) {
        console.error('Error fetching review queue:', error);
        res.status(500).json({
          error: 'Failed to fetch review queue',
          message: error.message,
        });
      }
    }
  );

  /**
   * Approve manual review
   * POST /api/manual-review/:reviewId/approve
   */
  app.post(
    '/api/manual-review/:reviewId/approve',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { reviewId } = req.params;
        const { reviewNotes } = req.body;
        const userId = req.user!.id;

        // Verify user is creator who owns this review
        const review = await db.query.manualReviewQueue.findFirst({
          where: eq(manualReviewQueue.id, reviewId),
        });

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        const creatorForApprove = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });
        if (!creatorForApprove || String(creatorForApprove.id) !== String(review.creatorId)) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        await unifiedVerification.approveManualReview(reviewId, userId, reviewNotes);

        res.json({ success: true, message: 'Task approved' });
      } catch (error: any) {
        console.error('Error approving review:', error);
        res.status(500).json({
          error: 'Failed to approve review',
          message: error.message,
        });
      }
    }
  );

  /**
   * Reject manual review
   * POST /api/manual-review/:reviewId/reject
   */
  app.post(
    '/api/manual-review/:reviewId/reject',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { reviewId } = req.params;
        const { reviewNotes } = req.body;
        const userId = req.user!.id;

        if (!reviewNotes) {
          return res.status(400).json({ error: 'Review notes required for rejection' });
        }

        // Verify user is creator who owns this review
        const review = await db.query.manualReviewQueue.findFirst({
          where: eq(manualReviewQueue.id, reviewId),
        });

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        const creatorForReject = await db.query.creators.findFirst({
          where: eq(creators.userId, userId),
        });
        if (!creatorForReject || String(creatorForReject.id) !== String(review.creatorId)) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        await unifiedVerification.rejectManualReview(reviewId, userId, reviewNotes);

        res.json({ success: true, message: 'Task rejected' });
      } catch (error: any) {
        console.error('Error rejecting review:', error);
        res.status(500).json({
          error: 'Failed to reject review',
          message: error.message,
        });
      }
    }
  );

  // ============================================================================
  // CODE VERIFICATION ENDPOINTS (T2)
  // ============================================================================

  /**
   * Get or generate verification code for a task
   * GET /api/tasks/:taskId/verification-code
   *
   * Returns the fan's unique code for code-based (T2) verification
   */
  app.get(
    '/api/tasks/:taskId/verification-code',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Import code service
        const { codeService } = await import('../../services/verification/code-service');

        // Get the task to get tenant info
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Get or create code
        const result = await codeService.getOrCreateCode({
          taskId,
          fanId: userId,
          tenantId: task.tenantId ?? '',
          codeType: 'comment',
        });

        if (!result.success || !result.code) {
          return res.status(500).json({ error: result.error || 'Failed to generate code' });
        }

        const codeRecord = await codeService.getCodeForFan(taskId, userId);
        res.json({
          code: result.code,
          expiresAt: codeRecord?.expiresAt ?? null,
          isUsed: codeRecord?.isUsed ?? false,
        });
      } catch (error: any) {
        console.error('Error getting verification code:', error);
        res.status(500).json({
          error: 'Failed to get verification code',
          message: error.message,
        });
      }
    }
  );

  /**
   * Check if a verification code has been found
   * POST /api/tasks/:taskId/verify-code
   *
   * Called when fan clicks "I posted my code" - triggers immediate check
   */
  app.post(
    '/api/tasks/:taskId/verify-code',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        // Get task details
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Import services
        const { codeService } = await import('../../services/verification/code-service');
        const { commentFetcher } = await import('../../services/verification/comment-fetcher');

        // Get the fan's code
        const codeRecord = await codeService.getCodeForFan(taskId, userId);
        if (!codeRecord) {
          return res.status(400).json({ error: 'No verification code found' });
        }

        if (codeRecord.isUsed) {
          return res.json({
            verified: true,
            message: 'Code already verified!',
          });
        }

        // Get task settings (customSettings in schema)
        const settings = (task.customSettings || task) as Record<string, unknown>;
        const rawContentId = settings?.contentId || settings?.postId || settings?.videoId;
        const contentId =
          typeof rawContentId === 'string' ? rawContentId : String(rawContentId ?? '');

        if (!contentId) {
          return res.status(400).json({
            error: 'Task not properly configured for code verification',
          });
        }

        // Get creator's access token for the platform
        const creatorConnection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, task.creatorId!),
            eq(socialConnections.platform, task.platform),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!creatorConnection?.accessToken) {
          return res.json({
            verified: false,
            message: 'Creator has not connected their account. Code verification may take longer.',
            pendingCheck: true,
          });
        }

        // Try to verify code in comments
        const result = await commentFetcher.verifyCodeInComments({
          platform: task.platform,
          contentId,
          taskId,
          fanId: userId,
          creatorAccessToken: creatorConnection.accessToken,
        });

        if (result.verified) {
          // Complete the task
          const verificationResult = await unifiedVerification.verify({
            userId,
            taskId,
            tenantId: task.tenantId ?? '',
            creatorId: task.creatorId!,
            platform: task.platform,
            taskType: task.taskType,
            taskName: task.name,
            taskSettings: settings,
          });

          return res.json({
            verified: true,
            message: 'Code found! Task verified.',
            pointsAwarded: verificationResult.pointsAwarded,
          });
        }

        // Code not found yet
        res.json({
          verified: false,
          message:
            result.reason ||
            'Code not found yet. Please make sure you included your code in your comment.',
          code: codeRecord.code,
        });
      } catch (error: any) {
        console.error('Error verifying code:', error);
        res.status(500).json({
          error: 'Failed to verify code',
          message: error.message,
        });
      }
    }
  );
}
