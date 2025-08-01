import { ReactNode, useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = "/auth", 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, setShowAuthFlow } = useDynamicContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (requireAuth && !user) {
      // Show auth modal instead of redirecting
      setShowAuthFlow(true);
      // Also redirect to auth page as fallback
      setLocation(redirectTo);
    }
  }, [user, requireAuth, redirectTo, setShowAuthFlow, setLocation]);

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}