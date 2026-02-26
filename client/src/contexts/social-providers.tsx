import React, { ReactNode } from 'react';
import { InstagramConnectionProvider } from '@/contexts/instagram-connection-context';
import { useAuth } from '@/hooks/use-auth';

interface SocialProvidersProps {
  children: ReactNode;
}

export function SocialProviders({ children }: SocialProvidersProps) {
  const { user } = useAuth();

  // Facebook connection is now handled by the unified useFacebookConnection hook
  // (from use-social-connection.ts) and no longer needs a context provider.
  // Only Instagram still uses a context provider.

  if (user?.userType === 'creator') {
    return (
      <InstagramConnectionProvider>
        {children}
      </InstagramConnectionProvider>
    );
  }

  // For fans, unauthenticated users, or unknown types - no special providers needed
  // Facebook is handled by the factory hook, Instagram context is creator-only
  return <>{children}</>;
}
