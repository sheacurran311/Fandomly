/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { Express, Request, Response } from 'express';
import { authenticateUser, requireRole, type AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { getTierLimits, type SubscriptionTier } from '@shared/subscription-config';
import { insertCreatorSchema } from '@shared/schema';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Rate limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' },
});

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

export function registerProfileRoutes(app: Express) {
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
          typeSpecificData: incomingTypeData,
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
          role: 'customer_admin' as const,
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
            typeSpecificData:
              incomingTypeData && typeof incomingTypeData === 'object' ? incomingTypeData : {},
            brandColors: {
              primary: '#8B5CF6',
              secondary: '#06B6D4',
              accent: '#10B981',
            },
            socialLinks: {},
          });

          console.log('Created creator record:', creator.id);
        } else {
          // Update creator category and type-specific data if provided
          const updateData: Record<string, unknown> = { category: creatorType };
          if (incomingTypeData && typeof incomingTypeData === 'object') {
            updateData.typeSpecificData = {
              ...((creator.typeSpecificData as Record<string, unknown>) || {}),
              ...incomingTypeData,
            };
          }
          creator = await storage.updateCreator(creator.id, updateData);
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
        const stripeSubscriptionId = null;

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
          const creator = await storage.getCreatorByUserId(user.id);
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

  // Update profile (username, displayName, privacy settings)
  app.post(
    '/api/auth/profile',
    authRateLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.body.userId || req.user?.id;
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Only allow users to update their own profile (or admins)
        if (req.user?.id !== userId && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: 'Unauthorized to modify this profile' });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const { username, displayName, email, privacySettings } = req.body;
        const updates: Record<string, unknown> = {};

        // Validate and update username if provided
        if (username && username !== user.username) {
          if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
          }
          if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            return res.status(400).json({
              error: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
            });
          }
          const existingByUsername = await storage.getUserByUsername(username);
          if (existingByUsername && existingByUsername.id !== userId) {
            return res.status(400).json({ error: 'Username is already taken' });
          }
          updates.username = username;
        }

        // Update display name if provided
        if (displayName !== undefined) {
          updates.profileData = {
            ...((user.profileData as Record<string, unknown>) || {}),
            name: displayName,
          };
        }

        // Update email if provided
        if (email !== undefined && email !== user.email) {
          updates.email = email;
        }

        // Update privacy settings if provided
        if (privacySettings !== undefined) {
          const currentProfileData = (user.profileData as Record<string, unknown>) || {};
          updates.profileData = {
            ...(updates.profileData || currentProfileData),
            privacySettings,
          };
        }

        if (Object.keys(updates).length === 0) {
          return res.json({ success: true, message: 'No changes to save', user });
        }

        const updatedUser = await storage.updateUser(userId, updates);
        res.json({ success: true, user: updatedUser });
      } catch (error) {
        console.error('Failed to update profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
      }
    }
  );

  // PATCH version of profile update (used by settings pages)
  app.patch(
    '/api/auth/profile',
    authRateLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const { displayName, email, privacySettings } = req.body;
        const updates: Record<string, unknown> = {};

        if (displayName !== undefined) {
          updates.profileData = {
            ...((user.profileData as Record<string, unknown>) || {}),
            name: displayName,
          };
        }

        if (email !== undefined && email !== user.email) {
          updates.email = email;
        }

        if (privacySettings !== undefined) {
          const currentProfileData = (user.profileData as Record<string, unknown>) || {};
          updates.profileData = {
            ...(updates.profileData || currentProfileData),
            privacySettings,
          };
        }

        if (Object.keys(updates).length === 0) {
          return res.json({ success: true, message: 'No changes to save', user });
        }

        const updatedUser = await storage.updateUser(userId, updates);
        res.json({ success: true, user: updatedUser });
      } catch (error) {
        console.error('Failed to update profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
      }
    }
  );

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
}
