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
