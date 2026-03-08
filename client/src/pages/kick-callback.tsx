/**
 * Kick OAuth Callback Page
 * ⛔ Kick auth source of truth: client/src/lib/kick.ts (KickAPI)
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * Handles the OAuth redirect from Kick in a popup window.
 * Exchanges auth code for token (with PKCE), saves connection, and notifies opener.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Global flag to prevent duplicate execution across multiple renders/remounts
let kickCallbackProcessed = false;

export default function KickCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (ranRef.current || kickCallbackProcessed) {
      return;
    }
    ranRef.current = true;
    kickCallbackProcessed = true;

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
        username?: string;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`kick_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Kick Callback] Failed to store result in localStorage:', e);
          }
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'kick-oauth-result', result }, window.location.origin);
          window.close();
          return true;
        }
        if (state && state.startsWith('kick_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        console.log('[Kick Callback] Processing OAuth callback', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
        });

        // Handle OAuth error
        if (error) {
          console.error('[Kick Callback] OAuth error:', error);
          const errorMsg = errorDescription || error || 'Kick authorization failed';
          if (sendResultToOpener({ success: false, error: errorMsg })) return;
          toast({ title: 'Kick Connection Failed', description: errorMsg, variant: 'destructive' });
          setLocation('/creator-dashboard/social');
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Validate CSRF state
        const savedState = sessionStorage.getItem('kick_oauth_state');
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        sessionStorage.removeItem('kick_oauth_state');

        // Retrieve PKCE code verifier
        const codeVerifier = sessionStorage.getItem('kick_code_verifier');
        sessionStorage.removeItem('kick_code_verifier');

        console.log('[Kick Callback] Processing callback with server-side endpoint...');

        // Use server-side callback endpoint for complete token exchange + save
        const redirectUri = `${window.location.origin}/kick-callback`;
        const callbackResponse = await fetch('/api/social/kick/callback', {
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
        const username = result.username;

        console.log('[Kick Callback] Connection saved successfully:', username);
        if (sendResultToOpener({ success: true, username })) return;

        // Fallback: show toast and redirect
        toast({ title: 'Kick Connected!', description: `Successfully connected ${username}` });
        setLocation('/creator-dashboard/social');
      } catch (error) {
        console.error('[Kick Callback] Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect Kick';
        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        toast({ title: 'Kick Connection Failed', description: errorMsg, variant: 'destructive' });
        setLocation('/creator-dashboard/social');
      }
    };

    run();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Kick account...</p>
      </div>
    </div>
  );
}
