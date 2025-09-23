import React, { ReactNode } from 'react';
import { FacebookConnectionProvider } from '@/contexts/facebook-connection-context';
import { FanFacebookConnectionProvider } from '@/contexts/fan-facebook-context';
import { InstagramConnectionProvider } from '@/contexts/instagram-connection-context';
import { useAuth } from '@/hooks/use-auth';

interface SocialProvidersProps {
  children: ReactNode;
}

export function SocialProviders({ children }: SocialProvidersProps) {
  const { user } = useAuth();

  // Wrap with appropriate providers based on user type
  if (user?.userType === 'creator') {
    return (
      <FacebookConnectionProvider>
        <InstagramConnectionProvider>
          {children}
        </InstagramConnectionProvider>
      </FacebookConnectionProvider>
    );
  }

  if (user?.userType === 'fan') {
    return (
      <FanFacebookConnectionProvider>
        {children}
      </FanFacebookConnectionProvider>
    );
  }

  // For unauthenticated users or unknown user types, provide all contexts
  return (
    <FacebookConnectionProvider>
      <FanFacebookConnectionProvider>
        <InstagramConnectionProvider>
          {children}
        </InstagramConnectionProvider>
      </FanFacebookConnectionProvider>
    </FacebookConnectionProvider>
  );
}
