import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

// Task configuration schemas based on our task builders
const baseTaskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownershipLevel: z.enum(['platform', 'creator']).default('creator'),
  section: z.enum(['user_onboarding', 'social_engagement', 'community_building', 'content_creation', 'streaming_music', 'token_activity', 'custom']).default('custom'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isRequired: z.boolean().default(false),
  hideFromUI: z.boolean().default(false),
  isDraft: z.boolean().default(true),
  updateCadence: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('immediate'),
  rewardFrequency: z.enum(['one_time', 'daily', 'weekly', 'monthly']).default('one_time'),
});

const referralTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('referral'),
  customSettings: z.object({
    referralTier: z.enum(['platform_creator_to_creator', 'platform_fan_to_fan', 'campaign_fan_to_fan']),
    rewardStructure: z.enum(['fixed', 'percentage', 'revenue_share']),
    referrerPoints: z.number().optional(),
    referredPoints: z.number().optional(),
    percentageOfReferred: z.number().min(1).max(100).optional(),
    revenueSharePercentage: z.number().min(1).max(50).optional(),
    revenueShareDuration: z.enum(['lifetime', '12_months', '6_months', '3_months']).optional(),
    dualRewards: z.object({
      enabled: z.boolean(),
      creatorPoints: z.number().min(0).optional(),
      platformPoints: z.number().min(0).optional(),
    }).optional(),
    qualifyingConditions: z.array(z.object({
      type: z.enum(['quest_completion', 'point_threshold', 'account_age', 'revenue_threshold']),
      value: z.union([z.string(), z.number()]),
    })).optional(),
    maxReferralsPerUser: z.number().nullable().optional(),
    totalMaxReferrals: z.number().nullable().optional(),
  }),
});

