import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InstagramSDKManager from '@/lib/instagram';
import { toast } from '@/hooks/use-toast';
import { 
  Instagram, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ArrowLeft 
} from 'lucide-react';
import {
  getPostAuthRedirect,
  getSocialLinkingRedirect,
  checkAuthState,
  authenticateWithSocial,
  saveSocialConnection,
} from '@/lib/auth-redirect';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';

export default function InstagramCallback() {
  const ranRef = useRef(false);
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'link_required'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [linkInfo, setLinkInfo] = useState<{ existingProviders: string[]; message: string } | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const errorParam = urlParams.get('error');

        console.log('[Instagram Callback] Processing callback:', { hasCode: !!code, hasState: !!state, hasError: !!errorParam });

        // Handle authorization errors
        if (errorParam) {
          const errorReason = urlParams.get('error_reason');
          const errorDescription = urlParams.get('error_description');
          
          // If opened in popup, communicate result to parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'instagram-oauth-result',
              result: {
                success: false,
                error: errorDescription || errorParam
              }
            }, window.location.origin);
            window.close();
            return;
          }
          
          setStatus('error');
          setError(`Authorization failed: ${errorDescription || errorParam}`);
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          // If opened in popup, communicate result to parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'instagram-oauth-result',
              result: {
                success: false,
                error: 'Missing authorization code or state parameter'
              }
            }, window.location.origin);
            window.close();
            return;
          }
          
          setStatus('error');
          setError('Missing authorization code or state parameter');
          return;
        }

        console.log('[Instagram Callback] Processing authorization code');

        // Handle the callback using InstagramSDKManager
        const result = await InstagramSDKManager.handleCallback(code, state);

        // POPUP FLOW: If this is a popup, send result to parent and close
        if (window.opener) {
          console.log('[Instagram Callback] Communicating result to parent window');
          
          // Augment result with connectionData for parent-side saving (matches Discord/Twitch pattern)
          let augmentedResult = result;
          if (result.success && result.accessToken && result.user) {
            const connectionData = {
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
            };
            augmentedResult = { ...result, connectionData } as typeof result & { connectionData?: unknown };
          }
          
          window.opener.postMessage({
            type: 'instagram-oauth-result',
            result: augmentedResult
          }, window.location.origin);
          
          // Store result in parent window for fallback
          (window.opener as any).instagramCallbackData = augmentedResult;
          
          window.close();
          return;
        }

        // DIRECT NAVIGATION FLOW
        console.log('[Instagram Callback] Direct navigation detected, handling auth/linking flow...');

        if (!result.success || !result.accessToken || !result.user) {
          setStatus('error');
          setError(result.error || 'Failed to complete Instagram connection');
          return;
        }

        // Store user info for success display
        setUserInfo(result.user);

        // Check if user is already authenticated
        const authCheck = await checkAuthState();
        console.log('[Instagram Callback] Auth check result:', authCheck);

        if (!authCheck.isAuthenticated) {
          // AUTHENTICATION FLOW: User is not logged in, authenticate with social
          console.log('[Instagram Callback] User not authenticated, initiating social auth...');
          
          const authResult = await authenticateWithSocial('instagram', {
            access_token: result.accessToken,
            platform_user_id: result.user.id,
            email: undefined, // Instagram doesn't provide email
            username: result.user.username,
            display_name: result.user.name || result.user.username,
            profile_data: {
              profile_picture_url: result.user.profile_picture_url,
              followers_count: result.user.followers_count,
              media_count: result.user.media_count,
              account_type: result.user.account_type,
            },
          });

          console.log('[Instagram Callback] Social auth result:', authResult);

          if (authResult.linkRequired) {
            setStatus('link_required');
            setLinkInfo({
              existingProviders: authResult.existingProviders || [],
              message: authResult.message || 'An account with this email already exists.',
            });
            return;
          }

          if (!authResult.success) {
            setStatus('error');
            setError(authResult.error || 'Authentication failed');
            return;
          }

          // Success - redirect based on user state
          setStatus('success');
          toast({
            title: "Welcome to Fandomly!",
            description: `Successfully signed in as @${result.user.username}`,
            duration: 4000
          });

          const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
          console.log('[Instagram Callback] Auth successful, redirecting to:', redirectUrl);
          
          setTimeout(() => {
            window.location.replace(redirectUrl);
          }, 1500);
          return;
        }

        // SOCIAL LINKING FLOW: User is already authenticated, save the connection
        console.log('[Instagram Callback] User already authenticated, saving social connection...');

        const saveResult = await saveSocialConnection({
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
        });

        if (!saveResult.success) {
          console.error('[Instagram Callback] Failed to save connection:', saveResult.error);
          // Continue to show success anyway - user is authenticated
        }

        // Invalidate social connections cache so all components get fresh data
        invalidateSocialConnections();

        setStatus('success');
        toast({
          title: "Instagram Connected!",
          description: `Successfully connected @${result.user.username}`,
          duration: 4000
        });

        // Redirect to appropriate dashboard based on user type
        const redirectUrl = getSocialLinkingRedirect(authCheck.user?.userType);
        console.log('[Instagram Callback] Connection saved, redirecting to:', redirectUrl);
        
        setTimeout(() => {
          window.location.replace(redirectUrl);
        }, 2000);

      } catch (err) {
        console.error('[Instagram Callback] Error:', err);
        
        // If opened in popup, communicate result to parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'instagram-oauth-result',
            result: {
              success: false,
              error: err instanceof Error ? err.message : 'An unexpected error occurred'
            }
          }, window.location.origin);
          window.close();
          return;
        }
        
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, []);

  const handleGoBack = () => {
    window.location.replace('/');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-bg">
        <Card className="w-full max-w-md bg-brand-card border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-pink-500/20 rounded-full w-fit">
              <Instagram className="h-8 w-8 text-pink-500" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting Instagram
            </CardTitle>
            <CardDescription className="text-gray-400">
              Processing your Instagram authorization...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Exchanging authorization code</p>
              <p>• Fetching account information</p>
              <p>• Setting up your account</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success' && userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-bg">
        <Card className="w-full max-w-md bg-brand-card border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-500/20 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-green-400">Instagram Connected!</CardTitle>
            <CardDescription className="text-gray-400">
              Your Instagram account is now connected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
              {userInfo.profile_picture_url && (
                <img 
                  src={userInfo.profile_picture_url} 
                  alt={userInfo.username}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold text-white">@{userInfo.username}</p>
                {userInfo.name && (
                  <p className="text-sm text-gray-400">{userInfo.name}</p>
                )}
                <p className="text-xs text-green-400">
                  {userInfo.account_type === 'BUSINESS' ? 'Business Account' : 'Personal Account'}
                </p>
              </div>
            </div>

            <div className="text-center text-sm text-gray-400">
              <p>Redirecting to your dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'link_required' && linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-bg p-4">
        <Card className="w-full max-w-md bg-brand-card border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-500/20 rounded-full w-fit">
              <Instagram className="h-8 w-8 text-yellow-500" />
            </div>
            <CardTitle className="text-white">Account Found</CardTitle>
            <CardDescription className="text-gray-400">
              {linkInfo.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
              Existing login method: {linkInfo.existingProviders.join(', ')}
            </p>
            <p className="text-gray-400 text-sm text-center">
              Please sign in with your existing account to link Instagram.
            </p>
            <Button 
              onClick={handleGoBack}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-bg p-4">
        <Card className="w-full max-w-md bg-brand-card border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-500/20 rounded-full w-fit">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-red-400">Connection Failed</CardTitle>
            <CardDescription className="text-gray-400">
              Failed to connect your Instagram account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-500">
              <p>Common solutions:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Make sure you have an Instagram Business Account</li>
                <li>Check that your account has the required permissions</li>
                <li>Try connecting again</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
