import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";
import Home from "@/pages/home";
import { type AuthUser } from "@/hooks/useAuth";

export default function HomeRouter() {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();
  const isAuthenticated = !!user;

  // Query to check user data in our backend
  const { data: userData, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated && !!user?.userId,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      // Not authenticated, show landing page
      return;
    }

    if (isLoading) {
      // Still loading user data
      return;
    }

    if (!userData) {
      // User is authenticated with wallet but not in our database
      // Redirect to auth page for user type selection
      setLocation("/auth");
      return;
    }

    // User exists in our database, redirect based on their status
    const userType = userData.userType;
    const hasCompletedOnboarding = userData.hasCompletedOnboarding;

    if (userType === "creator") {
      if (!hasCompletedOnboarding) {
        // Creator hasn't completed onboarding
        setLocation("/creator-onboarding");
      } else {
        // Creator has completed onboarding
        setLocation("/creator-dashboard");
      }
    } else {
      // Fan user - always goes to fan dashboard
      setLocation("/fan-dashboard");
    }
  }, [isAuthenticated, user?.userId, userData, isLoading, setLocation]);

  // Show landing page for unauthenticated users or while loading
  if (!isAuthenticated || !user?.userId || (isAuthenticated && isLoading)) {
    return <Home />;
  }

  // This should rarely render as users get redirected
  return <Home />;
}