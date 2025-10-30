import { Express } from "express";
import { platformPointsService } from "./platform-points-service";
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from "./middleware/rbac";
import { z } from "zod";

const awardPointsSchema = z.object({
  userId: z.string(),
  points: z.number().int().positive(),
  source: z.string(),
  metadata: z.record(z.any()).optional(),
});

export function registerPlatformPointsRoutes(app: Express) {
  /**
   * GET /api/platform-points/balance
   * Get current user's Fandomly Points balance
   */
  app.get("/api/platform-points/balance", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const balance = await platformPointsService.getBalance(userId);
      
      res.json({
        balance,
        userId,
      });
    } catch (error) {
      console.error("Error fetching platform points balance:", error);
      res.status(500).json({ error: "Failed to fetch platform points balance" });
    }
  });

  /**
   * GET /api/platform-points/transactions
   * Get current user's platform points transaction history
   */
  app.get("/api/platform-points/transactions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const transactions = await platformPointsService.getTransactionHistory(userId, limit);
      
      res.json({
        transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error("Error fetching platform points transactions:", error);
      res.status(500).json({ error: "Failed to fetch platform points transactions" });
    }
  });

  /**
   * POST /api/platform-points/award
   * Award platform points to a user (admin only)
   */
  app.post("/api/platform-points/award", authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = awardPointsSchema.parse(req.body);
      
      const result = await platformPointsService.awardPoints(
        validatedData.userId,
        validatedData.points,
        validatedData.source,
        validatedData.metadata
      );
      
      res.json({
        success: result.success,
        newBalance: result.newBalance,
        pointsAwarded: validatedData.points,
      });
    } catch (error) {
      console.error("Error awarding platform points:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to award platform points" });
    }
  });

  /**
   * GET /api/platform-points/leaderboard
   * Get platform points leaderboard (top users)
   */
  app.get("/api/platform-points/leaderboard", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await platformPointsService.getLeaderboard(limit);
      
      res.json({
        leaderboard,
        count: leaderboard.length,
      });
    } catch (error) {
      console.error("Error fetching platform points leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch platform points leaderboard" });
    }
  });
}

