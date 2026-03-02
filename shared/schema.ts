import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  pgEnum,
  serial,
  numeric,
  bigint,
  date,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Role-Based Access Control Enums
export const userRoleEnum = pgEnum('user_role', [
  'fandomly_admin',
  'customer_admin',
  'customer_end_user',
]);
export const customerTierEnum = pgEnum('customer_tier', ['basic', 'premium', 'vip']);

// Multi-Tenant Structure
export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'inactive',
  'suspended',
  'trial',
]);
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'professional',
  'enterprise',
]);

// Tenant (Store) Table - Each creator gets their own tenant/store
export const tenants = pgTable('tenants', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Tenant Identity
  slug: varchar('slug', { length: 100 }).unique().notNull(), // e.g., "aerial-ace-athletics"
  name: text('name').notNull(), // e.g., "Aerial Ace Athletics"
  domain: text('domain').unique(), // Custom domain support: aerialace.fandomly.com

  // Owner Information
  ownerId: varchar('owner_id').notNull(),

  // Tenant Settings
  status: tenantStatusEnum('status').notNull().default('trial'),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('starter'),
  subscriptionStatus: text('subscription_status').default('trial'), // "trial" | "active" | "past_due" | "canceled"

  // Branding & Customization
  branding: jsonb('branding').$type<{
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    customCSS?: string;
    favicon?: string;
    fontFamily?: string;
  }>(),

  // Business Information
  businessInfo: jsonb('business_info').$type<{
    businessType: 'individual' | 'team' | 'organization';
    sport?: string; // For athletes
    position?: string; // For athletes
    school?: string; // For college athletes
    division?: string; // For college athletes
    year?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate';
    industryType?: string; // For creators/musicians
    teamSize?: number;
    website?: string;
    socialLinks?: {
      instagram?: string;
      tiktok?: string;
      twitter?: string;
      youtube?: string;
      spotify?: string;
    };
  }>(),

  // Limits & Usage
  limits: jsonb('limits').$type<{
    maxMembers: number;
    maxCampaigns: number;
    maxRewards: number;
    maxApiCalls: number;
    storageLimit: number; // in MB
    customDomain: boolean;
    advancedAnalytics: boolean;
    whiteLabel: boolean;
  }>(),

  // Usage Tracking
  usage: jsonb('usage')
    .$type<{
      currentMembers: number;
      currentCampaigns: number;
      currentRewards: number;
      apiCallsThisMonth: number;
      storageUsed: number;
    }>()
    .default({
      currentMembers: 0,
      currentCampaigns: 0,
      currentRewards: 0,
      apiCallsThisMonth: 0,
      storageUsed: 0,
    }),

  // Billing
  billingInfo: jsonb('billing_info').$type<{
    stripeCustomerId?: string;
    subscriptionId?: string;
    trialEndsAt?: string;
    nextBillingDate?: string;
    billingEmail?: string;
  }>(),

  // Configuration
  settings: jsonb('settings')
    .$type<{
      timezone: string;
      currency: string;
      language: string;
      nilCompliance: boolean; // For athlete tenants
      publicProfile: boolean;
      allowRegistration: boolean;
      requireEmailVerification: boolean;
      enableSocialLogin: boolean;
      customTermsUrl?: string;
      customPrivacyUrl?: string;
    }>()
    .default({
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      nilCompliance: false,
      publicProfile: true,
      allowRegistration: true,
      requireEmailVerification: false,
      enableSocialLogin: true,
    }),

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Social Media Connections table - stores OAuth tokens and connection data
export const socialConnections = pgTable('social_connections', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // 'facebook', 'twitter', 'tiktok', 'instagram', etc.

  // OAuth data
  platformUserId: text('platform_user_id'), // User's ID on the platform
  platformUsername: text('platform_username'), // @handle or username
  platformDisplayName: text('platform_display_name'),
  accessToken: text('access_token'), // Encrypted in production
  refreshToken: text('refresh_token'), // Encrypted in production
  tokenExpiresAt: timestamp('token_expires_at'),

  // Platform-specific data
  profileData: jsonb('profile_data').$type<{
    followers?: number;
    following?: number;
    mediaCount?: number;
    verified?: boolean;
    profilePictureUrl?: string;
    bio?: string;
    website?: string;
    // Platform-specific fields
    [key: string]: unknown;
  }>(),

  // Connection metadata
  connectedAt: timestamp('connected_at').defaultNow(),
  lastSyncedAt: timestamp('last_synced_at'),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text('email'),
  username: text('username').unique().notNull(), // Required unique username for all users
  avatar: text('avatar'),
  walletAddress: text('wallet_address'),
  walletChain: text('wallet_chain'),

  // Authentication Provider Fields
  primaryAuthProvider: text('primary_auth_provider'), // 'google' | 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'discord' | 'twitch' | 'facebook'
  googleId: text('google_id').unique(), // Google's unique user ID (sub claim)
  linkedAccounts: jsonb('linked_accounts').$type<{
    providers: Array<{
      provider: string;
      providerId: string;
      email?: string;
      linkedAt: string;
    }>;
  }>(),

  userType: text('user_type').notNull().default('pending'), // "pending" | "fan" | "creator" | "brand"

  // Brand/Agency Support
  brandType: text('brand_type'), // 'single' | 'agency' | null (for non-brand users)
  agencyId: varchar('agency_id'), // Reference to agencies table (added via relation below)

  // Optional profile data collected during onboarding (fan/creator/brand)
  profileData: jsonb('profile_data').$type<{
    name?: string;
    age?: number;
    interests?: Array<'musicians' | 'athletes' | 'content_creators'>;
    bio?: string;
    location?: string;
    avatar?: string;
    bannerImage?: string; // Replaces social media links
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    favoriteCreators?: string[];

    // Fan Marketing Fields (NEW)
    phone?: string; // SMS marketing number
    creatorTypeInterests?: Array<'athletes' | 'musicians' | 'content_creators'>; // Which creator types they follow
    interestSubcategories?: {
      athletes?: string[]; // Sport types: ["football", "basketball", "soccer"]
      musicians?: string[]; // Music genres: ["hip_hop", "pop", "rock"]
      content_creators?: string[]; // Content types: ["gaming", "vlogging", "cooking"]
    };

    // Enhanced athlete fields
    sport?: string;
    position?: string; // Athletic position if applicable
    education?: {
      level:
        | 'middle_school'
        | 'high_school'
        | 'junior_college'
        | 'college_d1'
        | 'college_d2'
        | 'college_d3'
        | 'naia'
        | 'not_enrolled'
        | 'professional';
      grade?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate'; // For high school and college
      school?: string;
      graduationYear?: number;
    };

    // Enhanced musician fields
    musicGenre?: string;
    artistType?: 'independent' | 'signed' | 'hobby';
    musicCatalog?: {
      spotify?: string;
      appleMusic?: string;
      soundcloud?: string;
      bandcamp?: string;
      youtube?: string;
    };

    // Enhanced content creator fields
    contentType?: string;
    platforms?: string[];
    topicsOfFocus?: string[];

    socialLinks?: {
      twitter?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      spotify?: string;
      soundcloud?: string;
      twitch?: string;
      discord?: string;
    };
    facebookData?: {
      id: string;
      name: string;
      email?: string;
      picture?: string;
      likes?: unknown;
      importedAt: string;
    };
    preferences?: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      marketingEmails?: boolean;
      smsNotifications?: boolean;
    };

    // Platform Points Balance (Fandomly-issued points for platform-wide tasks)
    fandomlyPoints?: number;
  }>(),

  // Multi-Tenant Support
  currentTenantId: varchar('current_tenant_id'), // Current active tenant

  // Role-Based Access Control
  role: userRoleEnum('role').notNull().default('customer_end_user'),
  customerTier: customerTierEnum('customer_tier').default('basic'), // Only applies to customer_end_user role

  // Onboarding State Tracking
  onboardingState: jsonb('onboarding_state')
    .$type<{
      currentStep: number; // 0 = not started, 1+ = step numbers
      totalSteps: number;
      completedSteps: string[]; // Array of completed step IDs
      isCompleted: boolean;
      lastOnboardingRoute?: string; // Save where user left off
      skipReason?: string; // If user skipped onboarding
    }>()
    .default({
      currentStep: 0,
      totalSteps: 5,
      completedSteps: [],
      isCompleted: false,
    }),

  // Admin permissions for fandomly_admin role
  adminPermissions: jsonb('admin_permissions').$type<{
    canManageAllCreators?: boolean;
    canManageUsers?: boolean;
    canAccessAnalytics?: boolean;
    canManagePlatformSettings?: boolean;
    canManagePayments?: boolean;
  }>(),

  // Customer admin metadata for customer_admin role (creators)
  customerAdminData: jsonb('customer_admin_data').$type<{
    organizationName?: string;
    businessType?: string; // "individual" | "team" | "organization"
    nilAthleteData?: {
      sport: string;
      division: string;
      school: string;
      position: string;
      year: string; // "freshman" | "sophomore" | "junior" | "senior"
    };
    subscriptionStatus?: 'active' | 'inactive' | 'trial';
    subscriptionTier?: 'starter' | 'professional' | 'enterprise';
  }>(),

  // Notification Preferences - Comprehensive multi-channel system
  notificationPreferences: jsonb('notification_preferences')
    .$type<{
      marketing: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      campaignUpdates: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      creatorUpdates: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      newTasks: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      newRewards: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      achievementAlerts: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      weeklyDigest: boolean;
      monthlyReport: boolean;
    }>()
    .default({
      marketing: { push: true, email: true, sms: false },
      campaignUpdates: { push: true, email: true, sms: false },
      creatorUpdates: { push: true, email: false, sms: false },
      newTasks: { push: true, email: true, sms: false },
      newRewards: { push: true, email: true, sms: false },
      achievementAlerts: { push: true, email: false, sms: false },
      weeklyDigest: false,
      monthlyReport: false,
    }),

  // Particle Network / Blockchain Integration
  particleUserId: text('particle_user_id').unique(), // Particle Network UUID
  avalancheL1Address: text('avalanche_l1_address'), // Fandomly Chain wallet address
  blockchainEnabled: boolean('blockchain_enabled').default(false), // Whether user has on-chain wallet

  // Soft delete columns
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
});

// Tenant Memberships - Users can be members of multiple tenants
export const tenantMemberships = pgTable('tenant_memberships', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Role within this specific tenant
  role: text('role').notNull().default('member'), // 'owner' | 'admin' | 'moderator' | 'member'

  // Member-specific data for this tenant
  memberData: jsonb('member_data')
    .$type<{
      displayName?: string;
      bio?: string;
      points: number;
      tier: string;
      joinedVia?: 'invitation' | 'registration' | 'social';
      referredBy?: string;
      customAttributes?: Record<string, unknown>;
    }>()
    .default({
      points: 0,
      tier: 'basic',
    }),

  // Status
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'banned'

  // Agency Support
  isAgencyManager: boolean('is_agency_manager').default(false), // True if managing tenant on behalf of agency
  managedBy: varchar('managed_by'), // User ID of agency owner managing this tenant

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  joinedAt: timestamp('joined_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
});

