// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CrossmintConfig {
  apiKey: string;
  environment: 'staging' | 'www';
  projectId?: string;
}

export interface CreateCollectionParams {
  chain: string; // 'polygon-amoy', 'base-sepolia', 'solana', etc.
  metadata: {
    name: string;
    description?: string;
    symbol?: string;
    imageUrl?: string;
  };
  fungibility?: 'non-fungible' | 'semi-fungible';
  supplyLimit?: number;
}

export interface MintNFTParams {
  collectionId: string; // Crossmint collection ID or 'default-{chain}'
  recipient: string; // wallet address or 'email:{email}:{chain}'
  metadata: {
    name: string;
    description?: string;
    image: string;
    animationUrl?: string;
    attributes?: Array<{ trait_type: string; value: string; display_type?: string }>;
    properties?: Record<string, any>;
  };
  compressed?: boolean; // For Solana compressed NFTs
  reuploadLinkedFiles?: boolean;
}

export interface BatchMintNFTParams {
  collectionId: string;
  recipients: Array<{
    wallet: string;
    metadata: MintNFTParams['metadata'];
  }>;
  compressed?: boolean;
}

export interface MintStatusResponse {
  actionId: string;
  action: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  data?: {
    chain?: string;
    txId?: string;
    collection?: any;
    recipient?: any;
    token?: {
      tokenId?: string;
      contractAddress?: string;
    };
  };
  startedAt?: string;
  completedAt?: string;
  resource?: string;
}

export interface CreateCollectionResponse {
  id: string; // Collection ID
  metadata: {
    name: string;
    description?: string;
    imageUrl?: string;
  };
  fungibility: string;
  onChain: {
    chain: string;
    type: string;
    contractAddress?: string;
  };
  actionId: string;
}

export interface MintNFTResponse {
  id: string;
  onChain: {
    status: string;
    chain: string;
    contractAddress?: string;
  };
  actionId: string;
}

// ============================================================================
// CROSSMINT SERVICE CLASS
// ============================================================================

export class CrossmintService {
  private apiKey: string;
  private baseUrl: string;
  private projectId?: string;

