/**
 * Stub for Dynamic wallet functionality
 * Dynamic SDK has been removed - wallet features will need alternative implementation
 */

export function useDynamicWallets() {
  // Return stub data since Dynamic SDK is removed
  return {
    primaryWallet: null,
    wallets: [],
    getPrimaryWalletForChain: (_chain: string): string | null => null,
    getAllWalletAddresses: () => ({ evm: [], solana: [] }),
    formatRecipientAddress: (_userId: string, _chain: string): string | null => null,
    hasWalletForChain: (_chain: string): boolean => false,
  };
}
