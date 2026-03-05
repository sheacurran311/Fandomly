import { Router, Response } from 'express';
import { z } from 'zod';
import type { IStorage } from '../../core/storage';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { taskFrequencyService } from '../../services/task-frequency-service';

// Validation schemas
const startTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  // Optional campaignId for campaign-scoped completions
  // When provided, the completion is marked as 'campaign' context and scoped to that campaign
  // This enables re-verification of one-time tasks within campaigns
  campaignId: z.string().optional(),
});

const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  completionData: z.record(z.any()).optional(),
});

const completeTaskSchema = z.object({
  completionData: z.record(z.any()).optional(),
  verificationMethod: z.enum(['auto', 'manual', 'api']).default('auto'),
});

// Validation schemas for task verification
const twitterTargetDataSchema = z
  .object({
    creatorTwitterId: z.string().optional(),
    tweetId: z.string().optional(),
  })
  .refine((data) => data.creatorTwitterId || data.tweetId, {
    message: 'Either creatorTwitterId or tweetId is required',
  });

const youtubeTargetDataSchema = z
  .object({
    channelId: z.string().optional(),
    videoId: z.string().optional(),
  })
  .refine((data) => data.channelId || data.videoId, {
    message: 'Either channelId or videoId is required',
  });

const spotifyTargetDataSchema = z
  .object({
    artistId: z.string().optional(),
    playlistId: z.string().optional(),
  })
  .refine((data) => data.artistId || data.playlistId, {
    message: 'Either artistId or playlistId is required',
  });

const tiktokTargetDataSchema = z
  .object({
    creatorTikTokId: z.string().optional(),
    videoId: z.string().optional(),
  })
  .refine((data) => data.creatorTikTokId || data.videoId, {
    message: 'Either creatorTikTokId or videoId is required',
  });

const facebookTargetDataSchema = z
  .object({
    pageId: z.string().optional(),
    postId: z.string().optional(),
  })
  .refine((data) => data.pageId || data.postId, {
    message: 'Either pageId or postId is required',
  });

const instagramTargetDataSchema = z
  .object({
    userId: z.string().optional(),
    postId: z.string().optional(),
    username: z.string().optional(),
  })
  .refine((data) => data.userId || data.postId || data.username, {
    message: 'Either userId, postId, or username is required',
  });

const verifyTaskSchema = z.object({
  platform: z.enum(['twitter', 'youtube', 'spotify', 'tiktok', 'facebook', 'instagram']),
  taskType: z.string().min(1),
  targetData: z.record(z.any()),
});

