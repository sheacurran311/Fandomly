import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "@/hooks/use-auth";
import { SocialProviders } from '@/contexts/social-providers';
import { migrateLocalStorageToDatabase } from "@/lib/social-connection-api";

interface AuthRouterProps {
  children: React.ReactNode;
}

export default function AuthRouter({ children }: AuthRouterProps) {
  const { user: dynamicUser } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { user: userData, isLoading } = useAuth();

  // Global PKCE handshake listener for Twitter OAuth popups
  useEffect(() => {
    function messageListener(event: MessageEvent) {
      try {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'twitter-pkce-request') {
          const reqState = (event.data && (event.data as any).state) as string | undefined;
          let verifier: string | null = null;
          try {
            const rawMap = localStorage.getItem('twitter_pkce_map');
            const map: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
            verifier = (reqState && map[reqState]) || null;
          } catch {}
          if (!verifier) {
            try { verifier = localStorage.getItem('twitter_pkce_verifier'); } catch {}
          }
          if (!verifier) {
            try { verifier = (window as any).__twitterPkceVerifier || null; } catch {}
          }
          try {
            (event.source as Window | null)?.postMessage({ type: 'twitter-pkce-response', state: reqState, verifier }, event.origin);
          } catch {}
        }
      } catch {}
    }

    window.addEventListener('message', messageListener);
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  // Get current path and define routes (moved outside useEffect for render-gating)
  const currentPath = window.location.pathname;
  const protectedRoutes = ['/creator-dashboard', '/fan-dashboard'];
  const legacyOnboardingRoutes = ['/creator-onboarding'];
  const fanOnboardingRoutes = ['/fan-onboarding/profile', '/fan-onboarding/choose-creators'];
  const publicRoutes = ['/privacy-policy', '/data-deletion'];
  
  // Check if current path is a protected route (including sub-routes)
  const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

  // Migrate localStorage social connections to database once on authentication
  useEffect(() => {
    if (dynamicUser && userData) {
      // Run migration utility once per session
      const migrationKey = `social_migration_done_${userData.id}`;
      const hasMigrated = sessionStorage.getItem(migrationKey);
      
      if (!hasMigrated) {
        migrateLocalStorageToDatabase().then(() => {
          sessionStorage.setItem(migrationKey, 'true');
          console.log('✅ Social connections migration completed');
        });
      }
    }
  }, [dynamicUser, userData]);

  useEffect(() => {
    const isPopup = typeof window !== 'undefined' && !!(window as any).opener;
    const isOAuthRoute = currentPath === '/creator-dashboard' || currentPath === '/instagram-callback' || currentPath === '/x-callback';

    // Critical: When handling OAuth inside a popup, do NOT redirect.
    // Redirects here can strip query params (code/state) and prevent the popup from posting back to parent.
    if (isPopup && isOAuthRoute) {
      console.log('AuthRouter - Popup OAuth context detected; skipping redirects');
      return;
    }

    console.log("AuthRouter - Dynamic user:", !!dynamicUser, "User data:", !!userData, "Loading:", isLoading);
    console.log("AuthRouter - Current path:", currentPath);
    console.log("AuthRouter - Dynamic user details:", {
      userId: dynamicUser?.userId,
      firstName: dynamicUser?.firstName,
      alias: dynamicUser?.alias,
      hasVerifiedCredentials: !!dynamicUser?.verifiedCredentials?.length
    });
    console.log("AuthRouter - User data details:", {
      userType: userData?.userType,
      onboardingCompleted: userData?.onboardingState?.isCompleted,
      hasCompletedOnboarding: userData?.hasCompletedOnboarding
    });
    
    // Set Dynamic user ID in window for API requests (secure approach)
    if (dynamicUser?.userId) {
      (window as any).__dynamicUserId = dynamicUser.userId;
      console.log(`[Auth] Set Dynamic user ID: ${dynamicUser.userId}`);
    } else if (!isLoading && dynamicUser === null) {
      // Only clear if we're not loading and Dynamic user is explicitly null (logged out)
      (window as any).__dynamicUserId = null;
      console.log('[Auth] Cleared Dynamic user ID - user logged out');
    }
    // Don't clear during loading states or temporary undefined states

    // Expose current app user type for popup OAuth state tagging
    try {
      (window as any).__userType = userData?.userType || null;
    } catch {}
    
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
      console.log("AuthRouter - Dynamic user exists but no userData - checking if API call failed");
      
      // If trying to access protected route, redirect to user type selection
      if (isProtectedRoute) {
        console.log('AuthRouter - Unregistered user accessing protected route, redirecting to user type selection');
        setLocation('/user-type-selection');
      } else if (currentPath === '/') {
        console.log('AuthRouter - Unregistered user on homepage, redirecting to user type selection');
        setLocation('/user-type-selection');
      } else if (currentPath !== '/user-type-selection' && !publicRoutes.includes(currentPath)) {
        console.log('AuthRouter - Redirecting unregistered user to user type selection from:', currentPath);
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
      console.log('AuthRouter - Authenticated user on homepage, determining redirect...');
      console.log('AuthRouter - User type:', userData?.userType, 'Onboarding completed:', userData?.onboardingState?.isCompleted);
      
      // Check if we have Instagram callback parameters to preserve
      const hasInstagramCallback = window.location.search.includes('code=') || window.location.search.includes('state=instagram_');
      console.log('AuthRouter - Has Instagram callback params:', hasInstagramCallback, 'Search:', window.location.search);
      
      if (userData?.userType === 'creator') {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('AuthRouter - Creator needs onboarding, redirecting to creator type selection');
          setLocation('/creator-type-selection');
        } else {
          console.log('AuthRouter - Authenticated creator on homepage, redirecting to creator dashboard');
          // Preserve Instagram callback parameters if present
          const redirectUrl = hasInstagramCallback ? `/creator-dashboard${window.location.search}` : '/creator-dashboard';
          console.log('AuthRouter - Redirecting to:', redirectUrl);
          setLocation(redirectUrl);
        }
      } else if (userData?.userType === 'fan') {
        if (!userData?.onboardingState?.isCompleted) {
          console.log('AuthRouter - Fan needs onboarding, redirecting to fan onboarding');
          setLocation('/fan-onboarding/profile');
        } else {
          console.log('AuthRouter - Authenticated fan on homepage, redirecting to fan dashboard');
          setLocation('/fan-dashboard');
        }
      } else {
        console.log('AuthRouter - User has no userType, redirecting to user type selection');
        setLocation('/user-type-selection');
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

  // Render-gate protected content to prevent 401 API calls before redirects
  if (isProtectedRoute && (!dynamicUser || isLoading || !userData)) {
    // Show loading spinner while authentication is being checked or redirecting
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SocialProviders>
      {children}
    </SocialProviders>
  );
}