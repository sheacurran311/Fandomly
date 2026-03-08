/* eslint-disable @typescript-eslint/no-explicit-any */
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
      // Layout and UX preferences
      connectorsOrder: ['email', 'social', 'wallet'],
      splitEmailAndPhone: false,
      collapseWalletList: true,
      hideContinueButton: false,
      language: 'en-US',
      mode: 'dark',

      // Fandomly logo — shown at the top of the ConnectKit modal.
      // NOTE: The Particle dashboard "Branding" section only applies to the legacy
      // @particle-network/authkit SDK. For ConnectKit (@particle-network/connectkit),
      // all visual customization must be done here via `appearance.logo` and
      // `appearance.theme`. See:
      // https://developers.particle.network/social-logins/configuration/appearance/auth.md
      logo:
        typeof window !== 'undefined'
          ? `${window.location.origin}/fandomly-logo.png`
          : 'https://fandomly.io/fandomly-logo.png',

      // Fandomly brand theme for the ConnectKit modal.
      // Brand colors: #e10698 (primary pink), #14feee (secondary cyan), #0a0118 (dark bg)
      theme: {
        // Modal overlay
        '--pcm-overlay-background': 'rgba(10, 1, 24, 0.85)',
        '--pcm-overlay-backdrop-filter': 'blur(8px)',
        '--pcm-modal-box-shadow': '0px 0px 32px rgba(225, 6, 152, 0.25)',

        // Modal / card backgrounds
        '--pcm-body-background': '#0f0520',
        '--pcm-body-background-secondary': '#1a0a30',
        '--pcm-body-background-tertiary': '#220d3c',

        // Text
        '--pcm-body-color': '#ffffff',
        '--pcm-body-color-secondary': '#b3a8c8',
        '--pcm-body-color-tertiary': '#6b5f82',

        // Action / accent / focus
        '--pcm-body-action-color': '#e10698',
        '--pcm-accent-color': '#e10698',
        '--pcm-focus-color': '#14feee',

        // Buttons (shared)
        '--pcm-button-font-weight': '600',
        '--pcm-button-hover-shadow': '0px 4px 16px rgba(225, 6, 152, 0.35)',
        '--pcm-button-border-color': 'rgba(225, 6, 152, 0.3)',

        // Primary button — hot pink background, white text
        '--pcm-primary-button-color': '#ffffff',
        '--pcm-primary-button-background': '#e10698',
        // Note: Particle SDK has a known typo "bankground" — include both spellings
        // for the primary button until Particle corrects it upstream.
        '--pcm-primary-button-bankground': '#e10698',
        '--pcm-primary-button-hover-background': '#c0057f',

        // Secondary button — subtle dark with pink border
        '--pcm-secondary-button-color': '#e10698',
        '--pcm-secondary-button-background': 'rgba(225, 6, 152, 0.1)',
        '--pcm-secondary-button-hover-background': 'rgba(225, 6, 152, 0.2)',

        // Border radius — matches Fandomly's rounded-xl design language
        '--pcm-rounded-sm': '6px',
        '--pcm-rounded-md': '10px',
        '--pcm-rounded-lg': '14px',
        '--pcm-rounded-xl': '18px',
        '--pcm-rounded-full': '9999px',

        // Status colors
        '--pcm-success-color': '#14feee',
        '--pcm-warning-color': '#F59E0A',
        '--pcm-error-color': '#ff4d6d',

        // Wallet label
        '--pcm-wallet-label-color': '#14feee',
      } as Record<string, string>,
    },

    walletConnectors: [
      // Particle Auth connector — used for JWT-based embedded wallet creation.
      // Primary login is handled by Fandomly's own social auth modal (auth-modal.tsx).
      // Particle is only used for wallet provisioning after auth completes.
      // 'jwt' is required for Particle ConnectKit to accept connectAsync with JWT.
      authWalletConnectors({
        authTypes: [
          'email',
          'google',
          'apple',
          'twitter',
          'discord',
          'facebook',
          'github',
          'twitch',
          'microsoft',
          'linkedin',
          'jwt',
        ],
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

    // Wallet plugin: visible:true ensures the wallet iframe/DOM is created
    // (required for openWallet() to work). The floating entry button is hidden
    // via CSS (.particle-pwe-btn { display: none }) in index.css.
    // openWallet() calls are wrapped in try-catch in case the WASM module fails to load.
    plugins: [
      wallet({
        entryPosition: EntryPosition.BR,
        visible: true,
      }),
    ],

    chains: [fandomlyChain],
  });
}