export const creators = pgTable('creators', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Each creator belongs to a tenant
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  category: text('category').notNull(), // "athlete" | "musician" | "content_creator" | "brand"
  imageUrl: text('image_url'),
  followerCount: integer('follower_count').default(0),

  // Creator Type-Specific Data
  typeSpecificData: jsonb('type_specific_data').$type<{
    // Athlete-specific data
    athlete?: {
      sport: string;
      ageRange: string; // "under_18" | "18_22" | "23_30" | "over_30"
      education: string; // "middle_school" | "high_school" | "college" | "professional" | "other"
      position: string;
      school?: string;
      currentSponsors?: string[];
      nilCompliant: boolean;
    };

    // Musician-specific data
    musician?: {
      bandArtistName: string;
      musicCatalogUrl: string;
      artistType: string; // "independent" | "signed" | "hobby"
      musicGenre: string[];
    };

    // Content Creator-specific data
    contentCreator?: {
      contentType: string[]; // ["video", "podcast", "gaming", "lifestyle", etc.]
      topicsOfFocus: string[];
      sponsorships?: string[];
      totalViews?: string; // "under_1k" | "1k_10k" | "10k_100k" | "100k_1m" | "over_1m"
      platforms: string[]; // ["instagram", "tiktok", "youtube", "twitch", etc.]
    };
  }>(),

  brandColors: jsonb('brand_colors').$type<{
    primary: string;
    secondary: string;
    accent: string;
  }>(),
  socialLinks: jsonb('social_links').$type<{
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    facebook?: string;
    discord?: string;
  }>(),

  // Creator Verification System
  isVerified: boolean('is_verified').default(false),
  verificationData: jsonb('verification_data')
    .$type<{
      profileComplete: boolean;
      requiredFieldsFilled: string[]; // List of completed required fields
      verifiedAt?: string;
      verificationMethod?: 'auto' | 'manual'; // Auto when profile is complete, manual for admin override
      completionPercentage: number; // 0-100
      missingFields?: string[]; // Fields still needed for verification
      // Badge NFT data (populated when verification badge is minted)
      badgeNFT?: {
        onChainBadgeTypeId: number;
        txHash: string;
        mintedAt: string;
        recipientWallet: string;
      };
      badgeRevoked?: boolean;
      badgeRevokedAt?: string;
    }>()
    .default({
      profileComplete: false,
      requiredFieldsFilled: [],
      completionPercentage: 0,
    }),

  // Public Page Settings - Controls what sections are visible on creator's public page
  publicPageSettings: jsonb('public_page_settings')
    .$type<{
      showAbout: boolean;
      showTasks: boolean;
      showSocialPosts: boolean;
      showAnalytics: boolean;
      showRewards: boolean;
      showCommunity: boolean;
    }>()
    .default({
      showAbout: true,
      showTasks: true,
      showSocialPosts: true,
      showAnalytics: false,
      showRewards: true,
      showCommunity: true,
    }),

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Creator Facebook Pages (stores page tokens and metrics per creator)
export const creatorFacebookPages = pgTable('creator_facebook_pages', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  creatorId: varchar('creator_id')
    .references(() => creators.id)
    .notNull(),
  pageId: varchar('page_id').notNull(),
  name: text('name').notNull(),
  accessToken: text('access_token').notNull(),
  followersCount: integer('followers_count').default(0),
  fanCount: integer('fan_count').default(0),
  instagramBusinessAccountId: varchar('instagram_business_account_id'),
  connectedInstagramAccountId: varchar('connected_instagram_account_id'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// AGENCY & MULTI-BRAND MANAGEMENT
// ============================================================================

// Agencies table for multi-brand management
export const agencies = pgTable('agencies', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  ownerUserId: varchar('owner_user_id')
    .references(() => users.id)
    .notNull(),
  website: text('website'),

  businessInfo: jsonb('business_info')
    .$type<{
      companyType?: 'agency' | 'holding_company' | 'brand_network';
      teamSize?: number;
      managedBrandCount?: number;
      primaryIndustry?: string;
    }>()
    .default({}),

  allowCrossBrandAnalytics: boolean('allow_cross_brand_analytics').default(false),
  dataIsolationLevel: text('data_isolation_level').default('strict'), // 'strict' | 'aggregated' | 'shared'

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Links agencies to their managed brands (tenants)
export const agencyTenants = pgTable('agency_tenants', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  agencyId: varchar('agency_id')
    .references(() => agencies.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  relationshipType: text('relationship_type').default('full_management'), // 'full_management' | 'white_label' | 'consulting'
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),

  createdAt: timestamp('created_at').defaultNow(),
});

// Programs are the highest level container (one per creator)
// Previously called "loyalty_programs" - now serves as the Program Page
export const loyaltyPrograms = pgTable('loyalty_programs', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant
  creatorId: varchar('creator_id')
    .references(() => creators.id, { onDelete: 'cascade' })
    .notNull(),

  // Basic Program Info
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  pointsName: text('points_name').default('Points'), // e.g. "Thunder Points", "Luna Coins"

  // Program Page Configuration (Snap-inspired)
  pageConfig: jsonb('page_config').$type<{
    headerImage?: string;
    logo?: string;
    brandColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    theme?: {
      mode: 'light' | 'dark' | 'custom'; // Preset or custom
      backgroundColor?: string; // Custom background color
      textColor?: string; // Custom text color
      templateId?: string;
      typography?: {
        fontFamily?: { heading?: string; body?: string; mono?: string };
        fontSize?: Record<string, string> & {
          xs?: string;
          sm?: string;
          base?: string;
          lg?: string;
          xl?: string;
          '2xl'?: string;
          '3xl'?: string;
          '4xl'?: string;
          '5xl'?: string;
        };
        fontWeight?: Record<string, string | number> & {
          light?: number;
          normal?: number;
          medium?: number;
          semibold?: number;
          bold?: number;
          extrabold?: number;
        };
        lineHeight?: Record<string, string | number> & {
          tight?: number;
          normal?: number;
          relaxed?: number;
          loose?: number;
        };
      };
      layout?: {
        borderRadius?: Record<string, string>;
        [k: string]: unknown;
      };
      colors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        tertiary?: string;
        background?: string;
        surface?: string;
        surfaceHover?: string;
        border?: string;
        success?: string;
        warning?: string;
        error?: string;
        info?: string;
        text?: { primary?: string; secondary?: string; tertiary?: string };
        [k: string]: unknown;
      };
    };
    creatorDetails?: Record<string, unknown>;
    location?: string;
    customDomain?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      discord?: string;
      website?: string;
    };
    visibility?: {
      // Section-level visibility
      showProfile?: boolean;
      showCampaigns?: boolean;
      showTasks?: boolean;
      showRewards?: boolean;
      showLeaderboard?: boolean;
      showActivityFeed?: boolean;
      showFanWidget?: boolean;
      // Granular profile data visibility
      profileData?: {
        showBio?: boolean;
        showLocation?: boolean;
        showWebsite?: boolean;
        showSocialLinks?: boolean;
        showJoinDate?: boolean;
        showFollowerCount?: boolean;
        showVerificationBadge?: boolean;
        showTiers?: boolean;
      };
    };
  }>(),

  // Tiers/Levels
  tiers: jsonb('tiers').$type<
    Array<{
      id: string;
      name: string;
      minPoints: number;
      benefits: string[];
      color: string;
    }>
  >(),

  // Publishing & Status
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  publishedAt: timestamp('published_at'),
  slug: text('slug'), // URL-friendly identifier for public page

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const rewards = pgTable('rewards', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant
  programId: varchar('program_id')
    .references(() => loyaltyPrograms.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  rewardType: text('reward_type').notNull(), // "traditional" | "nft" | "token" | "experience" | "raffle" | "physical" | "custom"
  rewardData: jsonb('reward_data').$type<{
    nftMetadata?: {
      name: string;
      description: string;
      image: string;
      attributes: Array<{ trait_type: string; value: string }>;
      contractAddress?: string;
      tokenId?: string;
      blockchain: string; // "ethereum" | "solana" | "polygon" | "bsc"
      rarity?: string;
      collection?: string;
    };
    nftData?: {
      collectionId?: string;
      templateId?: string;
      autoMintOnRedeem?: boolean;
    };
    tokenAmount?: string;
    experienceDetails?: string;
    downloadLink?: string;
    couponCode?: string;
    // New reward type data
    raffleData?: {
      prizeDescription: string;
      prizeValue?: number;
      entryPointsCost: number; // Points per entry (usually 1)
      maxEntries?: number;
      drawDate: string;
      winnerSelectionMethod: 'random' | 'manual';
    };
    physicalData?: {
      itemName: string;
      itemDescription: string;
      shippingRequired: boolean;
      estimatedDeliveryDays?: number;
      stockQuantity?: number;
      weight?: number;
      dimensions?: { length: number; width: number; height: number };
      condition?: 'game-used' | 'new' | 'like-new' | 'sponsor-item';
      quantity?: number;
      photos?: string[];
      approvalStatus?: 'pending' | 'approved' | 'rejected';
      adminNotes?: string;
      submittedAt?: string;
      approvedAt?: string;
    };
    customData?: {
      serviceName: string;
      serviceDescription: string;
      deliveryMethod: 'email' | 'platform' | 'video_call' | 'physical';
      estimatedFulfillmentDays?: number;
      customInstructions?: string;
      requiresPersonalization: boolean;
    };
    videoData?: {
      maxVideoDuration: number;
      deliveryInstructions: string;
      turnaroundDays: number;
      requiresPersonalization: boolean;
      personalizationInstructions?: string;
      sampleVideoUrl?: string;
    };
  }>(),
  maxRedemptions: integer('max_redemptions'),
  currentRedemptions: integer('current_redemptions').default(0),
  requiredTier: text('required_tier'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fanPrograms = pgTable('fan_programs', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant
  fanId: varchar('fan_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  programId: varchar('program_id')
    .references(() => loyaltyPrograms.id, { onDelete: 'cascade' })
    .notNull(),
  currentPoints: integer('current_points').default(0),
  totalPointsEarned: integer('total_points_earned').default(0),
  currentTier: text('current_tier'),
  joinedAt: timestamp('joined_at').defaultNow(),

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pointTransactions = pgTable('point_transactions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant - financial audit trail
  fanProgramId: varchar('fan_program_id')
    .references(() => fanPrograms.id, { onDelete: 'cascade' })
    .notNull(),
  points: integer('points').notNull(),
  type: text('type').notNull(), // "earned" | "spent"
  source: text('source').notNull(), // "social_follow" | "reward_redemption" | "referral" | etc.
  metadata: jsonb('metadata').$type<{
    socialPlatform?: string;
    rewardId?: string;
    referralId?: string;
    postUrl?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rewardRedemptions = pgTable('reward_redemptions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant - financial audit trail
  fanId: varchar('fan_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  rewardId: varchar('reward_id')
    .references(() => rewards.id, { onDelete: 'restrict' })
    .notNull(),
  pointsSpent: integer('points_spent').notNull(),
  status: text('status').default('pending'), // "pending" | "completed" | "failed"
  redemptionData: jsonb('redemption_data').$type<{
    nftTxHash?: string;
    tokenTxHash?: string;
    deliveryInfo?: unknown;
  }>(),
  redeemedAt: timestamp('redeemed_at').defaultNow(),
});

// Notifications - In-app notification system
export const notificationTypeEnum = pgEnum('notification_type', [
  'points_earned',
  'task_completed',
  'campaign_new',
  'campaign_update',
  'creator_post',
  'creator_update',
  'reward_available',
  'reward_claimed',
  'achievement_unlocked',
  'level_up',
  'follower_milestone',
  'system',
  'marketing',
]);

export const notifications = pgTable('notifications', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: varchar('tenant_id').references(() => tenants.id), // Optional - null for platform-wide notifications

  // Notification Content
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),

  // Additional Data
  metadata: jsonb('metadata').$type<{
    points?: number;
    taskId?: string;
    campaignId?: string;
    creatorId?: string;
    rewardId?: string;
    achievementId?: string;
    actionUrl?: string; // Deep link to relevant page
    imageUrl?: string;
  }>(),

  // Status
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),

  // Delivery tracking
  sentVia: jsonb('sent_via')
    .$type<{
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    }>()
    .default({ push: true, email: false, sms: false }),

  createdAt: timestamp('created_at').defaultNow(),
});

// OpenLoyalty-style Campaign System
export const campaignTypeEnum = pgEnum('campaign_type', ['automation', 'direct', 'referral']);
export const campaignTriggerEnum = pgEnum('campaign_trigger', [
  'schedule_daily',
  'schedule_weekly',
  'schedule_monthly',
  'birthday',
  'anniversary',
  'purchase_transaction',
  'return_transaction',
  'internal_event',
  'custom_event',
  'achievement_earned',
  'redemption_code',
]);
export const campaignStatusEnum = pgEnum('campaign_status', [
  'active',
  'inactive',
  'draft',
  'archived',
  'pending_tasks',
]);

// Advanced Campaign Types & Rewards
export const rewardTypeEnum = pgEnum('reward_type', [
  'points',
  'raffle',
  'nft',
  'badge',
  'multiplier',
]);
export const socialPlatformEnum = pgEnum('social_platform', [
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'youtube',
  'spotify',
  'apple_music',
  'discord',
  'telegram',
  'twitch',
  'system',
  'interactive',
  'kick',
  'patreon',
]);

// Snag-Inspired Task System Enums
export const taskSectionEnum = pgEnum('task_section', [
  'user_onboarding',
  'social_engagement',
  'community_building',
  'content_creation',
  'streaming_music',
  'token_activity',
  'custom',
]);

export const updateCadenceEnum = pgEnum('update_cadence', [
  'immediate',
  'daily',
  'weekly',
  'monthly',
]);
export const rewardFrequencyEnum = pgEnum('reward_frequency', [
  'one_time',
  'daily',
  'weekly',
  'monthly',
]);
export const multiplierTypeEnum = pgEnum('multiplier_type', [
  'time_based',
  'streak_based',
  'tier_based',
  'event',
  'task_specific',
]);
// Enhanced task type enum with consistent platform-specific naming
export const taskTypeEnum = pgEnum('task_type', [
  // Twitter/X tasks (consistent prefixing)
  'twitter_follow',
  'twitter_mention',
  'twitter_retweet',
  'twitter_like',
  'twitter_include_name',
  'twitter_include_bio',
  'twitter_hashtag_post',
  'twitter_quote_tweet',
  // Facebook tasks
  'facebook_like_page',
  'facebook_like_photo',
  'facebook_like_post',
  'facebook_share_post',
  'facebook_share_page',
  'facebook_comment_post',
  'facebook_comment_photo',
  'facebook_share',
  'facebook_join_group',
  // Instagram tasks
  'instagram_follow',
  'instagram_like_post',
  'comment_code',
  'mention_story',
  'keyword_comment',
  // YouTube tasks
  'youtube_like',
  'youtube_subscribe',
  'youtube_share',
  'youtube_comment',
  'youtube_watch',
  // TikTok tasks
  'tiktok_follow',
  'tiktok_like',
  'tiktok_share',
  'tiktok_comment',
  'tiktok_post',
  'tiktok_duet',
  'tiktok_stitch',
  // Spotify tasks
  'spotify_follow',
  'spotify_playlist',
  'spotify_album',
  'spotify_save_track',
  'spotify_save_album',
  // Twitch tasks
  'twitch_follow',
  'twitch_subscribe',
  'twitch_watch',
  'twitch_chat_code',
  // Discord tasks
  'discord_join',
  'discord_verify',
  'discord_react',
  'discord_message',
  'discord_message_code',
  // Kick tasks (new platform)
  'kick_follow',
  'kick_subscribe',
  'kick_chat_code',
  'kick_redeem_reward',
  // Patreon tasks (new platform)
  'patreon_support',
  'patreon_tier_check',
  // Engagement & Rewards tasks
  'check_in',
  'follower_milestone',
  'complete_profile',
  // Sprint 2: Interactive & Link tasks
  'website_visit',
  'poll',
  'quiz',
  // Group goal tasks
  'group_reactions',
  'group_viewers',
  // Generic tasks (legacy)
  'follow',
  'join',
  'repost',
  'referral',
]);

// Campaigns belong to a Program (second level in hierarchy)
export const campaigns = pgTable('campaigns', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull(), // Belongs to tenant
  creatorId: varchar('creator_id')
    .references(() => creators.id, { onDelete: 'cascade' })
    .notNull(),
  programId: varchar('program_id').references(() => loyaltyPrograms.id, { onDelete: 'restrict' }), // REQUIRED - all campaigns must belong to a program (enforced by DB constraint)

  // Basic Info
  name: text('name').notNull(),
  description: text('description'),
  displayOrder: integer('display_order'),

  // Campaign Type & Trigger
  campaignType: campaignTypeEnum('campaign_type').notNull(),
  trigger: campaignTriggerEnum('trigger').notNull(),

  // Schedule & Status
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  status: campaignStatusEnum('status').notNull().default('draft'),

  // Visibility & Targeting
  visibility: text('visibility').notNull().default('everyone'), // 'everyone' | 'segments' | 'tiers' | 'hidden'
  visibilityRules: jsonb('visibility_rules').$type<{
    segments?: string[];
    tiers?: string[];
    customAttributes?: Record<string, unknown>;
  }>(),

  // Custom Attributes for API filtering
  customAttributes: jsonb('custom_attributes').$type<Record<string, unknown>>(),

  // Transaction Filters (for purchase/return triggers)
  transactionFilters: jsonb('transaction_filters').$type<{
    productCategories?: string[];
    brands?: string[];
    priceRange?: { min: number; max: number };
    quantity?: { min: number; max: number };
    customFilters?: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
      value: unknown;
    }>;
  }>(),

  // Budget & Limits
  globalBudget: integer('global_budget'), // Total units that can be issued
  perMemberLimit: jsonb('per_member_limit').$type<{
    type: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year' | 'total';
    value: number;
  }>(),

  // Usage tracking
  totalIssued: integer('total_issued').default(0),
  totalParticipants: integer('total_participants').default(0),

  // Extended Features for Advanced Campaign Builder
  campaignTypes: jsonb('campaign_types').$type<string[]>().default(['points']), // Multiple types: points, raffle, nft, badge
  rewardStructure: jsonb('reward_structure').$type<{
    taskRewards: boolean;
    campaignRewards: Array<{
      type: 'points' | 'raffle' | 'nft' | 'badge';
      value: number;
      metadata?: Record<string, unknown>;
    }>;
    defaultPoints: number;
  }>(),
  prerequisiteCampaigns: jsonb('prerequisite_campaigns').$type<string[]>().default([]), // Campaign IDs that must be completed first
  allTasksRequired: boolean('all_tasks_required').default(true), // Must complete all tasks for reward

  // Sprint 6: Advanced Requirements
  requiresPaidSubscription: boolean('requires_paid_subscription').default(false), // Requires active paid subscription
  requiredSubscriberTier: text('required_subscriber_tier'), // Specific tier required (e.g., "premium", "vip")
  requiredNftCollectionIds: jsonb('required_nft_collection_ids').$type<string[]>().default([]), // Must own NFT from these collections
  requiredBadgeIds: jsonb('required_badge_ids').$type<string[]>().default([]), // Must have earned these badges
  requiredTaskIds: jsonb('required_task_ids').$type<string[]>().default([]), // Specific tasks required (overrides allTasksRequired if set)
  taskDependencies: jsonb('task_dependencies').$type<
    Array<{
      taskId: string;
      dependsOn: string[]; // TaskIds that must be completed before this task
      isOptional?: boolean;
    }>
  >(), // Task completion order requirements

  // ============================================
  // CAMPAIGN V2: Sponsor, Gating, Multiplier, Verification
  // ============================================

  // Access Control
  accessCode: text('access_code'), // Optional code required to join campaign
  accessCodeEnabled: boolean('access_code_enabled').default(false),

  // Reputation Gating
  minimumReputationScore: integer('minimum_reputation_score'), // Min on-chain reputation to join

  // Campaign-level multiplier (applies to ALL task rewards within this campaign)
  campaignMultiplier: decimal('campaign_multiplier', { precision: 10, scale: 2 }).default('1.00'),

  // Completion bonus (awarded when fan completes ALL required tasks)
  completionBonusPoints: integer('completion_bonus_points').default(0),
  completionBonusRewards: jsonb('completion_bonus_rewards').$type<
    Array<{
      type: 'points' | 'badge' | 'nft' | 'raffle_entry';
      value: number;
      metadata?: Record<string, unknown>;
    }>
  >(),

  // Verification timing mode
  verificationMode: text('verification_mode').default('immediate'), // 'immediate' | 'deferred' | 'end_of_campaign'
  verificationScheduledAt: timestamp('verification_scheduled_at'), // When batch verification runs

  // Campaign presentation
  bannerImageUrl: text('banner_image_url'),
  accentColor: text('accent_color').default('#8B5CF6'),

  // Task ordering
  enforceSequentialTasks: boolean('enforce_sequential_tasks').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campaign Sponsors (campaign-scoped, each sponsor belongs to one campaign)
export const campaignSponsors = pgTable('campaign_sponsors', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),

  // Sponsor Identity
  name: text('name').notNull(), // e.g., "Nike Basketball"
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),

  // Social handles used when creating tasks (e.g., "Follow @NikeBasketball on Twitter")
  socialHandles: jsonb('social_handles').$type<{
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    facebook?: string;
    twitch?: string;
    discord?: string;
    kick?: string;
  }>(),

  // Display
  displayOrder: integer('display_order').default(0),
  showInCampaignBanner: boolean('show_in_campaign_banner').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campaign Rules (Conditions + Effects)
export const campaignRules = pgTable('campaign_rules', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  ruleOrder: integer('rule_order').notNull().default(1),

  // Conditions (ALL must be met within this rule)
  conditions: jsonb('conditions')
    .$type<
      Array<{
        type:
          | 'member_tier'
          | 'purchase_amount'
          | 'product_category'
          | 'custom_attribute'
          | 'previous_purchase'
          | 'member_segment'
          | 'transaction_count'
          | 'date_range';
        field?: string;
        operator:
          | 'equals'
          | 'not_equals'
          | 'greater_than'
          | 'less_than'
          | 'contains'
          | 'in'
          | 'not_in';
        value: unknown;
        logicalOperator?: 'AND' | 'OR'; // For combining with next condition
      }>
    >()
    .notNull(),

  // Effects (What happens when conditions are met)
  effects: jsonb('effects')
    .$type<
      Array<{
        type:
          | 'add_units'
          | 'deduct_units'
          | 'give_reward'
          | 'set_custom_attribute'
          | 'remove_custom_attribute'
          | 'upgrade_tier'
          | 'send_notification';
        value?: unknown;
        formula?: string; // For calculations like "transaction_amount * 0.1"
        rewardId?: string;
        attributeName?: string;
        attributeValue?: unknown;
        notificationTemplate?: string;
      }>
    >()
    .notNull(),

  createdAt: timestamp('created_at').defaultNow(),
});

// social_campaign_tasks table removed in migration 0043
// (superseded by the tasks table with campaignId FK)

// Independent Tasks (for new workflow)
// Task Ownership Level
export const taskOwnershipEnum = pgEnum('task_ownership', ['platform', 'creator']);

export const tasks = pgTable('tasks', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Ownership
  ownershipLevel: taskOwnershipEnum('ownership_level').notNull().default('creator'),
  tenantId: varchar('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }), // NULL for platform tasks
  creatorId: varchar('creator_id').references(() => creators.id, { onDelete: 'cascade' }), // NULL for platform tasks

  // Program & Campaign Association
  programId: varchar('program_id').references(() => loyaltyPrograms.id, { onDelete: 'cascade' }), // REQUIRED for creator tasks (enforced by DB constraint), NULL for platform tasks
  campaignId: varchar('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), // OPTIONAL - tasks can belong to a campaign

  // ============================================
  // SECTION 1: BASIC DETAILS
  // ============================================
  name: text('name').notNull(),
  description: text('description').notNull(),

  // Task Organization (Snag-Inspired)
  section: taskSectionEnum('section').notNull().default('custom'),

  // Task Configuration
  taskType: taskTypeEnum('task_type').notNull(),
  platform: socialPlatformEnum('platform').notNull(),

  // Time Constraints
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),

  // Special Flags
  isRequired: boolean('is_required').default(false), // Block other tasks until this is complete
  hideFromUI: boolean('hide_from_ui').default(false), // Hidden background task

  // ============================================
  // SECTION 2: REWARD CONFIGURATION (Snag-Inspired)
  // ============================================
  rewardType: rewardTypeEnum('reward_type').notNull().default('points'),

  // Points reward configuration
  pointsToReward: integer('points_to_reward').default(50),
  pointCurrency: text('point_currency').default('default'),

  // Multiplier reward configuration
  multiplierValue: decimal('multiplier_value', { precision: 4, scale: 2 }), // e.g., 1.50, 2.00, 3.00
  currenciesToApply: jsonb('currencies_to_apply').$type<string[]>(), // Which currencies the multiplier applies to
  applyToExistingBalance: boolean('apply_to_existing_balance').default(false),

  // Task-specific multiplier (Sprint 1 addition)
  baseMultiplier: decimal('base_multiplier', { precision: 10, scale: 2 }).default('1.00'), // Task-specific point multiplier
  multiplierConfig: jsonb('multiplier_config').$type<{
    stackingType?: 'additive' | 'multiplicative'; // How multipliers stack
    maxMultiplier?: number; // Cap on total multiplier (e.g., 10x max)
    allowEventMultipliers?: boolean; // Whether event multipliers apply
  }>(),

  // ============================================
  // SECTION 3: TIMING CONFIGURATION (Snag-Inspired)
  // ============================================
  updateCadence: updateCadenceEnum('update_cadence').notNull().default('immediate'),
  rewardFrequency: rewardFrequencyEnum('reward_frequency').notNull().default('one_time'),

  // ============================================
  // SECTION 4: TASK-SPECIFIC DATA
  // ============================================
  targetUrl: text('target_url'), // URL for posts/videos/playlists
  hashtags: jsonb('hashtags').$type<string[]>(), // Required hashtags
  inviteCode: text('invite_code'), // Discord/Telegram invites
  customInstructions: text('custom_instructions'), // Additional instructions

  // Custom settings for each task type (handles, URLs, required fields, etc.)
  customSettings: jsonb('custom_settings').$type<Record<string, unknown>>(),

  // ============================================
  // SECTION 5: ELIGIBILITY & TARGETING
  // ============================================
  eligibleAccountTypes: jsonb('eligible_account_types').$type<string[]>().default(['fan']),
  // ['fan', 'creator', 'creator-athlete', 'creator-musician', 'creator-content-creator']

  // ============================================
  // SECTION 6: VERIFICATION SYSTEM (Loyalty Engine Enhancement)
  // ============================================
  // Verification tier determines risk-adjusted scoring
  // T1: API verified (full points) - Spotify, YouTube, Discord, Twitch, Twitter Basic
  // T2: Code verified (85% points) - Code-in-comment/repost
  // T3: Starter pack (50% points) - Honor system with embedded profiles
  verificationTier: text('verification_tier').default('T3'), // 'T1' | 'T2' | 'T3'

  // Verification method determines how task completion is verified
  verificationMethod: text('verification_method').default('manual'),
  // 'api' | 'code_comment' | 'code_repost' | 'hashtag' | 'starter_pack' | 'manual'

  // Is this a starter pack task (one-time per platform per tenant)
  isStarterPack: boolean('is_starter_pack').default(false),

  // Group goal configuration (for community goals)
  isGroupGoal: boolean('is_group_goal').default(false),
  groupGoalConfig: jsonb('group_goal_config').$type<{
    metricType?:
      | 'followers'
      | 'likes'
      | 'views'
      | 'comments'
      | 'shares'
      | 'reactions'
      | 'subscribers';
    targetValue?: number;
    hashtag?: string;
    contentId?: string;
    contentUrl?: string;
  }>(),

  // ============================================
  // SECTION 7: STATUS & ANALYTICS
  // ============================================
  isActive: boolean('is_active').default(true),
  isDraft: boolean('is_draft').default(false),
  totalCompletions: integer('total_completions').default(0),

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Platform Tasks Table - Platform-wide tasks that award Fandomly Points
export const platformTasks = pgTable('platform_tasks', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Task Identity
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'profile', 'social', 'engagement'
  category: text('category').notNull(), // 'Profile Completion', 'Social Connection', etc.

  // Optional creator relationship (NULL for system-wide tasks)
  creatorId: varchar('creator_id'),

  // Reward Configuration
  points: integer('points').notNull().default(50), // Fandomly Points to award

  // Task Configuration
  requiredFields: jsonb('required_fields').$type<string[]>().default([]), // For profile tasks
  socialPlatform: text('social_platform'), // For social connection tasks

  // Eligibility — which account types can see/complete this task
  eligibleAccountTypes: jsonb('eligible_account_types').$type<string[]>().default(['fan']),

  // Status
  isActive: boolean('is_active').default(true),

  // Soft delete columns
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Task Templates Table - Platform-specific task templates
export const taskTemplates = pgTable('task_templates', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Template Identity
  name: text('name').notNull(), // e.g., "Follow on Twitter", "Like Facebook Page"
  description: text('description').notNull(),
  category: text('category').notNull().default('social'), // 'social', 'onboarding', etc.

  // Platform & Task Configuration
  platform: socialPlatformEnum('platform').notNull(),
  taskType: taskTypeEnum('task_type').notNull(),

  // Template Configuration - Flexible config for all platform-specific fields
  defaultConfig: jsonb('default_config').$type<Record<string, unknown>>(),

  // Removed defaultPoints - using defaultConfig.points as canonical source

  // Template Scope & Permissions
  isGlobal: boolean('is_global').notNull().default(true), // Global vs tenant-specific
  tenantId: varchar('tenant_id').references(() => tenants.id), // Null for global templates
  creatorId: varchar('creator_id').references(() => creators.id), // Creator who created custom template

  // Template Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Task Assignments (Many-to-Many: Tasks <-> Campaigns)
export const taskAssignments = pgTable('task_assignments', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  taskId: varchar('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id'), // Optional user assignment

  // Assignment Configuration
  displayOrder: integer('display_order').default(1),
  isActive: boolean('is_active').default(true),

  // Assignment-specific Overrides (optional)
  customRewardValue: integer('custom_reward_value'), // Override task's default reward
  customInstructions: text('custom_instructions'), // Campaign-specific instructions

  // Task ordering & dependencies (Campaign V2)
  taskOrder: integer('task_order').default(0), // Sequential position in campaign
  dependsOnTaskIds: jsonb('depends_on_task_ids').$type<string[]>().default([]), // Task IDs that must be done first
  isOptional: boolean('is_optional').default(false), // Optional task in campaign

  // Sponsor reference (Campaign V2)
  useSponsorHandle: boolean('use_sponsor_handle').default(false), // Use sponsor's social handle instead of creator's
  sponsorId: varchar('sponsor_id').references(() => campaignSponsors.id, { onDelete: 'set null' }),

  // Verification timing per-task override (Campaign V2)
  verificationTiming: text('verification_timing').default('immediate'), // 'immediate' | 'deferred'

  // Campaign-specific task description override
  taskDescriptionOverride: text('task_description_override'),

  assignedAt: timestamp('assigned_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campaign Participation Tracking
export const campaignParticipations = pgTable('campaign_participations', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(), // Belongs to tenant
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  memberId: varchar('member_id')
    .references(() => users.id)
    .notNull(),

  // Tracking
  participationCount: integer('participation_count').default(1),
  lastParticipation: timestamp('last_participation').defaultNow(),
  totalUnitsEarned: integer('total_units_earned').default(0),

  // Metadata
  participationData: jsonb('participation_data').$type<{
    triggerDetails?: unknown;
    rewardsEarned?: Array<{
      type: string;
      value: unknown;
      timestamp: string;
    }>;
  }>(),

  // Campaign V2: Progress tracking
  tasksCompleted: jsonb('tasks_completed').$type<string[]>().default([]), // Completed task assignment IDs
  tasksPendingVerification: jsonb('tasks_pending_verification')
    .$type<
      Array<{
        taskId: string;
        assignmentId: string;
        completedAt: string;
        proofUrl?: string;
        screenshotUrl?: string;
      }>
    >()
    .default([]),
  totalTasksRequired: integer('total_tasks_required').default(0), // Non-optional tasks count

  // Campaign V2: Completion
  campaignCompleted: boolean('campaign_completed').default(false),
  campaignCompletedAt: timestamp('campaign_completed_at'),
  completionBonusAwarded: boolean('completion_bonus_awarded').default(false),

  // Campaign V2: Progress metadata
  progressMetadata: jsonb('progress_metadata').$type<{
    currentStep?: number;
    blockedTasks?: string[];
    availableTasks?: string[];
    lastActivityAt?: string;
  }>(),

  createdAt: timestamp('created_at').defaultNow(),
});

// Task Completions - Track fan progress on tasks
export const taskCompletions = pgTable('task_completions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: varchar('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Completion Status
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed' | 'claimed'
  progress: integer('progress').default(0), // 0-100 percentage

  // Completion Data (task-specific tracking)
  completionData: jsonb('completion_data').$type<{
    // Check-in specific
    currentStreak?: number;
    lastCheckIn?: string; // ISO timestamp
    streakMilestones?: Array<{
      days: number;
      completedAt: string;
      pointsAwarded: number;
    }>;

    // Referral specific
    referredUsers?: Array<{
      userId: string;
      username: string;
      signupDate: string;
      qualified: boolean;
      pointsAwarded: number;
    }>;

    // Follower milestone specific
    currentFollowers?: number;
    milestonesReached?: Array<{
      threshold: number;
      reachedAt: string;
      pointsAwarded: number;
    }>;

    // Complete profile specific
    fieldsCompleted?: string[];
    fieldProgress?: Record<string, boolean>;

    // Generic completion tracking
    completedSteps?: number;
    totalSteps?: number;
    metadata?: Record<string, unknown>;
  }>(),

  // Rewards Tracking
  pointsEarned: integer('points_earned').default(0),
  totalRewardsEarned: integer('total_rewards_earned').default(0), // For repeating tasks

  // Timing
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),

  // Validation
  verifiedAt: timestamp('verified_at'), // When completion was verified
  verificationMethod: text('verification_method'), // 'auto' | 'manual' | 'api' | 'code_comment' | 'code_repost' | 'starter_pack'

  // Code-based verification tracking
  verificationCodeId: varchar('verification_code_id'), // Link to verification code used
  verificationCodeUsed: varchar('verification_code_used', { length: 8 }), // The actual code that was matched
  verificationConfidence: text('verification_confidence'), // 'high' | 'medium' | 'low'
  verificationTier: text('verification_tier'), // 'T1' | 'T2' | 'T3' (copied from task for reference)

  // Campaign association (for starter pack campaign exceptions)
  campaignId: varchar('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),

  // Completion context - enables campaign-specific completions of one-time tasks
  // 'standalone' = completed outside a campaign (default for backwards compatibility)
  // 'campaign' = completed as part of a specific campaign (allows re-earning points via re-verification)
  completionContext: text('completion_context').default('standalone'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Platform Task Completions - Track platform-wide task completions (separate from creator tasks)
export const platformTaskCompletions = pgTable('platform_task_completions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: varchar('task_id')
    .references(() => platformTasks.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Completion Status
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'verified'
  pointsAwarded: integer('points_awarded').default(0),

  // Completion Data
  completionData: jsonb('completion_data').$type<{
    socialPlatform?: string;
    verificationUrl?: string;
    screenshotUrl?: string;
    metadata?: Record<string, unknown>;
  }>(),

  // Timing
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  verifiedAt: timestamp('verified_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Manual Review Queue - Tasks requiring creator review (Instagram, Facebook, etc.)
export const manualReviewQueue = pgTable('manual_review_queue', {
  id: serial('id').primaryKey(),
  taskCompletionId: integer('task_completion_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  creatorId: integer('creator_id').notNull(),
  fanId: integer('fan_id').notNull(),
  taskId: integer('task_id').notNull(),

  // Platform and task info
  platform: varchar('platform', { length: 50 }).notNull(),
  taskType: varchar('task_type', { length: 100 }).notNull(),
  taskName: varchar('task_name', { length: 255 }).notNull(),

  // Proof data
  screenshotUrl: text('screenshot_url'),
  proofUrl: text('proof_url'),
  proofNotes: text('proof_notes'),

  // Review status
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  priority: varchar('priority', { length: 20 }).default('normal').notNull(),

  // Review details
  submittedAt: timestamp('submitted_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by'),
  reviewNotes: text('review_notes'),

  // Metadata
  autoCheckResult: jsonb('auto_check_result').$type<Record<string, unknown>>(),
  verificationAttempts: integer('verification_attempts').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Verification Attempts - Audit log of all verification attempts
export const verificationAttempts = pgTable('verification_attempts', {
  id: serial('id').primaryKey(),
  taskCompletionId: varchar('task_completion_id').notNull(),
  userId: varchar('user_id').notNull(),

  platform: varchar('platform', { length: 50 }).notNull(),
  verificationMethod: varchar('verification_method', { length: 50 }).notNull(),

  // Attempt details
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  verificationData: jsonb('verification_data').$type<Record<string, unknown>>(),

  // Timestamps
  attemptedAt: timestamp('attempted_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Platform Points Transactions - Track platform-wide points separate from creator programs
export const platformPointsTransactions = pgTable('platform_points_transactions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  points: integer('points').notNull(),
  source: varchar('source').notNull(), // 'task_completion' | 'daily_bonus' | 'referral' | 'admin_grant'
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reward Distribution Log - Track all point awards
export const rewardDistributions = pgTable('reward_distributions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // References
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: varchar('task_id')
    .references(() => tasks.id)
    .notNull(),
  taskCompletionId: varchar('task_completion_id').references(() => taskCompletions.id, {
    onDelete: 'cascade',
  }),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Reward Details
  rewardType: text('reward_type').notNull(), // 'points' | 'multiplier' | 'bonus'
  amount: integer('amount').notNull(), // Points awarded
  currency: text('currency').default('default'),

  // Context
  reason: text('reason').notNull(), // 'task_completion' | 'streak_bonus' | 'referral_bonus' | etc.
  description: text('description'),

  // Metadata
  metadata: jsonb('metadata').$type<{
    taskName?: string;
    taskType?: string;
    streakDays?: number;
    milestoneThreshold?: number;
    referredUsername?: string;
    [key: string]: unknown;
  }>(),

  createdAt: timestamp('created_at').defaultNow(),
});

// Program Announcements - Creator posts and updates
export const programAnnouncements = pgTable('program_announcements', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  programId: varchar('program_id')
    .references(() => loyaltyPrograms.id, { onDelete: 'cascade' })
    .notNull(),
  creatorId: varchar('creator_id')
    .references(() => creators.id, { onDelete: 'cascade' })
    .notNull(),

  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull().default('update'), // 'update' | 'new_campaign' | 'new_task' | 'achievement'

  metadata: jsonb('metadata').$type<{
    campaignId?: string;
    taskId?: string;
    imageUrl?: string;
  }>(),

  isPinned: boolean('is_pinned').default(false),
  isPublished: boolean('is_published').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// SPRINT 1: MULTIPLIERS & FREQUENCY TABLES
// ============================================

// Active Multipliers - System-wide, event-based, and time-based multipliers
export const activeMultipliers = pgTable('active_multipliers', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Ownership
  tenantId: varchar('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // NULL for platform-wide multipliers

  // Multiplier Identity
  name: text('name').notNull(), // e.g., "Weekend Bonus", "VIP Member Multiplier", "Holiday 3x Points"
  description: text('description'),
  type: multiplierTypeEnum('type').notNull(),

  // Multiplier Configuration
  multiplier: decimal('multiplier', { precision: 10, scale: 2 }).notNull(), // e.g., 1.50, 2.00, 3.00

  // Conditions - When this multiplier applies
  conditions: jsonb('conditions').$type<{
    // Time-based conditions
    startDate?: string; // ISO 8601 date
    endDate?: string;
    daysOfWeek?: number[]; // [0,6] for Sunday/Saturday
    timeRanges?: Array<{ start: string; end: string }>; // e.g., [{"start": "18:00", "end": "22:00"}]
    timezone?: string; // "America/New_York"

    // Streak-based conditions
    requiredStreak?: number; // Minimum consecutive days
    streakType?: 'daily_checkin' | 'task_completion'; // What creates the streak

    // Tier-based conditions
    requiredTier?: string; // 'basic' | 'premium' | 'vip'
    minPointsBalance?: number; // Minimum points required

    // Event/task-based conditions
    applicableTaskTypes?: string[]; // Only apply to specific task types
    applicableTaskIds?: string[]; // Only apply to specific tasks
    applicablePlatforms?: string[]; // Only apply to specific platforms

    // User conditions
    newUsersOnly?: boolean; // Only for users registered after a date
    userRegisteredAfter?: string; // ISO 8601 date
  }>(),

  // Stacking Rules
  stackingType: text('stacking_type').default('multiplicative'), // 'additive' | 'multiplicative'
  priority: integer('priority').default(0), // Higher priority = applied first
  canStackWithOthers: boolean('can_stack_with_others').default(true),

  // Status
  isActive: boolean('is_active').default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: varchar('created_by').references(() => users.id),
});

// Check-In Streaks - Track user streak data for check-in tasks
export const checkInStreaks = pgTable('check_in_streaks', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // References
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: varchar('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Streak Data
  currentStreak: integer('current_streak').default(0), // Current consecutive days
  longestStreak: integer('longest_streak').default(0), // All-time record
  totalCheckIns: integer('total_check_ins').default(0), // Lifetime total

  // Dates
  lastCheckIn: timestamp('last_check_in'), // Last check-in timestamp
  lastStreakReset: timestamp('last_streak_reset'), // When streak was broken

  // Metadata
  metadata: jsonb('metadata').$type<{
    streakMilestones?: Array<{ days: number; awardedAt: string }>; // Track milestone achievements
    missedDays?: number; // Days missed in current period
    longestStreakAchievedAt?: string; // When longest streak was achieved
  }>(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Website Visit Tracking - Track clicks and time on site for website_visit tasks
export const websiteVisitTracking = pgTable('website_visit_tracking', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // References
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: varchar('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  taskCompletionId: varchar('task_completion_id').references(() => taskCompletions.id),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Tracking Data
  uniqueToken: varchar('unique_token', { length: 100 }).notNull().unique(), // UUID for tracking
  destinationUrl: text('destination_url').notNull(), // Where user is visiting
  clickedAt: timestamp('clicked_at').defaultNow(), // When link was clicked
  timeOnSite: integer('time_on_site'), // Seconds spent on site (if tracked)
  actionCompleted: boolean('action_completed').default(false), // Did user complete required action
  completedAt: timestamp('completed_at'), // When action was completed

  // Metadata
  metadata: jsonb('metadata').$type<{
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    actionType?: string; // 'page_view' | 'scroll' | 'click' | 'form_submit'
  }>(),
});

// Poll/Quiz Responses - Store user responses to poll and quiz tasks
export const pollQuizResponses = pgTable('poll_quiz_responses', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // References
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: varchar('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  taskCompletionId: varchar('task_completion_id')
    .references(() => taskCompletions.id)
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Response Data
  responses: jsonb('responses').notNull().$type<
    Array<{
      questionId: string;
      questionText: string;
      selectedOptions: number[]; // Array of option indices selected
      isCorrect?: boolean; // For quiz questions
    }>
  >(),

  // Quiz Scoring (if applicable)
  score: decimal('score', { precision: 5, scale: 2 }), // Percentage score 0-100
  totalQuestions: integer('total_questions'),
  correctAnswers: integer('correct_answers'),
  isPerfectScore: boolean('is_perfect_score').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, {
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  memberships: many(tenantMemberships),
  creators: many(creators),
  loyaltyPrograms: many(loyaltyPrograms),
  campaigns: many(campaigns),
  tasks: many(tasks),
  rewards: many(rewards),
  fanPrograms: many(fanPrograms),
  pointTransactions: many(pointTransactions),
  rewardRedemptions: many(rewardRedemptions),
  campaignParticipations: many(campaignParticipations),
  taskCompletions: many(taskCompletions),
  taskAssignments: many(taskAssignments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  currentTenant: one(tenants, {
    fields: [users.currentTenantId],
    references: [tenants.id],
  }),
  ownedTenants: many(tenants, {
    relationName: 'ownedTenants',
  }),
  tenantMemberships: many(tenantMemberships),
  creator: one(creators, {
    fields: [users.id],
    references: [creators.userId],
  }),
  fanPrograms: many(fanPrograms),
  rewardRedemptions: many(rewardRedemptions),
  socialConnections: many(socialConnections),
  agency: one(agencies, {
    fields: [users.agencyId],
    references: [agencies.id],
  }),
  ownedAgencies: many(agencies),
  taskCompletions: many(taskCompletions),
  taskAssignments: many(taskAssignments),
  platformTaskCompletions: many(platformTaskCompletions),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one }) => ({
  user: one(users, {
    fields: [socialConnections.userId],
    references: [users.id],
  }),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMemberships.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMemberships.userId],
    references: [users.id],
  }),
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  user: one(users, {
    fields: [creators.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [creators.tenantId],
    references: [tenants.id],
  }),
  loyaltyPrograms: many(loyaltyPrograms),
  campaigns: many(campaigns),
  tasks: many(tasks),
  platformTasks: many(platformTasks),
}));

// Agency Relations
export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  owner: one(users, {
    fields: [agencies.ownerUserId],
    references: [users.id],
  }),
  agencyTenants: many(agencyTenants),
}));

export const agencyTenantsRelations = relations(agencyTenants, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyTenants.agencyId],
    references: [agencies.id],
  }),
  tenant: one(tenants, {
    fields: [agencyTenants.tenantId],
    references: [tenants.id],
  }),
}));

export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [loyaltyPrograms.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [loyaltyPrograms.creatorId],
    references: [creators.id],
  }),
  rewards: many(rewards),
  fanPrograms: many(fanPrograms),
  tasks: many(tasks),
  taskCompletions: many(taskCompletions),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rewards.tenantId],
    references: [tenants.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [rewards.programId],
    references: [loyaltyPrograms.id],
  }),
  redemptions: many(rewardRedemptions),
}));

export const fanProgramsRelations = relations(fanPrograms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [fanPrograms.tenantId],
    references: [tenants.id],
  }),
  fan: one(users, {
    fields: [fanPrograms.fanId],
    references: [users.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [fanPrograms.programId],
    references: [loyaltyPrograms.id],
  }),
  pointTransactions: many(pointTransactions),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [pointTransactions.tenantId],
    references: [tenants.id],
  }),
  fanProgram: one(fanPrograms, {
    fields: [pointTransactions.fanProgramId],
    references: [fanPrograms.id],
  }),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rewardRedemptions.tenantId],
    references: [tenants.id],
  }),
  fan: one(users, {
    fields: [rewardRedemptions.fanId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [rewardRedemptions.rewardId],
    references: [rewards.id],
  }),
}));

// Campaign Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [campaigns.creatorId],
    references: [creators.id],
  }),
  rules: many(campaignRules),
  participations: many(campaignParticipations),
  tasks: many(tasks),
  taskCompletions: many(taskCompletions),
  sponsors: many(campaignSponsors),
  verificationJobs: many(campaignVerificationQueue),
  accessLogs: many(campaignAccessLogs),
}));

