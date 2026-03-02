/**
 * Blockchain NFT Service — Direct on-chain interaction with Fandomly NFT contracts.
 *
 * Replaces Crossmint for all minting/badge operations on Fandomly Chain L1.
 * Uses viem to call FandomlyNFT, FandomlyBadge, and CreatorCollectionFactory
 * via the deployer wallet (backend-managed, gas-free for users).
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Address,
  type Hash,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FANDOMLY_CHAIN, CONTRACTS, DEPLOYER_ADDRESS } from '@shared/blockchain-config';

// ────────────────────────────────────────────────────────────────────────────
// Chain Definition
// ────────────────────────────────────────────────────────────────────────────

const fandomlyChain = defineChain({
  id: FANDOMLY_CHAIN.id,
  name: FANDOMLY_CHAIN.name,
  nativeCurrency: FANDOMLY_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [FANDOMLY_CHAIN.rpcUrl] },
  },
  testnet: FANDOMLY_CHAIN.testnet,
});

// ────────────────────────────────────────────────────────────────────────────
// Minimal ABIs (only the functions we actually call)
// ────────────────────────────────────────────────────────────────────────────

const FandomlyNFT_ABI = [
  {
    inputs: [
      { name: 'collectionName', type: 'string' },
      { name: 'maxSupply', type: 'uint256' },
      { name: 'pointsCost', type: 'uint256' },
    ],
    name: 'createCollection',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'collectionId', type: 'uint256' },
      { name: 'tokenUri', type: 'string' },
    ],
    name: 'mint',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'collectionId', type: 'uint256' }],
    name: 'getCollection',
    outputs: [
      {
        components: [
          { name: 'name', type: 'string' },
          { name: 'maxSupply', type: 'uint256' },
          { name: 'minted', type: 'uint256' },
          { name: 'pointsCost', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'tokensOfOwner',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalMinted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextCollectionId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newUri', type: 'string' },
    ],
    name: 'updateTokenURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'feeNumerator', type: 'uint96' },
    ],
    name: 'setDefaultRoyalty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const FandomlyBadge_ABI = [
  {
    inputs: [
      { name: 'badgeUri', type: 'string' },
      { name: 'soulbound', type: 'bool' },
      { name: 'maxSupply', type: 'uint256' },
    ],
    name: 'createPlatformBadgeType',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'badgeUri', type: 'string' },
      { name: 'creator', type: 'address' },
      { name: 'soulbound', type: 'bool' },
      { name: 'maxSupply', type: 'uint256' },
    ],
    name: 'createCreatorBadgeType',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'badgeTypeId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'badgeTypeId', type: 'uint256' },
      { name: 'amountEach', type: 'uint256' },
    ],
    name: 'batchMintToMany',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'badgeTypeId', type: 'uint256' }],
    name: 'getBadgeType',
    outputs: [
      {
        components: [
          { name: 'uri', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'soulbound', type: 'bool' },
          { name: 'maxSupply', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'badgeTypeId', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextBadgeTypeId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'creator', type: 'address' }],
    name: 'getCreatorBadgeTypes',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CreatorCollectionFactory_ABI = [
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'creatorAddress', type: 'address' },
      { name: 'tenantId', type: 'string' },
      { name: 'maxSupply', type: 'uint256' },
      { name: 'royaltyBps', type: 'uint96' },
    ],
    name: 'createCollection',
    outputs: [{ name: 'collectionAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'creator', type: 'address' }],
    name: 'getCreatorCollections',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalCollectionsCreated',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface MintResult {
  txHash: Hash;
  tokenId?: string;
  receipt: TransactionReceipt;
}

export interface BadgeMintResult {
  txHash: Hash;
  receipt: TransactionReceipt;
}

export interface CollectionInfo {
  name: string;
  maxSupply: bigint;
  minted: bigint;
  pointsCost: bigint;
  active: boolean;
}

export interface BadgeTypeInfo {
  uri: string;
  creator: Address;
  soulbound: boolean;
  maxSupply: bigint;
  active: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export class BlockchainNFTService {
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private nftAddress: Address;
  private badgeAddress: Address;
  private factoryAddress: Address;

  constructor(privateKey: `0x${string}`) {
    const account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: fandomlyChain,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account,
      chain: fandomlyChain,
      transport: http(),
    });

    this.nftAddress = CONTRACTS.FandomlyNFT as Address;
    this.badgeAddress = CONTRACTS.FandomlyBadge as Address;
    this.factoryAddress = CONTRACTS.CreatorCollectionFactory as Address;
  }

  // ── FandomlyNFT (ERC-721) ─────────────────────────────────────────────

  async createNFTCollection(
    name: string,
    maxSupply: number,
    pointsCost: number
  ): Promise<{ txHash: Hash; receipt: TransactionReceipt }> {
    const hash = await this.walletClient.writeContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'createCollection',
      args: [name, BigInt(maxSupply), BigInt(pointsCost)],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, receipt };
  }

  async mintNFT(
    recipientAddress: Address,
    collectionId: number,
    tokenUri: string
  ): Promise<MintResult> {
    const hash = await this.walletClient.writeContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'mint',
      args: [recipientAddress, BigInt(collectionId), tokenUri],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Extract tokenId from NFTMinted event logs
    let tokenId: string | undefined;
    for (const log of receipt.logs) {
      // NFTMinted event topic
      if (log.topics[0] === '0x' && log.topics.length >= 3) {
        tokenId = BigInt(log.topics[1]!).toString();
        break;
      }
    }

    return { txHash: hash, tokenId, receipt };
  }

  async getNFTCollection(collectionId: number): Promise<CollectionInfo> {
    const result = await this.publicClient.readContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'getCollection',
      args: [BigInt(collectionId)],
    });

    return {
      name: result.name,
      maxSupply: result.maxSupply,
      minted: result.minted,
      pointsCost: result.pointsCost,
      active: result.active,
    };
  }

  async getTokensOfOwner(ownerAddress: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'tokensOfOwner',
      args: [ownerAddress],
    });
  }

  async getTokenURI(tokenId: number): Promise<string> {
    return this.publicClient.readContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });
  }

  async getTotalMinted(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'totalMinted',
    });
  }

  async getNextCollectionId(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.nftAddress,
      abi: FandomlyNFT_ABI,
      functionName: 'nextCollectionId',
    });
  }

  // ── FandomlyBadge (ERC-1155) ──────────────────────────────────────────

  async createPlatformBadgeType(
    metadataUri: string,
    soulbound: boolean,
    maxSupply: number
  ): Promise<{ txHash: Hash; receipt: TransactionReceipt }> {
    const hash = await this.walletClient.writeContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'createPlatformBadgeType',
      args: [metadataUri, soulbound, BigInt(maxSupply)],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, receipt };
  }

  async createCreatorBadgeType(
    metadataUri: string,
    creatorAddress: Address,
    soulbound: boolean,
    maxSupply: number
  ): Promise<{ txHash: Hash; receipt: TransactionReceipt }> {
    const hash = await this.walletClient.writeContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'createCreatorBadgeType',
      args: [metadataUri, creatorAddress, soulbound, BigInt(maxSupply)],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, receipt };
  }

  async mintBadge(
    recipientAddress: Address,
    badgeTypeId: number,
    amount: number = 1
  ): Promise<BadgeMintResult> {
    const hash = await this.walletClient.writeContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'mint',
      args: [recipientAddress, BigInt(badgeTypeId), BigInt(amount)],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, receipt };
  }

  async batchMintBadge(
    recipients: Address[],
    badgeTypeId: number,
    amountEach: number = 1
  ): Promise<BadgeMintResult> {
    const hash = await this.walletClient.writeContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'batchMintToMany',
      args: [recipients, BigInt(badgeTypeId), BigInt(amountEach)],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, receipt };
  }

  async getBadgeType(badgeTypeId: number): Promise<BadgeTypeInfo> {
    const result = await this.publicClient.readContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'getBadgeType',
      args: [BigInt(badgeTypeId)],
    });

    return {
      uri: result.uri,
      creator: result.creator,
      soulbound: result.soulbound,
      maxSupply: result.maxSupply,
      active: result.active,
    };
  }

  async getBadgeBalance(ownerAddress: Address, badgeTypeId: number): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress, BigInt(badgeTypeId)],
    });
  }

  async getBadgeTotalSupply(badgeTypeId: number): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'totalSupply',
      args: [BigInt(badgeTypeId)],
    });
  }

  async getNextBadgeTypeId(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'nextBadgeTypeId',
    });
  }

  async getCreatorBadgeTypes(creatorAddress: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.badgeAddress,
      abi: FandomlyBadge_ABI,
      functionName: 'getCreatorBadgeTypes',
      args: [creatorAddress],
    });
  }

  // ── CreatorCollectionFactory ──────────────────────────────────────────

  async createCreatorCollection(
    name: string,
    symbol: string,
    creatorAddress: Address,
    tenantId: string,
    maxSupply: number,
    royaltyBps: number
  ): Promise<{ txHash: Hash; collectionAddress?: Address; receipt: TransactionReceipt }> {
    const hash = await this.walletClient.writeContract({
      address: this.factoryAddress,
      abi: CreatorCollectionFactory_ABI,
      functionName: 'createCollection',
      args: [name, symbol, creatorAddress, tenantId, BigInt(maxSupply), royaltyBps],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Extract collection address from CollectionCreated event
    let collectionAddress: Address | undefined;
    for (const log of receipt.logs) {
      if (log.topics.length >= 2) {
        // The first indexed param is the collection address
        const addr = log.topics[1];
        if (addr) {
          collectionAddress = ('0x' + addr.slice(26)) as Address;
          break;
        }
      }
    }

    return { txHash: hash, collectionAddress, receipt };
  }

  async getCreatorCollections(creatorAddress: Address): Promise<Address[]> {
    const result = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: CreatorCollectionFactory_ABI,
      functionName: 'getCreatorCollections',
      args: [creatorAddress],
    });
    return result as Address[];
  }

  async getTotalCollectionsCreated(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.factoryAddress,
      abi: CreatorCollectionFactory_ABI,
      functionName: 'totalCollectionsCreated',
    });
  }

  // ── Utility ───────────────────────────────────────────────────────────

  get deployerAddress(): Address {
    return DEPLOYER_ADDRESS as Address;
  }

  get contractAddresses() {
    return {
      FandomlyNFT: this.nftAddress,
      FandomlyBadge: this.badgeAddress,
      CreatorCollectionFactory: this.factoryAddress,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────────

let blockchainNFTService: BlockchainNFTService | null = null;

export function initializeBlockchainNFTService(): BlockchainNFTService | null {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.warn('Blockchain NFT Service not configured. Set DEPLOYER_PRIVATE_KEY in env.');
    return null;
  }

  const key = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
  blockchainNFTService = new BlockchainNFTService(key);
  console.log('Blockchain NFT Service initialized (Fandomly Chain L1)');
  return blockchainNFTService;
}

export function getBlockchainNFTService(): BlockchainNFTService | null {
  if (!blockchainNFTService) {
    return initializeBlockchainNFTService();
  }
  return blockchainNFTService;
}
