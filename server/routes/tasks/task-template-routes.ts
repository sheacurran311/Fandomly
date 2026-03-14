/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { insertTaskTemplateSchema } from '@shared/schema';
import {
  PLATFORM_TASK_TYPES,
  twitterTaskSchema,
  facebookTaskSchema,
  instagramTaskSchema,
  youtubeTaskSchema,
  tiktokTaskSchema,
  spotifyTaskSchema,
  appleMusicTaskSchema,
} from '@shared/taskTemplates';
import { sql } from 'drizzle-orm';

export function registerTaskTemplateRoutes(app: Express) {
  // =====================================
  // TASK TEMPLATE API ROUTES
  // =====================================

  // Get task templates (with core templates + tenant-specific)
  app.get('/api/task-templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get creator profile to ensure they can access tasks
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required to access tasks' });
      }

      const tasks = await storage.getTasks(creator.id, creator.tenantId);

      // Transform database field names to client field names for compatibility
      const transformedTasks = tasks.map((task) => ({
        ...task,
        points: task.pointsToReward,
        settings: task.customSettings,
      }));

      res.json(transformedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get specific task template
  app.get('/api/task-templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      const template = await storage.getTaskTemplate(req.params.id, creator.tenantId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Failed to fetch task template:', error);
      res.status(500).json({ error: 'Failed to fetch task template' });
    }
  });

  // Create custom task template
  app.post('/api/task-templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      // Validate request body
      const templateData = insertTaskTemplateSchema.parse(req.body);

      // Validate platform/taskType consistency
      const platformPrefix = templateData.platform;
      const expectedPrefix = templateData.taskType.split('_')[0];
      if (platformPrefix !== expectedPrefix) {
        return res.status(400).json({
          error: `Task type '${templateData.taskType}' is not valid for platform '${templateData.platform}'`,
        });
      }

      // Validate platform-specific configuration using appropriate schema
      let configValidation;
      try {
        switch (templateData.platform) {
          case 'twitter':
            configValidation = twitterTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'facebook':
            configValidation = facebookTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'instagram':
            configValidation = instagramTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'youtube':
            configValidation = youtubeTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'tiktok':
            configValidation = tiktokTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'spotify':
            configValidation = spotifyTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'apple_music':
            configValidation = appleMusicTaskSchema.parse(templateData.defaultConfig);
            break;
          default:
            return res
              .status(400)
              .json({ error: `Unsupported platform: ${templateData.platform}` });
        }
      } catch (validationError) {
        return res.status(400).json({
          error: 'Invalid platform configuration',
          details:
            validationError instanceof Error
              ? validationError.message
              : 'Configuration validation failed',
        });
      }

      // Set tenant context for custom templates (force isGlobal=false for non-admin)
      const templateWithContext = {
        ...templateData,
        tenantId: creator.tenantId,
        creatorId: creator.id,
        isGlobal: false, // Regular users cannot create global templates
        defaultConfig: configValidation as any,
      };

      const template = await storage.createTaskTemplate(templateWithContext);
      res.json(template);
    } catch (error) {
      console.error('Failed to create task template:', error);
      if (error instanceof Error && error.message.includes('parse')) {
        res.status(400).json({ error: 'Invalid template data' });
      } else {
        res.status(500).json({ error: 'Failed to create task template' });
      }
    }
  });

  // Update task template (only owner can update)
  app.put('/api/task-templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      // Validate request body - whitelist safe fields only
      const fullUpdate = insertTaskTemplateSchema.partial().parse(req.body);
      const updates = {
        name: fullUpdate.name,
        description: fullUpdate.description,
        defaultConfig: fullUpdate.defaultConfig,
        isActive: fullUpdate.isActive,
      };
      // Remove undefined fields
      Object.keys(updates).forEach((key) => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      // If updating platform configuration, validate it using existing template's platform
      if (updates.defaultConfig) {
        const existingTemplate = await storage.getTaskTemplate(req.params.id, creator.tenantId);
        if (!existingTemplate) {
          return res.status(404).json({ error: 'Template not found' });
        }

        switch (existingTemplate.platform) {
          case 'twitter':
            twitterTaskSchema.parse(updates.defaultConfig);
            break;
          case 'facebook':
            facebookTaskSchema.parse(updates.defaultConfig);
            break;
          case 'instagram':
            instagramTaskSchema.parse(updates.defaultConfig);
            break;
          case 'youtube':
            youtubeTaskSchema.parse(updates.defaultConfig);
            break;
          case 'tiktok':
            tiktokTaskSchema.parse(updates.defaultConfig);
            break;
          case 'spotify':
            spotifyTaskSchema.parse(updates.defaultConfig);
            break;
        }
      }

      const template = await storage.updateTaskTemplate(req.params.id, updates, creator.tenantId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found or permission denied' });
      }

      res.json(template);
    } catch (error) {
      console.error('Failed to update task template:', error);
      res.status(500).json({ error: 'Failed to update task template' });
    }
  });

  // Delete task template (only owner can delete)
  app.delete(
    '/api/task-templates/:id',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        await storage.deleteTaskTemplate(req.params.id, creator.tenantId);
        res.json({ success: true, message: 'Template deleted successfully' });
      } catch (error) {
        console.error('Failed to delete task template:', error);
        res.status(500).json({ error: 'Failed to delete task template' });
      }
    }
  );

  // Get platform-specific task types for UI (authenticated)
  app.get(
    '/api/platforms/:platform/task-types',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const platform = req.params.platform;
        const taskTypes = PLATFORM_TASK_TYPES[platform as keyof typeof PLATFORM_TASK_TYPES];

        if (!taskTypes) {
          return res.status(404).json({ error: 'Platform not found' });
        }

        res.json(taskTypes);
      } catch {
        res.status(500).json({ error: 'Failed to fetch task types' });
      }
    }
  );

  // Publish campaign (with task validation)
  app.post(
    '/api/campaigns/:campaignId/publish',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        // Validate campaign belongs to creator before publishing
        const campaigns = await storage.getCampaignsByCreator(creator.id, creator.tenantId);
        const existingCampaign = campaigns.find((c) => c.id === req.params.campaignId);
        if (!existingCampaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = await storage.publishCampaign(req.params.campaignId, creator.tenantId);
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({
          campaign,
          message: 'Campaign published successfully',
        });
      } catch (error) {
        console.error('Campaign publishing error:', error);
        if (error instanceof Error && error.message.includes('at least 1 task')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to publish campaign' });
        }
      }
    }
  );

  // Sprint 6: Validate campaign prerequisites (check if user can participate)
  app.post(
    '/api/campaigns/:campaignId/validate-prerequisites',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const campaignId = req.params.campaignId;

        // Call the validation function from the database
        const result = await db.execute(sql`
        SELECT * FROM validate_campaign_prerequisites(${userId}, ${campaignId})
      `);

        const validation = result.rows[0];

        if (!validation) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({
          canParticipate: validation.can_participate,
          missingPrerequisites: validation.missing_prerequisites,
        });
      } catch (error) {
        console.error('Failed to validate campaign prerequisites:', error);
        res.status(500).json({ error: 'Failed to validate prerequisites' });
      }
    }
  );

  // Get pending campaigns (campaigns waiting for tasks)
  app.get('/api/campaigns/pending', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      const campaigns = await storage.getPendingCampaigns(creator.id, creator.tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error('Failed to fetch pending campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch pending campaigns' });
    }
  });
}
