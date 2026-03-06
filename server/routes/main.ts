/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-useless-escape */
import type { Express } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { storage } from '../core/storage';
import { db } from '../db';
/* eslint-disable */
import { registerSocialRoutes } from './social/social-routes';
import { registerKickOAuthRoutes } from './social/kick-oauth-routes';
import { registerPatreonOAuthRoutes } from './social/patreon-oauth-routes';
import { registerTenantRoutes } from './user/tenant-routes';
import { registerGoogleAuthRoutes } from './auth/google-routes';
import { registerAuthRoutes } from './auth/auth-routes';
import { registerAdminRoutes } from './admin/admin-routes';
import { registerAdminAnalyticsRoutes } from './admin/admin-analytics-routes';
import { registerMultiplierRoutes } from './admin/multiplier-routes';
import { registerTwitterVerificationRoutes } from './social/twitter-verification-routes';
import { registerReferralRoutes } from './points/referral-routes';
import { registerPointsRoutes } from './points/points-routes';
import { registerAdminPlatformTasksRoutes } from './tasks/admin-platform-tasks-routes';
import { registerPlatformPointsRoutes } from './points/platform-points-routes';
import { registerPlatformTaskRoutes } from './tasks/platform-task-routes';
import { registerFanDashboardRoutes } from './user/fan-dashboard-routes';
import { registerDashboardStatsRoutes } from './user/dashboard-stats-routes';
import { registerNotificationRoutes } from './user/notification-routes';
import { registerRedemptionRoutes } from './rewards/redemption-routes';
import { registerRewardManagementRoutes } from './rewards/reward-management-routes';
import { registerGdprRoutes } from './user/gdpr-routes';
import { registerProgramRoutes } from './programs/program-routes';
import { registerAnnouncementRoutes } from './media/announcement-routes';
import { registerAgencyRoutes } from './admin/agency-routes';
import { registerFacebookWebhooks } from '../webhooks/facebook-webhooks';
import { registerInstagramWebhooks } from '../webhooks/instagram-webhooks';
import { registerInstagramTaskRoutes } from './tasks/instagram-task-routes';
import { registerTwitterTaskRoutes } from './tasks/twitter-task-routes';
import { registerYouTubeTaskRoutes } from './tasks/youtube-task-routes';
import { registerSpotifyTaskRoutes } from './tasks/spotify-task-routes';
import { registerTikTokTaskRoutes } from './tasks/tiktok-task-routes';
import { registerQuizRoutes } from './tasks/quiz-routes';
import { registerReviewRoutes } from './tasks/review-routes';
import { registerVisitTrackingRoutes } from './tasks/visit-tracking-routes';
import { registerLeaderboardRoutes } from './programs/leaderboard-routes';
import { registerBetaSignupRoutes } from './beta-signup-routes';
import { registerVerificationAnalyticsRoutes } from './analytics/verification-analytics-routes';
import { registerSyncPreferencesRoutes } from './analytics/sync-preferences-routes';
import { registerCreatorAnalyticsRoutes } from './analytics/creator-analytics-routes';
import { registerCreatorActivityRoutes } from './analytics/creator-activity-routes';
import { registerHealthRoutes } from './health/health-routes';
import { registerParticleAuthRoutes } from './auth/particle-routes';
import { registerCampaignV2Routes } from './campaigns/campaign-routes-v2';
import { registerReputationRoutes } from './reputation/reputation-routes';
import { registerBlockchainRoutes } from './blockchain/blockchain-routes';
import { registerBadgeRoutes } from './blockchain/badge-routes';
import { registerStripeWebhookRoutes } from './stripe/stripe-webhook-routes';
import { errorHandler } from '../lib/api-errors';
import { getTierLimits, type SubscriptionTier } from '@shared/subscription-config';
import {
  insertUserSchema,
  insertCreatorSchema,
  insertLoyaltyProgramSchema,
  insertRewardSchema,
  insertFanProgramSchema,
  insertCampaignSchema,
  insertCampaignRuleSchema,
  insertTaskSchema,
  insertTaskAssignmentSchema,
  insertTaskTemplateSchema,
} from '@shared/schema';
import {
  CORE_TASK_TEMPLATES,
  PLATFORM_TASK_TYPES,
  twitterTaskSchema,
  facebookTaskSchema,
  instagramTaskSchema,
  youtubeTaskSchema,
  tiktokTaskSchema,
  spotifyTaskSchema,
} from '@shared/taskTemplates';
import {
  authenticateUser,
  requireRole,
  requireCustomerTier,
  requireAdminPermission,
  requireFandomlyAdmin,
  AuthenticatedRequest,
} from '../middleware/rbac';
import { standardApiLimiter, syncActionLimiter } from '../middleware/rate-limit';
import rateLimit from 'express-rate-limit';
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' },
});
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Multer configuration for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.path.includes('avatar')
      ? 'avatars'
      : req.path.includes('branding')
        ? 'branding'
        : 'images';
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
  },
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
  },
});

