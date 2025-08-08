import { ReactNode } from "react";

interface WalletAuthRouterProps {
  children: ReactNode;
}

export default function WalletAuthRouter({ children }: WalletAuthRouterProps) {
  // Let Dynamic handle all authentication - no custom routing logic
  return <>{children}</>;
}