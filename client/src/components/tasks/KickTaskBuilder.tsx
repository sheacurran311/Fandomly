/**
 * Kick Task Builder Component
 *
 * Supports:
 * - kick_follow: Follow Kick Channel (T1 - API verified)
 * - kick_subscribe: Subscribe to Kick Channel (T1 - API verified)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SiKick } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import { useKickConnection } from '@/hooks/use-social-connection';
import TaskBuilderBase from './TaskBuilderBase';
import { TIER_GUIDANCE, type VerificationTier } from '@shared/taskTemplates';

const KICK_TASK_TIERS: Record<string, VerificationTier> = {
  kick_follow: 'T1',
  kick_subscribe: 'T1',
};

interface KickTaskBuilderProps {
  onSave: (config: Record<string, unknown>) => void;
  onPublish: (config: Record<string, unknown>) => void;
  onBack: () => void;
  taskType: 'kick_follow' | 'kick_subscribe';
  initialData?: Record<string, unknown>;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function KickTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: KickTaskBuilderProps) {
  const { toast } = useToast();

  const tier = KICK_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];

  const {
    isConnected: kickConnected,
    isLoading: checkingConnection,
    userInfo: kickUserInfo,
    connect: connectKick,
  } = useKickConnection();

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [channelName, setChannelName] = useState('');
  const [channelSlug, setChannelSlug] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Auto-fill channel name when Kick connects
  useEffect(() => {
    if (kickConnected && kickUserInfo?.username && !channelName && !isEditMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannelName(kickUserInfo.username);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannelSlug(kickUserInfo.username);
    }
  }, [kickConnected, kickUserInfo?.username, channelName, isEditMode]);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults =
        taskType === 'kick_follow'
          ? { name: 'Follow on Kick', description: 'Follow our Kick channel!', points: 50 }
          : {
              name: 'Subscribe on Kick',
              description: 'Subscribe to our Kick channel!',
              points: 200,
            };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskName(defaults.name);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(defaults.description);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode, taskName]);

  // Load initial data for edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskName((initialData.name as string) || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription((initialData.description as string) || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoints((initialData.pointsToReward as number) || (initialData.points as number) || 50);

      const settings = (initialData.settings || initialData.customSettings || {}) as Record<
        string,
        string
      >;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannelName(settings.channelName || settings.username || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannelSlug(settings.channelSlug || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseApiVerification((initialData.verificationMethod as string) === 'api');
    }
  }, [isEditMode, initialData]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];
    if (!kickConnected) {
      errors.push('You must connect your Kick account before creating Kick tasks');
    }
    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!channelName.trim()) errors.push('Kick channel name is required');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationErrors(errors);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsValid(errors.length === 0);
  }, [taskName, description, points, channelName, kickConnected]);

  const buildConfig = (isDraft: boolean) => ({
    name: taskName,
    description,
    taskType,
    platform: 'kick' as const,
    points,
    isDraft,
    verificationMethod: useApiVerification ? 'api' : 'manual',
    settings: {
      channelName,
      channelSlug: channelSlug || channelName,
      ...(taskType === 'kick_subscribe' && { requireSubscription: true }),
    },
    rewardFrequency: 'one_time' as const,
  });

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }
    onPublish(buildConfig(false));
  };

  const handleSaveClick = () => {
    onSave(buildConfig(true));
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-green-600/10 to-green-400/10 rounded-lg border border-green-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiKick className="h-5 w-5 text-green-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-green-400">Type:</span>{' '}
          {taskType === 'kick_follow' ? 'Follow Channel' : 'Subscribe to Channel'}
        </p>
        <p>
          <span className="text-green-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-green-400">Channel:</span> {channelName || 'Not set'}
        </p>
        <p>
          <span className="text-green-400">Points:</span> {points} points
        </p>
        <p>
          <span className="text-green-400">Verification:</span>{' '}
          {useApiVerification ? 'API' : 'Manual'}
        </p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiKick className="h-6 w-6 text-green-400" />}
      title="Kick Task"
      description="Create Kick streaming engagement tasks"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Kick tasks help grow your streaming audience."
      exampleUse="Offer 50 points for following your channel or 200 points for subscribing."
    >
      <div className="space-y-6">
        {!kickConnected && !checkingConnection && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Kick Not Connected</strong>
                  <p className="text-sm mt-1">
                    You must connect your Kick account before creating Kick tasks.
                  </p>
                </div>
                <button
                  onClick={connectKick}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-4"
                >
                  Connect Kick
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {kickConnected && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Kick Connected</strong> - Your Kick account is linked and ready to use.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'kick_follow'
                ? 'Follow Channel Configuration'
                : 'Subscribe Channel Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder={taskType === 'kick_follow' ? 'Follow on Kick' : 'Subscribe on Kick'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Follow our Kick channel and join the stream!"
              />
            </div>

            {/* Verification Tier Guidance */}
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <span className="font-medium text-green-400">{tierGuidance.label}</span>
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                  {tierGuidance.trustLevel}
                </Badge>
              </div>
              <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
              <p className="text-sm font-medium text-green-400">{tierGuidance.pointsRange}</p>
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
            </div>

            <div className="space-y-2">
              <Label className="text-white">Kick Channel Name *</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="yourchannel"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">Your Kick channel name (e.g., xqc, amouranth)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Channel Slug (Optional)</Label>
              <Input
                value={channelSlug}
                onChange={(e) => setChannelSlug(e.target.value)}
                placeholder="yourchannel"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                The URL slug for your Kick channel (defaults to channel name)
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
                  <p className="text-xs text-gray-400">Social engagement tasks are one-time only</p>
                </div>
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-green-500/10 border-green-500/20">
                <Info className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400 text-sm">
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
                    <strong>Instant Rewards</strong> - Fans will be automatically verified via Kick
                    API
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-400 text-sm">
                    <strong>Manual Verification</strong> - You&apos;ll need to manually approve
                    completions
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