  constructor(config: CrossmintConfig) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.baseUrl =
      config.environment === 'www'
        ? 'https://www.crossmint.com/api'
        : 'https://staging.crossmint.com/api';
  }

  // ========================================================================
  // COLLECTION MANAGEMENT
  // ========================================================================

  /**
   * Create a new NFT collection on specified chain (idempotent version)
   * Uses PUT endpoint with custom collectionId for guaranteed idempotency
   */
  async createCollectionIdempotent(
    collectionId: string,
    params: CreateCollectionParams
  ): Promise<CreateCollectionResponse> {
    const url = `${this.baseUrl}/2022-06-09/collections/${collectionId}`;

    const body: any = {
      chain: params.chain,
      metadata: {
        name: params.metadata.name,
        description: params.metadata.description || '',
        imageUrl: params.metadata.imageUrl || '',
        symbol: params.metadata.symbol || params.metadata.name.substring(0, 10).toUpperCase(),
      },
      fungibility: params.fungibility || 'non-fungible',
      reuploadLinkedFiles: true, // Auto-upload images to IPFS
    };

    if (params.supplyLimit) {
      body.supplyLimit = params.supplyLimit;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as CreateCollectionResponse;
    } catch (error: any) {
      console.error('❌ Crossmint createCollectionIdempotent error:', error);
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  /**
   * Create a new NFT collection on specified chain (legacy POST version)
   */
  async createCollection(
    params: CreateCollectionParams
  ): Promise<CreateCollectionResponse> {
    const url = `${this.baseUrl}/2022-06-09/collections`;

    const body: any = {
      chain: params.chain,
      metadata: {
        name: params.metadata.name,
        description: params.metadata.description || '',
        imageUrl: params.metadata.imageUrl || '',
      },
      fungibility: params.fungibility || 'non-fungible',
      reuploadLinkedFiles: true, // Auto-upload images to IPFS
    };

    // Add token metadata for EVM chains
    if (!params.chain.includes('solana')) {
      body.tokens = {
        erc721: {
          tokenMetadata: {
            symbol: params.metadata.symbol || params.metadata.name.substring(0, 5).toUpperCase(),
          },
        },
      };
    }

    if (params.supplyLimit) {
      body.supplyLimit = params.supplyLimit;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as CreateCollectionResponse;
    } catch (error: any) {
      console.error('❌ Crossmint createCollection error:', error);
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  /**
   * Get collection details
   */
  async getCollectionDetails(collectionId: string): Promise<any> {
    const url = `${this.baseUrl}/2022-06-09/collections/${collectionId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Crossmint getCollectionDetails error:', error);
      throw new Error(`Failed to get collection details: ${error.message}`);
    }
  }

  // ========================================================================
  // MINTING OPERATIONS
  // ========================================================================

  /**
   * Mint a single NFT to a recipient (idempotent version)
   * Uses PUT endpoint with custom nftId for guaranteed idempotency
   * Recommended for production use to avoid duplicate mints
   */
  async mintNFTIdempotent(
    nftId: string,
    params: MintNFTParams
  ): Promise<MintNFTResponse> {
    const url = `${this.baseUrl}/2022-06-09/collections/${params.collectionId}/nfts/${nftId}`;

    const body: any = {
      recipient: params.recipient,
      metadata: params.metadata,
      reuploadLinkedFiles: params.reuploadLinkedFiles !== undefined ? params.reuploadLinkedFiles : true,
    };

    // Solana compressed NFTs
    if (params.compressed && params.collectionId.includes('solana')) {
      body.compressed = true;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as MintNFTResponse;
    } catch (error: any) {
      console.error('❌ Crossmint mintNFTIdempotent error:', error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  /**
   * Mint a single NFT to a recipient (legacy POST version)
   */
  async mintNFT(params: MintNFTParams): Promise<MintNFTResponse> {
    const url = `${this.baseUrl}/2022-06-09/collections/${params.collectionId}/nfts`;

    const body: any = {
      recipient: params.recipient,
      metadata: params.metadata,
      reuploadLinkedFiles: params.reuploadLinkedFiles !== undefined ? params.reuploadLinkedFiles : true,
    };

    // Solana compressed NFTs
    if (params.compressed && params.collectionId.includes('solana')) {
      body.compressed = true;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as MintNFTResponse;
    } catch (error: any) {
      console.error('❌ Crossmint mintNFT error:', error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  /**
   * Batch mint NFTs (multiple recipients)
   */
  async mintBatch(params: BatchMintNFTParams): Promise<MintNFTResponse[]> {
    const results: MintNFTResponse[] = [];
    const errors: Array<{ recipient: string; error: string }> = [];

    // Crossmint doesn't have native batch endpoint for all chains
    // So we'll make sequential calls with rate limiting
    for (const recipient of params.recipients) {
      try {
        const result = await this.mintNFT({
          collectionId: params.collectionId,
          recipient: recipient.wallet,
          metadata: recipient.metadata,
          compressed: params.compressed,
        });
        results.push(result);
        
        // Rate limit: 10 requests per second max
        await this.delay(100);
      } catch (error: any) {
        console.error(`❌ Failed to mint for ${recipient.wallet}:`, error);
        errors.push({
          recipient: recipient.wallet,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Batch mint completed with ${errors.length} errors:`, errors);
    }

    return results;
  }

  /**
   * Mint compressed NFT on Solana (optimized for scale)
   */
  async mintCompressedNFT(
    params: Omit<MintNFTParams, 'compressed'>
  ): Promise<MintNFTResponse> {
    return this.mintNFT({
      ...params,
      compressed: true,
      reuploadLinkedFiles: false,
    });
  }

  // ========================================================================
  // STATUS & MONITORING
  // ========================================================================

  /**
   * Get mint operation status
   */
  async getMintStatus(actionId: string): Promise<MintStatusResponse> {
    const url = `${this.baseUrl}/2022-06-09/actions/${actionId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as MintStatusResponse;
    } catch (error: any) {
      console.error('❌ Crossmint getMintStatus error:', error);
      throw new Error(`Failed to get mint status: ${error.message}`);
    }
  }

  /**
   * Poll mint status until completed or failed
   */
  async waitForMintCompletion(
    actionId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<MintStatusResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getMintStatus(actionId);

      if (status.status === 'success' || status.status === 'failed') {
        return status;
      }

      attempts++;
      await this.delay(intervalMs);
    }

    throw new Error(`Mint operation timed out after ${maxAttempts} attempts`);
  }

  // ========================================================================
  // TEMPLATE MANAGEMENT (for Badge NFTs)
  // ========================================================================

  /**
   * Create an NFT template with predefined metadata (idempotent)
   * Perfect for badge templates that will be minted multiple times
   */
  async createTemplate(
    collectionId: string,
    templateId: string,
    params: {
      metadata: {
        name: string;
        image: string;
        description?: string;
        symbol?: string;
        attributes?: Array<{ trait_type: string; value: string; display_type?: string }>;
      };
      supply?: {
        limit?: number; // Set to 1 for NFTs, higher for SFTs
      };
      reuploadLinkedFiles?: boolean;
    }
  ): Promise<any> {
    const url = `${this.baseUrl}/2022-06-09/collections/${collectionId}/templates/${templateId}`;

    const body: any = {
      metadata: {
        name: params.metadata.name,
        image: params.metadata.image,
        description: params.metadata.description || '',
      },
      reuploadLinkedFiles: params.reuploadLinkedFiles !== undefined ? params.reuploadLinkedFiles : true,
    };

    if (params.metadata.symbol) {
      body.metadata.symbol = params.metadata.symbol;
    }

    if (params.metadata.attributes) {
      body.metadata.attributes = params.metadata.attributes;
    }

    if (params.supply) {
      body.supply = params.supply;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Crossmint createTemplate error:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Mint from a template
   * Use this for badge minting after creating a template
   */
  async mintFromTemplate(
    collectionId: string,
    templateId: string,
    recipient: string,
    nftId?: string // Optional nftId for idempotency
  ): Promise<MintNFTResponse> {
    const baseUrl = `${this.baseUrl}/2022-06-09/collections/${collectionId}/templates/${templateId}/nfts`;
    const url = nftId ? `${baseUrl}/${nftId}` : baseUrl;

    const body: any = {
      recipient,
    };

    try {
      const response = await fetch(url, {
        method: nftId ? 'PUT' : 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return (await response.json()) as MintNFTResponse;
    } catch (error: any) {
      console.error('❌ Crossmint mintFromTemplate error:', error);
      throw new Error(`Failed to mint from template: ${error.message}`);
    }
  }

  // ========================================================================
  // NFT METADATA & MANAGEMENT
  // ========================================================================

  /**
   * Update NFT metadata (if supported by chain/contract)
   */
  async updateNFTMetadata(
    collectionId: string,
    tokenId: string,
    metadata: Partial<MintNFTParams['metadata']>
  ): Promise<any> {
    const url = `${this.baseUrl}/2022-06-09/collections/${collectionId}/nfts/${tokenId}`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Crossmint updateNFTMetadata error:', error);
      throw new Error(`Failed to update NFT metadata: ${error.message}`);
    }
  }

  /**
   * Get NFT details
   */
  async getNFT(collectionId: string, tokenId: string): Promise<any> {
    const url = `${this.baseUrl}/2022-06-09/collections/${collectionId}/nfts/${tokenId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Crossmint API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Crossmint getNFT error:', error);
      throw new Error(`Failed to get NFT: ${error.message}`);
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Format recipient address for Crossmint API
   * @param walletAddress - User's wallet address
   * @param chain - Target chain
   * @returns Formatted recipient string
   */
  static formatRecipient(walletAddress: string, chain: string): string {
    // Crossmint accepts direct wallet addresses or email format
    // For Dynamic embedded wallets, we use the wallet address directly
    return walletAddress;
  }

  /**
   * Check if chain supports compressed NFTs
   */
  static supportsCompressedNFTs(chain: string): boolean {
    return chain.includes('solana');
  }

  /**
   * Get default collection ID for a chain
   */
  static getDefaultCollectionId(chain: string): string {
    if (chain.includes('solana')) {
      return 'default-solana';
    }
    return `default-${chain}`;
  }

  /**
   * Validate metadata format
   */
  static validateMetadata(metadata: MintNFTParams['metadata']): boolean {
    if (!metadata.name || !metadata.image) {
      return false;
    }
    if (metadata.attributes) {
      for (const attr of metadata.attributes) {
        if (!attr.trait_type || attr.value === undefined) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========================================================================
  // BADGE-SPECIFIC HELPERS
  // ========================================================================

  /**
   * Create a badge collection for Fandomly badges
   * Optimized for badge use case with sensible defaults
   */
  async createBadgeCollection(
    collectionId: string,
    params: {
      name: string;
      description: string;
      imageUrl: string;
      chain?: string;
      symbol?: string;
    }
  ): Promise<CreateCollectionResponse> {
    return this.createCollectionIdempotent(collectionId, {
      chain: params.chain || 'polygon', // Default to Polygon for badges
      metadata: {
        name: params.name,
        description: params.description,
        imageUrl: params.imageUrl,
        symbol: params.symbol || 'BADGE',
      },
      fungibility: 'non-fungible',
      supplyLimit: undefined, // Unlimited badges
    });
  }

  /**
   * Create a badge template for reusable badge types
   * This allows minting the same badge to multiple users
   */
  async createBadgeTemplate(
    collectionId: string,
    badgeId: string,
    params: {
      name: string;
      description: string;
      imageUrl: string;
      category: string; // achievement, milestone, special, event
      criteria?: string;
      requirements?: string[];
    }
  ): Promise<any> {
    const attributes: Array<{ trait_type: string; value: string }> = [
      { trait_type: 'Category', value: params.category },
    ];

    if (params.criteria) {
      attributes.push({ trait_type: 'Criteria', value: params.criteria });
    }

    if (params.requirements && params.requirements.length > 0) {
      params.requirements.forEach((req, index) => {
        attributes.push({ trait_type: `Requirement ${index + 1}`, value: req });
      });
    }

    return this.createTemplate(collectionId, badgeId, {
      metadata: {
        name: params.name,
        image: params.imageUrl,
        description: params.description,
        symbol: 'BADGE',
        attributes,
      },
      supply: {
        limit: undefined, // Unlimited mints from this template
      },
      reuploadLinkedFiles: true,
    });
  }

  /**
   * Mint a badge to a user (idempotent)
   * Use this to award badges to fans
   */
  async mintBadge(
    collectionId: string,
    badgeTemplateId: string,
    recipientAddress: string,
    mintId: string // Unique ID for this specific badge award (e.g., userId-badgeId)
  ): Promise<MintNFTResponse> {
    return this.mintFromTemplate(
      collectionId,
      badgeTemplateId,
      recipientAddress,
      mintId
    );
  }

  // ========================================================================
  // IMAGE HANDLING HELPERS
  // ========================================================================

  /**
   * Validate that an image URL is accessible
   * Crossmint will reupload this to IPFS automatically
   */
  static async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Image URL validation failed:', error);
      return false;
    }
  }

  /**
   * Generate metadata JSON for an NFT/Badge
   * Returns a properly formatted metadata object
   */
  static generateMetadata(params: {
    name: string;
    description: string;
    imageUrl: string;
    attributes?: Array<{ trait_type: string; value: string; display_type?: string }>;
  }): MintNFTParams['metadata'] {
    return {
      name: params.name,
      description: params.description,
      image: params.imageUrl,
      attributes: params.attributes || [],
    };
  }

  /**
   * Create a badge from scratch (collection + template + mint)
   * All-in-one helper for creating and awarding a new badge type
   */
  async createAndMintBadge(params: {
    // Collection info (created once per badge collection)
    collectionId: string;
    collectionName: string;
    collectionDescription: string;
    collectionImageUrl: string;
    chain?: string;

    // Badge template info
    badgeTemplateId: string;
    badgeName: string;
    badgeDescription: string;
    badgeImageUrl: string;
    badgeCategory: string;
    badgeCriteria?: string;
    badgeRequirements?: string[];

    // Minting info
    recipientAddress: string;
    mintId: string;
  }): Promise<{
    collection: CreateCollectionResponse;
    template: any;
    mint: MintNFTResponse;
  }> {
    // Step 1: Create collection (idempotent)
    const collection = await this.createBadgeCollection(params.collectionId, {
      name: params.collectionName,
      description: params.collectionDescription,
      imageUrl: params.collectionImageUrl,
      chain: params.chain,
    });

    console.log('✅ Badge collection created:', collection.id);

    // Step 2: Create badge template (idempotent)
    const template = await this.createBadgeTemplate(
      params.collectionId,
      params.badgeTemplateId,
      {
        name: params.badgeName,
        description: params.badgeDescription,
        imageUrl: params.badgeImageUrl,
        category: params.badgeCategory,
        criteria: params.badgeCriteria,
        requirements: params.badgeRequirements,
      }
    );

    console.log('✅ Badge template created:', params.badgeTemplateId);

    // Step 3: Mint badge to recipient (idempotent)
    const mint = await this.mintBadge(
      params.collectionId,
      params.badgeTemplateId,
      params.recipientAddress,
      params.mintId
    );

    console.log('✅ Badge minted to:', params.recipientAddress);

    return { collection, template, mint };
  }
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

let crossmintService: CrossmintService | null = null;

export function initializeCrossmintService(): CrossmintService | null {
  const apiKey = process.env.CROSSMINT_API_KEY;
  const environment = (process.env.CROSSMINT_ENVIRONMENT || 'staging') as 'staging' | 'www';
  const projectId = process.env.CROSSMINT_PROJECT_ID;

  if (!apiKey) {
    console.warn('⚠️  Crossmint not configured. Set CROSSMINT_API_KEY in .env');
    return null;
  }

  crossmintService = new CrossmintService({
    apiKey,
    environment,
    projectId,
  });

  console.log(`✅ Crossmint Service initialized (${environment})`);
  return crossmintService;
}

export function getCrossmintService(): CrossmintService | null {
  if (!crossmintService) {
    return initializeCrossmintService();
  }
  return crossmintService;
}

