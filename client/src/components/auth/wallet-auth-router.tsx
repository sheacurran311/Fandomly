import { useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface WalletAuthRouterProps {
  children: React.ReactNode;
}

export default function WalletAuthRouter({ children }: WalletAuthRouterProps) {
  const { user } = useDynamicContext();
  const [location, setLocation] = useLocation();
  const isAuthenticated = !!user;

  // Check if user has completed onboarding by checking if they exist as a creator
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["/api/auth/profile"],
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  useEffect(() => {
    // Don't redirect while loading user profile
    if (isLoading) return;

    // If user is authenticated but on home page, redirect to appropriate dashboard
    if (isAuthenticated && user && location === "/") {
      if (userProfile?.hasCompletedOnboarding) {
        // User has completed onboarding, redirect to dashboard
        setLocation("/dashboard");
      } else {
        // User hasn't completed onboarding, redirect to onboarding
        setLocation("/creator-onboarding");
      }
    }
  }, [isAuthenticated, user, userProfile, location, setLocation, isLoading]);

  return <>{children}</>;
}