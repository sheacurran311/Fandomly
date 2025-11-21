/**
 * Instagram Task API Routes
 * 
 * Handles Instagram task creation and management:
 * - Comment+nonce tasks
 * - Story mention tasks  
 * - Keyword comment tasks
 * - Fan username management
 * - Task start/status endpoints
 */

import type { Express, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { tasks, taskCompletions, socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { generateNonce, normalizeInstagramUsername, isValidInstagramUsername } from '../../lib/nonce';
import { saveTaskNonce, getTaskNonce, markTaskStarted, hasTaskStarted } from '../../lib/redis';

export function registerInstagramTaskRoutes(app: Express) {
  
  /**
   * Save fan's Instagram username
   * POST /api/social/user/instagram
   */
  app.post('/api/social/user/instagram', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username } = req.body;
      const userId = req.userId!;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Normalize and validate username
      const normalizedUsername = normalizeInstagramUsername(username);
      if (!isValidInstagramUsername(normalizedUsername)) {
        return res.status(400).json({ 
          error: 'Invalid Instagram username format',
          details: 'Username must be 1-30 characters, alphanumeric with periods/underscores only'
        });
      }

      console.log('[Instagram Tasks] Saving fan username:', {
        userId,
        username: normalizedUsername
      });

      // Check if already exists
      const existing = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, 'instagram')
        )
      });

      if (existing) {
        // Update existing
        await db.update(socialConnections)
          .set({
            platformUsername: normalizedUsername,
            updatedAt: new Date()
          })
          .where(eq(socialConnections.id, existing.id));

        console.log('[Instagram Tasks] ✅ Updated Instagram username');
      } else {
        // Create new
        await db.insert(socialConnections).values({
          userId,
          platform: 'instagram',
          platformUsername: normalizedUsername,
          isActive: true
        });

        console.log('[Instagram Tasks] ✅ Saved Instagram username');
      }

      res.json({
        success: true,
        username: normalizedUsername
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error saving username:', error);
      res.status(500).json({ error: 'Failed to save Instagram username' });
    }
  });

  /**
   * Get fan's Instagram username
   * GET /api/social/user/instagram
   */
  app.get('/api/social/user/instagram', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const connection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, 'instagram')
        )
      });

      if (!connection) {
        return res.json({ connected: false, username: null });
      }

      res.json({
        connected: true,
        username: connection.platformUsername
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error fetching username:', error);
      res.status(500).json({ error: 'Failed to fetch Instagram username' });
    }
  });

  /**
   * Start an Instagram task
   * POST /api/tasks/instagram/:taskId/start
   */
  app.post('/api/tasks/instagram/:taskId/start', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = req.userId!;

      console.log('[Instagram Tasks] Starting task:', { taskId, userId });

      // Get task details
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.platform, 'instagram'),
          eq(tasks.status, 'active')
        )
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if already completed
      const existing = await db.query.taskCompletions.findFirst({
        where: and(
          eq(taskCompletions.taskId, taskId),
          eq(taskCompletions.userId, userId)
        )
      });

      if (existing) {
        return res.status(400).json({ 
          error: 'Task already completed',
          completion: existing
        });
      }

      // Verify user has Instagram username saved
      const instagramConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, 'instagram')
        )
      });

      if (!instagramConnection || !instagramConnection.platformUsername) {
        return res.status(400).json({ 
          error: 'Instagram username required',
          message: 'Please save your Instagram username first'
        });
      }

      // Mark task as started
      await markTaskStarted(taskId, userId);

      // Generate nonce for comment_code tasks
      let nonce = null;
      if (task.taskType === 'comment_code') {
        nonce = generateNonce();
        await saveTaskNonce(taskId, userId, nonce);
        console.log('[Instagram Tasks] Generated nonce:', nonce);
      }

      // Build response with instructions
      const response: any = {
        taskId,
        type: task.taskType,
        started: true,
        expiresAt: task.expiresAt
      };

      if (task.taskType === 'comment_code') {
        response.nonce = nonce;
        response.mediaUrl = task.requirements?.mediaUrl;
        response.instructions = `Comment exactly "${nonce}" on the Instagram post`;
      } else if (task.taskType === 'mention_story') {
        const creatorUsername = task.requirements?.creatorUsername;
        response.creatorUsername = creatorUsername;
        response.instructions = `Post an Instagram Story and mention @${creatorUsername}`;
        if (task.requirements?.requireHashtag) {
          response.requireHashtag = task.requirements.requireHashtag;
          response.instructions += ` with ${task.requirements.requireHashtag}`;
        }
      } else if (task.taskType === 'keyword_comment') {
        response.keyword = task.requirements?.keyword;
        response.mediaUrl = task.requirements?.mediaUrl;
        response.instructions = `Comment with "${task.requirements?.keyword}" on the Instagram post`;
      }

      console.log('[Instagram Tasks] ✅ Task started');
      res.json(response);

    } catch (error) {
      console.error('[Instagram Tasks] Error starting task:', error);
      res.status(500).json({ error: 'Failed to start task' });
    }
  });

  /**
   * Get task status
   * GET /api/tasks/instagram/:taskId/status
   */
  app.get('/api/tasks/instagram/:taskId/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = req.userId!;

      // Check if completed
      const completion = await db.query.taskCompletions.findFirst({
        where: and(
          eq(taskCompletions.taskId, taskId),
          eq(taskCompletions.userId, userId)
        )
      });

      if (completion) {
        return res.json({
          started: true,
          completed: true,
          verified: !!completion.verifiedAt,
          completedAt: completion.createdAt,
          verifiedAt: completion.verifiedAt,
          status: completion.status
        });
      }

      // Check if started
      const started = await hasTaskStarted(taskId, userId);

      // Get nonce if comment_code task
      let nonce = null;
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (task?.taskType === 'comment_code' && started) {
        nonce = await getTaskNonce(taskId, userId);
      }

      res.json({
        started,
        completed: false,
        verified: false,
        nonce,
        expiresAt: task?.expiresAt
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error checking status:', error);
      res.status(500).json({ error: 'Failed to check task status' });
    }
  });

  /**
   * Create comment+nonce task (Creator only)
   * POST /api/tasks/instagram/comment-code
   */
  app.post('/api/tasks/instagram/comment-code', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mediaId, mediaUrl, rewardPoints, expiresAt, title, description } = req.body;
      const creatorId = req.userId!;

      console.log('[Instagram Tasks] Creating comment-code task:', {
        creatorId,
        mediaId
      });

      if (!mediaId || !mediaUrl || !rewardPoints) {
        return res.status(400).json({ 
          error: 'Missing required fields: mediaId, mediaUrl, rewardPoints' 
        });
      }

      // Verify creator has Instagram Business/Creator account connected
      const instagramConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, creatorId),
          eq(socialConnections.platform, 'instagram'),
          eq(socialConnections.isActive, true)
        )
      });

      if (!instagramConnection) {
        return res.status(400).json({ 
          error: 'Instagram Business/Creator account not connected' 
        });
      }

      // Create task
      const [newTask] = await db.insert(tasks).values({
        creatorId,
        platform: 'instagram',
        taskType: 'comment_code',
        title: title || 'Comment on Instagram Post',
        description: description || 'Comment with your unique code on the post',
        pointsReward: rewardPoints,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        requirements: {
          mediaId,
          mediaUrl,
          taskType: 'comment_code'
        }
      }).returning();

      console.log('[Instagram Tasks] ✅ Comment-code task created:', newTask.id);

      res.json({
        success: true,
        task: newTask
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error creating comment-code task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  /**
   * Create story mention task (Creator only)
   * POST /api/tasks/instagram/mention-story
   */
  app.post('/api/tasks/instagram/mention-story', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rewardPoints, requireHashtag, expiresAt, title, description } = req.body;
      const creatorId = req.userId!;

      console.log('[Instagram Tasks] Creating mention-story task:', {
        creatorId,
        requireHashtag
      });

      if (!rewardPoints) {
        return res.status(400).json({ 
          error: 'Missing required field: rewardPoints' 
        });
      }

      // Get creator's Instagram username
      const instagramConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, creatorId),
          eq(socialConnections.platform, 'instagram'),
          eq(socialConnections.isActive, true)
        )
      });

      if (!instagramConnection) {
        return res.status(400).json({ 
          error: 'Instagram Business/Creator account not connected' 
        });
      }

      // Create task
      const [newTask] = await db.insert(tasks).values({
        creatorId,
        platform: 'instagram',
        taskType: 'mention_story',
        title: title || 'Mention in Instagram Story',
        description: description || `Post a story mentioning @${instagramConnection.platformUsername}`,
        pointsReward: rewardPoints,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        requirements: {
          creatorUsername: instagramConnection.platformUsername,
          requireHashtag: requireHashtag || null,
          taskType: 'mention_story'
        }
      }).returning();

      console.log('[Instagram Tasks] ✅ Mention-story task created:', newTask.id);

      res.json({
        success: true,
        task: newTask
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error creating mention-story task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  /**
   * Create keyword comment task (Creator only)
   * POST /api/tasks/instagram/keyword-comment
   */
  app.post('/api/tasks/instagram/keyword-comment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mediaId, mediaUrl, keyword, rewardPoints, expiresAt, title, description } = req.body;
      const creatorId = req.userId!;

      console.log('[Instagram Tasks] Creating keyword-comment task:', {
        creatorId,
        mediaId,
        keyword
      });

      if (!mediaId || !mediaUrl || !keyword || !rewardPoints) {
        return res.status(400).json({ 
          error: 'Missing required fields: mediaId, mediaUrl, keyword, rewardPoints' 
        });
      }

      // Verify creator has Instagram connected
      const instagramConnection = await db.query.socialConnections.findFirst({
        where: and(
          eq(socialConnections.userId, creatorId),
          eq(socialConnections.platform, 'instagram'),
          eq(socialConnections.isActive, true)
        )
      });

      if (!instagramConnection) {
        return res.status(400).json({ 
          error: 'Instagram Business/Creator account not connected' 
        });
      }

      // Create task
      const [newTask] = await db.insert(tasks).values({
        creatorId,
        platform: 'instagram',
        taskType: 'keyword_comment',
        title: title || 'Comment with Keyword',
        description: description || `Comment with "${keyword}" on the post`,
        pointsReward: rewardPoints,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        requirements: {
          mediaId,
          mediaUrl,
          keyword,
          taskType: 'keyword_comment'
        }
      }).returning();

      console.log('[Instagram Tasks] ✅ Keyword-comment task created:', newTask.id);

      res.json({
        success: true,
        task: newTask
      });

    } catch (error) {
      console.error('[Instagram Tasks] Error creating keyword-comment task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });
}