// Import upload routes
import uploadRoutes from './media/upload-routes';
import videoUploadRoutes from './media/video-upload-routes';
import socialConnectionRoutes from './social/social-connection-routes';
import creatorVerificationRoutes from './social/creator-verification-routes';
import { createAuditRoutes } from './admin/audit-routes';
import { getJWKS } from '../services/auth/jwt-service';

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Proxy images from Replit Object Storage
  app.get('/api/storage/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0]; // Get everything after /api/storage/
      const { getStorageClient } = await import('../core/storage-client');
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
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
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
      const { getStorageClient } = await import('../core/storage-client');
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
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
      };

      res.setHeader('Content-Type', contentTypes[ext || 'mp4'] || 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(videoBuffer);
    } catch (error) {
      console.error('Error serving video from storage:', error);
      res.status(500).json({ error: 'Failed to load video' });
    }
  });

  // JWKS endpoint for JWT validation
  app.get('/.well-known/jwks.json', (req, res) => {
    try {
      const jwks = getJWKS();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.json(jwks);
    } catch (error) {
      console.error('Error serving JWKS:', error);
      res.status(500).json({ error: 'Failed to generate JWKS' });
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

  // Register audit log routes (admin only)
  app.use('/api/audit-logs', createAuditRoutes(storage as any));

  // Check username availability
  app.get('/api/auth/check-username/:username', async (req, res) => {
    try {
      const { username } = req.params;

      // Validate username format
      if (!username || username.length < 3 || username.length > 30) {
        return res.status(400).json({
          available: false,
          error: 'Username must be between 3 and 30 characters',
        });
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return res.status(400).json({
          available: false,
          error: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
        });
      }

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);

      res.json({
        available: !existingUser,
        username,
        suggestions: existingUser
          ? [`${username}1`, `${username}_official`, `${username}.creator`, `${username}2025`]
          : [],
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
          error: 'Slug must be between 3 and 50 characters',
        });
      }

      // Check for invalid characters (lowercase, numbers, hyphens only)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({
          available: false,
          error: 'Slug can only contain lowercase letters, numbers, and hyphens',
        });
      }

      // Check if starts or ends with hyphen
      if (slug.startsWith('-') || slug.endsWith('-')) {
        return res.status(400).json({
          available: false,
          error: 'Slug cannot start or end with a hyphen',
        });
      }

      // Check if slug exists
      const existingTenant = await storage.getTenantBySlug(slug);

      res.json({
        available: !existingTenant,
        slug,
        suggestions: existingTenant
          ? [`${slug}-official`, `${slug}-creator`, `${slug}1`, `${slug}2025`]
          : [],
      });
    } catch (error) {
      console.error('Slug check error:', error);
      res.status(500).json({ available: false, error: 'Server error checking slug' });
    }
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const {
        userType,
        username: proposedUsername,
        email,
        avatar,
        walletAddress,
        walletChain,
      } = req.body;

      if (!proposedUsername && !email) {
        return res.status(400).json({ error: 'Username or email is required for registration' });
      }

      // Check if user exists by email
      if (email) {
        const userByEmail = await storage.getUserByEmail(email);
        if (userByEmail) {
          console.log('User found by email, returning:', userByEmail.id);
          return res.json(userByEmail);
        }
      }

      // Check if username is taken, and make it unique if necessary
      let username = proposedUsername || 'User';
      const existingUsername = await storage.getUserByUsername(username);

      if (existingUsername) {
        // Make username unique by appending random suffix
        username = `${username}_${Math.random().toString(36).substring(2, 8)}`;
        console.log('Username taken, using unique username:', username);
      }

      const userData = {
        username,
        email: email || undefined,
        avatar: avatar || null,
        walletAddress: walletAddress || '',
        walletChain: walletChain || '',
        userType: userType === 'creator' ? 'creator' : 'fan',
        role: (userType === 'creator' ? 'customer_admin' : 'customer_end_user') as
          | 'customer_admin'
          | 'customer_end_user',
      };

      const user = await storage.createUser(userData);
      console.log('Created new user:', user.id);

      // If user is a creator, auto-create their tenant
      if (userType === 'creator') {
        try {
          const username = userData.username || 'creator';
          const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${user.id.slice(-6)}`;

          const freeLimits = getTierLimits('free');
          const tenant = await storage.createTenant({
            slug: tenantSlug,
            name: `${username}'s Store`,
            ownerId: user.id,
            status: 'trial',
            subscriptionTier: 'free',
            branding: {
              primaryColor: '#8B5CF6',
              secondaryColor: '#06B6D4',
              accentColor: '#10B981',
            },
            businessInfo: {
              businessType: 'individual' as const,
            },
            limits: {
              maxMembers: freeLimits.maxMembers,
              maxCampaigns: freeLimits.maxCampaigns,
              maxRewards: freeLimits.maxRewards,
              maxApiCalls: freeLimits.maxApiCalls,
              storageLimit: freeLimits.storageLimit,
              customDomain: freeLimits.customDomain,
              advancedAnalytics: freeLimits.advancedAnalytics,
              whiteLabel: freeLimits.whiteLabel,
              maxTasks: freeLimits.maxTasks,
              maxSocialConnections: freeLimits.maxSocialConnections,
              maxPrograms: freeLimits.maxPrograms,
            },
            settings: {
              timezone: 'UTC',
              currency: 'USD',
              language: 'en',
              nilCompliance: false,
              publicProfile: true,
              allowRegistration: true,
              requireEmailVerification: false,
              enableSocialLogin: true,
            },
          });

          // Create initial tenant membership for the creator
          await storage.createTenantMembership({
            tenantId: tenant.id,
            userId: user.id,
            role: 'owner',
          });

          // Update user's current tenant
          await storage.updateUser(user.id, { currentTenantId: tenant.id });

          console.log('Created tenant for new creator:', tenant.id);
        } catch (error) {
          console.error('Failed to create tenant for creator:', error);
          // Continue even if tenant creation fails
        }
      }

      res.json(user);
    } catch (error) {
      console.error('User creation error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid user data' });
    }
  });

  // Set user type endpoint - called after OAuth when user selects their type
  app.post('/api/auth/set-user-type', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userType } = req.body;

      // Validate userType
      if (!userType || !['fan', 'creator', 'brand'].includes(userType)) {
        return res
          .status(400)
          .json({ error: "Invalid userType. Must be 'fan', 'creator', or 'brand'" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine the actual type and role
      // For 'brand' users, we store them as 'creator' type but with brandType metadata
      const actualUserType = userType === 'brand' ? 'creator' : userType;
      const role = actualUserType === 'creator' ? 'customer_admin' : 'customer_end_user';

      // Update user type and role
      await storage.updateUser(userId, {
        userType: actualUserType,
        role: role as 'customer_admin' | 'customer_end_user',
        ...(userType === 'brand'
          ? { profileData: { ...((user.profileData as object) || {}), isBrand: true } }
          : {}),
      } as any);

      // If user is a creator, auto-create their tenant
      if (actualUserType === 'creator' && !user.currentTenantId) {
        try {
          const username = user.username || 'creator';
          const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${userId.slice(-6)}`;

          const defaultLimits = getTierLimits('free');
          const tenant = await storage.createTenant({
            slug: tenantSlug,
            name: `${username}'s Store`,
            ownerId: userId,
            status: 'trial',
            subscriptionTier: 'free',
            branding: {
              primaryColor: '#8B5CF6',
              secondaryColor: '#06B6D4',
              accentColor: '#10B981',
            },
            businessInfo: {
              businessType: 'individual' as const,
            },
            limits: {
              maxMembers: defaultLimits.maxMembers,
              maxCampaigns: defaultLimits.maxCampaigns,
              maxRewards: defaultLimits.maxRewards,
              maxApiCalls: defaultLimits.maxApiCalls,
              storageLimit: defaultLimits.storageLimit,
              customDomain: defaultLimits.customDomain,
              advancedAnalytics: defaultLimits.advancedAnalytics,
              whiteLabel: defaultLimits.whiteLabel,
              maxTasks: defaultLimits.maxTasks,
              maxSocialConnections: defaultLimits.maxSocialConnections,
              maxPrograms: defaultLimits.maxPrograms,
            },
            settings: {
              timezone: 'UTC',
              currency: 'USD',
              language: 'en',
              nilCompliance: false,
              publicProfile: true,
              allowRegistration: true,
              requireEmailVerification: false,
              enableSocialLogin: true,
            },
          });

          // Create initial tenant membership for the creator
          await storage.createTenantMembership({
            tenantId: tenant.id,
            userId: userId,
            role: 'owner',
          });

          // Update user's current tenant
          await storage.updateUser(userId, { currentTenantId: tenant.id });

          console.log('Created tenant for new creator:', tenant.id);
        } catch (tenantError) {
          console.error('Failed to create tenant for creator:', tenantError);
          // Continue even if tenant creation fails
        }
      }

      // Get updated user
      const updatedUser = await storage.getUser(userId);

      console.log('User type set successfully:', { userId, userType: actualUserType, role });
      res.json(updatedUser);
    } catch (error) {
      console.error('Set user type error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to set user type' });
    }
  });

  // ================================================================
  // NEW: Unified creator type selection + auto-scaffold endpoint
  // Replaces the multi-step onboarding with a single atomic operation:
  //   1. Sets userType to 'creator'
  //   2. Creates tenant
  //   3. Creates creator record
  //   4. Creates draft program with smart defaults
  //   5. Marks onboarding as complete
  // ================================================================
  app.post(
    '/api/auth/set-creator-type',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const {
          creatorType,
          username: proposedUsername,
          subscriptionTier: requestedTier,
        } = req.body;

        // Validate creatorType
        if (!creatorType || !['athlete', 'musician', 'content_creator'].includes(creatorType)) {
          return res.status(400).json({
            error: "Invalid creatorType. Must be 'athlete', 'musician', or 'content_creator'",
          });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Import theme templates for smart defaults
        const { getThemeTemplate } = await import('@shared/theme-templates');

        // Creator type -> default theme mapping
        const themeMap: Record<string, string> = {
          athlete: 'dark-pro',
          musician: 'royal-purple',
          content_creator: 'gaming-rgb',
        };

        // Creator type -> points name suggestion
        const pointsNameMap: Record<string, string> = {
          athlete: 'Fan Points',
          musician: 'Fan Credits',
          content_creator: 'Community Points',
        };

        // Step 0: Update username if provided and valid
        if (proposedUsername && proposedUsername !== user.username) {
          if (proposedUsername.length < 3 || proposedUsername.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
          }
          if (!/^[a-zA-Z0-9_.-]+$/.test(proposedUsername)) {
            return res.status(400).json({
              error: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
            });
          }
          const existingByUsername = await storage.getUserByUsername(proposedUsername);
          if (existingByUsername && existingByUsername.id !== userId) {
            return res.status(400).json({ error: 'Username is already taken' });
          }
          await storage.updateUser(userId, { username: proposedUsername });
          user.username = proposedUsername;
        }

        // Step 1: Set userType to 'creator' and role to 'customer_admin'
        await storage.updateUser(userId, {
          userType: 'creator',
          role: 'customer_admin' as 'customer_admin',
          onboardingState: {
            currentStep: 1,
            totalSteps: 1,
            completedSteps: ['1'],
            isCompleted: true,
          },
        });

        // Step 2: Create tenant (if not already created)
        let tenantId = user.currentTenantId;
        if (!tenantId) {
          try {
            const username = user.username || 'creator';
            const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${userId.slice(-6)}`;

            // Resolve subscription tier and limits from shared config
            const validTiers: SubscriptionTier[] = [
              'free',
              'beginner',
              'rising',
              'allstar',
              'enterprise',
            ];
            const selectedTier: SubscriptionTier = validTiers.includes(requestedTier)
              ? requestedTier
              : 'free';
            const tierLimits = getTierLimits(selectedTier);

            const tenant = await storage.createTenant({
              slug: tenantSlug,
              name: `${username}'s Store`,
              ownerId: userId,
              status: 'trial',
              subscriptionTier: selectedTier,
              branding: {
                primaryColor: '#8B5CF6',
                secondaryColor: '#06B6D4',
                accentColor: '#10B981',
              },
              businessInfo: {
                businessType: 'individual' as const,
              },
              limits: {
                maxMembers: tierLimits.maxMembers,
                maxCampaigns: tierLimits.maxCampaigns,
                maxRewards: tierLimits.maxRewards,
                maxApiCalls: tierLimits.maxApiCalls,
                storageLimit: tierLimits.storageLimit,
                customDomain: tierLimits.customDomain,
                advancedAnalytics: tierLimits.advancedAnalytics,
                whiteLabel: tierLimits.whiteLabel,
                maxTasks: tierLimits.maxTasks,
                maxSocialConnections: tierLimits.maxSocialConnections,
                maxPrograms: tierLimits.maxPrograms,
              },
              settings: {
                timezone: 'UTC',
                currency: 'USD',
                language: 'en',
                nilCompliance: false,
                publicProfile: true,
                allowRegistration: true,
                requireEmailVerification: false,
                enableSocialLogin: true,
              },
            });

            tenantId = tenant.id;

            // Create initial tenant membership
            await storage.createTenantMembership({
              tenantId: tenant.id,
              userId: userId,
              role: 'owner',
            });

            // Update user's current tenant
            await storage.updateUser(userId, { currentTenantId: tenant.id });

            console.log('Created tenant for new creator:', tenant.id);
          } catch (tenantError) {
            console.error('Failed to create tenant for creator:', tenantError);
            return res.status(500).json({ error: 'Failed to create creator account' });
          }
        }

        // Step 3: Create creator record (if not already created)
        let creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          const displayName = (user.profileData as any)?.name || user.username || 'Creator';

          creator = await storage.createCreator({
            userId: userId,
            tenantId: tenantId,
            displayName: displayName,
            bio: '',
            category: creatorType,
            followerCount: 0,
            typeSpecificData: {},
            brandColors: {
              primary: '#8B5CF6',
              secondary: '#06B6D4',
              accent: '#10B981',
            },
            socialLinks: {},
          });

          console.log('Created creator record:', creator.id);
        } else {
          // Update creator category if it changed
          creator = await storage.updateCreator(creator.id, {
            category: creatorType,
          });
        }

        // Step 4: Create draft program with smart defaults (if none exists)
        const existingPrograms = await storage.getLoyaltyProgramsByCreator(creator.id);
        let program = existingPrograms[0];

        if (!program) {
          const displayName = creator.displayName || user.username || 'Creator';
          const defaultThemeId = themeMap[creatorType] || 'dark-pro';
          const defaultTheme = getThemeTemplate(defaultThemeId);
          const pointsName = pointsNameMap[creatorType] || 'Points';
          const programSlug = `${(user.username || 'creator').toLowerCase().replace(/[^a-z0-9]/g, '-')}-program`;

          program = await storage.createLoyaltyProgram({
            tenantId: tenantId,
            creatorId: creator.id,
            name: `${displayName}'s Program`,
            description: '',
            pointsName: pointsName,
            status: 'draft',
            isActive: false,
            slug: programSlug,
            pageConfig: {
              headerImage: undefined,
              logo: undefined,
              brandColors: defaultTheme
                ? {
                    primary: defaultTheme.colors.primary,
                    secondary: defaultTheme.colors.secondary,
                    accent: defaultTheme.colors.accent,
                  }
                : {
                    primary: '#8B5CF6',
                    secondary: '#06B6D4',
                    accent: '#10B981',
                  },
              theme: defaultTheme
                ? ({
                    ...defaultTheme,
                    mode: defaultTheme.mode ?? 'dark',
                  } as {
                    mode: 'light' | 'dark' | 'custom';
                    backgroundColor?: string;
                    textColor?: string;
                    templateId?: string;
                  })
                : {
                    mode: 'dark' as const,
                  },
              socialLinks: {},
              visibility: {
                showProfile: true,
                showCampaigns: true,
                showTasks: true,
                showRewards: true,
                showLeaderboard: true,
                showActivityFeed: true,
                showFanWidget: true,
                profileData: {
                  showBio: true,
                  showSocialLinks: true,
                  showTiers: true,
                  showVerificationBadge: true,
                  showLocation: true,
                  showWebsite: true,
                  showJoinDate: true,
                  showFollowerCount: true,
                },
              },
              creatorDetails: {},
            },
            tiers: [],
          });

          console.log('Created draft program:', program.id);
        }

        // Get the fully updated user
        const updatedUser = await storage.getUser(userId);

        console.log('Creator type set and scaffolded successfully:', {
          userId,
          creatorType,
          tenantId,
          creatorId: creator.id,
          programId: program.id,
        });

        res.json({
          ...updatedUser,
          creator,
          program,
        });
      } catch (error) {
        console.error('Set creator type error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to set creator type',
        });
      }
    }
  );

  // Complete onboarding endpoint with Stripe integration (LEGACY - kept for backward compatibility)
  app.post(
    '/api/auth/complete-onboarding',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Get user data from authenticated user
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required - user ID missing' });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
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
          aboutMe,
          mainContentPlatforms,
          primaryColor,
          secondaryColor,
          accentColor,
          bannerImage, // New field replacing social links
          subscriptionTier,
          location, // Add location field
          // Brand-specific fields
          brandType, // 'single' | 'agency'
          brandName, // Brand/Company Name
          brandWebsite, // Brand/Company Website
          brandDescription, // Brand/Company Description
          agencyName, // Agency Name (if applicable)
          agencyWebsite, // Agency Website (if applicable)
          brandIdentifiers, // Topics/categories for brand
          dataIsolationLevel, // 'strict' | 'aggregated' | 'shared'
        } = req.body;

        // Validate and update username if provided
        if (username && username !== user.username) {
          // Validate username format
          if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
          }

          if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            return res.status(400).json({
              error: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
            });
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
                graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
              },
              position: position || '',
              currentSponsors: currentSponsors
                ? currentSponsors.split(',').map((s: string) => s.trim())
                : [],
              nilCompliant: nilCompliant || false,
            },
          };
        } else if (creatorType === 'musician') {
          typeSpecificData = {
            musician: {
              bandArtistName: bandArtistName || '',
              musicCatalogUrl: musicCatalogUrl || '',
              artistType: artistType || 'independent',
              musicGenre: musicGenre || [],
            },
          };
        } else if (creatorType === 'content_creator') {
          // Combine topicsOfFocus and customTopics into a single array
          const allTopics = [
            ...(Array.isArray(topicsOfFocus) ? topicsOfFocus : []),
            ...(Array.isArray(customTopics) ? customTopics : []),
          ];

          typeSpecificData = {
            contentCreator: {
              aboutMe: aboutMe || undefined,
              contentType: Array.isArray(contentType)
                ? contentType
                : typeof contentType === 'string'
                  ? contentType.split(',').map((s) => s.trim())
                  : [],
              topicsOfFocus: allTopics, // Combined array of predefined and custom topics
              mainContentPlatforms: Array.isArray(mainContentPlatforms)
                ? mainContentPlatforms
                : typeof mainContentPlatforms === 'string'
                  ? mainContentPlatforms.split(',').map((s) => s.trim())
                  : [],
            },
          };
        } else if (creatorType === 'brand') {
          typeSpecificData = {
            brand: {
              brandName: brandName || '',
              brandWebsite: brandWebsite || '',
              brandDescription: brandDescription || '',
              brandType: brandType || 'single',
              agencyName: agencyName || undefined,
              agencyWebsite: agencyWebsite || undefined,
              brandIdentifiers: brandIdentifiers || [],
            },
          };
        }

        // Handle agency creation for brand users
        let agencyId = null;
        if (creatorType === 'brand' && brandType === 'agency' && agencyName) {
          try {
            const { db } = await import('../db');
            const { agencies } = await import('@shared/schema');

            const [agency] = await db
              .insert(agencies)
              .values({
                ownerUserId: userId,
                name: agencyName,
                website: agencyWebsite || null,
                businessInfo: {
                  companyType: 'agency',
                  primaryIndustry: brandIdentifiers?.[0] || undefined,
                },
                allowCrossBrandAnalytics: true,
                dataIsolationLevel: dataIsolationLevel || 'strict',
              })
              .returning();

            agencyId = agency.id;
            console.log(`✅ Created agency: ${agency.name} (ID: ${agency.id}) for user ${userId}`);
          } catch (error) {
            console.error('Failed to create agency during onboarding:', error);
            // Continue even if agency creation fails
          }
        }

        // Handle subscription and payment processing
        let stripeCustomerId = null;
        let stripeSubscriptionId = null;

        // Only process Stripe if configured and on paid plan
        if (subscriptionTier && subscriptionTier !== 'free' && process.env.STRIPE_SECRET_KEY) {
          // Create Stripe customer and subscription for paid plans
          try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-06-20' as any,
            });

            // Create Stripe customer
            const customer = await stripe.customers.create({
              email: user.email || `${user.id}@wallet.user`,
              name: displayName || name || 'Creator',
              metadata: {
                userId: user.id,
                creatorType: creatorType,
              },
            });

            stripeCustomerId = customer.id;

            // Note: In a real implementation, you'd create the subscription
            // after payment method is collected on the frontend
            // For now, we'll just store the customer ID
          } catch (stripeError) {
            console.error('Stripe customer creation error:', stripeError);
            // Continue with onboarding even if Stripe fails
          }
        } else if (subscriptionTier && subscriptionTier !== 'free') {
          console.log(
            '⚠️  Stripe not configured, skipping payment processing for subscription tier:',
            subscriptionTier
          );
        }

        // Update user onboarding state and profile data
        const userUpdateData: any = {
          username: username || user.username, // Update username
          profileData: {
            ...(user.profileData || {}),
            name: displayName || name || brandName, // Use brand name for brand users
            bio: bio || brandDescription || '',
            location: location || undefined,
            bannerImage: bannerImage || undefined,
            // Athlete-specific fields
            sport: sport || undefined,
            position: position || undefined,
            education:
              creatorType === 'athlete' && (typeSpecificData as any).athlete
                ? (typeSpecificData as any).athlete.education
                : undefined,
            // Musician-specific fields
            musicGenre: musicGenre || undefined,
            artistType: artistType || undefined,
            // Content Creator-specific fields
            aboutMe: aboutMe || undefined,
            contentType: contentType || undefined,
            mainContentPlatforms: Array.isArray(mainContentPlatforms)
              ? mainContentPlatforms
              : undefined,
            topicsOfFocus: Array.isArray(topicsOfFocus) ? topicsOfFocus : undefined,
            // Brand-specific fields
            brandName: brandName || undefined,
            brandWebsite: brandWebsite || undefined,
          } as any, // Type assertion to allow flexibility with profileData
          onboardingState: {
            currentStep: 3, // Updated to 3 steps (was 5)
            totalSteps: 3,
            completedSteps: ['1', '2', '3'],
            isCompleted: true,
          },
        };

        // Add brand type and agency ID for brand users
        if (creatorType === 'brand') {
          userUpdateData.brandType = brandType || 'single';
          if (agencyId) {
            userUpdateData.agencyId = agencyId;
          }
        }

        const updatedUser = await storage.updateUser(user.id, userUpdateData);

        // Update creator and tenant if user is a creator
        if (user.userType === 'creator') {
          // Get user's tenant
          const userTenants = await storage.getUserTenants(user.id);
          const tenant = userTenants[0];

          if (tenant) {
            // Build update data conditionally - store setup is now optional during onboarding
            // SECURITY: Never trust client-submitted subscriptionTier for paid tiers.
            // Paid tier upgrades ONLY happen via Stripe webhook after payment confirms.
            // During onboarding, always default to 'free'. User upgrades through Checkout.
            const safeTier = 'free';

            const updateData: any = {
              subscriptionTier: safeTier,
              limits: getTierLimits(safeTier as SubscriptionTier),
              businessInfo: {
                businessType: creatorType || tenant.businessInfo?.businessType || 'athlete',
                ...(creatorType === 'brand' && brandName ? { companyName: brandName } : {}),
              },
              settings: {
                timezone: tenant.settings?.timezone || 'UTC',
                currency: tenant.settings?.currency || 'USD',
                language: tenant.settings?.language || 'en',
                nilCompliance: nilCompliant || tenant.settings?.nilCompliance || false,
                publicProfile: tenant.settings?.publicProfile ?? true,
                allowRegistration: tenant.settings?.allowRegistration ?? true,
                requireEmailVerification: tenant.settings?.requireEmailVerification ?? false,
                enableSocialLogin: tenant.settings?.enableSocialLogin ?? true,
              },
            };

            // Only update name if provided (store setup optional)
            if (name || (creatorType === 'brand' && brandName)) {
              updateData.name = name || brandName;
            }

            // Only update branding if colors provided (store setup optional)
            if (primaryColor || secondaryColor || accentColor) {
              updateData.branding = {
                primaryColor: primaryColor || tenant.branding?.primaryColor || '#8B5CF6',
                secondaryColor: secondaryColor || tenant.branding?.secondaryColor || '#06B6D4',
                accentColor: accentColor || tenant.branding?.accentColor || '#10B981',
              };
            }

            // Only update billing info if Stripe customer created
            if (stripeCustomerId || stripeSubscriptionId) {
              updateData.billingInfo = {
                stripeCustomerId: stripeCustomerId || tenant.billingInfo?.stripeCustomerId,
                subscriptionId: stripeSubscriptionId || tenant.billingInfo?.subscriptionId,
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
              typeSpecificData: typeSpecificData,
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
                accent: accentColor || creator.brandColors?.accent || '#10B981',
              };
            }

            await storage.updateCreator(creator.id, creatorUpdate);
          } else if (tenant) {
            // Create creator profile if it doesn't exist (only if tenant exists)
            const creatorDisplayName =
              creatorType === 'brand'
                ? brandName || name || username || 'Brand'
                : displayName || name || username || 'Creator';

            await storage.createCreator({
              userId: user.id,
              tenantId: tenant.id,
              displayName: creatorDisplayName,
              bio: bio || brandDescription || '',
              category: creatorType || 'athlete',
              followerCount: parseInt(followerCount) || 0,
              typeSpecificData: typeSpecificData,
              brandColors: {
                primary: primaryColor || '#8B5CF6',
                secondary: secondaryColor || '#06B6D4',
                accent: accentColor || '#10B981',
              },
              socialLinks: {},
            });
          } else {
            console.error('⚠️  Cannot create creator profile: no tenant found for user', user.id);
          }
        }

        res.json(updatedUser);
      } catch (error) {
        console.error('Onboarding completion error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        res.status(500).json({
          error: 'Failed to complete onboarding',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  app.get('/api/auth/user/:userId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.params.userId;
      console.log('Fetching user by ID:', userId);
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found for ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      console.log('Found user:', user.id, 'type:', user.userType);

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
              console.error('Error fetching tenant for creator:', creator.id, tenantError);
              // Continue without tenant - it might not exist yet during onboarding
            }
          }
        } catch (creatorError) {
          console.error('Error fetching creator for user:', user.id, creatorError);
          // Continue without creator - it might not exist yet during onboarding
        }
      }

      const onboardingState = user.onboardingState || {
        currentStep: 0,
        totalSteps: user.userType === 'creator' ? 5 : 3,
        completedSteps: [],
        isCompleted: false,
      };

      res.json({
        ...user,
        creator,
        tenant,
        onboardingState,
        hasCompletedOnboarding:
          onboardingState.isCompleted || (user.userType === 'creator' && !!creator && !!tenant),
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // User type switching route
  app.post(
    '/api/auth/switch-user-type',
    authRateLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId, userType } = req.body;

        if (!userId || !userType || !['fan', 'creator'].includes(userType)) {
          return res.status(400).json({ error: 'Invalid user type or user ID' });
        }

        if (req.user?.id !== userId && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: 'Unauthorized to modify this user' });
        }

        const updatedUser = await storage.updateUserType(userId, userType);
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        // If switching to creator, create a tenant if they don't have one
        if (userType === 'creator' && !updatedUser.currentTenantId) {
          try {
            const username = updatedUser.username || 'creator';
            const tenantSlug = `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${updatedUser.id.slice(-6)}`;

            const switchLimits = getTierLimits('free');
            const tenant = await storage.createTenant({
              slug: tenantSlug,
              name: `${username}'s Store`,
              ownerId: updatedUser.id,
              status: 'trial',
              subscriptionTier: 'free',
              branding: {
                primaryColor: '#8B5CF6',
                secondaryColor: '#06B6D4',
                accentColor: '#10B981',
              },
              businessInfo: {
                businessType: 'individual' as const,
              },
              limits: {
                maxMembers: switchLimits.maxMembers,
                maxCampaigns: switchLimits.maxCampaigns,
                maxRewards: switchLimits.maxRewards,
                maxApiCalls: switchLimits.maxApiCalls,
                storageLimit: switchLimits.storageLimit,
                customDomain: switchLimits.customDomain,
                advancedAnalytics: switchLimits.advancedAnalytics,
                whiteLabel: switchLimits.whiteLabel,
                maxTasks: switchLimits.maxTasks,
                maxSocialConnections: switchLimits.maxSocialConnections,
                maxPrograms: switchLimits.maxPrograms,
              },
              settings: {
                timezone: 'UTC',
                currency: 'USD',
                language: 'en',
                nilCompliance: false,
                publicProfile: true,
                allowRegistration: true,
                requireEmailVerification: false,
                enableSocialLogin: true,
              },
            });

            // Create initial tenant membership for the creator
            await storage.createTenantMembership({
              tenantId: tenant.id,
              userId: updatedUser.id,
              role: 'owner',
            });

            // Update user's current tenant
            await storage.updateUser(updatedUser.id, { currentTenantId: tenant.id });

            console.log('Created tenant for user switching to creator:', tenant.id);
          } catch (error) {
            console.error('Failed to create tenant for user switching to creator:', error);
            // Continue even if tenant creation fails
          }
        }

        res.json({
          ...updatedUser,
          message: `Successfully switched to ${userType} account`,
        });
      } catch (error) {
        console.error('Error switching user type:', error);
        res.status(500).json({ error: 'Failed to switch user type' });
      }
    }
  );

  // Onboarding state management
  app.post(
    '/api/auth/update-onboarding',
    authRateLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId, onboardingState } = req.body;

        if (!userId || !onboardingState) {
          return res.status(400).json({ error: 'User ID and onboarding state required' });
        }

        if (req.user?.id !== userId && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: 'Unauthorized to modify this user' });
        }

        const updatedUser = await storage.updateOnboardingState(userId, onboardingState);
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating onboarding state:', error);
        res.status(500).json({ error: 'Failed to update onboarding state' });
      }
    }
  );

  // Role-based authentication route
  app.get('/api/auth/role', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user role' });
    }
  });

  // Profile route to check if user has completed onboarding
  app.get('/api/auth/profile', async (req, res) => {
    try {
      // For now, return a simple response
      // This will be enhanced when we implement proper JWT auth middleware on this route
      res.json({
        user: null,
        creator: null,
        hasCompletedOnboarding: false,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Switch user type endpoint
  app.patch(
    '/api/auth/user/:userId/switch-type',
    authRateLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        const { newUserType } = req.body;

        if (!['fan', 'creator'].includes(newUserType)) {
          return res.status(400).json({ error: 'Invalid user type' });
        }

        if (req.user?.id !== req.params.userId && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: 'Unauthorized to modify this user' });
        }

        const newRole = newUserType === 'creator' ? 'customer_admin' : 'customer_end_user';

        // Update user type and role
        const updatedUser = await storage.updateUser(userId, {
          userType: newUserType,
          role: newRole,
        });

        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(updatedUser);
      } catch (error) {
        console.error('Failed to switch user type:', error);
        res.status(500).json({ error: 'Failed to switch user type' });
      }
    }
  );

  // Creator routes (public creation for onboarding)
  app.post(
    '/api/creators',
    authenticateUser,
    requireRole(['customer_admin', 'fandomly_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('Creating creator with data:', req.body);
        const creatorData = insertCreatorSchema.parse(req.body);
        const creator = await storage.createCreator(creatorData);
        res.json(creator);
      } catch (error) {
        console.error('Creator creation error:', error);
        res
          .status(400)
          .json({ error: error instanceof Error ? error.message : 'Invalid creator data' });
      }
    }
  );

  app.get('/api/creators', async (req, res) => {
    try {
      const creators = await storage.getAllCreators();
      console.log(`📊 GET /api/creators - Fetched ${creators.length} creators from database`);

      // Enrich with active campaign info, task counts, and user/tenant data
      // Wrap each enrichment in try-catch to ensure ALL creators are returned
      const enriched = await Promise.all(
        creators.map(async (c) => {
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
              // Debug log for image data
              if (user && c.displayName === 'Shea Curran') {
                console.log(`🖼️ Image data for ${c.displayName}:`, {
                  userId: c.userId,
                  hasUser: !!user,
                  hasProfileData: !!user.profileData,
                  avatar: user.profileData?.avatar,
                  bannerImage: user.profileData?.bannerImage,
                  creatorImageUrl: c.imageUrl,
                });
              }
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

            // Get creator's program (single source of truth for fan-facing data)
            let hasPublishedProgram = false;
            let program = null;
            try {
              const { loyaltyPrograms } = await import('@shared/schema');
              const { eq, and, desc } = await import('drizzle-orm');
              const db = (await import('../db')).db;

              // Get the most recent program for this creator
              const programs = await db
                .select()
                .from(loyaltyPrograms)
                .where(eq(loyaltyPrograms.creatorId, c.id))
                .orderBy(desc(loyaltyPrograms.createdAt))
                .limit(1);

              if (programs.length > 0) {
                program = programs[0];
                hasPublishedProgram = program.status === 'published';
              }
            } catch (programError) {
              console.warn(`Failed to check programs for creator ${c.id}:`, programError);
            }

            // Build response using program as canonical source, falling back to creator/user data
            const pageConfig = (program?.pageConfig as any) || {};
            return {
              ...c,
              // Program is the single source of truth for fan-facing data
              displayName: program?.name || c.displayName,
              bio: program?.description || c.bio,
              imageUrl: pageConfig.logo || c.imageUrl,
              brandColors: pageConfig.brandColors || c.brandColors,
              socialLinks: pageConfig.socialLinks || c.socialLinks,
              hasActiveCampaign: activeCampaigns.length > 0,
              activeCampaignsCount: activeCampaigns.length,
              publishedTasksCount: publishedTasks.length,
              isLive: activeCampaigns.length > 0 || publishedTasks.length > 0,
              hasPublishedProgram,
              program: program
                ? {
                    id: program.id,
                    name: program.name,
                    slug: program.slug,
                    status: program.status,
                    pointsName: program.pointsName,
                    pageConfig: program.pageConfig,
                  }
                : null,
              user: user ? { username: user.username, profileData: user.profileData } : null,
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
              hasPublishedProgram: false,
              user: null,
              tenant: null,
            };
          }
        })
      );

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
      res.status(500).json({ error: 'Failed to fetch creators' });
    }
  });

  app.get('/api/creators/:id', async (req, res) => {
    try {
      // For public creator info, we don't require tenant isolation yet
      // But this should be considered for private creator data
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch creator' });
    }
  });

  // Update creator profile (authenticated)
  app.put('/api/creators/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Verify the creator belongs to this user
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      if (creator.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update this creator' });
      }

      // Extract update fields
      const { displayName, bio, imageUrl, storeColors, typeSpecificData, publicFields } = req.body;

      const updates: any = {};

      if (displayName !== undefined) updates.displayName = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (storeColors !== undefined) updates.storeColors = storeColors;
      if (typeSpecificData !== undefined) updates.typeSpecificData = typeSpecificData;
      if (publicFields !== undefined) updates.publicFields = publicFields;

      const updatedCreator = await storage.updateCreator(id, updates);
      res.json(updatedCreator);
    } catch (error) {
      console.error('Creator update error:', error);
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to update creator' });
    }
  });

  // Get public creator page data (no auth required)
  app.get('/api/creators/public/:creatorUrl', async (req, res) => {
    try {
      const { creatorUrl } = req.params;

      // First try to find by tenant slug
      const tenant = await storage.getTenantBySlug(creatorUrl);
      if (!tenant) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get creator by tenant ID - get all creators for this tenant
      const allCreators = await storage.getAllCreators();
      const creators = allCreators.filter((c) => c.tenantId === tenant.id);
      if (!creators || creators.length === 0) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      const creator = creators[0]; // Primary creator for this tenant

      // Get user data
      const user = await storage.getUser(creator.userId);
      if (!user) {
        return res.status(404).json({ error: 'Creator user not found' });
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
            profileData: user.profileData,
          },
          tenant: {
            slug: tenant.slug,
            branding: tenant.branding,
          },
        },
        tasks: publishedTasks,
        campaigns: activeCampaigns,
        fanCount,
        stats: {
          activeCampaigns: activeCampaigns.length,
          totalRewards: 0, // TODO: Calculate from completions
          engagementRate: undefined,
        },
      });
    } catch (error) {
      console.error('Public creator page error:', error);
      res.status(500).json({ error: 'Failed to fetch creator data' });
    }
  });

  // Update creator public page settings (authenticated)
  app.patch(
    '/api/creators/:id/public-settings',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User ID required' });
        }

        // Verify the creator belongs to this user
        const creator = await storage.getCreator(id);
        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        if (creator.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized to update this creator' });
        }

        // Update public page settings
        const { publicPageSettings } = req.body;
        if (!publicPageSettings) {
          return res.status(400).json({ error: 'Public page settings required' });
        }

        const updatedCreator = await storage.updateCreator(id, {
          publicPageSettings,
        });

        res.json(updatedCreator);
      } catch (error) {
        console.error('Public settings update error:', error);
        res
          .status(400)
          .json({ error: error instanceof Error ? error.message : 'Failed to update settings' });
      }
    }
  );

  app.get('/api/creators/user/:userId', async (req, res) => {
    try {
      const creator = await storage.getCreatorByUserId(req.params.userId);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }
      res.json(creator);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch creator' });
    }
  });

  // Loyalty program routes
  app.post('/api/loyalty-programs', async (req, res) => {
    try {
      const programData = insertLoyaltyProgramSchema.parse(req.body);
      const program = await storage.createLoyaltyProgram(programData);
      res.json(program);
    } catch (error) {
      console.error('Loyalty program creation error:', error);
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Invalid program data' });
    }
  });

  app.get('/api/loyalty-programs/creator/:creatorId', async (req, res) => {
    try {
      const programs = await storage.getLoyaltyProgramsByCreator(req.params.creatorId);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch loyalty programs' });
    }
  });

  app.get('/api/loyalty-programs/:id', async (req, res) => {
    try {
      const program = await storage.getLoyaltyProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ error: 'Loyalty program not found' });
      }
      res.json(program);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch loyalty program' });
    }
  });

  // =====================================
  // TASK MANAGEMENT API ROUTES
  // NOTE: Task routes have been moved to /server/task-routes.ts
  // =====================================

  // =====================================
  // TASK TEMPLATE API ROUTES
  // =====================================

  // Get task templates (with core templates + tenant-specific)
  app.get('/api/task-templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get creator profile to ensure they can access tasks
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required to access tasks' });
      }

      const tasks = await storage.getTasks(creator.id, creator.tenantId);

      // Transform database field names to client field names for compatibility
      const transformedTasks = tasks.map((task) => ({
        ...task,
        points: task.pointsToReward,
        settings: task.customSettings,
      }));

      res.json(transformedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get specific task template
  app.get('/api/task-templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      const template = await storage.getTaskTemplate(req.params.id, creator.tenantId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Failed to fetch task template:', error);
      res.status(500).json({ error: 'Failed to fetch task template' });
    }
  });

  // Create custom task template
  app.post('/api/task-templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      // Validate request body
      const templateData = insertTaskTemplateSchema.parse(req.body);

      // Validate platform/taskType consistency
      const platformPrefix = templateData.platform;
      const expectedPrefix = templateData.taskType.split('_')[0];
      if (platformPrefix !== expectedPrefix) {
        return res.status(400).json({
          error: `Task type '${templateData.taskType}' is not valid for platform '${templateData.platform}'`,
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
            return res
              .status(400)
              .json({ error: `Unsupported platform: ${templateData.platform}` });
        }
      } catch (validationError) {
        return res.status(400).json({
          error: 'Invalid platform configuration',
          details:
            validationError instanceof Error
              ? validationError.message
              : 'Configuration validation failed',
        });
      }

      // Set tenant context for custom templates (force isGlobal=false for non-admin)
      const templateWithContext = {
        ...templateData,
        tenantId: creator.tenantId,
        creatorId: creator.id,
        isGlobal: false, // Regular users cannot create global templates
        defaultConfig: configValidation as any,
      };

      const template = await storage.createTaskTemplate(templateWithContext);
      res.json(template);
    } catch (error) {
      console.error('Failed to create task template:', error);
      if (error instanceof Error && error.message.includes('parse')) {
        res.status(400).json({ error: 'Invalid template data' });
      } else {
        res.status(500).json({ error: 'Failed to create task template' });
      }
    }
  });

  // Update task template (only owner can update)
  app.put('/api/task-templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      // Validate request body - whitelist safe fields only
      const fullUpdate = insertTaskTemplateSchema.partial().parse(req.body);
      const updates = {
        name: fullUpdate.name,
        description: fullUpdate.description,
        defaultConfig: fullUpdate.defaultConfig,
        isActive: fullUpdate.isActive,
      };
      // Remove undefined fields
      Object.keys(updates).forEach((key) => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      // If updating platform configuration, validate it using existing template's platform
      if (updates.defaultConfig) {
        const existingTemplate = await storage.getTaskTemplate(req.params.id, creator.tenantId);
        if (!existingTemplate) {
          return res.status(404).json({ error: 'Template not found' });
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
        return res.status(404).json({ error: 'Template not found or permission denied' });
      }

      res.json(template);
    } catch (error) {
      console.error('Failed to update task template:', error);
      res.status(500).json({ error: 'Failed to update task template' });
    }
  });

  // Delete task template (only owner can delete)
  app.delete(
    '/api/task-templates/:id',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        await storage.deleteTaskTemplate(req.params.id, creator.tenantId);
        res.json({ success: true, message: 'Template deleted successfully' });
      } catch (error) {
        console.error('Failed to delete task template:', error);
        res.status(500).json({ error: 'Failed to delete task template' });
      }
    }
  );

  // Get platform-specific task types for UI (authenticated)
  app.get(
    '/api/platforms/:platform/task-types',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const platform = req.params.platform;
        const taskTypes = PLATFORM_TASK_TYPES[platform as keyof typeof PLATFORM_TASK_TYPES];

        if (!taskTypes) {
          return res.status(404).json({ error: 'Platform not found' });
        }

        res.json(taskTypes);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task types' });
      }
    }
  );

  // Publish campaign (with task validation)
  app.post(
    '/api/campaigns/:campaignId/publish',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        // Validate campaign belongs to creator before publishing
        const campaigns = await storage.getCampaignsByCreator(creator.id, creator.tenantId);
        const existingCampaign = campaigns.find((c) => c.id === req.params.campaignId);
        if (!existingCampaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = await storage.publishCampaign(req.params.campaignId, creator.tenantId);
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({
          campaign,
          message: 'Campaign published successfully',
        });
      } catch (error) {
        console.error('Campaign publishing error:', error);
        if (error instanceof Error && error.message.includes('at least 1 task')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to publish campaign' });
        }
      }
    }
  );

  // Sprint 6: Validate campaign prerequisites (check if user can participate)
  app.post(
    '/api/campaigns/:campaignId/validate-prerequisites',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const campaignId = req.params.campaignId;

        // Call the validation function from the database
        const result = await db.execute(sql`
        SELECT * FROM validate_campaign_prerequisites(${userId}, ${campaignId})
      `);

        const validation = result.rows[0];

        if (!validation) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({
          canParticipate: validation.can_participate,
          missingPrerequisites: validation.missing_prerequisites,
        });
      } catch (error) {
        console.error('Failed to validate campaign prerequisites:', error);
        res.status(500).json({ error: 'Failed to validate prerequisites' });
      }
    }
  );

  // Get pending campaigns (campaigns waiting for tasks)
  app.get('/api/campaigns/pending', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      const campaigns = await storage.getPendingCampaigns(creator.id, creator.tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error('Failed to fetch pending campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch pending campaigns' });
    }
  });

  // ================================================================
  // One-tap join: Follow tenant + Enroll in program in a single call
  // Simplifies fan onboarding and creator card join buttons
  // ================================================================
  app.post(
    '/api/fan-programs/join-creator/:creatorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { creatorId } = req.params;
        const { loyaltyPrograms } = await import('@shared/schema');
        const { eq, and, desc } = await import('drizzle-orm');

        // Get creator's most recent published (or any) program
        const [program] = await db
          .select()
          .from(loyaltyPrograms)
          .where(eq(loyaltyPrograms.creatorId, creatorId))
          .orderBy(desc(loyaltyPrograms.createdAt))
          .limit(1);

        if (!program) {
          return res.status(404).json({ error: 'Creator has no program yet' });
        }

        // Step 1: Follow tenant (create membership if not exists)
        try {
          await storage.createTenantMembership({
            tenantId: program.tenantId,
            userId: userId,
            role: 'member',
          });
        } catch (err: any) {
          // Ignore duplicate membership errors
          if (!err.message?.includes('duplicate') && !err.message?.includes('already')) {
            console.warn('Follow error:', err.message);
          }
        }

        // Step 2: Enroll in program (if not already enrolled)
        const existing = await storage.getFanProgram(userId, program.id);
        if (existing) {
          return res.json({
            ...existing,
            message: 'Already joined this program',
            program: { id: program.id, name: program.name, slug: program.slug },
          });
        }

        const fanProgram = await storage.createFanProgram({
          fanId: userId,
          tenantId: program.tenantId,
          programId: program.id,
        });

        res.json({
          ...fanProgram,
          program: { id: program.id, name: program.name, slug: program.slug },
        });
      } catch (error) {
        console.error('One-tap join error:', error);
        res
          .status(500)
          .json({ error: error instanceof Error ? error.message : 'Failed to join creator' });
      }
    }
  );

  // Fan program routes
  app.post('/api/fan-programs', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      // Use authenticated user ID as fanId
      const fanProgramData = insertFanProgramSchema.parse({
        ...req.body,
        fanId: userId, // Override any fanId in body with authenticated user ID
      });

      // Check if fan is already enrolled
      const existing = await storage.getFanProgram(fanProgramData.fanId, fanProgramData.programId);
      if (existing) {
        return res.status(400).json({ error: 'Fan already enrolled in this program' });
      }

      const fanProgram = await storage.createFanProgram(fanProgramData);
      res.json(fanProgram);
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Invalid fan program data' });
    }
  });

  app.get(
    '/api/fan-programs/user/:fanId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.params.fanId !== req.user?.id && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: "Unauthorized to view this user's programs" });
        }

        const { db } = await import('../db');
        const { eq } = await import('drizzle-orm');
        const { fanPrograms: fanProgramsTable, loyaltyPrograms } = await import('@shared/schema');

        // Fetch fan programs with program details including creatorId
        const fanProgramsWithDetails = await db
          .select({
            fanProgram: fanProgramsTable,
            program: loyaltyPrograms,
          })
          .from(fanProgramsTable)
          .leftJoin(loyaltyPrograms, eq(fanProgramsTable.programId, loyaltyPrograms.id))
          .where(eq(fanProgramsTable.fanId, req.params.fanId));

        // Transform to include creatorId at top level for easy access
        const enrichedFanPrograms = fanProgramsWithDetails.map(({ fanProgram, program }) => ({
          ...fanProgram,
          creatorId: program?.creatorId,
          programName: program?.name,
          programSlug: program?.slug,
          totalPoints: fanProgram.totalPointsEarned || 0,
          joinedAt: fanProgram.joinedAt,
        }));

        console.log(
          `[API] Returning ${enrichedFanPrograms.length} fan programs for user ${req.params.fanId}`
        );
        res.json(enrichedFanPrograms);
      } catch (error) {
        console.error('Failed to fetch fan programs:', error);
        res.status(500).json({ error: 'Failed to fetch fan programs' });
      }
    }
  );

  // Get all fans enrolled in a specific program (for creator dashboard)
  app.get('/api/fan-programs/program/:programId', async (req, res) => {
    try {
      const { db } = await import('../db');
      const { eq } = await import('drizzle-orm');
      const { fanPrograms: fanProgramsTable, users } = await import('@shared/schema');

      // Fetch all fans enrolled in this program with user details
      const fansInProgram = await db
        .select({
          fanProgram: fanProgramsTable,
          user: users,
        })
        .from(fanProgramsTable)
        .leftJoin(users, eq(fanProgramsTable.fanId, users.id))
        .where(eq(fanProgramsTable.programId, req.params.programId));

      // Transform to return fan data with enrollment info
      const enrichedFans = fansInProgram.map(({ fanProgram, user }) => ({
        id: fanProgram.id,
        fanId: fanProgram.fanId,
        programId: fanProgram.programId,
        joinedAt: fanProgram.joinedAt,
        currentPoints: fanProgram.currentPoints || 0,
        totalPointsEarned: fanProgram.totalPointsEarned || 0,
        currentTier: fanProgram.currentTier,
        username: user?.username,
        email: user?.email,
        fullName: user?.username,
        avatar: user?.avatar,
      }));

      console.log(
        `[API] Returning ${enrichedFans.length} fans for program ${req.params.programId}`
      );
      res.json(enrichedFans);
    } catch (error) {
      console.error('Failed to fetch fans for program:', error);
      res.status(500).json({ error: 'Failed to fetch fans for program' });
    }
  });

  // Point transaction routes
  app.get('/api/point-transactions/fan-program/:fanProgramId', async (req, res) => {
    try {
      const transactions = await storage.getPointTransactionsByFanProgram(req.params.fanProgramId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch point transactions' });
    }
  });

  // Reward redemption routes
  app.get('/api/reward-redemptions/user/:fanId', async (req, res) => {
    try {
      const redemptions = await storage.getRewardRedemptionsByUser(req.params.fanId);
      res.json(redemptions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reward redemptions' });
    }
  });

  app.get('/api/reward-redemptions/program/:programId', async (req, res) => {
    try {
      const redemptions = await storage.getRewardRedemptionsByProgram(req.params.programId);
      res.json(redemptions);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching reward redemptions for program:', err?.message ?? error);
      res.status(500).json({ error: 'Failed to fetch reward redemptions for program' });
    }
  });

  // Admin routes for user management
  app.get(
    '/api/admin/users',
    authenticateUser,
    requireRole(['fandomly_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        // In production, implement pagination and filtering
        const users = await storage.getAllUsers();

        // Filter out PII for GDPR/CCPA compliance
        const sanitizedUsers = users.map((user) => ({
          id: user.id,
          username: user.username,
          userType: user.userType,
          role: user.role,
          customerTier: user.customerTier,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Exclude: email, walletAddress, walletChain, profileData (contains PII)
        }));

        res.json(sanitizedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    }
  );

  app.put(
    '/api/admin/users/:userId/role',
    authenticateUser,
    requireRole(['fandomly_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        const { role, customerTier } = req.body;

        if (!['fandomly_admin', 'customer_admin', 'customer_end_user'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        const updateData: any = { role };
        if (role === 'customer_end_user' && customerTier) {
          updateData.customerTier = customerTier;
        }

        const updatedUser = await storage.updateUser(userId, updateData);
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
      }
    }
  );

  // Stripe Payment Routes - Using javascript_stripe integration

  // Stripe payment intent for one-time payments
  app.post(
    '/api/create-payment-intent',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { amount, currency = 'usd' } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: 'Invalid amount' });
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-06-20' as any,
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
          paymentIntentId: paymentIntent.id,
        });
      } catch (error: any) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({
          error: 'Error creating payment intent',
          message: error.message,
        });
      }
    }
  );

  // Get or create subscription for authenticated user
  app.post(
    '/api/get-or-create-subscription',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user from our database
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-06-20' as any,
        });

        // Get user's tenant to check existing billing info
        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];

        // Check if user already has active subscription
        if (tenant?.billingInfo?.subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              tenant.billingInfo.subscriptionId
            );

            if (subscription.status === 'active' || subscription.status === 'trialing') {
              const latestInvoice = subscription.latest_invoice;
              const paymentIntent =
                typeof latestInvoice === 'object' && latestInvoice
                  ? (latestInvoice as any).payment_intent
                  : null;
              return res.json({
                subscriptionId: subscription.id,
                clientSecret:
                  typeof paymentIntent === 'object' && paymentIntent
                    ? paymentIntent.client_secret
                    : null,
                status: subscription.status,
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
            email: user.email || `${user.id}@wallet.user`,
            name: user.username || 'Creator',
            metadata: {
              userId: user.id,
              tenantId: tenant?.id || '',
            },
          });
          customerId = customer.id;
        }

        // Create subscription with default price (you can customize this)
        const { priceId = process.env.STRIPE_DEFAULT_PRICE_ID } = req.body;

        if (!priceId) {
          return res.status(400).json({
            error: 'No price ID provided and STRIPE_DEFAULT_PRICE_ID not configured',
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
              subscriptionId: subscription.id,
            },
          });
        }

        const latestInvoice = subscription.latest_invoice;
        const paymentIntent =
          typeof latestInvoice === 'object' && latestInvoice
            ? (latestInvoice as any).payment_intent
            : null;
        res.json({
          subscriptionId: subscription.id,
          clientSecret:
            typeof paymentIntent === 'object' && paymentIntent ? paymentIntent.client_secret : null,
          status: subscription.status,
        });
      } catch (error: any) {
        console.error('Subscription creation error:', error);
        res.status(500).json({
          error: 'Error creating subscription',
          message: error.message,
        });
      }
    }
  );

  // Get subscription status
  app.get('/api/subscription-status', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json({ status: 'no_subscription' });

      const user = await storage.getUser(userId);
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
        apiVersion: '2024-06-20' as any,
      });

      const subscription = await stripe.subscriptions.retrieve(tenant.billingInfo.subscriptionId);

      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: subscription.items.data[0]?.price?.nickname || 'Unknown Plan',
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({
        error: 'Error fetching subscription status',
        message: error.message,
      });
    }
  });

  // Get subscription details with live usage counts
  app.get('/api/subscription-details', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await storage.getUser(userId);
      if (!user?.currentTenantId) {
        return res.json({ tier: 'free', limits: getTierLimits('free'), usage: {} });
      }

      const { checkSubscriptionLimit } = await import('../services/subscription-limit-service');

      const [tenant] = await db
        .select()
        .from((await import('@shared/schema')).tenants)
        .where(
          (await import('drizzle-orm')).eq(
            (await import('@shared/schema')).tenants.id,
            user.currentTenantId
          )
        )
        .limit(1);

      if (!tenant) {
        return res.json({ tier: 'free', limits: getTierLimits('free'), usage: {} });
      }

      const tier = (tenant.subscriptionTier as SubscriptionTier) || 'free';
      const tierLimits = getTierLimits(tier);

      // Get live usage counts
      const [tasksResult, campaignsResult, programsResult, socialsResult] = await Promise.all([
        checkSubscriptionLimit(user.currentTenantId, 'tasks'),
        checkSubscriptionLimit(user.currentTenantId, 'campaigns'),
        checkSubscriptionLimit(user.currentTenantId, 'programs'),
        checkSubscriptionLimit(user.currentTenantId, 'socialConnections'),
      ]);

      res.json({
        tier,
        tierName: (await import('@shared/subscription-config')).getTierDefinition(tier).name,
        limits: tierLimits,
        usage: {
          tasks: tasksResult.current,
          campaigns: campaignsResult.current,
          programs: programsResult.current,
          socialConnections: socialsResult.current,
          members: (tenant.usage as any)?.currentMembers ?? 0,
        },
        billingInfo: tenant.billingInfo || null,
      });
    } catch (error: any) {
      console.error('Subscription details error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
  });

  // ─── Stripe Subscription Management ──────────────────────────────

  // Create Checkout Session for new subscription or upgrade
  app.post(
    '/api/stripe/create-checkout-session',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { tier } = req.body;
        if (!tier || tier === 'free' || tier === 'enterprise') {
          return res.status(400).json({ error: 'Invalid tier for checkout' });
        }

        const { getStripe, getPriceIdForTier } = await import('../services/stripe-service');
        const stripe = getStripe();

        const priceId = getPriceIdForTier(tier);
        if (!priceId) {
          return res.status(400).json({ error: `No Stripe price configured for tier: ${tier}` });
        }

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];

        // Get or create Stripe customer
        let customerId = tenant?.billingInfo?.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            name: user.username || 'Creator',
            metadata: { userId: user.id, tenantId: tenant?.id || '' },
          });
          customerId = customer.id;

          // Store customer ID
          if (tenant) {
            await storage.updateTenant(tenant.id, {
              billingInfo: { ...tenant.billingInfo, stripeCustomerId: customerId },
            });
          }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${baseUrl}/creator-dashboard/subscriptions?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancel_url: `${baseUrl}/creator-dashboard/subscriptions?canceled=true`,
          metadata: {
            tenantId: tenant?.id || '',
            userId: user.id,
            tier,
          },
          subscription_data: {
            metadata: {
              tenantId: tenant?.id || '',
              userId: user.id,
              tier,
            },
          },
        });

        res.json({ url: session.url });
      } catch (error: any) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
      }
    }
  );

  // Create Billing Portal session (manage payment methods, invoices, cancel)
  app.post(
    '/api/stripe/create-portal-session',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const customerId = tenant?.billingInfo?.stripeCustomerId;

        if (!customerId) {
          return res
            .status(400)
            .json({ error: 'No billing account found. Subscribe to a plan first.' });
        }

        const { createBillingPortalSession } = await import('../services/stripe-service');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const session = await createBillingPortalSession(
          customerId,
          `${baseUrl}/creator-dashboard/subscriptions`
        );

        res.json({ url: session.url });
      } catch (error: any) {
        console.error('Portal session error:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
      }
    }
  );

  // Change subscription (upgrade/downgrade with proration)
  app.post(
    '/api/stripe/change-subscription',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { tier } = req.body;
        if (!tier || tier === 'enterprise') {
          return res.status(400).json({ error: 'Invalid tier' });
        }

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const subscriptionId = tenant?.billingInfo?.subscriptionId;

        if (!subscriptionId) {
          return res.status(400).json({ error: 'No active subscription to change' });
        }

        // Free tier = cancel subscription
        if (tier === 'free') {
          const { getStripe } = await import('../services/stripe-service');
          const stripe = getStripe();
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });
          return res.json({ success: true, message: 'Subscription will cancel at period end' });
        }

        const { getStripe, getPriceIdForTier } = await import('../services/stripe-service');
        const stripe = getStripe();

        const newPriceId = getPriceIdForTier(tier);
        if (!newPriceId) {
          return res.status(400).json({ error: `No Stripe price configured for tier: ${tier}` });
        }

        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentItemId = subscription.items.data[0]?.id;

        if (!currentItemId) {
          return res.status(400).json({ error: 'Subscription has no items' });
        }

        // Update with proration
        const updated = await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: 'create_prorations',
          // Cancel the pending cancellation if upgrading
          cancel_at_period_end: false,
        });

        // NOTE: Tier change in DB is handled by webhook (customer.subscription.updated)
        // We don't update tier here to maintain webhook-first architecture

        res.json({
          success: true,
          subscriptionId: updated.id,
          status: updated.status,
          message: 'Subscription updated. Changes will be reflected shortly.',
        });
      } catch (error: any) {
        console.error('Subscription change error:', error);
        res.status(500).json({ error: 'Failed to change subscription' });
      }
    }
  );

  // Cancel subscription at period end
  app.post(
    '/api/stripe/cancel-subscription',
    syncActionLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userTenants = await storage.getUserTenants(user.id);
        const tenant = userTenants[0];
        const subscriptionId = tenant?.billingInfo?.subscriptionId;

        if (!subscriptionId) {
          return res.status(400).json({ error: 'No active subscription to cancel' });
        }

        const { getStripe } = await import('../services/stripe-service');
        const stripe = getStripe();

        const updated = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        res.json({
          success: true,
          cancelAt: updated.cancel_at
            ? new Date((updated.cancel_at as number) * 1000).toISOString()
            : null,
          message: 'Subscription will cancel at the end of the current billing period.',
        });
      } catch (error: any) {
        console.error('Subscription cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
      }
    }
  );

  // List past invoices
  app.get('/api/stripe/invoices', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const userTenants = await storage.getUserTenants(user.id);
      const tenant = userTenants[0];
      const customerId = tenant?.billingInfo?.stripeCustomerId;

      if (!customerId) {
        return res.json({ invoices: [] });
      }

      const { getStripe } = await import('../services/stripe-service');
      const stripe = getStripe();

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });

      res.json({
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due ? (inv.amount_due / 100).toFixed(2) : '0.00',
          currency: inv.currency,
          date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
        })),
      });
    } catch (error: any) {
      console.error('Invoice list error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Register authentication routes (Google OAuth and general auth)
  registerGoogleAuthRoutes(app);
  registerAuthRoutes(app);

  // Register Particle Network auth routes (feature-flagged via env vars)
  registerParticleAuthRoutes(app);

  // Register social media routes (includes Instagram webhooks)
  registerSocialRoutes(app);

  // Register new platform OAuth routes
  registerKickOAuthRoutes(app);
  registerPatreonOAuthRoutes(app);

  // Register Facebook webhooks (Pages and Users)
  registerFacebookWebhooks(app);

  // Register Instagram webhook management API
  registerInstagramWebhooks(app);

  // Register Instagram task API routes
  registerInstagramTaskRoutes(app);

  // Register social media task verification routes
  registerTwitterTaskRoutes(app);
  registerYouTubeTaskRoutes(app);
  registerSpotifyTaskRoutes(app);
  registerTikTokTaskRoutes(app);

  // Register quiz/poll, review queue, and website visit tracking routes
  registerQuizRoutes(app);
  registerReviewRoutes(app);
  registerVisitTrackingRoutes(app);

  // Register tenant routes
  registerTenantRoutes(app);

  // Register admin routes
  registerAdminRoutes(app);
  registerAdminAnalyticsRoutes(app);
  registerMultiplierRoutes(app);

  // Dynamic Analytics routes removed — replaced by admin analytics

  // Register Twitter verification routes
  registerTwitterVerificationRoutes(app);

  // Register referral routes
  registerReferralRoutes(app);

  // Register points routes
  registerPointsRoutes(app);

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

  // Register aggregated dashboard stats routes (optimized endpoints)
  registerDashboardStatsRoutes(app);

  // Register program routes
  registerProgramRoutes(app);

  // Register announcement routes
  registerAnnouncementRoutes(app);

  // Register agency routes
  registerAgencyRoutes(app);

  // Register leaderboard routes (Sprint 8)
  registerLeaderboardRoutes(app);

  // Register redemption routes (Sprint 6)
  registerRedemptionRoutes(app);

  // Register reward management routes (M21 extraction)
  registerRewardManagementRoutes(app, storage);

  // Register GDPR compliance routes (Sprint 9)
  registerGdprRoutes(app);

  // Register beta signup routes (public - no auth required)
  registerBetaSignupRoutes(app);

  // Register verification analytics routes
  registerVerificationAnalyticsRoutes(app);

  // Register sync preferences routes
  registerSyncPreferencesRoutes(app);

  // Register creator analytics routes
  registerCreatorAnalyticsRoutes(app);

  // Register creator activity routes (M21 extraction)
  registerCreatorActivityRoutes(app);

  // Register health check routes
  registerHealthRoutes(app);

  // Register task routes
  const { registerTaskRoutes } = await import('./tasks/task-routes');
  registerTaskRoutes(app);

  // Task Completion Routes
  const { createTaskCompletionRoutes } = await import('./tasks/task-completion-routes');
  app.use('/api/task-completions', createTaskCompletionRoutes(storage as any));

  // Creator Store Public API
  app.get('/api/store/:creatorUrl', async (req, res) => {
    try {
      const { creatorUrl } = req.params;

      // Skip reserved routes
      if (creatorUrl === 'admin-dashboard' || creatorUrl.startsWith('admin-')) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Find creator by username (slug)
      const user = await storage.getUserByUsername(creatorUrl);
      if (!user || user.userType !== 'creator') {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get creator data
      const creator = await storage.getCreatorByUserId(user.id);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get tenant data
      const tenant = await storage.getTenant(creator.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
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
        error: 'Error fetching creator store',
        message: error.message,
      });
    }
  });

  // Register Campaign V2 routes (sponsors, gating, sequential tasks, deferred verification)
  registerCampaignV2Routes(app);

  // Register Reputation Oracle routes (score query, admin sync, stats)
  registerReputationRoutes(app);

  // Register Blockchain routes (token factory, staking multipliers)
  registerBlockchainRoutes(app);

  // Register Badge routes (badge claiming and viewing)
  registerBadgeRoutes(app);

  // Register Stripe webhook routes (must use raw body — express.json() is skipped for this path)
  registerStripeWebhookRoutes(app);

  // ============================================================================
  // CAMPAIGN BUILDER: Draft & Task Assignment Endpoints (legacy)
  // ============================================================================

  // Create draft campaign (soft-save for campaign builder)
  app.post('/api/campaigns/draft', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      console.log('[Campaign Draft] Request body:', JSON.stringify(req.body, null, 2));

      // Helper to safely parse to Date object (Drizzle expects Date objects for timestamp columns)
      const parseToDate = (value: any): Date | null => {
        if (!value || value === '') return null;
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return null;
          return date;
        } catch {
          return null;
        }
      };

      // Parse dates as Date objects (Drizzle requires Date objects, not strings!)
      const startDate: Date = parseToDate(req.body.startDate) || new Date();
      const endDate: Date | null = parseToDate(req.body.endDate);

      // Date validation for drafts (be lenient - allow saving but warn)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight today

      // For drafts, start date should be today or future (but allow for editing)
      if (startDate < today) {
        console.log('[Campaign Draft] Warning: Start date is in the past, adjusting to today');
        // Don't reject drafts with past dates - they might be editing
      }

      // End date must be after start date
      if (endDate && endDate <= startDate) {
        return res.status(400).json({
          error: 'Invalid dates',
          message: 'End date must be after start date',
        });
      }

      // Build campaign data explicitly - DO NOT spread req.body
      // This prevents invalid/unexpected fields from causing errors
      const campaignData: any = {
        // Required fields
        name: String(req.body.name || 'Untitled Campaign'),
        creatorId: creator.id,
        tenantId: creator.tenantId,
        status: 'draft',
        campaignType: String(req.body.campaignType || 'direct'),
        trigger: 'custom_event',
        startDate: startDate, // Must be Date object

        // Optional fields
        description: req.body.description ? String(req.body.description) : null,
        endDate: endDate, // Must be Date object or null
        visibility: 'everyone',
      };

      // Only add JSONB fields if they are properly formatted
      if (req.body.campaignTypes && Array.isArray(req.body.campaignTypes)) {
        campaignData.campaignTypes = req.body.campaignTypes.map(String);
      }
      if (
        req.body.rewardStructure &&
        typeof req.body.rewardStructure === 'object' &&
        !Array.isArray(req.body.rewardStructure)
      ) {
        campaignData.rewardStructure = req.body.rewardStructure;
      }
      if (req.body.prerequisiteCampaigns && Array.isArray(req.body.prerequisiteCampaigns)) {
        campaignData.prerequisiteCampaigns = req.body.prerequisiteCampaigns.map(String);
      }
      if (typeof req.body.allTasksRequired === 'boolean') {
        campaignData.allTasksRequired = req.body.allTasksRequired;
      }

      console.log(
        '[Campaign Draft] Creating campaign with data:',
        JSON.stringify(
          {
            ...campaignData,
            startDate: startDate.toISOString(),
            endDate: endDate?.toISOString() || null,
          },
          null,
          2
        )
      );

      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error: any) {
      console.error('Failed to create draft campaign:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create draft campaign', details: error.message });
    }
  });

  // Update campaign (for updating drafts during campaign builder flow)
  app.put(
    '/api/campaigns/:campaignId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        const { campaignId } = req.params;

        // Verify campaign belongs to this creator
        const existingCampaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!existingCampaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        if (existingCampaign.creatorId !== creator.id) {
          return res.status(403).json({ error: 'Not authorized to update this campaign' });
        }

        // Helper to safely parse to Date object (Drizzle expects Date objects for timestamp columns)
        const parseToDate = (value: any): Date | null => {
          if (!value || value === '') return null;
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return null;
            return date;
          } catch {
            return null;
          }
        };

        // Build update data explicitly - only include valid fields
        const updateData: any = {};

        // String fields
        if (req.body.name && req.body.name !== '') {
          updateData.name = String(req.body.name);
        }
        if (req.body.description !== undefined) {
          updateData.description = req.body.description ? String(req.body.description) : null;
        }
        if (
          req.body.status &&
          ['draft', 'active', 'paused', 'completed'].includes(req.body.status)
        ) {
          updateData.status = req.body.status;
        }

        // Date fields - must be Date objects for Drizzle
        const startDate = parseToDate(req.body.startDate);
        if (startDate) {
          updateData.startDate = startDate;
        }
        if (req.body.endDate === null) {
          updateData.endDate = null;
        } else {
          const endDate = parseToDate(req.body.endDate);
          if (endDate) {
            updateData.endDate = endDate;
          }
        }

        // JSONB fields - validate they're proper arrays/objects
        if (req.body.campaignTypes && Array.isArray(req.body.campaignTypes)) {
          updateData.campaignTypes = req.body.campaignTypes.map(String);
        }
        if (
          req.body.rewardStructure &&
          typeof req.body.rewardStructure === 'object' &&
          !Array.isArray(req.body.rewardStructure)
        ) {
          updateData.rewardStructure = req.body.rewardStructure;
        }
        if (req.body.visibilityRules && typeof req.body.visibilityRules === 'object') {
          updateData.visibilityRules = req.body.visibilityRules;
        }
        if (req.body.prerequisiteCampaigns && Array.isArray(req.body.prerequisiteCampaigns)) {
          updateData.prerequisiteCampaigns = req.body.prerequisiteCampaigns.map(String);
        }
        if (typeof req.body.allTasksRequired === 'boolean') {
          updateData.allTasksRequired = req.body.allTasksRequired;
        }

        // Only update if we have changes
        if (Object.keys(updateData).length === 0) {
          return res.json(existingCampaign);
        }

        const updatedCampaign = await storage.updateCampaign(campaignId, updateData);
        res.json(updatedCampaign);
      } catch (error: any) {
        console.error('Failed to update campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign', details: error.message });
      }
    }
  );

  // Assign task to campaign (uses task_assignments table)
  app.post(
    '/api/tasks/:taskId/assign',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        const { taskId } = req.params;
        const { campaignId } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: 'Campaign ID required' });
        }

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Verify task exists and belongs to this creator
        const task = await storage.getTask(taskId, creator.tenantId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Use proper assignment method that inserts into task_assignments table
        const assignment = await storage.assignTaskToCampaign(taskId, campaignId, creator.tenantId);
        res.json({ success: true, assignment, task });
      } catch (error: any) {
        console.error('Failed to assign task to campaign:', error);
        res.status(500).json({ error: 'Failed to assign task', details: error.message });
      }
    }
  );

  // Unassign task from campaign
  app.delete(
    '/api/tasks/:taskId/unassign',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        const { taskId } = req.params;
        const { campaignId } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: 'Campaign ID required' });
        }

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Unassign task from campaign
        await storage.unassignTaskFromCampaign(taskId, campaignId, creator.tenantId);
        res.json({ success: true, message: 'Task unassigned from campaign' });
      } catch (error: any) {
        console.error('Failed to unassign task from campaign:', error);
        res.status(500).json({ error: 'Failed to unassign task', details: error.message });
      }
    }
  );

  // Get task assignments for a campaign
  app.get(
    '/api/campaigns/:campaignId/task-assignments',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Creator profile required' });
        }

        const { campaignId } = req.params;

        // Verify campaign belongs to this creator
        const campaign = await storage.getCampaign(campaignId, creator.tenantId);
        if (!campaign || campaign.creatorId !== creator.id) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get task assignments
        const assignments = await storage.getTaskAssignments(campaignId);
        const taskIds = assignments.map((a) => a.taskId);

        res.json({ assignments, taskIds });
      } catch (error: any) {
        console.error('Failed to get task assignments:', error);
        res.status(500).json({ error: 'Failed to get task assignments', details: error.message });
      }
    }
  );

  // ============================================================================
  // SPRINT 8: LEADERBOARD ENDPOINTS
  // NOTE: Main leaderboard routes are registered in leaderboard-routes.ts
  // Only admin/utility routes remain here
  // ============================================================================

  // Refresh leaderboard views (admin only)
  app.post(
    '/api/leaderboards/refresh',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { sql } = await import('drizzle-orm');
        const db = (await import('../db')).db;

        // Check if user is admin
        const user = await storage.getUser(req.user?.id || '');
        if (!user || user.role !== 'fandomly_admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        await db.execute(sql`SELECT refresh_leaderboard_views()`);

        res.json({ success: true, message: 'Leaderboard views refreshed' });
      } catch (error) {
        console.error('Failed to refresh leaderboard views:', error);
        res.status(500).json({ error: 'Failed to refresh leaderboard views' });
      }
    }
  );

  // Get user's leaderboard position across all types
  app.get(
    '/api/leaderboards/my-rankings',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { sql } = await import('drizzle-orm');
        const db = (await import('../db')).db;

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get platform ranking
        const platformResult = await db.execute(sql`
        SELECT rank, total_points
        FROM platform_leaderboard
        WHERE user_id = ${userId}
      `);

        // Get program rankings
        const programResults = await db.execute(sql`
        SELECT program_id, program_name, rank, total_points, current_tier
        FROM program_leaderboard
        WHERE user_id = ${userId}
      `);

        // Get campaign rankings
        const campaignResults = await db.execute(sql`
        SELECT campaign_id, campaign_name, rank, total_points
        FROM campaign_leaderboard
        WHERE user_id = ${userId}
      `);

        res.json({
          platform: platformResult.rows[0]
            ? {
                rank: platformResult.rows[0].rank || 0,
                totalPoints: platformResult.rows[0].total_points || 0,
              }
            : { rank: 0, totalPoints: 0 },
          programs: programResults.rows.map((row) => ({
            programId: row.program_id,
            programName: row.program_name,
            rank: row.rank || 0,
            totalPoints: row.total_points || 0,
            currentTier: row.current_tier,
          })),
          campaigns: campaignResults.rows.map((row) => ({
            campaignId: row.campaign_id,
            campaignName: row.campaign_name,
            rank: row.rank || 0,
            totalPoints: row.total_points || 0,
          })),
        });
      } catch (error) {
        console.error('Failed to fetch user rankings:', error);
        res.status(500).json({ error: 'Failed to fetch user rankings' });
      }
    }
  );

  // Configure automatic badge rewards for leaderboard positions
  app.post(
    '/api/leaderboards/badge-rewards',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { sql } = await import('drizzle-orm');
        const db = (await import('../db')).db;

        // Check if user is admin or creator
        const user = await storage.getUser(req.user?.id || '');
        if (!user || (user.role !== 'fandomly_admin' && user.userType !== 'creator')) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const { leaderboardType, targetId, badgeId, minRank, maxRank } = req.body;

        const result = await db.execute(sql`
        INSERT INTO leaderboard_badge_rewards (leaderboard_type, target_id, badge_id, min_rank, max_rank)
        VALUES (${leaderboardType}, ${targetId}, ${badgeId}, ${minRank || 1}, ${maxRank || 1})
        RETURNING *
      `);

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Failed to configure badge reward:', error);
        res.status(500).json({ error: 'Failed to configure badge reward' });
      }
    }
  );

  // Get badge reward configurations for a leaderboard
  app.get('/api/leaderboards/badge-rewards/:type/:targetId?', async (req, res) => {
    try {
      const { sql } = await import('drizzle-orm');
      const db = (await import('../db')).db;

      const { type, targetId } = req.params;

      const result = await db.execute(sql`
        SELECT * FROM leaderboard_badge_rewards
        WHERE leaderboard_type = ${type}
        AND (${targetId}::VARCHAR IS NULL OR target_id = ${targetId})
        AND is_active = true
        ORDER BY min_rank
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch badge rewards:', error);
      res.status(500).json({ error: 'Failed to fetch badge rewards' });
    }
  });

  // Register global error handler (must be last middleware)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
