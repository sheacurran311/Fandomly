/**
 * Kick OAuth Callback Page
 * 
 * Handles the OAuth redirect from Kick after user authorization.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { handleKickCallback } from '@/lib/kick';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KickCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth error
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error);
        return;
      }

      // Validate required params
      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing authorization parameters');
        return;
      }

      // Process the callback
      const result = await handleKickCallback(code, state);

      if (result.success) {
        setStatus('success');
        // Redirect after a brief success message
        setTimeout(() => {
          navigate('/creator-dashboard/social');
        }, 1500);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to connect Kick account');
      }
    }

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                Connecting Kick
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Connected!
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Connection Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we connect your Kick account...'}
            {status === 'success' && 'Your Kick account has been connected successfully.'}
            {status === 'error' && (errorMessage || 'Something went wrong.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          )}
          {status === 'error' && (
            <div className="space-y-3 w-full">
              <Button 
                onClick={() => navigate('/creator-dashboard/social')}
                className="w-full"
                variant="outline"
              >
                Back to Social Connections
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
