import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Instagram, 
  Facebook, 
  Music2, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * StarterPackTask Component
 * 
 * Displays a starter pack task with embedded profile and honor system verification.
 * These are one-time-per-platform tasks that help onboard fans with basic engagement.
 * 
 * Features:
 * - Embedded profile link/widget
 * - "I followed!" confirmation button
 * - T3 verification tier indicator
 * - Reduced points display with explanation
 * - Connection requirement check
 */

export interface StarterPackTaskProps {
  task: {
    id: string;
    name: string;
    description: string;
    platform: string;
    taskType: string;
    pointsToReward: number;
    customSettings?: {
      profileUrl?: string;
      username?: string;
      displayName?: string;
      embedType?: string;
    };
  };
  creatorProfile: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    profileUrl?: string;
  };
  isConnected: boolean;
  isCompleted: boolean;
  onComplete: (taskId: string) => Promise<void>;
  onConnect: (platform: string) => void;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <Music2 className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
  tiktok: 'bg-black',
  facebook: 'bg-blue-600',
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export function StarterPackTask({
  task,
  creatorProfile,
  isConnected,
  isCompleted,
  onComplete,
  onConnect,
}: StarterPackTaskProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const platform = task.platform.toLowerCase();
  const platformName = PLATFORM_NAMES[platform] || task.platform;
  const platformIcon = PLATFORM_ICONS[platform];
  const platformColor = PLATFORM_COLORS[platform] || 'bg-gray-600';

  // Get the profile URL from task settings or creator profile
  const profileUrl = 
    task.customSettings?.profileUrl || 
    creatorProfile[platform as keyof typeof creatorProfile] ||
    '';

  const handleOpenProfile = () => {
    if (profileUrl) {
      window.open(profileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmFollow = async () => {
    if (!isConnected) {
      toast({
        title: 'Connect your account first',
        description: `Please connect your ${platformName} account to verify this task.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onComplete(task.id);
      toast({
        title: 'Task Completed!',
        description: `You earned ${task.pointsToReward} points for following on ${platformName}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete task',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg text-white ${platformColor}`}>
                {platformIcon}
              </div>
              <div>
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <Badge variant="outline" className="mt-1 bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              </div>
            </div>
            <Badge variant="secondary">+{task.pointsToReward} pts</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg text-white ${platformColor}`}>
              {platformIcon}
            </div>
            <div>
              <CardTitle className="text-lg">{task.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Starter Pack
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  T3 Verification
                </Badge>
              </div>
            </div>
          </div>
          <Badge variant="default" className="text-lg">
            +{task.pointsToReward} pts
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription>{task.description}</CardDescription>

        {/* Info about reduced points */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Starter pack tasks have reduced points because they use honor-based verification. 
            Complete code-verified tasks to earn more points!
          </AlertDescription>
        </Alert>

        {/* Profile embed/link */}
        {profileUrl && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full text-white ${platformColor}`}>
                  {platformIcon}
                </div>
                <div>
                  <p className="font-medium">
                    {task.customSettings?.displayName || 'Creator Profile'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{task.customSettings?.username || profileUrl.split('/').pop()}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenProfile}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Profile
              </Button>
            </div>
          </div>
        )}

        {/* Connection requirement */}
        {!isConnected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connect your {platformName} account to complete this task.
              <Button 
                variant="link" 
                className="p-0 h-auto ml-1"
                onClick={() => onConnect(platform)}
              >
                Connect now
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {showConfirmation ? (
          <div className="w-full space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Did you follow {task.customSettings?.displayName || 'the creator'} on {platformName}?
            </p>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowConfirmation(false)}
              >
                Not yet
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfirmFollow}
                disabled={isLoading || !isConnected}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Yes, I followed!
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <Button 
              className="w-full"
              onClick={handleOpenProfile}
              disabled={!profileUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Follow on {platformName}
            </Button>
            <Button 
              variant="secondary"
              className="w-full"
              onClick={() => setShowConfirmation(true)}
              disabled={!isConnected}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              I already follow them
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default StarterPackTask;
