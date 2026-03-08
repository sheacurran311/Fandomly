import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import AuthModal from '@/components/auth/auth-modal';

/**
 * Login page - displays the auth modal
 * No userType parameter — all users come through the same door
 * and choose their type after authenticating on /user-type-selection.
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();

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

  // Handle close - redirect to home
  const handleClose = () => {
    setLocation('/');
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't show modal if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      <AuthModal isOpen={true} onClose={handleClose} />
    </div>
  );
}
