import type { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import {
  verifyTikTokFollow,
  verifyTikTokLike,
  verifyTikTokComment,
  updateTaskCompletion
} from '../../services/social-verification-service';

/**
 * TikTok Task Verification Routes
 * Handles verification of TikTok tasks: follows, likes, comments
 * Note: TikTok API has limited public access for certain verification features
 */

export function registerTikTokTaskRoutes(app: Express) {
  
  /**
   * POST /api/tasks/verify/tiktok/follow
   * Verify user follows a creator on TikTok
   */
  app.post('/api/tasks/verify/tiktok/follow', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { creatorTikTokId, taskCompletionId } = req.body;
      
      if (!creatorTikTokId) {
        return res.status(400).json({ error: 'creatorTikTokId is required' });
      }
      
      console.log('[TikTok Verify] Follow verification requested:', {
        userId,
        creatorTikTokId,
        taskCompletionId
      });
      
      // Verify the follow
      const result = await verifyTikTokFollow(userId, creatorTikTokId);
      
      // Update task completion if provided
      if (taskCompletionId && result.verified) {
        await updateTaskCompletion(taskCompletionId, result, 'api_poll');
      }
      
      res.json({
        success: result.verified,
        verified: result.verified,
        message: result.message,
        proof: result.proof,
        error: result.error
      });
    } catch (error) {
      console.error('[TikTok Verify] Follow verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify TikTok follow',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/tiktok/like
   * Verify user liked a TikTok video
   */
  app.post('/api/tasks/verify/tiktok/like', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { videoId, taskCompletionId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      
      console.log('[TikTok Verify] Like verification requested:', {
        userId,
        videoId,
        taskCompletionId
      });
      
      // Verify the like
      const result = await verifyTikTokLike(userId, videoId);
      
      // Update task completion if provided
      if (taskCompletionId && result.verified) {
        await updateTaskCompletion(taskCompletionId, result, 'api_poll');
      }
      
      res.json({
        success: result.verified,
        verified: result.verified,
        message: result.message,
        proof: result.proof,
        error: result.error
      });
    } catch (error) {
      console.error('[TikTok Verify] Like verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify TikTok like',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/tiktok/comment
   * Verify user commented on a TikTok video
   */
  app.post('/api/tasks/verify/tiktok/comment', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { videoId, taskCompletionId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      
      console.log('[TikTok Verify] Comment verification requested:', {
        userId,
        videoId,
        taskCompletionId
      });
      
      // Verify the comment
      const result = await verifyTikTokComment(userId, videoId);
      
      // Update task completion if provided
      if (taskCompletionId && result.verified) {
        await updateTaskCompletion(taskCompletionId, result, 'api_poll');
      }
      
      res.json({
        success: result.verified,
        verified: result.verified,
        message: result.message,
        proof: result.proof,
        error: result.error
      });
    } catch (error) {
      console.error('[TikTok Verify] Comment verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify TikTok comment',
        message: String(error)
      });
    }
  });
}

