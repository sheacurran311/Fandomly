import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Instagram, 
  Facebook, 
  Music2, 
  Youtube,
  Twitter,
  CheckCircle2, 
  Copy,
  ExternalLink, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * CodeVerificationTask Component
 * 
 * Displays a task that requires fans to include a unique verification code
 * in their comment or quote tweet.
 * 
 * Features:
 * - Unique code generation per fan
 * - Copy-to-clipboard functionality
 * - Verification status display
 * - Re-verify button
 * - T2 verification tier indicator
 */

export interface CodeVerificationTaskProps {
  task: {
    id: string;
    name: string;
    description: string;
    platform: string;
    taskType: string;
    pointsToReward: number;
    customSettings?: {
      contentUrl?: string;
      contentId?: string;
      mediaUrl?: string;
      requiredHashtags?: string[];
    };
  };
  verificationCode?: string;
  isConnected: boolean;
  isCompleted: boolean;
  isPending: boolean;
  onGetCode: (taskId: string) => Promise<string>;
  onVerify: (taskId: string) => Promise<void>;
  onConnect: (platform: string) => void;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <Music2 className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  x: <Twitter className="h-5 w-5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
  tiktok: 'bg-black',
  facebook: 'bg-blue-600',
  youtube: 'bg-red-600',
  twitter: 'bg-sky-500',
  x: 'bg-black',
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
};

export function CodeVerificationTask({
  task,
  verificationCode: initialCode,
  isConnected,
  isCompleted,
  isPending,
  onGetCode,
  onVerify,
  onConnect,
}: CodeVerificationTaskProps) {
  const [code, setCode] = useState(initialCode || '');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const platform = task.platform.toLowerCase();
  const platformName = PLATFORM_NAMES[platform] || task.platform;
  const platformIcon = PLATFORM_ICONS[platform];
  const platformColor = PLATFORM_COLORS[platform] || 'bg-gray-600';

  const contentUrl = task.customSettings?.contentUrl || task.customSettings?.mediaUrl;
  const isQuoteTweet = task.taskType.includes('quote') || task.taskType.includes('repost');

  // Get or generate verification code
  useEffect(() => {
    if (!code && isConnected && !isCompleted) {
      handleGetCode();
    }
  }, [isConnected, isCompleted]);

  const handleGetCode = async () => {
    setIsLoadingCode(true);
    try {
      const newCode = await onGetCode(task.id);
      setCode(newCode);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get verification code',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Code copied!',
        description: 'Paste it in your comment or post.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please manually copy the code.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenContent = () => {
    if (contentUrl) {
      window.open(contentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify(task.id);
      toast({
        title: 'Verification submitted!',
        description: 'We\'re checking for your comment. This may take a moment.',
      });
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Please make sure you included the code in your comment.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Completed state
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
                  Verified
                </Badge>
              </div>
            </div>
            <Badge variant="secondary">+{task.pointsToReward} pts</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Pending verification state
  if (isPending) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg text-white ${platformColor}`}>
                {platformIcon}
              </div>
              <div>
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <Badge variant="outline" className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Verification Pending
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We're checking for your comment with code <span className="font-mono font-bold">{code}</span>.
            This may take a few minutes.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check Again
          </Button>
        </CardFooter>
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
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {isQuoteTweet ? 'Code in Quote' : 'Code in Comment'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  T2 Verified
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

        {/* Connection requirement */}
        {!isConnected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connect your {platformName} account to get your verification code.
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

        {/* Verification code display */}
        {isConnected && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your verification code:</span>
              {isLoadingCode && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input 
                  value={code}
                  readOnly
                  className="font-mono text-xl tracking-wider text-center bg-muted"
                  placeholder="Loading..."
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleCopyCode}
                disabled={!code}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Required hashtags */}
            {task.customSettings?.requiredHashtags && task.customSettings.requiredHashtags.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Also include: {task.customSettings.requiredHashtags.map(h => (
                  <span key={h} className="font-mono font-medium text-foreground ml-1">#{h}</span>
                ))}
              </div>
            )}

            {/* Instructions */}
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {isQuoteTweet ? (
                  <>Quote tweet with your code <span className="font-mono font-bold">{code}</span> to earn points!</>
                ) : (
                  <>Comment with your code <span className="font-mono font-bold">{code}</span> to earn points!</>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {contentUrl && (
          <Button className="w-full" onClick={handleOpenContent}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open {isQuoteTweet ? 'Tweet' : 'Post'}
          </Button>
        )}
        
        <Button 
          variant="secondary"
          className="w-full"
          onClick={handleVerify}
          disabled={!code || isVerifying || !isConnected}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              I posted my code - Verify
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CodeVerificationTask;
