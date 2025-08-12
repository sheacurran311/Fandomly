import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

interface AuthRouterProps {
  children: React.ReactNode;
}

export default function AuthRouter({ children }: AuthRouterProps) {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { getOnboardingRoute } = useOnboardingState();

  // Fetch user data from our backend when Dynamic user is available
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/auth/user", user?.userId],
    enabled: !!user?.userId,
    retry: false,
  });

  useEffect(() => {
    if (!user) {
      // User not connected to Dynamic - stay on current page
      return;
    }

    if (isLoading) {
      // Still loading user data
      return;
    }

    if (!userData) {
      // User connected to Dynamic but not registered in our system
      // This should trigger registration automatically via the useAuth hook
      return;
    }

    // User is authenticated and we have their data
    const { userType, onboardingState } = userData;

    // Determine where user should be redirected based on their onboarding state
    const targetRoute = getOnboardingRoute(userType, onboardingState);
    
    // Get current path
    const currentPath = window.location.pathname;
    
    // Define protected routes that require completion
    const protectedRoutes = ['/creator-dashboard', '/fan-dashboard', '/rbac-dashboard'];
    const onboardingRoutes = ['/creator-onboarding', '/fan-onboarding'];
    
    // If user is on a protected route but hasn't completed onboarding, redirect
    if (protectedRoutes.includes(currentPath) && !onboardingState.isCompleted) {
      console.log(`Redirecting from protected route ${currentPath} to onboarding ${targetRoute}`);
      setLocation(targetRoute);
      return;
    }
    
    // If user has completed onboarding but is on an onboarding route, redirect to dashboard
    if (onboardingRoutes.includes(currentPath) && onboardingState.isCompleted) {
      const dashboardRoute = userType === "creator" ? "/creator-dashboard" : "/fan-dashboard";
      console.log(`Redirecting from onboarding route ${currentPath} to dashboard ${dashboardRoute}`);
      setLocation(dashboardRoute);
      return;
    }
    
    // If user is on home page and hasn't started onboarding, they can stay
    // If user is on home page and has completed onboarding, they can stay (they might want to browse)
    
  }, [user, userData, isLoading, setLocation, getOnboardingRoute]);

  return <>{children}</>;
}