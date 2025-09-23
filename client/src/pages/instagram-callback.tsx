import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import InstagramSDKManager from '@/lib/instagram';
import { toast } from '@/hooks/use-toast';
import { 
  Instagram, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ArrowLeft 
} from 'lucide-react';

export default function InstagramCallback() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { connectInstagram } = useInstagramConnection();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Handle authorization errors
        if (error) {
          const errorReason = urlParams.get('error_reason');
          const errorDescription = urlParams.get('error_description');
          
          setStatus('error');
          setError(`Authorization failed: ${errorDescription || error}`);
          
          toast({
            title: "Instagram Authorization Failed",
            description: errorDescription || "The authorization was cancelled or failed.",
            variant: "destructive"
          });
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          setStatus('error');
          setError('Missing authorization code or state parameter');
          return;
        }

        console.log('[Instagram Callback] Processing authorization code');

        // Handle the callback using InstagramSDKManager
        const result = await InstagramSDKManager.handleCallback(code, state);

        if (result.success && result.user && result.accessToken) {
          setUserInfo(result.user);
          setStatus('success');

          // Save the connection data to context/localStorage
          // This will be handled by the InstagramConnectionContext
          
          toast({
            title: "Instagram Connected! 📸",
            description: `Successfully connected @${result.user.username}`,
            duration: 4000
          });

          // Redirect to creator dashboard after a short delay
          setTimeout(() => {
            setLocation('/creator-dashboard');
          }, 2000);

        } else {
          setStatus('error');
          setError(result.error || 'Failed to complete Instagram connection');
          
          toast({
            title: "Instagram Connection Failed",
            description: result.error || 'An unexpected error occurred',
            variant: "destructive"
          });
        }

      } catch (error) {
        console.error('[Instagram Callback] Error:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        
        toast({
          title: "Instagram Connection Error",
          description: "Failed to process Instagram authorization",
          variant: "destructive"
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
            <CardDescription>
              Processing your Instagram authorization...
            </CardDescription>
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
            <CardDescription>
              Your Instagram Business Account is now connected
            </CardDescription>
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
                {userInfo.name && (
                  <p className="text-sm text-muted-foreground">{userInfo.name}</p>
                )}
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
            <CardDescription>
              Failed to connect your Instagram account
            </CardDescription>
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
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button 
                onClick={handleRetry}
                className="flex-1"
              >
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
