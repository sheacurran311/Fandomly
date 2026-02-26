import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AuthModal from '@/components/auth/auth-modal';

interface AuthModalContextType {
  isOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // No userType parameter — all users come through the same door.
  // They choose their type AFTER authenticating on /user-type-selection.
  const openAuthModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeAuthModal}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    // During HMR or when context is temporarily unavailable, return no-op functions
    // This prevents crashes during development hot reloads
    console.warn('[useAuthModal] Context not available - returning fallback. This is normal during HMR.');
    return {
      isOpen: false,
      openAuthModal: () => {
        console.warn('[useAuthModal] openAuthModal called but provider not ready');
      },
      closeAuthModal: () => {
        console.warn('[useAuthModal] closeAuthModal called but provider not ready');
      }
    };
  }
  return context;
}
