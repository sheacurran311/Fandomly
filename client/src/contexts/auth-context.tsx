/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SOCIAL AUTH — CONSUMER ONLY, NOT A SOURCE OF TRUTH
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * This context delegates social login to source-of-truth modules. Do NOT add
 * OAuth URLs, scopes, popup logic, or provider-specific code here. Fix auth
 * bugs in the source files: twitter.ts, facebook.ts, social-integrations.ts,
 * google-auth.ts.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setAccessToken as setQueryClientToken } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Types
export interface User {
  id: string;
  email: string | null;
  username: string;
  userType: 'fan' | 'creator' | 'brand' | 'pending' | null; // 'pending' = new user hasn't selected type yet
  role: 'fandomly_admin' | 'customer_admin' | 'customer_end_user';
  profileData: any;
  onboardingState: any;
  avatar?: string;
  agencyId?: string | null;
  brandType?: string | null;
  tenantId?: string | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LinkRequiredResponse {
  linkRequired: true;
  existingProviders: string[];
  pendingLinkId: string;
  message: string;
}

export interface AuthContextType extends AuthState {
  // Actions
  login: (provider: 'google' | string) => Promise<void>;
  loginWithCallback: (provider: string, callbackData: SocialCallbackData) => Promise<AuthResult>;
  loginWithParticle: (
    particleToken: string,
    walletAddress: string,
    particleUuid?: string,
    userEmail?: string | null,
    userName?: string | null,
    userAvatar?: string | null
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  refreshUser: () => Promise<void>; // Reload user data from server
  confirmAccountLink: (
    pendingLinkId: string,
    provider: string,
    callbackData: SocialCallbackData
  ) => Promise<{ success: boolean; user?: any; message?: string }>;

  // Getters
  getAccessToken: () => string | null;

  // State for account linking flow
  linkRequired: LinkRequiredResponse | null;
  clearLinkRequired: () => void;
}

export interface SocialCallbackData {
  code?: string;
  access_token?: string;
  redirect_uri?: string;
  platform_user_id?: string;
  email?: string;
  username?: string;
  display_name?: string;
  profile_data?: any;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  isNewUser?: boolean;
  linkRequired?: boolean;
  existingProviders?: string[];
  pendingLinkId?: string;
  message?: string;
  error?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Token storage (in memory for security - not localStorage)
let accessTokenStorage: string | null = null;

// API base URL
const API_BASE = '';

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const [linkRequired, setLinkRequired] = useState<LinkRequiredResponse | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const queryClient = useQueryClient();

  // Update access token in memory and sync with queryClient
  const setAccessToken = useCallback((token: string | null) => {
    accessTokenStorage = token;
    setQueryClientToken(token); // Sync with queryClient for API calls
    setState((prev) => ({ ...prev, accessToken: token }));
    if (token) {
      try {
        // Clear session-expired flag but keep postAuthRedirect for the router to use
        sessionStorage.removeItem('auth:session-expired');
      } catch {
        // ignore
      }
    }
  }, []);

  // Get access token
  const getAccessToken = useCallback(() => {
    return accessTokenStorage;
  }, []);

