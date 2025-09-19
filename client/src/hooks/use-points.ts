import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
  pointsSpent: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  metadata?: any;
  redeemedAt: string;
  fulfilledAt?: string;
  reward?: Reward;
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
      
      // Get transactions for all programs
      const allTransactions: PointTransaction[] = [];
      for (const program of fanPrograms) {
        const transactionsResponse = await apiRequest('GET', `/api/point-transactions/fan-program/${program.id}`);
        const transactions: PointTransaction[] = await transactionsResponse.json();
        allTransactions.push(...transactions);
      }
      
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
      
      // Get rewards for all programs
      const allRewards: Reward[] = [];
      for (const program of fanPrograms) {
        const rewardsResponse = await apiRequest('GET', `/api/rewards/program/${program.programId}`);
        const rewards: Reward[] = await rewardsResponse.json();
        allRewards.push(...rewards.filter(r => r.isActive));
      }
      
      return allRewards;
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
      
      const response = await apiRequest('GET', `/api/reward-redemptions/user/${user.id}`);
      const redemptions: RewardRedemption[] = await response.json();
      
      // Sort by most recent first
      return redemptions.sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
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
      
      let totalEarned = 0;
      let totalSpent = 0;
      
      // Calculate earned points from all programs
      for (const program of fanPrograms) {
        const transactionsResponse = await apiRequest('GET', `/api/point-transactions/fan-program/${program.id}`);
        const transactions: PointTransaction[] = await transactionsResponse.json();
        
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
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ rewardId, programId }: { rewardId: string; programId: string }) => {
      const response = await apiRequest('POST', '/api/reward-redemptions', {
        fanId: user?.id,
        rewardId,
        programId
      });
      return response.json();
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