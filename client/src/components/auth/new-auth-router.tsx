import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/hooks/use-auth-modal';
import { SocialProviders } from '@/contexts/social-providers';
import { migrateLocalStorageToDatabase } from '@/lib/social-connection-api';

interface AuthRouterProps {
  children: React.ReactNode;
}

/**
 * AuthRouter using the new JWT-based auth system
 * Handles route protection and redirects based on authentication state
 */
export default function NewAuthRouter({ children }: AuthRouterProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const lastAuthPromptPath = useRef<string | null>(null);

  // Reset auth prompt tracking when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      lastAuthPromptPath.current = null;
    }
  }, [isAuthenticated, user]);

  // Global PKCE handshake listener for Twitter OAuth popups
  useEffect(() => {
    function messageListener(event: MessageEvent) {
      try {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'twitter-pkce-request') {
          const reqState = (event.data &&
            (event.data as unknown as Record<string, unknown>).state) as string | undefined;
          let verifier: string | null = null;
          try {
            const rawMap = sessionStorage.getItem('twitter_pkce_map');
            const map: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
            verifier = (reqState && map[reqState]) || null;
          } catch {
            // noop
          }
          if (!verifier) {
            try {
              verifier = sessionStorage.getItem('twitter_pkce_verifier');
            } catch {
              // noop
            }
          }
          if (!verifier) {
            try {
              verifier =
                ((window as unknown as Record<string, unknown>).__twitterPkceVerifier as
                  | string
                  | null) || null;
            } catch {
              // noop
            }
          }
          try {
            (event.source as Window | null)?.postMessage(
              { type: 'twitter-pkce-response', state: reqState, verifier },
              event.origin
            );
          } catch {
            // noop
          }
        }
      } catch {
        // noop
      }
    }

    window.addEventListener('message', messageListener);
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  // Get current path and define routes
  const currentPath = window.location.pathname;
  const protectedRoutes = [
    '/creator-dashboard',
    '/fan-dashboard',
    '/admin-dashboard',
    '/agency-dashboard',
  ];
  const fanOnboardingRoutes = ['/fan-onboarding/profile', '/fan-onboarding/choose-creators'];
  // Simplified: creator onboarding is just type selection now (no multi-step wizard)
  const creatorOnboardingRoutes = ['/creator-type-selection'];
  const brandOnboardingRoutes = ['/brand-type-selection'];
  const publicRoutes = [
    '/privacy-policy',
    '/data-deletion',
    '/privacy/data-deletion',
    '/terms-of-service',
  ];
  const authCallbackRoutes = [
    '/auth/google/callback',
    '/instagram-callback',
    '/tiktok-callback',
    '/x-callback',
    '/youtube-callback',
    '/spotify-callback',
    '/discord-callback',
    '/twitch-callback',
    '/apple-music-callback',
  ];

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) => currentPath.startsWith(route));
  const isAuthCallbackRoute = authCallbackRoutes.includes(currentPath);
  const _isPublicRoute = publicRoutes.includes(currentPath);

  // Migrate localStorage social connections to database once on authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      const migrationKey = `social_migration_done_${user.id}`;
      const hasMigrated = sessionStorage.getItem(migrationKey);

      if (!hasMigrated) {
        migrateLocalStorageToDatabase().then(() => {
          sessionStorage.setItem(migrationKey, 'true');
          console.log('[Auth] Social connections migration completed');
        });
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Only skip redirects for actual OAuth callback routes, not based on window.opener
    // (window.opener can be set from external links and cause false positives)
    if (isAuthCallbackRoute) {
      console.log('[AuthRouter] OAuth callback route detected; skipping redirects');
      return;
    }

    console.log('[AuthRouter] Auth state:', {
      isAuthenticated,
      isLoading,
      userType: user?.userType,
      onboardingCompleted: user?.onboardingState?.isCompleted,
      currentPath,
    });

    // Expose current app user type for popup OAuth state tagging
    try {
      (window as unknown as Record<string, unknown>).__userType = user?.userType || null;
    } catch {
      // noop
    }

    // Check loading state FIRST before any redirects
    if (isLoading) {
      console.log('[AuthRouter] Loading auth state...');
      return;
    }

    // Not authenticated
    if (!isAuthenticated || !user) {
      console.log('[AuthRouter] Not authenticated');

      // For protected dashboard routes, redirect to home (don't prompt modal here - let home page handle it)
      if (isProtectedRoute) {
        console.log(
          '[AuthRouter] Unauthenticated user accessing protected route, redirecting to home'
        );
        try {
          sessionStorage.setItem('postAuthRedirect', currentPath);
        } catch {
          // noop
        }
        setLocation('/');
        return;
      }

      // For onboarding routes, prompt login modal so user can continue onboarding
      const isOnboardingRoute =
        fanOnboardingRoutes.includes(currentPath) ||
        creatorOnboardingRoutes.includes(currentPath) ||
        brandOnboardingRoutes.includes(currentPath);
      if (isOnboardingRoute && lastAuthPromptPath.current !== currentPath) {
        lastAuthPromptPath.current = currentPath;
        try {
          sessionStorage.setItem('postAuthRedirect', currentPath);
        } catch {
          // noop
        }
        openAuthModal();
      }
      return;
    }

    // ===== IRON WALL: Users without a type MUST go to /user-type-selection =====
    // This check runs BEFORE any other redirect (postAuthRedirect, dashboard routing, etc.)
    // 'pending' = DB default for new users; null/undefined = legacy edge case
    if (!user.userType || user.userType === 'pending') {
      if (currentPath !== '/user-type-selection') {
        console.log(
          '[AuthRouter] User has no userType (pending), redirecting to user-type-selection'
        );
        // Clear any stored redirect — the user MUST choose their type first
        try {
          sessionStorage.removeItem('postAuthRedirect');
        } catch {
          // noop
        }
        setLocation('/user-type-selection');
      }
      return;
    }

    // User has a type — check for stored post-auth redirect
    try {
      const postAuthRedirect = sessionStorage.getItem('postAuthRedirect');
      if (postAuthRedirect && postAuthRedirect !== currentPath) {
        sessionStorage.removeItem('postAuthRedirect');
        setLocation(postAuthRedirect);
        return;
      }
    } catch {
      // noop
    }

    // Redirect legacy RBAC dashboard routes to appropriate user dashboards
    if (currentPath === '/rbac-dashboard' || currentPath === '/dashboard') {
      redirectToDashboard();
      return;
    }

    // Handle fan onboarding
    if (user.userType === 'fan' && !user.onboardingState?.isCompleted) {
      if (!fanOnboardingRoutes.includes(currentPath)) {
        // Resume from where the user left off, or start at profile
        const resumeRoute = user.onboardingState?.lastOnboardingRoute || '/fan-onboarding/profile';
        const validResume = fanOnboardingRoutes.includes(resumeRoute)
          ? resumeRoute
          : '/fan-onboarding/profile';
        setLocation(validResume);
      }
      return;
    }

    // If user already has a type but is on the type selection page, redirect to their dashboard
    // (pending users were already caught by the iron wall above)
    if (currentPath === '/user-type-selection') {
      redirectToDashboard();
      return;
    }

    // Handle creator routing - simplified: no more multi-step onboarding checks
    // A creator who has selected their type (has a creator record) always goes to dashboard.
    // A creator who hasn't selected their type yet goes to creator-type-selection.
    if (user.userType === 'creator') {
      // Check if creator has completed type selection (creator record exists)
      // The new set-creator-type endpoint sets onboardingState.isCompleted = true,
      // so we use that as a proxy for "has a creator record".
      // Also check for the legacy case where onboarding was completed via old flow.
      const hasCreatorRecord = user.onboardingState?.isCompleted;

      if (!hasCreatorRecord) {
        // Brand users go to brand type selection
        const isBrandUser = user.profileData?.brandType || user.profileData?.isBrand;
        if (isBrandUser) {
          if (!brandOnboardingRoutes.includes(currentPath)) {
            setLocation('/brand-type-selection');
          }
        } else {
          // Regular creators go to type selection (the only "onboarding" step)
          if (!creatorOnboardingRoutes.includes(currentPath)) {
            setLocation('/creator-type-selection');
          }
        }
        return;
      }

      // Creator has a record - always allow dashboard access.
      // Redirect away from old onboarding routes to dashboard.
      if (currentPath === '/creator-onboarding' || currentPath === '/brand-onboarding') {
        setLocation('/creator-dashboard');
        return;
      }
    }

    // No redirect from / — authenticated users can stay on the landing page for testing

    // Dashboard mismatch guards - prevent creators on fan dashboard and vice versa
    if (currentPath.startsWith('/fan-dashboard') && user.userType === 'creator') {
      setLocation('/creator-dashboard');
      return;
    }

    // Disabled for hackathon demo — all users can access creator dashboard
    // if (currentPath.startsWith('/creator-dashboard') && user.userType === 'fan') {
    //   setLocation('/fan-dashboard');
    //   return;
    // }

    function redirectToDashboard() {
      // Pending users are already caught by the iron wall above, but safety net:
      if (!user!.userType || (user!.userType as string) === 'pending') {
        setLocation('/user-type-selection');
        return;
      }

      if (user!.userType === 'creator') {
        const hasCreatorRecord = user!.onboardingState?.isCompleted;
        if (!hasCreatorRecord) {
          const isBrandUser = user!.profileData?.brandType || user!.profileData?.isBrand;
          setLocation(isBrandUser ? '/brand-type-selection' : '/creator-type-selection');
        } else {
          // Always send to dashboard - no more onboarding gate
          setLocation('/creator-dashboard');
        }
      } else if (user!.userType === 'fan') {
        if (!user!.onboardingState?.isCompleted) {
          setLocation('/fan-onboarding/profile');
        } else {
          setLocation('/fan-dashboard');
        }
      } else {
        setLocation('/user-type-selection');
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- route arrays are stable constants
  }, [isAuthenticated, user, isLoading, setLocation, currentPath]);

  // Render-gate protected content to prevent 401 API calls before redirects
  if (isProtectedRoute && (!isAuthenticated || isLoading || !user)) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <SocialProviders>{children}</SocialProviders>;
}
