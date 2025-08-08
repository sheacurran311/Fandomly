import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { AlgorandWalletConnectors } from "@dynamic-labs/algorand";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { CosmosWalletConnectors } from "@dynamic-labs/cosmos";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { FlowWalletConnectors } from "@dynamic-labs/flow";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { StarknetWalletConnectors } from "@dynamic-labs/starknet";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
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
          AlgorandWalletConnectors,
          BitcoinWalletConnectors,
          CosmosWalletConnectors,
          EthereumWalletConnectors,
          FlowWalletConnectors,
          SolanaWalletConnectors,
          StarknetWalletConnectors,
          SuiWalletConnectors,
        ],
        appName: "Fandomly",
        appLogoUrl: "https://fandomly.ai/logo.png",
        privacyPolicyUrl: "/privacy-policy",
        termsOfServiceUrl: "/terms-of-service",
        initialAuthenticationMode: "connect-only",
        cssOverrides: `
          .dynamic-shadow-dom {
            /* Base colors */
            --dynamic-base-1: #0a0214;
            --dynamic-base-2: #1a0f2e;
            --dynamic-base-3: #2a1f3e;
            --dynamic-base-4: #3a2f4e;
            --dynamic-base-5: #4a3f5e;
            
            /* Brand colors */
            --dynamic-brand-primary-color: #dd20be;
            --dynamic-brand-secondary-color: rgba(221, 32, 190, 0.15);
            --dynamic-brand-hover-color: rgba(221, 32, 190, 0.8);
            
            /* Text colors */
            --dynamic-text-primary: #ffffff;
            --dynamic-text-secondary: #dd20be;
            --dynamic-text-tertiary: rgba(255, 255, 255, 0.7);
            
            /* Modal styling */
            --dynamic-modal-border: 1px solid rgba(221, 32, 190, 0.4);
            --dynamic-modal-width: 22.5rem;
            --dynamic-modal-padding: 1.5rem;
            --dynamic-border-radius: 16px;
            
            /* Wallet list styling */
            --dynamic-wallet-list-tile-background: #1a0f2e;
            --dynamic-wallet-list-tile-border: 1px solid rgba(221, 32, 190, 0.2);
            --dynamic-wallet-list-tile-background-hover: #2a1f3e;
            --dynamic-wallet-list-tile-border-hover: 1px solid #dd20be;
            --dynamic-wallet-list-tile-padding: 0.75rem;
            --dynamic-wallet-list-tile-gap: 0.375rem;
            --dynamic-wallet-list-max-height: 16.25rem;
            
            /* Connect button (in modal) */
            --dynamic-connect-button-background: linear-gradient(135deg, #dd20be 0%, #a4fc07 50%, #03a0fd 100%);
            --dynamic-connect-button-color: #ffffff;
            --dynamic-connect-button-border: none;
            --dynamic-connect-button-background-hover: linear-gradient(135deg, rgba(221, 32, 190, 0.9) 0%, rgba(164, 252, 7, 0.9) 50%, rgba(3, 160, 253, 0.9) 100%);
            --dynamic-connect-button-color-hover: #ffffff;
            --dynamic-connect-button-radius: 8px;
            
            /* Footer */
            --dynamic-footer-background-color: #0a0214;
            --dynamic-footer-text-color: #ffffff;
            --dynamic-footer-icon-color: #dd20be;
            --dynamic-footer-border: 1px solid rgba(221, 32, 190, 0.2);
            
            /* Search bar */
            --dynamic-search-bar-background: #1a0f2e;
            --dynamic-search-bar-border: 1px solid rgba(221, 32, 190, 0.2);
            --dynamic-search-bar-background-focus: #2a1f3e;
            --dynamic-search-bar-border-focus: 1px solid #dd20be;
            
            /* Other */
            --dynamic-overlay: rgba(10, 2, 20, 0.8);
            --dynamic-hover: rgba(221, 32, 190, 0.1);
          }
          
          /* Additional modal z-index fix */
          .dynamic-modal {
            z-index: 9999 !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
