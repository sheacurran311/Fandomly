/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle Auth Listener
 *
 * Manages the Particle wallet lifecycle alongside Fandomly's social auth:
 *
 * 1. AFTER social auth + dupe check completes -> create embedded wallet via JWT
 * 2. Fandomly logout -> disconnect Particle wallet
 *
 * This listener is purely reactive -- it never initiates login flows.
 * It waits for Fandomly auth to succeed, then provisions the wallet.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import { useAccount, useConnect, useConnectors, useDisconnect } from '@particle-network/connectkit';

function ParticleAuthListenerInner() {
  const { isAuthenticated, user, accessToken } = useAuth();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();
  const walletCreationAttempted = useRef(false);
  const logoutInProgressRef = useRef(false);

  // After Fandomly auth succeeds, create an embedded wallet via Particle JWT.
  // Guards: ref prevents re-runs within same mount, sessionStorage prevents
  // duplicate attempts across React remounts (StrictMode, Suspense boundaries).
  useEffect(() => {
    if (
      !isAuthenticated ||
      !accessToken ||
      !user ||
      isConnected ||
      walletCreationAttempted.current
    ) {
      return;
    }

    // Persistent guard: survives React remounts / StrictMode double-invokes
    const lockKey = `particle_wallet_${user.id || 'pending'}`;
    try {
      if (sessionStorage.getItem(lockKey) === 'created') {
        return;
      }
    } catch {
      /* noop */
    }

    const particleAuthConnector = connectors.find(
      (c: any) => c.walletConnectorType === 'particleAuth'
    );

    if (!particleAuthConnector) {
      return;
    }

    walletCreationAttempted.current = true;

    const attemptConnect = async (retriesLeft = 1): Promise<void> => {
      try {
        const result = await connectAsync({
          connector: particleAuthConnector,
          authParams: {
            provider: 'jwt' as any,
            thirdpartyCode: accessToken,
          },
        });
        console.log('[Particle] Embedded wallet created:', result.accounts?.[0]);
        try {
          sessionStorage.setItem(lockKey, 'created');
        } catch {
          /* noop */
        }
      } catch (err: any) {
        // If SDK not ready, retry once after a short delay
        if (
          retriesLeft > 0 &&
          (err?.message?.includes('not initialized') || err?.message?.includes('not ready'))
        ) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return attemptConnect(retriesLeft - 1);
        }
        // Non-blocking -- wallet creation failure doesn't affect the Fandomly session.
        console.warn('[Particle] Wallet creation failed (non-blocking):', err?.message || err);
      }
    };

    attemptConnect();
  }, [isAuthenticated, accessToken, user, isConnected, connectors, connectAsync]);

  // Reset the wallet creation flag when user logs out so it can fire again on next login.
  // Also clear sessionStorage lock so the next login triggers fresh wallet creation.
  useEffect(() => {
    if (!isAuthenticated) {
      walletCreationAttempted.current = false;
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('particle_wallet_')) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        /* noop */
      }
    }
  }, [isAuthenticated]);

  // Fandomly logout -> disconnect Particle wallet session
  useEffect(() => {
    const handleFandomlyLogout = () => {
      if (isConnected && !logoutInProgressRef.current) {
        logoutInProgressRef.current = true;
        try {
          disconnect();
        } finally {
          logoutInProgressRef.current = false;
        }
      }
    };

    window.addEventListener('auth:fandomly-logout', handleFandomlyLogout);
    return () => {
      window.removeEventListener('auth:fandomly-logout', handleFandomlyLogout);
    };
  }, [isConnected, disconnect]);

  return null;
}

export default function ParticleAuthListener() {
  if (!isParticleAuthEnabled()) {
    return null;
  }

  return <ParticleAuthListenerInner />;
}