const checkInTaskSchema = baseTaskSchema.extend({
  taskType: z.literal('checkin'),
  customSettings: z.object({
    pointsPerCheckIn: z.number().min(1),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    enableStreak: z.boolean(),
    rewardOnlyStreakCompletions: z.boolean().optional(),
    streakMilestones: z.array(z.object({
      consecutiveDays: z.number().min(1),
      bonusPoints: z.number().min(1),
    })).optional(),
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
    tiers: z.array(z.object({
      followers: z.number().min(1),
      points: z.number().min(1),
    })).optional(),
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

// Twitter task schemas
const twitterTaskSchema = baseTaskSchema.extend({
  taskType: z.enum(['twitter_follow', 'twitter_like', 'twitter_retweet']),
  platform: z.literal('twitter'),
  points: z.number().min(1).max(10000),
  verificationMethod: z.enum(['manual', 'api']).default('api'),
  settings: z.object({
    handle: z.string().optional(),
    url: z.string().optional(),
    tweetUrl: z.string().optional(),
  }),
});

// Union of all task schemas
const createTaskSchema = z.discriminatedUnion('taskType', [
  referralTaskSchema,
  checkInTaskSchema,
  followerMilestoneSchema,
  completeProfileTaskSchema,
  twitterTaskSchema,
]);

export function registerTaskRoutes(app: Express) {
  // Get all published tasks (for fans)
  app.get("/api/tasks/published", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      
      // Get all tasks
      let tasks = tenantId 
        ? await storage.getTasksByTenantId(tenantId)
        : await storage.getAllTasks();
      
      // Filter to only published (non-draft) tasks
      tasks = tasks.filter(task => !task.isDraft);
      
      // Filter by time availability
      const now = new Date();
      tasks = tasks.filter(task => {
        if (task.startTime && new Date(task.startTime) > now) {
          return false;
        }
        if (task.endTime && new Date(task.endTime) < now) {
          return false;
        }
        return true;
      });
      
      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching published tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Create new task
  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate task data
      const validatedData = createTaskSchema.parse(req.body);

      // Check if this is a platform task
      const isPlatformTask = validatedData.ownershipLevel === 'platform';

      // Platform tasks can only be created by Fandomly admins
      if (isPlatformTask && user.role !== 'fandomly_admin') {
        return res.status(403).json({ error: "Only Fandomly admins can create platform tasks" });
      }

      // Creator tasks require a creator profile
      let creator = null;
      let tenantId = null;
      let creatorId = null;

      if (!isPlatformTask) {
        // Verify user is a creator for creator-level tasks
        if (user.userType !== 'creator') {
          return res.status(403).json({ error: "Only creators can create creator tasks" });
        }

        creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(404).json({ error: "Creator profile not found" });
        }

        tenantId = creator.tenantId;
        creatorId = creator.id;
      }

      // Prepare task data for storage
      const taskData = {
        ownershipLevel: validatedData.ownershipLevel,
        tenantId,
        creatorId,
        name: validatedData.name,
        description: validatedData.description || '',
        taskType: validatedData.taskType,
        platform: 'platform' in validatedData ? validatedData.platform : 'system' as const,
        section: validatedData.section,
        startTime: validatedData.startTime || null,
        endTime: validatedData.endTime || null,
        isRequired: validatedData.isRequired,
        hideFromUI: validatedData.hideFromUI,
        isDraft: validatedData.isDraft,
        
        // Reward configuration
        rewardType: 'points' as const, // Default to points for now
        pointsToReward: 'points' in validatedData 
          ? validatedData.points 
          : ('customSettings' in validatedData && 'pointsPerCheckIn' in validatedData.customSettings 
            ? validatedData.customSettings.pointsPerCheckIn 
            : 50),
        pointCurrency: 'default',
        
        // Timing
        updateCadence: validatedData.updateCadence,
        rewardFrequency: validatedData.rewardFrequency,
        
        // Verification method (for Twitter tasks)
        verificationMethod: 'verificationMethod' in validatedData ? validatedData.verificationMethod : undefined,
        
        // Custom settings (task-specific configuration)
        customSettings: 'settings' in validatedData 
          ? validatedData.settings 
          : ('customSettings' in validatedData ? validatedData.customSettings : {}),
      };

      // Create task in database
      const task = await storage.createTask(taskData);

      res.status(201).json({
        success: true,
        task,
        message: validatedData.isDraft ? 'Task saved as draft' : 'Task published successfully',
      });
    } catch (error: any) {
      console.error('Error creating task:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid task data",
          details: error.errors,
        });
      }
      
      res.status(500).json({
        error: "Failed to create task",
        message: error.message,
      });
    }
  });

  // Get all tasks for a creator
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'creator') {
        return res.status(403).json({ error: "Only creators can view tasks" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator profile not found" });
      }

      // Get all tasks for this creator's tenant
      const tasks = await storage.getTasksByTenantId(creator.tenantId);

      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        error: "Failed to fetch tasks",
        message: error.message,
      });
    }
  });

  // Get single task by ID
  app.get("/api/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify ownership
      const user = await storage.getUser(userId);
      if (user?.userType === 'creator') {
        const creator = await storage.getCreatorByUserId(userId);
        if (creator && task.tenantId !== creator.tenantId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json(task);
    } catch (error: any) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        error: "Failed to fetch task",
        message: error.message,
      });
    }
  });

  // Update task
  app.put("/api/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'creator') {
        return res.status(403).json({ error: "Only creators can update tasks" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator profile not found" });
      }

      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (existingTask.tenantId !== creator.tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate update data
      const validatedData = createTaskSchema.parse(req.body);

      // Prepare update data
      const updateData = {
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
        customSettings: 'customSettings' in validatedData ? validatedData.customSettings : {},
      };

      const updatedTask = await storage.updateTask(taskId, updateData);

      res.json({
        success: true,
        task: updatedTask,
        message: validatedData.isDraft ? 'Task updated and saved as draft' : 'Task updated and published',
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid task data",
          details: error.errors,
        });
      }
      
      res.status(500).json({
        error: "Failed to update task",
        message: error.message,
      });
    }
  });

  // Delete task
  app.delete("/api/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'creator') {
        return res.status(403).json({ error: "Only creators can delete tasks" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator profile not found" });
      }

      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (existingTask.tenantId !== creator.tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteTask(taskId);

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        error: "Failed to delete task",
        message: error.message,
      });
    }
  });

  // Publish draft task (change isDraft to false)
  app.post("/api/tasks/:taskId/publish", async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = (req.headers['x-dynamic-user-id'] || req.headers['x-user-id']) as string;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'creator') {
        return res.status(403).json({ error: "Only creators can publish tasks" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator profile not found" });
      }

      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (existingTask.tenantId !== creator.tenantId) {
        return res.status(403).json({ error: "Access denied" });
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
        error: "Failed to publish task",
        message: error.message,
      });
    }
  });

  // Get available tasks for fans (only published, non-hidden tasks)
  app.get("/api/tasks/available/:creatorId", async (req: Request, res: Response) => {
    try {
      const { creatorId } = req.params;

      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get all tasks for this creator's tenant
      const allTasks = await storage.getTasksByTenantId(creator.tenantId);

      // Filter to only published, non-hidden tasks within active date range
      const now = new Date();
      const availableTasks = allTasks.filter(task => {
        if (task.isDraft || task.hideFromUI) return false;
        if (task.startTime && new Date(task.startTime) > now) return false;
        if (task.endTime && new Date(task.endTime) < now) return false;
        return true;
      });

      res.json(availableTasks);
    } catch (error: any) {
      console.error('Error fetching available tasks:', error);
      res.status(500).json({
        error: "Failed to fetch available tasks",
        message: error.message,
      });
    }
  });
}

