import { useState } from 'react';
import { useCreatorVerification } from '@/hooks/useCreatorVerification';
import { CreatorVerificationProgress } from '@/components/creator/CreatorVerificationProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Info } from 'lucide-react';

/**
 * Demo page showing Creator Verification UI
 * This demonstrates both the compact and full views
 */
export default function CreatorVerificationDemo() {
  const {
    creator,
    verificationData,
    platformActivity,
    isLoading,
    error,
    checkVerification,
    isChecking,
    refetch,
  } = useCreatorVerification();

  const [_showWizard, setShowWizard] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load verification status'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!creator || !verificationData) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No creator profile found. Please complete creator onboarding first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Creator Verification</h1>
        <p className="text-gray-400">
          Complete your profile to get verified and unlock all creator features
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact View (Sidebar Card) */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Compact View</CardTitle>
              <CardDescription className="text-xs">For dashboards & sidebars</CardDescription>
            </CardHeader>
            <CardContent>
              <CreatorVerificationProgress
                creator={creator}
                verificationData={verificationData}
                platformActivity={platformActivity}
                onStartWizard={() => setShowWizard(true)}
                compact={true}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => checkVerification()}
                disabled={isChecking}
                className="w-full"
                variant="outline"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>

              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Full View (Main Content) */}
        <div className="lg:col-span-2">
          <CreatorVerificationProgress
            creator={creator}
            verificationData={verificationData}
            platformActivity={platformActivity}
            onStartWizard={() => setShowWizard(true)}
            compact={false}
          />
        </div>
      </div>

      {/* Mock Creator Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Creator Data (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-black/30 p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify({ creator, verificationData }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
