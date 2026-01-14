/**
 * Program Test Fixtures
 * 
 * Sample program data for testing program CRUD operations,
 * visibility controls, and program builder flows.
 */

export const sampleProgram = {
  id: 'test-program-1',
  tenantId: 'test-tenant-1',
  creatorId: 'test-creator-1',
  name: 'Test Loyalty Program',
  description: 'A test program for QA automation',
  slug: 'test-loyalty-program',
  status: 'active' as const,
  isPublic: true,
  pageConfig: {
    visibility: {
      showCampaigns: true,
      showTasks: true,
      showLeaderboard: true,
      showActivityFeed: true,
      profileData: {
        showBio: true,
        showSocialLinks: true,
        showFollowerCount: true,
      },
    },
    theme: {
      primaryColor: '#6366f1',
      backgroundColor: '#0f172a',
      accentColor: '#8b5cf6',
    },
    branding: {
      logoUrl: null,
      bannerUrl: null,
      customCSS: null,
    },
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const programWithHiddenCampaigns = {
  ...sampleProgram,
  id: 'test-program-hidden-campaigns',
  slug: 'test-hidden-campaigns',
  pageConfig: {
    ...sampleProgram.pageConfig,
    visibility: {
      ...sampleProgram.pageConfig.visibility,
      showCampaigns: false,
    },
  },
};

export const programWithHiddenTasks = {
  ...sampleProgram,
  id: 'test-program-hidden-tasks',
  slug: 'test-hidden-tasks',
  pageConfig: {
    ...sampleProgram.pageConfig,
    visibility: {
      ...sampleProgram.pageConfig.visibility,
      showTasks: false,
    },
  },
};

export const programWithHiddenLeaderboard = {
  ...sampleProgram,
  id: 'test-program-hidden-leaderboard',
  slug: 'test-hidden-leaderboard',
  pageConfig: {
    ...sampleProgram.pageConfig,
    visibility: {
      ...sampleProgram.pageConfig.visibility,
      showLeaderboard: false,
    },
  },
};

export const draftProgram = {
  ...sampleProgram,
  id: 'test-program-draft',
  slug: 'test-draft-program',
  status: 'draft' as const,
  isPublic: false,
};

export const programCreatePayload = {
  name: 'New Test Program',
  description: 'Created via test automation',
  slug: 'new-test-program',
  isPublic: true,
  pageConfig: sampleProgram.pageConfig,
};

export const programUpdatePayload = {
  name: 'Updated Program Name',
  description: 'Updated description',
};

export const allProgramFixtures = [
  sampleProgram,
  programWithHiddenCampaigns,
  programWithHiddenTasks,
  programWithHiddenLeaderboard,
  draftProgram,
];
