import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export interface UserNFT {
  id: string;
  name: string;
  description?: string;
  image: string;
  collection: {
    name: string;
    chain: string;
  };
  metadata: {
    attributes?: Array<{
      trait_type: string;
      value: string;
      display_type?: string;
    }>;
    category?: string;
    rarity?: string;
  };
  mintedAt: string;
  tokenId?: string;
  contractAddress?: string;
  chain: string;
  type: 'badge' | 'reward' | 'platform' | 'creator';
}

export function useUserNFTs(userId?: string) {
  const { user, isAuthenticated } = useAuth();
  const effectiveUserId = userId || user?.id;
  
  return useQuery<UserNFT[]>({
    queryKey: ['/api/nfts/user', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) {
        return [];
      }
      
      // Fetch NFTs from backend (which aggregates from Crossmint and blockchain)
      const response = await apiRequest('GET', `/api/nfts/user/${effectiveUserId}`);
      return response.json();
    },
    enabled: !!effectiveUserId && isAuthenticated,
  });
}

export function useNFTsByWallet(walletAddress: string, chain: string) {
  return useQuery<UserNFT[]>({
    queryKey: ['/api/nfts/wallet', walletAddress, chain],
    queryFn: async () => {
      if (!walletAddress) return [];
      
      const response = await apiRequest('GET', `/api/nfts/wallet/${walletAddress}?chain=${chain}`);
      return response.json();
    },
    enabled: !!walletAddress,
  });
}
