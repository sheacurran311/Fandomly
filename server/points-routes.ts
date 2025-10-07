/**
 * Points API Routes
 * 
 * Endpoints for managing Fandomly Points and Creator Points
 */

import type { Express } from "express";
import { pointsService } from "./points-service";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/rbac";

export function registerPointsRoutes(app: Express) {
  
  /**
   * GET /api/points/balance - Get user's complete points balance
   */
  app.get("/api/points/balance", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      const balance = await pointsService.getFullBalance(userId);
      
      res.json(balance);
    } catch (error: any) {
      console.error('Error fetching points balance:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/points/transactions - Get user's transaction history
   */
  app.get("/api/points/transactions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const transactions = await pointsService.getAllTransactions(userId, limit);
      
      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/points/fandomly - Get Fandomly Points balance
   */
  app.get("/api/points/fandomly", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      const balance = await pointsService.fandomly.getBalance(userId);
      
      res.json({ balance });
    } catch (error: any) {
      console.error('Error fetching Fandomly Points:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/points/creator/:creatorId - Get Creator Points balance
   */
  app.get("/api/points/creator/:creatorId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { creatorId } = req.params;
      const { tenantId } = req.query;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      
      const balance = await pointsService.creator.getBalance(
        userId,
        creatorId,
        tenantId as string
      );
      
      res.json({ balance });
    } catch (error: any) {
      console.error('Error fetching Creator Points:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ Points routes registered');
}

