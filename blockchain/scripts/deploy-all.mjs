/**
 * Deploy ALL Fandomly contracts to Fandomly Chain L1 (Fuji)
 *
 * Deploys both core contracts (redeploy with security fixes) and
 * new NFT contracts in the correct dependency order.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-all.mjs
 *
 * Deployment order:
 *   1. ReputationRegistry (no deps)
 *   2. CreatorTokenFactory (depends on ReputationRegistry)
 *   3. FanStaking (depends on ReputationRegistry + CreatorTokenFactory)
 *   4. FandomlyBadge (no deps)
 *   5. FandomlyNFT (no deps)
 *   6. CreatorCollectionFactory (depends on ReputationRegistry)
 */

import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = resolve(__dirname, '../artifacts');

const fandomlyChain = defineChain({
  id: 89197,
  name: 'Fandomly Chain',
  nativeCurrency: { name: 'FAN', symbol: 'FAN', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc'],
    },
  },
  testnet: true,
});

function loadArtifact(contractName) {
  const abiPath = resolve(ARTIFACTS_DIR, `${contractName}.abi`);
  const binPath = resolve(ARTIFACTS_DIR, `${contractName}.bin`);
  const abi = JSON.parse(readFileSync(abiPath, 'utf8'));
  const bytecode = '0x' + readFileSync(binPath, 'utf8').trim();
  return { abi, bytecode };
}

async function deployContract(walletClient, publicClient, contractName, constructorArgs = []) {
  const { abi, bytecode } = loadArtifact(contractName);
  console.log(`\n  Deploying ${contractName.split('_sol_')[1] || contractName}...`);

  const hash = await walletClient.deployContract({ abi, bytecode, args: constructorArgs });
  console.log(`  TX hash: ${hash}`);
  console.log(`  Waiting for confirmation...`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`Deployment failed: ${JSON.stringify(receipt)}`);
  }

  console.log(`  Deployed to: ${receipt.contractAddress}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  return receipt.contractAddress;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: Set DEPLOYER_PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  const publicClient = createPublicClient({ chain: fandomlyChain, transport: http() });
  const walletClient = createWalletClient({ account, chain: fandomlyChain, transport: http() });

  console.log('==============================================');
  console.log('  Fandomly Chain — Full Contract Deployment');
  console.log('  (Core v2 with security fixes + NFT suite)');
  console.log('==============================================');
  console.log(`  Chain:    Fandomly Chain (ID: 89197)`);
  console.log(`  Deployer: ${account.address}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:  ${(Number(balance) / 1e18).toFixed(4)} FAN\n`);

  if (balance === 0n) {
    console.error('  ERROR: Deployer has no FAN.');
    process.exit(1);
  }

  // ─── Core Contracts (redeploy with audit fixes) ───────────────────

  console.log('━━━ CORE CONTRACTS (v2 — audit fixes) ━━━');

  console.log('\n--- 1/6: ReputationRegistry ---');
  const reputationAddress = await deployContract(
    walletClient, publicClient,
    'contracts_ReputationRegistry_sol_ReputationRegistry'
  );

  console.log('\n--- 2/6: CreatorTokenFactory ---');
  const factoryAddress = await deployContract(
    walletClient, publicClient,
    'contracts_CreatorTokenFactory_sol_CreatorTokenFactory',
    [reputationAddress]
  );

  console.log('\n--- 3/6: FanStaking ---');
  const stakingAddress = await deployContract(
    walletClient, publicClient,
    'contracts_FanStaking_sol_FanStaking',
    [reputationAddress, factoryAddress]
  );

  // ─── NFT Contracts ────────────────────────────────────────────────

  console.log('\n━━━ NFT CONTRACTS ━━━');

  console.log('\n--- 4/6: FandomlyBadge (ERC-1155) ---');
  const badgeAddress = await deployContract(
    walletClient, publicClient,
    'contracts_nft_FandomlyBadge_sol_FandomlyBadge'
  );

  console.log('\n--- 5/6: FandomlyNFT (ERC-721) ---');
  const nftAddress = await deployContract(
    walletClient, publicClient,
    'contracts_nft_FandomlyNFT_sol_FandomlyNFT'
  );

  console.log('\n--- 6/6: CreatorCollectionFactory ---');
  const collectionFactoryAddress = await deployContract(
    walletClient, publicClient,
    'contracts_nft_CreatorCollectionFactory_sol_CreatorCollectionFactory',
    [reputationAddress]
  );

  // ─── Summary ──────────────────────────────────────────────────────

  console.log('\n==============================================');
  console.log('  ALL DEPLOYMENTS COMPLETE');
  console.log('==============================================');
  console.log('  Core Contracts (v2):');
  console.log(`    ReputationRegistry:       ${reputationAddress}`);
  console.log(`    CreatorTokenFactory:       ${factoryAddress}`);
  console.log(`    FanStaking:                ${stakingAddress}`);
  console.log('  NFT Contracts:');
  console.log(`    FandomlyBadge:             ${badgeAddress}`);
  console.log(`    FandomlyNFT:               ${nftAddress}`);
  console.log(`    CreatorCollectionFactory:   ${collectionFactoryAddress}`);
  console.log(`  Chain ID:                    89197`);
  console.log(`  Deployer (owner):            ${account.address}`);
  console.log('==============================================');

  // Save deployment
  const deployment = {
    network: 'fandomly-chain-fuji',
    chainId: 89197,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      ReputationRegistry: reputationAddress,
      CreatorTokenFactory: factoryAddress,
      FanStaking: stakingAddress,
      FandomlyBadge: badgeAddress,
      FandomlyNFT: nftAddress,
      CreatorCollectionFactory: collectionFactoryAddress,
    },
    rpcUrl: 'https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc',
  };

  const deploymentPath = resolve(__dirname, '../deployment.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Deployment saved to: ${deploymentPath}`);

  // Generate blockchain-config.ts
  const configContent = `/**
 * Fandomly Chain contract addresses and configuration.
 * Auto-generated by deploy-all.mjs on ${new Date().toISOString()}
 */

export const FANDOMLY_CHAIN = {
  id: 89197,
  name: 'Fandomly Chain',
  nativeCurrency: { name: 'FAN', symbol: 'FAN', decimals: 18 },
  rpcUrl:
    (typeof process !== 'undefined' ? process.env.VITE_FANDOMLY_RPC_URL : undefined) ??
    'https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc',
  blockExplorer:
    'https://subnets-test.avax.network/subnets/2vPvpLkRNwNVhyRLH4JuDSsdYnjFzc68MFVXGAPqTNZ148SfFL',
  testnet: true,
} as const;

export const CONTRACTS = {
  // Core contracts (v2 — audit-fixed)
  ReputationRegistry: '${reputationAddress}',
  CreatorTokenFactory: '${factoryAddress}',
  FanStaking: '${stakingAddress}',
  // NFT contracts
  FandomlyBadge: '${badgeAddress}',
  FandomlyNFT: '${nftAddress}',
  CreatorCollectionFactory: '${collectionFactoryAddress}',
} as const;

export const DEPLOYER_ADDRESS = '${account.address}' as const;
`;

  const configPath = resolve(__dirname, '../../shared/blockchain-config.ts');
  writeFileSync(configPath, configContent);
  console.log(`  Config saved to: shared/blockchain-config.ts`);
}

main().catch((err) => {
  console.error('\n  DEPLOYMENT FAILED:', err.message);
  process.exit(1);
});
