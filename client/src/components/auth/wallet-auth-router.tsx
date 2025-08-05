import { ReactNode } from "react";

interface WalletAuthRouterProps {
  children: ReactNode;
}

export default function WalletAuthRouter({ children }: WalletAuthRouterProps) {
  // Simplified - let Dynamic handle the authentication flow
  // and let individual pages handle their own routing logic
  return <>{children}</>;
}