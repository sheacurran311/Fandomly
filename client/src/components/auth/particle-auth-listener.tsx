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

import { useEffect, useRef, useCallback, startTransition } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import { useAccount, useDisconnect, useParticleAuth, useWallets } from '@particle-network/connectkit';
import { useToast } from '@/hooks/use-toast';

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
  const [, setLocation] = useLocation();
  const { address, isConnected, connector } = useAccount();
  const { getUserInfo } = useParticleAuth();
  const [primaryWallet] = useWallets();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const bridgingRef = useRef(false);
  const logoutInProgressRef = useRef(false);

  // On mount, clear any stale bridge locks left from a previous crash or hard reload.
  // A stale lock would block the next legitimate login attempt.
  useEffect(() => {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('particle_bridge_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only bridge for Particle social logins — not for external wallets (MetaMask, WalletConnect, etc.)
  const isParticleSocialLogin = connector?.walletConnectorType === 'particleAuth' ||
    primaryWallet?.connector?.walletConnectorType === 'particleAuth';

  const bridgeAuth = useCallback(async () => {
    // In-flight guard (ref) prevents double-call within same mount
    if (bridgingRef.current || isFandomlyAuthed || !isConnected || !address) return;

    // Persistent guard (sessionStorage) prevents re-firing after Suspense remount
    // or React StrictMode double-invoke with the same Particle session.
    // Key includes address so a new login attempt with a different wallet can still proceed.
    const lockKey = `particle_bridge_${address}`;
    if (sessionStorage.getItem(lockKey) === 'bridging') return;

    bridgingRef.current = true;
    sessionStorage.setItem(lockKey, 'bridging');

    try {
      // Wait for window.particle._internal to be populated by the Particle Auth SDK.
      // isConnected fires immediately when the wallet connects, but the internal
      // Particle auth context (window.particle._internal) is set up asynchronously
      // after the connection handshake completes. We poll with backoff.
      let userInfo: any = null;
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const info = getUserInfo();
          if (info?.token) {
            userInfo = info;
            break;
          }
        } catch {
          // Not ready yet — window.particle._internal not initialized
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }

      if (!userInfo?.token) {
        console.warn('[Particle Auth Listener] No token after polling — wallet may not be a social login');
        return;
      }

      const token = userInfo.token;
      const uuid = userInfo.uuid;
      const email = userInfo.email ?? null;
      const name = userInfo.name ?? null;
      const avatar = userInfo.avatar ?? null;
      console.info('[Particle Auth Listener] userInfo keys:', Object.keys(userInfo));
      console.info('[Particle Auth Listener] uuid:', uuid, '| token length:', token?.length, '| token prefix:', token?.slice?.(0, 30));

      const result = await loginWithParticle(token, address, uuid, email, name, avatar);
      if (!result.success) {
        console.error('[Particle Auth Listener] Bridge failed:', result.message);
        toast({
          title: 'Sign-in failed',
          description: result.message || 'Could not connect your account. Please try again.',
          variant: 'destructive',
        });
        // Clear bridge lock so user can retry
        try { sessionStorage.removeItem(`particle_bridge_${address}`); } catch { /* noop */ }
        disconnect();
        return;
      }

      // Route the user after successful login:
      //  - New users (userType pending) → /user-type-selection (onboarding entry)
      //  - Returning users → respect postAuthRedirect or go to their dashboard
      const user = result.user;
      const isNewUser = result.isNewUser || !user?.userType || user?.userType === 'pending';

      if (isNewUser) {
        // Clear any stale redirect — new users must choose their type first
        try { sessionStorage.removeItem('postAuthRedirect'); } catch { /* noop */ }
        setLocation('/user-type-selection');
        return;
      }

      // Returning user — check for a stored redirect (e.g. they tried to reach a dashboard)
      try {
        const postAuthRedirect = sessionStorage.getItem('postAuthRedirect');
        if (postAuthRedirect) {
          sessionStorage.removeItem('postAuthRedirect');
          setLocation(postAuthRedirect);
          return;
        }
      } catch { /* noop */ }

      // Default: send to their dashboard
      if (user?.userType === 'creator') {
        setLocation('/creator-dashboard');
      } else if (user?.userType === 'fan') {
        if (!user?.onboardingState?.isCompleted) {
          const resumeRoute = user?.onboardingState?.lastOnboardingRoute || '/fan-onboarding/profile';
          setLocation(resumeRoute);
        } else {
          setLocation('/fan-dashboard');
        }
      } else {
        setLocation('/user-type-selection');
      }
    } catch (error) {
      console.warn('[Particle Auth Listener] Bridge error (clearing stale session):', error);
      toast({
          title: 'Sign-in error',
          description: 'An unexpected error occurred during sign-in. Please try again.',
          variant: 'destructive',
        });
        // Clear bridge lock so the user can retry
        try { sessionStorage.removeItem(`particle_bridge_${address}`); } catch { /* noop */ }
        disconnect();
    } finally {
      bridgingRef.current = false;
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, [isConnected, address, isFandomlyAuthed, getUserInfo, loginWithParticle, disconnect, setLocation, toast]);

  // Bridge when Particle social login connects and Fandomly is not yet authenticated
  useEffect(() => {
    if (isConnected && address && !isFandomlyAuthed && isParticleSocialLogin) {
      startTransition(() => {
        bridgeAuth();
      });
    }
  }, [isConnected, address, isFandomlyAuthed, isParticleSocialLogin, bridgeAuth]);

  // Handle Particle disconnect → log out of Fandomly too
  // Guard with ref to prevent re-entrant logout loop (H3 fix)
  useEffect(() => {
    if (!isConnected && isFandomlyAuthed && !logoutInProgressRef.current) {
      logoutInProgressRef.current = true;
      // Clear any bridge lock so the next login attempt can proceed
      if (address) {
        try { sessionStorage.removeItem(`particle_bridge_${address}`); } catch { /* noop */ }
      }
      Promise.resolve(fandomlyLogout()).finally(() => {
        logoutInProgressRef.current = false;
      });
    }
  }, [isConnected, isFandomlyAuthed, fandomlyLogout, address]);

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
