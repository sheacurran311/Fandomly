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

function decodeJwtClaims(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as {
      iss?: string;
      aud?: string | string[];
      sub?: string;
      exp?: number;
      iat?: number;
    };
  } catch {
    return null;
  }
}

function ParticleAuthListenerInner() {
  const { isAuthenticated, isLoading, user, accessToken } = useAuth();
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
    console.log('[Particle] JWT claims for wallet connect:', decodeJwtClaims(accessToken));

    const attemptConnect = async (retriesLeft = 2): Promise<void> => {
      try {
        const result = await connectAsync({
          connector: particleAuthConnector,
          authParams: {
            provider: 'jwt' as any,
            thirdpartyCode: accessToken,
          },
        });
        const walletAddr = result.accounts?.[0];
        console.log('[Particle] Embedded wallet connected:', walletAddr);

        // Persist wallet address to server so blockchain routes can use it
        if (walletAddr) {
          try {
            await fetch('/api/auth/update-wallet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ walletAddress: walletAddr }),
            });
            console.log('[Particle] Wallet address saved to server');
          } catch (saveErr) {
            console.warn('[Particle] Failed to save wallet address (non-blocking):', saveErr);
          }
        }

        try {
          sessionStorage.setItem(lockKey, 'created');
        } catch {
          /* noop */
        }
      } catch (err: any) {
        const message = err?.message || '';
        const isRetriable =
          message.includes('not initialized') ||
          message.includes('not ready') ||
          message.includes('__wbindgen_malloc') ||
          message.includes('WebAssembly') ||
          message.includes("reading 'slice'");
        // If SDK not ready, retry once after a short delay
        if (retriesLeft > 0 && isRetriable) {
          console.log('[Particle] Wallet SDK not ready, retrying in 750ms...');
          await new Promise((resolve) => setTimeout(resolve, 750));
          return attemptConnect(retriesLeft - 1);
        }
        // Non-blocking -- wallet creation failure doesn't affect the Fandomly session.
        // Keep the in-memory/session guards so React rerenders do not spam connectAsync.
        console.warn('[Particle] Wallet creation failed (non-blocking):', err?.message || err);
        console.warn('[Particle] Full error:', err);
      }
    };

    attemptConnect();
  }, [isAuthenticated, accessToken, user, isConnected, connectors, connectAsync]);

  // When user logs out (or page reloads after logout), reset wallet creation flag,
  // clear sessionStorage locks, and disconnect the Particle wallet if still connected.
  // We wait for isLoading to be false so we don't disconnect during initial auth check.
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
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

      // Disconnect Particle wallet if still connected after Fandomly logout.
      // This handles both same-page logout and page-reload-after-logout cases,
      // since the event-based approach can be killed by window.location.href navigation.
      if (isConnected && !logoutInProgressRef.current) {
        logoutInProgressRef.current = true;
        console.log('[Particle] User not authenticated, disconnecting wallet');
        try {
          disconnect();
        } finally {
          logoutInProgressRef.current = false;
        }
      }
    }
  }, [isAuthenticated, isLoading, isConnected, disconnect]);

  // Fandomly logout -> disconnect Particle wallet session (backup for same-page logout)
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
