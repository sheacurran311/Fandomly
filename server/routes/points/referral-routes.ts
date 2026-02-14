/**
 * Fandomly Referral API Routes
 * 
 * Endpoints for all three referral tiers:
 * 1. Creator → Creator
 * 2. Fan → Fan  
 * 3. Creator Task/Campaign Referrals
 */

import type { Express } from "express";
import { 
  creatorReferralService, 
  fanReferralService, 
  creatorTaskReferralService 
} from '../../services/rewards/referral-service';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { db } from '../../db';
import { creators, users, creatorReferrals, fanReferrals, creatorTaskReferrals } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerReferralRoutes(app: Express) {
  
  // Test route to verify referral routes are registered
  app.get("/api/referrals/test", (req, res) => {
    res.json({ message: "Referral routes are working!", timestamp: new Date().toISOString() });
  });
  
  // ============================================================================
  // CREATOR → CREATOR REFERRALS
  // ============================================================================
  
  /**
   * GET /api/referrals/creator - Get creator's referral data
   */
  app.get("/api/referrals/creator", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      console.log('🔍 Fetching creator referral for userId:', userId);
      
      if (!userId) {
        return res.status(400).json({ error: "User ID not found" });
      }
      
      // Get creator profile
      const creator = await db.query.creators.findFirst({
        where: eq(creators.userId, userId)
      });
      
      console.log('📊 Creator profile found:', !!creator);
      
      if (!creator) {
        return res.status(404).json({ 
          error: "Creator profile not found",
          message: "Please complete your creator profile setup first"
        });
      }
      
      // Get or create referral
      const referral = await creatorReferralService.getOrCreateCreatorReferral(creator.id);
      
      // Get stats
      const stats = await creatorReferralService.getCreatorReferralStats(creator.id);
      
      console.log('✅ Creator referral data retrieved successfully');
      
      res.json({
        referral,
        stats
      });
    } catch (error: any) {
      console.error('❌ Error fetching creator referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/creator/track-click - Track referral click
   */
  app.post("/api/referrals/creator/track-click", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Referral code required" });
      }
      
      await creatorReferralService.trackClick(code);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error tracking creator referral click:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/creator/complete - Complete referral (called during creator signup)
   */
  app.post("/api/referrals/creator/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, newCreatorId } = req.body;
      
      if (!code || !newCreatorId) {
        return res.status(400).json({ error: "Code and creator ID required" });
      }
      
      await creatorReferralService.completeReferral(code, newCreatorId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error completing creator referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // FAN → FAN REFERRALS
  // ============================================================================
  
  /**
   * GET /api/referrals/fan - Get fan's referral data
   */
  app.get("/api/referrals/fan", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      console.log('🔍 Fetching fan referral for userId:', userId);
      
      if (!userId) {
        return res.status(400).json({ error: "User ID not found" });
      }
      
      // Get or create referral
      const referral = await fanReferralService.getOrCreateFanReferral(userId);
      
      // Get stats
      const stats = await fanReferralService.getFanReferralStats(userId);
      
      console.log('✅ Fan referral data retrieved successfully');
      
      res.json({
        referral,
        stats
      });
    } catch (error: any) {
      console.error('❌ Error fetching fan referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/fan/track-click - Track fan referral click
   */
  app.post("/api/referrals/fan/track-click", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Referral code required" });
      }
      
      await fanReferralService.trackClick(code);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error tracking fan referral click:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/fan/complete - Complete fan referral (called during fan signup)
   */
  app.post("/api/referrals/fan/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, newFanId } = req.body;
      
      if (!code || !newFanId) {
        return res.status(400).json({ error: "Code and fan ID required" });
      }
      
      await fanReferralService.completeReferral(code, newFanId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error completing fan referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/fan/milestone - Award milestone points
   */
  app.post("/api/referrals/fan/milestone", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { referralId, milestone, points, reason } = req.body;
      
      if (!referralId || !milestone || !points) {
        return res.status(400).json({ error: "Referral ID, milestone, and points required" });
      }
      
      await fanReferralService.awardReferralPoints(
        referralId,
        milestone,
        points,
        reason || `${milestone} completed`
      );
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error awarding fan referral milestone:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // CREATOR TASK/CAMPAIGN REFERRALS
  // ============================================================================
  
  /**
   * POST /api/referrals/task - Create task referral link
   */
  app.post("/api/referrals/task", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { taskId, creatorId } = req.body;
      
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      if (!taskId || !creatorId) {
        return res.status(400).json({ error: "Task ID and creator ID required" });
      }
      
      const referral = await creatorTaskReferralService.createTaskReferral(
        taskId,
        userId,
        creatorId
      );
      
      res.json(referral);
    } catch (error: any) {
      console.error('Error creating task referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/campaign - Create campaign referral link
   */
  app.post("/api/referrals/campaign", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { campaignId, creatorId } = req.body;
      
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      if (!campaignId || !creatorId) {
        return res.status(400).json({ error: "Campaign ID and creator ID required" });
      }
      
      const referral = await creatorTaskReferralService.createCampaignReferral(
        campaignId,
        userId,
        creatorId
      );
      
      res.json(referral);
    } catch (error: any) {
      console.error('Error creating campaign referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/task/track-click - Track task/campaign referral click
   */
  app.post("/api/referrals/task/track-click", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Referral code required" });
      }
      
      await creatorTaskReferralService.trackClick(code);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error tracking task referral click:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referrals/task/complete - Complete task/campaign referral
   */
  app.post("/api/referrals/task/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, newFanId } = req.body;
      
      if (!code || !newFanId) {
        return res.status(400).json({ error: "Code and fan ID required" });
      }
      
      await creatorTaskReferralService.completeReferral(code, newFanId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error completing task referral:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/referrals/task/stats - Get task referral stats for a fan
   */
  app.get("/api/referrals/task/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const creatorId = req.query.creatorId as string | undefined;
      
      const stats = await creatorTaskReferralService.getFanTaskReferralStats(
        userId,
        creatorId
      );
      
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching task referral stats:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/referrals/task/leaderboard/:creatorId - Get referral leaderboard for a creator
   */
  app.get("/api/referrals/task/leaderboard/:creatorId", async (req, res) => {
    try {
      const { creatorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const leaderboard = await creatorTaskReferralService.getCreatorReferralLeaderboard(
        creatorId,
        limit
      );
      
      res.json(leaderboard);
    } catch (error: any) {
      console.error('Error fetching referral leaderboard:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // UTILITY ROUTES
  // ============================================================================
  
  /**
   * GET /api/referrals/validate/:code - Validate any referral code
   */
  app.get("/api/referrals/validate/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      // Check which type of referral this is
      const creatorRef = await db.query.creatorReferrals.findFirst({
        where: eq(creatorReferrals.referralCode, code)
      });
      
      if (creatorRef) {
        return res.json({
          valid: true,
          type: 'creator',
          referralId: creatorRef.id
        });
      }
      
      const fanRef = await db.query.fanReferrals.findFirst({
        where: eq(fanReferrals.referralCode, code)
      });
      
      if (fanRef) {
        return res.json({
          valid: true,
          type: 'fan',
          referralId: fanRef.id
        });
      }
      
      const taskRef = await db.query.creatorTaskReferrals.findFirst({
        where: eq(creatorTaskReferrals.referralCode, code)
      });
      
      if (taskRef) {
        return res.json({
          valid: true,
          type: 'task',
          referralId: taskRef.id,
          taskId: taskRef.taskId,
          campaignId: taskRef.campaignId
        });
      }
      
      res.status(404).json({ 
        valid: false,
        error: 'Invalid referral code'
      });
    } catch (error: any) {
      console.error('Error validating referral code:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ Referral routes registered');
}

