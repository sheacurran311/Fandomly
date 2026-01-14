/**
 * User Test Fixtures
 * 
 * Sample user data for testing authentication, user management,
 * and role-based access control.
 */

export const fanUser = {
  id: 'test-fan-user-1',
  email: 'testfan@example.com',
  username: 'testfan',
  userType: 'fan' as const,
  role: 'user' as const,
  dynamicUserId: 'dynamic-fan-123',
  profileData: {
    name: 'Test Fan',
    bio: 'I am a test fan user',
    location: 'Test City',
    interests: ['music', 'sports'],
  },
  socialLinks: {
    twitter: '@testfan',
    instagram: 'testfan',
  },
  totalPoints: 1500,
  lifetimePoints: 2500,
  onboardingComplete: true,
  isVerified: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const creatorUser = {
  id: 'test-creator-user-1',
  email: 'testcreator@example.com',
  username: 'testcreator',
  userType: 'creator' as const,
  role: 'creator' as const,
  dynamicUserId: 'dynamic-creator-123',
  profileData: {
    name: 'Test Creator',
    bio: 'I am a test creator',
    category: 'musician',
  },
  socialLinks: {
    twitter: '@testcreator',
    instagram: 'testcreator',
    youtube: 'testcreatorYT',
    spotify: 'testcreator',
  },
  onboardingComplete: true,
  isVerified: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const adminUser = {
  id: 'test-admin-user-1',
  email: 'testadmin@example.com',
  username: 'testadmin',
  userType: 'creator' as const,
  role: 'fandomly_admin' as const,
  dynamicUserId: 'dynamic-admin-123',
  profileData: {
    name: 'Test Admin',
  },
  onboardingComplete: true,
  isVerified: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const newUser = {
  id: 'test-new-user-1',
  email: 'newuser@example.com',
  username: null,
  userType: null,
  role: 'user' as const,
  dynamicUserId: 'dynamic-new-123',
  onboardingComplete: false,
  isVerified: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const creator = {
  id: 'test-creator-1',
  userId: 'test-creator-user-1',
  tenantId: 'test-tenant-1',
  displayName: 'Test Creator',
  bio: 'I am a test creator for QA',
  profileImageUrl: null,
  coverImageUrl: null,
  category: 'musician',
  isVerified: true,
  socialLinks: {
    twitter: '@testcreator',
    instagram: 'testcreator',
    youtube: 'testcreatorYT',
    spotify: 'testcreator',
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const tenant = {
  id: 'test-tenant-1',
  name: 'Test Creator Brand',
  slug: 'test-creator-brand',
  ownerId: 'test-creator-user-1',
  status: 'active' as const,
  plan: 'pro' as const,
  settings: {},
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const agency = {
  id: 'test-agency-1',
  ownerUserId: 'test-agency-owner-1',
  name: 'Test Agency',
  website: 'https://testagency.com',
  businessInfo: {
    type: 'agency',
    size: '10-50',
  },
  allowCrossBrandAnalytics: false,
  dataIsolationLevel: 'strict' as const,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const allUserFixtures = [
  fanUser,
  creatorUser,
  adminUser,
  newUser,
];