  const handleRefreshFailure = useCallback(
    (reason?: string) => {
      setAccessToken(null);
      setState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired',
      }));
      try {
        const alreadyNotified = sessionStorage.getItem('auth:session-expired') === 'true';
        if (!alreadyNotified) {
          toast({
            title: 'Session expired',
            description: 'Please sign in again to continue.',
            variant: 'destructive',
          });
        }
        sessionStorage.setItem('auth:session-expired', 'true');
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason } }));
      } catch {
        // ignore
      }
    },
    [setAccessToken]
  );

  // Refresh token (deduped while in flight)
  const refreshToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Send cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleRefreshFailure('refresh_unauthorized');
            return;
          }
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        setAccessToken(data.accessToken);

        if (data.user) {
          setState((prev) => ({
            ...prev,
            user: data.user,
            isAuthenticated: true,
            error: null,
          }));
        }
      } catch (error) {
        console.error('[Auth] Token refresh error:', error);
        handleRefreshFailure('refresh_error');
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [handleRefreshFailure, setAccessToken]);

  // Check for an existing session on initial load.
  // Uses GET /api/auth/session which always returns 200, avoiding
  // noisy 401 errors in the browser console for unauthenticated visitors.
  const fetchCurrentUser = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
      });

      if (sessionResponse.ok) {
        const data = await sessionResponse.json();

        if (data.authenticated) {
          setAccessToken(data.accessToken);
          setState((prev) => ({
            ...prev,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
          return;
        }

        // No session — normal unauthenticated state
        console.log('[Auth] No existing session');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return;
      }
    } catch (error) {
      console.log('[Auth] Session check failed', error);
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
    }));
  }, [setAccessToken]);

  // Initialize auth state on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token every 20 minutes (assuming 24h token expiry)
    const interval = setInterval(
      () => {
        refreshToken();
      },
      20 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);

  // Listen for token expiration events from queryClient
  useEffect(() => {
    const onTokenExpired = () => {
      refreshToken();
    };
    window.addEventListener('auth:token-expired', onTokenExpired as EventListener);
    return () => {
      window.removeEventListener('auth:token-expired', onTokenExpired as EventListener);
    };
  }, [refreshToken]);

  // Login with provider — no userType parameter.
  // All users authenticate first, then choose their type on /user-type-selection.
  const login = useCallback(async (provider: 'google' | string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (provider === 'google') {
        // Server-driven OAuth: navigate to the server route which handles
        // the redirect_uri construction and Google redirect internally.
        // This avoids redirect_uri mismatches with dynamic hostnames (Replit, etc.)
        window.location.href = `${API_BASE}/api/auth/google`;
        return;
      } else {
        // For other social providers, they will use the popup flow
        // and call loginWithCallback after OAuth completion
        throw new Error(`Use loginWithCallback for ${provider} OAuth`);
      }
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
    }
  }, []);

  // Login with callback data (after OAuth redirect/popup)
  const loginWithCallback = useCallback(
    async (provider: string, callbackData: SocialCallbackData): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        let endpoint: string;
        let body: any;

        if (provider === 'google') {
          endpoint = `${API_BASE}/api/auth/google/callback`;
          body = {
            code: callbackData.code,
            redirect_uri: callbackData.redirect_uri,
          };
        } else {
          // Generic social auth callback
          endpoint = `${API_BASE}/api/auth/social/callback`;
          body = {
            provider,
            access_token: callbackData.access_token,
            platform_user_id: callbackData.platform_user_id,
            email: callbackData.email,
            username: callbackData.username,
            display_name: callbackData.display_name,
            profile_data: callbackData.profile_data,
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data: AuthResult = await response.json();

        // If the server returned an HTTP error, surface the actual error message
        if (!response.ok) {
          const serverMessage = data.message || data.error || `Server error ${response.status}`;
          console.error('[Auth] Server returned error:', response.status, serverMessage);
          throw new Error(serverMessage);
        }

        if (data.linkRequired) {
          // Account linking required
          setLinkRequired({
            linkRequired: true,
            existingProviders: data.existingProviders || [],
            pendingLinkId: data.pendingLinkId || '',
            message: data.message || 'Account linking required',
          });
          setState((prev) => ({ ...prev, isLoading: false }));
          return data;
        }

        if (!data.success) {
          throw new Error(data.message || 'Authentication failed');
        }

        // Success - update state
        setAccessToken(data.accessToken || null);
        setState((prev) => ({
          ...prev,
          user: data.user || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        // Invalidate queries to refetch user data
        queryClient.invalidateQueries();

        return data;
      } catch (error: any) {
        console.error('[Auth] Callback error:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Authentication failed',
        }));
        return { success: false, message: error.message };
      }
    },
    [setAccessToken, queryClient]
  );

  // Login with Particle Connect token (called after Particle modal completes)
  const loginWithParticle = useCallback(
    async (
      particleToken: string,
      walletAddress: string,
      particleUuid?: string,
      userEmail?: string | null,
      userName?: string | null,
      userAvatar?: string | null
    ): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(`${API_BASE}/api/auth/particle/callback`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            particleToken,
            walletAddress,
            particleUuid,
            userEmail,
            userName,
            userAvatar,
          }),
        });

        const data: AuthResult = await response.json();

        if (!response.ok) {
          const serverMessage = data.message || data.error || `Server error ${response.status}`;
          throw new Error(serverMessage);
        }

        if (!data.success) {
          throw new Error(data.message || 'Particle authentication failed');
        }

        // Success - update state (same as loginWithCallback)
        setAccessToken(data.accessToken || null);
        setState((prev) => ({
          ...prev,
          user: data.user || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        queryClient.invalidateQueries();
        return data;
      } catch (error: any) {
        console.error('[Auth] Particle login error:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Particle authentication failed',
        }));
        return { success: false, message: error.message };
      }
    },
    [setAccessToken, queryClient]
  );

  // Confirm account link — returns the linked user so callers can redirect appropriately
  const confirmAccountLink = useCallback(
    async (
      pendingLinkId: string,
      provider: string,
      callbackData: SocialCallbackData
    ): Promise<{ success: boolean; user?: any; message?: string }> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        let endpoint: string;
        let body: any;

        if (provider === 'google') {
          endpoint = `${API_BASE}/api/auth/google/link`;
          body = {
            pending_link_id: pendingLinkId,
            code: callbackData.code,
            redirect_uri: callbackData.redirect_uri,
          };
        } else {
          endpoint = `${API_BASE}/api/auth/social/link`;
          body = {
            pending_link_id: pendingLinkId,
            access_token: callbackData.access_token,
            provider,
            platform_user_id: callbackData.platform_user_id,
            profile_data: callbackData.profile_data,
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to link account');
        }

        setAccessToken(data.accessToken);
        setState((prev) => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
        setLinkRequired(null);

        queryClient.invalidateQueries();

        return { success: true, user: data.user };
      } catch (error: any) {
        console.error('[Auth] Link error:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to link account',
        }));
        return { success: false, message: error.message };
      }
    },
    [setAccessToken, queryClient]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }

    setAccessToken(null);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    setLinkRequired(null);

    // Clear all queries
    queryClient.clear();

    // Notify ParticleAuthListener to also disconnect the Particle session.
    // This prevents the auth bridge from re-authenticating on the next render
    // when Particle's session is still active after a Fandomly logout.
    try {
      window.dispatchEvent(new CustomEvent('auth:fandomly-logout'));
    } catch {
      // noop
    }
  }, [setAccessToken, queryClient]);

  // Clear link required state
  const clearLinkRequired = useCallback(() => {
    setLinkRequired(null);
  }, []);

  // Refresh user data from server (useful after updating user type, profile, etc.)
  const refreshUser = useCallback(async () => {
    if (!accessTokenStorage) {
      console.log('[Auth] No access token, cannot refresh user');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessTokenStorage}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh it
          await refreshToken();
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        user: data.user,
        error: null,
      }));

      // Invalidate queries to refetch data with new user state
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('[Auth] Refresh user error:', error);
    }
  }, [refreshToken, queryClient]);

  const value: AuthContextType = {
    ...state,
    login,
    loginWithCallback,
    loginWithParticle,
    logout,
    refreshToken,
    refreshUser,
    confirmAccountLink,
    getAccessToken,
    linkRequired,
    clearLinkRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to get just the access token (for API calls)
export function useAccessToken() {
  const context = useContext(AuthContext);
  return context?.getAccessToken() || null;
}

// Export the context for use in other components
export { AuthContext };
