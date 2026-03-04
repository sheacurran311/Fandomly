import { createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import { evmWalletConnectors } from '@particle-network/connectkit/evm';
import { wallet, EntryPosition } from '@particle-network/connectkit/wallet';
import { defineChain } from '@particle-network/connectkit/chains';

export const fandomlyChain = defineChain({
  id: 31111,
  name: 'Fandomly Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'FAN',
    symbol: 'FAN',
  },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_FANDOMLY_RPC_URL ||
          'https://fandomly-avago-node-production.up.railway.app/ext/bc/Xw6RyupcvTsiJdnwc88U2rxt9RkacGbw2wHRJJD4H1sBu2z1H/rpc',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Avalanche Explorer',
      url: 'https://subnets-test.avax.network/subnets/2G2z7yGeWPKvwtJKbcs5bqEgwBATT5jkJNJHjt5RnhTBficJ93',
    },
  },
  testnet: true,
});

const projectId = import.meta.env.VITE_PARTICLE_PROJECT_ID;
const clientKey = import.meta.env.VITE_PARTICLE_CLIENT_KEY;
const appId = import.meta.env.VITE_PARTICLE_APP_ID;

// Public project identifier — safe for frontend use (not a secret)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export function isParticleConfigured(): boolean {
  return Boolean(projectId && clientKey && appId);
}

export function createParticleConfig() {
  if (!projectId || !clientKey || !appId) {
    throw new Error(
      'Particle Network credentials not configured. ' +
      'Set VITE_PARTICLE_PROJECT_ID, VITE_PARTICLE_CLIENT_KEY, and VITE_PARTICLE_APP_ID.'
    );
  }

  return createConfig({
    projectId,
    clientKey,
    appId,

    appearance: {
      connectorsOrder: ['email', 'social', 'wallet'],
      splitEmailAndPhone: false,
      collapseWalletList: true,
      hideContinueButton: false,
      language: 'en-US',
      mode: 'dark',
      theme: {
        '--pcm-accent-color': '#8B5CF6',
        '--pcm-body-background': '#0F0F23',
        '--pcm-body-background-secondary': '#1A1A3E',
        '--pcm-body-color': '#FFFFFF',
        '--pcm-body-color-secondary': '#A0AEC0',
        '--pcm-primary-button-background': '#8B5CF6',
        '--pcm-primary-button-color': '#FFFFFF',
        '--pcm-primary-button-hover-background': '#7C3AED',
        '--pcm-button-border-color': '#2D2D5E',
      },
    },

    walletConnectors: [
      // Social + email login (primary auth path)
      authWalletConnectors({
        authTypes: ['email', 'google', 'apple', 'twitter', 'discord'],
        fiatCoin: 'USD',
        promptSettingConfig: {
          promptMasterPasswordSettingWhenLogin: 0,
          promptPaymentPasswordSettingWhenSign: 1,
        },
      }),
      // EVM wallet connectors: MetaMask, Coinbase, WalletConnect, etc.
      evmWalletConnectors({
        metadata: {
          name: 'Fandomly',
          description: 'Elevate Your Brand. Reward Your Community.',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://fandomly.io',
          icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '',
        },
        ...(walletConnectProjectId ? { walletConnectProjectId } : {}),
      }),
    ],

    plugins: [
      wallet({
        entryPosition: EntryPosition.BR,
        visible: true,
      }),
    ],

    chains: [fandomlyChain],
  });
}
