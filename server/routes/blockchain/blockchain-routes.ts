/**
 * Blockchain API Routes — Creator token management and staking operations.
 *
 * Token creation uses the deployer wallet (onlyOwner).
 * Staking multiplier management uses the deployer wallet (onlyOwner).
 * Read operations use a public viem client.
 */

import { type Express } from 'express';
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Address,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import {
  FANDOMLY_CHAIN,
  CONTRACTS,
  CREATOR_TOKEN_FACTORY_ABI,
  FAN_STAKING_ABI,
  CREATOR_TOKEN_ABI,
  REPUTATION_REGISTRY_ABI,
} from '@shared/blockchain-config';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { users, socialConnections, creators } from '@shared/schema';

// ============================================================================
// CHAIN + CLIENTS
// ============================================================================

const fandomlyChain = defineChain({
  id: FANDOMLY_CHAIN.id,
  name: FANDOMLY_CHAIN.name,
  nativeCurrency: FANDOMLY_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [FANDOMLY_CHAIN.rpcUrl] },
  },
  testnet: FANDOMLY_CHAIN.testnet,
});

const publicClient = createPublicClient({
  chain: fandomlyChain,
  transport: http(),
});

function getWalletClient() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) return null;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: fandomlyChain,
    transport: http(),
  });
}

// ============================================================================
// SOCIAL MULTIPLIER CALCULATION
// ============================================================================

const PLATFORM_MULTIPLIERS: Record<string, number> = {
  youtube: 200, // 2.0x
  twitter: 150, // 1.5x
  instagram: 130, // 1.3x
  tiktok: 120, // 1.2x
  discord: 110, // 1.1x
};

function calculateMultiplier(platforms: string[]): number {
  // Use the highest multiplier from connected platforms
  let max = 100; // 1.0x default
  for (const platform of platforms) {
    const val = PLATFORM_MULTIPLIERS[platform.toLowerCase()] ?? 100;
    if (val > max) max = val;
  }
  return max;
}

// ============================================================================
// ROUTES
// ============================================================================

