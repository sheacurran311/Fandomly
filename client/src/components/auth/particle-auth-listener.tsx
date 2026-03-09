/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle Auth Listener
 *
 * Manages the Particle wallet lifecycle alongside Fandomly's social auth:
 *
 * 1. AFTER social auth + dupe check completes -> create or reconnect embedded wallet via JWT
 * 2. Fandomly logout -> disconnect Particle wallet
 *
 * For returning users, ConnectKit does not auto-restore the embedded wallet session
 * after a full page load. We always call connectAsync with the Fandomly JWT when
 * authenticated and not connected; Particle restores the existing wallet for that user.
 *
 * This listener is purely reactive -- it never initiates login flows.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/lib/particle-config';
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
    // Detailed logging to diagnose wallet creation issues
    console.log('[Particle] Auth listener check:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      hasUser: !!user,
      userId: user?.id,
      isConnected,
      walletCreationAttempted: walletCreationAttempted.current,
      connectorCount: connectors.length,
    });

    if (
      !isAuthenticated ||
      !accessToken ||
      !user ||
      isConnected ||
      walletCreationAttempted.current
    ) {
      return;
    }

    // Prevent duplicate in-flight connect attempts across remounts (e.g. StrictMode).
    // If a lock exists from a previous run but we're not connected (e.g. page refresh),
    // clear it so we reconnect — ConnectKit does not auto-restore embedded wallet on load.
    const lockKey = `particle_wallet_${user.id || 'pending'}`;
    try {
      if (sessionStorage.getItem(lockKey) === 'created') {
        sessionStorage.removeItem(lockKey);
        console.log('[Particle] Cleared stale lock; reconnecting existing wallet');
      }
    } catch {
      /* noop */
    }

    const particleAuthConnector = connectors.find(
      (c: any) => c.walletConnectorType === 'particleAuth'
    );

    if (!particleAuthConnector) {
      console.warn(
        '[Particle] No particleAuth connector found among:',
        connectors.map((c: any) => c.walletConnectorType || c.id)
      );
      return;
    }

    walletCreationAttempted.current = true;
    console.log(
      '[Particle] Connecting embedded wallet with JWT (first 20 chars):',
      accessToken.slice(0, 20) + '...'
    );

    const attemptConnect = async (retriesLeft = 1): Promise<void> => {
      try {
        const result = await connectAsync({
          connector: particleAuthConnector,
          authParams: {
            provider: 'jwt' as any,
            thirdpartyCode: accessToken,
          },
        });
        console.log('[Particle] Embedded wallet connected:', result.accounts?.[0]);
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
          console.log('[Particle] SDK not ready, retrying in 500ms...');
          await new Promise((resolve) => setTimeout(resolve, 500));
          return attemptConnect(retriesLeft - 1);
        }
        // Non-blocking -- wallet creation failure doesn't affect the Fandomly session.
        console.warn('[Particle] Wallet creation failed (non-blocking):', err?.message || err);
        console.warn('[Particle] Full error:', err);
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
