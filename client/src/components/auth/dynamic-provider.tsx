import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { CosmosWalletConnectors } from "@dynamic-labs/cosmos";
import { StarknetWalletConnectors } from "@dynamic-labs/starknet";
import { dynamicEnvironmentId } from "@/lib/dynamic";
import { ReactNode } from "react";

interface DynamicProviderProps {
  children: ReactNode;
}

export default function DynamicProvider({ children }: DynamicProviderProps) {
  if (!dynamicEnvironmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-gray-300">
            Dynamic environment ID is not configured. Please check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: dynamicEnvironmentId,
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          CosmosWalletConnectors,
          StarknetWalletConnectors,
        ],
        appName: "Fandomly",
        appLogoUrl: "https://fandomly.ai/logo.png",
        privacyPolicyUrl: "/privacy-policy",
        termsOfServiceUrl: "/terms-of-service",
        // Prevent auto-opening of wallet modal - manual trigger only
        initialAuthenticationMode: "connect-only",
        // Show auth flow when clicking connect button
        showAuthFlow: false,
        cssOverrides: `
          .dynamic-modal {
            z-index: 9999;
          }
          .dynamic-shadow-dom .connect-wallet-content {
            background: #0a0214 !important;
            border: 1px solid #dd20be40 !important;
          }
          .dynamic-shadow-dom .connect-wallet-title {
            color: #dd20be !important;
          }
          .dynamic-shadow-dom .wallet-list-item {
            background: #1a0f2e !important;
            border: 1px solid #dd20be20 !important;
          }
          .dynamic-shadow-dom .wallet-list-item:hover {
            border-color: #dd20be !important;
          }
          .dynamic-shadow-dom .wallet-icon {
            border-radius: 8px !important;
          }
          .dynamic-shadow-dom .primary-button {
            background: linear-gradient(135deg, #dd20be 0%, #a4fc07 50%, #03a0fd 100%) !important;
            border: none !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
