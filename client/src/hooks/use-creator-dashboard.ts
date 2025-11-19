import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface CreatorStats {
  totalFans: number;
  totalRevenue: number; // ALL-TIME total revenue
  tasksCompleted: number; // ALL-TIME tasks completed
  rewardsRedeemed: number; // ALL-TIME rewards redeemed
  fansChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  revenueChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  tasksChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  rewardsChange?: {
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

    // ====================
    // 1. TOTAL FANS (enrolled in programs)
    // ====================
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

    // ====================
    // 2. TOTAL REVENUE (ALL-TIME)
    // ====================
    // TODO: Calculate from actual payment transactions when payment system is built
    // For now, return 0 as placeholder
    let totalRevenue = 0;

    // ====================
    // 3. TASKS COMPLETED (ALL-TIME)
    // ====================
    let tasksCompleted = 0;
    try {
      // Get all task completions for each program
      for (const program of programs) {
        const completionsResponse = await fetch(`/api/task-completions/program/${program.id}`);
        if (completionsResponse.ok) {
          const completions = await completionsResponse.json();
          // Count only completed or claimed tasks
          tasksCompleted += completions.filter((c: any) =>
            c.status === 'completed' || c.status === 'claimed'
          ).length;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch task completions:', error);
    }

    // ====================
    // 4. REWARDS REDEEMED (ALL-TIME)
    // ====================
    let rewardsRedeemed = 0;
    try {
      // Get all reward redemptions for each program
      for (const program of programs) {
        const redemptionsResponse = await fetch(`/api/reward-redemptions/program/${program.id}`);
        if (redemptionsResponse.ok) {
          const redemptions = await redemptionsResponse.json();
          rewardsRedeemed += redemptions.length;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch reward redemptions:', error);
    }

    // ====================
    // CALCULATE PERCENTAGE CHANGES
    // ====================
    let fansChange = undefined;
    let revenueChange = undefined;
    let tasksChange = undefined;
    let rewardsChange = undefined;

    try {
      // Calculate 30-day changes for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Historical fan count (fans who joined before 30 days ago)
      let previousFans = 0;
      for (const program of programs) {
        try {
          const fansResponse = await fetch(`/api/fan-programs/program/${program.id}`);
          if (fansResponse.ok) {
            const programFans = await fansResponse.json();
            previousFans += programFans.filter((fan: any) =>
              new Date(fan.joinedAt) < thirtyDaysAgo
            ).length;
          }
        } catch (error) {
          console.warn(`Failed to calculate historical fans for program ${program.id}:`, error);
        }
      }

      if (previousFans > 0 && totalFans !== previousFans) {
        const fansChangeValue = ((totalFans - previousFans) / previousFans) * 100;
        fansChange = {
          value: Math.abs(parseFloat(fansChangeValue.toFixed(1))),
          type: fansChangeValue >= 0 ? 'increase' : 'decrease',
          period: 'vs last month'
        };
      }

      // Historical tasks completed (before 30 days ago)
      let previousTasksCompleted = 0;
      try {
        for (const program of programs) {
          const completionsResponse = await fetch(`/api/task-completions/program/${program.id}`);
          if (completionsResponse.ok) {
            const completions = await completionsResponse.json();
            previousTasksCompleted += completions.filter((c: any) =>
              (c.status === 'completed' || c.status === 'claimed') &&
              new Date(c.completedAt || c.updatedAt) < thirtyDaysAgo
            ).length;
          }
        }
      } catch (error) {
        console.warn('Failed to calculate historical task completions:', error);
      }

      if (previousTasksCompleted > 0 && tasksCompleted !== previousTasksCompleted) {
        const tasksChangeValue = ((tasksCompleted - previousTasksCompleted) / previousTasksCompleted) * 100;
        tasksChange = {
          value: Math.abs(parseFloat(tasksChangeValue.toFixed(1))),
          type: tasksChangeValue >= 0 ? 'increase' : 'decrease',
          period: 'vs last month'
        };
      }

      // Historical rewards redeemed (before 30 days ago)
      let previousRewardsRedeemed = 0;
      try {
        for (const program of programs) {
          const redemptionsResponse = await fetch(`/api/reward-redemptions/program/${program.id}`);
          if (redemptionsResponse.ok) {
            const redemptions = await redemptionsResponse.json();
            previousRewardsRedeemed += redemptions.filter((r: any) =>
              new Date(r.redeemedAt || r.createdAt) < thirtyDaysAgo
            ).length;
          }
        }
      } catch (error) {
        console.warn('Failed to calculate historical reward redemptions:', error);
      }

      if (previousRewardsRedeemed > 0 && rewardsRedeemed !== previousRewardsRedeemed) {
        const rewardsChangeValue = ((rewardsRedeemed - previousRewardsRedeemed) / previousRewardsRedeemed) * 100;
        rewardsChange = {
          value: Math.abs(parseFloat(rewardsChangeValue.toFixed(1))),
          type: rewardsChangeValue >= 0 ? 'increase' : 'decrease',
          period: 'vs last month'
        };
      }
    } catch (error) {
      console.warn('Failed to calculate percentage changes:', error);
    }

    return {
      totalFans,
      totalRevenue,
      tasksCompleted,
      rewardsRedeemed,
      fansChange,
      revenueChange,
      tasksChange,
      rewardsChange
    };
  } catch (error) {
    console.error('Failed to fetch creator stats:', error);
    // Return fallback data if API fails
    return {
      totalFans: 0,
      totalRevenue: 0,
      tasksCompleted: 0,
      rewardsRedeemed: 0
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