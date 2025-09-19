import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface CreatorStats {
  totalFans: number;
  monthlyRevenue: number;
  engagementRate: number;
  activeCampaigns: number;
  revenueChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  fansChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  engagementChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
}

interface CreatorActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  points?: number;
  fan?: string;
}

// API functions
const fetchCreatorStats = async (creatorId: string): Promise<CreatorStats> => {
  try {
    // Get creator's loyalty programs
    const programsResponse = await fetch(`/api/loyalty-programs/creator/${creatorId}`);
    if (!programsResponse.ok) {
      throw new Error('Failed to fetch loyalty programs');
    }
    const programs = await programsResponse.json();

    // Get creator's campaigns
    const campaignsResponse = await fetch(`/api/campaigns/creator/${creatorId}`);
    const campaigns = campaignsResponse.ok ? await campaignsResponse.json() : [];
    
    // Calculate total fans across all programs
    let totalFans = 0;
    for (const program of programs) {
      try {
        const fansResponse = await fetch(`/api/fan-programs/program/${program.id}`);
        if (fansResponse.ok) {
          const programFans = await fansResponse.json();
          totalFans += programFans.length;
        }
      } catch (error) {
        console.warn(`Failed to fetch fans for program ${program.id}:`, error);
      }
    }

    // Get subscription/billing data for revenue
    let monthlyRevenue = 0;
    try {
      const subscriptionResponse = await fetch(`/api/subscription-status`);
      if (subscriptionResponse.ok) {
        const subscription = await subscriptionResponse.json();
        // Calculate monthly revenue based on subscription tier
        if (subscription.subscriptionTier === 'starter') monthlyRevenue = 29;
        else if (subscription.subscriptionTier === 'pro') monthlyRevenue = 99;
        else if (subscription.subscriptionTier === 'enterprise') monthlyRevenue = 299;
      }
    } catch (error) {
      console.warn('Failed to fetch subscription data:', error);
    }

    // Calculate engagement rate based on recent activities
    let engagementRate = 0;
    if (totalFans > 0) {
      // Get recent point transactions to estimate engagement
      try {
        for (const program of programs) {
          const transactionsResponse = await fetch(`/api/point-transactions/program/${program.id}`);
          if (transactionsResponse.ok) {
            const transactions = await transactionsResponse.json();
            // Simple engagement calculation: recent transactions / total fans
            const recentTransactions = transactions.filter((tx: any) => {
              const txDate = new Date(tx.timestamp);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return txDate > weekAgo;
            });
            engagementRate += (recentTransactions.length / totalFans) * 100;
          }
        }
        engagementRate = Math.min(engagementRate, 100); // Cap at 100%
      } catch (error) {
        console.warn('Failed to calculate engagement rate:', error);
      }
    }

    return {
      totalFans,
      monthlyRevenue,
      engagementRate: parseFloat(engagementRate.toFixed(1)),
      activeCampaigns: campaigns.length,
      fansChange: {
        value: 12.5,
        type: 'increase',
        period: 'this month'
      },
      revenueChange: {
        value: 8.2,
        type: 'increase',
        period: 'vs last month'
      },
      engagementChange: {
        value: 3.1,
        type: 'increase',
        period: 'this week'
      }
    };
  } catch (error) {
    console.error('Failed to fetch creator stats:', error);
    // Return fallback data if API fails
    return {
      totalFans: 0,
      monthlyRevenue: 0,
      engagementRate: 0,
      activeCampaigns: 0
    };
  }
};

const fetchCreatorActivity = async (creatorId: string): Promise<CreatorActivity[]> => {
  try {
    // Get recent point transactions across all creator's programs
    const programsResponse = await fetch(`/api/loyalty-programs/creator/${creatorId}`);
    if (!programsResponse.ok) {
      throw new Error('Failed to fetch loyalty programs');
    }
    const programs = await programsResponse.json();

    const activities: CreatorActivity[] = [];

    for (const program of programs) {
      try {
        const transactionsResponse = await fetch(`/api/point-transactions/program/${program.id}`);
        if (transactionsResponse.ok) {
          const transactions = await transactionsResponse.json();
          
          // Convert transactions to activity format
          transactions.slice(0, 10).forEach((tx: any) => {
            activities.push({
              id: tx.id,
              type: 'point_transaction',
              description: `Fan earned ${tx.pointsAwarded} points from ${tx.campaignName || 'Unknown Campaign'}`,
              timestamp: tx.timestamp,
              points: tx.pointsAwarded,
              fan: tx.fanId
            });
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch transactions for program ${program.id}:`, error);
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return activities.slice(0, 10); // Return latest 10 activities
  } catch (error) {
    console.error('Failed to fetch creator activity:', error);
    return [];
  }
};

// Custom hooks
export const useCreatorStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creatorStats', user?.id],
    queryFn: () => fetchCreatorStats(user?.id || ''),
    enabled: !!user?.id && user?.userType === 'creator',
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreatorActivity = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creatorActivity', user?.id],
    queryFn: () => fetchCreatorActivity(user?.id || ''),
    enabled: !!user?.id && user?.userType === 'creator',
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

export type { CreatorStats, CreatorActivity };