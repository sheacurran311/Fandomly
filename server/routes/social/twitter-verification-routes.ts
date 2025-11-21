/**
 * Twitter/X Verification API Routes
 * 
 * Provides endpoints for:
 * - Verifying task completion (follows, likes, retweets)
 * - Fetching user tweets
 * - Fetching specific tweet details
 * - Auto-completing tasks with API verification
 */

import { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { TwitterVerificationService } from '../../services/social/twitter-verification-service';
import { storage } from '../../core/storage';
import { RewardsService } from '../../services/rewards/rewards-service';

export function registerTwitterVerificationRoutes(app: Express) {
  
  /**
   * Verify if user completed a Twitter task
   * POST /api/twitter/verify-task
   */
  app.post('/api/twitter/verify-task', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { taskId, taskType, taskSettings } = req.body;

      if (!taskId || !taskType || !taskSettings) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Verify the task completion using Twitter API
      const result = await TwitterVerificationService.verifyTaskCompletion(
        userId,
        taskType,
        taskSettings
      );

      if (!result.verified) {
        return res.json({ 
          verified: false, 
          error: result.error || 'Task not completed yet',
          message: 'Please complete the task on Twitter and try again.'
        });
      }

      // Task verified! Now complete it and award rewards
      try {
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Check if already completed
        const existingCompletion = await storage.getTaskCompletion(userId, taskId);
        if (existingCompletion) {
          return res.json({
            verified: true,
            alreadyCompleted: true,
            message: 'Task already completed!',
            completion: existingCompletion
          });
        }

        // Create task completion
        const completion = await storage.createTaskCompletion({
          userId,
          taskId,
          tenantId: task.tenantId,
          status: 'approved', // Auto-approve API-verified tasks
          verificationData: {
            method: 'api',
            timestamp: new Date().toISOString(),
            ...result.data
          }
        });

        // Award rewards
        const rewardResult = await RewardsService.processTaskCompletion(
          userId,
          task,
          completion
        );

        return res.json({
          verified: true,
          message: 'Task completed successfully!',
          completion,
          rewards: rewardResult
        });
      } catch (error) {
        console.error('[Twitter Verify] Error completing task:', error);
        return res.status(500).json({ 
          error: 'Task verified but failed to award rewards',
          verified: true
        });
      }
    } catch (error) {
      console.error('[Twitter Verify] Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  /**
   * Verify follow
   * POST /api/twitter/verify/follow
   */
  app.post('/api/twitter/verify/follow', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { creatorHandle } = req.body;

      if (!creatorHandle) {
        return res.status(400).json({ error: 'Creator handle required' });
      }

      const result = await TwitterVerificationService.verifyFollow(userId, creatorHandle);
      res.json(result);
    } catch (error) {
      console.error('[Twitter] Follow verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  /**
   * Verify like
   * POST /api/twitter/verify/like
   */
  app.post('/api/twitter/verify/like', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { tweetUrl } = req.body;

      if (!tweetUrl) {
        return res.status(400).json({ error: 'Tweet URL required' });
      }

      const tweetId = TwitterVerificationService.extractTweetId(tweetUrl);
      if (!tweetId) {
        return res.status(400).json({ error: 'Invalid tweet URL' });
      }

      const result = await TwitterVerificationService.verifyLike(userId, tweetId);
      res.json(result);
    } catch (error) {
      console.error('[Twitter] Like verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  /**
   * Verify retweet
   * POST /api/twitter/verify/retweet
   */
  app.post('/api/twitter/verify/retweet', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { tweetUrl } = req.body;

      if (!tweetUrl) {
        return res.status(400).json({ error: 'Tweet URL required' });
      }

      const tweetId = TwitterVerificationService.extractTweetId(tweetUrl);
      if (!tweetId) {
        return res.status(400).json({ error: 'Invalid tweet URL' });
      }

      const result = await TwitterVerificationService.verifyRetweet(userId, tweetId);
      res.json(result);
    } catch (error) {
      console.error('[Twitter] Retweet verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  /**
   * Get user's recent tweets
   * GET /api/twitter/tweets/:userId
   */
  app.get('/api/twitter/tweets/:userId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const maxResults = parseInt(req.query.limit as string) || 5;

      const tweets = await TwitterVerificationService.getUserTweets(userId, maxResults);
      res.json({ tweets });
    } catch (error) {
      console.error('[Twitter] Error fetching tweets:', error);
      res.status(500).json({ error: 'Failed to fetch tweets' });
    }
  });

  /**
   * Get creator's recent tweets by creator URL
   * GET /api/twitter/creator-tweets/:creatorUrl
   */
  app.get('/api/twitter/creator-tweets/:creatorUrl', async (req, res) => {
    try {
      const { creatorUrl } = req.params;
      const maxResults = parseInt(req.query.limit as string) || 5;

      // Get creator by URL
      const creator = await storage.getCreatorByUrl(creatorUrl);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      const tweets = await TwitterVerificationService.getUserTweets(creator.userId, maxResults);
      res.json({ tweets });
    } catch (error) {
      console.error('[Twitter] Error fetching creator tweets:', error);
      res.status(500).json({ error: 'Failed to fetch tweets' });
    }
  });

  /**
   * Get tweet details by ID
   * GET /api/twitter/tweet/:tweetId
   */
  app.get('/api/twitter/tweet/:tweetId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { tweetId } = req.params;

      const tweet = await TwitterVerificationService.getTweetById(userId, tweetId);
      if (!tweet) {
        return res.status(404).json({ error: 'Tweet not found' });
      }

      res.json({ tweet });
    } catch (error) {
      console.error('[Twitter] Error fetching tweet:', error);
      res.status(500).json({ error: 'Failed to fetch tweet' });
    }
  });

  /**
   * Extract tweet ID from URL
   * POST /api/twitter/extract-tweet-id
   */
  app.post('/api/twitter/extract-tweet-id', (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL required' });
      }

      const tweetId = TwitterVerificationService.extractTweetId(url);
      if (!tweetId) {
        return res.status(400).json({ error: 'Invalid tweet URL' });
      }

      res.json({ tweetId });
    } catch (error) {
      console.error('[Twitter] Error extracting tweet ID:', error);
      res.status(500).json({ error: 'Failed to extract tweet ID' });
    }
  });

  console.log('[Twitter Verification] Routes registered');
}

