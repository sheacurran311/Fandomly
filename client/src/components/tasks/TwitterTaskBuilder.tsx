/**
 * Twitter Task Builder Component
 * 
 * Allows creators to create Twitter-based tasks with:
 * - Follow tasks
 * - Like tweet tasks
 * - Retweet tasks
 * - Quote tweet tasks
 * - API verification option
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Twitter, Info, CheckCircle2, AlertCircle, Lock, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { useExtractTweetId } from "@/hooks/useTwitterVerification";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Task type to verification tier mapping for Twitter
const TWITTER_TASK_TIERS: Record<string, VerificationTier> = {
  twitter_follow: 'T1',
  twitter_like: 'T1',
  twitter_retweet: 'T1',
  twitter_quote_tweet: 'T2',
};

interface TwitterTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'twitter_follow' | 'twitter_like' | 'twitter_retweet' | 'twitter_quote_tweet';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function TwitterTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode, programSelector }: TwitterTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get verification tier for this task type
  const tier = TWITTER_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];
  
  // Use the unified Twitter connection hook
  const { 
    isConnected: twitterConnected, 
    isConnecting: checkingConnection,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    refresh: refreshTwitterConnection
  } = useTwitterConnection();
  
  // Derive twitterHandle from the hook's userInfo
  const twitterHandle = twitterUserInfo?.username || null;
  
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [handle, setHandle] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true);
  const [tweetIdValid, setTweetIdValid] = useState<boolean | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Simple points reward (cadence and multipliers now handled in campaigns)
  const [pointsToReward, setPointsToReward] = useState(tierGuidance.recommendedPoints);

  const extractTweetId = useExtractTweetId();

  // Auto-populate handle for follow tasks when Twitter is connected
  useEffect(() => {
    if (twitterConnected && twitterHandle && taskType === 'twitter_follow' && !handle && !isEditMode) {
      setHandle(twitterHandle);
    }
  }, [twitterConnected, twitterHandle, taskType, handle, isEditMode]);

  // Validate tweet URL when it changes
  const handleTweetUrlChange = async (url: string) => {
    setTweetUrl(url);
    setTweetIdValid(null);

    if (!url) return;

    try {
      const result = await extractTweetId.mutateAsync({ url });
      if (result.tweetId) {
        setTweetIdValid(true);
      } else {
        setTweetIdValid(false);
      }
    } catch {
      setTweetIdValid(false);
    }
  };

  // Initialize form with defaults based on task type
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = getDefaultValues();
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPointsToReward(defaults.points);
    }
  }, [taskType, isEditMode]);
  
  // Load initial data if editing - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (initialData && isEditMode) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPointsToReward(initialData.pointsToReward || initialData.points || 50);
      
      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};
      
      // Handle can be stored as 'handle' (original) or 'username' (after API normalization)
      const savedHandle = settings.handle || settings.username;
      if (savedHandle) {
        setHandle(savedHandle);
      }
      
      // URL can be stored in multiple formats
      if (settings.tweetUrl || settings.url || settings.contentUrl) {
        setTweetUrl(settings.tweetUrl || settings.url || settings.contentUrl);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  const getDefaultValues = () => {
    // Get tier-appropriate recommended points
    const taskTier = TWITTER_TASK_TIERS[taskType] || 'T1';
    const guidance = TIER_GUIDANCE[taskTier];
    
    switch (taskType) {
      case 'twitter_follow':
        return {
          name: 'Follow on Twitter',
          description: 'Follow our Twitter account to stay updated!',
          points: guidance.recommendedPoints, // T1: 50 pts
        };
      case 'twitter_like':
        return {
          name: 'Like Our Tweet',
          description: 'Show some love by liking our latest tweet!',
          points: 25, // Lower for engagement tasks
        };
      case 'twitter_retweet':
        return {
          name: 'Retweet Our Post',
          description: 'Help us spread the word by retweeting!',
          points: 75, // Higher for shares
        };
      case 'twitter_quote_tweet':
        return {
          name: 'Quote Tweet',
          description: 'Quote tweet our post with your thoughts!',
          points: TIER_GUIDANCE['T2'].recommendedPoints, // T2: 40 pts - code verified
        };
      default:
        return { name: '', description: '', points: guidance.recommendedPoints };
    }
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];

    // Check Twitter connection first
    if (!twitterConnected) {
      errors.push('You must connect your Twitter account before creating Twitter tasks');
    }

    if (!taskName.trim()) {
      errors.push('Task name is required');
    }
    if (!description.trim()) {
      errors.push('Description is required');
    }
    if (pointsToReward < 1 || pointsToReward > 10000) {
      errors.push('Points must be between 1 and 10,000');
    }
    
    if (taskType === 'twitter_follow') {
      if (!handle.trim()) {
        errors.push('Twitter handle is required');
      }
    } else {
      if (!tweetUrl.trim()) {
        errors.push('Tweet URL is required');
      }
      if (tweetIdValid === false) {
        errors.push('Invalid tweet URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, pointsToReward, handle, tweetUrl, tweetIdValid, twitterConnected, taskType]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'twitter' as const,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      pointsToReward,
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };

    if (taskType === 'twitter_follow') {
      return {
        ...baseConfig,
        settings: {
          handle: handle.startsWith('@') ? handle.substring(1) : handle,
        },
      };
    } else {
      return {
        ...baseConfig,
        settings: {
          url: tweetUrl,
          tweetUrl,
        },
      };
    }
  };

  const handleSaveClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    
    // Save main task
    const mainTask = buildTaskConfig(true);
    onSave(mainTask);
    
    // Save partner tasks if they exist (for Follow tasks only)
  };

  const handlePublishClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: "Cannot Publish Task",
        description: error,
        variant: "destructive",
      });
      return;
    }
    
    // Publish task
    const mainTask = buildTaskConfig(false);
    onPublish(mainTask);
  };

  // Use the hook's connect function - it handles everything including toasts
  const handleConnectTwitter = async () => {
    await connectTwitter();
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <Twitter className="h-5 w-5 text-blue-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-blue-400">Type:</span> {taskType.replace('twitter_', '').replace('_', ' ').toUpperCase()}</p>
        <p><span className="text-blue-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-blue-400">Reward:</span> {pointsToReward} points</p>
        <p><span className="text-blue-400">Frequency:</span> One-time only</p>
        <p><span className="text-blue-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
        {taskType === 'twitter_follow' && handle && (
          <p><span className="text-blue-400">Handle:</span> @{handle}</p>
        )}
        {taskType !== 'twitter_follow' && tweetUrl && (
          <p><span className="text-blue-400">Tweet:</span> Validated ✓</p>
        )}
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<Twitter className="h-6 w-6 text-blue-500" />}
      title="Twitter Task"
      description="Create Twitter-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Twitter tasks help increase your social media engagement. Fans earn points for following, liking, or retweeting your content."
      exampleUse="A creator could offer 50 points for fans to follow them on Twitter, or 100 points for retweeting a specific announcement."
    >
      <div className="space-y-6">

        {/* Twitter Connection Status */}
        {!checkingConnection && !twitterConnected && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Twitter Not Connected</strong>
                  <p className="text-sm mt-1">You must connect your Twitter account before creating Twitter tasks.</p>
                </div>
                <Button
                  onClick={handleConnectTwitter}
                  className="bg-black text-white hover:bg-black/80 ml-4"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Connect Twitter
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!checkingConnection && twitterConnected && twitterHandle && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Twitter Connected:</strong> @{twitterHandle}
              {taskType === 'twitter_follow' && !isEditMode && (
                <p className="text-sm mt-1">Your handle has been auto-populated below.</p>
              )}
              {taskType === 'twitter_follow' && isEditMode && handle && (
                <p className="text-sm mt-1">Task configured for @{handle}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'twitter_follow' && 'Follow Task Configuration'}
              {taskType === 'twitter_like' && 'Like Tweet Configuration'}
              {taskType === 'twitter_retweet' && 'Retweet Configuration'}
              {taskType === 'twitter_quote_tweet' && 'Quote Tweet Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Follow us on Twitter"
                className={`bg-white/5 border-white/10 text-white ${!twitterConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!twitterConnected}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what fans need to do"
                className={`bg-white/5 border-white/10 text-white ${!twitterConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!twitterConnected}
              />
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'twitter_follow' ? (
              <div className="space-y-4">
                {/* Main Account Handle */}
                <div className="space-y-2">
                  <Label className="text-white">Your Twitter Handle</Label>
                  <div className="relative">
                    <Input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@yourhandle or yourhandle"
                      className={`bg-white/5 border-white/10 text-white ${!twitterConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      readOnly={twitterConnected && !!twitterHandle}
                      disabled={!twitterConnected}
                    />
                    {twitterConnected && twitterHandle && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Auto-filled
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {twitterConnected && twitterHandle 
                      ? "Using your connected Twitter account" 
                      : "Your Twitter username (with or without @)"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-white">Tweet URL</Label>
                <Input
                  value={tweetUrl}
                  onChange={(e) => handleTweetUrlChange(e.target.value)}
                  placeholder="https://twitter.com/username/status/1234567890"
                  className={`bg-white/5 border-white/10 text-white ${!twitterConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!twitterConnected}
                />
                {tweetIdValid === true && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Valid tweet URL
                  </div>
                )}
                {tweetIdValid === false && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Invalid tweet URL format
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  The full URL of the tweet you want fans to {taskType === 'twitter_like' ? 'like' : taskType === 'twitter_quote_tweet' ? 'quote tweet' : 'retweet'}
                </p>
              </div>
            )}

            {/* Verification Tier Guidance */}
            <div className={`p-4 rounded-lg border ${
              tier === 'T1' ? 'bg-green-500/10 border-green-500/30' :
              tier === 'T2' ? 'bg-blue-500/10 border-blue-500/30' :
              'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {tier === 'T1' ? <ShieldCheck className="h-4 w-4 text-green-400" /> :
                 tier === 'T2' ? <Shield className="h-4 w-4 text-blue-400" /> :
                 <ShieldAlert className="h-4 w-4 text-amber-400" />}
                <span className={`font-medium ${
                  tier === 'T1' ? 'text-green-400' :
                  tier === 'T2' ? 'text-blue-400' :
                  'text-amber-400'
                }`}>{tierGuidance.label}</span>
                <Badge variant="outline" className={`text-xs ${
                  tier === 'T1' ? 'border-green-500/30 text-green-400' :
                  tier === 'T2' ? 'border-blue-500/30 text-blue-400' :
                  'border-amber-500/30 text-amber-400'
                }`}>
                  {tierGuidance.trustLevel}
                </Badge>
              </div>
              <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
              <p className={`text-sm font-medium ${
                tier === 'T1' ? 'text-green-400' :
                tier === 'T2' ? 'text-blue-400' :
                'text-amber-400'
              }`}>{tierGuidance.pointsRange}</p>
              {tierGuidance.tip && (
                <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
              )}
            </div>

            {/* Points Reward */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Points Reward</Label>
                <span className="text-xs text-gray-400">
                  Recommended: {tierGuidance.recommendedPoints} pts
                </span>
              </div>
              <NumberInput
                value={pointsToReward}
                onChange={(val) => setPointsToReward(val || tierGuidance.recommendedPoints)}
                min={1}
                max={10000}
                className={`bg-white/5 border-white/10 text-white ${!twitterConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!twitterConnected}
              />
              <p className="text-xs text-gray-400">
                Points awarded when the fan completes this task (1-10,000)
              </p>
            </div>

            {/* Locked Frequency Display */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-white font-semibold">Reward Frequency</Label>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">
                    Social engagement tasks are one-time only
                  </p>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-400 text-sm">
                  This task can only be completed once per user. Multipliers and verification cadence can be configured at the campaign level.
                </AlertDescription>
              </Alert>
            </div>

            {/* API Verification Toggle */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-white font-semibold">Automatic Verification</Label>
                  <p className="text-xs text-gray-400">
                    Use Twitter API to instantly verify task completion
                  </p>
                </div>
                <Switch
                  checked={useApiVerification}
                  onCheckedChange={setUseApiVerification}
                />
              </div>

              {useApiVerification ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-400 text-sm">
                    <strong>Instant Rewards:</strong> Fans will get points immediately after completing the task!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <Info className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-400 text-sm">
                    <strong>Manual Verification:</strong> You'll need to manually approve each completion.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-white">Preview</Label>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center">
                        <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{taskName || 'Task Name'}</h3>
                        <p className="text-sm text-gray-400">{description || 'Description'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-brand-primary text-brand-primary">
                      +{pointsToReward} points
                    </Badge>
                  </div>
                  {useApiVerification && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Instant verification enabled
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

      </div>
    </TaskBuilderBase>
  );
}

