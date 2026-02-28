import { useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const ParticleConnectButton = lazy(() =>
  import('@particle-network/connectkit').then((mod) => ({
    default: mod.ConnectButton,
  }))
);

/**
 * Login page — renders the Particle ConnectButton for authentication.
 * Redirects authenticated users to their dashboard.
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
  const particleEnabled = isParticleAuthEnabled();

  // Redirect authenticated users based on their actual stored type
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.userType || user.userType === 'pending') {
        setLocation('/user-type-selection');
      } else if (user.userType === 'creator') {
        setLocation('/creator-dashboard');
      } else if (user.userType === 'fan') {
        setLocation('/fan-dashboard');
      } else {
        setLocation('/user-type-selection');
      }
    }
  }, [isAuthenticated, user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/fandomly2.png" alt="Fandomly" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Fandomly</h1>
          <p className="text-gray-400 text-sm">Sign in to access your dashboard</p>
        </div>

        {particleEnabled ? (
          <div
            data-particle-connect-btn
            className="[&_button]:w-full [&_button]:h-12 [&_button]:rounded-xl [&_button]:font-semibold"
          >
            <Suspense
              fallback={
                <Button
                  disabled
                  className="w-full h-12 bg-brand-primary/50 text-white/50 rounded-xl"
                >
                  Loading...
                </Button>
              }
            >
              <ParticleConnectButton label="Sign in with Fandomly" />
            </Suspense>
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm">
            Authentication is not configured. Please check your environment variables.
          </p>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          By signing in, you agree to our{' '}
          <Link href="/terms-of-service" className="text-brand-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy-policy" className="text-brand-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
