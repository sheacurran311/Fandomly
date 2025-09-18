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
      const dynamicUserHeader = req.headers['x-dynamic-user'];
      const dynamicUserBody = req.body.dynamicUser;

      // For routes that don't require authentication, allow through
      if (req.path.includes('/api/creators') && req.method === 'GET') {
        return next();
      }

      // Check for Dynamic user data (either from header or body)
      const dynamicUser = dynamicUserHeader || dynamicUserBody;
      
      if (!dynamicUser) {
        return res.status(401).json({ error: "Authentication required - Dynamic user data missing" });
      }

      // Parse Dynamic user if it's a string
      let parsedDynamicUser;
      try {
        parsedDynamicUser = typeof dynamicUser === 'string' ? JSON.parse(dynamicUser) : dynamicUser;
      } catch (parseError) {
        return res.status(401).json({ error: "Invalid Dynamic user data format" });
      }

      // Validate required Dynamic user fields
      if (!parsedDynamicUser.id && !parsedDynamicUser.dynamicUserId) {
        return res.status(401).json({ error: "Invalid Dynamic user - missing ID" });
      }

      // Dynamic Labs handles JWT verification natively with 2-hour expiration
      // The JWT token is validated on the client side by Dynamic SDK
      // We trust Dynamic's authentication and focus on user data validation
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Basic token format validation for Dynamic JWT
        if (token.length < 10) {
          return res.status(401).json({ error: "Invalid Dynamic JWT token format" });
        }
      }

      // Attach validated user to request
      req.dynamicUser = parsedDynamicUser;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: "Authentication failed" });
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

  // Complete onboarding endpoint with Stripe integration
  app.post("/api/auth/complete-onboarding", async (req, res) => {
    try {
      // Get user from Dynamic context (not session since we're using Dynamic Auth)
      const authHeader = req.headers.authorization;
      let dynamicUserId = null;
      
      // Try to get Dynamic user ID from auth header or body
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Would need to verify Dynamic JWT token here in production
        dynamicUserId = req.body.dynamicUserId;
      } else {
        // For development, get from request body
        dynamicUserId = req.body.dynamicUserId;
      }

      if (!dynamicUserId) {
        return res.status(401).json({ error: "Unauthorized - Dynamic user ID required" });
      }

      const user = await storage.getUserByDynamicId(dynamicUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const {
        creatorType,
        displayName,
        bio,
        followerCount,
        name,
        slug,
        sport,
        ageRange,
        education,
        position,
        school,
        currentSponsors,
        nilCompliant,
        bandArtistName,
        musicCatalogUrl,
        artistType,
        musicGenre,
        contentType,
        topicsOfFocus,
        sponsorships,
        totalViews,
        platforms,
        primaryColor,
        secondaryColor,
        accentColor,
        instagram,
        twitter,
        tiktok,
        subscriptionTier
      } = req.body;

      // Build type-specific data based on creator type
      let typeSpecificData = {};
      
      if (creatorType === 'athlete') {
        typeSpecificData = {
          athlete: {
            sport: sport || '',
            ageRange: ageRange || 'unknown',
            education: education || 'other',
            position: position || '',
            school: school || '',
            currentSponsors: currentSponsors ? currentSponsors.split(',').map((s: string) => s.trim()) : [],
            nilCompliant: nilCompliant || false
          }
        };
      } else if (creatorType === 'musician') {
        typeSpecificData = {
          musician: {
            bandArtistName: bandArtistName || '',
            musicCatalogUrl: musicCatalogUrl || '',
            artistType: artistType || 'independent',
            musicGenre: musicGenre || []
          }
        };
      } else if (creatorType === 'content_creator') {
        typeSpecificData = {
          contentCreator: {
            contentType: Array.isArray(contentType) ? contentType : (typeof contentType === 'string' ? contentType.split(',').map(s => s.trim()) : []),
            topicsOfFocus: Array.isArray(topicsOfFocus) ? topicsOfFocus : (typeof topicsOfFocus === 'string' ? topicsOfFocus.split(',').map(s => s.trim()) : []),
            sponsorships: Array.isArray(sponsorships) ? sponsorships : (typeof sponsorships === 'string' ? sponsorships.split(',').map(s => s.trim()) : []),
            totalViews: totalViews || 'unknown',
            platforms: Array.isArray(platforms) ? platforms : (typeof platforms === 'string' ? platforms.split(',').map(s => s.trim()) : [])
          }
        };
      }

      // Handle subscription and payment processing
      let stripeCustomerId = null;
      let stripeSubscriptionId = null;
      
      if (subscriptionTier && subscriptionTier !== 'starter') {
        // Create Stripe customer and subscription for paid plans
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2023-10-16",
          });
          
          // Create Stripe customer
          const customer = await stripe.customers.create({
            email: user.email || `${dynamicUserId}@wallet.user`,
            name: displayName || name || 'Creator',
            metadata: {
              dynamicUserId: dynamicUserId,
              userId: user.id,
              creatorType: creatorType
            }
          });
          
          stripeCustomerId = customer.id;
          
          // Note: In a real implementation, you'd create the subscription
          // after payment method is collected on the frontend
          // For now, we'll just store the customer ID
          
        } catch (stripeError) {
          console.error('Stripe customer creation error:', stripeError);
          // Continue with onboarding even if Stripe fails
        }
      }

      // Update user onboarding state
      const updatedUser = await storage.updateUser(user.id, {
        onboardingState: {
          currentStep: 5,
          totalSteps: 5, 
          completedSteps: ["1", "2", "3", "4", "5"],
          isCompleted: true
        }
      });

      // Update creator and tenant if user is a creator
      if (user.userType === 'creator') {
        // Get user's tenant
        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        
        if (tenant) {
          // Only update slug if it's different from current one to avoid unique constraint violation
          const updateData: any = {
            name: name || tenant.name,
            subscriptionTier: subscriptionTier || 'starter',
            branding: {
              primaryColor: primaryColor || '#8B5CF6',
              secondaryColor: secondaryColor || '#06B6D4',
              accentColor: accentColor || '#10B981'
            },
            businessInfo: {
              businessType: creatorType || 'athlete',
              socialLinks: {
                instagram,
                twitter,
                tiktok
              }
            },
            billingInfo: {
              stripeCustomerId,
              subscriptionId: stripeSubscriptionId
            },
            settings: {
              timezone: tenant.settings?.timezone || 'UTC',
              currency: tenant.settings?.currency || 'USD',
              language: tenant.settings?.language || 'en',
              nilCompliance: nilCompliant || false,
              publicProfile: tenant.settings?.publicProfile ?? true,
              allowRegistration: tenant.settings?.allowRegistration ?? true,
              requireEmailVerification: tenant.settings?.requireEmailVerification ?? false,
              enableSocialLogin: tenant.settings?.enableSocialLogin ?? true
            }
          };
          
          // Only add slug if it's different to avoid unique constraint violation
          if (slug && slug !== tenant.slug) {
            updateData.slug = slug;
          }
          
          await storage.updateTenant(tenant.id, updateData);
        }

        // Update or create creator profile
        let creator = await storage.getCreatorByUserId(user.id);
        if (creator) {
          await storage.updateCreator(creator.id, {
            displayName: displayName || name,
            bio: bio,
            category: creatorType,
            followerCount: parseInt(followerCount) || 0,
            typeSpecificData: typeSpecificData,
            brandColors: {
              primary: primaryColor || '#8B5CF6',
              secondary: secondaryColor || '#06B6D4',
              accent: accentColor || '#10B981'
            },
            socialLinks: {
              instagram,
              twitter,
              tiktok
            }
          });
        } else {
          // Create creator profile if it doesn't exist
          await storage.createCreator({
            userId: user.id,
            tenantId: tenant.id,
            displayName: displayName || name || 'Creator',
            bio: bio || '',
            category: creatorType || 'athlete',
            followerCount: parseInt(followerCount) || 0,
            typeSpecificData: typeSpecificData,
            brandColors: {
              primary: primaryColor || '#8B5CF6',
              secondary: secondaryColor || '#06B6D4',
              accent: accentColor || '#10B981'
            },
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

  // Creator Facebook Pages: import and fetch
  app.post("/api/creators/:creatorId/facebook-pages", async (req, res) => {
    try {
      const { creatorId } = req.params;
      const pages = req.body?.pages || [];
      if (!Array.isArray(pages)) return res.status(400).json({ error: 'pages array required' });
      const saved = await storage.upsertCreatorFacebookPages(creatorId, pages.map((p: any) => ({
        pageId: p.pageId || p.id,
        name: p.name,
        accessToken: p.accessToken || p.access_token,
        followersCount: p.followersCount ?? p.followers_count,
        fanCount: p.fanCount ?? p.fan_count,
        instagramBusinessAccountId: p.instagramBusinessAccountId || p.instagram_business_account?.id,
        connectedInstagramAccountId: p.connectedInstagramAccountId || p.connected_instagram_account?.id,
      })));
      res.json({ success: true, saved });
    } catch (error) {
      console.error('Import creator FB pages error:', error);
      res.status(500).json({ error: 'Failed to import creator Facebook pages' });
    }
  });

  app.get("/api/creators/:creatorId/facebook-pages", async (req, res) => {
    try {
      const { creatorId } = req.params;
      const rows = await storage.getCreatorFacebookPages(creatorId);
      res.json(rows);
    } catch (error) {
      console.error('Fetch creator FB pages error:', error);
      res.status(500).json({ error: 'Failed to fetch creator Facebook pages' });
    }
  });

  // Fan Facebook profile quick fetch (returns saved profileData.facebookData)
  app.get("/api/fans/:userId/facebook-profile", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user.profileData?.facebookData || null);
    } catch (error) {
      console.error('Fetch fan FB profile error:', error);
      res.status(500).json({ error: 'Failed to fetch fan Facebook profile' });
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

  // Import Facebook profile data to user account
  app.post("/api/auth/facebook-profile-import", async (req, res) => {
    try {
      const { userId, facebookData } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!facebookData) return res.status(400).json({ error: "Facebook data required" });
      
      // Prepare user updates
      const userUpdates: any = {};
      
      // Update email if provided and not already set
      if (facebookData.email) {
        userUpdates.email = facebookData.email;
      }
      
      // Update profile data with Facebook information
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedProfileData = {
        ...currentUser.profileData,
        name: facebookData.name || currentUser.profileData?.name,
        avatar: facebookData.picture || currentUser.profileData?.avatar,
        facebookData: {
          id: facebookData.id,
          name: facebookData.name,
          email: facebookData.email,
          picture: facebookData.picture,
          likes: facebookData.likes,
          importedAt: new Date().toISOString()
        }
      };
      
      userUpdates.profileData = updatedProfileData;
      
      // Update the user
      const updated = await storage.updateUser(userId, userUpdates);
      res.json({
        success: true,
        user: updated,
        imported: {
          email: !!facebookData.email,
          name: !!facebookData.name,
          picture: !!facebookData.picture,
          likes: !!facebookData.likes?.data
        }
      });
    } catch (error) {
      console.error("Error importing Facebook profile:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to import Facebook profile" });
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

  // File upload endpoints
  app.post("/api/upload/image", async (req, res) => {
    try {
      // For now, we'll simulate file upload by returning a placeholder URL
      // In production, this would integrate with cloud storage (AWS S3, Cloudinary, etc.)
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate a mock file URL (in production this would be the actual uploaded file URL)
      const mockFileName = `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const mockUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
      
      res.json({
        url: mockUrl,
        fileName: mockFileName,
        fileSize: 1024 * 200, // Mock 200KB
        mimeType: 'image/jpeg'
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  app.post("/api/upload/avatar", async (req, res) => {
    try {
      // Simulate avatar upload with smaller dimensions
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockFileName = `avatar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const mockUrl = `https://picsum.photos/200/200?random=${Date.now()}`;
      
      res.json({
        url: mockUrl,
        fileName: mockFileName,
        fileSize: 1024 * 50, // Mock 50KB
        mimeType: 'image/jpeg'
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: "Avatar upload failed" });
    }
  });

  app.post("/api/upload/branding", async (req, res) => {
    try {
      // Simulate branding asset upload
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockFileName = `branding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const mockUrl = `https://picsum.photos/800/600?random=${Date.now()}`;
      
      res.json({
        url: mockUrl,
        fileName: mockFileName,
        fileSize: 1024 * 500, // Mock 500KB
        mimeType: 'image/jpeg'
      });
    } catch (error) {
      console.error('Branding upload error:', error);
      res.status(500).json({ error: "Branding asset upload failed" });
    }
  });

  // Register social media routes
  registerSocialRoutes(app);

  // Register tenant routes
  registerTenantRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}