/**
 * Particle Connect Configuration for Fandomly
 *
 * This configures Particle Network's Connect SDK to provide:
 * - Social login (Google, Apple, Twitter, Discord, email, phone)
 * - Automatic wallet creation on Fandomly Chain L1
 * - Embedded wallet UI for transaction management
 *
 * Dashboard: https://dashboard.particle.network
 * Docs: https://developers.particle.network/social-logins/connect/desktop/web
 */

import { createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import { evmWalletConnectors } from '@particle-network/connectkit/evm';
import { wallet, EntryPosition } from '@particle-network/connectkit/wallet';
import { defineChain } from '@particle-network/connectkit/chains';

// --- Fandomly Chain L1 Definition ---
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
        'https://nodes-prod.18.182.4.86.sslip.io/ext/bc/Xw6RyupcvTsiJdnwc88U2rxt9RkacGbw2wHRJJD4H1sBu2z1H/rpc',
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

// --- Credentials from Particle Dashboard ---
const projectId = import.meta.env.VITE_PARTICLE_PROJECT_ID;
const clientKey = import.meta.env.VITE_PARTICLE_CLIENT_KEY;
const appId = import.meta.env.VITE_PARTICLE_APP_ID;

/**
 * Check if Particle Network is configured.
 * Returns false if credentials are missing (falls back to legacy auth).
 */
export function isParticleConfigured(): boolean {
  return Boolean(projectId && clientKey && appId);
}

/**
 * Create the Particle Connect config.
 * Only call this if isParticleConfigured() returns true.
 */
export function createParticleConfig() {
  if (!projectId || !clientKey || !appId) {
    throw new Error(
      'Particle Network credentials not configured. ' +
      'Set VITE_PARTICLE_PROJECT_ID, VITE_PARTICLE_CLIENT_KEY, and VITE_PARTICLE_APP_ID in .env'
    );
  }

  return createConfig({
    projectId,
    clientKey,
    appId,

    appearance: {
      // Prioritize social logins (email first, then social, then wallets)
      connectorsOrder: ['email', 'social', 'wallet'],
      splitEmailAndPhone: false,
      collapseWalletList: true,  // Most Fandomly users are Web2-native
      hideContinueButton: false,
      language: 'en-US',
      mode: 'dark', // Match Fandomly's dark theme
      theme: {
        // Fandomly brand colors -- update these to match your design system
        '--pcm-accent-color': '#8B5CF6',           // Purple accent
        '--pcm-body-background': '#0F0F23',         // Dark background
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
      // Social login connectors (Particle Auth)
      authWalletConnectors({
        // Social providers available for login
        // These replace our current 8 separate OAuth integrations
        authTypes: ['email', 'google', 'apple', 'twitter', 'discord'],
        fiatCoin: 'USD',
        promptSettingConfig: {
          // 0 = Never ask -- frictionless onboarding for fans
          // Master password protects the wallet key
          promptMasterPasswordSettingWhenLogin: 0,
          // Payment password required before signing transactions
          promptPaymentPasswordSettingWhenSign: 1,
        },
      }),

      // EVM wallet connectors (MetaMask, WalletConnect, etc.)
      // For Web3-native users who already have wallets
      evmWalletConnectors({
        metadata: {
          name: 'Fandomly',
          icon: '', // TODO: Set to Fandomly icon URL
          description: 'Creator loyalty and rewards platform',
          url: 'https://fandomly.ai',
        },
        // Disable multi-injected provider discovery to simplify the modal
        multiInjectedProviderDiscovery: false,
      }),
    ],

    plugins: [
      // Embedded wallet modal -- shows balances, allows transfers, etc.
      wallet({
        entryPosition: EntryPosition.BR, // Bottom-right button
        visible: true,
      }),
    ],

    // Only Fandomly Chain for now (add C-Chain or others later if needed)
    chains: [fandomlyChain],
  });
}
