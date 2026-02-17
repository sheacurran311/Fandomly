import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';

interface FanStats {
  platformPoints: number;
  creatorPoints: number;
  totalPoints: number;
  followingCount: number;
  creatorsEnrolledCount?: number;
  programsEnrolledCount?: number;
  activeCampaignsCount: number;
  rewardsEarned: number;
  pointsChange?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  } | null;
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
const fetchFanStats = async (): Promise<FanStats> => {
  try {
    const response = await apiRequest('GET', '/api/fan/dashboard/stats');
    
    if (!response.ok) {
      throw new Error('Failed to fetch fan stats');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch fan stats:', error);
    // Return fallback data if API fails
    return {
      platformPoints: 0,
      creatorPoints: 0,
      totalPoints: 0,
      followingCount: 0,
      activeCampaignsCount: 0,
      rewardsEarned: 0,
      pointsChange: null,
    };
  }
};

const fetchActiveCampaigns = async (fanId: string): Promise<Campaign[]> => {
  try {
    // Get fan programs to find which creators they follow
    const fanProgramsResponse = await apiRequest('GET', `/api/fan-programs/user/${fanId}`);
    if (!fanProgramsResponse.ok) {
      throw new Error('Failed to fetch fan programs');
    }
    const fanPrograms = await fanProgramsResponse.json();

    // Fetch campaigns for all creators in parallel
    const campaignPromises = fanPrograms.map(async (program: any) => {
      try {
        const campaignsResponse = await apiRequest('GET', `/api/campaigns/creator/${program.creatorId}`);
        if (!campaignsResponse.ok) {
          return [];
        }
        const creatorCampaigns = await campaignsResponse.json();
        
        // Transform campaigns with calculated fields
        return creatorCampaigns.map((campaign: any) => {
          // Calculate real progress based on totalParticipants vs globalBudget
          const progress = campaign.globalBudget && campaign.totalParticipants 
            ? Math.min(100, Math.floor((campaign.totalParticipants / campaign.globalBudget) * 100))
            : 0;
          
          // Calculate real time left from endDate
          let timeLeft = 'Ongoing';
          if (campaign.endDate) {
            const endDate = new Date(campaign.endDate);
            const now = new Date();
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
              timeLeft = 'Ended';
            } else if (daysLeft === 0) {
              timeLeft = 'Ends today';
            } else if (daysLeft === 1) {
              timeLeft = '1 day left';
            } else if (daysLeft <= 7) {
              timeLeft = `${daysLeft} days left`;
            } else if (daysLeft <= 30) {
              const weeksLeft = Math.ceil(daysLeft / 7);
              timeLeft = `${weeksLeft} week${weeksLeft > 1 ? 's' : ''} left`;
            } else {
              const monthsLeft = Math.ceil(daysLeft / 30);
              timeLeft = `${monthsLeft} month${monthsLeft > 1 ? 's' : ''} left`;
            }
          }
          
          return {
            id: campaign.id,
            creator: campaign.creator?.displayName || 'Unknown Creator',
            campaign: campaign.name || 'Untitled Campaign',
            points: campaign.pointValue || 100,
            progress,
            category: campaign.category || 'General',
            timeLeft,
            creatorId: program.creatorId
          };
        });
      } catch (error) {
        console.warn(`Failed to fetch campaigns for creator ${program.creatorId}:`, error);
        return [];
      }
    });

    const campaignArrays = await Promise.all(campaignPromises);
    const campaigns: Campaign[] = campaignArrays.flat();

    return campaigns.slice(0, 5); // Return top 5 campaigns
  } catch (error) {
    console.error('Failed to fetch active campaigns:', error);
    return [];
  }
};

const fetchRecommendations = async (): Promise<Recommendation[]> => {
  try {
    const response = await apiRequest('GET', '/api/creators');
    if (!response.ok) {
      throw new Error('Failed to fetch creators');
    }
    const creators = await response.json();

    return creators.slice(0, 3).map((creator: any) => ({
      id: creator.id,
      creator: creator.displayName || 'Unknown Creator',
      description: creator.bio || 'No description available',
      followers: creator.followerCount ? creator.followerCount.toLocaleString() : '0',
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
    queryFn: fetchFanStats,
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
