/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Express, Request, Response } from 'express';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { enforceSubscriptionLimitForUser } from '../../services/subscription-limit-service';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import {
  twitterTaskSettings,
  instagramTaskSettings,
  tiktokTaskSettings,
  youtubeTaskSettings,
  facebookTaskSettings,
  spotifyTaskSettings,
  twitchTaskSettings,
  discordTaskSettings,
  migrateLegacyTaskSettings,
  normalizeUsername,
  extractContentId,
} from '@shared/taskFieldSchemas';
import { tasks } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

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

// ----- Duplicate Task Prevention -----

// Task types that are "one-and-done" per program — only one instance ever allowed
// regardless of any URL. Follows, subscribes, joins, profile tasks, check-ins, etc.
const ONE_AND_DONE_TASK_TYPES = new Set([
  // Follow
  'twitter_follow',
  'instagram_follow',
  'tiktok_follow',
  'spotify_follow',
  'twitch_follow',
  'kick_follow',
  'facebook_like_page',
  'follow',
  // Subscribe / Join
  'youtube_subscribe',
  'twitch_subscribe',
  'kick_subscribe',
  'patreon_support',
  'patreon_tier_check',
  'discord_join',
  'discord_verify',
  'facebook_join_group',
  'join',
  // Profile actions
  'twitter_include_name',
  'twitter_include_bio',
  'complete_profile',
  // Check-in / visits / milestones
  'check_in',
  'website_visit',
  'follower_milestone',
  // Referral
  'referral',
]);

/**
 * Extract the distinguishing URL from task settings for content-specific tasks.
 * Returns null for one-and-done tasks (they don't need URL deduplication).
 */
function extractTaskContentUrl(settings: Record<string, any>): string | null {
  return (
    settings?.contentUrl ||
    settings?.pageUrl ||
    settings?.channelUrl ||
    settings?.playlistUrl ||
    settings?.artistUrl ||
    settings?.videoUrl ||
    settings?.postUrl ||
    settings?.tweetUrl ||
    settings?.mediaUrl ||
    null
  );
}

/**
 * Check if a duplicate task already exists for this creator + program.
 * - One-and-done tasks: only one per (programId, taskType, platform)
 * - Content tasks: allow duplicates only if the target URL differs
 */
async function checkDuplicateTask(
  creatorId: string,
  programId: string,
  taskType: string,
  platform: string,
  settings: Record<string, any>
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const isOneAndDone = ONE_AND_DONE_TASK_TYPES.has(taskType);

  // Query existing non-deleted tasks with same type + platform + program
  const existing = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      customSettings: tasks.customSettings,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.creatorId, creatorId),
        eq(tasks.programId, programId),
        eq(tasks.taskType, taskType as any),
        eq(tasks.platform, platform as any),
        isNull(tasks.deletedAt)
      )
    )
    .limit(10);

  if (existing.length === 0) {
    return { isDuplicate: false };
  }

  // One-and-done: any existing task of this type is a duplicate
  if (isOneAndDone) {
    return {
      isDuplicate: true,
      reason: `A "${taskType}" task already exists in this program.`,
    };
  }

  // Content tasks: allow if the URL is different
  const newUrl = extractTaskContentUrl(settings);
  if (!newUrl) {
    // No URL — treat as one-and-done (can't distinguish)
    return {
      isDuplicate: true,
      reason: `A "${taskType}" task already exists. Provide a unique content URL to create another.`,
    };
  }

  for (const task of existing) {
    const existingSettings = (task.customSettings || {}) as Record<string, any>;
    const existingUrl = extractTaskContentUrl(existingSettings);
    if (existingUrl === newUrl) {
      return {
        isDuplicate: true,
        reason: `A "${taskType}" task with this URL already exists ("${task.name}").`,
      };
    }
  }

  return { isDuplicate: false };
}

export function registerTaskManagementRoutes(app: Express) {
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

      // Check for duplicate tasks (creator tasks only)
      if (!isPlatformTask && creatorId && validatedData.programId) {
        const taskSettings =
          'settings' in validatedData
            ? validatedData.settings
            : 'customSettings' in validatedData
              ? validatedData.customSettings
              : {};
        const dupCheck = await checkDuplicateTask(
          creatorId,
          validatedData.programId,
          validatedData.taskType,
          'platform' in validatedData ? validatedData.platform : 'system',
          taskSettings as Record<string, any>
        );
        if (dupCheck.isDuplicate) {
          return res.status(409).json({
            error: dupCheck.reason || 'A duplicate task already exists.',
            code: 'DUPLICATE_TASK',
          });
        }
      }

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
}
