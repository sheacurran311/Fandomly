import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

/**
 * Google OAuth callback page
 * Handles the redirect from Google OAuth and exchanges the code for tokens.
 * 
 * After auth, routes users based on their stored type:
 * - New users / pending type → /user-type-selection (ALWAYS)
 * - Existing creators → /creator-dashboard or /creator-type-selection
 * - Existing fans → /fan-dashboard or /fan-onboarding/profile
 */
export default function GoogleCallback() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { loginWithCallback, confirmAccountLink, linkRequired, clearLinkRequired } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [showLinkConfirmation, setShowLinkConfirmation] = useState(false);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(search);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
          throw new Error(`Google auth error: ${errorParam}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Google');
        }

        console.log('[Google Callback] Processing callback with code');

        // Exchange code for tokens — no userType passed, backend creates with 'pending'
        const result = await loginWithCallback('google', {
          code,
          redirect_uri: `${window.location.origin}/auth/google/callback`,
        });

        if (result.linkRequired) {
          // Show link confirmation UI
          setShowLinkConfirmation(true);
          setIsProcessing(false);
          return;
        }

        if (result.success) {
          const user = result.user;
          
          // New user OR user without a type → MUST go to type selection
          if (result.isNewUser || !user?.userType || user.userType === 'pending') {
            setLocation('/user-type-selection');
          } else if (user?.userType === 'creator') {
            if (user.onboardingState?.isCompleted) {
              setLocation('/creator-dashboard');
            } else {
              setLocation('/creator-type-selection');
            }
          } else if (user?.userType === 'fan') {
            if (user.onboardingState?.isCompleted) {
              setLocation('/fan-dashboard');
            } else {
              setLocation('/fan-onboarding/profile');
            }
          } else {
            // Any other case → type selection
            setLocation('/user-type-selection');
          }
        } else {
          throw new Error(result.message || 'Authentication failed');
        }
      } catch (err: any) {
        console.error('[Google Callback] Error:', err);
        setError(err.message || 'An error occurred during authentication');
        setIsProcessing(false);
      }
    }

    handleCallback();
  }, [search, loginWithCallback, setLocation]);

  // Handle link confirmation
  const handleConfirmLink = async () => {
    if (!linkRequired) return;

    setIsProcessing(true);
    setError(null);

    try {
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (!code) {
        throw new Error('Authorization code no longer available');
      }

      await confirmAccountLink(linkRequired.pendingLinkId, 'google', {
        code,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
      });

      // Redirect to dashboard after successful link
      setLocation('/');
    } catch (err: any) {
      console.error('[Google Callback] Link error:', err);
      setError(err.message || 'Failed to link account');
      setIsProcessing(false);
    }
  };

  const handleCancelLink = () => {
    clearLinkRequired();
    setLocation('/');
  };

  // Show link confirmation dialog
  if (showLinkConfirmation && linkRequired) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <div className="bg-brand-card rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Account Found</h2>
          <p className="text-gray-300 mb-6">
            {linkRequired.message}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Existing login method: {linkRequired.existingProviders.join(', ')}
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={handleConfirmLink}
              disabled={isProcessing}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Linking...' : 'Link Accounts'}
            </button>
            <button
              onClick={handleCancelLink}
              disabled={isProcessing}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Show error state
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

  // Show loading state
  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
