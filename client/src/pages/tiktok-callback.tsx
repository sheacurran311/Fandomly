import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { debugTikTokConfig, parseTikTokOAuthError, getTikTokErrorMessage } from '@/lib/tiktok-debug';

export default function TikTokCallback() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Debug configuration on callback
        debugTikTokConfig();
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        // Parse TikTok OAuth errors using the debug utility
        const oauthError = parseTikTokOAuthError(urlParams);

        // Handle TikTok-specific errors
        if (oauthError.hasError) {
          setStatus('error');
          const errorMessage = oauthError.errorDescription || 
                              getTikTokErrorMessage(oauthError.error || '') || 
                              oauthError.error || 
                              'Unknown authorization error';
          setError(errorMessage);
          console.error('TikTok OAuth Error:', oauthError);
          toast({ 
            title: 'TikTok Authorization Failed', 
            description: errorMessage, 
            variant: 'destructive' 
          });
          return;
        }

        // Validate state parameter for security
        if (state !== 'tiktok_auth') {
          setStatus('error');
          setError('Invalid state parameter - possible CSRF attack');
          return;
        }

        if (!code) {
          setStatus('error');
          setError('Missing authorization code');
          return;
        }

        // Include redirect_uri in token exchange for TikTok API compliance
        const origin = window.location.origin;
        const redirectUri = `${origin}/tiktok-callback`;

        const resp = await fetch('/api/social/tiktok/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '' 
          },
          credentials: 'include',
          body: JSON.stringify({ 
            code,
            redirect_uri: redirectUri
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error('TikTok token exchange failed:', data);
          throw new Error(data?.error || data?.message || 'Failed to exchange TikTok token');
        }

        // Check if TikTok returned an error in the response
        if (data.error) {
          throw new Error(data.error_description || data.error);
        }

        // If we have access token, fetch user info and store connection
        if (data.access_token) {
          try {
            const userResponse = await fetch('/api/social/tiktok/user', {
              headers: { 
                'Authorization': `Bearer ${data.access_token}`,
                'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || ''
              },
              credentials: 'include'
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.data && userData.data.user) {
                // Save TikTok connection to database
                const tiktokUser = userData.data.user;
                try {
                  await fetch('/api/social-connections', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || ''
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      platform: 'tiktok',
                      platformUserId: tiktokUser.open_id || tiktokUser.union_id,
                      platformUsername: tiktokUser.username,
                      platformDisplayName: tiktokUser.display_name,
                      accessToken: data.access_token,
                      refreshToken: data.refresh_token,
                      tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
                      profileData: {
                        followers: tiktokUser.follower_count || 0,
                        following: tiktokUser.following_count || 0,
                        verified: tiktokUser.is_verified || false,
                        profilePictureUrl: tiktokUser.avatar_url,
                        bio: tiktokUser.bio_description,
                      }
                    })
                  });
                  console.log('✅ TikTok connection saved to database');
                } catch (dbError) {
                  console.error('Failed to save TikTok connection to database:', dbError);
                  // Continue flow even if DB save fails
                }
              }
            }
          } catch (userError) {
            console.warn('Failed to fetch TikTok user info:', userError);
            // Don't fail the whole flow if user info fetch fails
          }
        }

        // Navigate to dashboard
        setStatus('success');
        setTimeout(() => setLocation('/creator-dashboard'), 1200);
      } catch (e: any) {
        console.error('TikTok callback error:', e);
        setStatus('error');
        setError(e?.message || 'Unexpected error');
        toast({ 
          title: 'TikTok Connection Error', 
          description: e?.message || 'Unexpected error', 
          variant: 'destructive' 
        });
      }
    };
    handleCallback();
  }, [user, setLocation]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting TikTok
            </CardTitle>
            <CardDescription>Processing your TikTok authorization…</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Exchanging authorization code</p>
              <p>• Fetching account information</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-green-600">TikTok Connected!</CardTitle>
            <CardDescription>Redirecting to your dashboard…</CardDescription>
          </CardHeader>
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
            <CardDescription>Failed to connect your TikTok account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}


