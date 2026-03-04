/**
 * Particle Auth Listener
 *
 * Mounted inside both <ParticleProvider> and <AuthProvider>, this component
 * uses Particle Connect hooks to detect login/logout and bridges the
 * Particle session to Fandomly's JWT auth.
 *
 * When Particle is not enabled, this component renders nothing and is a no-op.
 *
 * Provider tree:
 *   <ParticleProvider>         ← provides Particle Connect context
 *     <AuthProvider>           ← provides Fandomly auth context
 *       <ParticleAuthListener> ← this component bridges the two
 *         <App />
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import { useAccount, useDisconnect, useParticleAuth } from '@particle-network/connectkit';

/**
 * This component is rendered inside ConnectKitProvider.
 * It uses Particle's React hooks to detect login/logout events and
 * bridges them to Fandomly's JWT auth system automatically.
 *
 * Bidirectional session sync:
 *   - Particle connects  → bridge session to Fandomly JWT
 *   - Particle disconnects → log out of Fandomly
 *   - Fandomly logout → disconnect Particle (via 'auth:fandomly-logout' event)
 */
function ParticleAuthListenerInner() {
  const {
    loginWithParticle,
    logout: fandomlyLogout,
    isAuthenticated: isFandomlyAuthed,
  } = useAuth();
  const { address, isConnected } = useAccount();
  const { getUserInfo } = useParticleAuth();
  const { disconnect } = useDisconnect();
  const bridgingRef = useRef(false);
  const logoutInProgressRef = useRef(false);

  const bridgeAuth = useCallback(async () => {
    if (bridgingRef.current || isFandomlyAuthed || !isConnected || !address) return;
    bridgingRef.current = true;

    try {
      const userInfo = await getUserInfo();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (userInfo as any)?.token;
      if (!token) {
        console.warn('[Particle Auth Listener] No token from Particle, skipping bridge');
        return;
      }

      const result = await loginWithParticle(token, address);
      if (!result.success) {
        console.error('[Particle Auth Listener] Bridge failed:', result.message);
        disconnect();
      }
    } catch (error) {
      console.warn('[Particle Auth Listener] Bridge error (clearing stale session):', error);
      disconnect();
    } finally {
      bridgingRef.current = false;
    }
  }, [isConnected, address, isFandomlyAuthed, getUserInfo, loginWithParticle, disconnect]);

  // Bridge when Particle connects and Fandomly is not yet authenticated
  useEffect(() => {
    if (isConnected && address && !isFandomlyAuthed) {
      bridgeAuth();
    }
  }, [isConnected, address, isFandomlyAuthed, bridgeAuth]);

  // Handle Particle disconnect → log out of Fandomly too
  // Guard with ref to prevent re-entrant logout loop (H3 fix)
  useEffect(() => {
    if (!isConnected && isFandomlyAuthed && !logoutInProgressRef.current) {
      logoutInProgressRef.current = true;
      Promise.resolve(fandomlyLogout()).finally(() => {
        logoutInProgressRef.current = false;
      });
    }
  }, [isConnected, isFandomlyAuthed, fandomlyLogout]);

  // Handle Fandomly logout → disconnect Particle session.
  // auth-context.tsx dispatches 'auth:fandomly-logout' from logout() after
  // clearing the JWT state. We respond by calling Particle disconnect() so
  // the Particle session is fully cleared and the bridge won't re-fire.
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
