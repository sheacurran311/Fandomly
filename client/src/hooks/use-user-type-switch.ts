/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from '@tanstack/react-query';
import { fetchApi, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { FacebookSDKManager } from '@/lib/facebook';

interface SwitchUserTypeRequest {
  userId: string;
  userType: 'fan' | 'creator';
}

interface SwitchUserTypeResponse {
  message?: string;
  userType: 'fan' | 'creator';
  onboardingState?: {
    isCompleted: boolean;
  };
}

export function useUserTypeSwitch() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();

  return useMutation<SwitchUserTypeResponse, Error, SwitchUserTypeRequest>({
    mutationFn: async ({ userId, userType }: SwitchUserTypeRequest) => {
      console.log('Switching user type:', { userId, userType });

      // CRITICAL: Disconnect from Facebook first to prevent App ID conflicts
      console.log('Disconnecting from Facebook before user type switch...');
      await FacebookSDKManager.logoutFromFacebook();

      const response = await fetchApi('/api/auth/switch-user-type', {
        method: 'POST',
        body: JSON.stringify({ userId, userType }),
      });
      console.log('User type switch response:', response);
      return response as SwitchUserTypeResponse;
    },
    onSuccess: async (data) => {
      console.log('User type switch successful:', data);

      await refreshUser();

      await queryClient.invalidateQueries();

      toast({
        title: 'Account Type Changed',
        description:
          (data as any).message || `Successfully switched to ${(data as any).userType} account`,
        variant: 'default',
      });

      const newType = (data as any).userType;
      if (newType === 'creator') {
        if (!(data as any).onboardingState?.isCompleted) {
          setLocation('/creator-type-selection');
        } else {
          setLocation('/creator-dashboard');
        }
      } else if (newType === 'fan') {
        if (!(data as any).onboardingState?.isCompleted) {
          setLocation('/fan-onboarding/profile');
        } else {
          setLocation('/fan-dashboard');
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Error Switching Account Type',
        description: error.message || 'Failed to switch account type',
        variant: 'destructive',
      });
    },
  });
}
