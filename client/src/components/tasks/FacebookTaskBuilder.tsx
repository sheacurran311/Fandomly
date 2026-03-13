/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Facebook Task Builder Component
 *
 * Allows creators to create Facebook-based tasks with:
 * - Follow (Like Page) tasks
 * - Like Post tasks
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContentPickerModal } from './ContentPickerModal';
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
import { SiFacebook } from 'react-icons/si';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFacebookConnection } from '@/hooks/use-social-connection';
import TaskBuilderBase from './TaskBuilderBase';
import { TIER_GUIDANCE, type VerificationTier } from '@shared/taskTemplates';

// Task type to verification tier mapping for Facebook
// Like tasks are T3 (manual), Comment tasks with required text are T2 (code-based)
const FACEBOOK_TASK_TIERS: Record<string, VerificationTier> = {
  facebook_like_page: 'T3',
  facebook_like_post: 'T3',
  facebook_comment_post: 'T2',
  facebook_comment_photo: 'T2',
};

interface FacebookTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType:
    | 'facebook_like_page'
    | 'facebook_like_post'
    | 'facebook_comment_post'
    | 'facebook_comment_photo';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function FacebookTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: FacebookTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get verification tier for this task type
  const tier = FACEBOOK_TASK_TIERS[taskType] || 'T3';
  const tierGuidance = TIER_GUIDANCE[tier];

  // Use unified Facebook connection hook
  const {
    isConnected: facebookConnected,
    isLoading: checkingConnection,
    userInfo: facebookUserInfo,
    connect: connectFacebook,
  } = useFacebookConnection();

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [pageUrl, setPageUrl] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [requiredText, setRequiredText] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

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
      setPoints(initialData.pointsToReward || initialData.points || 50);

      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};

      const derivedPageUrl = settings.pageUrl || settings.profileUrl || settings.contentUrl;
      const derivedPostUrl = settings.postUrl || settings.contentUrl;

      if (derivedPageUrl) {
        setPageUrl(derivedPageUrl);
      }
      if (derivedPostUrl) {
        setPostUrl(derivedPostUrl);
      }
      if (settings.requiredText) {
        setRequiredText(settings.requiredText);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  // Auto-fill page URL when Facebook connects
  useEffect(() => {
    if (
      facebookConnected &&
      facebookUserInfo?.id &&
      taskType === 'facebook_like_page' &&
      !pageUrl &&
      !isEditMode
    ) {
      setPageUrl(`https://facebook.com/${facebookUserInfo.id}`);
    }
  }, [facebookConnected, facebookUserInfo?.id, taskType, pageUrl, isEditMode]);

  const getDefaultValues = () => {
    // Get tier-appropriate recommended points
    const taskTier = FACEBOOK_TASK_TIERS[taskType] || 'T3';
    const guidance = TIER_GUIDANCE[taskTier];

    switch (taskType) {
      case 'facebook_like_page':
        return {
          name: 'Like Our Facebook Page',
          description: 'Like our Facebook page to stay connected!',
          points: 20, // T3: Lower points for manual verification
        };
      case 'facebook_like_post':
        return {
          name: 'Like Our Facebook Post',
          description: 'Show some love by liking our Facebook post!',
          points: 15, // T3: Lower for simple engagement
        };
      case 'facebook_comment_post':
        return {
          name: 'Comment on Facebook Post',
          description: 'Share your thoughts by commenting on our Facebook post!',
          points: guidance.recommendedPoints, // T2: 40 pts - code verified
        };
      case 'facebook_comment_photo':
        return {
          name: 'Comment on Facebook Photo',
          description: 'Tell us what you think about our Facebook photo!',
          points: guidance.recommendedPoints, // T2: 40 pts - code verified
        };
      default:
        return { name: '', description: '', points: guidance.recommendedPoints };
    }
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];

    // Check Facebook connection first
    if (!facebookConnected) {
      errors.push('You must connect your Facebook account before creating Facebook tasks');
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

    if (taskType === 'facebook_like_page') {
      if (!pageUrl.trim()) {
        errors.push('Facebook page URL is required');
      } else if (!pageUrl.includes('facebook.com')) {
        errors.push('Invalid Facebook page URL');
      }
    } else {
      if (!postUrl.trim()) {
        errors.push('Facebook post URL is required');
      } else if (!postUrl.includes('facebook.com')) {
        errors.push('Invalid Facebook post URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);

    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, pageUrl, postUrl, requiredText, taskType, facebookConnected]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'facebook' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };

    if (taskType === 'facebook_like_page') {
      return {
        ...baseConfig,
        settings: {
          pageUrl,
        },
      };
    } else if (taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo') {
      return {
        ...baseConfig,
        settings: {
          postUrl,
          requiredText: requiredText || undefined,
        },
      };
    } else {
      return {
        ...baseConfig,
        settings: {
          postUrl,
        },
      };
    }
  };

  const handleSaveClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: 'Validation Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    onSave(buildTaskConfig(true));
  };

  const handlePublishClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: 'Cannot Publish Task',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    onPublish(buildTaskConfig(false));
  };

  const getTaskTypeLabel = () => {
    switch (taskType) {
      case 'facebook_like_page':
        return 'Like Page';
      case 'facebook_like_post':
        return 'Like Post';
      case 'facebook_comment_post':
        return 'Comment';
      case 'facebook_comment_photo':
        return 'Comment';
      default:
        return 'Facebook Task';
    }
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-blue-600/10 to-blue-400/10 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiFacebook className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-blue-400">Type:</span> {getTaskTypeLabel()}
        </p>
        <p>
          <span className="text-blue-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-blue-400">Points:</span> {points} points
        </p>
        <p>
          <span className="text-blue-400">Verification:</span>{' '}
          {useApiVerification ? 'API' : 'Manual'}
        </p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiFacebook className="h-6 w-6 text-blue-600" />}
      title="Facebook Task"
      description="Create Facebook-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Facebook tasks help increase your social media engagement. Fans earn points for following your page or liking your posts."
      exampleUse="A creator could offer 50 points for fans to like their Facebook page, or 25 points for liking a specific post announcing an event."
    >
      <div className="space-y-6">
        {/* Facebook Connection Status */}
        {!checkingConnection && !facebookConnected && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Facebook Not Connected</strong>
                  <p className="text-sm mt-1">
                    You must connect your Facebook account before creating Facebook tasks.
                  </p>
                </div>
                <Button
                  onClick={connectFacebook}
                  className="bg-[#1877F2] text-white hover:bg-[#1877F2]/80 ml-4"
                >
                  <SiFacebook className="h-4 w-4 mr-2" />
                  Connect Facebook
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!checkingConnection && facebookConnected && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Facebook Connected</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'facebook_like_page' && 'Like Page Configuration'}
              {taskType === 'facebook_like_post' && 'Like Post Configuration'}
              {taskType === 'facebook_comment_post' && 'Comment on Post Configuration'}
              {taskType === 'facebook_comment_photo' && 'Comment on Photo Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Follow us on Facebook"
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what fans need to do"
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
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
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
              />
              <p className="text-xs text-gray-400">
                How many points fans will earn for completing this task
              </p>
              {tier === 'T3' && points > 25 && (
                <p className="text-xs text-amber-400">
                  ⚠️ High points for a manually verified task. Consider lowering to reduce abuse
                  potential.
                </p>
              )}
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'facebook_like_page' ? (
              <div className="space-y-2">
                <Label className="text-white">Facebook Page URL</Label>
                <Input
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!facebookConnected}
                />
                <p className="text-xs text-gray-400">The full URL of your Facebook page</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">
                    {taskType === 'facebook_comment_photo'
                      ? 'Facebook Photo URL'
                      : 'Facebook Post URL'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      placeholder="https://facebook.com/username/posts/1234567890"
                      className={`bg-white/5 border-white/10 text-white flex-1 ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!facebookConnected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContentPicker(true)}
                      className="whitespace-nowrap"
                    >
                      Pick Content
                    </Button>
                  </div>
                  <ContentPickerModal
                    open={showContentPicker}
                    onClose={() => setShowContentPicker(false)}
                    platform="facebook"
                    onSelect={({ url }) => {
                      setPostUrl(url);
                      setShowContentPicker(false);
                    }}
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the Facebook{' '}
                    {taskType === 'facebook_comment_photo' ? 'photo' : 'post'} you want fans to{' '}
                    {taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo'
                      ? 'comment on'
                      : 'like'}
                  </p>
                </div>

                {/* Required Text field for comment tasks */}
                {(taskType === 'facebook_comment_post' ||
                  taskType === 'facebook_comment_photo') && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Text (Optional)</Label>
                    <Input
                      value={requiredText}
                      onChange={(e) => setRequiredText(e.target.value)}
                      placeholder="e.g., #MyBrand or specific keyword"
                      className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!facebookConnected}
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
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-400 text-sm">
                  This task can only be completed once per user. Multipliers and verification
                  cadence can be configured at the campaign level.
                </AlertDescription>
              </Alert>
            </div>

            {/* API Verification Toggle */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-white font-semibold">Automatic Verification</Label>
                  <p className="text-xs text-gray-400">
                    Use Facebook API to verify task completion (requires Facebook connection)
                  </p>
                </div>
                <Switch checked={useApiVerification} onCheckedChange={setUseApiVerification} />
              </div>

              {useApiVerification ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-400 text-sm">
                    <strong>Instant Rewards:</strong> Fans will get points immediately after
                    completing the task!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-400 text-sm">
                    <strong>Manual Verification:</strong> You&apos;ll need to manually approve each
                    completion.
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
                      <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <SiFacebook className="h-5 w-5 text-blue-600" />
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
