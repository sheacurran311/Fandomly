/**
 * Instagram OAuth Callback Handler Hook
 * Extracted from creator-dashboard.tsx for better modularity
 * Handles the Instagram OAuth flow completion
 */

import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import InstagramSDKManager from '@/lib/instagram';

interface UseInstagramOAuthCallbackOptions {
  userId: string | undefined;
  userType: string | undefined;
  completeConnection: (code: string, state: string) => Promise<void>;
  enabled?: boolean;
}

export function useInstagramOAuthCallback({
  userId,
  userType,
  completeConnection,
  enabled = true,
}: UseInstagramOAuthCallbackOptions) {
  useEffect(() => {
    if (!enabled || userType !== 'creator') {
      return;
    }

    const handleInstagramCallback = async () => {
      // Add a small delay to ensure URL is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[Instagram OAuth] Full URL:', window.location.href);
      
      // Check for parameters in both search and hash
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const code = searchParams.get('code') || hashParams.get('code');
      const state = searchParams.get('state') || hashParams.get('state');
      const error = searchParams.get('error') || hashParams.get('error');

      // Check if this looks like an Instagram callback URL structure
      const hasInstagramIndicators = 
        window.location.href.includes('code=') || 
        window.location.href.includes('error=') ||
        (state && state.includes('instagram'));

      // Only process if we have Instagram callback parameters
      if (!code && !error && !hasInstagramIndicators) {
        return;
      }

      console.log('[Instagram OAuth] Processing callback');

      if (error) {
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
        handleOAuthError(error, errorDescription);
        return;
      }

      if (code) {
        await handleOAuthSuccess(code, state, completeConnection);
      }
    };

    handleInstagramCallback();
  }, [userId, userType, enabled, completeConnection]);
}

function handleOAuthError(error: string, errorDescription: string | null) {
  // If opened in popup, communicate result to parent
  if (window.opener) {
    console.log('[Instagram OAuth] Communicating error to parent window');
    window.opener.postMessage({
      type: 'instagram-oauth-result',
      result: {
        success: false,
        error: errorDescription || error
      }
    }, window.location.origin);
    
    // Store result in parent window for fallback
    (window.opener as any).instagramCallbackData = {
      success: false,
      error: errorDescription || error
    };
    
    // Close the popup after a short delay
    setTimeout(() => window.close(), 500);
    return;
  }

  // Show error in main window
  toast({
    title: "Instagram Connection Failed",
    description: errorDescription || error,
    variant: "destructive"
  });

  // Clean up URL
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('code');
  cleanUrl.searchParams.delete('state');
  cleanUrl.searchParams.delete('error');
  cleanUrl.searchParams.delete('error_description');
  cleanUrl.hash = '';
  window.history.replaceState({}, document.title, cleanUrl.toString());
}

async function handleOAuthSuccess(
  code: string, 
  state: string | null,
  completeConnection: (code: string, state: string) => Promise<void>
) {
  console.log('[Instagram OAuth] Success - processing code');

  // Use the stored state if available (for popup flow)
  const storedState = localStorage.getItem('instagram_oauth_state') || '';
  const effectiveState = state || storedState;

  // Clear stored state
  localStorage.removeItem('instagram_oauth_state');

  // Check if we're in a popup
  if (window.opener) {
    console.log('[Instagram OAuth] Popup detected - communicating with parent');
    
    try {
      // Try the SDK callback handler first
      const sdkManager = InstagramSDKManager.getInstance();
      await sdkManager.handleOAuthCallback({
        code,
        state: effectiveState,
        redirectUri: `${window.location.origin}/creator-dashboard`
      });
      
      // Success! Communicate to parent
      window.opener.postMessage({
        type: 'instagram-oauth-result',
        result: { 
          success: true,
          code,
          state: effectiveState
        }
      }, window.location.origin);

      // Store in parent for fallback
      (window.opener as any).instagramCallbackData = {
        success: true,
        code,
        state: effectiveState
      };

      // Close popup
      setTimeout(() => window.close(), 500);
    } catch (error) {
      console.error('[Instagram OAuth] Popup handler error:', error);
      
      window.opener.postMessage({
        type: 'instagram-oauth-result',
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, window.location.origin);

      setTimeout(() => window.close(), 500);
    }
    return;
  }

  // Main window flow
  try {
    const sdkManager = InstagramSDKManager.getInstance();
    await sdkManager.handleOAuthCallback({
      code,
      state: effectiveState,
      redirectUri: `${window.location.origin}/creator-dashboard`
    });

    await completeConnection(code, effectiveState);

    toast({
      title: "Instagram Connected!",
      description: "Your Instagram account has been connected successfully.",
    });
  } catch (error) {
    console.error('[Instagram OAuth] Main window error:', error);
    toast({
      title: "Connection Failed",
      description: error instanceof Error ? error.message : "Failed to connect Instagram",
      variant: "destructive"
    });
  } finally {
    // Clean up URL
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('code');
    cleanUrl.searchParams.delete('state');
    cleanUrl.hash = '';
    window.history.replaceState({}, document.title, cleanUrl.toString());
  }
}

export default useInstagramOAuthCallback;