export const campaignRulesRelations = relations(campaignRules, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignRules.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignParticipationsRelations = relations(campaignParticipations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [campaignParticipations.tenantId],
    references: [tenants.id],
  }),
  campaign: one(campaigns, {
    fields: [campaignParticipations.campaignId],
    references: [campaigns.id],
  }),
  member: one(users, {
    fields: [campaignParticipations.memberId],
    references: [users.id],
  }),
}));

// ============================================================================
// TASK RELATIONS
// ============================================================================

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tasks.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [tasks.creatorId],
    references: [creators.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [tasks.programId],
    references: [loyaltyPrograms.id],
  }),
  campaign: one(campaigns, {
    fields: [tasks.campaignId],
    references: [campaigns.id],
  }),
  completions: many(taskCompletions),
  assignments: many(taskAssignments),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCompletions.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskCompletions.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [taskCompletions.tenantId],
    references: [tenants.id],
  }),
  // Note: programId and campaignId don't exist on task_completions table
  // Access these via task.program and task.campaign instead
}));

export const platformTasksRelations = relations(platformTasks, ({ one, many }) => ({
  creator: one(creators, {
    fields: [platformTasks.creatorId],
    references: [creators.id],
  }),
  completions: many(platformTaskCompletions),
}));

export const platformTaskCompletionsRelations = relations(platformTaskCompletions, ({ one }) => ({
  task: one(platformTasks, {
    fields: [platformTaskCompletions.taskId],
    references: [platformTasks.id],
  }),
  user: one(users, {
    fields: [platformTaskCompletions.userId],
    references: [users.id],
  }),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignments.taskId],
    references: [tasks.id],
  }),
  campaign: one(campaigns, {
    fields: [taskAssignments.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [taskAssignments.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [taskAssignments.tenantId],
    references: [tenants.id],
  }),
  sponsor: one(campaignSponsors, {
    fields: [taskAssignments.sponsorId],
    references: [campaignSponsors.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
});

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export const insertFanProgramSchema = createInsertSchema(fanPrograms).omit({
  id: true,
  joinedAt: true,
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertRewardRedemptionSchema = createInsertSchema(rewardRedemptions).omit({
  id: true,
  redeemedAt: true,
});

// Campaign Schemas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  totalIssued: true,
  totalParticipants: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignRuleSchema = createInsertSchema(campaignRules).omit({
  id: true,
  createdAt: true,
});

// insertSocialCampaignTaskSchema removed — table dropped in migration 0043

// Task Schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  totalCompletions: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  assignedAt: true,
  updatedAt: true,
});

export const insertCampaignParticipationSchema = createInsertSchema(campaignParticipations).omit({
  id: true,
  createdAt: true,
});

// Tenant Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  usage: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantMembershipSchema = createInsertSchema(tenantMemberships).omit({
  id: true,
  joinedAt: true,
  lastActiveAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type TenantMembership = typeof tenantMemberships.$inferSelect;
export type InsertTenantMembership = z.infer<typeof insertTenantMembershipSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;

// Agency Types
export const insertAgencySchema = createInsertSchema(agencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgencyTenantSchema = createInsertSchema(agencyTenants).omit({
  id: true,
  createdAt: true,
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type AgencyTenant = typeof agencyTenants.$inferSelect;
export type InsertAgencyTenant = z.infer<typeof insertAgencyTenantSchema>;

export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type InsertLoyaltyProgram = z.infer<typeof insertLoyaltyProgramSchema>;
// Alias for clarity - Program is the top-level container
export type Program = LoyaltyProgram;
export type InsertProgram = InsertLoyaltyProgram;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type FanProgram = typeof fanPrograms.$inferSelect;
export type InsertFanProgram = z.infer<typeof insertFanProgramSchema>;

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = z.infer<typeof insertRewardRedemptionSchema>;

// Notification Types
export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Campaign Types
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignRule = typeof campaignRules.$inferSelect;
export type InsertCampaignRule = z.infer<typeof insertCampaignRuleSchema>;
export type CampaignParticipation = typeof campaignParticipations.$inferSelect;
export type InsertCampaignParticipation = z.infer<typeof insertCampaignParticipationSchema>;

// Task Template Schemas
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Task Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertTaskCompletion = typeof taskCompletions.$inferInsert;

// Enriched TaskCompletion with frequency eligibility data
export interface TaskCompletionEnriched extends TaskCompletion {
  isAvailableAgain?: boolean;
  nextAvailableAt?: Date | null;
  timeRemaining?: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null;
}
export type RewardDistribution = typeof rewardDistributions.$inferSelect;
export type InsertRewardDistribution = typeof rewardDistributions.$inferInsert;

// Achievement System Tables
export const achievements = pgTable('achievements', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id),
  name: varchar('name').notNull(),
  description: varchar('description').notNull(),
  icon: varchar('icon').notNull(), // Icon name from Lucide
  category: varchar('category').notNull(), // "social", "engagement", "milestones", "special"
  type: varchar('type').notNull(), // "bronze", "silver", "gold", "platinum", "diamond"
  pointsRequired: integer('points_required').default(0),
  actionRequired: varchar('action_required'), // "follow", "campaign_complete", "points_earned", etc.
  actionCount: integer('action_count').default(1), // How many times action must be performed
  rewardPoints: integer('reward_points').default(0),
  rewardType: varchar('reward_type'), // "points", "badge", "nft", "discount", "access"
  rewardValue: varchar('reward_value'), // JSON string for reward details
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userAchievements = pgTable('user_achievements', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull(),
  achievementId: varchar('achievement_id').references(() => achievements.id),
  progress: integer('progress').default(0), // Current progress towards achievement
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),
  earnedAt: timestamp('earned_at'), // When achievement was earned
  claimed: boolean('claimed').default(false),
  claimedAt: timestamp('claimed_at'),

  // Soft delete columns
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// user_levels table removed in migration 0043 (zero references, never implemented)

// Achievement Schemas
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
});

// insertUserLevelSchema removed — table dropped in migration 0043

// Achievement Types
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
// UserLevel / InsertUserLevel types removed — table dropped in migration 0043

// ============================================================================
// REFERRAL ENGINE TABLES
// ============================================================================

// Status enums for referrals
export const referralStatusEnum = pgEnum('referral_status', [
  'pending',
  'active',
  'completed',
  'expired',
  'cancelled',
]);

// Creator → Creator Referrals (Revenue Share)
export const creatorReferrals = pgTable('creator_referrals', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Participants
  referringCreatorId: varchar('referring_creator_id')
    .notNull()
    .references(() => creators.id),
  referredCreatorId: varchar('referred_creator_id').references(() => creators.id),

  // Referral Codes
  referralCode: varchar('referral_code', { length: 50 }).unique().notNull(),
  referralUrl: text('referral_url').notNull(),

  // Tracking
  clickCount: integer('click_count').default(0),
  signupDate: timestamp('signup_date'),
  firstPaidDate: timestamp('first_paid_date'),

  // Revenue Tracking
  totalRevenueGenerated: decimal('total_revenue_generated', { precision: 10, scale: 2 }).default(
    '0'
  ),
  totalCommissionEarned: decimal('total_commission_earned', { precision: 10, scale: 2 }).default(
    '0'
  ),
  commissionEarned: decimal('commission_earned', { precision: 10, scale: 2 }).default('0'), // Actual commission amount
  commissionPercentage: decimal('commission_percentage', { precision: 5, scale: 2 }).default(
    '10.00'
  ),

  // Soft delete columns
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  // Status
  status: referralStatusEnum('status').default('active'),
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Fan → Fan Referrals (Platform Rewards)
export const fanReferrals = pgTable('fan_referrals', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Participants
  referringFanId: varchar('referring_fan_id')
    .notNull()
    .references(() => users.id),
  referredFanId: varchar('referred_fan_id').references(() => users.id),

  // Referral Codes
  referralCode: varchar('referral_code', { length: 50 }).unique().notNull(),
  referralUrl: text('referral_url').notNull(),

  // Tracking
  clickCount: integer('click_count').default(0),
  signupDate: timestamp('signup_date'),
  firstTaskCompletedAt: timestamp('first_task_completed_at'),
  profileCompletedAt: timestamp('profile_completed_at'),

  // Points Tracking (Fandomly Points)
  totalPointsReferredUserEarned: integer('total_points_referred_user_earned').default(0),
  totalPointsReferrerEarned: integer('total_points_referrer_earned').default(0),

  // Percentage Earnings
  percentageRewardsEnabled: boolean('percentage_rewards_enabled').default(false),
  percentageValue: decimal('percentage_value', { precision: 5, scale: 2 }).default('0'),
  percentageExpiresAt: timestamp('percentage_expires_at'),

  // Status
  status: referralStatusEnum('status').default('pending'),

  // Soft-delete fields (SaaS industry standard)
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by'),
  deletionReason: text('deletion_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Creator Task/Campaign Referrals (Creator Points)
export const creatorTaskReferrals = pgTable('creator_task_referrals', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Context
  creatorId: varchar('creator_id')
    .notNull()
    .references(() => creators.id),
  taskId: varchar('task_id').references(() => tasks.id),
  campaignId: varchar('campaign_id').references(() => campaigns.id),

  // Participants
  referringFanId: varchar('referring_fan_id')
    .notNull()
    .references(() => users.id),
  referredFanId: varchar('referred_fan_id').references(() => users.id),

  // Referral Codes
  referralCode: varchar('referral_code', { length: 100 }).unique().notNull(),
  referralUrl: text('referral_url').notNull(),
  referralType: varchar('referral_type', { length: 20 }).notNull(), // 'task' or 'campaign'

  // Tracking
  clickCount: integer('click_count').default(0),
  signupDate: timestamp('signup_date'),
  joinedCreatorDate: timestamp('joined_creator_date'),
  completedTaskDate: timestamp('completed_task_date'),

  // Points Tracking (Creator Points)
  totalCreatorPointsEarned: integer('total_creator_points_earned').default(0),
  sharePercentage: decimal('share_percentage', { precision: 5, scale: 2 }).default('0'),
  shareExpiresAt: timestamp('share_expires_at'),

  // Status
  status: referralStatusEnum('status').default('pending'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Referral Schemas
export const insertCreatorReferralSchema = createInsertSchema(creatorReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFanReferralSchema = createInsertSchema(fanReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreatorTaskReferralSchema = createInsertSchema(creatorTaskReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Platform Tasks Schemas
export const insertPlatformTaskSchema = createInsertSchema(platformTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Referral Types
export type CreatorReferral = typeof creatorReferrals.$inferSelect;
export type InsertCreatorReferral = z.infer<typeof insertCreatorReferralSchema>;
export type FanReferral = typeof fanReferrals.$inferSelect;
export type InsertFanReferral = z.infer<typeof insertFanReferralSchema>;
export type CreatorTaskReferral = typeof creatorTaskReferrals.$inferSelect;
export type InsertCreatorTaskReferral = z.infer<typeof insertCreatorTaskReferralSchema>;

// Platform Task Types
export type PlatformTask = typeof platformTasks.$inferSelect;
export type InsertPlatformTask = z.infer<typeof insertPlatformTaskSchema>;

// ============================================================================
// REFERRAL RELATIONS
// ============================================================================

export const creatorReferralsRelations = relations(creatorReferrals, ({ one }) => ({
  referringCreator: one(creators, {
    fields: [creatorReferrals.referringCreatorId],
    references: [creators.id],
  }),
  referredCreator: one(creators, {
    fields: [creatorReferrals.referredCreatorId],
    references: [creators.id],
  }),
}));

export const fanReferralsRelations = relations(fanReferrals, ({ one }) => ({
  referringFan: one(users, {
    fields: [fanReferrals.referringFanId],
    references: [users.id],
  }),
  referredFan: one(users, {
    fields: [fanReferrals.referredFanId],
    references: [users.id],
  }),
}));

export const creatorTaskReferralsRelations = relations(creatorTaskReferrals, ({ one }) => ({
  creator: one(creators, {
    fields: [creatorTaskReferrals.creatorId],
    references: [creators.id],
  }),
  task: one(tasks, {
    fields: [creatorTaskReferrals.taskId],
    references: [tasks.id],
  }),
  campaign: one(campaigns, {
    fields: [creatorTaskReferrals.campaignId],
    references: [campaigns.id],
  }),
  referringFan: one(users, {
    fields: [creatorTaskReferrals.referringFanId],
    references: [users.id],
  }),
  referredFan: one(users, {
    fields: [creatorTaskReferrals.referredFanId],
    references: [users.id],
  }),
}));

// ============================================================================
// NFT & CROSSMINT INTEGRATION TABLES
// ============================================================================

// Token type enum for NFT collections
export const nftTokenTypeEnum = pgEnum('nft_token_type', [
  'ERC721',
  'ERC1155',
  'SOLANA',
  'SOLANA_COMPRESSED',
]);

// NFT mint status enum
export const nftMintStatusEnum = pgEnum('nft_mint_status', [
  'pending',
  'processing',
  'success',
  'failed',
]);

// NFT category enum for templates
export const nftCategoryEnum = pgEnum('nft_category', [
  'badge_credential',
  'digital_art',
  'collectible',
  'reward_perk',
  'event_ticket',
  'custom',
]);

// NFT Collections - Creator-owned or Fandomly platform collections
export const nftCollections = pgTable('nft_collections', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Ownership
  creatorId: varchar('creator_id').references(() => creators.id),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Crossmint Integration
  crossmintCollectionId: text('crossmint_collection_id').unique(), // Crossmint's collection ID

  // Collection Details
  name: text('name').notNull(),
  description: text('description'),
  symbol: text('symbol'), // Token symbol (e.g., "BADGE", "FAN")

  // Blockchain Configuration
  chain: text('chain').notNull(), // "polygon", "base", "solana", etc.
  contractAddress: text('contract_address'), // Deployed contract address
  tokenType: nftTokenTypeEnum('token_type').notNull().default('ERC721'),

  // Ownership Control
  isCreatorOwned: boolean('is_creator_owned').default(true), // false for Fandomly platform badges
  ownerWalletAddress: text('owner_wallet_address'), // Creator's wallet that owns the contract

  // Collection Metadata
  metadata: jsonb('metadata').$type<{
    totalSupply?: number;
    maxSupply?: number;
    royaltyPercentage?: number; // 0-10%
    baseTokenURI?: string;
    collectionImageUrl?: string;
    externalUrl?: string;
  }>(),

  // Status
  isActive: boolean('is_active').default(true),
  deployedAt: timestamp('deployed_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Fandomly Badge Templates - Platform-wide badge credentials
export const fandomlyBadgeTemplates = pgTable('fandomly_badge_templates', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Badge Identity
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // "achievement", "milestone", "special", "event"

  // Badge Requirements
  requirementType: text('requirement_type').notNull(), // "task_completion", "points_threshold", "referrals", "streak", "manual"
  requirementData: jsonb('requirement_data').$type<{
    taskId?: string;
    pointsRequired?: number;
    referralsRequired?: number;
    streakDays?: number;
    customCriteria?: string;
  }>(),

  // Visual Design
  imageUrl: text('image_url').notNull(),
  badgeColor: text('badge_color'), // Hex color for badge styling

  // NFT Metadata
  nftMetadata: jsonb('nft_metadata').$type<{
    attributes: Array<{ trait_type: string; value: string }>;
    rarity?: string; // "common", "uncommon", "rare", "epic", "legendary"
  }>(),

  // Linked Collection
  collectionId: varchar('collection_id').references(() => nftCollections.id),

  // On-chain badge type ID (from FandomlyBadge contract)
  onChainBadgeTypeId: integer('on_chain_badge_type_id'),

  // Status
  isActive: boolean('is_active').default(true),
  totalIssued: integer('total_issued').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// NFT Templates - Creator-defined NFT templates for their collections
export const nftTemplates = pgTable('nft_templates', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Collection Association
  collectionId: varchar('collection_id')
    .references(() => nftCollections.id)
    .notNull(),
  tenantId: varchar('tenant_id')
    .references(() => tenants.id)
    .notNull(),

  // Template Details
  name: text('name').notNull(),
  description: text('description'),
  category: nftCategoryEnum('category').notNull().default('custom'),

  // NFT Metadata
  metadata: jsonb('metadata')
    .$type<{
      image: string; // IPFS or URL
      animationUrl?: string;
      externalUrl?: string;
      attributes: Array<{ trait_type: string; value: string; display_type?: string }>;
      rarity?: string;
      properties?: Record<string, unknown>;
    }>()
    .notNull(),

  // Supply & Pricing
  mintPrice: integer('mint_price').default(0), // Points cost (0 = free)
  maxSupply: integer('max_supply'), // null = unlimited
  currentSupply: integer('current_supply').default(0),

  // Template Status
  isActive: boolean('is_active').default(true),
  isDraft: boolean('is_draft').default(true),
  publishedAt: timestamp('published_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// NFT Mints - Track all minting operations
export const nftMints = pgTable('nft_mints', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Mint Operation Details
  crossmintActionId: text('crossmint_action_id').unique().notNull(), // Crossmint's action ID for status tracking

  // Source Information
  collectionId: varchar('collection_id')
    .references(() => nftCollections.id)
    .notNull(),
  templateId: varchar('template_id').references(() => nftTemplates.id), // null for badge mints
  badgeTemplateId: varchar('badge_template_id').references(() => fandomlyBadgeTemplates.id), // null for regular NFTs

  // Recipient Information
  recipientUserId: varchar('recipient_user_id')
    .references(() => users.id)
    .notNull(),
  recipientWalletAddress: text('recipient_wallet_address').notNull(), // Recipient wallet address
  recipientChain: text('recipient_chain').notNull(), // Chain where NFT was minted

  // Mint Context
  mintReason: text('mint_reason').notNull(), // "reward_redemption", "task_completion", "badge_achievement", "direct_mint", "admin_issued"
  contextData: jsonb('context_data').$type<{
    rewardId?: string;
    taskId?: string;
    pointsSpent?: number;
    adminUserId?: string;
    notes?: string;
  }>(),

  // Blockchain Details
  tokenId: text('token_id'), // On-chain token ID
  txHash: text('tx_hash'), // Transaction hash
  contractAddress: text('contract_address'), // Deployed contract address

  // Status Tracking
  status: nftMintStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'), // If failed
  retryCount: integer('retry_count').default(0),

  // Timestamps
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// NFT Deliveries - Track successful NFT deliveries to users
export const nftDeliveries = pgTable('nft_deliveries', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Links
  mintId: varchar('mint_id')
    .references(() => nftMints.id)
    .notNull()
    .unique(), // One delivery per mint
  userId: varchar('user_id')
    .references(() => users.id)
    .notNull(),
  collectionId: varchar('collection_id')
    .references(() => nftCollections.id)
    .notNull(),

  // NFT Details
  tokenId: text('token_id').notNull(),
  txHash: text('tx_hash').notNull(),
  chain: text('chain').notNull(),
  contractAddress: text('contract_address').notNull(),

  // Metadata Snapshot (for quick display without blockchain calls)
  metadataSnapshot: jsonb('metadata_snapshot')
    .$type<{
      name: string;
      description?: string;
      image: string;
      attributes?: Array<{ trait_type: string; value: string }>;
    }>()
    .notNull(),

  // Delivery Status
  isViewed: boolean('is_viewed').default(false), // Has user seen this NFT?
  viewedAt: timestamp('viewed_at'),

  // Notification
  notificationSent: boolean('notification_sent').default(false),
  notificationSentAt: timestamp('notification_sent_at'),

  deliveredAt: timestamp('delivered_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// NFT RELATIONS
// ============================================================================

export const nftCollectionsRelations = relations(nftCollections, ({ one, many }) => ({
  creator: one(creators, {
    fields: [nftCollections.creatorId],
    references: [creators.id],
  }),
  tenant: one(tenants, {
    fields: [nftCollections.tenantId],
    references: [tenants.id],
  }),
  templates: many(nftTemplates),
  mints: many(nftMints),
  badgeTemplates: many(fandomlyBadgeTemplates),
}));

export const nftTemplatesRelations = relations(nftTemplates, ({ one, many }) => ({
  collection: one(nftCollections, {
    fields: [nftTemplates.collectionId],
    references: [nftCollections.id],
  }),
  tenant: one(tenants, {
    fields: [nftTemplates.tenantId],
    references: [tenants.id],
  }),
  mints: many(nftMints),
}));

export const fandomlyBadgeTemplatesRelations = relations(
  fandomlyBadgeTemplates,
  ({ one, many }) => ({
    collection: one(nftCollections, {
      fields: [fandomlyBadgeTemplates.collectionId],
      references: [nftCollections.id],
    }),
    mints: many(nftMints),
  })
);

export const nftMintsRelations = relations(nftMints, ({ one }) => ({
  collection: one(nftCollections, {
    fields: [nftMints.collectionId],
    references: [nftCollections.id],
  }),
  template: one(nftTemplates, {
    fields: [nftMints.templateId],
    references: [nftTemplates.id],
  }),
  badgeTemplate: one(fandomlyBadgeTemplates, {
    fields: [nftMints.badgeTemplateId],
    references: [fandomlyBadgeTemplates.id],
  }),
  recipientUser: one(users, {
    fields: [nftMints.recipientUserId],
    references: [users.id],
  }),
  delivery: one(nftDeliveries, {
    fields: [nftMints.id],
    references: [nftDeliveries.mintId],
  }),
}));

export const nftDeliveriesRelations = relations(nftDeliveries, ({ one }) => ({
  mint: one(nftMints, {
    fields: [nftDeliveries.mintId],
    references: [nftMints.id],
  }),
  user: one(users, {
    fields: [nftDeliveries.userId],
    references: [users.id],
  }),
  collection: one(nftCollections, {
    fields: [nftDeliveries.collectionId],
    references: [nftCollections.id],
  }),
}));

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'verify',
  'unverify',
  'login',
  'logout',
  'export',
  'import',
  'grant_permission',
  'revoke_permission',
]);

export const auditResourceEnum = pgEnum('audit_resource', [
  'user',
  'creator',
  'program',
  'task',
  'reward',
  'physical_reward',
  'verification',
  'subscription',
  'payment',
  'admin_settings',
  'tenant',
  'nft_collection',
  'nft_template',
  'badge_template',
]);

export const auditLog = pgTable('audit_log', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Who performed the action
  userId: varchar('user_id').references(() => users.id, { onDelete: 'set null' }),
  userRole: userRoleEnum('user_role'),

  // What was done
  action: auditActionEnum('action').notNull(),
  resource: auditResourceEnum('resource').notNull(),
  resourceId: varchar('resource_id'),

  // Context
  tenantId: varchar('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),

  // Change details
  changes: jsonb('changes').$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }>(),

  // Additional metadata
  metadata: jsonb('metadata').$type<{
    endpoint?: string;
    method?: string;
    statusCode?: number;
    errorMessage?: string;
    [key: string]: unknown;
  }>(),

  // Security tracking
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
  userAgent: text('user_agent'),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLog);
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ============================================================================
// NFT ZOD SCHEMAS & TYPES
// ============================================================================

export const insertNftCollectionSchema = createInsertSchema(nftCollections);
export const insertNftTemplateSchema = createInsertSchema(nftTemplates);
export const insertFandomlyBadgeTemplateSchema = createInsertSchema(fandomlyBadgeTemplates);
export const insertNftMintSchema = createInsertSchema(nftMints);
export const insertNftDeliverySchema = createInsertSchema(nftDeliveries);

export type NftCollection = typeof nftCollections.$inferSelect;
export type InsertNftCollection = typeof nftCollections.$inferInsert;
export type NftTemplate = typeof nftTemplates.$inferSelect;
export type InsertNftTemplate = typeof nftTemplates.$inferInsert;
export type FandomlyBadgeTemplate = typeof fandomlyBadgeTemplates.$inferSelect;
export type InsertFandomlyBadgeTemplate = typeof fandomlyBadgeTemplates.$inferInsert;
export type NftMint = typeof nftMints.$inferSelect;
export type InsertNftMint = typeof nftMints.$inferInsert;
export type NftDelivery = typeof nftDeliveries.$inferSelect;
export type InsertNftDelivery = typeof nftDeliveries.$inferInsert;

// ============================================================================
// VERIFICATION SYSTEM - Code-based verification for social tasks
// ============================================================================

// Verification tier enum for risk-adjusted scoring
export const verificationTierEnum = pgEnum('verification_tier', ['T1', 'T2', 'T3']);

// Verification method enum
export const verificationMethodEnum = pgEnum('verification_method', [
  'api', // T1: Direct API verification (Spotify, YouTube, Discord, Twitch, Twitter Basic)
  'code_comment', // T2: Code in comment
  'code_repost', // T2: Code in quote/repost
  'hashtag', // Group: Hashtag tracking for group goals
  'starter_pack', // T3: Embedded profile, honor system
  'manual', // T3: Manual review by creator
]);

// Code type enum for verification codes
export const codeTypeEnum = pgEnum('code_type', ['comment', 'repost', 'hashtag']);

// Group goal status enum
export const groupGoalStatusEnum = pgEnum('group_goal_status', [
  'active',
  'completed',
  'expired',
  'cancelled',
]);

// Group goal metric type enum
export const groupGoalMetricEnum = pgEnum('group_goal_metric', [
  'followers',
  'likes',
  'views',
  'comments',
  'shares',
  'reactions',
  'subscribers',
  'concurrent_viewers',
]);

// Verification Codes Table - Unique codes for each fan per task
export const verificationCodes = pgTable('verification_codes', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 8 }).notNull().unique(),
  taskId: varchar('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  fanId: varchar('fan_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Code configuration
  codeType: codeTypeEnum('code_type').notNull(),

  // Usage tracking
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at'),

  // Expiration (optional - some codes may expire)
  expiresAt: timestamp('expires_at'),

  // Verification result
  verificationData: jsonb('verification_data').$type<{
    platform?: string;
    contentId?: string;
    authorId?: string;
    authorUsername?: string;
    commentText?: string;
    matchedAt?: string;
    confidence?: number;
  }>(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  task: one(tasks, {
    fields: [verificationCodes.taskId],
    references: [tasks.id],
  }),
  fan: one(users, {
    fields: [verificationCodes.fanId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [verificationCodes.tenantId],
    references: [tenants.id],
  }),
}));

// Group Goals Table - Community goals with collective rewards
export const groupGoals = pgTable('group_goals', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: varchar('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  creatorId: varchar('creator_id')
    .notNull()
    .references(() => creators.id, { onDelete: 'cascade' }),

  // Goal definition
  platform: socialPlatformEnum('platform').notNull(),
  metricType: groupGoalMetricEnum('metric_type').notNull(),
  targetValue: integer('target_value').notNull(),
  currentValue: integer('current_value').default(0),

  // Hashtag for participation tracking (optional)
  hashtag: varchar('hashtag', { length: 50 }),

  // Content being tracked (e.g., specific post/video)
  contentId: varchar('content_id'),
  contentUrl: text('content_url'),

  // Rewards
  pointsPerParticipant: integer('points_per_participant').notNull().default(50),
  bonusPointsOnCompletion: integer('bonus_points_on_completion').default(0),

  // Status
  status: groupGoalStatusEnum('status').default('active'),
  completedAt: timestamp('completed_at'),

  // Progress tracking
  lastCheckedAt: timestamp('last_checked_at'),
  checkCount: integer('check_count').default(0),

  // Time constraints
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const groupGoalsRelations = relations(groupGoals, ({ one, many }) => ({
  task: one(tasks, {
    fields: [groupGoals.taskId],
    references: [tasks.id],
  }),
  tenant: one(tenants, {
    fields: [groupGoals.tenantId],
    references: [tenants.id],
  }),
  creator: one(creators, {
    fields: [groupGoals.creatorId],
    references: [creators.id],
  }),
  participants: many(groupGoalParticipants),
}));

// Group Goal Participants Table - Fans enrolled in group goals
export const groupGoalParticipants = pgTable('group_goal_participants', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  groupGoalId: varchar('group_goal_id')
    .notNull()
    .references(() => groupGoals.id, { onDelete: 'cascade' }),
  fanId: varchar('fan_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Participation tracking
  joinedAt: timestamp('joined_at').defaultNow(),

  // Rewards (awarded when goal completes)
  rewardedAt: timestamp('rewarded_at'),
  pointsAwarded: integer('points_awarded'),

  // Contribution tracking (optional - for future use)
  contributionData: jsonb('contribution_data').$type<{
    hashtagPostUrl?: string;
    engagementProof?: string;
    contributedAt?: string;
  }>(),

  createdAt: timestamp('created_at').defaultNow(),
});

export const groupGoalParticipantsRelations = relations(groupGoalParticipants, ({ one }) => ({
  groupGoal: one(groupGoals, {
    fields: [groupGoalParticipants.groupGoalId],
    references: [groupGoals.id],
  }),
  fan: one(users, {
    fields: [groupGoalParticipants.fanId],
    references: [users.id],
  }),
}));

// Starter Pack Completions Table - One-time starter pack completions per platform per tenant
export const starterPackCompletions = pgTable('starter_pack_completions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fanId: varchar('fan_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),

  // Campaign-specific completion (NULL for global, set for campaign-specific)
  campaignId: varchar('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),

  // Link to task completion record
  taskCompletionId: varchar('task_completion_id').references(() => taskCompletions.id, {
    onDelete: 'set null',
  }),
  taskId: varchar('task_id').references(() => tasks.id, { onDelete: 'set null' }),

  // Points awarded (for reference)
  pointsAwarded: integer('points_awarded'),

  completedAt: timestamp('completed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const starterPackCompletionsRelations = relations(starterPackCompletions, ({ one }) => ({
  fan: one(users, {
    fields: [starterPackCompletions.fanId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [starterPackCompletions.tenantId],
    references: [tenants.id],
  }),
  campaign: one(campaigns, {
    fields: [starterPackCompletions.campaignId],
    references: [campaigns.id],
  }),
  taskCompletion: one(taskCompletions, {
    fields: [starterPackCompletions.taskCompletionId],
    references: [taskCompletions.id],
  }),
  task: one(tasks, {
    fields: [starterPackCompletions.taskId],
    references: [tasks.id],
  }),
}));

// Zod schemas and types for new tables
export const insertVerificationCodeSchema = createInsertSchema(verificationCodes);
export const insertGroupGoalSchema = createInsertSchema(groupGoals);
export const insertGroupGoalParticipantSchema = createInsertSchema(groupGoalParticipants);
export const insertStarterPackCompletionSchema = createInsertSchema(starterPackCompletions);

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;
export type GroupGoal = typeof groupGoals.$inferSelect;
export type InsertGroupGoal = typeof groupGoals.$inferInsert;
export type GroupGoalParticipant = typeof groupGoalParticipants.$inferSelect;
export type InsertGroupGoalParticipant = typeof groupGoalParticipants.$inferInsert;
export type StarterPackCompletion = typeof starterPackCompletions.$inferSelect;
export type InsertStarterPackCompletion = typeof starterPackCompletions.$inferInsert;

// ============================================================================
// FAN PLATFORM HANDLES - T3 Manual Verification System
// ============================================================================
// Stores fan-claimed handles for platforms where OAuth isn't available (T3 verification)
// Used for manual verification workflow where creators check fan profiles directly

export const fanPlatformHandles = pgTable('fan_platform_handles', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),

  // Handle data
  handle: varchar('handle', { length: 100 }).notNull(),
  normalizedHandle: varchar('normalized_handle', { length: 100 }), // lowercase, no @ prefix

  // Validation status
  formatValid: boolean('format_valid').default(false), // Passes regex validation
  manuallyVerified: boolean('manually_verified').default(false), // Creator verified
  verifiedAt: timestamp('verified_at'),
  verifiedBy: varchar('verified_by').references(() => users.id),

  // Link to OAuth connection if they later connect
  socialConnectionId: varchar('social_connection_id').references(() => socialConnections.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const fanPlatformHandlesRelations = relations(fanPlatformHandles, ({ one }) => ({
  user: one(users, {
    fields: [fanPlatformHandles.userId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [fanPlatformHandles.verifiedBy],
    references: [users.id],
  }),
  socialConnection: one(socialConnections, {
    fields: [fanPlatformHandles.socialConnectionId],
    references: [socialConnections.id],
  }),
}));

export const insertFanPlatformHandleSchema = createInsertSchema(fanPlatformHandles);
export type FanPlatformHandle = typeof fanPlatformHandles.$inferSelect;
export type InsertFanPlatformHandle = typeof fanPlatformHandles.$inferInsert;

// ============================================================================
// BETA SIGNUPS - Email capture for beta program
// ============================================================================

export const betaSignups = pgTable('beta_signups', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text('email').unique().notNull(),
  userType: text('user_type').default('unknown'), // "creator" | "fan" | "brand"
  source: text('source').default('landing_page'),
  metadata: jsonb('metadata').$type<{
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }>(),
  claimed: boolean('claimed').default(false).notNull(), // Track if points were awarded
  claimedAt: timestamp('claimed_at'), // When points were claimed
  claimedByUserId: varchar('claimed_by_user_id'), // User who claimed the points
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertBetaSignupSchema = createInsertSchema(betaSignups).omit({
  id: true,
  createdAt: true,
});

export type BetaSignup = typeof betaSignups.$inferSelect;
export type InsertBetaSignup = z.infer<typeof insertBetaSignupSchema>;

// ============================================================================
// SOCIAL ANALYTICS - Sync Preferences, Account Metrics, Content, Content Metrics
// ============================================================================

// Sync Preferences - Creator-controlled sync toggles per platform
export const syncPreferences = pgTable('sync_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // matches social_connections.platform
  syncEnabled: boolean('sync_enabled').default(true),
  syncFrequencyMinutes: integer('sync_frequency_minutes').default(60),
  lastSyncAt: timestamp('last_sync_at'),
  nextSyncAt: timestamp('next_sync_at'),
  syncStatus: text('sync_status').default('idle'), // 'idle' | 'syncing' | 'error'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const syncPreferencesRelations = relations(syncPreferences, ({ one }) => ({
  user: one(users, {
    fields: [syncPreferences.userId],
    references: [users.id],
  }),
}));

export const insertSyncPreferenceSchema = createInsertSchema(syncPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type SyncPreference = typeof syncPreferences.$inferSelect;
export type InsertSyncPreference = typeof syncPreferences.$inferInsert;

// Platform Account Metrics Daily - Daily snapshots of account-level metrics
export const platformAccountMetricsDaily = pgTable('platform_account_metrics_daily', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  date: date('date').notNull(),
  followers: integer('followers'),
  following: integer('following'),
  totalPosts: integer('total_posts'),
  totalViews: bigint('total_views', { mode: 'number' }),
  totalLikes: bigint('total_likes', { mode: 'number' }),
  totalComments: bigint('total_comments', { mode: 'number' }),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 2 }),
  subscribers: integer('subscribers'),
  platformSpecific: jsonb('platform_specific').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const platformAccountMetricsDailyRelations = relations(
  platformAccountMetricsDaily,
  ({ one }) => ({
    user: one(users, {
      fields: [platformAccountMetricsDaily.userId],
      references: [users.id],
    }),
  })
);

export type PlatformAccountMetricsDaily = typeof platformAccountMetricsDaily.$inferSelect;
export type InsertPlatformAccountMetricsDaily = typeof platformAccountMetricsDaily.$inferInsert;

// Platform Content - Individual content items (posts, videos, streams, etc.)
export const platformContent = pgTable('platform_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  platformContentId: text('platform_content_id').notNull(),
  contentType: text('content_type').notNull(), // 'post' | 'video' | 'reel' | 'story' | 'stream' | 'track' | 'short'
  title: text('title'),
  description: text('description'),
  url: text('url'),
  thumbnailUrl: text('thumbnail_url'),
  publishedAt: timestamp('published_at'),
  rawData: jsonb('raw_data').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const platformContentRelations = relations(platformContent, ({ one, many }) => ({
  user: one(users, {
    fields: [platformContent.userId],
    references: [users.id],
  }),
  metrics: many(platformContentMetrics),
}));

export type PlatformContent = typeof platformContent.$inferSelect;
export type InsertPlatformContent = typeof platformContent.$inferInsert;

// Platform Content Metrics - Time-series metrics per content item
export const platformContentMetrics = pgTable('platform_content_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id')
    .notNull()
    .references(() => platformContent.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  views: bigint('views', { mode: 'number' }).default(0),
  likes: bigint('likes', { mode: 'number' }).default(0),
  comments: bigint('comments', { mode: 'number' }).default(0),
  shares: bigint('shares', { mode: 'number' }).default(0),
  saves: bigint('saves', { mode: 'number' }).default(0),
  impressions: bigint('impressions', { mode: 'number' }).default(0),
  reach: bigint('reach', { mode: 'number' }).default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 2 }),
  watchTimeMinutes: numeric('watch_time_minutes'),
  platformSpecific: jsonb('platform_specific').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const platformContentMetricsRelations = relations(platformContentMetrics, ({ one }) => ({
  content: one(platformContent, {
    fields: [platformContentMetrics.contentId],
    references: [platformContent.id],
  }),
}));

export type PlatformContentMetrics = typeof platformContentMetrics.$inferSelect;
export type InsertPlatformContentMetrics = typeof platformContentMetrics.$inferInsert;

// Sync Log - Audit trail for all sync operations
export const syncLog = pgTable('sync_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  syncType: text('sync_type').notNull(), // 'account_metrics' | 'content_list' | 'content_metrics' | 'full'
  status: text('status').notNull(), // 'started' | 'completed' | 'failed'
  itemsSynced: integer('items_synced').default(0),
  errorDetails: text('error_details'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
});

export const syncLogRelations = relations(syncLog, ({ one }) => ({
  user: one(users, {
    fields: [syncLog.userId],
    references: [users.id],
  }),
}));

export type SyncLog = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

// ============================================================================
// CAMPAIGN V2: Verification Queue & Access Logs
// ============================================================================

// Campaign Verification Queue — batch verification jobs for deferred campaigns
export const campaignVerificationQueue = pgTable('campaign_verification_queue', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),

  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  scheduledFor: timestamp('scheduled_for').notNull(),

  // Processing details
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  // Results
  totalParticipants: integer('total_participants').default(0),
  tasksVerified: integer('tasks_verified').default(0),
  tasksFailed: integer('tasks_failed').default(0),

  errorLog: jsonb('error_log').$type<
    Array<{
      userId: string;
      taskId: string;
      error: string;
      timestamp: string;
    }>
  >(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campaign Access Logs — track who enters campaigns with access codes/gating
export const campaignAccessLogs = pgTable('campaign_access_logs', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  accessGranted: boolean('access_granted').notNull(),
  accessCodeUsed: text('access_code_used'),
  accessMethod: text('access_method'), // 'code' | 'nft' | 'badge' | 'reputation' | 'prerequisite' | 'direct'

  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at').defaultNow(),
});

// Campaign V2 Relations
export const campaignSponsorsRelations = relations(campaignSponsors, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSponsors.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignVerificationQueueRelations = relations(
  campaignVerificationQueue,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignVerificationQueue.campaignId],
      references: [campaigns.id],
    }),
  })
);

export const campaignAccessLogsRelations = relations(campaignAccessLogs, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignAccessLogs.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignAccessLogs.userId],
    references: [users.id],
  }),
}));

// Campaign V2 Types
export type CampaignSponsor = typeof campaignSponsors.$inferSelect;
export type InsertCampaignSponsor = typeof campaignSponsors.$inferInsert;
export type CampaignVerificationQueueItem = typeof campaignVerificationQueue.$inferSelect;
export type InsertCampaignVerificationQueueItem = typeof campaignVerificationQueue.$inferInsert;
export type CampaignAccessLog = typeof campaignAccessLogs.$inferSelect;
export type InsertCampaignAccessLog = typeof campaignAccessLogs.$inferInsert;

// ============================================================================
// REPUTATION ORACLE TABLES
// ============================================================================

// Reputation score sync status enum
export const reputationSyncStatusEnum = pgEnum('reputation_sync_status', [
  'pending',
  'synced',
  'failed',
  'stale',
]);

// Reputation Scores - Bridge between off-chain activity data and on-chain ReputationRegistry
export const reputationScores = pgTable('reputation_scores', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // User reference
  userId: varchar('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),

  // Wallet for on-chain sync
  walletAddress: text('wallet_address'), // User's wallet address for contract writes

  // Score data (0-1000 scale matching on-chain MAX_SCORE)
  offChainScore: integer('off_chain_score').default(0).notNull(), // Calculated from DB signals
  onChainScore: integer('on_chain_score').default(0).notNull(), // Last confirmed on-chain value
  previousScore: integer('previous_score').default(0).notNull(), // Score before last update (for delta tracking)

  // Score breakdown — granular signals that compose the final score
  scoreBreakdown: jsonb('score_breakdown').$type<{
    // Weighted signal contributions (each 0-1000 before weighting)
    totalPoints: number; // Raw total points earned across all programs
    taskCompletions: number; // Total tasks completed
    socialConnections: number; // Number of verified social accounts
    streakDays: number; // Current longest streak
    referralCount: number; // Successful referrals
    accountAgeDays: number; // Days since registration
    // Weighted scores (after applying weights, before normalization)
    weightedScores: Record<string, number>;
    // Final normalized score
    normalizedScore: number;
  }>(),

  // Sync state
  syncStatus: reputationSyncStatusEnum('sync_status').default('pending').notNull(),
  lastSyncedAt: timestamp('last_synced_at'), // When last successfully pushed on-chain
  lastCalculatedAt: timestamp('last_calculated_at'), // When score was last recalculated
  syncError: text('sync_error'), // Last sync error message
  syncTxHash: text('sync_tx_hash'), // Transaction hash of last on-chain update

  // Threshold tracking — for event-driven updates (Option C foundation)
  crossedThreshold: integer('crossed_threshold'), // Last threshold crossed (500, 750, etc.)
  thresholdCrossedAt: timestamp('threshold_crossed_at'), // When threshold was crossed
  pendingThresholdSync: boolean('pending_threshold_sync').default(false), // Needs immediate sync

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reputation Sync Log - Audit trail of all on-chain sync operations
export const reputationSyncLog = pgTable('reputation_sync_log', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Batch or single sync
  syncType: text('sync_type').notNull(), // 'batch' | 'threshold' | 'manual'
  status: text('status').notNull(), // 'started' | 'completed' | 'failed'

  // Stats
  usersProcessed: integer('users_processed').default(0),
  usersUpdated: integer('users_updated').default(0), // Actually pushed on-chain (score changed)
  usersFailed: integer('users_failed').default(0),
  txHash: text('tx_hash'), // Batch transaction hash

  // Error details
  errorLog: jsonb('error_log').$type<
    Array<{
      userId: string;
      walletAddress: string;
      error: string;
    }>
  >(),

  // Timing
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  createdAt: timestamp('created_at').defaultNow(),
});

// Reputation Score Relations
export const reputationScoresRelations = relations(reputationScores, ({ one }) => ({
  user: one(users, {
    fields: [reputationScores.userId],
    references: [users.id],
  }),
}));

// Reputation Types
export type ReputationScore = typeof reputationScores.$inferSelect;
export type InsertReputationScore = typeof reputationScores.$inferInsert;
export type ReputationSyncLogEntry = typeof reputationSyncLog.$inferSelect;
export type InsertReputationSyncLogEntry = typeof reputationSyncLog.$inferInsert;

// Additional inferred types for tables used by services
export type SocialConnection = typeof socialConnections.$inferSelect;
export type CreatorFacebookPage = typeof creatorFacebookPages.$inferSelect;
// SocialCampaignTask type removed — table dropped in migration 0043
export type PlatformTaskCompletion = typeof platformTaskCompletions.$inferSelect;
export type ManualReviewQueueItem = typeof manualReviewQueue.$inferSelect;
export type VerificationAttempt = typeof verificationAttempts.$inferSelect;
export type PlatformPointsTransaction = typeof platformPointsTransactions.$inferSelect;
export type ProgramAnnouncement = typeof programAnnouncements.$inferSelect;
export type ActiveMultiplier = typeof activeMultipliers.$inferSelect;
export type CheckInStreak = typeof checkInStreaks.$inferSelect;
export type WebsiteVisitTracking = typeof websiteVisitTracking.$inferSelect;
export type PollQuizResponse = typeof pollQuizResponses.$inferSelect;
