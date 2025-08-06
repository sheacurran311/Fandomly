import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";

export default function HomeRouter() {
  const [, setLocation] = useLocation();
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    hasUserRecord,
    isCreator,
    hasCompletedOnboarding,
    requiredStep 
  } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      // Not authenticated or still loading, show landing page
      return;
    }

    // Route based on authentication status and onboarding completion
    switch (requiredStep) {
      case "register":
        // User is wallet-authenticated but not in our database
        setLocation("/auth");
        break;
      case "onboarding":
        // Creator needs to complete onboarding
        setLocation("/creator-onboarding");
        break;
      case "dashboard":
        // User is fully set up, route to appropriate dashboard
        if (isCreator) {
          setLocation("/creator-dashboard");
        } else {
          setLocation("/fan-dashboard");
        }
        break;
      case "login":
      default:
        // Show landing page for unauthenticated users
        break;
    }
  }, [isAuthenticated, isLoading, requiredStep, isCreator, setLocation]);

  // Show landing page for unauthenticated users or while loading
  return <Home />;
}