import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, readJsonResponse } from '@/lib/queryClient';
import { useAuth } from './use-auth';

// Types for point transactions and rewards
interface PointTransaction {
  id: string;
  fanProgramId: string;
  points: number;
  type: 'earned' | 'spent';
  source: string; // 'social_follow' | 'reward_redemption' | 'referral' | etc.
  metadata?: {
    socialPlatform?: string;
    rewardId?: string;
    referralId?: string;
    postUrl?: string;
  };
  createdAt: string;
}

interface Reward {
  id: string;
  programId: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'digital' | 'physical' | 'experience';
  availability: 'limited' | 'unlimited';
  stockCount?: number;
  imageUrl?: string;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
}

interface RewardRedemption {
  id: string;
  fanId: string;
  rewardId: string;
  programId?: string;
  pointsSpent: number;
  status: 'pending' | 'completed' | 'fulfilled' | 'failed' | 'cancelled';
  metadata?: any;
  redeemedAt: string;
  fulfilledAt?: string;
  reward?: Reward & {
    rewardType?: string;
  };
  programName?: string;
}

interface FanProgram {
  id: string;
  fanId: string;
  programId: string;
  pointsBalance: number;
  tier: string;
  joinedAt: string;
  program?: {
    name: string;
    creator: {
      displayName: string;
      imageUrl?: string;
    };
  };
}

// Hook to get detailed point transaction history for a user
export const usePointTransactionHistory = () => {
  const { user } = useAuth();
  
  return useQuery<PointTransaction[]>({
    queryKey: ['point-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all fan programs for this user
      const fanProgramsResponse = await apiRequest('GET', `/api/fan-programs/user/${user.id}`);
      const fanPrograms: FanProgram[] = await fanProgramsResponse.json();
      
      // Get transactions for all programs in parallel
      const transactionPromises = fanPrograms.map(async (program) => {
        const transactionsResponse = await apiRequest('GET', `/api/point-transactions/fan-program/${program.id}`);
        return transactionsResponse.json() as Promise<PointTransaction[]>;
      });
      
      const transactionArrays = await Promise.all(transactionPromises);
      const allTransactions = transactionArrays.flat();
      
      // Sort by most recent first
      return allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!user?.id,
  });
};

// Hook to get available rewards from all programs user is in
export const useAvailableRewards = () => {
  const { user } = useAuth();
  
  return useQuery<Reward[]>({
    queryKey: ['available-rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all fan programs for this user
      const fanProgramsResponse = await apiRequest('GET', `/api/fan-programs/user/${user.id}`);
      const fanPrograms: FanProgram[] = await fanProgramsResponse.json();
      
      // Get rewards for all programs in parallel
      const rewardPromises = fanPrograms.map(async (program) => {
        const rewardsResponse = await apiRequest('GET', `/api/rewards/program/${program.programId}`);
        const rewards: Reward[] = await rewardsResponse.json();
        return rewards.filter(r => r.isActive);
      });
      
      const rewardArrays = await Promise.all(rewardPromises);
      return rewardArrays.flat();
    },
    enabled: !!user?.id,
  });
};

// Hook to get user's reward redemption history
export const useRewardRedemptions = () => {
  const { user } = useAuth();
  
  return useQuery<RewardRedemption[]>({
    queryKey: ['reward-redemptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await apiRequest('GET', '/api/rewards/redemptions');
      const data = await readJsonResponse<{ redemptions: any[] }>(response);

      const redemptions: RewardRedemption[] = (data.redemptions || []).map((row: any) => ({
        id: row.id,
        fanId: row.fanId ?? row.fan_id,
        rewardId: row.rewardId ?? row.reward_id,
        programId: row.programId ?? row.program_id,
        pointsSpent: row.pointsSpent ?? row.points_spent ?? 0,
        status: row.status,
        metadata: row.metadata ?? null,
        redeemedAt: row.redeemedAt ?? row.redeemed_at,
        fulfilledAt: row.fulfilledAt ?? row.fulfilled_at,
        programName: row.programName ?? row.program_name,
        reward: {
          id: row.rewardId ?? row.reward_id,
          programId: row.programId ?? row.program_id,
          name: row.rewardName ?? row.reward_name ?? 'Reward',
          description: row.rewardDescription ?? row.reward_description ?? '',
          pointsCost: row.pointsCost ?? row.points_cost ?? 0,
          type: row.rewardType ?? row.reward_type ?? 'digital',
          rewardType: row.rewardType ?? row.reward_type,
          availability: 'unlimited',
          imageUrl: row.rewardImage ?? row.reward_image,
          isActive: true,
          createdAt: row.createdAt ?? row.created_at ?? row.redeemedAt ?? row.redeemed_at,
        },
      }));

      return redemptions.sort(
        (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
      );
    },
    enabled: !!user?.id,
  });
};

// Hook to get user's points summary
export const usePointsSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['points-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalPoints: 0, availablePoints: 0, spentPoints: 0 };
      
      // Get all fan programs
      const fanProgramsResponse = await apiRequest('GET', `/api/fan-programs/user/${user.id}`);
      const fanPrograms: FanProgram[] = await fanProgramsResponse.json();
      
      // Fetch transactions for all programs in parallel
      const transactionPromises = fanPrograms.map(async (program) => {
        const transactionsResponse = await apiRequest('GET', `/api/point-transactions/fan-program/${program.id}`);
        return transactionsResponse.json() as Promise<PointTransaction[]>;
      });
      
      const transactionArrays = await Promise.all(transactionPromises);
      
      // Calculate totals from all transactions
      let totalEarned = 0;
      let totalSpent = 0;
      
      for (const transactions of transactionArrays) {
        for (const tx of transactions) {
          if (tx.type === 'earned') {
            totalEarned += tx.points;
          } else if (tx.type === 'spent') {
            totalSpent += tx.points;
          }
        }
      }
      
      return {
        totalPoints: totalEarned,
        availablePoints: totalEarned - totalSpent,
        spentPoints: totalSpent
      };
    },
    enabled: !!user?.id,
  });
};

// Mutation to redeem a reward
export const useRedeemReward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ rewardId, programId }: { rewardId: string; programId: string }) => {
      const response = await apiRequest('POST', '/api/rewards/redeem', {
        rewardId,
        programId,
      });
      return readJsonResponse(response);
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['point-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reward-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['available-rewards'] });
    },
  });
};

// ===========================
// Platform Points Hooks
// ===========================

export const usePlatformPointsBalance = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['platform-points-balance', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-points/balance');
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
};

export const usePlatformPointsTransactions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['platform-points-transactions', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-points/transactions');
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
};