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
    
    // Get current path and define routes at the top
    const currentPath = window.location.pathname;
    const protectedRoutes = ['/creator-dashboard', '/fan-dashboard'];
    const legacyOnboardingRoutes = ['/creator-onboarding'];
    const fanOnboardingRoutes = ['/fan-onboarding/profile', '/fan-onboarding/choose-creators'];
    const publicRoutes = ['/privacy-policy', '/data-deletion'];
    
    // Check if current path is a protected route (including sub-routes)
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    
    if (!dynamicUser) {
      // User not connected to Dynamic
      console.log("AuthRouter - No Dynamic user, checking if accessing protected route");
      
      // If trying to access protected route without authentication, redirect to home
      if (isProtectedRoute) {
        console.log("AuthRouter - Unauthenticated user trying to access protected route, redirecting to home");
        setLocation('/');
      }
      return;
    }

    if (isLoading) {
      // Still loading user data
      console.log("AuthRouter - Loading user data...");
      return;
    }

    if (!userData) {
      // User connected to Dynamic but not registered in our system
      console.log("AuthRouter - User not registered, current path:", currentPath);
      
      // If trying to access protected route, redirect to user type selection
      if (isProtectedRoute) {
        console.log('AuthRouter - Unregistered user accessing protected route, redirecting to user type selection');
        setLocation('/user-type-selection');
      } else if (currentPath !== '/user-type-selection' && currentPath !== '/') {
        console.log('AuthRouter - Redirecting to user type selection');
        setLocation('/user-type-selection');
      }
      return;
    }

    // User is authenticated and registered
    
    // Redirect legacy RBAC dashboard routes to appropriate user dashboards
    if (currentPath === '/rbac-dashboard' || currentPath === '/dashboard') {
      if (userData?.userType === 'creator') {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Creator needs onboarding, redirecting from RBAC to creator type selection');
          setLocation('/creator-type-selection');
        } else {
          console.log('Redirecting from RBAC to creator dashboard');
          setLocation('/creator-dashboard');
        }
      } else {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Fan needs onboarding, redirecting from RBAC to fan onboarding');
          setLocation('/fan-onboarding/profile');
        } else {
          console.log('Redirecting from RBAC to fan dashboard');
          setLocation('/fan-dashboard');
        }
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

    // If user is on user type selection but already registered, redirect based on onboarding status
    if (currentPath === '/user-type-selection') {
      if (userData?.userType === 'creator') {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Creator needs onboarding, redirecting to creator type selection');
          setLocation('/creator-type-selection');
        } else {
          console.log('Creator already onboarded, redirecting to creator dashboard');
          setLocation('/creator-dashboard');
        }
      } else {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Fan needs onboarding, redirecting to fan onboarding');
          setLocation('/fan-onboarding/profile');
        } else {
          console.log('Fan already onboarded, redirecting to fan dashboard');
          setLocation('/fan-dashboard');
        }
      }
      return;
    }
    
    // If creator hasn't completed onboarding, allow creator type selection and onboarding routes
    if (userData?.userType === 'creator' && !userData?.onboardingState?.isCompleted) {
      const allowedCreatorOnboardingRoutes = ['/creator-type-selection', '/creator-onboarding'];
      if (!allowedCreatorOnboardingRoutes.includes(currentPath)) {
        console.log('Creator needs onboarding, redirecting to creator type selection');
        setLocation('/creator-type-selection');
      }
      return;
    }
    
    // Redirect authenticated users away from homepage to their appropriate dashboard
    if (currentPath === '/') {
      if (userData?.userType === 'creator') {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Creator needs onboarding, redirecting to creator type selection');
          setLocation('/creator-type-selection');
        } else {
          console.log('Authenticated creator on homepage, redirecting to creator dashboard');
          setLocation('/creator-dashboard');
        }
      } else {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('Fan needs onboarding, redirecting to fan onboarding');
          setLocation('/fan-onboarding/profile');
        } else {
          console.log('Authenticated fan on homepage, redirecting to fan dashboard');
          setLocation('/fan-dashboard');
        }
      }
      return;
    }
    
    // Dashboard mismatch guards - auto-correct when user is on wrong dashboard for their type
    if (currentPath === '/fan-dashboard' && userData?.userType === 'creator' && userData?.onboardingState?.isCompleted) {
      console.log('Creator on Fan Dashboard - redirecting to Creator Dashboard');
      setLocation('/creator-dashboard');
      return;
    }
    
    if (currentPath === '/creator-dashboard' && userData?.userType === 'fan' && userData?.onboardingState?.isCompleted) {
      console.log('Fan on Creator Dashboard - redirecting to Fan Dashboard');
      setLocation('/fan-dashboard');
      return;
    }
    
    // Allow access to public routes like privacy policy
    
  }, [dynamicUser, userData, isLoading, setLocation]);

  return <>{children}</>;
}