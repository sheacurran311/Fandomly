import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { fetchApi, getAuthHeaders } from '@/lib/queryClient';

export interface InstagramHandleState {
  isConnected: boolean;
  isSaving: boolean;
  isDisconnecting: boolean;
  isLoading: boolean;
  handle: string | null;
  error: string | null;
}

export interface UseInstagramHandleReturn extends InstagramHandleState {
  saveHandle: (handle: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for Instagram handle management
 * Since Instagram API only supports Business accounts, fans can manually add their handle
 */
export function useInstagramHandle(): UseInstagramHandleReturn {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<InstagramHandleState>({
    isConnected: false,
    isSaving: false,
    isDisconnecting: false,
    isLoading: true,
    handle: null,
    error: null,
  });

  // Stable reference for user ID to avoid re-render loops
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Check connection status from API
  const checkStatus = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await fetch('/api/social-connections/instagram', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.connected && data.connection) {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isLoading: false,
            handle: data.connection.platformUsername || null,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            handle: null,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          handle: null,
        }));
      }
    } catch (error) {
      console.error('[Instagram Handle Hook] Error checking status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check connection status',
      }));
    }
  }, []);

  // Initial status check
  useEffect(() => {
    if (user?.id) {
      checkStatus();
    }
  }, [user?.id, checkStatus]);

  // Save Instagram handle
  const saveHandle = useCallback(
    async (handle: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id || state.isSaving) {
        return { success: false, error: 'Not authenticated or already saving' };
      }

      // Client-side validation
      const trimmedHandle = handle.trim();
      if (!trimmedHandle) {
        return { success: false, error: 'Instagram handle is required' };
      }

      // Strip leading @ if present
      const cleanHandle = trimmedHandle.startsWith('@')
        ? trimmedHandle.substring(1)
        : trimmedHandle;

      // Validate format
      const instagramHandleRegex = /^[a-zA-Z0-9._]{1,30}$/;
      if (!instagramHandleRegex.test(cleanHandle)) {
        return {
          success: false,
          error:
            'Invalid Instagram handle. Must be 1-30 characters with only letters, numbers, underscores, and periods.',
        };
      }

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        const data = await fetchApi<{
          success: boolean;
          isNewConnection?: boolean;
          pointsAwarded?: number;
          error?: string;
        }>('/api/social-connections/instagram/handle', {
          method: 'POST',
          body: JSON.stringify({ handle: cleanHandle }),
        });

        if (data.success) {
          // Update state with saved handle
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isSaving: false,
            handle: cleanHandle,
            error: null,
          }));

          // Invalidate shared social connections cache
          invalidateSocialConnections();

          toast({
            title: 'Instagram Connected! 📸',
            description: data.isNewConnection
              ? `Successfully connected @${cleanHandle}${data.pointsAwarded ? ` (+${data.pointsAwarded} points)` : ''}`
              : `Successfully updated to @${cleanHandle}`,
            duration: 3000,
          });

          return { success: true };
        } else {
          const errorMessage = data.error || 'Failed to save Instagram handle';
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: errorMessage,
          }));

          toast({
            title: 'Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          });

          return { success: false, error: errorMessage };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMsg,
        }));

        toast({
          title: 'Connection Error',
          description: errorMsg,
          variant: 'destructive',
        });

        return { success: false, error: errorMsg };
      }
    },
    [user, state.isSaving, toast]
  );

  // Disconnect Instagram
  const disconnect = useCallback(async () => {
    if (!user?.id || state.isDisconnecting) return;

    setState((prev) => ({ ...prev, isDisconnecting: true }));

    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('instagram');

      if (result.success) {
        setState({
          isConnected: false,
          isSaving: false,
          isDisconnecting: false,
          isLoading: false,
          handle: null,
          error: null,
        });

        // Invalidate shared social connections cache
        invalidateSocialConnections();

        toast({
          title: 'Instagram Disconnected',
          description: 'Successfully disconnected from Instagram',
          duration: 3000,
        });
      } else {
        throw new Error(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('[Instagram Handle Hook] Error disconnecting:', error);
      setState((prev) => ({ ...prev, isDisconnecting: false }));

      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect from Instagram. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, state.isDisconnecting, toast]);

  return {
    ...state,
    saveHandle,
    disconnect,
    refresh: checkStatus,
  };
}
