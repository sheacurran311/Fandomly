import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/queryClient';
import type { Campaign, CampaignSponsor, TaskAssignment, Task } from '@shared/schema';

// ==========================================
// Types
// ==========================================

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  requirements: {
    accessCode: boolean;
    nft: boolean;
    badge: boolean;
    reputation: boolean;
    prerequisiteCampaigns: boolean;
    taskCompletions: boolean;
  };
}

interface CampaignProgressResult {
  totalRequired: number;
  completedCount: number;
  pendingVerificationCount: number;
  progressPercentage: number;
  campaignCompleted: boolean;
  completionBonusAwarded: boolean;
  tasksCompleted: Array<{
    assignmentId: string;
    taskId: string;
    taskName: string;
    taskType: string;
    points: number;
    completedAt?: string;
  }>;
  tasksAvailable: Array<{
    assignmentId: string;
    taskId: string;
    taskName: string;
    taskType: string;
    points: number;
    isOptional: boolean;
    sponsorName?: string;
    verificationTiming: string;
    taskDescriptionOverride?: string;
  }>;
  tasksLocked: Array<{
    assignmentId: string;
    taskId: string;
    taskName: string;
    taskType: string;
    points: number;
    dependsOn: string[];
    dependsOnNames: string[];
  }>;
  tasksPendingVerification: Array<{
    assignmentId: string;
    taskId: string;
    taskName: string;
    completedAt: string;
  }>;
}

interface CampaignDetailResult {
  campaign: Campaign & {
    sponsors: CampaignSponsor[];
    taskAssignments: Array<TaskAssignment & { task: Task }>;
    gatingInfo: {
      hasAccessCode: boolean;
      hasNftGating: boolean;
      hasBadgeGating: boolean;
      hasReputationGating: boolean;
      hasPrerequisiteCampaigns: boolean;
      hasTaskCompletionGating: boolean;
    };
    totalTasks: number;
    totalPoints: number;
  };
}

// ==========================================
// Hooks
// ==========================================

/**
 * Fetch full campaign detail for fan view
 */
export function useCampaignDetail(campaignId: string | null) {
  return useQuery<CampaignDetailResult>({
    queryKey: ['campaign-detail', campaignId],
    queryFn: () => fetchApi<CampaignDetailResult>(`/api/campaigns/v2/${campaignId}/detail`),
    enabled: !!campaignId,
  });
}

/**
 * Check eligibility for a campaign
 */
export function useCampaignEligibility(campaignId: string | null) {
  return useQuery<EligibilityResult>({
    queryKey: ['campaign-eligibility', campaignId],
    queryFn: () =>
      fetchApi<EligibilityResult>(`/api/campaigns/v2/${campaignId}/check-eligibility`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    enabled: !!campaignId,
  });
}

/**
 * Join a campaign
 */
export function useJoinCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, accessCode }: { campaignId: string; accessCode?: string }) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/join`, {
        method: 'POST',
        body: JSON.stringify({ accessCode }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-progress', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-eligibility', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
    },
  });
}

/**
 * Fetch campaign progress for current user
 */
export function useCampaignProgress(campaignId: string | null) {
  return useQuery<CampaignProgressResult>({
    queryKey: ['campaign-progress', campaignId],
    queryFn: () => fetchApi<CampaignProgressResult>(`/api/campaigns/v2/${campaignId}/progress`),
    enabled: !!campaignId,
  });
}

/**
 * Complete a task within a campaign
 */
export function useCompleteTaskInCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, assignmentId }: { campaignId: string; assignmentId: string }) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/tasks/${assignmentId}/complete`, {
        method: 'POST',
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-progress', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', variables.campaignId] });
      // Refresh points
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fan/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['platform-points-balance'] });
    },
  });
}

/**
 * Claim completion bonus
 */
export function useClaimCompletionBonus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) =>
      fetchApi(`/api/campaigns/v2/${campaignId}/claim-completion`, {
        method: 'POST',
      }),
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-progress', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fan/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['platform-points-balance'] });
    },
  });
}