export function createTaskCompletionRoutes(storage: IStorage) {
  const router = Router();

  // ==============================================
  // GET /api/task-completions/me
  // Get all task completions for the current user
  // ==============================================
  router.get('/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const tenantId = req.query.tenantId as string | undefined;
      const completions = await storage.getUserTaskCompletions(req.user.id, tenantId);

      res.json({ completions });
    } catch (error) {
      console.error('Error fetching user task completions:', error);
      res.status(500).json({ error: 'Failed to fetch task completions' });
    }
  });

  // ==============================================
  // GET /api/task-completions/program/:programId
  // Get all task completions for a specific program
  // Requires authentication - only returns completions the user has access to
  // ==============================================
  router.get(
    '/program/:programId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { programId } = req.params;
        console.log(
          `[Task Completions API] Fetching completions for program ${programId}, user ${req.user.id}`
        );

        // Verify user has access to this program (either as creator/admin or as a fan viewing their own)
        const program = await storage.getLoyaltyProgram(programId);
        if (!program) {
          return res.status(404).json({ error: 'Program not found' });
        }

        // Check if user is program owner/admin or just a participant
        const isOwner = program.creatorId === req.user.id;
        const membership = await storage.getUserTenantMembership(req.user.id, program.tenantId || '');
        const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

        let completions;
        if (isOwner || isAdmin) {
          // Admins/owners can see all completions for the program
          completions = await storage.getTaskCompletionsByProgram(programId);
        } else {
          // Regular users can only see their own completions
          completions = await storage.getTaskCompletionsByProgram(programId);
          completions = completions.filter((c) => c.userId === req.user!.id);
        }

        console.log(
          `[Task Completions API] Returning ${completions.length} completions for program ${programId}`
        );
        res.json(completions);
      } catch (error) {
        console.error('Error fetching program task completions:', error);
        res.status(500).json({ error: 'Failed to fetch task completions for program' });
      }
    }
  );

  // ==============================================
  // GET /api/task-completions/tenant/:tenantId
  // Get all task completions for a tenant (fallback for tasks without programId)
  // Requires authentication - only returns completions the user has access to
  // ==============================================
  router.get(
    '/tenant/:tenantId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { tenantId } = req.params;
        console.log(
          `[Task Completions API] Fetching completions for tenant ${tenantId}, user ${req.user.id}`
        );

        // Verify user has access to this tenant
        const membership = await storage.getUserTenantMembership(req.user.id, tenantId);
        const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

        const { db } = await import('../../db');
        const { eq, desc } = await import('drizzle-orm');
        const { taskCompletions, tasks } = await import('@shared/schema');

        // Get completions for tasks belonging to this tenant
        let rows = await db
          .select({ task_completions: taskCompletions, task: tasks })
          .from(taskCompletions)
          .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
          .where(eq(tasks.tenantId, tenantId))
          .orderBy(desc(taskCompletions.completedAt));

        // Non-admins can only see their own completions
        if (!isAdmin) {
          rows = rows.filter((r) => r.task_completions.userId === req.user!.id);
        }

        const completions = rows.map((r) => ({
          ...r.task_completions,
          taskName: r.task?.name,
          taskProgramId: r.task?.programId,
        }));

        console.log(
          `[Task Completions API] Returning ${completions.length} completions for tenant ${tenantId}`
        );
        res.json(completions);
      } catch (error) {
        console.error('Error fetching tenant task completions:', error);
        res.status(500).json({ error: 'Failed to fetch task completions for tenant' });
      }
    }
  );

  // ==============================================
  // GET /api/task-completions/:taskId
  // Get user's completion for a specific task
  // ==============================================
  router.get('/:taskId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { taskId } = req.params;
      const completion = await storage.getTaskCompletionByUserAndTask(req.user.id, taskId);

      if (!completion) {
        return res.status(404).json({ error: 'Task completion not found' });
      }

      res.json({ completion });
    } catch (error) {
      console.error('Error fetching task completion:', error);
      res.status(500).json({ error: 'Failed to fetch task completion' });
    }
  });

  // ==============================================
  // GET /api/task-completions/check-eligibility/:taskId
  // Check if user can complete a task based on frequency rules
  // Supports campaign-scoped eligibility checks via campaignId query param
  // ==============================================
  router.get(
    '/check-eligibility/:taskId',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { taskId } = req.params;
        const tenantId = req.query.tenantId as string | undefined;
        const campaignId = req.query.campaignId as string | undefined;

        const eligibility = await taskFrequencyService.checkEligibility({
          userId: req.user.id,
          taskId,
          tenantId,
          campaignId, // Campaign-scoped check if provided
        });

        // Also get time remaining if not eligible
        let timeRemaining = null;
        if (!eligibility.isEligible) {
          timeRemaining = await taskFrequencyService.getTimeUntilAvailable({
            userId: req.user.id,
            taskId,
            tenantId,
          });
        }

        res.json({
          ...eligibility,
          timeRemaining,
          context: campaignId ? 'campaign' : 'standalone', // Include context in response
        });
      } catch (error: unknown) {
        console.error('Error checking task eligibility:', error);
        res.status(500).json({ error: 'Failed to check task eligibility' });
      }
    }
  );

  // ==============================================
  // POST /api/task-completions/start
  // Start a task (create initial completion record)
  // ==============================================
  router.post('/start', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate request body
      const validation = startTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const { taskId, tenantId, campaignId } = validation.data;

      // Check if task exists
      const task = await storage.getTask(taskId, tenantId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Determine completion context based on whether campaignId is provided
      // Campaign completions are scoped separately from standalone completions
      // This enables the re-verification model for one-time tasks within campaigns
      const completionContext = campaignId ? 'campaign' : 'standalone';

      // CHECK FREQUENCY ELIGIBILITY (PRIORITY 1 FEATURE)
      // Pass campaignId to scope the eligibility check to the appropriate context
      const frequencyCheck = await taskFrequencyService.checkEligibility({
        userId: req.user.id,
        taskId,
        tenantId,
        campaignId, // Campaign-scoped check if campaignId provided
      });

      if (!frequencyCheck.isEligible) {
        return res.status(403).json({
          error: 'Task not available',
          reason: frequencyCheck.reason,
          nextAvailableAt: frequencyCheck.nextAvailableAt,
          lastCompletedAt: frequencyCheck.lastCompletedAt,
          completionsCount: frequencyCheck.completionsCount,
        });
      }

      // Check if user has already started this task (but not completed) within the same context
      const existingCompletion = await storage.getTaskCompletionByUserAndTask(
        req.user.id,
        taskId,
        campaignId
      );
      if (existingCompletion && existingCompletion.status === 'in_progress') {
        return res.json({
          completion: existingCompletion,
          message: 'Task already started',
        });
      }

      // Create new task completion with appropriate context
      const completion = await storage.createTaskCompletion({
        taskId,
        userId: req.user.id,
        tenantId,
        campaignId: campaignId || undefined, // Set campaignId if provided
        completionContext, // 'standalone' or 'campaign'
        status: 'in_progress',
        progress: 0,
        completionData: {},
        pointsEarned: 0,
        totalRewardsEarned: 0,
      });

      res.status(201).json({ completion });
    } catch (error: unknown) {
      console.error('Error starting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      res.status(500).json({
        error: 'Failed to start task',
        message: errorMessage,
        details: errorStack,
      });
    }
  });

  // ==============================================
  // PATCH /api/task-completions/:completionId/progress
  // Update task progress (for multi-step tasks)
  // ==============================================
  router.patch(
    '/:completionId/progress',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { completionId } = req.params;

        // Validate request body
        const validation = updateProgressSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request data',
            details: validation.error.issues,
          });
        }

        // Get existing completion
        const existingCompletion = await storage.getTaskCompletion(completionId);
        if (!existingCompletion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Check ownership
        if (existingCompletion.userId !== req.user.id) {
          return res.status(403).json({ error: 'Not authorized to update this task completion' });
        }

        // Update progress
        const { progress, completionData } = validation.data;
        const updatedCompletion = await storage.updateTaskCompletion(completionId, {
          progress,
          completionData: completionData || existingCompletion.completionData,
          lastActivityAt: new Date(),
        });

        res.json({ completion: updatedCompletion });
      } catch (error) {
        console.error('Error updating task progress:', error);
        res.status(500).json({ error: 'Failed to update task progress' });
      }
    }
  );

  // ==============================================
  // POST /api/task-completions/:completionId/complete
  // Mark task as completed and distribute rewards
  // ==============================================
  router.post(
    '/:completionId/complete',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { completionId } = req.params;

        // Validate request body
        const validation = completeTaskSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request data',
            details: validation.error.issues,
          });
        }

        const { completionData, verificationMethod } = validation.data;

        // Get existing completion
        const existingCompletion = await storage.getTaskCompletion(completionId);
        if (!existingCompletion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        // Check ownership
        if (existingCompletion.userId !== req.user.id) {
          return res.status(403).json({ error: 'Not authorized to complete this task' });
        }

        // Get task details
        const task = await storage.getTask(existingCompletion.taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Calculate rewards
        const pointsToAward = task.pointsToReward || 0;
        const now = new Date();

        // Update completion to completed
        const updatedCompletion = await storage.updateTaskCompletion(completionId, {
          status: 'completed',
          progress: 100,
          completionData: completionData || existingCompletion.completionData,
          pointsEarned: (existingCompletion.pointsEarned || 0) + pointsToAward,
          totalRewardsEarned: (existingCompletion.totalRewardsEarned || 0) + pointsToAward,
          completedAt: now,
          verifiedAt: now,
          verificationMethod,
          lastActivityAt: now,
        });

        // Create reward distribution record
        const rewardDistribution = await storage.createRewardDistribution({
          userId: req.user.id,
          taskId: task.id,
          taskCompletionId: completionId,
          tenantId: task.tenantId ?? '',
          rewardType: 'points',
          amount: pointsToAward,
          currency: task.pointCurrency || 'default',
          reason: 'task_completion',
          description: `Completed task: ${task.name}`,
          metadata: {
            taskName: task.name,
            taskType: task.taskType,
          },
        });

        res.json({
          completion: updatedCompletion,
          reward: rewardDistribution,
          pointsAwarded: pointsToAward,
        });
      } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
      }
    }
  );

  // ==============================================
  // POST /api/task-completions/:taskId/check-in
  // Special endpoint for daily check-in tasks
  // ==============================================
  router.post(
    '/:taskId/check-in',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { taskId } = req.params;
        const { tenantId } = req.body;

        // Get task
        const task = await storage.getTask(taskId, tenantId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Note: We're not checking task.taskType === 'check_in' because 'check_in' is not in the current task type enum
        // This will need to be addressed when the schema is updated

        // Get or create completion
        let completion = await storage.getTaskCompletionByUserAndTask(req.user.id, taskId);
        if (!completion) {
          completion = await storage.createTaskCompletion({
            taskId,
            userId: req.user.id,
            tenantId,
            status: 'in_progress',
            progress: 0,
            completionData: {
              currentStreak: 0,
              streakMilestones: [],
            },
            pointsEarned: 0,
            totalRewardsEarned: 0,
          });
        }

        const now = new Date();
        const lastCheckIn = completion.completionData?.lastCheckIn
          ? new Date(completion.completionData.lastCheckIn)
          : null;

        // Check if already checked in today
        if (lastCheckIn) {
          const isToday = lastCheckIn.toDateString() === now.toDateString();
          if (isToday) {
            return res.status(400).json({
              error: 'Already checked in today',
              nextCheckIn: new Date(lastCheckIn.getTime() + 24 * 60 * 60 * 1000),
            });
          }
        }

        // Calculate streak
        let currentStreak = completion.completionData?.currentStreak || 0;
        const isConsecutive =
          lastCheckIn && now.getTime() - lastCheckIn.getTime() < 48 * 60 * 60 * 1000; // Within 48 hours

        if (isConsecutive) {
          currentStreak += 1;
        } else {
          currentStreak = 1; // Reset streak
        }

        // Award base points
        const basePoints = task.pointsToReward || 0;
        let totalPoints = basePoints;

        // Check for streak milestone bonuses
        const streakMilestones = completion.completionData?.streakMilestones || [];
        const taskConfig = task.customSettings as Record<string, unknown> | null;
        const streakRewards =
          (taskConfig?.streakRewards as Array<{ days: number; bonusPoints: number }>) || [];

        for (const milestone of streakRewards) {
          if (currentStreak === milestone.days) {
            totalPoints += milestone.bonusPoints;
            streakMilestones.push({
              days: milestone.days,
              completedAt: now.toISOString(),
              pointsAwarded: milestone.bonusPoints,
            });
          }
        }

        // Update completion
        const updatedCompletion = await storage.updateTaskCompletion(completion.id, {
          completionData: {
            ...completion.completionData,
            currentStreak,
            lastCheckIn: now.toISOString(),
            streakMilestones,
          },
          pointsEarned: (completion.pointsEarned || 0) + totalPoints,
          totalRewardsEarned: (completion.totalRewardsEarned || 0) + totalPoints,
          lastActivityAt: now,
        });

        // Create reward distribution
        const rewardDistribution = await storage.createRewardDistribution({
          userId: req.user.id,
          taskId: task.id,
          taskCompletionId: completion.id,
          tenantId: task.tenantId ?? '',
          rewardType: 'points',
          amount: totalPoints,
          currency: task.pointCurrency || 'default',
          reason: currentStreak > 1 ? 'streak_bonus' : 'task_completion',
          description: `Check-in day ${currentStreak}`,
          metadata: {
            taskName: task.name,
            taskType: task.taskType,
            streakDays: currentStreak,
          },
        });

        res.json({
          completion: updatedCompletion,
          reward: rewardDistribution,
          pointsAwarded: totalPoints,
          streak: currentStreak,
          nextCheckIn: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        });
      } catch (error) {
        console.error('Error processing check-in:', error);
        res.status(500).json({ error: 'Failed to process check-in' });
      }
    }
  );

  // ==============================================
  // POST /api/task-completions/:taskCompletionId/verify
  // Trigger verification for a task completion
  // ==============================================
  router.post(
    '/:taskCompletionId/verify',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { taskCompletionId } = req.params;

        // Validate request body
        const validation = verifyTaskSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request data',
            details: validation.error.issues,
          });
        }

        const { platform, taskType, targetData } = validation.data;

        // Validate platform-specific targetData
        let targetDataValidation;
        switch (platform) {
          case 'twitter':
            targetDataValidation = twitterTargetDataSchema.safeParse(targetData);
            break;
          case 'youtube':
            targetDataValidation = youtubeTargetDataSchema.safeParse(targetData);
            break;
          case 'spotify':
            targetDataValidation = spotifyTargetDataSchema.safeParse(targetData);
            break;
          case 'tiktok':
            targetDataValidation = tiktokTargetDataSchema.safeParse(targetData);
            break;
          case 'facebook':
            targetDataValidation = facebookTargetDataSchema.safeParse(targetData);
            break;
          case 'instagram':
            targetDataValidation = instagramTargetDataSchema.safeParse(targetData);
            break;
        }

        if (targetDataValidation && !targetDataValidation.success) {
          return res.status(400).json({
            error: 'Invalid target data for platform',
            details: targetDataValidation.error.issues,
          });
        }

        // SECURITY: Check ownership before verification
        const taskCompletion = await storage.getTaskCompletion(taskCompletionId);
        if (!taskCompletion) {
          return res.status(404).json({ error: 'Task completion not found' });
        }

        if (taskCompletion.userId !== req.user.id) {
          return res.status(403).json({ error: 'Not authorized to verify this task completion' });
        }

        // SECURITY: Prevent duplicate verification
        if (taskCompletion.status === 'completed' && taskCompletion.verifiedAt) {
          return res.status(400).json({
            error: 'Task already verified',
            verifiedAt: taskCompletion.verifiedAt,
          });
        }

        console.log('[Task Verification] Verification requested:', {
          userId: req.user.id,
          taskCompletionId,
          platform,
          taskType,
          targetData,
        });

        // Import verification functions dynamically
        const {
          verifyTwitterFollow,
          verifyTwitterLike,
          verifyTwitterRetweet,
          verifyYouTubeSubscription,
          verifyYouTubeLike,
          verifyYouTubeComment,
          verifySpotifyFollowArtist,
          verifySpotifyFollowPlaylist,
          verifyTikTokFollow,
          verifyTikTokLike,
          verifyTikTokComment,
          verifyFacebookPageLike,
          verifyFacebookPostLike,
          verifyFacebookComment,
          verifyFacebookShare,
          updateTaskCompletion,
        } = await import('../../services/social-verification-service');

        let result;

        // Route to appropriate verification function based on platform and task type
        switch (platform) {
          case 'twitter':
            switch (taskType) {
              case 'twitter_follow':
              case 'follow':
                result = await verifyTwitterFollow(req.user.id, targetData.creatorTwitterId);
                break;
              case 'twitter_like':
              case 'like':
                result = await verifyTwitterLike(req.user.id, targetData.tweetId);
                break;
              case 'twitter_retweet':
              case 'retweet':
                result = await verifyTwitterRetweet(req.user.id, targetData.tweetId);
                break;
              default:
                return res.status(400).json({ error: 'Invalid Twitter task type' });
            }
            break;

          case 'youtube':
            switch (taskType) {
              case 'youtube_subscribe':
              case 'subscribe':
                result = await verifyYouTubeSubscription(req.user.id, targetData.channelId);
                break;
              case 'youtube_like':
              case 'like':
                result = await verifyYouTubeLike(req.user.id, targetData.videoId);
                break;
              case 'youtube_comment':
              case 'comment':
                result = await verifyYouTubeComment(req.user.id, targetData.videoId);
                break;
              default:
                return res.status(400).json({ error: 'Invalid YouTube task type' });
            }
            break;

          case 'spotify':
            switch (taskType) {
              case 'spotify_follow':
              case 'follow_artist':
                result = await verifySpotifyFollowArtist(req.user.id, targetData.artistId);
                break;
              case 'spotify_playlist':
              case 'follow_playlist':
                result = await verifySpotifyFollowPlaylist(req.user.id, targetData.playlistId);
                break;
              default:
                return res.status(400).json({ error: 'Invalid Spotify task type' });
            }
            break;

          case 'tiktok':
            switch (taskType) {
              case 'tiktok_follow':
              case 'follow':
                result = await verifyTikTokFollow(req.user.id, targetData.creatorTikTokId);
                break;
              case 'tiktok_like':
              case 'like':
                result = await verifyTikTokLike(req.user.id, targetData.videoId);
                break;
              case 'tiktok_comment':
              case 'comment':
                result = await verifyTikTokComment(req.user.id, targetData.videoId);
                break;
              default:
                return res.status(400).json({ error: 'Invalid TikTok task type' });
            }
            break;

          case 'facebook':
            switch (taskType) {
              case 'facebook_like_page':
              case 'like_page':
                result = await verifyFacebookPageLike(req.user.id, targetData.pageId);
                break;
              case 'facebook_like_post':
              case 'like_post':
              case 'like':
                result = await verifyFacebookPostLike(req.user.id, targetData.postId);
                break;
              case 'facebook_comment_post':
              case 'facebook_comment_photo':
              case 'comment':
                result = await verifyFacebookComment(req.user.id, targetData.postId);
                break;
              case 'facebook_share_post':
              case 'facebook_share_page':
              case 'facebook_share':
              case 'share':
                result = await verifyFacebookShare(req.user.id, targetData.postId);
                break;
              case 'facebook_like_photo':
                result = await verifyFacebookPostLike(req.user.id, targetData.postId);
                break;
              default:
                return res.status(400).json({ error: 'Invalid Facebook task type' });
            }
            break;

          default:
            return res.status(400).json({ error: 'Unsupported platform' });
        }

        // Update task completion with verification result and award points
        let pointsAwarded = 0;
        if (result.verified) {
          const updateResult = await updateTaskCompletion(taskCompletionId, result, 'api_poll');
          pointsAwarded = updateResult.pointsAwarded || 0;
        }

        res.json({
          success: result.verified,
          verified: result.verified,
          message: result.verified
            ? `Task verified! +${pointsAwarded} points awarded`
            : result.message,
          pointsAwarded,
          proof: result.proof,
          error: result.error,
        });
      } catch (error) {
        console.error('[Task Verification] Error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify task',
          message: String(error),
        });
      }
    }
  );

  return router;
}
