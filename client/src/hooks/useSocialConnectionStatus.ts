import { useQuery } from '@tanstack/react-query';
import { getSocialConnection } from '@/lib/social-connection-api';

export interface SocialConnectionStatus {
  connected: boolean;
  isLoading: boolean;
  platform: string;
}

/**
 * Hook to check if a specific social platform is connected
 */
export function useSocialConnectionStatus(platform?: string): SocialConnectionStatus {
  const { data, isLoading } = useQuery({
    queryKey: ['social-connection', platform],
    queryFn: () => getSocialConnection(platform || ''),
    enabled: !!platform && ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(platform.toLowerCase()),
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    connected: data?.connected || false,
    isLoading,
    platform: platform || '',
  };
}

/**
 * Hook to check multiple social platform connections at once
 */
export function useMultipleSocialConnections(platforms: string[]): Record<string, boolean> {
  const uniquePlatforms = [...new Set(platforms.filter(Boolean))];

  const queries = uniquePlatforms.map(platform =>
    useQuery({
      queryKey: ['social-connection', platform],
      queryFn: () => getSocialConnection(platform),
      enabled: ['twitter', 'facebook', 'instagram', 'youtube', 'spotify', 'tiktok', 'x'].includes(platform.toLowerCase()),
      staleTime: 30000,
    })
  );

  const connectionStatus: Record<string, boolean> = {};
  uniquePlatforms.forEach((platform, index) => {
    connectionStatus[platform] = queries[index].data?.connected || false;
  });

  return connectionStatus;
}
