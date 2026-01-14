/**
 * Campaign Test Fixtures
 * 
 * Sample campaign data for testing campaign CRUD operations
 * and campaign builder flows.
 */

export const sampleCampaign = {
  id: 'test-campaign-1',
  tenantId: 'test-tenant-1',
  creatorId: 'test-creator-1',
  programId: 'test-program-1',
  name: 'Test Campaign',
  description: 'A test campaign for QA automation',
  campaignType: 'time_based' as const,
  trigger: 'manual' as const,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  status: 'active' as const,
  visibility: 'everyone',
  displayOrder: 1,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const ongoingCampaign = {
  ...sampleCampaign,
  id: 'test-campaign-ongoing',
  name: 'Ongoing Campaign',
  campaignType: 'ongoing' as const,
  endDate: null,
};

export const draftCampaign = {
  ...sampleCampaign,
  id: 'test-campaign-draft',
  name: 'Draft Campaign',
  status: 'draft' as const,
};

export const completedCampaign = {
  ...sampleCampaign,
  id: 'test-campaign-completed',
  name: 'Completed Campaign',
  status: 'completed' as const,
  endDate: new Date('2024-12-31'),
};

export const campaignCreatePayload = {
  name: 'New Test Campaign',
  description: 'Created via test automation',
  campaignType: 'time_based' as const,
  trigger: 'manual' as const,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  visibility: 'everyone',
};

export const campaignUpdatePayload = {
  name: 'Updated Campaign Name',
  description: 'Updated description',
};

export const allCampaignFixtures = [
  sampleCampaign,
  ongoingCampaign,
  draftCampaign,
  completedCampaign,
];
