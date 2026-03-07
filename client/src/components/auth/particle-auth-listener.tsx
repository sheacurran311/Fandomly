/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle Auth Listener (Passive Mode)
 *
 * Now that social auth is the primary login method, this listener is
 * purely passive. It does NOT initiate any authentication flows.
 *
 * Responsibilities:
 * 1. Sync Fandomly logout → Particle disconnect (clear wallet session)
 * 2. Future: when Particle JWT integration is wired, this will listen
 *    for wallet creation events AFTER the social auth + dupe check flow
 *    has fully completed.
 *
 * What it does NOT do:
 * - Bridge Particle social login to Fandomly auth (removed)
 * - Log out Fandomly when Particle is not connected (removed)
 * - Interfere with the social auth modal login flow in any way
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import { useAccount, useDisconnect } from '@particle-network/connectkit';

function ParticleAuthListenerInner() {
  const { isAuthenticated: isFandomlyAuthed } = useAuth();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const logoutInProgressRef = useRef(false);

  // Handle Fandomly logout → disconnect Particle wallet session.
  // Dispatched from auth-context.tsx logout() via custom event.
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

/**
 * Conditionally renders the Particle auth listener.
 * When Particle is not enabled, renders nothing.
 */
export default function ParticleAuthListener() {
  if (!isParticleAuthEnabled()) {
    return null;
  }

  return <ParticleAuthListenerInner />;
}
