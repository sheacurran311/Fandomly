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
import {
  useAccount,
  useDisconnect,
  useParticleAuth,
} from '@particle-network/connectkit';

/**
 * This component is rendered inside ConnectKitProvider.
 * It uses Particle's React hooks to detect login/logout events and
 * bridges them to Fandomly's JWT auth system automatically.
 */
function ParticleAuthListenerInner() {
  const { loginWithParticle, logout: fandomlyLogout, isAuthenticated: isFandomlyAuthed } = useAuth();
  const { address, isConnected } = useAccount();
  const { getUserInfo } = useParticleAuth();
  const { disconnect } = useDisconnect();
  const bridgingRef = useRef(false);

  const bridgeAuth = useCallback(async () => {
    if (bridgingRef.current || isFandomlyAuthed || !isConnected || !address) return;
    bridgingRef.current = true;

    try {
      const userInfo = await getUserInfo();
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
      console.error('[Particle Auth Listener] Error bridging auth:', error);
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
  useEffect(() => {
    if (!isConnected && isFandomlyAuthed) {
      fandomlyLogout();
    }
  }, [isConnected, isFandomlyAuthed, fandomlyLogout]);

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
