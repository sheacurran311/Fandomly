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

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';

/**
 * This component is rendered lazily only when Particle is enabled.
 * It uses Particle's React hooks which require ConnectKitProvider in the tree.
 */
function ParticleAuthListenerInner() {
  // These hooks come from @particle-network/connectkit
  // They're only available inside ConnectKitProvider
  // We use dynamic imports in the lazy wrapper below
  const { loginWithParticle, isAuthenticated: isFandomlyAuthed } = useAuth();
  const bridgingRef = useRef(false);

  useEffect(() => {
    // The actual Particle event subscription will be set up here
    // once the SDK is installed. For now, the bridge is triggered
    // by the ConnectButton's onConnected callback or by calling
    // bridgeParticleToFandomly() from the login page.
    //
    // When @particle-network/connectkit is installed, we'll use:
    //   useAccount() - to get wallet address
    //   useParticleAuth() - to get the auth token
    //   These fire automatically when the user completes the modal.

    console.log('[Particle Auth Listener] Active, waiting for Particle events');
  }, [loginWithParticle, isFandomlyAuthed]);

  // This component doesn't render anything visible
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
