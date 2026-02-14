/**
 * Twitch Task Builder Component
 *
 * Supports:
 * - twitch_follow: Follow Twitch Channel
 * - twitch_subscribe: Subscribe to Twitch Channel
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FaTwitch } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTwitchConnection } from "@/hooks/use-social-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Twitch has excellent EventSub API - all tasks are T1 (fully automated)
const TWITCH_TASK_TIERS: Record<string, VerificationTier> = {
  twitch_follow: 'T1',
  twitch_subscribe: 'T1',
};

interface TwitchTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'twitch_follow' | 'twitch_subscribe';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function TwitchTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: TwitchTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get verification tier for this task type (all Twitch tasks are T1)
  const tier = TWITCH_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];

  // Use unified Twitch connection hook
  const {
    isConnected: twitchConnected,
    isLoading: checkingConnection,
    userInfo: twitchUserInfo,
    connect: connectTwitch,
  } = useTwitchConnection();

  // Task settings
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);

  // Twitch-specific settings
  const [channelName, setChannelName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'any' | 'tier1' | 'tier2' | 'tier3'>('any');

  // Verification settings
  const [useApiVerification, setUseApiVerification] = useState(true);

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Auto-fill channel name when Twitch connects
  useEffect(() => {
    if (twitchConnected && twitchUserInfo?.username && !channelName && !isEditMode) {
      setChannelName(twitchUserInfo.username);
    }
  }, [twitchConnected, twitchUserInfo?.username, channelName, isEditMode]);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      // All Twitch tasks are T1 with API verification
      const defaults = taskType === 'twitch_follow'
        ? { name: 'Follow on Twitch', description: 'Follow us on Twitch!', points: 75 }
        : { name: 'Subscribe on Twitch', description: 'Subscribe to our Twitch channel!', points: 150 }; // Higher for paid subscription
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode, taskName]);

  // Load initial data for edit mode - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 50);
      
      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};
      
      setChannelName(settings.channelName || settings.username || '');
      setChannelId(settings.channelId || '');
      setSubscriptionTier(settings.subscriptionTier || 'any');
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!twitchConnected) {
      errors.push('You must connect your Twitch account before creating Twitch tasks');
    }

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!channelName.trim()) errors.push('Twitch channel name is required');

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, channelName, twitchConnected]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({ title: "Validation Error", description: validationErrors[0], variant: "destructive" });
      return;
    }

    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'twitch' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: {
        channelName,
        channelId: channelId || undefined,
        ...(taskType === 'twitch_subscribe' && {
          requireSubscription: true,
          subscriptionTier,
        }),
      },
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'twitch' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: {
        channelName,
        channelId: channelId || undefined,
        ...(taskType === 'twitch_subscribe' && {
          requireSubscription: true,
          subscriptionTier,
        }),
      },
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-purple-600/10 to-purple-400/10 rounded-lg border border-purple-500/20">
      <div className="flex items-center gap-3 mb-3">
        <FaTwitch className="h-5 w-5 text-purple-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-purple-400">Type:</span> {taskType === 'twitch_follow' ? 'Follow Channel' : 'Subscribe to Channel'}</p>
        <p><span className="text-purple-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-purple-400">Channel:</span> {channelName || 'Not set'}</p>
        {taskType === 'twitch_subscribe' && <p><span className="text-purple-400">Tier:</span> {subscriptionTier === 'any' ? 'Any' : subscriptionTier.toUpperCase()}</p>}
        <p><span className="text-purple-400">Points:</span> {points} points</p>
        <p><span className="text-purple-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<FaTwitch className="h-6 w-6 text-purple-400" />}
      title="Twitch Task"
      description="Create Twitch streaming engagement tasks"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Twitch tasks help grow your streaming audience."
      exampleUse="Offer 75 points for following your channel or 200 points for subscribing."
    >
      <div className="space-y-6">
      {!twitchConnected && !checkingConnection && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Twitch Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Twitch account before creating Twitch tasks.</p>
              </div>
              <button
                onClick={connectTwitch}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 ml-4"
              >
                Connect Twitch
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {twitchConnected && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Twitch Connected</strong> - Your Twitch account is linked and ready to use.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {taskType === 'twitch_follow' ? 'Follow Channel Configuration' : 'Subscribe Channel Configuration'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Follow on Twitch"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Follow our Twitch channel and join the stream!"
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
            <Label className="text-white">Twitch Channel Name *</Label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="yourchannel"
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Your Twitch channel name (e.g., ninja, pokimane)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Channel ID (Optional)</Label>
            <Input
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="123456789"
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Your Twitch channel ID (for API verification)
            </p>
          </div>

          {taskType === 'twitch_subscribe' && (
            <div className="space-y-2">
              <Label className="text-white">Subscription Tier</Label>
              <Select value={subscriptionTier} onValueChange={(value: any) => setSubscriptionTier(value)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select subscription tier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="any" className="text-white hover:bg-white/10">Any Tier</SelectItem>
                  <SelectItem value="tier1" className="text-white hover:bg-white/10">Tier 1 ($4.99)</SelectItem>
                  <SelectItem value="tier2" className="text-white hover:bg-white/10">Tier 2 ($9.99)</SelectItem>
                  <SelectItem value="tier3" className="text-white hover:bg-white/10">Tier 3 ($24.99)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Which subscription tier is required to complete this task
              </p>
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
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                One-time
              </Badge>
            </div>
            <Alert className="bg-purple-500/10 border-purple-500/20">
              <Info className="h-4 w-4 text-purple-400" />
              <AlertDescription className="text-purple-400 text-sm">
                This task can only be completed once per user. Multipliers and verification cadence can be configured at the campaign level.
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
                  <strong>Instant Rewards</strong> - Fans will be automatically verified via Twitch API
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400 text-sm">
                  <strong>Manual Verification</strong> - You'll need to manually approve completions
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
