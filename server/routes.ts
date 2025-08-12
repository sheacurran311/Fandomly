import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerSocialRoutes } from "./social-routes";
import { registerTenantRoutes } from "./tenant-routes";
import { 
  insertUserSchema, insertCreatorSchema, insertLoyaltyProgramSchema, 
  insertRewardSchema, insertFanProgramSchema
} from "@shared/schema";
import { authenticateUser, requireRole, requireCustomerTier, requireAdminPermission, AuthenticatedRequest } from "./middleware/rbac";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dynamic auth middleware to verify JWT and extract user info
  const verifyDynamicAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // For now, we'll skip JWT verification and trust the client
      // In production, you'd verify the JWT token here  
      req.dynamicUser = req.body.dynamicUser || req.headers['x-dynamic-user'];
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid authentication token" });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { dynamicUser, userType } = req.body;
      
      if (!dynamicUser) {
        // Fallback to old format for existing calls
        const userData = insertUserSchema.parse(req.body);
        console.log("Registering user with data (legacy):", userData);
        
        if (userData.dynamicUserId) {
          const existingUser = await storage.getUserByDynamicId(userData.dynamicUserId as string);
          if (existingUser) {
            console.log("Returning existing user:", existingUser.id);
            return res.json(existingUser);
          }
        }

        const user = await storage.createUser(userData);
        console.log("Created new user:", user.id);
        return res.json(user);
      }

      // New Dynamic-based registration
      console.log("Registering user with Dynamic auth:", dynamicUser);
      
      const userData = {
        dynamicUserId: dynamicUser.userId || dynamicUser.id,
        email: dynamicUser.email,
        username: dynamicUser.alias || dynamicUser.firstName || "User",
        avatar: dynamicUser.avatar || null,
        walletAddress: dynamicUser.verifiedCredentials?.[0]?.address || "",
        walletChain: dynamicUser.verifiedCredentials?.[0]?.chain || "",
        userType: userType === "creator" ? "creator" : "fan",
        role: (userType === "creator" ? "customer_admin" : "customer_end_user") as "customer_admin" | "customer_end_user",
      };

      // Check if user already exists
      const existingUser = await storage.getUserByDynamicId(userData.dynamicUserId);
      if (existingUser) {
        console.log("Returning existing user:", existingUser.id);
        return res.json(existingUser);
      }

      const user = await storage.createUser(userData);
      console.log("Created new user:", user.id);
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
      
      // Check if creator has tenant
      let creator = null;
      let tenant = null;
      if (user.userType === 'creator') {
        creator = await storage.getCreatorByUserId(user.id);
        if (creator) {
          tenant = await storage.getTenant(creator.tenantId);
        }
      }
      
      const onboardingState = user.onboardingState || {
        currentStep: 0,
        totalSteps: user.userType === 'creator' ? 5 : 3,
        completedSteps: [],
        isCompleted: false
      };
      
      res.json({
        ...user,
        creator,
        tenant,
        onboardingState,
        hasCompletedOnboarding: onboardingState.isCompleted || (user.userType === 'creator' && !!creator && !!tenant)
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User type switching route
  app.post("/api/auth/switch-user-type", async (req, res) => {
    try {
      const { userId, userType } = req.body;
      
      if (!userId || !userType || !['fan', 'creator'].includes(userType)) {
        return res.status(400).json({ error: "Invalid user type or user ID" });
      }
      
      const updatedUser = await storage.updateUserType(userId, userType);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        ...updatedUser,
        message: `Successfully switched to ${userType} account`
      });
    } catch (error) {
      console.error("Error switching user type:", error);
      res.status(500).json({ error: "Failed to switch user type" });
    }
  });

  // Onboarding state management
  app.post("/api/auth/update-onboarding", async (req, res) => {
    try {
      const { userId, onboardingState } = req.body;
      
      if (!userId || !onboardingState) {
        return res.status(400).json({ error: "User ID and onboarding state required" });
      }
      
      const updatedUser = await storage.updateOnboardingState(userId, onboardingState);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating onboarding state:", error);
      res.status(500).json({ error: "Failed to update onboarding state" });
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

  // Profile route to check if user has completed onboarding
  app.get("/api/auth/profile", async (req, res) => {
    try {
      // For now, return a simple response to avoid auth complexity
      // This will be enhanced when we implement proper Dynamic auth middleware
      res.json({
        user: null,
        creator: null,
        hasCompletedOnboarding: false
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Switch user type endpoint
  app.patch("/api/auth/user/:userId/switch-type", async (req, res) => {
    try {
      const { userId } = req.params;
      const { newUserType } = req.body;
      
      if (!["fan", "creator"].includes(newUserType)) {
        return res.status(400).json({ error: "Invalid user type" });
      }

      const newRole = newUserType === "creator" ? "customer_admin" : "customer_end_user";
      
      // Update user type and role
      const updatedUser = await storage.updateUser(userId, {
        userType: newUserType,
        role: newRole,
        hasCompletedOnboarding: false // Reset onboarding when switching
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to switch user type:", error);
      res.status(500).json({ error: "Failed to switch user type" });
    }
  });

  // Creator routes (public creation for onboarding)
  app.post("/api/creators", async (req, res) => {
    try {
      console.log("Creating creator with data:", req.body);
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



  // Register social media routes
  registerSocialRoutes(app);

  // Register tenant routes
  registerTenantRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}