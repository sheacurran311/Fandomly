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
        appName: "FanRewards",
        // Disable email requirements - wallet-only authentication
        bridgeChains: [],
        cssOverrides: `
          .dynamic-modal {
            z-index: 9999;
          }
          .dynamic-widget-inline-controls {
            background: hsl(280, 20%, 15%);
            border: 1px solid hsl(280, 30%, 25%);
            border-radius: 0.75rem;
          }
          .dynamic-widget-inline-controls button {
            background: hsl(315, 76%, 49%);
            color: white;
            border-radius: 0.75rem;
            padding: 0.5rem 1rem;
            font-weight: 600;
            transition: all 0.2s;
          }
          .dynamic-widget-inline-controls button:hover {
            background: hsl(315, 76%, 44%);
            transform: scale(1.02);
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
