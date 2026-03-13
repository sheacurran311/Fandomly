/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
// ⛔ Instagram auth source of truth: client/src/lib/facebook.ts (FacebookSDKManager)
// See rule: .cursor/rules/social-auth-single-source.mdc
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import InstagramSDKManager from '@/lib/instagram';
import { toast } from '@/hooks/use-toast';
import { Instagram, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export default function InstagramCallback() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { connectInstagram } = useInstagramConnection();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const errorParam = urlParams.get('error');

      // Helper to send result to opener with localStorage COOP fallback
      const sendResultToOpener = (result: {
        success: boolean;
        error?: string;
        [key: string]: any;
      }) => {
        if (state) {
          try {
            localStorage.setItem(`instagram_oauth_result_${state}`, JSON.stringify(result));
          } catch (e) {
            console.error('[Instagram Callback] Failed to store result in localStorage:', e);
          }
        }
        try {
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(
                { type: 'instagram-oauth-result', result },
                window.location.origin
              );
            } catch (e) {
              console.warn('[Instagram Callback] postMessage blocked (cross-origin), using localStorage fallback');
            }
            try {
              (window.opener as any).instagramCallbackData = result;
            } catch {
              // Cross-origin property assignment blocked — localStorage fallback already set above
            }
            window.close();
            return true;
          }
        } catch {
          // window.opener/.closed access blocked by COOP — fall through to localStorage close
        }
        if (state && state.startsWith('instagram_')) {
          window.close();
          return true;
        }
        return false;
      };

      try {
        // Handle authorization errors
        if (errorParam) {
          const errorDescription = urlParams.get('error_description');

          setStatus('error');
          setError(`Authorization failed: ${errorDescription || errorParam}`);

          if (sendResultToOpener({ success: false, error: errorDescription || errorParam })) return;

          toast({
            title: 'Instagram Authorization Failed',
            description: errorDescription || 'The authorization was cancelled or failed.',
            variant: 'destructive',
          });
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          setStatus('error');
          setError('Missing authorization code or state parameter');

          if (
            sendResultToOpener({
              success: false,
              error: 'Missing authorization code or state parameter',
            })
          )
            return;
          return;
        }

        console.log('[Instagram Callback] Processing authorization code');

        // Handle the callback using InstagramSDKManager
        const result = await InstagramSDKManager.handleCallback(code, state);

        if (result.success && result.user && result.accessToken) {
          setUserInfo(result.user);
          setStatus('success');

          // Use the global callback handler to update the Instagram connection context
          if ((window as any).handleInstagramConnectionResult) {
            console.log('[Instagram Callback] Using global callback handler');
            (window as any).handleInstagramConnectionResult(result);
          } else {
            console.log(
              '[Instagram Callback] Global callback handler not available, using direct connection'
            );
            try {
              await connectInstagram();
            } catch (err) {
              console.error('[Instagram Callback] Direct connection failed:', err);
            }
          }

          // Augment result with connectionData for parent-side saving
          const augmentedResult = {
            ...result,
            connectionData: {
              platform: 'instagram',
              platformUserId: result.user.id,
              platformUsername: result.user.username,
              platformDisplayName: result.user.name || result.user.username,
              accessToken: result.accessToken,
              profileData: {
                profile_picture_url: result.user.profile_picture_url,
                followers_count: result.user.followers_count,
                media_count: result.user.media_count,
                account_type: result.user.account_type,
              },
            },
          };

          if (sendResultToOpener(augmentedResult)) return;

          toast({
            title: 'Instagram Connected!',
            description: `Successfully connected @${result.user.username}`,
            duration: 4000,
          });

          setTimeout(() => {
            setLocation('/creator-dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setError(result.error || 'Failed to complete Instagram connection');

          if (sendResultToOpener(result)) return;

          toast({
            title: 'Instagram Connection Failed',
            description: result.error || 'An unexpected error occurred',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('[Instagram Callback] Error:', err);
        setStatus('error');
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMsg);

        if (sendResultToOpener({ success: false, error: errorMsg })) return;

        toast({
          title: 'Instagram Connection Error',
          description: 'Failed to process Instagram authorization',
          variant: 'destructive',
        });
      }
    };

    handleCallback();
  }, [setLocation]);

  const handleRetry = () => {
    setLocation('/creator-dashboard');
  };

  const handleGoBack = () => {
    setLocation('/creator-dashboard');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
              <Instagram className="h-8 w-8 text-pink-500" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting Instagram
            </CardTitle>
            <CardDescription>Processing your Instagram authorization...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Exchanging authorization code</p>
              <p>• Fetching account information</p>
              <p>• Setting up messaging permissions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success' && userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-green-600">Instagram Connected!</CardTitle>
            <CardDescription>Your Instagram Business Account is now connected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {userInfo.profile_picture_url && (
                <img
                  src={userInfo.profile_picture_url}
                  alt={userInfo.username}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">@{userInfo.username}</p>
                {userInfo.name && <p className="text-sm text-muted-foreground">{userInfo.name}</p>}
                <p className="text-xs text-green-600">Business Account</p>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Redirecting to your dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-red-600">Connection Failed</CardTitle>
            <CardDescription>Failed to connect your Instagram account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Common solutions:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Make sure you have an Instagram Business Account</li>
                <li>Check that your account has messaging permissions</li>
                <li>Try connecting again</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
