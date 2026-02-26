/**
 * Particle Connect Provider
 *
 * Wraps the app with Particle's ConnectKitProvider when Particle is configured.
 * Falls back to rendering children directly when Particle credentials are missing
 * (i.e., legacy auth mode).
 *
 * This component sits ABOVE AuthProvider in the component tree so that
 * Particle's hooks are available inside the auth context bridge.
 */

import React, { ReactNode, useMemo } from 'react';
import { isParticleConfigured, createParticleConfig } from '@/lib/particle-config';

// Lazy-load Particle Connect to avoid bundle impact when not configured
const ConnectKitProvider = React.lazy(() =>
  import('@particle-network/connectkit').then((mod) => ({
    default: mod.ConnectKitProvider,
  }))
);

interface ParticleProviderProps {
  children: ReactNode;
}

/**
 * Feature flag: determines whether Particle auth is active.
 * Controlled by VITE_AUTH_PROVIDER env var.
 *   'particle' = use Particle Connect for auth
 *   'legacy' (default) = use existing JWT + OAuth auth
 */
export function isParticleAuthEnabled(): boolean {
  const provider = import.meta.env.VITE_AUTH_PROVIDER;
  return provider === 'particle' && isParticleConfigured();
}

export function ParticleProvider({ children }: ParticleProviderProps) {
  const enabled = isParticleAuthEnabled();

  const config = useMemo(() => {
    if (!enabled) return null;
    try {
      return createParticleConfig();
    } catch (err) {
      console.error('[Particle] Failed to create config:', err);
      return null;
    }
  }, [enabled]);

  // If Particle is not enabled or config failed, render children directly
  if (!config) {
    return <>{children}</>;
  }

  return (
    <React.Suspense fallback={<>{children}</>}>
      <ConnectKitProvider config={config}>
        {children}
      </ConnectKitProvider>
    </React.Suspense>
  );
}
