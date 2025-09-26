import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { AlgorandWalletConnectors } from "@dynamic-labs/algorand";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { CosmosWalletConnectors } from "@dynamic-labs/cosmos";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { FlowWalletConnectors } from "@dynamic-labs/flow";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { StarknetWalletConnectors } from "@dynamic-labs/starknet";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";
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
        // Dynamic SDK owns authentication. We only mirror the userId for our API headers.
        events: {
          onAuthSuccess: (args: any) => {
            try {
              const user = args?.user || args;
              const userId = user?.userId || user?.id;
              if (userId) {
                (window as any).__dynamicUserId = userId;
                try { localStorage.setItem('twitter_dynamic_user_id', userId); } catch {}
                // eslint-disable-next-line no-console
                console.log('[Dynamic Events] onAuthSuccess - set Dynamic user ID:', userId);
              }
            } catch {}
          },
          onLogout: () => {
            try { (window as any).__dynamicUserId = null; } catch {}
            try { localStorage.removeItem('twitter_dynamic_user_id'); } catch {}
            // eslint-disable-next-line no-console
            console.log('[Dynamic Events] onLogout - cleared Dynamic user ID');
          },
          onUserProfileUpdate: (args: any) => {
            try {
              const user = args?.user || args;
              const userId = user?.userId || user?.id;
              if (userId) {
                (window as any).__dynamicUserId = userId;
                try { localStorage.setItem('twitter_dynamic_user_id', userId); } catch {}
                // eslint-disable-next-line no-console
                console.log('[Dynamic Events] onUserProfileUpdate - refreshed Dynamic user ID:', userId);
              }
            } catch {}
          }
        }
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
