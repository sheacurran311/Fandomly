/* eslint-disable @typescript-eslint/no-explicit-any */
// ⛔ Google auth source of truth: server/services/auth/google-auth.ts + server/routes/auth/google-routes.ts
// See rule: .cursor/rules/social-auth-single-source.mdc
import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

/**
 * Google OAuth callback page
 *
 * The server-driven flow works like this:
 *   1. GET /api/auth/google → Google consent → GET /api/auth/google/callback (server)
 *   2. Server exchanges the code, sets the session cookie, and redirects here with query params:
 *      - ?success=true&is_new_user=true/false   (on success)
 *      - ?error=...                              (on failure)
 *      - ?link_required=true&providers=...&pending_link_id=...  (account linking needed)
 *
 * This page reads those params, loads the session from the cookie the server just set,
 * and routes the user to the appropriate page.
 */
export default function GoogleCallback() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { refreshUser, refreshToken, isAuthenticated, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(search);
        const errorParam = params.get('error');
        const success = params.get('success');
        const isNewUser = params.get('is_new_user') === 'true';
        const linkRequired = params.get('link_required') === 'true';

        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        if (linkRequired) {
          // TODO: implement link confirmation UI if needed
          throw new Error(
            'An account with this email already exists with a different provider. ' +
            'Please sign in with your original method.'
          );
        }

        if (success !== 'true') {
          throw new Error('Authentication did not complete successfully');
        }

        if (cancelled) return;

        // The server set the refresh_token cookie during the redirect.
        // Call refreshToken to pick up the session and get an access token.
        await refreshToken();

        if (cancelled) return;

        // Give the auth state a moment to propagate, then route
        // based on the user's state.
        routeUser(isNewUser);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Google Callback] Error:', err);
        setError(err.message || 'An error occurred during authentication');
        setIsProcessing(false);
      }
    }

    function routeUser(isNewUser: boolean) {
      // After refreshToken, the auth context should be updated.
      // We use a short delay to let React state settle, then read the user.
      setTimeout(() => {
        if (cancelled) return;
        // Always route new users to type selection
        if (isNewUser) {
          setLocation('/user-type-selection');
          return;
        }
        // For existing users, the auth-router will handle routing
        // based on their userType/onboarding state. Send them to root.
        setLocation('/');
      }, 100);
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [search, refreshToken, refreshUser, setLocation]);

  // Once auth state updates and we're authenticated, route immediately
  useEffect(() => {
    if (isAuthenticated && user && isProcessing) {
      if (!user.userType || user.userType === 'pending') {
        setLocation('/user-type-selection');
      } else if (user.userType === 'creator') {
        if (user.onboardingState?.isCompleted) {
          setLocation('/creator-dashboard');
        } else {
          setLocation('/creator-type-selection');
        }
      } else if (user.userType === 'fan') {
        if (user.onboardingState?.isCompleted) {
          setLocation('/fan-dashboard');
        } else {
          setLocation('/fan-onboarding/profile');
        }
      } else {
        setLocation('/user-type-selection');
      }
    }
  }, [isAuthenticated, user, isProcessing, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <div className="bg-brand-card rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => setLocation('/')}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
