/**
 * Fandomly contract addresses and configuration.
 * Network: Avalanche Fuji C-Chain (testnet)
 */

export const FANDOMLY_CHAIN = {
  id: 43113,
  name: 'Avalanche Fuji',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  blockExplorer: 'https://43113.testnet.snowtrace.io',
  testnet: true,
} as const;

export const CONTRACTS = {
  // Core contracts (v2 — audit-fixed)
  ReputationRegistry: '0x9a0f05d971bb5bb908fc45ce51e948712265e518',
  CreatorTokenFactory: '0xd8d942262792dd1d794b52137f93359ef530dcd9',
  FanStaking: '0xfca2572ed381cfc8d7cca205f9da0b4e2b7d6d89',
  // NFT contracts
  FandomlyBadge: '0x4ad8bbb28fba6beaee346e61ac03d18903331356',
  FandomlyNFT: '0x1cfb20643302b88c1291a950f263b5c17d8f7aa6',
  CreatorCollectionFactory: '0xc0e2fc4eac83b421856527992de427a01aeeea7b',
} as const;

export const DEPLOYER_ADDRESS = '0x95A6bEb968633D1440e89F462a133519808f8015' as const;

// ReputationRegistry ABI — subset needed for oracle operations
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'newScore', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    name: 'updateScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'newScores', type: 'uint256[]' },
      { name: 'reason', type: 'string' },
    ],
    name: 'batchUpdateScores',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getScore',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'threshold', type: 'uint256' },
    ],
    name: 'meetsThreshold',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// CreatorTokenFactory ABI — view functions + createToken for server use
export const CREATOR_TOKEN_FACTORY_ABI = [
  {
    inputs: [{ name: 'creatorAddress', type: 'address' }],
    name: 'creatorToToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tenantId', type: 'string' }],
    name: 'getTenantTokens',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tenantId', type: 'string' }],
    name: 'getTenantTokenCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'isCreatorToken',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalTokensCreated',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'creatorAddress', type: 'address' },
      { name: 'tenantId', type: 'string' },
    ],
    name: 'createToken',
    outputs: [{ name: 'tokenAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// FanStaking ABI — user staking operations + view functions
export const FAN_STAKING_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    name: 'getStakeInfo',
    outputs: [
      {
        components: [
          { name: 'amount', type: 'uint256' },
          { name: 'stakedAt', type: 'uint256' },
          { name: 'lastClaimAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'userMultipliers',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'totalStaked',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    name: 'calculateRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_STAKE_DURATION',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BASE_APY_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EARLY_WITHDRAWAL_PENALTY_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRewardPoolBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'multiplier', type: 'uint256' },
    ],
    name: 'setUserMultiplier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// CreatorToken ABI — ERC-20 subset for balance/approval operations
export const CREATOR_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creator',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tenantId',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// FandomlyBadge ABI — ERC-1155 badge operations
export const FANDOMLY_BADGE_ABI = [
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
] as const;

// FandomlyNFT ABI — ERC-721 NFT operations
export const FANDOMLY_NFT_ABI = [
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
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
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
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// CreatorCollectionFactory ABI — per-creator NFT collection factory
export const CREATOR_COLLECTION_FACTORY_ABI = [
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
    inputs: [{ name: 'creator', type: 'address' }],
    name: 'getCreatorCollectionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Reputation thresholds — set to 0 for hackathon demo testing.
// On-chain contracts still enforce 500/750 but the server auto-sets
// on-chain scores before blockchain calls (see blockchain-routes.ts).
export const REPUTATION_THRESHOLDS = {
  FAN_STAKING: 0,
  CREATOR_TOKEN: 0,
} as const;
