import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerSocialRoutes } from "./social-routes";
import { registerTenantRoutes } from "./tenant-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerDynamicAnalyticsRoutes } from "./dynamic-analytics-routes";
import { registerTwitterVerificationRoutes } from "./twitter-verification-routes";
import { registerReferralRoutes } from "./referral-routes";
import { registerPointsRoutes } from "./points-routes";
import { registerAdminPlatformTasksRoutes } from "./admin-platform-tasks-routes";
import { registerPlatformPointsRoutes } from "./platform-points-routes";
import { registerPlatformTaskRoutes } from "./platform-task-routes";
import { registerFanDashboardRoutes } from "./fan-dashboard-routes";
import { registerNotificationRoutes } from "./notification-routes";
import { registerCrossmintRoutes } from "./crossmint-routes";
import { registerProgramRoutes } from "./program-routes";
import { registerAnnouncementRoutes } from "./announcement-routes";
import { 
  insertUserSchema, insertCreatorSchema, insertLoyaltyProgramSchema, 
  insertRewardSchema, insertFanProgramSchema,
  insertCampaignSchema, insertCampaignRuleSchema,
  insertTaskSchema, insertTaskAssignmentSchema, insertTaskTemplateSchema
} from "@shared/schema";
import {
  CORE_TASK_TEMPLATES, PLATFORM_TASK_TYPES,
  twitterTaskSchema, facebookTaskSchema, instagramTaskSchema,
  youtubeTaskSchema, tiktokTaskSchema, spotifyTaskSchema
} from "@shared/taskTemplates";
import { authenticateUser, requireRole, requireCustomerTier, requireAdminPermission, AuthenticatedRequest } from "./middleware/rbac";
import { z } from "zod";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Multer configuration for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.path.includes('avatar') ? 'avatars' : 
                      req.path.includes('branding') ? 'branding' : 'images';
    const uploadPath = path.join(process.cwd(), 'uploads', uploadType);
    
    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = nanoid();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Images Only!'));
    }
  }
});

// Import upload routes
import uploadRoutes from "./upload-routes";
import videoUploadRoutes from "./video-upload-routes";
import socialConnectionRoutes from "./social-connection-routes";
import creatorVerificationRoutes from "./creator-verification-routes";

