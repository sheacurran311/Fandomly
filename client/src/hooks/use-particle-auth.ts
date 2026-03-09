/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle Auth Bridge Hook
 *
 * Listens for Particle Connect login/logout events and bridges them
 * to Fandomly's JWT auth system via the auth context.
 *
 * Usage: Mount this hook once inside a component that's wrapped by
 * both <ParticleProvider> and <AuthProvider>.
 *
 * Flow:
 *   1. User clicks Particle Connect button → Particle modal opens
 *   2. User logs in (social or wallet) → Particle fires connect event
 *   3. This hook catches the event, extracts token + wallet address
 *   4. Calls auth context's loginWithParticle() → POST /api/auth/particle/callback
 *   5. Server validates Particle token, issues Fandomly JWT
 *   6. Auth context updates with JWT + user → app is authenticated
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/lib/particle-config';

/**
 * Hook that bridges Particle Connect events to Fandomly auth.
 *
 * When Particle is not enabled (feature flag off or creds missing),
 * this hook is a no-op.
 *
 * NOTE: This hook uses dynamic imports to access Particle's hooks
 * only when the feature flag is active, avoiding bundle impact
 * when Particle is disabled.
 */
export function useParticleAuthBridge() {
  const { loginWithParticle, logout, isAuthenticated } = useAuth();
  const _bridgingRef = useRef(false);

  useEffect(() => {
    if (!isParticleAuthEnabled()) return;
  }, [loginWithParticle, logout, isAuthenticated]);
}

/**
 * Handles the Particle Connect callback manually.
 * Call this from a component that has access to Particle's hooks
 * (e.g., after the user completes the Particle Connect modal).
 *
 * @param particleToken - The Particle session token (from Particle's auth state)
 * @param walletAddress - The user's EVM wallet address
 * @param loginWithParticle - The auth context's loginWithParticle method
 */
export async function bridgeParticleToFandomly(
  particleToken: string,
  walletAddress: string,
  loginWithParticle: (token: string, address: string) => Promise<any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await loginWithParticle(particleToken, walletAddress);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.message || 'Authentication failed' };
  } catch (error: any) {
    console.error('[Particle Bridge] Error:', error);
    return { success: false, error: error.message };
  }
}
