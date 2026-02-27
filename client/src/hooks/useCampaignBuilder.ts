import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/queryClient';
import type { Campaign, CampaignSponsor, TaskAssignment, Task } from '@shared/schema';

// ==========================================
// Types
// ==========================================

interface CampaignBuilderData {
  campaign: Campaign;
  sponsors: CampaignSponsor[];
  taskAssignments: Array<TaskAssignment & { task: Task }>;
}

interface SaveCampaignPayload {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  bannerImageUrl?: string;
  accentColor?: string;
  campaignMultiplier?: number;
  completionBonusPoints?: number;
  completionBonusRewards?: Record<string, unknown>;
  verificationMode?: 'immediate' | 'deferred';
  enforceSequentialTasks?: boolean;
  accessCode?: string;
  accessCodeEnabled?: boolean;
  minimumReputationScore?: number;
  requiredNftCollectionIds?: string[];
  requiredBadgeIds?: string[];
  requiredPreviousCampaigns?: string[];
  requiredTaskCompletions?: string[];
}

interface SponsorPayload {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  socialHandles?: Record<string, string>;
  displayOrder?: number;
  showInCampaignBanner?: boolean;
}

interface TaskAssignmentUpdate {
  taskOrder?: number;
  dependsOnTaskIds?: string[];
  isOptional?: boolean;
  useSponsorHandle?: boolean;
  sponsorId?: string | null;
  verificationTiming?: 'immediate' | 'deferred';
  taskDescriptionOverride?: string;
}

// ==========================================
// Hooks
// ==========================================

/**
 * Fetch full campaign builder data (campaign + sponsors + task assignments)
 */
export function useCampaignBuilderData(campaignId: string | null) {
  return useQuery<CampaignBuilderData>({
    queryKey: ['campaign-builder', campaignId],
    queryFn: () => fetchApi<CampaignBuilderData>(`/api/campaigns/v2/${campaignId}/builder-data`),
    enabled: !!campaignId,
  });
}

/**
 * Create a new campaign (returns campaign with ID)
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveCampaignPayload) =>
      fetchApi<Campaign>('/api/campaigns/v2', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/creator'] });
    },
  });
}

/**
 * Update an existing campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: Partial<SaveCampaignPayload>;
    }) =>
      fetchApi<Campaign>(`/api/campaigns/v2/${campaignId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
  });
}

/**
 * Publish a campaign
 */
export function usePublishCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/creator'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
    },
  });
}

// ==========================================
// Sponsor Hooks
// ==========================================

/**
 * Fetch sponsors for a campaign
 */
export function useCampaignSponsors(campaignId: string | null) {
  return useQuery<CampaignSponsor[]>({
    queryKey: ['campaign-sponsors', campaignId],
    queryFn: () => fetchApi<CampaignSponsor[]>(`/api/campaigns/${campaignId}/sponsors`),
    enabled: !!campaignId,
  });
}

/**
 * Add a sponsor to a campaign
 */
export function useAddSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: SponsorPayload }) =>
      fetchApi<CampaignSponsor>(`/api/campaigns/${campaignId}/sponsors`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sponsors', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', variables.campaignId] });
    },
  });
}

/**
 * Update a sponsor
 */
export function useUpdateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sponsorId, data }: { sponsorId: string; data: Partial<SponsorPayload> }) =>
      fetchApi<CampaignSponsor>(`/api/campaigns/sponsors/${sponsorId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-builder'] });
    },
  });
}

/**
 * Remove a sponsor
 */
export function useRemoveSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sponsorId: string) =>
      fetchApi(`/api/campaigns/sponsors/${sponsorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-builder'] });
    },
  });
}

// ==========================================
// Task Assignment Hooks
// ==========================================

/**
 * Update a task assignment (order, dependencies, sponsor, timing)
 */
export function useUpdateTaskAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      assignmentId,
      data,
    }: {
      campaignId: string;
      assignmentId: string;
      data: TaskAssignmentUpdate;
    }) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/task-assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', variables.campaignId] });
    },
  });
}

/**
 * Reorder task assignments
 */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      orderedAssignmentIds,
    }: {
      campaignId: string;
      orderedAssignmentIds: string[];
    }) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/task-assignments/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedAssignmentIds }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', variables.campaignId] });
    },
  });
}
