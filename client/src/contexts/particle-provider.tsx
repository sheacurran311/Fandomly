/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useMemo } from 'react';
import { isParticleAuthEnabled, createParticleConfig } from '@/lib/particle-config';
import { ConnectKitProvider } from '@particle-network/connectkit';

interface ParticleProviderProps {
  children: ReactNode;
}

export function ParticleProvider({ children }: ParticleProviderProps) {
  const enabled = isParticleAuthEnabled();

  const config = useMemo(() => {
    if (!enabled) return null;
    try {
      return createParticleConfig();
    } catch (err) {
      console.error('[Particle] Config creation failed:', err);
      return null;
    }
  }, [enabled]);

  if (!config) {
    return <>{children}</>;
  }

  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
}
