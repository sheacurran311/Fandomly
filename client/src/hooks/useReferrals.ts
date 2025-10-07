/**
 * React Query hooks for Fandomly Referral System
 * 
 * Hooks for all three referral tiers:
 * 1. Creator → Creator (Revenue Share)
 * 2. Fan → Fan (Fandomly Points)
 * 3. Creator Task/Campaign Referrals (Creator Points)
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatorReferralStats {
  referralCode: string;
  referralUrl: string;
  totalClicks: number;
  totalSignups: number;
  totalRevenue: number;
  totalCommission: number;
  commissionPercentage: number;
  referredCreators: Array<{
    id: string;
    signupDate: string;
    firstPaidDate?: string;
    revenue: number;
    commission: number;
  }>;
}

export interface FanReferralStats {
  referralCode: string;
  referralUrl: string;
  totalClicks: number;
  totalFriends: number;
  friendsWithFirstTask: number;
  friendsWithProfileComplete: number;
  totalPointsEarned: number;
  percentageRewardsActive: boolean;
  percentageValue: number;
  percentageExpiresAt?: string;
  referredFans: Array<{
    id: string;
    signupDate: string;
    firstTaskCompleted?: string;
    profileCompleted?: string;
    pointsEarned: number;
  }>;
}

export interface TaskReferralStats {
  totalShares: number;
  totalClicks: number;
  totalSignups: number;
  totalCompletions: number;
  totalPointsEarned: number;
  referrals: Array<{
    id: string;
    code: string;
    url: string;
    type: 'task' | 'campaign';
    taskId?: string;
    campaignId?: string;
    clicks: number;
    friendJoined: boolean;
    taskCompleted: boolean;
    pointsEarned: number;
    createdAt: string;
  }>;
}

// ============================================================================
// CREATOR → CREATOR REFERRALS
// ============================================================================

/**
 * Get creator's referral data and stats
 */
export function useCreatorReferral() {
  return useQuery({
    queryKey: ['creator-referral'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/referrals/creator');
      return response.json() as Promise<{
        referral: any;
        stats: CreatorReferralStats;
      }>;
    },
  });
}

/**
 * Track creator referral click
 */
export function useTrackCreatorReferralClick() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/referrals/creator/track-click', { code });
      return response.json();
    },
  });
}

// ============================================================================
// FAN → FAN REFERRALS
// ============================================================================

/**
 * Get fan's referral data and stats
 */
export function useFanReferral() {
  return useQuery({
    queryKey: ['fan-referral'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/referrals/fan');
      return response.json() as Promise<{
        referral: any;
        stats: FanReferralStats;
      }>;
    },
  });
}

/**
 * Track fan referral click
 */
export function useTrackFanReferralClick() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/referrals/fan/track-click', { code });
      return response.json();
    },
  });
}

// ============================================================================
// CREATOR TASK/CAMPAIGN REFERRALS
// ============================================================================

/**
 * Create task referral link
 */
export function useCreateTaskReferral() {
  return useMutation({
    mutationFn: async (data: { taskId: string; creatorId: string }) => {
      const response = await apiRequest('POST', '/api/referrals/task', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-referral-stats'] });
    },
  });
}

/**
 * Create campaign referral link
 */
export function useCreateCampaignReferral() {
  return useMutation({
    mutationFn: async (data: { campaignId: string; creatorId: string }) => {
      const response = await apiRequest('POST', '/api/referrals/campaign', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-referral-stats'] });
    },
  });
}

/**
 * Get task referral stats
 */
export function useTaskReferralStats(creatorId?: string) {
  return useQuery({
    queryKey: ['task-referral-stats', creatorId],
    queryFn: async () => {
      const url = creatorId 
        ? `/api/referrals/task/stats?creatorId=${creatorId}`
        : '/api/referrals/task/stats';
      const response = await apiRequest('GET', url);
      return response.json() as Promise<TaskReferralStats>;
    },
  });
}

/**
 * Get referral leaderboard for a creator
 */
export function useReferralLeaderboard(creatorId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['referral-leaderboard', creatorId, limit],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/referrals/task/leaderboard/${creatorId}?limit=${limit}`);
      return response.json() as Promise<Array<{
        fanId: string;
        totalPoints: number;
        totalShares: number;
        totalCompletions: number;
      }>>;
    },
  });
}

/**
 * Track task/campaign referral click
 */
export function useTrackTaskReferralClick() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/referrals/task/track-click', { code });
      return response.json();
    },
  });
}

/**
 * Validate any referral code
 */
export function useValidateReferralCode(code: string | null) {
  return useQuery({
    queryKey: ['validate-referral', code],
    queryFn: async () => {
      if (!code) return null;
      const response = await apiRequest('GET', `/api/referrals/validate/${code}`);
      return response.json() as Promise<{
        valid: boolean;
        type?: 'creator' | 'fan' | 'task';
        referralId?: string;
        taskId?: string;
        campaignId?: string;
      }>;
    },
    enabled: !!code,
  });
}

