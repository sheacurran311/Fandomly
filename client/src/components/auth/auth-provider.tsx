import { ReactNode } from "react";
import { AuthProvider as AuthContextProvider } from "@/contexts/auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Main authentication provider component
 * JWT-based auth system provider
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}

// Re-export the useAuth hook for convenience
export { useAuth, useAccessToken } from "@/contexts/auth-context";
export type { User, AuthContextType, SocialCallbackData, AuthResult } from "@/contexts/auth-context";
