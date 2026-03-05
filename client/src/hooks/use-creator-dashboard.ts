/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Fetch all data for all programs in parallel
    const programDataPromises = programs.map(async (program: any) => {
      const [fansResult, completionsResult, redemptionsResult] = await Promise.all([
        // Fetch fans for this program
        fetch(`/api/fan-programs/program/${program.id}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
        // Fetch task completions for this program
        fetch(`/api/task-completions/program/${program.id}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
        // Fetch reward redemptions for this program
        fetch(`/api/reward-redemptions/program/${program.id}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
      ]);

      return {
        programId: program.id,
        tenantId: program.tenantId,
        fans: fansResult,
        completions: completionsResult,
        redemptions: redemptionsResult,
      };
    });

    const programDataResults = await Promise.all(programDataPromises);

    // ====================
    // 1. TOTAL FANS (enrolled in programs) - deduplicated
    // ====================
    const uniqueFanIds = new Set<string>();
    for (const data of programDataResults) {
      data.fans.forEach((fan: any) => {
        if (fan.fanId && fan.fanId !== creatorId) {
          uniqueFanIds.add(fan.fanId);
        }
      });
    }
    const totalFans = uniqueFanIds.size;

    // ====================
    // 2. TOTAL REVENUE (ALL-TIME)
    // ====================
    // TODO: Calculate from actual payment transactions when payment system is built
    const totalRevenue = 0;

    // ====================
    // 3. TASKS COMPLETED (ALL-TIME)
    // ====================
    let tasksCompleted = 0;
    const processedTenantIds = new Set<string>();

    for (const data of programDataResults) {
      const programCompleted = data.completions.filter(
        (c: any) => c.status === 'completed' || c.status === 'claimed'
      ).length;
      tasksCompleted += programCompleted;

      if (data.completions.length > 0) {
        processedTenantIds.add(data.tenantId);
      }
    }

    // Fallback: If no completions found via programId, try by tenantId in parallel
    if (tasksCompleted === 0 && programs.length > 0) {
      const tenantIdSet = new Set<string>((programs as any[]).map((p) => String(p.tenantId)));
      const uniqueTenantIds = [...tenantIdSet].filter((id) => !processedTenantIds.has(id));

      const tenantCompletionPromises = uniqueTenantIds.map(async (tenantId: string) => {
        try {
          const response = await fetch(`/api/task-completions/tenant/${tenantId}`);
          if (response.ok) {
            const completions = await response.json();
            return completions.filter(
              (c: any) => c.status === 'completed' || c.status === 'claimed'
            ).length;
          }
        } catch {
          // Ignore errors
        }
        return 0;
      });

      const tenantCompletionCounts = await Promise.all(tenantCompletionPromises);
      tasksCompleted = tenantCompletionCounts.reduce((sum, count) => sum + count, 0);
    }

    // ====================
    // 4. REWARDS REDEEMED (ALL-TIME)
    // ====================
    let rewardsRedeemed = 0;
    for (const data of programDataResults) {
      rewardsRedeemed += data.redemptions.length;
    }

    // ====================
    // CALCULATE PERCENTAGE CHANGES
    // ====================
    let fansChange = undefined;
    const _revenueChange = undefined; // eslint-disable-line @typescript-eslint/no-unused-vars
    let tasksChange = undefined;
    let rewardsChange = undefined;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Historical fan count (fans who joined before 30 days ago) - deduplicated
      const previousUniqueFanIds = new Set<string>();
      for (const data of programDataResults) {
        data.fans
          .filter((fan: any) => new Date(fan.joinedAt) < thirtyDaysAgo)
          .forEach((fan: any) => {
            if (fan.fanId && fan.fanId !== creatorId) {
              previousUniqueFanIds.add(fan.fanId);
            }
          });
      }
      const previousFans = previousUniqueFanIds.size;

      if (previousFans > 0 && totalFans !== previousFans) {
        const fansChangeValue = ((totalFans - previousFans) / previousFans) * 100;
        fansChange = {
          value: Math.abs(parseFloat(fansChangeValue.toFixed(1))),
          type: (fansChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
          period: 'vs last month',
        };
      }

      // Historical tasks completed (before 30 days ago) - use already-fetched data
      let previousTasksCompleted = 0;
      for (const data of programDataResults) {
        previousTasksCompleted += data.completions.filter(
          (c: any) =>
            (c.status === 'completed' || c.status === 'claimed') &&
            new Date(c.completedAt || c.updatedAt) < thirtyDaysAgo
        ).length;
      }

      if (previousTasksCompleted > 0 && tasksCompleted !== previousTasksCompleted) {
        const tasksChangeValue =
          ((tasksCompleted - previousTasksCompleted) / previousTasksCompleted) * 100;
        tasksChange = {
          value: Math.abs(parseFloat(tasksChangeValue.toFixed(1))),
          type: (tasksChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
          period: 'vs last month',
        };
      }

      // Historical rewards redeemed (before 30 days ago) - use already-fetched data
      let previousRewardsRedeemed = 0;
      for (const data of programDataResults) {
        previousRewardsRedeemed += data.redemptions.filter(
          (r: any) => new Date(r.redeemedAt || r.createdAt) < thirtyDaysAgo
        ).length;
      }

      if (previousRewardsRedeemed > 0 && rewardsRedeemed !== previousRewardsRedeemed) {
        const rewardsChangeValue =
          ((rewardsRedeemed - previousRewardsRedeemed) / previousRewardsRedeemed) * 100;
        rewardsChange = {
          value: Math.abs(parseFloat(rewardsChangeValue.toFixed(1))),
          type: (rewardsChangeValue >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
          period: 'vs last month',
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
      revenueChange: _revenueChange,
      tasksChange,
      rewardsChange,
    };
  } catch (error) {
    console.error('Failed to fetch creator stats:', error);
    return {
      totalFans: 0,
      totalRevenue: 0,
      tasksCompleted: 0,
      rewardsRedeemed: 0,
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
      fan: activity.fanName || activity.fanId,
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

export const useCreatorActivity = (params?: {
  search?: string;
  type?: string;
  dateFilter?: string;
}) => {
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
