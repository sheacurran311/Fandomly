import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerSocialRoutes } from "./social-routes";
import { registerTenantRoutes } from "./tenant-routes";
import { 
  insertUserSchema, insertCreatorSchema, insertLoyaltyProgramSchema, 
  insertRewardSchema, insertFanProgramSchema,
  insertCampaignSchema, insertCampaignRuleSchema
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

      // If user is a creator, auto-create their tenant
      if (userType === "creator") {
        try {
          const username = userData.username || "creator";
          const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${user.id.slice(-6)}`;
          
          const tenant = await storage.createTenant({
            slug: tenantSlug,
            name: `${username}'s Store`,
            ownerId: user.id,
            status: 'trial',
            subscriptionTier: 'starter',
            branding: {
              primaryColor: '#8B5CF6',
              secondaryColor: '#06B6D4', 
              accentColor: '#10B981'
            },
            businessInfo: {
              businessType: 'individual' as const
            },
            limits: {
              maxMembers: 100,
              maxCampaigns: 3,
              maxRewards: 10,
              maxApiCalls: 1000,
              storageLimit: 100,
              customDomain: false,
              advancedAnalytics: false,
              whiteLabel: false
            },
            settings: {
              timezone: 'UTC',
              currency: 'USD',
              language: 'en',
              nilCompliance: false,
              publicProfile: true,
              allowRegistration: true,
              requireEmailVerification: false,
              enableSocialLogin: true
            }
          });

          // Create initial tenant membership for the creator
          await storage.createTenantMembership({
            tenantId: tenant.id,
            userId: user.id,
            role: 'owner'
          });

          // Update user's current tenant
          await storage.updateUser(user.id, { currentTenantId: tenant.id });

          console.log("Created tenant for new creator:", tenant.id);
        } catch (error) {
          console.error("Failed to create tenant for creator:", error);
          // Continue even if tenant creation fails
        }
      }

      res.json(user);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  // Complete onboarding endpoint
  app.post("/api/auth/complete-onboarding", async (req, res) => {
    try {
      // Get user from session or auth header
      const dynamicUserId = req.session?.passport?.user?.claims?.sub;
      if (!dynamicUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUserByDynamicId(dynamicUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const {
        name,
        slug,
        businessType,
        description,
        sport,
        position,
        school,
        division,
        year,
        nilCompliant,
        primaryColor,
        secondaryColor,
        accentColor,
        instagram,
        twitter,
        tiktok,
        subscriptionTier
      } = req.body;

      // Update user onboarding state
      const updatedUser = await storage.updateUser(user.id, {
        onboardingState: {
          currentStep: "4",
          totalSteps: "4", 
          completedSteps: ["1", "2", "3", "4"],
          isCompleted: true
        }
      });

      // Update creator and tenant if user is a creator
      if (user.userType === 'creator') {
        // Get user's tenant
        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        
        if (tenant) {
          await storage.updateTenant(tenant.id, {
            name: name || tenant.name,
            slug: slug || tenant.slug,
            branding: {
              primaryColor: primaryColor || '#8B5CF6',
              secondaryColor: secondaryColor || '#06B6D4',
              accentColor: accentColor || '#10B981'
            },
            businessInfo: {
              businessType: businessType || 'individual',
              socialLinks: {
                instagram,
                twitter,
                tiktok
              }
            },
            settings: {
              ...tenant.settings,
              nilCompliance: nilCompliant || false
            }
          });
        }

        // Update or create creator profile
        let creator = await storage.getCreatorByUserId(user.id);
        if (creator) {
          await storage.updateCreator(creator.id, {
            displayName: name,
            bio: description,
            socialLinks: {
              instagram,
              twitter,
              tiktok
            }
          });
        }
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Onboarding completion error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  app.get("/api/auth/user/:dynamicUserId", async (req, res) => {
    try {
      console.log("Fetching user by Dynamic ID:", req.params.dynamicUserId);
      const user = await storage.getUserByDynamicId(req.params.dynamicUserId);
      if (!user) {
        console.log("User not found for Dynamic ID:", req.params.dynamicUserId);
        return res.status(404).json({ error: "User not found" });
      }
      console.log("Found user:", user.id, "type:", user.userType);
      
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

      // If switching to creator, create a tenant if they don't have one
      if (userType === "creator" && !updatedUser.currentTenantId) {
        try {
          const username = updatedUser.username || "creator";
          const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${updatedUser.id.slice(-6)}`;
          
          const tenant = await storage.createTenant({
            slug: tenantSlug,
            name: `${username}'s Store`,
            ownerId: updatedUser.id,
            status: 'trial',
            subscriptionTier: 'starter',
            branding: {
              primaryColor: '#8B5CF6',
              secondaryColor: '#06B6D4', 
              accentColor: '#10B981'
            },
            businessInfo: {
              businessType: 'individual' as const
            },
            limits: {
              maxMembers: 100,
              maxCampaigns: 3,
              maxRewards: 10,
              maxApiCalls: 1000,
              storageLimit: 100,
              customDomain: false,
              advancedAnalytics: false,
              whiteLabel: false
            },
            settings: {
              timezone: 'UTC',
              currency: 'USD',
              language: 'en',
              nilCompliance: false,
              publicProfile: true,
              allowRegistration: true,
              requireEmailVerification: false,
              enableSocialLogin: true
            }
          });

          // Create initial tenant membership for the creator
          await storage.createTenantMembership({
            tenantId: tenant.id,
            userId: updatedUser.id,
            role: 'owner'
          });

          // Update user's current tenant
          await storage.updateUser(updatedUser.id, { currentTenantId: tenant.id });

          console.log("Created tenant for user switching to creator:", tenant.id);
        } catch (error) {
          console.error("Failed to create tenant for user switching to creator:", error);
          // Continue even if tenant creation fails
        }
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
      // Optionally enrich with active campaign info
      const enriched = await Promise.all(creators.map(async (c) => {
        const activeCampaigns = await storage.getActiveCampaignsByCreator(c.id);
        return { ...c, hasActiveCampaign: activeCampaigns.length > 0 };
      }));
      res.json(enriched);
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

  // Campaign routes
  app.get("/api/campaigns/creator/:creatorId", async (req, res) => {
    try {
      const data = await storage.getCampaignsByCreator(req.params.creatorId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const payload = insertCampaignSchema.parse(req.body);
      const created = await storage.createCampaign(payload);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid campaign data" });
    }
  });

  app.get("/api/campaign-rules/:campaignId", async (req, res) => {
    try {
      const data = await storage.getCampaignRules(req.params.campaignId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign rules" });
    }
  });

  app.post("/api/campaign-rules", async (req, res) => {
    try {
      const payload = insertCampaignRuleSchema.parse(req.body);
      const created = await storage.createCampaignRule(payload);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid campaign rule data" });
    }
  });

  // Follow tenant (create membership) for a fan
  app.post("/api/tenants/:tenantId/follow", async (req, res) => {
    try {
      const { userId } = req.body;
      const { tenantId } = req.params;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const membership = await storage.createTenantMembership({ tenantId, userId, role: 'member' });
      res.json(membership);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to follow tenant" });
    }
  });

  // Update user profile data (fan onboarding info)
  app.post("/api/auth/profile", async (req, res) => {
    try {
      const { userId, profileData } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const updated = await storage.updateUser(userId, { profileData });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
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

  // Admin routes for user management
  app.get("/api/admin/users", authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      // In production, implement pagination and filtering
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:userId/role", authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { role, customerTier } = req.body;

      if (!['fandomly_admin', 'customer_admin', 'customer_end_user'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updateData: any = { role };
      if (role === 'customer_end_user' && customerTier) {
        updateData.customerTier = customerTier;
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Register social media routes
  registerSocialRoutes(app);

  // Register tenant routes
  registerTenantRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}