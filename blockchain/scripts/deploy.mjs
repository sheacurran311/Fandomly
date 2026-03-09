/**
 * Deploy Fandomly smart contracts to Fandomly Chain L1 (Fuji)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.mjs
 *
 * Requires: viem (available in ../node_modules/viem)
 *
 * Deployment order (dependencies):
 *   1. ReputationRegistry (no deps)
 *   2. CreatorTokenFactory (depends on ReputationRegistry address)
 *   3. FanStaking (depends on ReputationRegistry + CreatorTokenFactory addresses)
 */

import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = resolve(__dirname, '../artifacts');

// --- Fandomly Chain L1 Definition ---
const fandomlyChain = defineChain({
  id: 89197,
  name: 'Fandomly Chain',
  nativeCurrency: {
    name: 'FAN',
    symbol: 'FAN',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Avalanche Explorer',
      url: 'https://subnets-test.avax.network/subnets/2vPvpLkRNwNVhyRLH4JuDSsdYnjFzc68MFVXGAPqTNZ148SfFL',
    },
  },
  testnet: true,
});

// --- Helpers ---

function loadArtifact(contractName) {
  const abiPath = resolve(ARTIFACTS_DIR, `${contractName}.abi`);
  const binPath = resolve(ARTIFACTS_DIR, `${contractName}.bin`);

  const abi = JSON.parse(readFileSync(abiPath, 'utf8'));
  const bytecode = '0x' + readFileSync(binPath, 'utf8').trim();

  return { abi, bytecode };
}

async function deployContract(walletClient, publicClient, contractName, constructorArgs = []) {
  const { abi, bytecode } = loadArtifact(contractName);

  console.log(`\n  Deploying ${contractName}...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: constructorArgs,
  });

  console.log(`  TX hash: ${hash}`);
  console.log(`  Waiting for confirmation...`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error(`Deployment failed for ${contractName}: ${JSON.stringify(receipt)}`);
  }

  console.log(`  Deployed to: ${receipt.contractAddress}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

  return receipt.contractAddress;
}

// --- Main ---

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: Set DEPLOYER_PRIVATE_KEY environment variable');
    console.error('  Example: DEPLOYER_PRIVATE_KEY=0xabc123... node scripts/deploy.mjs');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);

  const publicClient = createPublicClient({
    chain: fandomlyChain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: fandomlyChain,
    transport: http(),
  });

  console.log('========================================');
  console.log('  Fandomly Chain Contract Deployment');
  console.log('========================================');
  console.log(`  Chain:    Fandomly Chain (ID: 89197)`);
  console.log(`  Deployer: ${account.address}`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:  ${(Number(balance) / 1e18).toFixed(4)} FAN`);

  if (balance === 0n) {
    console.error('\n  ERROR: Deployer has no FAN. Fund the address first.');
    process.exit(1);
  }

  // 1. Deploy ReputationRegistry
  console.log('\n--- Step 1/3: ReputationRegistry ---');
  const reputationAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_ReputationRegistry_sol_ReputationRegistry'
  );

  // 2. Deploy CreatorTokenFactory (needs ReputationRegistry address)
  console.log('\n--- Step 2/3: CreatorTokenFactory ---');
  const factoryAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_CreatorTokenFactory_sol_CreatorTokenFactory',
    [reputationAddress]
  );

  // 3. Deploy FanStaking (needs ReputationRegistry + Factory addresses)
  console.log('\n--- Step 3/3: FanStaking ---');
  const stakingAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_FanStaking_sol_FanStaking',
    [reputationAddress, factoryAddress]
  );

  // Summary
  console.log('\n========================================');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('========================================');
  console.log(`  ReputationRegistry:   ${reputationAddress}`);
  console.log(`  CreatorTokenFactory:  ${factoryAddress}`);
  console.log(`  FanStaking:           ${stakingAddress}`);
  console.log(`  Chain ID:             89197`);
  console.log(`  Deployer (owner):     ${account.address}`);
  console.log('========================================');

  // Save deployment addresses to file
  const deployment = {
    network: 'fandomly-chain-fuji',
    chainId: 89197,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      ReputationRegistry: reputationAddress,
      CreatorTokenFactory: factoryAddress,
      FanStaking: stakingAddress,
    },
    rpcUrl: 'https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc',
  };

  const deploymentPath = resolve(__dirname, '../deployment.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Deployment info saved to: ${deploymentPath}`);
}

main().catch((err) => {
  console.error('\n  DEPLOYMENT FAILED:', err.message);
  process.exit(1);
});
