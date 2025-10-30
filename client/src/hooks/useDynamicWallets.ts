import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

/**
 * Hook to get user's wallet addresses from Dynamic embedded wallets
 */
export function useDynamicWallets() {
  const { primaryWallet, wallets } = useDynamicContext();

  /**
   * Get primary wallet address for a specific chain
   */
  const getPrimaryWalletForChain = (chain: string): string | null => {
    if (!primaryWallet) return null;

    // Map chain names to wallet types
    const chainToWalletType: Record<string, string> = {
      'polygon': 'evm',
      'polygon-amoy': 'evm',
      'base': 'evm',
      'base-sepolia': 'evm',
      'arbitrum': 'evm',
      'arbitrum-sepolia': 'evm',
      'optimism': 'evm',
      'optimism-sepolia': 'evm',
      'ethereum': 'evm',
      'ethereum-sepolia': 'evm',
      'solana': 'sol',
    };

    const walletType = chainToWalletType[chain];

    if (!walletType) {
      console.warn(`Unknown chain: ${chain}`);
      return null;
    }

    // For EVM chains, return primary EVM wallet
    if (walletType === 'evm') {
      if (primaryWallet.connector?.name?.toLowerCase().includes('ethereum') || 
          primaryWallet.connector?.name?.toLowerCase().includes('evm')) {
        return primaryWallet.address;
      }

      // Find first EVM wallet
      const evmWallet = wallets?.find(w => 
        w.connector?.name?.toLowerCase().includes('ethereum') ||
        w.connector?.name?.toLowerCase().includes('evm')
      );
      return evmWallet?.address || null;
    }

    // For Solana, return primary Solana wallet
    if (walletType === 'sol') {
      if (primaryWallet.connector?.name?.toLowerCase().includes('solana')) {
        return primaryWallet.address;
      }

      // Find first Solana wallet
      const solWallet = wallets?.find(w => 
        w.connector?.name?.toLowerCase().includes('solana')
      );
      return solWallet?.address || null;
    }

    return null;
  };

  /**
   * Get all wallet addresses grouped by type
   */
  const getAllWalletAddresses = () => {
    if (!wallets || wallets.length === 0) {
      return { evm: [], solana: [] };
    }

    const evm: string[] = [];
    const solana: string[] = [];

    wallets.forEach(wallet => {
      const connectorName = wallet.connector?.name?.toLowerCase() || '';
      
      if (connectorName.includes('ethereum') || connectorName.includes('evm')) {
        if (wallet.address && !evm.includes(wallet.address)) {
          evm.push(wallet.address);
        }
      } else if (connectorName.includes('solana')) {
        if (wallet.address && !solana.includes(wallet.address)) {
          solana.push(wallet.address);
        }
      }
    });

    return { evm, solana };
  };

  /**
   * Format recipient address for Crossmint API
   */
  const formatRecipientAddress = (userId: string, chain: string): string | null => {
    const walletAddress = getPrimaryWalletForChain(chain);
    
    if (!walletAddress) {
      console.error(`No wallet found for chain: ${chain}`);
      return null;
    }

    // Crossmint accepts direct wallet addresses
    // For email delivery: 'email:user@example.com:chain'
    // For wallet delivery: just the wallet address
    return walletAddress;
  };

  /**
   * Check if user has required wallet for chain
   */
  const hasWalletForChain = (chain: string): boolean => {
    return getPrimaryWalletForChain(chain) !== null;
  };

  return {
    primaryWallet,
    wallets: wallets || [],
    getPrimaryWalletForChain,
    getAllWalletAddresses,
    formatRecipientAddress,
    hasWalletForChain,
  };
}

