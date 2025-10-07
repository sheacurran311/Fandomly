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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Twitter, ArrowLeft, Save, Send, Info, CheckCircle2, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useExtractTweetId } from "@/hooks/useTwitterVerification";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";

interface TwitterTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
}

type TwitterTaskType = 'twitter_follow' | 'twitter_like' | 'twitter_retweet';

export default function TwitterTaskBuilder({ onSave, onPublish, onBack }: TwitterTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskType, setTaskType] = useState<TwitterTaskType>('twitter_follow');
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [handle, setHandle] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true);
  const [tweetIdValid, setTweetIdValid] = useState<boolean | null>(null);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  const extractTweetId = useExtractTweetId();

  // Check if Twitter is connected and get handle
  useEffect(() => {
    const checkTwitterConnection = async () => {
      try {
        const response = await fetch('/api/social/accounts', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
          },
        });
        
        if (response.ok) {
          const accounts = await response.json();
          const twitterAccount = accounts.find((acc: any) => acc.platform === 'twitter');
          
          if (twitterAccount) {
            setTwitterConnected(true);
            setTwitterHandle(twitterAccount.username || twitterAccount.displayName);
            // Auto-populate handle for follow tasks
            if (taskType === 'twitter_follow') {
              setHandle(twitterAccount.username || twitterAccount.displayName || '');
            }
          }
        }
      } catch (error) {
        console.error('Error checking Twitter connection:', error);
      } finally {
        setCheckingConnection(false);
      }
    };

    if (user?.dynamicUserId || user?.id) {
      checkTwitterConnection();
    }
  }, [user, taskType]);

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

  const getDefaultValues = () => {
    switch (taskType) {
      case 'twitter_follow':
        return {
          name: 'Follow on Twitter',
          description: 'Follow our Twitter account to stay updated!',
          points: 50,
        };
      case 'twitter_like':
        return {
          name: 'Like Our Tweet',
          description: 'Show some love by liking our latest tweet!',
          points: 25,
        };
      case 'twitter_retweet':
        return {
          name: 'Retweet Our Post',
          description: 'Help us spread the word by retweeting!',
          points: 75,
        };
      default:
        return { name: '', description: '', points: 50 };
    }
  };

  const handleTaskTypeChange = (newType: TwitterTaskType) => {
    setTaskType(newType);
    const defaults = getDefaultValues();
    setTaskName(defaults.name);
    setDescription(defaults.description);
    setPoints(defaults.points);
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
    if (points < 1 || points > 10000) {
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
  }, [taskName, description, points, handle, tweetUrl, tweetIdValid, twitterConnected, taskType]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'twitter' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
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
    onSave(buildTaskConfig(true));
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
    onPublish(buildTaskConfig(false));
  };

  const handleConnectTwitter = () => {
    // Redirect to social page to connect Twitter
    window.location.href = '/creator-dashboard/social';
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
        <p><span className="text-blue-400">Points:</span> {points} points</p>
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
              {taskType === 'twitter_follow' && (
                <p className="text-sm mt-1">Your handle has been auto-populated below.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Task Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Type Selection */}
            <div className="space-y-2">
              <Label className="text-white">Task Type</Label>
              <Select value={taskType} onValueChange={(value) => handleTaskTypeChange(value as TwitterTaskType)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-brand-dark-purple border-white/10">
                  <SelectItem value="twitter_follow">Follow on Twitter</SelectItem>
                  <SelectItem value="twitter_like">Like a Tweet</SelectItem>
                  <SelectItem value="twitter_retweet">Retweet a Post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Follow us on Twitter"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what fans need to do"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label className="text-white">Points Reward</Label>
              <NumberInput
                value={points}
                onChange={(val) => setPoints(val || 1)}
                min={1}
                max={10000}
                allowEmpty={false}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                How many points fans will earn for completing this task
              </p>
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'twitter_follow' ? (
              <div className="space-y-2">
                <Label className="text-white">Twitter Handle</Label>
                <div className="relative">
                  <Input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@yourhandle or yourhandle"
                    className="bg-white/5 border-white/10 text-white"
                    readOnly={twitterConnected && !!twitterHandle}
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
            ) : (
              <div className="space-y-2">
                <Label className="text-white">Tweet URL</Label>
                <Input
                  value={tweetUrl}
                  onChange={(e) => handleTweetUrlChange(e.target.value)}
                  placeholder="https://twitter.com/username/status/1234567890"
                  className="bg-white/5 border-white/10 text-white"
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
                  The full URL of the tweet you want fans to {taskType === 'twitter_like' ? 'like' : 'retweet'}
                </p>
              </div>
            )}

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
                      +{points} points
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

