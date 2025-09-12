import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface FanStats {
  totalPoints: number;
  followingCount: number;
  activeCampaignsCount: number;
  rewardsEarned: number;
  pointsChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
}

interface Campaign {
  id: string;
  creator: string;
  campaign: string;
  points: number;
  progress: number;
  category: string;
  timeLeft: string;
  creatorId: string;
}

interface Recommendation {
  id: string;
  creator: string;
  description: string;
  followers: string;
  category: string;
  hasActiveCampaign: boolean;
}

// API functions
const fetchFanStats = async (fanId: string): Promise<FanStats> => {
  try {
    // Get fan programs for this user
    const fanProgramsResponse = await fetch(`/api/fan-programs/user/${fanId}`);
    if (!fanProgramsResponse.ok) {
      throw new Error('Failed to fetch fan programs');
    }
    const fanPrograms = await fanProgramsResponse.json();

    // Calculate total points from all fan programs
    let totalPoints = 0;
    const activeCampaignsCount = fanPrograms.length;

    // Get point transactions for each fan program
    for (const program of fanPrograms) {
      try {
        const pointsResponse = await fetch(`/api/point-transactions/fan-program/${program.id}`);
        if (pointsResponse.ok) {
          const transactions = await pointsResponse.json();
          const programPoints = transactions.reduce((sum: number, tx: any) => sum + tx.pointsAwarded, 0);
          totalPoints += programPoints;
        }
      } catch (error) {
        console.warn(`Failed to fetch points for program ${program.id}:`, error);
      }
    }

    // Get reward redemptions
    const rewardsResponse = await fetch(`/api/reward-redemptions/user/${fanId}`);
    let rewardsEarned = 0;
    if (rewardsResponse.ok) {
      const redemptions = await rewardsResponse.json();
      rewardsEarned = redemptions.length;
    }

    return {
      totalPoints,
      followingCount: fanPrograms.length, // Number of creators they're following
      activeCampaignsCount,
      rewardsEarned,
      pointsChange: {
        value: 8.5,
        type: 'increase',
        period: 'this week'
      }
    };
  } catch (error) {
    console.error('Failed to fetch fan stats:', error);
    // Return fallback data if API fails
    return {
      totalPoints: 0,
      followingCount: 0,
      activeCampaignsCount: 0,
      rewardsEarned: 0
    };
  }
};

const fetchActiveCampaigns = async (fanId: string): Promise<Campaign[]> => {
  try {
    // Get fan programs to find which creators they follow
    const fanProgramsResponse = await fetch(`/api/fan-programs/user/${fanId}`);
    if (!fanProgramsResponse.ok) {
      throw new Error('Failed to fetch fan programs');
    }
    const fanPrograms = await fanProgramsResponse.json();

    const campaigns: Campaign[] = [];

    // For each fan program, get the active campaigns from that creator
    for (const program of fanPrograms) {
      try {
        const campaignsResponse = await fetch(`/api/campaigns/creator/${program.creatorId}`);
        if (campaignsResponse.ok) {
          const creatorCampaigns = await campaignsResponse.json();
          
          // Add creator campaigns to the list
          creatorCampaigns.forEach((campaign: any) => {
            campaigns.push({
              id: campaign.id,
              creator: campaign.creator?.displayName || 'Unknown Creator',
              campaign: campaign.name || 'Untitled Campaign',
              points: campaign.pointValue || 100,
              progress: Math.floor(Math.random() * 100), // TODO: Calculate real progress
              category: campaign.category || 'General',
              timeLeft: '1 week left', // TODO: Calculate from campaign end date
              creatorId: program.creatorId
            });
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch campaigns for creator ${program.creatorId}:`, error);
      }
    }

    return campaigns.slice(0, 5); // Return top 5 campaigns
  } catch (error) {
    console.error('Failed to fetch active campaigns:', error);
    return [];
  }
};

const fetchRecommendations = async (): Promise<Recommendation[]> => {
  try {
    const response = await fetch('/api/creators');
    if (!response.ok) {
      throw new Error('Failed to fetch creators');
    }
    const creators = await response.json();

    return creators.slice(0, 3).map((creator: any) => ({
      id: creator.id,
      creator: creator.displayName || 'Unknown Creator',
      description: creator.bio || 'No description available',
      followers: `${Math.floor(Math.random() * 10000)}`, // TODO: Get real follower count
      category: creator.category || 'General',
      hasActiveCampaign: creator.hasActiveCampaign || false
    }));
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return [];
  }
};

// Custom hooks
export const useFanStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['fanStats', user?.id],
    queryFn: () => fetchFanStats(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useActiveCampaigns = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['activeCampaigns', user?.id],
    queryFn: () => fetchActiveCampaigns(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

export const useRecommendations = () => {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export type { FanStats, Campaign, Recommendation };