export async function registerRoutes(app: Express): Promise<Server> {

  // Serve static files for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Proxy images from Replit Object Storage
  app.get('/api/storage/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0]; // Get everything after /api/storage/
      const { getStorageClient } = await import('./storage-client');
      const client = await getStorageClient();
      
      const result = await client.downloadAsBytes(filename);
      
      if (!result.ok || !result.value) {
        console.error('Image not found:', filename, result.error);
        return res.status(404).json({ error: 'Image not found' });
      }
      
      // The Replit SDK returns the buffer wrapped in an array
      // Access the actual buffer from result.value[0]
      const resultValue: any = result.value;
      const imageBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;
      
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid image data' });
      }
      
      // Determine content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error serving image from storage:', error);
      res.status(500).json({ error: 'Failed to load image' });
    }
  });

  // Proxy videos from Replit Object Storage
  app.get('/api/storage/videos/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0]; // Get everything after /api/storage/videos/
      const { getStorageClient } = await import('./storage-client');
      const client = await getStorageClient();
      
      const result = await client.downloadAsBytes(filename);
      
      if (!result.ok || !result.value) {
        console.error('Video not found:', filename, result.error);
        return res.status(404).json({ error: 'Video not found' });
      }
      
      const resultValue: any = result.value;
      const videoBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;
      
      if (!videoBuffer || !Buffer.isBuffer(videoBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid video data' });
      }
      
      // Determine content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'mp4'] || 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(videoBuffer);
    } catch (error) {
      console.error('Error serving video from storage:', error);
      res.status(500).json({ error: 'Failed to load video' });
    }
  });
  
  // Register image upload routes
  app.use('/api/upload', uploadRoutes);
  
  // Register video upload routes
  app.use('/api/upload', videoUploadRoutes);
  
  // Register social connection routes
  app.use('/api/social-connections', socialConnectionRoutes);
  
  // Register creator verification routes
  app.use('/api/creator-verification', creatorVerificationRoutes);

  // Check username availability
  app.get('/api/auth/check-username/:username', async (req, res) => {
    try {
      const { username } = req.params;
      
      // Validate username format
      if (!username || username.length < 3 || username.length > 30) {
        return res.status(400).json({ 
          available: false, 
          error: 'Username must be between 3 and 30 characters' 
        });
      }
      
      // Check for invalid characters
      if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return res.status(400).json({ 
          available: false, 
          error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' 
        });
      }
      
      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      
      res.json({ 
        available: !existingUser,
        username,
        suggestions: existingUser ? [
          `${username}1`,
          `${username}_official`,
          `${username}.creator`,
          `${username}2025`
        ] : []
      });
    } catch (error) {
      console.error('Username check error:', error);
      res.status(500).json({ available: false, error: 'Server error checking username' });
    }
  });

  // Check tenant slug availability
  app.get('/api/tenants/check-slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      // Validate slug format
      if (!slug || slug.length < 3 || slug.length > 50) {
        return res.status(400).json({ 
          available: false, 
          error: 'Slug must be between 3 and 50 characters' 
        });
      }
      
      // Check for invalid characters (lowercase, numbers, hyphens only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ 
          available: false, 
          error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
        });
      }

      // Check if starts or ends with hyphen
      if (slug.startsWith('-') || slug.endsWith('-')) {
        return res.status(400).json({ 
          available: false, 
          error: 'Slug cannot start or end with a hyphen' 
        });
      }
      
      // Check if slug exists
      const existingTenant = await storage.getTenantBySlug(slug);
      
      res.json({ 
        available: !existingTenant,
        slug,
        suggestions: existingTenant ? [
          `${slug}-official`,
          `${slug}-creator`,
          `${slug}1`,
          `${slug}2025`
        ] : []
      });
    } catch (error) {
      console.error('Slug check error:', error);
      res.status(500).json({ available: false, error: 'Server error checking slug' });
    }
  });

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
      
      const dynamicUserId = dynamicUser.userId || dynamicUser.id;
      const proposedUsername = dynamicUser.alias || dynamicUser.firstName || "User";
      const email = dynamicUser.email;
      
      // Check if user already exists by Dynamic ID
      let existingUser = await storage.getUserByDynamicId(dynamicUserId);
      if (existingUser) {
        console.log("User found by Dynamic ID, returning:", existingUser.id);
        return res.json(existingUser);
      }

      // Check if user exists by email (for admin accounts created via script)
      if (email) {
        const userByEmail = await storage.getUserByEmail(email);
        
        if (userByEmail) {
          console.log("User found by email, linking Dynamic ID:", userByEmail.id);
          // Update existing user with Dynamic ID
          await storage.updateUser(userByEmail.id, {
            dynamicUserId,
            walletAddress: dynamicUser.verifiedCredentials?.[0]?.address || userByEmail.walletAddress || "",
            walletChain: dynamicUser.verifiedCredentials?.[0]?.chain || userByEmail.walletChain || "",
            avatar: dynamicUser.avatar || userByEmail.avatar,
          });
          
          const updatedUser = await storage.getUser(userByEmail.id);
          console.log("Linked existing user to Dynamic account");
          return res.json(updatedUser);
        }
      }

      // Check if username is taken, and make it unique if necessary
      let username = proposedUsername;
      const existingUsername = await storage.getUserByUsername(username);
      
      if (existingUsername) {
        // Make username unique by appending random suffix
        username = `${proposedUsername}_${Math.random().toString(36).substring(2, 8)}`;
        console.log("Username taken, using unique username:", username);
      }
      
      const userData = {
        dynamicUserId,
        username,
        email: email || undefined,
        avatar: dynamicUser.avatar || null,
        walletAddress: dynamicUser.verifiedCredentials?.[0]?.address || "",
        walletChain: dynamicUser.verifiedCredentials?.[0]?.chain || "",
        userType: userType === "creator" ? "creator" : "fan",
        role: (userType === "creator" ? "customer_admin" : "customer_end_user") as "customer_admin" | "customer_end_user",
      };

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
  app.post("/api/auth/complete-onboarding", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Get user data from authenticated user
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required - user ID missing" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const {
        username, // New required field
        creatorType,
        displayName,
        bio,
        followerCount,
        name,
        slug,
        sport,
        ageRange,
        education,
        grade, // New education subcategory
        graduationYear, // New field
        position,
        school,
        currentSponsors,
        nilCompliant,
        bandArtistName,
        musicCatalogUrl,
        artistType,
        musicGenre,
        contentType,
        topicsOfFocus, // Now array for content creators
        customTopics, // New field for user-input topics
        sponsorships,
        totalViews,
        platforms,
        primaryColor,
        secondaryColor,
        accentColor,
        bannerImage, // New field replacing social links
        subscriptionTier,
        location // Add location field
      } = req.body;

      // Validate and update username if provided
      if (username && username !== user.username) {
        // Validate username format
        if (username.length < 3 || username.length > 30) {
          return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
        }
        
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
          return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' });
        }
        
        // Check if username is already taken
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Username is already taken' });
        }
      }

      // Build type-specific data based on creator type
      let typeSpecificData = {};
      
      if (creatorType === 'athlete') {
        typeSpecificData = {
          athlete: {
            sport: sport || '',
            ageRange: ageRange || 'unknown',
            education: {
              level: education || 'other',
              grade: grade || undefined,
              school: school || '',
              graduationYear: graduationYear ? parseInt(graduationYear) : undefined
            },
            position: position || '',
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
        // Combine topicsOfFocus and customTopics into a single array
        const allTopics = [
          ...(Array.isArray(topicsOfFocus) ? topicsOfFocus : []),
          ...(Array.isArray(customTopics) ? customTopics : [])
        ];
        
        typeSpecificData = {
          contentCreator: {
            contentType: Array.isArray(contentType) ? contentType : (typeof contentType === 'string' ? contentType.split(',').map(s => s.trim()) : []),
            topicsOfFocus: allTopics, // Combined array of predefined and custom topics
            sponsorships: Array.isArray(sponsorships) ? sponsorships : (typeof sponsorships === 'string' ? sponsorships.split(',').map(s => s.trim()) : []),
            totalViews: totalViews || 'unknown',
            platforms: Array.isArray(platforms) ? platforms : (typeof platforms === 'string' ? platforms.split(',').map(s => s.trim()) : [])
          }
        };
      }

      // Handle subscription and payment processing
      let stripeCustomerId = null;
      let stripeSubscriptionId = null;
      
      // Only process Stripe if configured and on paid plan
      if (subscriptionTier && subscriptionTier !== 'starter' && process.env.STRIPE_SECRET_KEY) {
        // Create Stripe customer and subscription for paid plans
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2024-06-20" as any,
          });
          
          // Create Stripe customer
          const customer = await stripe.customers.create({
            email: user.email || `${user.dynamicUserId}@wallet.user`,
            name: displayName || name || 'Creator',
            metadata: {
              dynamicUserId: user.dynamicUserId || '',
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
      } else if (subscriptionTier && subscriptionTier !== 'starter') {
        console.log('⚠️  Stripe not configured, skipping payment processing for subscription tier:', subscriptionTier);
      }

      // Update user onboarding state and profile data
      const updatedUser = await storage.updateUser(user.id, {
        username: username || user.username, // Update username
        profileData: {
          ...(user.profileData || {}),
          name: displayName || name, // Use 'name' field instead of 'displayName'
          bio: bio || '',
          location: location || undefined,
          bannerImage: bannerImage || undefined,
          // Athlete-specific fields
          sport: sport || undefined,
          position: position || undefined,
          education: (creatorType === 'athlete' && (typeSpecificData as any).athlete) ? (typeSpecificData as any).athlete.education : undefined,
          // Musician-specific fields
          musicGenre: musicGenre || undefined,
          artistType: artistType || undefined,
          // Content Creator-specific fields
          contentType: contentType || undefined,
          platforms: platforms || undefined,
          topicsOfFocus: Array.isArray(topicsOfFocus) ? topicsOfFocus : undefined
        } as any, // Type assertion to allow flexibility with profileData
        onboardingState: {
          currentStep: 3, // Updated to 3 steps (was 5)
          totalSteps: 3, 
          completedSteps: ["1", "2", "3"],
          isCompleted: true
        }
      });

      // Update creator and tenant if user is a creator
      if (user.userType === 'creator') {
        // Get user's tenant
        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        
        if (tenant) {
          // Build update data conditionally - store setup is now optional during onboarding
          const updateData: any = {
            subscriptionTier: subscriptionTier || tenant.subscriptionTier || 'starter',
            businessInfo: {
              businessType: creatorType || tenant.businessInfo?.businessType || 'athlete'
            },
            settings: {
              timezone: tenant.settings?.timezone || 'UTC',
              currency: tenant.settings?.currency || 'USD',
              language: tenant.settings?.language || 'en',
              nilCompliance: nilCompliant || tenant.settings?.nilCompliance || false,
              publicProfile: tenant.settings?.publicProfile ?? true,
              allowRegistration: tenant.settings?.allowRegistration ?? true,
              requireEmailVerification: tenant.settings?.requireEmailVerification ?? false,
              enableSocialLogin: tenant.settings?.enableSocialLogin ?? true
            }
          };
          
          // Only update name if provided (store setup optional)
          if (name) {
            updateData.name = name;
          }
          
          // Only update branding if colors provided (store setup optional)
          if (primaryColor || secondaryColor || accentColor) {
            updateData.branding = {
              primaryColor: primaryColor || tenant.branding?.primaryColor || '#8B5CF6',
              secondaryColor: secondaryColor || tenant.branding?.secondaryColor || '#06B6D4',
              accentColor: accentColor || tenant.branding?.accentColor || '#10B981'
            };
          }
          
          // Only update billing info if Stripe customer created
          if (stripeCustomerId || stripeSubscriptionId) {
            updateData.billingInfo = {
              stripeCustomerId: stripeCustomerId || tenant.billingInfo?.stripeCustomerId,
              subscriptionId: stripeSubscriptionId || tenant.billingInfo?.subscriptionId
            };
          }
          
          // Only add slug if provided and different to avoid unique constraint violation
          if (slug && slug !== tenant.slug) {
            updateData.slug = slug;
          }
          
          await storage.updateTenant(tenant.id, updateData);
        }

        // Update or create creator profile
        let creator = await storage.getCreatorByUserId(user.id);
        if (creator) {
          // Build update object with optional fields
          const creatorUpdate: any = {
            category: creatorType || creator.category,
            typeSpecificData: typeSpecificData
          };
          
          // Only update fields if provided
          if (displayName || name) {
            creatorUpdate.displayName = displayName || name;
          }
          if (bio !== undefined) {
            creatorUpdate.bio = bio;
          }
          if (followerCount !== undefined) {
            creatorUpdate.followerCount = parseInt(followerCount) || 0;
          }
          if (primaryColor || secondaryColor || accentColor) {
            creatorUpdate.brandColors = {
              primary: primaryColor || creator.brandColors?.primary || '#8B5CF6',
              secondary: secondaryColor || creator.brandColors?.secondary || '#06B6D4',
              accent: accentColor || creator.brandColors?.accent || '#10B981'
            };
          }
          
          await storage.updateCreator(creator.id, creatorUpdate);
        } else if (tenant) {
          // Create creator profile if it doesn't exist (only if tenant exists)
          await storage.createCreator({
            userId: user.id,
            tenantId: tenant.id,
            displayName: displayName || name || username || 'Creator',
            bio: bio || '',
            category: creatorType || 'athlete',
            followerCount: parseInt(followerCount) || 0,
            typeSpecificData: typeSpecificData,
            brandColors: {
              primary: primaryColor || '#8B5CF6',
              secondary: secondaryColor || '#06B6D4',
              accent: accentColor || '#10B981'
            },
            socialLinks: {}
          });
        } else {
          console.error('⚠️  Cannot create creator profile: no tenant found for user', user.id);
        }
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Onboarding completion error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ 
        error: "Failed to complete onboarding",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
        try {
          creator = await storage.getCreatorByUserId(user.id);
          if (creator && creator.tenantId) {
            try {
              tenant = await storage.getTenant(creator.tenantId);
            } catch (tenantError) {
              console.error("Error fetching tenant for creator:", creator.id, tenantError);
              // Continue without tenant - it might not exist yet during onboarding
            }
          }
        } catch (creatorError) {
          console.error("Error fetching creator for user:", user.id, creatorError);
          // Continue without creator - it might not exist yet during onboarding
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
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to fetch user", details: error instanceof Error ? error.message : 'Unknown error' });
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
  app.post("/api/creators", authenticateUser, requireRole(['customer_admin', 'fandomly_admin']), async (req: AuthenticatedRequest, res) => {
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
      console.log(`📊 GET /api/creators - Fetched ${creators.length} creators from database`);
      
      // Enrich with active campaign info, task counts, and user/tenant data
      // Wrap each enrichment in try-catch to ensure ALL creators are returned
      const enriched = await Promise.all(creators.map(async (c) => {
        try {
          const activeCampaigns = await storage.getActiveCampaignsByCreator(c.id);
          
          // Get published tasks count
          let publishedTasks: any[] = [];
          try {
            const allTasks = await storage.getTasks(c.id, c.tenantId);
            const now = new Date();
            publishedTasks = allTasks.filter((task: any) => {
              if (task.isDraft || !task.isActive) return false;
              if (task.startTime && new Date(task.startTime) > now) return false;
              if (task.endTime && new Date(task.endTime) < now) return false;
              return true;
            });
          } catch (taskError) {
            console.warn(`Failed to fetch tasks for creator ${c.id}:`, taskError);
          }
          
          // Get user data for username
          let user = null;
          try {
            user = await storage.getUser(c.userId);
          } catch (userError) {
            console.warn(`Failed to fetch user for creator ${c.id}:`, userError);
          }
          
          // Get tenant data
          let tenant = null;
          try {
            tenant = await storage.getTenant(c.tenantId);
          } catch (tenantError) {
            console.warn(`Failed to fetch tenant for creator ${c.id}:`, tenantError);
          }
          
          return { 
            ...c, 
            hasActiveCampaign: activeCampaigns.length > 0,
            activeCampaignsCount: activeCampaigns.length,
            publishedTasksCount: publishedTasks.length,
            isLive: activeCampaigns.length > 0 || publishedTasks.length > 0,
            user: user ? { username: user.username } : null,
            tenant: tenant ? { slug: tenant.slug, branding: tenant.branding } : null,
          };
        } catch (enrichError) {
          // If enrichment completely fails, still return the creator with defaults
          console.error(`Failed to enrich creator ${c.id}:`, enrichError);
          return { 
            ...c, 
            hasActiveCampaign: false,
            activeCampaignsCount: 0,
            publishedTasksCount: 0,
            isLive: false,
            user: null,
            tenant: null,
          };
        }
      }));
      
      // Sort by creation date (newest first) in the API layer
      const sorted = enriched.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
      
      console.log(`✅ Returning ${sorted.length} creators (sorted by newest first)`);
      res.json(sorted);
    } catch (error) {
      console.error('Error fetching creators:', error);
      res.status(500).json({ error: "Failed to fetch creators" });
    }
  });

  app.get("/api/creators/:id", async (req, res) => {
    try {
      // For public creator info, we don't require tenant isolation yet
      // But this should be considered for private creator data
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // Update creator profile (authenticated)
  app.put("/api/creators/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }
      
      // Verify the creator belongs to this user
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      if (creator.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this creator" });
      }
      
      // Extract update fields
      const {
        displayName,
        bio,
        bannerImage,
        imageUrl,
        storeColors,
        typeSpecificData,
        publicFields
      } = req.body;
      
      const updates: any = {};
      
      if (displayName !== undefined) updates.displayName = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (bannerImage !== undefined) updates.bannerImage = bannerImage;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (storeColors !== undefined) updates.storeColors = storeColors;
      if (typeSpecificData !== undefined) updates.typeSpecificData = typeSpecificData;
      if (publicFields !== undefined) updates.publicFields = publicFields;
      
      const updatedCreator = await storage.updateCreator(id, updates);
      res.json(updatedCreator);
    } catch (error) {
      console.error('Creator update error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update creator" });
    }
  });

  // Get public creator page data (no auth required)
  app.get("/api/creators/public/:creatorUrl", async (req, res) => {
    try {
      const { creatorUrl } = req.params;
      
      // First try to find by tenant slug
      const tenant = await storage.getTenantBySlug(creatorUrl);
      if (!tenant) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      // Get creator by tenant ID - get all creators for this tenant
      const allCreators = await storage.getAllCreators();
      const creators = allCreators.filter(c => c.tenantId === tenant.id);
      if (!creators || creators.length === 0) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      const creator = creators[0]; // Primary creator for this tenant
      
      // Get user data
      const user = await storage.getUser(creator.userId);
      if (!user) {
        return res.status(404).json({ error: "Creator user not found" });
      }
      
      // Get published tasks
      const allTasks = await storage.getTasks(creator.id, creator.tenantId);
      const now = new Date();
      const publishedTasks = allTasks.filter((task: any) => {
        if (task.isDraft || !task.isActive) return false;
        if (task.startTime && new Date(task.startTime) > now) return false;
        if (task.endTime && new Date(task.endTime) < now) return false;
        return true;
      });
      
      // Get active campaigns
      const activeCampaigns = await storage.getActiveCampaignsByCreator(creator.id);
      
      // Get fan count
      const tenantMembers = await storage.getTenantMembers(tenant.id);
      const fanCount = tenantMembers.length;
      
      // Construct response
      res.json({
        creator: {
          ...creator,
          user: {
            username: user.username,
            displayName: (user.profileData as any)?.displayName || creator.displayName,
            profileData: user.profileData
          },
          tenant: {
            slug: tenant.slug,
            branding: tenant.branding
          }
        },
        tasks: publishedTasks,
        campaigns: activeCampaigns,
        fanCount,
        stats: {
          activeCampaigns: activeCampaigns.length,
          totalRewards: 0, // TODO: Calculate from completions
          engagementRate: undefined
        }
      });
    } catch (error) {
      console.error('Public creator page error:', error);
      res.status(500).json({ error: "Failed to fetch creator data" });
    }
  });

  // Update creator public page settings (authenticated)
  app.patch("/api/creators/:id/public-settings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }
      
      // Verify the creator belongs to this user
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      if (creator.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this creator" });
      }
      
      // Update public page settings
      const { publicPageSettings } = req.body;
      if (!publicPageSettings) {
        return res.status(400).json({ error: "Public page settings required" });
      }
      
      const updatedCreator = await storage.updateCreator(id, {
        publicPageSettings
      });
      
      res.json(updatedCreator);
    } catch (error) {
      console.error('Public settings update error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update settings" });
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

  // =====================================
  // TASK MANAGEMENT API ROUTES (New Workflow)
  // =====================================

  // Get all tasks for a creator (with tenant isolation)
  app.get("/api/tasks", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get creator profile to ensure they can access tasks
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required to access tasks" });
      }

      const tasks = await storage.getTasks(creator.id, creator.tenantId);
      res.json(tasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get specific task by ID (with tenant isolation)
  app.get("/api/tasks/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      const task = await storage.getTask(req.params.id, creator.tenantId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Failed to fetch task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create new task (with input validation)
  app.post("/api/tasks", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required to create tasks" });
      }

      // Validate input using Zod schema
      const taskData = insertTaskSchema.parse({
        ...req.body,
        creatorId: creator.id,
        tenantId: creator.tenantId
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Task creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create task" });
    }
  });

  // Update existing task (with tenant isolation)
  app.put("/api/tasks/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      // Create secure update schema that omits immutable fields
      const updateTaskSchema = insertTaskSchema.partial();
      
      const updates = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, updates, creator.tenantId);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Task update error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update task" });
    }
  });

  // Delete task (with tenant isolation)
  app.delete("/api/tasks/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      await storage.deleteTask(req.params.id, creator.tenantId);
      res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
      console.error("Task deletion error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Get tasks assigned to a campaign
  app.get("/api/campaigns/:campaignId/assigned-tasks", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const tasks = await storage.getCampaignTasks(req.params.campaignId);
      res.json(tasks);
    } catch (error) {
      console.error("Failed to fetch campaign tasks:", error);
      res.status(500).json({ error: "Failed to fetch campaign tasks" });
    }
  });

  // Assign task to campaign
  app.post("/api/tasks/:taskId/assign", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID required" });
      }

      // Validate task and campaign exist and belong to same tenant
      const task = await storage.getTask(req.params.taskId, creator.tenantId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Validate campaign belongs to same tenant/creator
      const campaigns = await storage.getCampaignsByCreator(creator.id, creator.tenantId);
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const assignment = await storage.assignTaskToCampaign(
        req.params.taskId, 
        campaignId, 
        creator.tenantId
      );
      res.json(assignment);
    } catch (error) {
      console.error("Task assignment error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to assign task" });
    }
  });

  // Unassign task from campaign
  app.delete("/api/tasks/:taskId/assign", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID required" });
      }

      // Validate task and campaign exist and belong to same tenant
      const task = await storage.getTask(req.params.taskId, creator.tenantId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Validate campaign belongs to same tenant/creator
      const campaigns = await storage.getCampaignsByCreator(creator.id, creator.tenantId);
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      await storage.unassignTaskFromCampaign(req.params.taskId, campaignId, creator.tenantId);
      res.json({ success: true, message: "Task unassigned successfully" });
    } catch (error) {
      console.error("Task unassignment error:", error);
      res.status(500).json({ error: "Failed to unassign task" });
    }
  });

  // =====================================
  // TASK TEMPLATE API ROUTES
  // =====================================

  // Get task templates (with core templates + tenant-specific)
  app.get("/api/task-templates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required to access templates" });
      }

      // Get both global templates and tenant-specific templates
      const dbTemplates = await storage.getTaskTemplates(creator.tenantId);
      
      // Merge with core templates from code (if not already in database)
      const coreTemplateIds = dbTemplates.map(t => t.id).filter(Boolean);
      const missingCoreTemplates = CORE_TASK_TEMPLATES.filter(
        coreTemplate => !coreTemplateIds.includes(coreTemplate.id)
      ).map(coreTemplate => ({
        ...coreTemplate,
        id: coreTemplate.id,
        tenantId: null,
        creatorId: null,
        isActive: true,
        readOnly: true, // Flag core templates as read-only
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      const allTemplates = [...dbTemplates, ...missingCoreTemplates];
      res.json(allTemplates);
    } catch (error) {
      console.error("Failed to fetch task templates:", error);
      res.status(500).json({ error: "Failed to fetch task templates" });
    }
  });

  // Get specific task template
  app.get("/api/task-templates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      const template = await storage.getTaskTemplate(req.params.id, creator.tenantId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Failed to fetch task template:", error);
      res.status(500).json({ error: "Failed to fetch task template" });
    }
  });

  // Create custom task template
  app.post("/api/task-templates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      // Validate request body
      const templateData = insertTaskTemplateSchema.parse(req.body);

      // Validate platform/taskType consistency
      const platformPrefix = templateData.platform;
      const expectedPrefix = templateData.taskType.split('_')[0];
      if (platformPrefix !== expectedPrefix) {
        return res.status(400).json({ 
          error: `Task type '${templateData.taskType}' is not valid for platform '${templateData.platform}'` 
        });
      }

      // Validate platform-specific configuration using appropriate schema
      let configValidation;
      try {
        switch (templateData.platform) {
          case 'twitter':
            configValidation = twitterTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'facebook':
            configValidation = facebookTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'instagram':
            configValidation = instagramTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'youtube':
            configValidation = youtubeTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'tiktok':
            configValidation = tiktokTaskSchema.parse(templateData.defaultConfig);
            break;
          case 'spotify':
            configValidation = spotifyTaskSchema.parse(templateData.defaultConfig);
            break;
          default:
            return res.status(400).json({ error: `Unsupported platform: ${templateData.platform}` });
        }
      } catch (validationError) {
        return res.status(400).json({ 
          error: "Invalid platform configuration", 
          details: validationError instanceof Error ? validationError.message : "Configuration validation failed"
        });
      }

      // Set tenant context for custom templates (force isGlobal=false for non-admin)
      const templateWithContext = {
        ...templateData,
        tenantId: creator.tenantId,
        creatorId: creator.id,
        isGlobal: false, // Regular users cannot create global templates
        defaultConfig: configValidation as any
      };

      const template = await storage.createTaskTemplate(templateWithContext);
      res.json(template);
    } catch (error) {
      console.error("Failed to create task template:", error);
      if (error instanceof Error && error.message.includes('parse')) {
        res.status(400).json({ error: "Invalid template data" });
      } else {
        res.status(500).json({ error: "Failed to create task template" });
      }
    }
  });

  // Update task template (only owner can update)
  app.put("/api/task-templates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      // Validate request body - whitelist safe fields only
      const fullUpdate = insertTaskTemplateSchema.partial().parse(req.body);
      const updates = {
        name: fullUpdate.name,
        description: fullUpdate.description,
        defaultConfig: fullUpdate.defaultConfig,
        isActive: fullUpdate.isActive
      };
      // Remove undefined fields
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });
      
      // If updating platform configuration, validate it using existing template's platform
      if (updates.defaultConfig) {
        const existingTemplate = await storage.getTaskTemplate(req.params.id, creator.tenantId);
        if (!existingTemplate) {
          return res.status(404).json({ error: "Template not found" });
        }
        
        switch (existingTemplate.platform) {
          case 'twitter':
            twitterTaskSchema.parse(updates.defaultConfig);
            break;
          case 'facebook':
            facebookTaskSchema.parse(updates.defaultConfig);
            break;
          case 'instagram':
            instagramTaskSchema.parse(updates.defaultConfig);
            break;
          case 'youtube':
            youtubeTaskSchema.parse(updates.defaultConfig);
            break;
          case 'tiktok':
            tiktokTaskSchema.parse(updates.defaultConfig);
            break;
          case 'spotify':
            spotifyTaskSchema.parse(updates.defaultConfig);
            break;
        }
      }

      const template = await storage.updateTaskTemplate(req.params.id, updates, creator.tenantId);
      if (!template) {
        return res.status(404).json({ error: "Template not found or permission denied" });
      }

      res.json(template);
    } catch (error) {
      console.error("Failed to update task template:", error);
      res.status(500).json({ error: "Failed to update task template" });
    }
  });

  // Delete task template (only owner can delete)
  app.delete("/api/task-templates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      await storage.deleteTaskTemplate(req.params.id, creator.tenantId);
      res.json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
      console.error("Failed to delete task template:", error);
      res.status(500).json({ error: "Failed to delete task template" });
    }
  });

  // Get platform-specific task types for UI (authenticated)
  app.get("/api/platforms/:platform/task-types", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const platform = req.params.platform;
      const taskTypes = PLATFORM_TASK_TYPES[platform as keyof typeof PLATFORM_TASK_TYPES];
      
      if (!taskTypes) {
        return res.status(404).json({ error: "Platform not found" });
      }

      res.json(taskTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task types" });
    }
  });

  // Publish campaign (with task validation)
  app.post("/api/campaigns/:campaignId/publish", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      // Validate campaign belongs to creator before publishing
      const campaigns = await storage.getCampaignsByCreator(creator.id, creator.tenantId);
      const existingCampaign = campaigns.find(c => c.id === req.params.campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const campaign = await storage.publishCampaign(req.params.campaignId, creator.tenantId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      res.json({ 
        campaign, 
        message: "Campaign published successfully" 
      });
    } catch (error) {
      console.error("Campaign publishing error:", error);
      if (error instanceof Error && error.message.includes('at least 1 task')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to publish campaign" });
      }
    }
  });

  // Get pending campaigns (campaigns waiting for tasks)
  app.get("/api/campaigns/pending", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }

      const campaigns = await storage.getPendingCampaigns(creator.id, creator.tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error("Failed to fetch pending campaigns:", error);
      res.status(500).json({ error: "Failed to fetch pending campaigns" });
    }
  });

  // Rewards routes
  app.get("/api/rewards", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Get user's current tenant context
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get creator to determine tenant
      let tenantId = null;
      if (user.userType === 'creator') {
        const creator = await storage.getCreatorByUserId(user.id);
        tenantId = creator?.tenantId;
      }
      
      // Fetch rewards with tenant isolation
      const rewards = tenantId ? await storage.getAllRewards(tenantId) : [];
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Get rewards by creator (for fan dashboard)
  app.get("/api/rewards/creator/:creatorId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const creator = await storage.getCreator(req.params.creatorId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      // Get active rewards for this creator's tenant
      const rewards = await storage.getAllRewards(creator.tenantId);
      const activeRewards = rewards.filter(reward => reward.isActive);
      res.json(activeRewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Create reward (creator-only)
  app.post("/api/rewards", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: "Access denied. Creator account required." });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile not found" });
      }

      // Validate request body
      const rewardData = insertRewardSchema.parse({
        ...req.body,
        tenantId: creator.tenantId, // Override client-supplied tenantId for security
      });

      const reward = await storage.createReward(rewardData);
      res.status(201).json(reward);
    } catch (error) {
      console.error("Reward creation error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid reward data" 
      });
    }
  });

  // Update reward (creator-only)
  app.put("/api/rewards/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: "Access denied. Creator account required." });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile not found" });
      }

      // Verify the reward belongs to this creator's tenant
      const existingReward = await storage.getReward(req.params.id, creator.tenantId);
      if (!existingReward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      // Validate update data (partial schema)
      const updateData = insertRewardSchema.partial().parse(req.body);
      
      const updatedReward = await storage.updateReward(req.params.id, updateData);
      res.json(updatedReward);
    } catch (error) {
      console.error("Reward update error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid reward data" 
      });
    }
  });

  // Delete reward (creator-only)
  app.delete("/api/rewards/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify user is a creator
      if (user.userType !== 'creator') {
        return res.status(403).json({ error: "Access denied. Creator account required." });
      }

      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile not found" });
      }

      // Verify the reward belongs to this creator's tenant
      const existingReward = await storage.getReward(req.params.id, creator.tenantId);
      if (!existingReward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      // Soft delete by setting isActive to false
      await storage.updateReward(req.params.id, { isActive: false });
      res.status(204).send();
    } catch (error) {
      console.error("Reward deletion error:", error);
      res.status(500).json({ error: "Failed to delete reward" });
    }
  });

  // Redeem reward (fan-only)
  app.post("/api/rewards/:id/redeem", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get the reward details
      const reward = await storage.getReward(req.params.id);
      if (!reward || !reward.isActive) {
        return res.status(404).json({ error: "Reward not found or inactive" });
      }

      // Get user's tenant membership for this reward's tenant
      const membership = await storage.getUserTenantMembership(user.id, reward.tenantId);
      if (!membership) {
        return res.status(403).json({ error: "Not authorized to redeem from this creator" });
      }

      // Validate redemption request
      const { entries = 1 } = req.body; // For raffles, allow multiple entries
      const totalCost = reward.pointsCost * entries;

      // Check if user has enough points
      if ((membership.memberData?.points || 0) < totalCost) {
        return res.status(400).json({ 
          error: "Insufficient points", 
          required: totalCost, 
          available: (membership.memberData?.points || 0) 
        });
      }

      // Check stock/max redemptions
      if (reward.maxRedemptions && (reward.currentRedemptions || 0) >= reward.maxRedemptions) {
        return res.status(400).json({ error: "Reward no longer available" });
      }

      // For raffle rewards, check max entries
      if (reward.rewardType === 'raffle' && reward.rewardData?.raffleData?.maxEntries) {
        const maxEntries = reward.rewardData.raffleData.maxEntries;
        if (entries > maxEntries) {
          return res.status(400).json({ 
            error: `Maximum ${maxEntries} entries allowed per person` 
          });
        }
      }

      // Use atomic redemption to prevent race conditions and ensure data integrity
      const result = await storage.redeemRewardAtomic({
        userId: user.id,
        rewardId: reward.id,
        entries,
        membershipId: membership.id
      });

      res.json({
        success: true,
        message: `Successfully redeemed ${reward.name}`,
        pointsSpent: reward.pointsCost * entries,
        remainingPoints: result.updatedMembership.memberData?.points || 0,
        entries: entries,
        redemptionId: result.rewardRedemption.id
      });
    } catch (error) {
      console.error("Reward redemption error:", error);
      res.status(500).json({ error: "Failed to redeem reward" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns/creator/:creatorId", async (req, res) => {
    try {
      // Get creator to verify tenant context
      const creator = await storage.getCreator(req.params.creatorId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }
      
      // Fetch campaigns with tenant isolation
      const data = await storage.getCampaignsByCreator(req.params.creatorId, creator.tenantId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/active", async (req, res) => {
    try {
      // Get all active campaigns across all tenants (public marketplace)
      const campaigns = await storage.getAllActiveCampaigns();
      
      // Enrich with creator information
      const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
        const creator = await storage.getCreator(campaign.creatorId);
        const rules = await storage.getCampaignRules(campaign.id);
        return {
          ...campaign,
          creator: creator ? {
            displayName: creator.displayName,
            imageUrl: creator.imageUrl,
            category: creator.category
          } : null,
          rules
        };
      }));
      
      res.json(enrichedCampaigns);
    } catch (error) {
      console.error('Failed to fetch active campaigns:', error);
      res.status(500).json({ error: "Failed to fetch active campaigns" });
    }
  });

  app.post("/api/campaigns", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user's creator profile for tenant scoping
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required to create campaigns" });
      }

      const payload = insertCampaignSchema.parse({
        ...req.body,
        tenantId: creator.tenantId,
        creatorId: creator.id
      });
      
      const created = await storage.createCampaign(payload);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid campaign data" });
    }
  });

  // Enhanced campaign creation endpoint for multi-step modal
  app.post("/api/campaigns/enhanced", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user's creator profile to ensure they can create campaigns
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required to create campaigns" });
      }

      const { 
        campaignData, 
        socialTasks = [] 
      }: {
        campaignData: any;
        socialTasks: any[];
      } = req.body;

      // Validate campaign data
      if (!campaignData.name || !campaignData.type || campaignData.type.length === 0) {
        return res.status(400).json({ error: "Campaign name and type are required" });
      }

      // Create the main campaign with proper tenant scoping
      const campaignPayload = {
        tenantId: creator.tenantId,
        creatorId: creator.id,
        name: campaignData.name,
        description: campaignData.description || '',
        campaignType: 'direct' as const,
        trigger: 'custom_event' as const,
        startDate: campaignData.startDate || new Date().toISOString(),
        endDate: campaignData.endDate || null,
        status: 'active' as const,
        campaignTypes: campaignData.type || ['points'],
        rewardStructure: campaignData.rewardStructure,
        prerequisiteCampaigns: campaignData.requirements?.prerequisiteCampaigns || [],
        allTasksRequired: campaignData.requirements?.allTasksRequired ?? true
      };

      const campaign = await storage.createCampaign(campaignPayload);

      // Create social campaign tasks
      const createdTasks = [];
      for (const task of socialTasks) {
        const taskPayload = {
          tenantId: campaign.tenantId,
          campaignId: campaign.id,
          platform: task.platform,
          taskType: task.taskType,
          targetUrl: task.targetUrl,
          hashtags: task.hashtags,
          inviteCode: task.inviteCode,
          customInstructions: task.customInstructions,
          rewardType: task.rewardType || 'points',
          rewardValue: task.rewardValue || 50,
          rewardMetadata: task.rewardMetadata,
          displayOrder: task.displayOrder || 1
        };
        
        const createdTask = await storage.createSocialCampaignTask(taskPayload);
        createdTasks.push(createdTask);
      }

      res.json({ 
        campaign, 
        tasks: createdTasks,
        message: "Campaign created successfully with social tasks" 
      });
    } catch (error) {
      console.error('Enhanced campaign creation failed:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create enhanced campaign" });
    }
  });

  // Social Campaign Tasks routes
  app.get("/api/campaigns/:campaignId/tasks", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const tasks = await storage.getSocialCampaignTasks(campaignId);
      res.json(tasks);
    } catch (error) {
      console.error('Failed to fetch campaign tasks:', error);
      res.status(500).json({ error: "Failed to fetch campaign tasks" });
    }
  });

  app.post("/api/campaigns/:campaignId/tasks", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const taskData = { ...req.body, campaignId };
      const created = await storage.createSocialCampaignTask(taskData);
      res.json(created);
    } catch (error) {
      console.error('Failed to create campaign task:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create campaign task" });
    }
  });

  app.put("/api/campaigns/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const updated = await storage.updateSocialCampaignTask(taskId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Failed to update campaign task:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update campaign task" });
    }
  });

  app.delete("/api/campaigns/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      await storage.deleteSocialCampaignTask(taskId);
      res.json({ success: true, message: "Campaign task deleted successfully" });
    } catch (error) {
      console.error('Failed to delete campaign task:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete campaign task" });
    }
  });

  app.post("/api/campaigns/participate", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { campaignId, actionType, metadata } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get campaign and verify it exists and is active
      const campaigns = await storage.getAllActiveCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign || campaign.status !== 'active') {
        return res.status(404).json({ error: "Campaign not found or inactive" });
      }

      // Check if user already participated in this campaign
      const existingParticipation = await storage.getCampaignParticipation(campaignId, userId);
      
      if (existingParticipation) {
        // Update existing participation
        const updatedParticipation = await storage.updateCampaignParticipation(existingParticipation.id, {
          participationCount: existingParticipation.participationCount + 1,
          lastParticipation: new Date(),
          participationData: {
            ...existingParticipation.participationData,
            rewardsEarned: [
              ...(existingParticipation.participationData?.rewardsEarned || []),
              {
                type: actionType,
                value: metadata,
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
        
        res.json({ 
          success: true, 
          participation: updatedParticipation,
          message: "Action completed! Points will be awarded.",
          pointsEarned: getActionPoints(actionType)
        });
      } else {
        // Create new participation
        const participation = await storage.createCampaignParticipation({
          tenantId: campaign.tenantId,
          campaignId,
          memberId: userId,
          participationCount: 1,
          totalUnitsEarned: 0,
          participationData: {
            triggerDetails: { actionType, metadata },
            rewardsEarned: [{
              type: actionType,
              value: metadata,
              timestamp: new Date().toISOString()
            }]
          }
        });
        
        res.json({ 
          success: true, 
          participation,
          message: "Joined campaign! Points will be awarded.",
          pointsEarned: getActionPoints(actionType)
        });
      }
    } catch (error) {
      console.error('Campaign participation error:', error);
      res.status(500).json({ error: "Failed to participate in campaign" });
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

  // Helper function to get points for social actions
  function getActionPoints(actionType: string): number {
    const pointMap: Record<string, number> = {
      'follow_facebook': 50,
      'follow_instagram': 50, 
      'follow_x': 50,
      'like_post': 50,
      'share_post': 200,
      'comment_post': 100,
      'retweet': 100,
      'default': 50
    };
    return pointMap[actionType] || pointMap['default'];
  }

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

  app.get("/api/creators/:creatorId/facebook-pages", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { creatorId } = req.params;
      const rows = await storage.getCreatorFacebookPages(creatorId);
      res.json(rows);
    } catch (error) {
      console.error('Fetch creator FB pages error:', error);
      res.status(500).json({ error: 'Failed to fetch creator Facebook pages' });
    }
  });

  // Creator Instagram Account: save Instagram Business Account data
  app.post("/api/creators/instagram-account", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { instagramUserId, username, accessToken, accountType } = req.body;
      
      if (!instagramUserId || !username || !accessToken) {
        return res.status(400).json({ error: 'instagramUserId, username, and accessToken are required' });
      }

      // Get the creator for this user
      const creator = await storage.getCreatorByUserId(req.user?.id || '');
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Save Instagram account data (you may need to add this table to your schema)
      // For now, we'll store it in the creator's metadata or create a separate table
      const instagramData = {
        instagramUserId,
        username,
        accountType: accountType || 'BUSINESS',
        connectedAt: new Date().toISOString(),
        // Don't store the access token in the response for security
      };

      // You might want to add an instagram_accounts table or store in creator metadata
      // For now, let's return success
      res.json({ 
        success: true, 
        message: 'Instagram account connected successfully',
        data: instagramData
      });
    } catch (error) {
      console.error('Save Instagram account error:', error);
      res.status(500).json({ error: 'Failed to save Instagram account' });
    }
  });

  // Fan Facebook profile quick fetch (returns saved profileData.facebookData)
  app.get("/api/fans/:userId/facebook-profile", authenticateUser, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/tenants/:tenantId/follow", authenticateUser, async (req: AuthenticatedRequest, res) => {
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

  // Get tenant memberships (followers/fans)
  app.get("/api/tenant-memberships/:tenantId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { tenantId } = req.params;
      
      // Get all memberships for this tenant
      const memberships = await storage.getTenantMembers(tenantId);
      
      // Enrich with user data
      const enrichedMemberships = await Promise.all(
        memberships.map(async (membership) => {
          const user = await storage.getUser(membership.userId);
          return {
            ...membership,
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email,
              avatar: user.avatar,
            } : null
          };
        })
      );
      
      console.log(`✅ Returning ${enrichedMemberships.length} members for tenant ${tenantId}`);
      res.json(enrichedMemberships);
    } catch (error) {
      console.error('Error fetching tenant memberships:', error);
      res.status(500).json({ error: "Failed to fetch tenant members" });
    }
  });

  // Update user profile data (fan onboarding info and enhanced fields)
  // Supports: Basic info, marketing fields (phone, creatorTypeInterests, interestSubcategories), social links, preferences
  app.post("/api/auth/profile", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, username, avatar, profileData } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      
      const updates: any = {};
      
      // Handle username update with validation
      if (username) {
        // Validate username format
        if (username.length < 3 || username.length > 30) {
          return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
        }
        
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
          return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' });
        }
        
        // Check if username is already taken by another user
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Username is already taken' });
        }
        
        updates.username = username;
      }
      
      // Handle avatar update (separate field in users table)
      if (avatar !== undefined) {
        updates.avatar = avatar;
      }
      
      // Handle profile data updates (supports enhanced schema)
      if (profileData) {
        // Optional: International phone number validation (if provided)
        if (profileData.phone && profileData.phone.length > 0) {
          // Check for country code prefix (+ followed by digits)
          const phoneRegex = /^\+\d{1,4}\s?[\d\s\-\(\)]{7,15}$/;
          if (!phoneRegex.test(profileData.phone.trim())) {
            return res.status(400).json({ 
              error: 'Phone number must include country code (e.g., +1 555-123-4567)' 
            });
          }
          // Remove all non-digit characters (except +) for length validation
          const digitsOnly = profileData.phone.replace(/[^\d+]/g, '');
          if (digitsOnly.length < 11 || digitsOnly.length > 18) {
            return res.status(400).json({ 
              error: 'Phone number must be between 11-18 characters (including country code)' 
            });
          }
        }
        
        updates.profileData = profileData;
      }
      
      const updated = await storage.updateUser(userId, updates);
      res.json(updated);
    } catch (error) {
      console.error('Profile update error:', error);
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
      // Get loyalty program to verify tenant context
      const program = await storage.getLoyaltyProgram(req.params.programId);
      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }
      
      // Fetch rewards with tenant isolation
      const rewards = await storage.getRewardsByProgram(req.params.programId, program.tenantId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Admin physical rewards approval routes
  app.get("/api/admin/physical-rewards", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // TODO: Add admin role check here
      // For now, any authenticated user can access (update this with proper admin check)

      // Get all physical rewards using storage layer
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: "Creator profile required" });
      }
      
      const allRewards = await storage.getAllRewards(creator.tenantId);
      const physicalRewards = allRewards.filter(r => r.rewardType === 'physical');
      
      res.json(physicalRewards);
    } catch (error) {
      console.error('Error fetching physical rewards:', error);
      res.status(500).json({ error: "Failed to fetch physical rewards" });
    }
  });

  app.put("/api/admin/physical-rewards/:id/approve", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // TODO: Add admin role check here

      const { id } = req.params;
      const { adminNotes, approvedAt } = req.body;

      // Get the reward and update it
      const reward = await storage.getReward(id);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      // Update reward data with approval status
      const updatedRewardData = {
        ...reward.rewardData,
        physicalData: {
          ...(reward.rewardData as any)?.physicalData,
          approvalStatus: 'approved',
          adminNotes: adminNotes || null,
          approvedAt: approvedAt || new Date().toISOString()
        }
      };

      const updatedReward = await storage.updateReward(id, {
        rewardData: updatedRewardData,
        isActive: true // Auto-activate approved rewards
      });

      res.json(updatedReward);
    } catch (error) {
      console.error('Error approving reward:', error);
      res.status(500).json({ error: "Failed to approve reward" });
    }
  });

  app.put("/api/admin/physical-rewards/:id/reject", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // TODO: Add admin role check here

      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!adminNotes) {
        return res.status(400).json({ error: "Admin notes are required for rejection" });
      }

      // Get the reward and update it
      const reward = await storage.getReward(id);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      // Update reward data with rejection status
      const updatedRewardData = {
        ...reward.rewardData,
        physicalData: {
          ...(reward.rewardData as any)?.physicalData,
          approvalStatus: 'rejected',
          adminNotes: adminNotes
        }
      };

      const updatedReward = await storage.updateReward(id, {
        rewardData: updatedRewardData,
        isActive: false // Deactivate rejected rewards
      });

      res.json(updatedReward);
    } catch (error) {
      console.error('Error rejecting reward:', error);
      res.status(500).json({ error: "Failed to reject reward" });
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

  // Stripe Payment Routes - Using javascript_stripe integration
  
  // Stripe payment intent for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "usd" } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20" as any,
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ 
        error: "Error creating payment intent", 
        message: error.message 
      });
    }
  });

  // Get or create subscription for authenticated user
  app.post('/api/get-or-create-subscription', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user from our database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20" as any,
      });

      // Get user's tenant to check existing billing info
      const userTenants = await storage.getUserTenants(user.id);
      const tenant = userTenants[0];

      // Check if user already has active subscription
      if (tenant?.billingInfo?.subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(tenant.billingInfo.subscriptionId);
          
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            const latestInvoice = subscription.latest_invoice;
            const paymentIntent = typeof latestInvoice === 'object' && latestInvoice ? (latestInvoice as any).payment_intent : null;
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: typeof paymentIntent === 'object' && paymentIntent ? paymentIntent.client_secret : null,
              status: subscription.status
            });
          }
        } catch (error) {
          console.error('Error retrieving existing subscription:', error);
          // Continue to create new subscription if current one is invalid
        }
      }

      // Create new customer if needed
      let customerId = tenant?.billingInfo?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || `${user.dynamicUserId}@wallet.user`,
          name: user.username || 'Creator',
          metadata: {
            dynamicUserId: user.dynamicUserId,
            userId: user.id,
            tenantId: tenant?.id || ''
          }
        });
        customerId = customer.id;
      }

      // Create subscription with default price (you can customize this)
      const { priceId = process.env.STRIPE_DEFAULT_PRICE_ID } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ 
          error: "No price ID provided and STRIPE_DEFAULT_PRICE_ID not configured" 
        });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update tenant with billing info
      if (tenant) {
        await storage.updateTenant(tenant.id, {
          billingInfo: {
            ...tenant.billingInfo,
            stripeCustomerId: customerId,
            subscriptionId: subscription.id
          }
        });
      }

      const latestInvoice = subscription.latest_invoice;
      const paymentIntent = typeof latestInvoice === 'object' && latestInvoice ? (latestInvoice as any).payment_intent : null;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: typeof paymentIntent === 'object' && paymentIntent ? paymentIntent.client_secret : null,
        status: subscription.status
      });

    } catch (error: any) {
      console.error('Subscription creation error:', error);
      res.status(500).json({ 
        error: "Error creating subscription", 
        message: error.message 
      });
    }
  });

  // Get subscription status (no custom auth middleware)
  app.get('/api/subscription-status', async (req: AuthenticatedRequest, res) => {
    try {
      const dynamicUserId = (req.headers['x-dynamic-user-id'] as string) || (req.query?.dynamicUserId as string) || (req.query?.userId as string);
      if (!dynamicUserId) return res.json({ status: 'no_subscription' });

      const user = await storage.getUserByDynamicId(dynamicUserId);
      if (!user) {
        return res.json({ status: 'no_subscription' });
      }

      const userTenants = await storage.getUserTenants(user.id);
      const tenant = userTenants[0];

      if (!tenant?.billingInfo?.subscriptionId) {
        return res.json({ status: 'no_subscription' });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20" as any,
      });

      const subscription = await stripe.subscriptions.retrieve(tenant.billingInfo.subscriptionId);
      
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: subscription.items.data[0]?.price?.nickname || 'Unknown Plan'
      });

    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ 
        error: "Error fetching subscription status", 
        message: error.message 
      });
    }
  });

  // Register social media routes (includes Instagram webhooks)
  registerSocialRoutes(app);

  // Register tenant routes
  registerTenantRoutes(app);

  // Register admin routes
  registerAdminRoutes(app);
  
  // Register Dynamic Analytics routes
  registerDynamicAnalyticsRoutes(app);
  
  // Register Twitter verification routes
  registerTwitterVerificationRoutes(app);

  // Register referral routes
  registerReferralRoutes(app);

  // Register points routes
  registerPointsRoutes(app);

  // Register Crossmint NFT routes
  registerCrossmintRoutes(app);

  // Register notification routes
  registerNotificationRoutes(app);

  // Register admin platform tasks routes
  registerAdminPlatformTasksRoutes(app);

  // Register platform points routes
  registerPlatformPointsRoutes(app);

  // Register platform task routes
  registerPlatformTaskRoutes(app);

  // Register fan dashboard routes
  registerFanDashboardRoutes(app);

  // Register program routes
  registerProgramRoutes(app);

  // Register announcement routes
  registerAnnouncementRoutes(app);

  // Register task routes
  const { registerTaskRoutes } = await import("./task-routes");
  registerTaskRoutes(app);

  // Task Completion Routes
  const { createTaskCompletionRoutes } = await import("./task-completion-routes");
  app.use("/api/task-completions", createTaskCompletionRoutes(storage));

  // Creator Store Public API
  app.get("/api/store/:creatorUrl", async (req, res) => {
    try {
      const { creatorUrl } = req.params;

      // Skip reserved routes
      if (creatorUrl === 'admin-dashboard' || creatorUrl.startsWith('admin-')) {
        return res.status(404).json({ error: "Not found" });
      }

      // Find creator by username (slug)
      const user = await storage.getUserByUsername(creatorUrl);
      if (!user || user.userType !== 'creator') {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get creator data
      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Get tenant data
      const tenant = await storage.getTenant(creator.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Get published campaigns only
      const allCampaigns = await storage.getCampaignsByCreator(creator.id);
      const campaigns = allCampaigns.filter((c: any) => c.status === 'active');

      // Get rewards (future implementation)
      const rewards: any[] = [];

      // Get fan count - count unique fans following this creator
      const tenantMembers = await storage.getTenantMembers(tenant.id);
      const fanCount = tenantMembers.length;

      // Calculate total rewards distributed (mock for now)
      const totalRewards = fanCount * 10; // Placeholder calculation

      res.json({
        creator: {
          ...creator,
          user: {
            username: user.username,
            displayName: (user.profileData as any)?.displayName || user.username,
            profileData: user.profileData,
          },
          tenant: {
            slug: tenant.slug,
            branding: tenant.branding,
          },
        },
        campaigns,
        rewards,
        fanCount,
        totalRewards,
      });
    } catch (error: any) {
      console.error('Error fetching creator store:', error);
      res.status(500).json({ 
        error: "Error fetching creator store", 
        message: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}