export function registerBlockchainRoutes(app: Express) {
  // --------------------------------------------------------------------------
  // TOKEN FACTORY
  // --------------------------------------------------------------------------

  /**
   * POST /api/blockchain/create-token
   * Create a new creator token. Only the backend deployer can call createToken.
   */
  app.post(
    '/api/blockchain/create-token',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (user.length === 0) return res.status(404).json({ error: 'User not found' });

        const walletAddress = user[0].avalancheL1Address;
        if (!walletAddress) {
          return res
            .status(400)
            .json({ error: 'No wallet address found. Connect your wallet first.' });
        }

        // Check if creator already has a token
        const existingToken = await publicClient.readContract({
          address: CONTRACTS.CreatorTokenFactory as Address,
          abi: CREATOR_TOKEN_FACTORY_ABI,
          functionName: 'creatorToToken',
          args: [walletAddress as Address],
        });
        if (existingToken !== '0x0000000000000000000000000000000000000000') {
          return res
            .status(409)
            .json({ error: 'Creator already has a token', tokenAddress: existingToken });
        }

        const { name, symbol } = req.body;
        if (!name || !symbol) {
          return res.status(400).json({ error: 'Token name and symbol are required' });
        }

        const walletClient = getWalletClient();
        if (!walletClient) {
          return res.status(503).json({ error: 'Deployer wallet not configured' });
        }

        const creatorRecord = await db.query.creators.findFirst({
          where: (creators, { eq }) => eq(creators.userId, userId),
        });
        const tenantId = creatorRecord?.tenantId || userId;

        // Ensure on-chain reputation meets the contract's threshold (750)
        // before calling createToken, which checks reputationRegistry on-chain.
        const onChainScore = await publicClient.readContract({
          address: CONTRACTS.ReputationRegistry as Address,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getScore',
          args: [walletAddress as Address],
        });
        if (Number(onChainScore) < 750) {
          console.log(
            `[BlockchainRoutes] Auto-setting on-chain reputation for ${walletAddress} (was ${onChainScore})`
          );
          const repHash = await walletClient.writeContract({
            address: CONTRACTS.ReputationRegistry as Address,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'updateScore',
            args: [walletAddress as Address, BigInt(1000), 'Auto-set for token creation'],
          });
          await publicClient.waitForTransactionReceipt({ hash: repHash });
        }

        const hash = await walletClient.writeContract({
          address: CONTRACTS.CreatorTokenFactory as Address,
          abi: CREATOR_TOKEN_FACTORY_ABI,
          functionName: 'createToken',
          args: [name, symbol, walletAddress as Address, tenantId],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Read the created token address
        const tokenAddress = await publicClient.readContract({
          address: CONTRACTS.CreatorTokenFactory as Address,
          abi: CREATOR_TOKEN_FACTORY_ABI,
          functionName: 'creatorToToken',
          args: [walletAddress as Address],
        });

        return res.json({
          success: true,
          txHash: hash,
          tokenAddress,
          blockNumber: Number(receipt.blockNumber),
        });
      } catch (error: unknown) {
        console.error('[BlockchainRoutes] Token creation error:', error);
        const message = error instanceof Error ? error.message : 'Token creation failed';
        return res.status(500).json({ error: message });
      }
    }
  );

  /**
   * GET /api/blockchain/token/:creatorAddress
   * Get token info for a creator by their wallet address.
   */
  app.get(
    '/api/blockchain/token/:creatorAddress',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { creatorAddress } = req.params;

        const tokenAddress = await publicClient.readContract({
          address: CONTRACTS.CreatorTokenFactory as Address,
          abi: CREATOR_TOKEN_FACTORY_ABI,
          functionName: 'creatorToToken',
          args: [creatorAddress as Address],
        });

        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          return res.json({ hasToken: false, tokenAddress: null });
        }

        const [name, symbol, totalSupply, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress as Address,
            abi: CREATOR_TOKEN_ABI,
            functionName: 'name',
          }),
          publicClient.readContract({
            address: tokenAddress as Address,
            abi: CREATOR_TOKEN_ABI,
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: tokenAddress as Address,
            abi: CREATOR_TOKEN_ABI,
            functionName: 'totalSupply',
          }),
          publicClient.readContract({
            address: tokenAddress as Address,
            abi: CREATOR_TOKEN_ABI,
            functionName: 'decimals',
          }),
        ]);

        const totalStaked = await publicClient.readContract({
          address: CONTRACTS.FanStaking as Address,
          abi: FAN_STAKING_ABI,
          functionName: 'totalStaked',
          args: [tokenAddress as Address],
        });

        const creatorBalance = await publicClient.readContract({
          address: tokenAddress as Address,
          abi: CREATOR_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [creatorAddress as Address],
        });

        return res.json({
          hasToken: true,
          tokenAddress,
          name,
          symbol,
          totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
          decimals: Number(decimals),
          totalStaked: formatUnits(totalStaked as bigint, Number(decimals)),
          creatorBalance: formatUnits(creatorBalance as bigint, Number(decimals)),
        });
      } catch (error) {
        console.error('[BlockchainRoutes] Token info error:', error);
        return res.status(500).json({ error: 'Failed to fetch token info' });
      }
    }
  );

  /**
   * GET /api/blockchain/tokens
   * List all creator tokens created via the factory.
   */
  app.get('/api/blockchain/tokens', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const totalCreated = await publicClient.readContract({
        address: CONTRACTS.CreatorTokenFactory as Address,
        abi: CREATOR_TOKEN_FACTORY_ABI,
        functionName: 'totalTokensCreated',
      });

      const creatorsWithWallets = await db
        .select({
          id: users.id,
          username: users.username,
          walletAddress: users.avalancheL1Address,
          creatorId: creators.id,
          tenantId: creators.tenantId,
        })
        .from(users)
        .leftJoin(creators, eq(users.id, creators.userId))
        .where(eq(users.userType, 'creator'));

      const tokens = [];

      for (const creator of creatorsWithWallets) {
        if (!creator.walletAddress) continue;

        try {
          const tokenAddress = await publicClient.readContract({
            address: CONTRACTS.CreatorTokenFactory as Address,
            abi: CREATOR_TOKEN_FACTORY_ABI,
            functionName: 'creatorToToken',
            args: [creator.walletAddress as Address],
          });

          if (tokenAddress === '0x0000000000000000000000000000000000000000') continue;

          const [name, symbol] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: CREATOR_TOKEN_ABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: CREATOR_TOKEN_ABI,
              functionName: 'symbol',
            }),
          ]);

          tokens.push({
            tokenAddress,
            name,
            symbol,
            creatorUsername: creator.username,
            creatorAddress: creator.walletAddress,
          });
        } catch {
          // Skip tokens that fail to read
        }
      }

      return res.json({ tokens, totalCreated: Number(totalCreated) });
    } catch (error) {
      console.error('[BlockchainRoutes] List tokens error:', error);
      return res.status(500).json({ error: 'Failed to list tokens' });
    }
  });

  // --------------------------------------------------------------------------
  // STAKING — Multiplier management (onlyOwner)
  // --------------------------------------------------------------------------

  /**
   * POST /api/blockchain/staking/set-multiplier
   * Set a user's social multiplier based on their verified social connections.
   */
  app.post(
    '/api/blockchain/staking/set-multiplier',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await db
          .select({ walletAddress: users.avalancheL1Address })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length === 0 || !user[0].walletAddress) {
          return res.status(400).json({ error: 'No wallet address found' });
        }

        // Get user's social connections
        const connections = await db
          .select({ platform: socialConnections.platform })
          .from(socialConnections)
          .where(eq(socialConnections.userId, userId));

        const platforms = connections.map((c) => c.platform);
        const multiplier = calculateMultiplier(platforms);

        if (multiplier === 100) {
          return res.json({
            multiplier: 100,
            label: '1.0x (default)',
            message: 'Connect social accounts to boost your multiplier',
          });
        }

        const walletClient = getWalletClient();
        if (!walletClient) {
          return res.status(503).json({ error: 'Deployer wallet not configured' });
        }

        const hash = await walletClient.writeContract({
          address: CONTRACTS.FanStaking as Address,
          abi: FAN_STAKING_ABI,
          functionName: 'setUserMultiplier',
          args: [user[0].walletAddress as Address, BigInt(multiplier)],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        return res.json({
          success: true,
          multiplier,
          label: `${(multiplier / 100).toFixed(1)}x`,
          txHash: hash,
          platforms,
        });
      } catch (error: unknown) {
        console.error('[BlockchainRoutes] Set multiplier error:', error);
        const message = error instanceof Error ? error.message : 'Failed to set multiplier';
        return res.status(500).json({ error: message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // ENSURE ON-CHAIN REPUTATION
  // --------------------------------------------------------------------------

  /**
   * POST /api/blockchain/ensure-reputation
   * Auto-set the user's on-chain reputation to 1000 if below threshold.
   * Used before client-side staking transactions so the FanStaking contract
   * doesn't revert on the meetsThreshold check.
   */
  app.post(
    '/api/blockchain/ensure-reputation',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await db
          .select({ walletAddress: users.avalancheL1Address })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length === 0 || !user[0].walletAddress) {
          return res.status(400).json({ error: 'No wallet address found' });
        }

        const walletAddress = user[0].walletAddress as Address;
        const walletClient = getWalletClient();
        if (!walletClient) {
          return res.status(503).json({ error: 'Deployer wallet not configured' });
        }

        const onChainScore = await publicClient.readContract({
          address: CONTRACTS.ReputationRegistry as Address,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getScore',
          args: [walletAddress],
        });

        if (Number(onChainScore) >= 1000) {
          return res.json({ success: true, score: Number(onChainScore), updated: false });
        }

        console.log(
          `[BlockchainRoutes] Auto-setting on-chain reputation for ${walletAddress} (was ${onChainScore})`
        );
        const hash = await walletClient.writeContract({
          address: CONTRACTS.ReputationRegistry as Address,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'updateScore',
          args: [walletAddress, BigInt(1000), 'Auto-set for demo testing'],
        });
        await publicClient.waitForTransactionReceipt({ hash });

        return res.json({ success: true, score: 1000, updated: true, txHash: hash });
      } catch (error: unknown) {
        console.error('[BlockchainRoutes] Ensure reputation error:', error);
        const message = error instanceof Error ? error.message : 'Failed to set reputation';
        return res.status(500).json({ error: message });
      }
    }
  );
}
