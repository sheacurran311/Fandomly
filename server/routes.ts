import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertCreatorSchema, insertLoyaltyProgramSchema, 
  insertRewardSchema, insertFanProgramSchema, insertUserSocialProfileSchema,
  insertFanQuestSchema, insertQuestParticipationSchema
} from "@shared/schema";
import { authenticateUser, requireRole, requireCustomerTier, requireAdminPermission, AuthenticatedRequest } from "./middleware/rbac";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/user", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists by dynamic user ID
      if (userData.dynamicUserId) {
        const existingUser = await storage.getUserByDynamicId(userData.dynamicUserId);
        if (existingUser) {
          return res.json(existingUser);
        }
      }

      // Create new user
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.get("/api/auth/user/:dynamicUserId", async (req, res) => {
    try {
      const user = await storage.getUserByDynamicId(req.params.dynamicUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Role-based authentication route
  app.get("/api/auth/role", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  // Creator routes (require customer_admin role)
  app.post("/api/creators", authenticateUser, requireRole(['customer_admin', 'fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const creatorData = insertCreatorSchema.parse(req.body);
      const creator = await storage.createCreator(creatorData);
      res.json(creator);
    } catch (error) {
      console.error("Creator creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid creator data" });
    }
  });

  app.get("/api/creators", async (req, res) => {
    try {
      const creators = await storage.getAllCreators();
      res.json(creators);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creators" });
    }
  });

  app.get("/api/creators/:id", async (req, res) => {
    try {
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  app.get("/api/creators/user/:userId", async (req, res) => {
    try {
      const creator = await storage.getCreatorByUserId(req.params.userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // Loyalty program routes
  app.post("/api/loyalty-programs", async (req, res) => {
    try {
      const programData = insertLoyaltyProgramSchema.parse(req.body);
      const program = await storage.createLoyaltyProgram(programData);
      res.json(program);
    } catch (error) {
      console.error("Loyalty program creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid program data" });
    }
  });

  app.get("/api/loyalty-programs/creator/:creatorId", async (req, res) => {
    try {
      const programs = await storage.getLoyaltyProgramsByCreator(req.params.creatorId);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty programs" });
    }
  });

  app.get("/api/loyalty-programs/:id", async (req, res) => {
    try {
      const program = await storage.getLoyaltyProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ error: "Loyalty program not found" });
      }
      res.json(program);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty program" });
    }
  });

  // Rewards routes
  app.get("/api/rewards", async (req, res) => {
    try {
      const rewards = await storage.getAllRewards();
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.post("/api/rewards", async (req, res) => {
    try {
      const rewardData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(rewardData);
      res.json(reward);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid reward data" });
    }
  });

  app.get("/api/rewards/program/:programId", async (req, res) => {
    try {
      const rewards = await storage.getRewardsByProgram(req.params.programId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Fan program routes
  app.post("/api/fan-programs", async (req, res) => {
    try {
      const fanProgramData = insertFanProgramSchema.parse(req.body);
      
      // Check if fan is already enrolled
      const existing = await storage.getFanProgram(fanProgramData.fanId, fanProgramData.programId);
      if (existing) {
        return res.status(400).json({ error: "Fan already enrolled in this program" });
      }

      const fanProgram = await storage.createFanProgram(fanProgramData);
      res.json(fanProgram);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid fan program data" });
    }
  });

  app.get("/api/fan-programs/user/:fanId", async (req, res) => {
    try {
      const fanPrograms = await storage.getFanProgramsByUser(req.params.fanId);
      res.json(fanPrograms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fan programs" });
    }
  });

  // Point transaction routes
  app.get("/api/point-transactions/fan-program/:fanProgramId", async (req, res) => {
    try {
      const transactions = await storage.getPointTransactionsByFanProgram(req.params.fanProgramId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch point transactions" });
    }
  });

  // Reward redemption routes
  app.get("/api/reward-redemptions/user/:fanId", async (req, res) => {
    try {
      const redemptions = await storage.getRewardRedemptionsByUser(req.params.fanId);
      res.json(redemptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward redemptions" });
    }
  });

  // Social Profile routes
  app.post("/api/social-profiles", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const profileData = insertUserSocialProfileSchema.parse(req.body);
      const profile = await storage.createUserSocialProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Social profile creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid profile data" });
    }
  });

  app.get("/api/social-profiles/:userId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const profiles = await storage.getUserSocialProfiles(req.params.userId);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch social profiles" });
    }
  });

  // Fan Quest routes
  app.post("/api/fan-quests", authenticateUser, requireRole(['customer_admin', 'fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const questData = insertFanQuestSchema.parse(req.body);
      const quest = await storage.createFanQuest(questData);
      res.json(quest);
    } catch (error) {
      console.error("Quest creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid quest data" });
    }
  });

  app.get("/api/fan-quests", async (req, res) => {
    try {
      const quests = await storage.getFanQuests();
      
      // Enhance with creator data
      const enhancedQuests = await Promise.all(
        quests.map(async (quest) => {
          const creator = await storage.getCreator(quest.creatorId);
          return {
            ...quest,
            creator: creator ? {
              displayName: creator.displayName,
              category: creator.category,
              avatar: null,
            } : {
              displayName: "Unknown Creator",
              category: "creator",
              avatar: null,
            }
          };
        })
      );
      
      res.json(enhancedQuests);
    } catch (error) {
      console.error("Failed to fetch quests:", error);
      res.status(500).json({ error: "Failed to fetch quests" });
    }
  });

  // Quest Participation routes
  app.post("/api/fan-quests/:questId/join", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const questId = req.params.questId;
      const userId = req.user.id;

      // Check if already participating
      const existing = await storage.getUserQuestParticipation(userId, questId);
      if (existing) {
        return res.status(400).json({ error: "Already participating in this quest" });
      }

      // Check quest exists and is active
      const quest = await storage.getFanQuestById(questId);
      if (!quest || !quest.isActive) {
        return res.status(404).json({ error: "Quest not found or inactive" });
      }

      const participationData = {
        questId,
        userId,
        status: "started" as const,
      };

      const participation = await storage.createQuestParticipation(participationData);
      res.json(participation);
    } catch (error) {
      console.error("Quest join error:", error);
      res.status(500).json({ error: "Failed to join quest" });
    }
  });

  app.get("/api/my-quest-participations", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const participations = await storage.getQuestParticipationsByUser(req.user.id);
      res.json(participations);
    } catch (error) {
      console.error("Failed to fetch participations:", error);
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}