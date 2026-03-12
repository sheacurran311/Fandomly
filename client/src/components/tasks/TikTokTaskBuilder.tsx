/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * TikTok Task Builder Component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  Info,
  ShieldCheck,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { SiTiktok } from 'react-icons/si';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTikTokConnection } from '@/hooks/use-social-connection';
import TaskBuilderBase from './TaskBuilderBase';
import { TIER_GUIDANCE, type VerificationTier } from '@shared/taskTemplates';

// Task type to verification tier mapping for TikTok
// TikTok has limited API access, most tasks are T3 (manual)
// Comment and post tasks use T2 (code/hashtag-based verification)
const TIKTOK_TASK_TIERS: Record<string, VerificationTier> = {
  tiktok_follow: 'T3',
  tiktok_like: 'T3',
  tiktok_comment: 'T2',
  tiktok_post: 'T2',
};

interface TikTokTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'tiktok_follow' | 'tiktok_like' | 'tiktok_comment' | 'tiktok_post';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function TikTokTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: TikTokTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get verification tier for this task type
  const tier = TIKTOK_TASK_TIERS[taskType] || 'T3';
  const tierGuidance = TIER_GUIDANCE[tier];

  // Use unified TikTok connection hook
  const {
    isConnected: tiktokConnected,
    isLoading: checkingConnection,
    userInfo: tiktokUserInfo,
    connect: connectTikTok,
  } = useTikTokConnection();

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [username, setUsername] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [requiredText, setRequiredText] = useState(''); // For comment tasks
  const [requiredHashtags, setRequiredHashtags] = useState(''); // For post tasks (comma-separated)
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Auto-fill username when TikTok connects
  useEffect(() => {
    if (
      tiktokConnected &&
      tiktokUserInfo?.username &&
      taskType === 'tiktok_follow' &&
      !username &&
      !isEditMode
    ) {
      setUsername(tiktokUserInfo.username);
    }
  }, [tiktokConnected, tiktokUserInfo?.username, taskType, username, isEditMode]);

  // Load initial data for edit mode - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 50);

      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};

      setUsername(settings.username || '');
      setVideoUrl(settings.videoUrl || settings.contentUrl || '');
      setRequiredText(settings.requiredText || '');
      setRequiredHashtags(
        Array.isArray(settings.requiredHashtags)
          ? settings.requiredHashtags.join(', ')
          : settings.requiredHashtags || ''
      );
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData]);

  useEffect(() => {
    if (!isEditMode && !taskName) {
      // Get tier-appropriate recommended points
      const taskTier = TIKTOK_TASK_TIERS[taskType] || 'T3';
      const guidance = TIER_GUIDANCE[taskTier];

      let defaults;
      switch (taskType) {
        case 'tiktok_follow':
          defaults = { name: 'Follow on TikTok', description: 'Follow us on TikTok!', points: 20 }; // T3: Lower for manual
          break;
        case 'tiktok_like':
          defaults = {
            name: 'Like Our TikTok Video',
            description: 'Like our TikTok video!',
            points: 15,
          }; // T3: Lower for manual
          break;
        case 'tiktok_comment':
          defaults = {
            name: 'Comment on TikTok Video',
            description: 'Leave a comment on our TikTok video!',
            points: guidance.recommendedPoints,
          }; // T2: 40 pts
          break;
        case 'tiktok_post':
          defaults = {
            name: 'Create TikTok Post',
            description: 'Create your own TikTok with our hashtag and earn points!',
            points: 40,
          }; // T2: Hashtag verified
          break;
        default:
          defaults = { name: '', description: '', points: guidance.recommendedPoints };
      }
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);

  useEffect(() => {
    const errors: string[] = [];

    // Check TikTok connection first
    if (!tiktokConnected) {
      errors.push('You must connect your TikTok account before creating TikTok tasks');
    }

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (taskType === 'tiktok_follow' && !username.trim())
      errors.push('TikTok username is required');
    if ((taskType === 'tiktok_like' || taskType === 'tiktok_comment') && !videoUrl.trim())
      errors.push('TikTok video URL is required');
    // tiktok_post doesn't require additional fields - hashtags are optional
    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [
    taskName,
    description,
    points,
    username,
    videoUrl,
    requiredText,
    requiredHashtags,
    taskType,
    tiktokConnected,
  ]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }

    let settings: any;
    if (taskType === 'tiktok_follow') {
      settings = { username: username.replace('@', '') };
    } else if (taskType === 'tiktok_post') {
      settings = {};
      if (requiredHashtags.trim()) {
        settings.requiredHashtags = requiredHashtags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean);
      }
    } else {
      settings = { videoUrl };
      if (taskType === 'tiktok_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
    }

    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'tiktok' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings,
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    let settings: any;
    if (taskType === 'tiktok_follow') {
      settings = { username: username.replace('@', '') };
    } else if (taskType === 'tiktok_post') {
      settings = {};
      if (requiredHashtags.trim()) {
        settings.requiredHashtags = requiredHashtags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean);
      }
    } else {
      settings = { videoUrl };
      if (taskType === 'tiktok_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
    }

    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'tiktok' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings,
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-pink-600/10 to-blue-400/10 rounded-lg border border-pink-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiTiktok className="h-5 w-5" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-pink-400">Type:</span>{' '}
          {taskType === 'tiktok_follow'
            ? 'Follow User'
            : taskType === 'tiktok_comment'
              ? 'Comment'
              : 'Like Video'}
        </p>
        <p>
          <span className="text-pink-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-pink-400">Points:</span> {points} points
        </p>
        <p>
          <span className="text-pink-400">Verification:</span>{' '}
          {useApiVerification ? 'API' : 'Manual'}
        </p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiTiktok className="h-6 w-6" />}
      title="TikTok Task"
      description="Create TikTok-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="TikTok tasks help grow your presence on TikTok."
      exampleUse="Offer 50 points for following you on TikTok or 25 points for liking a video."
    >
      <div className="space-y-6">
        {!tiktokConnected && !checkingConnection && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>TikTok Not Connected</strong>
                  <p className="text-sm mt-1">
                    You must connect your TikTok account before creating TikTok tasks.
                  </p>
                </div>
                <button
                  onClick={connectTikTok}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 ml-4"
                >
                  Connect TikTok
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {tiktokConnected && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>TikTok Connected</strong> - Your TikTok account is linked and ready to use.
            </AlertDescription>
          </Alert>
        )}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'tiktok_follow'
                ? 'Follow Configuration'
                : taskType === 'tiktok_comment'
                  ? 'Comment Configuration'
                  : taskType === 'tiktok_post'
                    ? 'Post Creation Configuration'
                    : 'Like Video Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            {/* Verification Tier Guidance */}
            <div
              className={`p-4 rounded-lg border ${
                tier === 'T1'
                  ? 'bg-green-500/10 border-green-500/30'
                  : tier === 'T2'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {tier === 'T1' ? (
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                ) : tier === 'T2' ? (
                  <Shield className="h-4 w-4 text-blue-400" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                )}
                <span
                  className={`font-medium ${
                    tier === 'T1'
                      ? 'text-green-400'
                      : tier === 'T2'
                        ? 'text-blue-400'
                        : 'text-amber-400'
                  }`}
                >
                  {tierGuidance.label}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    tier === 'T1'
                      ? 'border-green-500/30 text-green-400'
                      : tier === 'T2'
                        ? 'border-blue-500/30 text-blue-400'
                        : 'border-amber-500/30 text-amber-400'
                  }`}
                >
                  {tierGuidance.trustLevel}
                </Badge>
              </div>
              <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
              <p
                className={`text-sm font-medium ${
                  tier === 'T1'
                    ? 'text-green-400'
                    : tier === 'T2'
                      ? 'text-blue-400'
                      : 'text-amber-400'
                }`}
              >
                {tierGuidance.pointsRange}
              </p>
              {tierGuidance.warning && (
                <p className="text-xs text-amber-400 mt-2">{tierGuidance.warning}</p>
              )}
              {tierGuidance.tip && (
                <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
              )}
            </div>

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
              {tier === 'T3' && points > 25 && (
                <p className="text-xs text-amber-400">
                  ⚠️ High points for a manually verified task. Consider lowering to reduce abuse
                  potential.
                </p>
              )}
            </div>
            {taskType === 'tiktok_follow' ? (
              <div className="space-y-2">
                <Label className="text-white">TikTok Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            ) : taskType === 'tiktok_post' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Required Hashtags (Optional)</Label>
                  <Input
                    value={requiredHashtags}
                    onChange={(e) => setRequiredHashtags(e.target.value)}
                    placeholder="#Fandomly, #YourBrand, #Challenge"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    Comma-separated hashtags that fans must include in their TikTok post (leave
                    blank for no requirements)
                  </p>
                </div>
                <Alert className="bg-blue-500/10 border-blue-500/20">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-400 text-sm">
                    <strong>UGC Campaign:</strong> Fans will create their own TikTok posts with your
                    hashtags. Perfect for viral challenges and brand awareness!
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">TikTok Video URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://tiktok.com/@user/video/..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the TikTok video you want fans to{' '}
                    {taskType === 'tiktok_comment' ? 'comment on' : 'like'}
                  </p>
                </div>

                {/* Required Text for Comment Tasks */}
                {taskType === 'tiktok_comment' && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Text (Optional)</Label>
                    <Input
                      value={requiredText}
                      onChange={(e) => setRequiredText(e.target.value)}
                      placeholder="e.g., #Fandomly or 'Great content!'"
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
                  <p className="text-xs text-gray-400">Social engagement tasks are one-time only</p>
                </div>
                <Badge variant="outline" className="border-pink-500/30 text-pink-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-pink-500/10 border-pink-500/20">
                <Info className="h-4 w-4 text-pink-400" />
                <AlertDescription className="text-pink-400 text-sm">
                  This task can only be completed once per user. Multipliers and verification
                  cadence can be configured at the campaign level.
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-white font-semibold">Automatic Verification</Label>
                <Switch checked={useApiVerification} onCheckedChange={setUseApiVerification} />
              </div>
              {useApiVerification ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-400 text-sm">
                    <strong>Instant Rewards</strong>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-400 text-sm">
                    <strong>Manual Verification</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TaskBuilderBase>
  );
}
