import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "@/hooks/use-auth";

interface AuthRouterProps {
  children: React.ReactNode;
}

export default function AuthRouter({ children }: AuthRouterProps) {
  const { user: dynamicUser } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { user: userData, isLoading } = useAuth();

  useEffect(() => {
    console.log("AuthRouter - Dynamic user:", !!dynamicUser, "User data:", !!userData, "Loading:", isLoading);
    
    if (!dynamicUser) {
      // User not connected to Dynamic - stay on current page
      console.log("AuthRouter - No Dynamic user, staying on current page");
      return;
    }

    if (isLoading) {
      // Still loading user data
      console.log("AuthRouter - Loading user data...");
      return;
    }

    if (!userData) {
      // User connected to Dynamic but not registered in our system
      // Redirect to user type selection instead of auto-registration
      const currentPath = window.location.pathname;
      console.log("AuthRouter - User not registered, current path:", currentPath);
      if (currentPath !== '/user-type-selection') {
        console.log('AuthRouter - Redirecting to user type selection');
        setLocation('/user-type-selection');
      }
      return;
    }

    // User is authenticated and registered
    const currentPath = window.location.pathname;
    
    // Define routes behavior
    const protectedRoutes = ['/creator-dashboard', '/fan-dashboard'];
    const legacyOnboardingRoutes = ['/creator-onboarding'];
    const fanOnboardingRoutes = ['/fan-onboarding/profile', '/fan-onboarding/choose-creators'];
    const publicRoutes = ['/privacy-policy', '/data-deletion'];
    
    // Redirect legacy creator routes and old dashboards to appropriate dashboard
    if (protectedRoutes.includes(currentPath) || legacyOnboardingRoutes.includes(currentPath)) {
      if (userData?.userType === 'creator') {
        console.log(`Redirecting ${userData.userType} from ${currentPath} to creator dashboard`);
        setLocation('/creator-dashboard');
      } else {
        console.log(`Redirecting ${userData.userType} from ${currentPath} to fan dashboard`);
        setLocation('/fan-dashboard');
      }
      return;
    }
    
    // If fan and hasn't completed onboarding, allow fan onboarding routes
    if (userData?.userType === 'fan' && !userData?.onboardingState?.isCompleted) {
      if (!fanOnboardingRoutes.includes(currentPath)) {
        setLocation('/fan-onboarding/profile');
      }
      return;
    }

    // If user is on user type selection but already registered, redirect to appropriate dashboard
    if (currentPath === '/user-type-selection') {
      if (userData?.userType === 'creator') {
        console.log('Creator already registered, redirecting to creator dashboard');
        setLocation('/creator-dashboard');
      } else {
        console.log('Fan already registered, redirecting to fan dashboard');
        setLocation('/fan-dashboard');
      }
      return;
    }
    
    // Redirect authenticated users away from homepage to their appropriate dashboard
    if (currentPath === '/') {
      if (userData?.userType === 'creator') {
        console.log('Authenticated creator on homepage, redirecting to creator dashboard');
        setLocation('/creator-dashboard');
      } else {
        console.log('Authenticated fan on homepage, redirecting to fan dashboard');
        setLocation('/fan-dashboard');
      }
      return;
    }
    
    // Allow access to public routes like privacy policy
    
  }, [dynamicUser, userData, isLoading, setLocation]);

  return <>{children}</>;
}