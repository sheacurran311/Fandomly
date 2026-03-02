/**
 * useNFT — React Query hooks for Fandomly Chain L1 NFT operations.
 *
 * Replaces useCrossmint.ts for all on-chain NFT and badge interactions.
 * All minting happens on Fandomly Chain (ID: 31111) — no more Crossmint.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Re-export existing types (unchanged DB schema)
export type { NftCollection, NftTemplate, NftMint, NftDelivery } from './useCrossmint';

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface BadgeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  requirementData: Record<string, unknown>;
  imageUrl: string;
  badgeColor: string | null;
  nftMetadata: {
    attributes: Array<{ trait_type: string; value: string }>;
    onChainBadgeTypeId?: number;
    rarity?: string;
  };
  collectionId: string | null;
  isActive: boolean;
  totalIssued: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnChainToken {
  tokenId: string;
  uri: string;
}

export interface UserBadge {
  badge: BadgeTemplate;
  badgeTypeId: number;
  balance: string;
  owned: boolean;
}

export interface NFTStats {
  totalNFTsMinted: string;
  totalCollections: string;
  totalBadgeTypes: string;
  totalCreatorCollections: string;
}

// ============================================================================
// IPFS UPLOAD HOOKS
// ============================================================================

/**
 * Upload an image to IPFS via Pinata
 */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/nft/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to upload image');
      }

      return response.json() as Promise<{
        success: boolean;
        ipfsHash: string;
        ipfsUri: string;
        gatewayUrl: string;
        size: number;
      }>;
    },
  });
}

/**
 * Upload a video + thumbnail to IPFS via Pinata
 */
export function useUploadVideo() {
  return useMutation({
    mutationFn: async ({ video, thumbnail }: { video: File; thumbnail: File }) => {
      const formData = new FormData();
      formData.append('video', video);
      formData.append('thumbnail', thumbnail);

      const response = await fetch('/api/nft/upload/video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to upload video');
      }

      return response.json() as Promise<{
        success: boolean;
        video: { ipfsHash: string; ipfsUri: string; gatewayUrl: string };
        thumbnail: { ipfsHash: string; ipfsUri: string; gatewayUrl: string };
      }>;
    },
  });
}

// ============================================================================
// COLLECTION HOOKS (FandomlyNFT — ERC-721)
// ============================================================================

/**
 * Fetch all NFT collections for current user
 */
export function useNftCollections() {
  return useQuery<{ collections: Record<string, unknown>[] }>({
    queryKey: ['/api/nft/collections'],
    staleTime: 30000,
  });
}

/**
 * Fetch single collection with on-chain data
 */
export function useNftCollection(collectionId: string | undefined) {
  return useQuery<{ collection: Record<string, unknown>; onChainData?: Record<string, unknown> }>({
    queryKey: ['/api/nft/collections', collectionId],
    enabled: !!collectionId,
  });
}

/**
 * Create new NFT collection on Fandomly Chain
 */
