/**
 * YouTube Task Builder Component
 * 
 * Allows creators to create YouTube-based tasks with:
 * - Subscribe tasks
 * - Like Video tasks
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
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeConnection } from "@/hooks/use-social-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Task type to verification tier mapping for YouTube
// Subscribe has full API support (T1), Like is private (T3), Comment with keyword is T2
const YOUTUBE_TASK_TIERS: Record<string, VerificationTier> = {
  youtube_subscribe: 'T1',
  youtube_like: 'T3',
  youtube_comment: 'T2',
};

interface YouTubeTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'youtube_subscribe' | 'youtube_like' | 'youtube_comment';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function YouTubeTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode, programSelector }: YouTubeTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get verification tier for this task type
  const tier = YOUTUBE_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];
  
  // Use unified YouTube connection hook
  const {
    isConnected: youtubeConnected,
    isLoading: checkingConnection,
    userInfo: youtubeUserInfo,
    connect: connectYouTube,
  } = useYouTubeConnection();
  
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [channelUrl, setChannelUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [requiredText, setRequiredText] = useState(''); // For comment tasks
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  
  // Derived from hook
  const youtubeChannel = youtubeUserInfo?.displayName || youtubeUserInfo?.name || null;

  // Auto-populate channel URL when YouTube connects
  useEffect(() => {
    if (youtubeConnected && youtubeUserInfo?.id && taskType === 'youtube_subscribe' && !channelUrl && !isEditMode) {
      setChannelUrl(`https://youtube.com/channel/${youtubeUserInfo.id}`);
    }
  }, [youtubeConnected, youtubeUserInfo?.id, taskType, channelUrl, isEditMode]);

  // Initialize form with defaults based on task type
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = getDefaultValues();
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);
  
  // Load initial data if editing - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (initialData && isEditMode) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 100);
      
      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};
      
      const derivedChannelUrl = settings.channelUrl
        || (settings.channelId ? `https://youtube.com/channel/${settings.channelId}` : undefined)
        || settings.contentUrl;
      const derivedVideoUrl = settings.videoUrl || settings.contentUrl;

      if (derivedChannelUrl) {
        setChannelUrl(derivedChannelUrl);
      }
      if (derivedVideoUrl) {
        setVideoUrl(derivedVideoUrl);
      }
      if (settings.requiredText) {
        setRequiredText(settings.requiredText);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  const getDefaultValues = () => {
    // Get tier-appropriate recommended points
    const taskTier = YOUTUBE_TASK_TIERS[taskType] || 'T1';
    const guidance = TIER_GUIDANCE[taskTier];
    
    switch (taskType) {
      case 'youtube_subscribe':
        return {
          name: 'Subscribe on YouTube',
          description: 'Subscribe to our YouTube channel for exclusive content!',
          points: 75, // T1: Higher for valuable subscription
        };
      case 'youtube_like':
        return {
          name: 'Like Our YouTube Video',
          description: 'Show some love by liking our YouTube video!',
          points: 15, // T3: Lower for manual verification
        };
      case 'youtube_comment':
        return {
          name: 'Comment on YouTube Video',
          description: 'Leave a comment on our YouTube video!',
          points: guidance.recommendedPoints, // T2: 40 pts - code verified
        };
      default:
        return { name: '', description: '', points: guidance.recommendedPoints };
    }
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];

    if (!taskName.trim()) {
      errors.push('Task name is required');
    }
    if (!description.trim()) {
      errors.push('Description is required');
    }
    if (points < 1 || points > 10000) {
      errors.push('Points must be between 1 and 10,000');
    }
    
    if (taskType === 'youtube_subscribe') {
      if (!channelUrl.trim()) {
        errors.push('YouTube channel URL is required');
      } else if (!channelUrl.includes('youtube.com')) {
        errors.push('Invalid YouTube channel URL');
      }
    } else {
      if (!videoUrl.trim()) {
        errors.push('YouTube video URL is required');
      } else if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
        errors.push('Invalid YouTube video URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, channelUrl, videoUrl, requiredText, taskType]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'youtube' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };

    if (taskType === 'youtube_subscribe') {
      return {
        ...baseConfig,
        settings: {
          channelUrl,
        },
      };
    } else {
      const settings: any = {
        videoUrl,
      };
      
      // Add optional requiredText for comment tasks
      if (taskType === 'youtube_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
      
      return {
        ...baseConfig,
        settings,
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

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-red-600/10 to-red-400/10 rounded-lg border border-red-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiYoutube className="h-5 w-5 text-red-600" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-red-400">Type:</span> {taskType === 'youtube_subscribe' ? 'Subscribe' : taskType === 'youtube_comment' ? 'Comment' : 'Like Video'}</p>
        <p><span className="text-red-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-red-400">Points:</span> {points} points</p>
        <p><span className="text-red-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiYoutube className="h-6 w-6 text-red-600" />}
      title="YouTube Task"
      description="Create YouTube-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="YouTube tasks help grow your channel. Fans earn points for subscribing to your channel or liking your videos."
      exampleUse="A creator could offer 100 points for fans to subscribe to their channel, or 25 points for liking a specific video."
    >
      {!youtubeConnected && !checkingConnection && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>YouTube Not Connected</strong>
                <p className="text-sm mt-1">You must connect your YouTube account before creating YouTube tasks.</p>
              </div>
              <button
                onClick={connectYouTube}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ml-4"
              >
                Connect YouTube
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {youtubeConnected && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>YouTube Connected</strong> {youtubeChannel && `- ${youtubeChannel}`}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'youtube_subscribe' && 'Subscribe Configuration'}
              {taskType === 'youtube_like' && 'Like Video Configuration'}
              {taskType === 'youtube_comment' && 'Comment Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Subscribe to our channel"
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
              {tierGuidance.warning && (
                <p className="text-xs text-amber-400 mt-2">{tierGuidance.warning}</p>
              )}
              {tierGuidance.tip && (
                <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
              )}
            </div>

            {/* Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Points Reward</Label>
                <span className="text-xs text-gray-400">
                  Recommended: {tierGuidance.recommendedPoints} pts
                </span>
              </div>
              <NumberInput
                value={points}
                onChange={(val) => setPoints(val || tierGuidance.recommendedPoints)}
                min={1}
                max={10000}
                allowEmpty={false}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                How many points fans will earn for completing this task
              </p>
              {tier === 'T3' && points > 25 && (
                <p className="text-xs text-amber-400">
                  ⚠️ High points for a manually verified task. Consider lowering to reduce abuse potential.
                </p>
              )}
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'youtube_subscribe' ? (
              <div className="space-y-2">
                <Label className="text-white">YouTube Channel URL</Label>
                <Input
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  The full URL of your YouTube channel
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">YouTube Video URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the YouTube video you want fans to {taskType === 'youtube_comment' ? 'comment on' : 'like'}
                  </p>
                </div>
                
                {/* Required Text for Comment Tasks */}
                {taskType === 'youtube_comment' && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Text (Optional)</Label>
                    <Input
                      value={requiredText}
                      onChange={(e) => setRequiredText(e.target.value)}
                      placeholder="e.g., #Fandomly or 'Great video!'"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-400">
                      If specified, fans must include this text in their comment
                    </p>
                  </div>
                )}
              </div>
            )}

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
                <Badge variant="outline" className="border-red-500/30 text-red-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-red-500/10 border-red-500/20">
                <Info className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400 text-sm">
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
                    Use YouTube API to verify task completion (requires YouTube connection)
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
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
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
                      <div className="h-10 w-10 rounded-full bg-red-600/20 flex items-center justify-center">
                        <SiYoutube className="h-5 w-5 text-red-600" />
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

