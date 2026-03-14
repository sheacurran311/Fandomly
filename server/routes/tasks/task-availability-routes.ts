/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Express, Request, Response } from 'express';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';

export function registerTaskAvailabilityRoutes(app: Express) {
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
}