export function useCreateNftCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      maxSupply: number;
      pointsCost?: number;
      imageUrl?: string;
    }) => {
      const response = await apiRequest('POST', '/api/nft/collections', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

// ============================================================================
// MINTING HOOKS
// ============================================================================

/**
 * Mint a single NFT on Fandomly Chain
 */
export function useMintNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      collectionId: string;
      recipientAddress: string;
      recipientUserId?: string;
      tokenUri?: string;
      metadata?: {
        name: string;
        description: string;
        image: string;
        animation_url?: string;
        attributes?: Array<{ trait_type: string; value: string }>;
      };
      mintReason?: string;
      contextData?: Record<string, unknown>;
    }) => {
      const response = await apiRequest('POST', '/api/nft/mint', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

/**
 * Get tokens owned by a wallet address (on-chain)
 */
export function useTokensOfOwner(address: string | undefined) {
  return useQuery<{ address: string; tokens: OnChainToken[]; total: number }>({
    queryKey: ['/api/nft/tokens', address],
    enabled: !!address,
    staleTime: 15000,
  });
}

/**
 * Fetch user's NFT deliveries
 */
export function useNftDeliveries() {
  return useQuery<{ deliveries: Record<string, unknown>[] }>({
    queryKey: ['/api/nft/deliveries'],
    staleTime: 10000,
  });
}

// ============================================================================
// BADGE HOOKS (FandomlyBadge — ERC-1155)
// ============================================================================

/**
 * Create a new badge type (platform or creator)
 */
export function useCreateBadgeType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      category?: string;
      soulbound?: boolean;
      maxSupply?: number;
      creatorAddress?: string;
      image?: File;
      metadataUri?: string;
    }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      if (data.category) formData.append('category', data.category);
      if (data.soulbound !== undefined) formData.append('soulbound', String(data.soulbound));
      if (data.maxSupply !== undefined) formData.append('maxSupply', String(data.maxSupply));
      if (data.creatorAddress) formData.append('creatorAddress', data.creatorAddress);
      if (data.image) formData.append('image', data.image);
      if (data.metadataUri) formData.append('metadataUri', data.metadataUri);

      const response = await fetch('/api/nft/badges/types', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create badge type');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/badges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

/**
 * Mint a badge to a single user
 */
export function useMintBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      badgeTemplateId: string;
      recipientAddress: string;
      recipientUserId?: string;
      amount?: number;
      mintReason?: string;
      contextData?: Record<string, unknown>;
    }) => {
      const response = await apiRequest('POST', '/api/nft/badges/mint', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/badges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

/**
 * Batch mint badges to multiple recipients
 */
export function useBatchMintBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      badgeTemplateId: string;
      recipients: Array<string | { walletAddress: string }>;
      amountEach?: number;
    }) => {
      const response = await apiRequest('POST', '/api/nft/badges/batch-mint', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/badges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

/**
 * Get badge type info
 */
export function useBadgeType(badgeTypeId: string | undefined) {
  return useQuery<{ badge: BadgeTemplate; onChainData?: Record<string, unknown> }>({
    queryKey: ['/api/nft/badges/types', badgeTypeId],
    enabled: !!badgeTypeId,
  });
}

/**
 * Get user's badge balances (on-chain)
 */
export function useUserBadges(address: string | undefined) {
  return useQuery<{ address: string; badges: UserBadge[]; total: number }>({
    queryKey: ['/api/nft/badges/user', address],
    enabled: !!address,
    staleTime: 15000,
  });
}

// ============================================================================
// CREATOR COLLECTION HOOKS (CreatorCollectionFactory)
// ============================================================================

/**
 * Deploy a new creator NFT collection
 */
export function useCreateCreatorCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      symbol: string;
      creatorAddress: string;
      maxSupply: number;
      royaltyBps?: number;
      description?: string;
    }) => {
      const response = await apiRequest('POST', '/api/nft/creator-collections', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/creator-collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/stats'] });
    },
  });
}

/**
 * Get creator's collections from the factory (on-chain)
 */
export function useCreatorCollections(creatorAddress: string | undefined) {
  return useQuery<{ address: string; collections: string[]; total: number }>({
    queryKey: ['/api/nft/creator-collections', creatorAddress],
    enabled: !!creatorAddress,
    staleTime: 30000,
  });
}

// ============================================================================
// STATS
// ============================================================================

/**
 * Get platform-wide NFT stats
 */
export function useNFTStats() {
  return useQuery<{
    success: boolean;
    stats: NFTStats;
    contracts: {
      FandomlyNFT: string;
      FandomlyBadge: string;
      CreatorCollectionFactory: string;
    };
    chain: { id: number; name: string };
  }>({
    queryKey: ['/api/nft/stats'],
    staleTime: 30000,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getChainDisplayName(chain: string): string {
  if (chain === 'fandomly-chain') return 'Fandomly Chain';
  const chainMap: Record<string, string> = {
    polygon: 'Polygon',
    'polygon-amoy': 'Polygon Amoy (Testnet)',
    base: 'Base',
    'base-sepolia': 'Base Sepolia (Testnet)',
    ethereum: 'Ethereum',
    solana: 'Solana',
  };
  return chainMap[chain] || chain;
}

export function getChainColor(chain: string): string {
  if (chain === 'fandomly-chain') return 'bg-gradient-to-r from-purple-500 to-pink-500';
  if (chain.includes('polygon')) return 'bg-purple-500';
  if (chain.includes('base')) return 'bg-blue-500';
  if (chain.includes('ethereum')) return 'bg-gray-700';
  if (chain.includes('solana')) return 'bg-gradient-to-r from-purple-400 to-pink-500';
  return 'bg-gray-500';
}

export function formatTokenType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    ERC721: 'ERC-721 (NFT)',
    ERC1155: 'ERC-1155 (Badge)',
  };
  return typeMap[tokenType] || tokenType;
}

/**
 * Convert IPFS URI to gateway URL for display
 */
export function ipfsToGateway(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string): string {
  return `https://subnets-test.avax.network/subnets/2G2z7yGeWPKvwtJKbcs5bqEgwBATT5jkJNJHjt5RnhTBficJ93/transaction/${txHash}`;
}

/**
 * Get block explorer URL for a contract
 */
export function getExplorerContractUrl(address: string): string {
  return `https://subnets-test.avax.network/subnets/2G2z7yGeWPKvwtJKbcs5bqEgwBATT5jkJNJHjt5RnhTBficJ93/address/${address}`;
}
