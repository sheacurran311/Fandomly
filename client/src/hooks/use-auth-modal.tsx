import { createContext, useContext, ReactNode, useCallback } from 'react';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';

interface AuthModalContextType {
  openAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

/**
 * AuthModalProvider — delegates to Particle ConnectKit.
 *
 * `openAuthModal()` programmatically clicks the Particle ConnectButton
 * rendered in the Navigation bar. This keeps the same API for all consumers
 * (auth-router, find-creators, etc.) without conditional hooks.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const openAuthModal = useCallback(() => {
    if (isParticleAuthEnabled()) {
      // Click the Particle ConnectButton rendered in Navigation
      const btn = document.querySelector<HTMLElement>('[data-particle-connect-btn]');
      if (btn) {
        btn.click();
        return;
      }
    }
    // Fallback: navigate to login page
    window.location.href = '/login';
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>{children}</AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    return {
      openAuthModal: () => {
        console.warn('[useAuthModal] Provider not ready');
      },
    };
  }
  return context;
}
