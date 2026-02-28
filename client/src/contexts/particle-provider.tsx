/**
 * Particle Connect Provider
 *
 * Wraps the app with Particle's ConnectKitProvider when Particle credentials
 * are configured. Falls back to rendering children directly when credentials
 * are missing (e.g. landing-only production build).
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
 * Returns true when Particle Connect is active (credentials configured).
 * No feature flag needed — Particle is the primary auth provider.
 * Falls back gracefully when credentials are absent.
 */
export function isParticleAuthEnabled(): boolean {
  return isParticleConfigured();
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

  // If Particle is not configured or config failed, render children directly
  if (!config) {
    return <>{children}</>;
  }

  return (
    <React.Suspense fallback={<>{children}</>}>
      <ConnectKitProvider config={config}>{children}</ConnectKitProvider>
    </React.Suspense>
  );
}
