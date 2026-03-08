/**
 * Patreon OAuth Callback Page
 * ⛔ Patreon auth source of truth: client/src/lib/patreon.ts (PatreonAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth redirect from Patreon in a popup window.
 * Exchanges auth code for token, saves connection, and notifies opener.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let patreonCallbackProcessed = false;

export default function PatreonCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || patreonCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    patreonCallbackProcessed = true;

    const run = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: {
        success: boolean;
        error?: string;
        displayName?: string;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`patreon_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Patreon Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'patreon-oauth-result', result },
            window.location.origin
          );
          window.close();
          return true;
        }
        if (state && state.startsWith('patreon_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[Patreon Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error('[Patreon Callback] OAuth error:', error);
          const errorMsg = errorDescription || error || 'Patreon authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({
            title: 'Patreon Connection Failed',
            description: errorMsg,
            variant: 'destructive',
          });
          setLocation('/creator-dashboard/social');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = sessionStorage.getItem('patreon_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        sessionStorage.removeItem('patreon_oauth_state');

        // Retrieve code verifier for PKCE
        const codeVerifier = sessionStorage.getItem('patreon_code_verifier');
        sessionStorage.removeItem('patreon_code_verifier');

        console.log('[Patreon Callback] Processing callback with server-side endpoint...');

        // Use server-side callback endpoint for complete token exchange + save
        const redirectUri = `${window.location.origin}/patreon-callback`;
        const callbackResponse = await fetch('/api/social/patreon/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
          credentials: 'include',
        });

        if (!callbackResponse.ok) {
          const errorText = await callbackResponse.text();
          throw new Error(`Connection failed: ${errorText}`);
        }

        const result = await callbackResponse.json();
        const displayName = result.username;

        console.log('[Patreon Callback] Connection saved successfully:', displayName);

        if (sendResultToOpener({ success: true, displayName })) return;

        // Fallback: show toast and redirect
        toast({
          title: 'Patreon Connected!',
          description: `Successfully connected ${displayName}`,
        });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[Patreon Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect Patreon';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        toast({
          title: 'Patreon Connection Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setLocation('/creator-dashboard/social');
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF424D] mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Patreon account...</p>
      </div>
    </div>
  );
}
