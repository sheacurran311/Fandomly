/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Social Multiplier Service
 *
 * Automatically updates user staking multipliers on the FanStaking contract
 * when fans connect new social platforms.
 *
 * Multiplier values (in contract terms where 100 = 1.0x):
 * - YouTube: 2.0x (200)
 * - Twitter: 1.5x (150)
 * - Instagram: 1.3x (130)
 * - TikTok: 1.2x (120)
 * - Discord: 1.1x (110)
 *
 * The FanStaking contract uses multipliers where 100 = 1.0x base.
 * If a user has Twitter (150) + Discord (110), the total is calculated as:
 * Base (100) + (Twitter bonus: 50) + (Discord bonus: 10) = 160
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FANDOMLY_CHAIN, CONTRACTS, FAN_STAKING_ABI } from '@shared/blockchain-config';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { socialConnections, users } from '@shared/schema';

// ============================================================================
// PLATFORM MULTIPLIERS (in contract terms: 100 = 1.0x)
// ============================================================================

export const PLATFORM_MULTIPLIERS: Record<string, number> = {
  youtube: 200, // 2.0x
  twitter: 150, // 1.5x
  instagram: 130, // 1.3x
  tiktok: 120, // 1.2x
  discord: 110, // 1.1x
};

const MULTIPLIER_BASE = 100; // 1.0x in contract terms

// ============================================================================
// CHAIN SETUP
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

// ============================================================================
// SERVICE
// ============================================================================

export class SocialMultiplierService {
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private stakingAddress: Address;

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

    this.stakingAddress = CONTRACTS.FanStaking as Address;
  }

  // ==========================================================================
  // MULTIPLIER CALCULATION
  // ==========================================================================

  /**
   * Calculate a user's total multiplier based on all connected platforms.
   * Formula: Base (100) + sum of (platform_multiplier - 100) for each platform
   * Example: Twitter (150) + Discord (110) = 100 + 50 + 10 = 160
   */
  async calculateUserMultiplier(userId: string): Promise<number> {
    const connections = await db
      .select({ platform: socialConnections.platform })
      .from(socialConnections)
      .where(eq(socialConnections.userId, userId));

    if (connections.length === 0) {
      return MULTIPLIER_BASE; // Default 1.0x
    }

    // Start with base multiplier
    let totalMultiplier = MULTIPLIER_BASE;

    // Add bonus from each platform
    for (const conn of connections) {
      const platformMultiplier = PLATFORM_MULTIPLIERS[conn.platform.toLowerCase()];
      if (platformMultiplier) {
        // Add the bonus (platform multiplier - base)
        totalMultiplier += platformMultiplier - MULTIPLIER_BASE;
      }
    }

    return totalMultiplier;
  }

  // ==========================================================================
  // ON-CHAIN READ
  // ==========================================================================

  /**
   * Get current on-chain multiplier for a user.
   */
  async getOnChainMultiplier(walletAddress: string): Promise<number> {
    const multiplier = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: FAN_STAKING_ABI,
      functionName: 'userMultipliers',
      args: [walletAddress as Address],
    });
    return Number(multiplier);
  }

  // ==========================================================================
  // ON-CHAIN WRITE
  // ==========================================================================

  /**
   * Update a user's multiplier on the FanStaking contract.
   * Called after a user connects or disconnects a social platform.
   */
  async updateUserMultiplier(
    walletAddress: string,
    multiplier: number
  ): Promise<{ success: boolean; txHash: Hash | null; error?: string }> {
    try {
      console.log(
        `[SocialMultiplier] Updating multiplier for ${walletAddress}: ${multiplier} (${multiplier / 100}x)`
      );

      const hash = await this.walletClient.writeContract({
        address: this.stakingAddress,
        abi: FAN_STAKING_ABI as readonly unknown[],
        functionName: 'setUserMultiplier',
        args: [walletAddress as Address, BigInt(multiplier)],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await this.publicClient.waitForTransactionReceipt({ hash });

      console.log(
        `[SocialMultiplier] Multiplier updated successfully for ${walletAddress}: tx ${hash}`
      );

      return { success: true, txHash: hash };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[SocialMultiplier] Failed to update multiplier for ${walletAddress}:`, error);
      return { success: false, txHash: null, error };
    }
  }

  // ==========================================================================
  // HIGH-LEVEL API
  // ==========================================================================

  /**
   * Sync a user's multiplier to the blockchain.
   * This is the main entry point called after social connection changes.
   *
   * Steps:
   * 1. Get user's wallet address
   * 2. Calculate multiplier from all connected platforms
   * 3. Update the FanStaking contract
   *
   * @param userId - The user ID
   * @returns Result with success status and transaction hash
   */
  async syncUserMultiplier(
    userId: string
  ): Promise<{ success: boolean; multiplier: number; txHash: Hash | null; error?: string }> {
    try {
      // Get user's wallet address
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.walletAddress) {
        console.log(`[SocialMultiplier] User ${userId} has no wallet address - skipping sync`);
        const multiplier = await this.calculateUserMultiplier(userId);
        return {
          success: false,
          multiplier,
          txHash: null,
          error: 'No wallet address',
        };
      }

      // Calculate new multiplier
      const multiplier = await this.calculateUserMultiplier(userId);

      // Update on-chain
      const result = await this.updateUserMultiplier(user.walletAddress, multiplier);

      return {
        success: result.success,
        multiplier,
        txHash: result.txHash,
        error: result.error,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[SocialMultiplier] Error syncing multiplier for user ${userId}:`, error);
      return {
        success: false,
        multiplier: MULTIPLIER_BASE,
        txHash: null,
        error,
      };
    }
  }

  /**
   * Get a user's current multiplier info (both calculated and on-chain).
   */
  async getUserMultiplierInfo(userId: string): Promise<{
    calculated: number;
    onChain: number | null;
    connectedPlatforms: Array<{ platform: string; multiplier: number }>;
  }> {
    // Get connected platforms
    const connections = await db
      .select({ platform: socialConnections.platform })
      .from(socialConnections)
      .where(eq(socialConnections.userId, userId));

    const connectedPlatforms = connections
      .map((conn) => ({
        platform: conn.platform,
        multiplier: PLATFORM_MULTIPLIERS[conn.platform.toLowerCase()] || MULTIPLIER_BASE,
      }))
      .filter((p) => p.multiplier > MULTIPLIER_BASE);

    // Calculate multiplier
    const calculated = await this.calculateUserMultiplier(userId);

    // Get on-chain value if user has wallet
    let onChain: number | null = null;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user?.walletAddress) {
      try {
        onChain = await this.getOnChainMultiplier(user.walletAddress);
      } catch (err) {
        console.warn(`[SocialMultiplier] Failed to read on-chain multiplier:`, err);
      }
    }

    return {
      calculated,
      onChain,
      connectedPlatforms,
    };
  }
}

// ============================================================================
// SINGLETON INITIALIZATION
// ============================================================================

let socialMultiplierService: SocialMultiplierService | null = null;

export function initializeSocialMultiplierService(): SocialMultiplierService | null {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.warn('[SocialMultiplier] Not configured. Set DEPLOYER_PRIVATE_KEY in env.');
    return null;
  }

  const key = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
  socialMultiplierService = new SocialMultiplierService(key);
  console.log('[SocialMultiplier] Initialized (Fandomly Chain L1)');
  return socialMultiplierService;
}

export function getSocialMultiplierService(): SocialMultiplierService | null {
  if (!socialMultiplierService) {
    return initializeSocialMultiplierService();
  }
  return socialMultiplierService;
}
