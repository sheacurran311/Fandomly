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
  // This only runs once per session -- walletCreationAttempted prevents retries.
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

    const particleAuthConnector = connectors.find(
      (c: any) => c.walletConnectorType === 'particleAuth'
    );

    if (!particleAuthConnector) {
      return;
    }

    walletCreationAttempted.current = true;

    connectAsync({
      connector: particleAuthConnector,
      authParams: {
        provider: 'jwt' as any,
        thirdpartyCode: accessToken,
      },
    })
      .then((result) => {
        console.log('[Particle] Embedded wallet created:', result.accounts?.[0]);
      })
      .catch((err) => {
        // Non-blocking -- wallet creation failure doesn't affect the Fandomly session.
        // User can still use the app; wallet can be retried later.
        console.warn('[Particle] Wallet creation failed (non-blocking):', err?.message || err);
      });
  }, [isAuthenticated, accessToken, user, isConnected, connectors, connectAsync]);

  // Reset the wallet creation flag when user logs out so it can fire again on next login
  useEffect(() => {
    if (!isAuthenticated) {
      walletCreationAttempted.current = false;
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
