import type { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import {
  verifyYouTubeSubscription,
  verifyYouTubeLike,
  verifyYouTubeComment,
  updateTaskCompletion
} from '../../services/social-verification-service';

/**
 * YouTube Task Verification Routes
 * Handles verification of YouTube tasks: subscriptions, likes, comments
 */

export function registerYouTubeTaskRoutes(app: Express) {
  
  /**
   * POST /api/tasks/verify/youtube/subscribe
   * Verify user subscribed to a YouTube channel
   */
  app.post('/api/tasks/verify/youtube/subscribe', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { channelId, taskCompletionId } = req.body;
      
      if (!channelId) {
        return res.status(400).json({ error: 'channelId is required' });
      }
      
      console.log('[YouTube Verify] Subscription verification requested:', {
        userId,
        channelId,
        taskCompletionId
      });
      
      // Verify the subscription
      const result = await verifyYouTubeSubscription(userId, channelId);
      
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
      console.error('[YouTube Verify] Subscription verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify YouTube subscription',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/youtube/like
   * Verify user liked a YouTube video
   */
  app.post('/api/tasks/verify/youtube/like', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { videoId, taskCompletionId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      
      console.log('[YouTube Verify] Like verification requested:', {
        userId,
        videoId,
        taskCompletionId
      });
      
      // Verify the like
      const result = await verifyYouTubeLike(userId, videoId);
      
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
      console.error('[YouTube Verify] Like verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify YouTube like',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/youtube/comment
   * Verify user commented on a YouTube video
   */
  app.post('/api/tasks/verify/youtube/comment', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { videoId, taskCompletionId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      
      console.log('[YouTube Verify] Comment verification requested:', {
        userId,
        videoId,
        taskCompletionId
      });
      
      // Verify the comment
      const result = await verifyYouTubeComment(userId, videoId);
      
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
      console.error('[YouTube Verify] Comment verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify YouTube comment',
        message: String(error)
      });
    }
  });
}

