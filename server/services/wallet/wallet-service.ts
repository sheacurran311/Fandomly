import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Crossmint Wallet API configuration
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
const CROSSMINT_ENV = process.env.CROSSMINT_ENV || 'staging'; // 'staging' or 'www'
const CROSSMINT_BASE_URL = `https://${CROSSMINT_ENV}.crossmint.com/api`;
const DEFAULT_CHAIN = process.env.DEFAULT_WALLET_CHAIN || 'polygon-amoy';

export interface WalletInfo {
  address: string;
  chain: string;
  type: 'custodial' | 'smart-wallet';
  createdAt?: string;
}

export interface CreateWalletResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
  isNew: boolean;
}

/**
 * Wallet Service for lazy Crossmint wallet creation
 * Only creates wallets when users need them (for NFT operations)
 */
export class WalletService {
  
  /**
   * Ensure a user has a wallet, creating one if needed
   * This is the main entry point for lazy wallet creation
   */
  async ensureUserHasWallet(userId: string, options?: {
    chain?: string;
    forceCreate?: boolean;
  }): Promise<CreateWalletResult> {
    const chain = options?.chain || DEFAULT_CHAIN;
    
    try {
      // Get user from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return { success: false, error: 'User not found', isNew: false };
      }

      // Check if user already has a wallet
      if (user.walletAddress && !options?.forceCreate) {
        console.log(`[Wallet] User ${userId} already has wallet: ${user.walletAddress}`);
        return {
          success: true,
          wallet: {
            address: user.walletAddress,
            chain: user.walletChain || chain,
            type: 'smart-wallet',
          },
          isNew: false
        };
      }

      // Create wallet with Crossmint
      console.log(`[Wallet] Creating wallet for user ${userId} on chain ${chain}`);
      const wallet = await this.createCrossmintWallet(user.email, chain);

      if (!wallet) {
        return { success: false, error: 'Failed to create wallet', isNew: false };
      }

      // Update user with wallet address
      await db.update(users)
        .set({
          walletAddress: wallet.address,
          walletChain: chain,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`[Wallet] Created wallet for user ${userId}: ${wallet.address}`);

      return {
        success: true,
        wallet,
        isNew: true
      };
    } catch (error: any) {
      console.error(`[Wallet] Error ensuring wallet for user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to ensure wallet',
        isNew: false
      };
    }
  }

  /**
   * Create a Crossmint wallet for a user
   * Uses the Wallets API with email-based signer
   */
  private async createCrossmintWallet(email: string | null, chain: string): Promise<WalletInfo | null> {
    if (!CROSSMINT_API_KEY) {
      console.error('[Wallet] CROSSMINT_SERVER_API_KEY not configured');
      throw new Error('Crossmint API key not configured');
    }

    try {
      // Map chain to Crossmint chain format
      const crossmintChain = this.mapChainToCrossmint(chain);

      // Create wallet using Crossmint Wallets API
      // https://docs.crossmint.com/wallets/quickstarts/nodejs
      const response = await fetch(`${CROSSMINT_BASE_URL}/v1-alpha2/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': CROSSMINT_API_KEY,
        },
        body: JSON.stringify({
          type: 'evm-smart-wallet', // Smart wallet for better UX
          config: {
            adminSigner: email ? {
              type: 'evm-keypair', // Email-based signer
            } : undefined
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Wallet] Crossmint API error:', errorText);
        throw new Error(`Crossmint wallet creation failed: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return {
        address: data.address,
        chain: chain,
        type: 'smart-wallet',
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('[Wallet] Crossmint wallet creation error:', error);
      throw error;
    }
  }

  /**
   * Get a user's wallet address (without creating one)
   */
  async getUserWallet(userId: string): Promise<WalletInfo | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user?.walletAddress) {
      return null;
    }

    return {
      address: user.walletAddress,
      chain: user.walletChain || DEFAULT_CHAIN,
      type: 'smart-wallet'
    };
  }

  /**
   * Check if user needs a wallet (for pre-flight checks)
   */
  async userNeedsWallet(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { walletAddress: true }
    });

    return !user?.walletAddress;
  }

  /**
   * Map internal chain names to Crossmint chain format
   */
  private mapChainToCrossmint(chain: string): string {
    const chainMap: Record<string, string> = {
      'polygon': 'polygon',
      'polygon-amoy': 'polygon-amoy',
      'polygon-mainnet': 'polygon',
      'ethereum': 'ethereum',
      'ethereum-sepolia': 'ethereum-sepolia',
      'base': 'base',
      'base-sepolia': 'base-sepolia',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'solana': 'solana',
      'solana-devnet': 'solana-devnet',
    };

    return chainMap[chain] || chain;
  }
}

// Singleton instance
let walletServiceInstance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}

export function initializeWalletService(): void {
  if (!CROSSMINT_API_KEY) {
    console.warn('[Wallet] CROSSMINT_SERVER_API_KEY not set - wallet creation will fail');
  } else {
    console.log('[Wallet] Wallet service initialized');
  }
  walletServiceInstance = new WalletService();
}
