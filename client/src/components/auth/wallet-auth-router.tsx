import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface WalletAuthRouterProps {
  children: React.ReactNode;
}

export default function WalletAuthRouter({ children }: WalletAuthRouterProps) {
  const { 
    requiredStep, 
    isLoading, 
    isAuthenticated,
    needsRegistration, 
    needsOnboarding, 
    canAccessDashboard,
    isCreator,
    user 
  } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Skip routing for public pages
    const publicPaths = ['/privacy-policy', '/data-deletion'];
    if (publicPaths.includes(location)) return;

    console.log("Auth routing - Current state:", {
      location,
      requiredStep,
      isAuthenticated,
      needsRegistration,
      needsOnboarding,
      canAccessDashboard,
      isCreator,
      hasUser: !!user
    });

    switch (requiredStep) {
      case "login":
        // Keep user on home page if not authenticated
        break;
      case "register":
        // User is authenticated but not in our database - send to auth page to register
        if (location !== "/auth") {
          console.log("Redirecting to /auth for registration");
          setLocation("/auth");
        }
        break;
      case "onboarding":
        // Creator needs to complete onboarding
        if (location !== "/creator-onboarding") {
          console.log("Redirecting to /creator-onboarding");
          setLocation("/creator-onboarding");
        }
        break;
      case "dashboard":
        // User is fully set up - redirect from home to appropriate dashboard
        if (location === "/" || location === "/auth" || location === "/creator-onboarding") {
          const dashboardPath = isCreator ? "/creator-dashboard" : "/fan-dashboard";
          console.log(`Redirecting to ${dashboardPath}`);
          setLocation(dashboardPath);
        }
        break;
    }
  }, [requiredStep, location, setLocation, isLoading, isCreator, isAuthenticated, needsRegistration, needsOnboarding, canAccessDashboard, user]);

  return <>{children}</>;
}