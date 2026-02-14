import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ============================================================================
// TYPES
// ============================================================================

export interface NftCollection {
  id: string;
  creatorId: string;
  tenantId: string;
  crossmintCollectionId: string | null;
  name: string;
  description: string | null;
  symbol: string | null;
  chain: string;
  contractAddress: string | null;
  tokenType: 'ERC721' | 'ERC1155' | 'SOLANA' | 'SOLANA_COMPRESSED';
  isCreatorOwned: boolean;
  ownerWalletAddress: string | null;
  metadata: any;
  isActive: boolean;
  deployedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NftTemplate {
  id: string;
  collectionId: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: string;
  metadata: {
    image: string;
    animationUrl?: string;
    externalUrl?: string;
    attributes: Array<{ trait_type: string; value: string; display_type?: string }>;
    rarity?: string;
    properties?: Record<string, any>;
  };
  mintPrice: number;
  maxSupply: number | null;
  currentSupply: number;
  isActive: boolean;
  isDraft: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NftMint {
  id: string;
  crossmintActionId: string;
  collectionId: string;
  templateId: string | null;
  badgeTemplateId: string | null;
  recipientUserId: string;
  recipientWalletAddress: string;
  recipientChain: string;
  mintReason: string;
  contextData: any;
  tokenId: string | null;
  txHash: string | null;
  contractAddress: string | null;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage: string | null;
  retryCount: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface NftDelivery {
  id: string;
  mintId: string;
  userId: string;
  collectionId: string;
  tokenId: string;
  txHash: string;
  chain: string;
  contractAddress: string;
  metadataSnapshot: {
    name: string;
    description?: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  isViewed: boolean;
  viewedAt: Date | null;
  notificationSent: boolean;
  notificationSentAt: Date | null;
  deliveredAt: Date;
  createdAt: Date;
}

// ============================================================================
// COLLECTION HOOKS
// ============================================================================

/**
 * Fetch all NFT collections for current user
 */
export function useNftCollections() {
  return useQuery<{ collections: NftCollection[] }>({
    queryKey: ['/api/nft/collections'],
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single collection details
 */
export function useNftCollection(collectionId: string | undefined) {
  return useQuery<{ collection: NftCollection; templates: NftTemplate[] }>({
    queryKey: ['/api/nft/collections', collectionId],
    enabled: !!collectionId,
  });
}

/**
 * Create new NFT collection
 */
export function useCreateNftCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      symbol?: string;
      chain: string;
      tokenType?: string;
      isCreatorOwned?: boolean;
      metadata?: any;
    }) => {
      const response = await apiRequest('POST', '/api/nft/collections', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections'] });
    },
  });
}

/**
 * Update NFT collection
 */
export function useUpdateNftCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        isActive?: boolean;
        metadata?: any;
      };
    }) => {
      const response = await apiRequest('PUT', `/api/nft/collections/${id}`, data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections', variables.id] });
    },
  });
}

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

/**
 * Fetch NFT templates (optionally filtered by collection)
 */
export function useNftTemplates(collectionId?: string) {
  return useQuery<{ templates: NftTemplate[] }>({
    queryKey: collectionId ? ['/api/nft/templates', { collectionId }] : ['/api/nft/templates'],
    staleTime: 30000,
  });
}

/**
 * Create NFT template
 */
export function useCreateNftTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      collectionId: string;
      name: string;
      description?: string;
      category?: string;
      metadata: NftTemplate['metadata'];
      mintPrice?: number;
      maxSupply?: number;
      isDraft?: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/nft/templates', data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nft/collections', variables.collectionId] });
    },
  });
}

/**
 * Update NFT template
 */
export function useUpdateNftTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        description: string;
        metadata: NftTemplate['metadata'];
        isActive: boolean;
        isDraft: boolean;
        mintPrice: number;
        maxSupply: number;
      }>;
    }) => {
      const response = await apiRequest('PUT', `/api/nft/templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/templates'] });
    },
  });
}

/**
 * Archive NFT template
 */
export function useDeleteNftTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/nft/templates/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/templates'] });
    },
  });
}

// ============================================================================
// MINTING HOOKS
// ============================================================================

/**
 * Mint single NFT
 */
export function useMintNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      recipientUserId: string;
      recipientWalletAddress: string;
      mintReason?: string;
      contextData?: any;
    }) => {
      const response = await apiRequest('POST', '/api/nft/mint', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/deliveries'] });
    },
  });
}

/**
 * Batch mint NFTs
 */
export function useBatchMintNft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      recipients: Array<{ userId: string; walletAddress: string }>;
      mintReason?: string;
      contextData?: any;
    }) => {
      const response = await apiRequest('POST', '/api/nft/mint/batch', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/deliveries'] });
    },
  });
}

/**
 * Get mint status
 */
export function useMintStatus(actionId: string | undefined) {
  return useQuery<{ mint: NftMint; crossmint?: any }>({
    queryKey: ['/api/nft/mint', actionId, 'status'],
    enabled: !!actionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.mint?.status === 'success' || data?.mint?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds while pending
    },
  });
}

/**
 * Fetch user's NFT deliveries
 */
export function useNftDeliveries() {
  return useQuery<{ deliveries: NftDelivery[] }>({
    queryKey: ['/api/nft/deliveries'],
    staleTime: 10000,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get chain display name
 */
export function getChainDisplayName(chain: string): string {
  const chainMap: Record<string, string> = {
    'polygon': 'Polygon',
    'polygon-amoy': 'Polygon Amoy (Testnet)',
    'base': 'Base',
    'base-sepolia': 'Base Sepolia (Testnet)',
    'arbitrum': 'Arbitrum',
    'arbitrum-sepolia': 'Arbitrum Sepolia (Testnet)',
    'optimism': 'Optimism',
    'optimism-sepolia': 'Optimism Sepolia (Testnet)',
    'ethereum': 'Ethereum',
    'ethereum-sepolia': 'Ethereum Sepolia (Testnet)',
    'solana': 'Solana',
  };
  return chainMap[chain] || chain;
}

/**
 * Get chain icon color
 */
export function getChainColor(chain: string): string {
  if (chain.includes('polygon')) return 'bg-purple-500';
  if (chain.includes('base')) return 'bg-blue-500';
  if (chain.includes('arbitrum')) return 'bg-blue-600';
  if (chain.includes('optimism')) return 'bg-red-500';
  if (chain.includes('ethereum')) return 'bg-gray-700';
  if (chain.includes('solana')) return 'bg-gradient-to-r from-purple-400 to-pink-500';
  return 'bg-gray-500';
}

/**
 * Check if chain supports compressed NFTs
 */
export function supportsCompressedNFTs(chain: string): boolean {
  return chain.includes('solana');
}

/**
 * Format token type for display
 */
export function formatTokenType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    'ERC721': 'ERC-721 (NFT)',
    'ERC1155': 'ERC-1155 (Multi-token)',
    'SOLANA': 'Solana NFT',
    'SOLANA_COMPRESSED': 'Solana cNFT (Compressed)',
  };
  return typeMap[tokenType] || tokenType;
}

