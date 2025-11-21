import type { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import {
  verifyTwitterFollow,
  verifyTwitterLike,
  verifyTwitterRetweet,
  updateTaskCompletion
} from '../../services/social-verification-service';

/**
 * Twitter/X Task Verification Routes
 * Handles verification of Twitter tasks: follows, likes, retweets
 * Note: Free tier API has limited capabilities
 */

export function registerTwitterTaskRoutes(app: Express) {
  
  /**
   * POST /api/tasks/verify/twitter/follow
   * Verify user follows a creator on Twitter/X
   */
  app.post('/api/tasks/verify/twitter/follow', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { creatorTwitterId, taskCompletionId } = req.body;
      
      if (!creatorTwitterId) {
        return res.status(400).json({ error: 'creatorTwitterId is required' });
      }
      
      console.log('[Twitter Verify] Follow verification requested:', {
        userId,
        creatorTwitterId,
        taskCompletionId
      });
      
      // Verify the follow
      const result = await verifyTwitterFollow(userId, creatorTwitterId);
      
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
      console.error('[Twitter Verify] Follow verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Twitter follow',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/twitter/like
   * Verify user liked a specific tweet
   */
  app.post('/api/tasks/verify/twitter/like', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { tweetId, taskCompletionId } = req.body;
      
      if (!tweetId) {
        return res.status(400).json({ error: 'tweetId is required' });
      }
      
      console.log('[Twitter Verify] Like verification requested:', {
        userId,
        tweetId,
        taskCompletionId
      });
      
      // Verify the like
      const result = await verifyTwitterLike(userId, tweetId);
      
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
      console.error('[Twitter Verify] Like verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Twitter like',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/twitter/retweet
   * Verify user retweeted a specific tweet
   * Note: May not be available on free tier
   */
  app.post('/api/tasks/verify/twitter/retweet', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { tweetId, taskCompletionId } = req.body;
      
      if (!tweetId) {
        return res.status(400).json({ error: 'tweetId is required' });
      }
      
      console.log('[Twitter Verify] Retweet verification requested:', {
        userId,
        tweetId,
        taskCompletionId
      });
      
      // Verify the retweet
      const result = await verifyTwitterRetweet(userId, tweetId);
      
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
      console.error('[Twitter Verify] Retweet verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Twitter retweet',
        message: String(error)
      });
    }
  });
}

