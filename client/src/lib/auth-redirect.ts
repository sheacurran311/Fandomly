/**
 * Auth Redirect Utilities
 * 
 * Shared functions for determining where to redirect users after authentication
 * or social account linking based on their user type and onboarding state.
 */

export interface UserForRedirect {
  userType?: 'fan' | 'creator' | 'brand' | string | null;
  onboardingState?: {
    isCompleted?: boolean;
    currentStep?: number;
    totalSteps?: number;
    completedSteps?: string[];
  } | null;
  profileData?: {
    brandType?: string;
    [key: string]: any;
  } | null;
}

/**
 * Get the appropriate redirect URL after authentication (login/signup)
 * This handles new users, returning users, and onboarding state
 */
export function getPostAuthRedirect(user: UserForRedirect | null | undefined, isNewUser: boolean): string {
  // New user or no user type set (including 'pending') - go to user type selection
  if (isNewUser || !user?.userType || user.userType === 'pending') {
    return '/user-type-selection';
  }
  
  // Creator users
  if (user.userType === 'creator') {
    if (user.onboardingState?.isCompleted) {
      return '/creator-dashboard';
    }
    // Check if brand user (has brandType in profileData)
    return user.profileData?.brandType 
      ? '/brand-type-selection' 
      : '/creator-type-selection';
  }
  
  // Fan users
  if (user.userType === 'fan') {
    return user.onboardingState?.isCompleted 
      ? '/fan-dashboard' 
      : '/fan-onboarding/profile';
  }
  
  // Brand users (treated as creator on backend but may have different onboarding)
  if (user.userType === 'brand') {
    if (user.onboardingState?.isCompleted) {
      return '/creator-dashboard'; // Brands use creator dashboard
    }
    return '/brand-type-selection';
  }
  
  // Fallback
  return '/user-type-selection';
}

/**
 * Get the appropriate redirect URL after social account linking
 * This is for users who are already authenticated and just connecting a social account
 */
export function getSocialLinkingRedirect(userType: string | null | undefined): string {
  if (userType === 'fan') {
    return '/fan-dashboard/social';
  }
  // Creators and brands go to creator dashboard social section
  return '/creator-dashboard/social';
}

/**
 * Check if we can authenticate via refresh token
 * Returns the user data if authenticated, null otherwise
 */
export async function checkAuthState(): Promise<{ isAuthenticated: boolean; user?: UserForRedirect }> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        return {
          isAuthenticated: true,
          user: data.user,
        };
      }
    }
    
    return { isAuthenticated: false };
  } catch (error) {
    console.log('[Auth] No existing session');
    return { isAuthenticated: false };
  }
}

/**
 * Authenticate with social provider and get user data
 * Used when callback is not in popup mode and user needs to be authenticated
 */
export async function authenticateWithSocial(
  provider: string,
  socialData: {
    access_token: string;
    platform_user_id: string;
    email?: string;
    username?: string;
    display_name?: string;
    profile_data?: any;
  }
): Promise<{
  success: boolean;
  user?: UserForRedirect;
  accessToken?: string;
  isNewUser?: boolean;
  error?: string;
  linkRequired?: boolean;
  existingProviders?: string[];
  pendingLinkId?: string;
  message?: string;
}> {
  try {
    const response = await fetch('/api/auth/social/callback', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        access_token: socialData.access_token,
        platform_user_id: socialData.platform_user_id,
        email: socialData.email,
        username: socialData.username,
        display_name: socialData.display_name,
        profile_data: socialData.profile_data,
      }),
    });

    const data = await response.json();
    
    if (data.linkRequired) {
      return {
        success: false,
        linkRequired: true,
        existingProviders: data.existingProviders,
        pendingLinkId: data.pendingLinkId,
        message: data.message,
      };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Authentication failed',
      };
    }

    return {
      success: true,
      user: data.user,
      accessToken: data.accessToken,
      isNewUser: data.isNewUser,
    };
  } catch (error: any) {
    console.error('[Auth] Social authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
}

/**
 * Save a social connection for an authenticated user
 */
export async function saveSocialConnection(connectionData: {
  platform: string;
  platformUserId: string;
  platformUsername?: string;
  platformDisplayName?: string;
  accessToken: string;
  refreshToken?: string;
  profileData?: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/social-connections', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to save connection: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Social] Save connection error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save connection',
    };
  }
}
