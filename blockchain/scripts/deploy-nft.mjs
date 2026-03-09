/**
 * Deploy Fandomly NFT contracts to Fandomly Chain L1 (Fuji)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-nft.mjs
 *
 * Prerequisites:
 *   - Existing deployment.json with ReputationRegistry address
 *   - Compiled NFT contract artifacts in ../artifacts/
 *
 * Deployment order:
 *   1. FandomlyBadge (ERC-1155 badges, no deps)
 *   2. FandomlyNFT (ERC-721 platform NFTs, no deps)
 *   3. CreatorCollectionFactory (depends on existing ReputationRegistry)
 *
 * Note: CreatorCollection is NOT deployed directly — it's a template
 * that CreatorCollectionFactory deploys via `new` for each creator.
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
    console.error('  Example: DEPLOYER_PRIVATE_KEY=0xabc123... node scripts/deploy-nft.mjs');
    process.exit(1);
  }

  // Load existing deployment to get ReputationRegistry address
  const deploymentPath = resolve(__dirname, '../deployment.json');
  let existingDeployment;
  try {
    existingDeployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  } catch {
    console.error('ERROR: deployment.json not found. Deploy base contracts first.');
    process.exit(1);
  }

  const reputationAddress = existingDeployment.contracts.ReputationRegistry;
  if (!reputationAddress) {
    console.error('ERROR: ReputationRegistry address not found in deployment.json');
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
  console.log('  Fandomly NFT Contract Deployment');
  console.log('========================================');
  console.log(`  Chain:              Fandomly Chain (ID: 89197)`);
  console.log(`  Deployer:           ${account.address}`);
  console.log(`  ReputationRegistry: ${reputationAddress} (existing)`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:            ${(Number(balance) / 1e18).toFixed(4)} FAN`);

  if (balance === 0n) {
    console.error('\n  ERROR: Deployer has no FAN. Fund the address first.');
    process.exit(1);
  }

  // 1. Deploy FandomlyBadge (ERC-1155, no constructor args)
  console.log('\n--- Step 1/3: FandomlyBadge (ERC-1155) ---');
  const badgeAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_nft_FandomlyBadge_sol_FandomlyBadge'
  );

  // 2. Deploy FandomlyNFT (ERC-721, no constructor args)
  console.log('\n--- Step 2/3: FandomlyNFT (ERC-721) ---');
  const nftAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_nft_FandomlyNFT_sol_FandomlyNFT'
  );

  // 3. Deploy CreatorCollectionFactory (needs ReputationRegistry address)
  console.log('\n--- Step 3/3: CreatorCollectionFactory ---');
  const collectionFactoryAddress = await deployContract(
    walletClient,
    publicClient,
    'contracts_nft_CreatorCollectionFactory_sol_CreatorCollectionFactory',
    [reputationAddress]
  );

  // Summary
  console.log('\n========================================');
  console.log('  NFT DEPLOYMENT COMPLETE');
  console.log('========================================');
  console.log(`  FandomlyBadge:            ${badgeAddress}`);
  console.log(`  FandomlyNFT:              ${nftAddress}`);
  console.log(`  CreatorCollectionFactory:  ${collectionFactoryAddress}`);
  console.log(`  Chain ID:                 89197`);
  console.log(`  Deployer (owner):         ${account.address}`);
  console.log('========================================');

  // Update deployment.json with NFT contract addresses
  existingDeployment.contracts.FandomlyBadge = badgeAddress;
  existingDeployment.contracts.FandomlyNFT = nftAddress;
  existingDeployment.contracts.CreatorCollectionFactory = collectionFactoryAddress;
  existingDeployment.deployedAt = new Date().toISOString();

  writeFileSync(deploymentPath, JSON.stringify(existingDeployment, null, 2));
  console.log(`\n  Deployment info updated in: ${deploymentPath}`);
  console.log('  (Existing contract addresses preserved)');
}

main().catch((err) => {
  console.error('\n  DEPLOYMENT FAILED:', err.message);
  process.exit(1);
});
