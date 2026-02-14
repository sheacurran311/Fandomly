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
    // 1. TOTAL FANS (enrolled in programs) - deduplicated
    // ====================
    const uniqueFanIds = new Set<string>();
    for (const program of programs) {
      try {
        const fansResponse = await fetch(`/api/fan-programs/program/${program.id}`);
        if (fansResponse.ok) {
          const programFans = await fansResponse.json();
          // Add each fan's ID to the set (automatically deduplicates)
          // Exclude the creator themselves from the fan count
          programFans.forEach((fan: any) => {
            if (fan.fanId && fan.fanId !== creatorId) {
              uniqueFanIds.add(fan.fanId);
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch fans for program ${program.id}:`, error);
      }
    }
    const totalFans = uniqueFanIds.size;

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
    const processedTenantIds = new Set<string>(); // Track tenants we've already queried
    
    try {
      // Get all task completions for each program
      for (const program of programs) {
        console.log(`[Creator Dashboard] Fetching completions for program ${program.id} (tenant: ${program.tenantId})`);
        const completionsResponse = await fetch(`/api/task-completions/program/${program.id}`);
        if (completionsResponse.ok) {
          const completions = await completionsResponse.json();
          console.log(`[Creator Dashboard] Got ${completions.length} completions for program ${program.id}:`, completions);
          // Count only completed or claimed tasks
          const programCompleted = completions.filter((c: any) =>
            c.status === 'completed' || c.status === 'claimed'
          ).length;
          console.log(`[Creator Dashboard] ${programCompleted} completed/claimed for program ${program.id}`);
          tasksCompleted += programCompleted;
          
          // If we found completions, mark this tenant as processed
          if (completions.length > 0) {
            processedTenantIds.add(program.tenantId);
          }
        } else {
          console.warn(`[Creator Dashboard] Failed to fetch completions for program ${program.id}: ${completionsResponse.status}`);
        }
      }
      
      // Fallback: If no completions found via programId, try by tenantId
      // This handles tasks that were created before programId was required
      if (tasksCompleted === 0 && programs.length > 0) {
        console.log(`[Creator Dashboard] No completions found by programId, trying tenantId fallback`);
        for (const program of programs) {
          if (processedTenantIds.has(program.tenantId)) continue;
          
          const tenantCompletionsResponse = await fetch(`/api/task-completions/tenant/${program.tenantId}`);
          if (tenantCompletionsResponse.ok) {
            const tenantCompletions = await tenantCompletionsResponse.json();
            console.log(`[Creator Dashboard] Got ${tenantCompletions.length} completions for tenant ${program.tenantId}:`, tenantCompletions);
            const tenantCompleted = tenantCompletions.filter((c: any) =>
              c.status === 'completed' || c.status === 'claimed'
            ).length;
            tasksCompleted += tenantCompleted;
            processedTenantIds.add(program.tenantId);
          }
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

      // Historical fan count (fans who joined before 30 days ago) - deduplicated
      const previousUniqueFanIds = new Set<string>();
      for (const program of programs) {
        try {
          const fansResponse = await fetch(`/api/fan-programs/program/${program.id}`);
          if (fansResponse.ok) {
            const programFans = await fansResponse.json();
            programFans
              .filter((fan: any) => new Date(fan.joinedAt) < thirtyDaysAgo)
              .forEach((fan: any) => {
                if (fan.fanId && fan.fanId !== creatorId) {
                  previousUniqueFanIds.add(fan.fanId);
                }
              });
          }
        } catch (error) {
          console.warn(`Failed to calculate historical fans for program ${program.id}:`, error);
        }
      }
      const previousFans = previousUniqueFanIds.size;

      if (previousFans > 0 && totalFans !== previousFans) {
        const fansChangeValue = ((totalFans - previousFans) / previousFans) * 100;
        fansChange = {
          value: Math.abs(parseFloat(fansChangeValue.toFixed(1))),
          type: (fansChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
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
          type: (tasksChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
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
          type: (rewardsChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
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

const fetchCreatorActivity = async (
  creatorId: string,
  params?: { search?: string; type?: string; dateFilter?: string }
): Promise<CreatorActivity[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.dateFilter) queryParams.append('dateFilter', params.dateFilter);

    const url = `/api/creator/activity/${creatorId}?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch creator activity');
    }

    const activities = await response.json();

    // Map to expected format with formatted timestamp
    return activities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: formatRelativeTime(activity.timestamp),
      points: activity.points,
      fan: activity.fanName || activity.fanId
    }));
  } catch (error) {
    console.error('Failed to fetch creator activity:', error);
    return [];
  }
};

// Helper function to format timestamps as relative time
function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

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

export const useCreatorActivity = (params?: { search?: string; type?: string; dateFilter?: string }) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['creatorActivity', user?.id, params],
    queryFn: () => fetchCreatorActivity(user?.id || '', params),
    enabled: !!user?.id && user?.userType === 'creator',
    staleTime: 30 * 1000, // 30 seconds (shorter since we have filters)
    refetchOnWindowFocus: false,
  });
};

export type { CreatorStats, CreatorActivity };