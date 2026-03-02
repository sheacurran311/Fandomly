/**
 * Fandomly Chain contract addresses and configuration.
 * Auto-generated from blockchain/deployment.json after deployment.
 */

export const FANDOMLY_CHAIN = {
  id: 31111,
  name: 'Fandomly Chain',
  nativeCurrency: { name: 'FAN', symbol: 'FAN', decimals: 18 },
  rpcUrl:
    (typeof process !== 'undefined' ? process.env.VITE_FANDOMLY_RPC_URL : undefined) ??
    'https://fandomly-avago-node-production.up.railway.app/ext/bc/Xw6RyupcvTsiJdnwc88U2rxt9RkacGbw2wHRJJD4H1sBu2z1H/rpc',
  blockExplorer:
    'https://subnets-test.avax.network/subnets/2G2z7yGeWPKvwtJKbcs5bqEgwBATT5jkJNJHjt5RnhTBficJ93',
  testnet: true,
} as const;

export const CONTRACTS = {
  ReputationRegistry: '0x9a0f05d971bb5bb908fc45ce51e948712265e518',
  CreatorTokenFactory: '0xd8d942262792dd1d794b52137f93359ef530dcd9',
  FanStaking: '0xfca2572ed381cfc8d7cca205f9da0b4e2b7d6d89',
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
] as const;

// Critical reputation thresholds used by on-chain contracts
export const REPUTATION_THRESHOLDS = {
  FAN_STAKING: 500, // FanStaking contract requires 500+ to stake
  CREATOR_TOKEN: 750, // CreatorTokenFactory requires 750+ to create tokens
} as const;
