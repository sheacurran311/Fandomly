/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';

// ============================================================================
// CAMPAIGN BUILDER: Draft & Task Assignment Endpoints (legacy)
// ============================================================================

export function registerCampaignDraftRoutes(app: Express) {
  // Create draft campaign (soft-save for campaign builder)
  app.post('/api/campaigns/draft', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      console.log('[Campaign Draft] Request body:', JSON.stringify(req.body, null, 2));

      // Helper to safely parse to Date object (Drizzle expects Date objects for timestamp columns)
      const parseToDate = (value: any): Date | null => {
        if (!value || value === '') return null;
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return null;
          return date;
        } catch {
          return null;
        }
      };

      // Parse dates as Date objects (Drizzle requires Date objects, not strings!)
      const startDate: Date = parseToDate(req.body.startDate) || new Date();
      const endDate: Date | null = parseToDate(req.body.endDate);

      // Date validation for drafts (be lenient - allow saving but warn)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight today

      // For drafts, start date should be today or future (but allow for editing)
      if (startDate < today) {
        console.log('[Campaign Draft] Warning: Start date is in the past, adjusting to today');
        // Don't reject drafts with past dates - they might be editing
      }

      // End date must be after start date
      if (endDate && endDate <= startDate) {
        return res.status(400).json({
          error: 'Invalid dates',
          message: 'End date must be after start date',
        });
      }

      // Build campaign data explicitly - DO NOT spread req.body
      // This prevents invalid/unexpected fields from causing errors
      const campaignData: any = {
        // Required fields
        name: String(req.body.name || 'Untitled Campaign'),
        creatorId: creator.id,
        tenantId: creator.tenantId,
        status: 'draft',
        campaignType: String(req.body.campaignType || 'direct'),
        trigger: 'custom_event',
        startDate: startDate, // Must be Date object

        // Optional fields
        description: req.body.description ? String(req.body.description) : null,
        endDate: endDate, // Must be Date object or null
        visibility: 'everyone',
      };

      // Only add JSONB fields if they are properly formatted
      if (req.body.campaignTypes && Array.isArray(req.body.campaignTypes)) {
        campaignData.campaignTypes = req.body.campaignTypes.map(String);
      }
      if (
        req.body.rewardStructure &&
        typeof req.body.rewardStructure === 'object' &&
        !Array.isArray(req.body.rewardStructure)
      ) {
        campaignData.rewardStructure = req.body.rewardStructure;
      }
      if (req.body.prerequisiteCampaigns && Array.isArray(req.body.prerequisiteCampaigns)) {
        campaignData.prerequisiteCampaigns = req.body.prerequisiteCampaigns.map(String);
      }
      if (typeof req.body.allTasksRequired === 'boolean') {
        campaignData.allTasksRequired = req.body.allTasksRequired;
      }

      console.log(
        '[Campaign Draft] Creating campaign with data:',
        JSON.stringify(
          {
            ...campaignData,
            startDate: startDate.toISOString(),
            endDate: endDate?.toISOString() || null,
          },
          null,
          2
        )
      );

      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error: any) {
      console.error('Failed to create draft campaign:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create draft campaign', details: error.message });
    }
  });

  // Update campaign (for updating drafts during campaign builder flow)
  app.put(
    '/api/campaigns/:campaignId',
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

        const { campaignId } = req.params;

        // Verify campaign belongs to this creator
        const existingCampaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!existingCampaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        if (existingCampaign.creatorId !== creator.id) {
          return res.status(403).json({ error: 'Not authorized to update this campaign' });
        }

        // Helper to safely parse to Date object (Drizzle expects Date objects for timestamp columns)
        const parseToDate = (value: any): Date | null => {
          if (!value || value === '') return null;
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return null;
            return date;
          } catch {
            return null;
          }
        };

        // Build update data explicitly - only include valid fields
        const updateData: any = {};

        // String fields
        if (req.body.name && req.body.name !== '') {
          updateData.name = String(req.body.name);
        }
        if (req.body.description !== undefined) {
          updateData.description = req.body.description ? String(req.body.description) : null;
        }
        if (
          req.body.status &&
          ['draft', 'active', 'paused', 'completed'].includes(req.body.status)
        ) {
          updateData.status = req.body.status;
        }

        // Date fields - must be Date objects for Drizzle
        const startDate = parseToDate(req.body.startDate);
        if (startDate) {
          updateData.startDate = startDate;
        }
        if (req.body.endDate === null) {
          updateData.endDate = null;
        } else {
          const endDate = parseToDate(req.body.endDate);
          if (endDate) {
            updateData.endDate = endDate;
          }
        }

        // JSONB fields - validate they're proper arrays/objects
        if (req.body.campaignTypes && Array.isArray(req.body.campaignTypes)) {
          updateData.campaignTypes = req.body.campaignTypes.map(String);
        }
        if (
          req.body.rewardStructure &&
          typeof req.body.rewardStructure === 'object' &&
          !Array.isArray(req.body.rewardStructure)
        ) {
          updateData.rewardStructure = req.body.rewardStructure;
        }
        if (req.body.visibilityRules && typeof req.body.visibilityRules === 'object') {
          updateData.visibilityRules = req.body.visibilityRules;
        }
        if (req.body.prerequisiteCampaigns && Array.isArray(req.body.prerequisiteCampaigns)) {
          updateData.prerequisiteCampaigns = req.body.prerequisiteCampaigns.map(String);
        }
        if (typeof req.body.allTasksRequired === 'boolean') {
          updateData.allTasksRequired = req.body.allTasksRequired;
        }

        // Only update if we have changes
        if (Object.keys(updateData).length === 0) {
          return res.json(existingCampaign);
        }

        const updatedCampaign = await storage.updateCampaign(campaignId, updateData);
        res.json(updatedCampaign);
      } catch (error: any) {
        console.error('Failed to update campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign', details: error.message });
      }
    }
  );

  // Assign task to campaign (uses task_assignments table)
  app.post(
    '/api/tasks/:taskId/assign',
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

        const { taskId } = req.params;
        const { campaignId } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: 'Campaign ID required' });
        }

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Verify task exists and belongs to this creator
        const task = await storage.getTask(taskId, creator.tenantId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Use proper assignment method that inserts into task_assignments table
        const assignment = await storage.assignTaskToCampaign(taskId, campaignId, creator.tenantId);
        res.json({ success: true, assignment, task });
      } catch (error: any) {
        console.error('Failed to assign task to campaign:', error);
        res.status(500).json({ error: 'Failed to assign task', details: error.message });
      }
    }
  );

  // Unassign task from campaign
  app.delete(
    '/api/tasks/:taskId/unassign',
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

        const { taskId } = req.params;
        const { campaignId } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: 'Campaign ID required' });
        }

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Unassign task from campaign
        await storage.unassignTaskFromCampaign(taskId, campaignId, creator.tenantId);
        res.json({ success: true, message: 'Task unassigned from campaign' });
      } catch (error: any) {
        console.error('Failed to unassign task from campaign:', error);
        res.status(500).json({ error: 'Failed to unassign task', details: error.message });
      }
    }
  );

  // Get task assignments for a campaign
  app.get(
    '/api/campaigns/:campaignId/task-assignments',
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

        const { campaignId } = req.params;

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get task assignments
        const assignments = await storage.getTaskAssignments(campaignId);
        const taskIds = assignments.map((a) => a.taskId);

        res.json({ assignments, taskIds });
      } catch (error: any) {
        console.error('Failed to get task assignments:', error);
        res.status(500).json({ error: 'Failed to get task assignments', details: error.message });
      }
    }
  );
}
