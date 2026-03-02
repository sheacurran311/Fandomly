/**
 * Patreon Task Builder Component
 *
 * Supports:
 * - patreon_support: Become a Patron (T1 - API verified)
 * - patreon_tier_check: Join Specific Tier (T1 - API verified)
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
import { FaPatreon } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePatreonConnection } from '@/hooks/use-social-connection';
import TaskBuilderBase from './TaskBuilderBase';
import { TIER_GUIDANCE, type VerificationTier } from '@shared/taskTemplates';

const PATREON_TASK_TIERS: Record<string, VerificationTier> = {
  patreon_support: 'T1',
  patreon_tier_check: 'T1',
};

interface PatreonTaskBuilderProps {
  onSave: (config: Record<string, unknown>) => void;
  onPublish: (config: Record<string, unknown>) => void;
  onBack: () => void;
  taskType: 'patreon_support' | 'patreon_tier_check';
  initialData?: Record<string, unknown>;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function PatreonTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: PatreonTaskBuilderProps) {
  const { toast } = useToast();

  const tier = PATREON_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];

  const {
    isConnected: patreonConnected,
    isLoading: checkingConnection,
    userInfo: patreonUserInfo,
    connect: connectPatreon,
  } = usePatreonConnection();

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [campaignUrl, setCampaignUrl] = useState('');
  const [tierName, setTierName] = useState('');
  const [minimumAmountCents, setMinimumAmountCents] = useState(0);
  const [useApiVerification, setUseApiVerification] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Auto-fill campaign URL from connected Patreon profile
  useEffect(() => {
    if (patreonConnected && patreonUserInfo && !campaignUrl && !isEditMode) {
      const profileData = (patreonUserInfo as Record<string, unknown>)?.profileData as
        | Record<string, string>
        | undefined;
      if (profileData?.url) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCampaignUrl(profileData.url);
      }
    }
  }, [patreonConnected, patreonUserInfo, campaignUrl, isEditMode]);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults =
        taskType === 'patreon_support'
          ? {
              name: 'Become a Patron',
              description: 'Support us on Patreon and earn rewards!',
              points: 200,
            }
          : {
              name: 'Join Patreon Tier',
              description: 'Join a specific Patreon tier for bonus rewards!',
              points: 150,
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
        unknown
      >;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCampaignUrl((settings.campaignUrl as string) || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTierName((settings.tierName as string) || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMinimumAmountCents((settings.minimumAmountCents as number) || 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseApiVerification((initialData.verificationMethod as string) === 'api');
    }
  }, [isEditMode, initialData]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];
    if (!patreonConnected) {
      errors.push('You must connect your Patreon account before creating Patreon tasks');
    }
    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!campaignUrl.trim()) errors.push('Patreon campaign URL is required');
    if (taskType === 'patreon_tier_check' && !tierName.trim()) {
      errors.push('Tier name is required for tier check tasks');
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationErrors(errors);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsValid(errors.length === 0);
  }, [taskName, description, points, campaignUrl, tierName, taskType, patreonConnected]);

  const buildConfig = (isDraft: boolean) => ({
    name: taskName,
    description,
    taskType,
    platform: 'patreon' as const,
    points,
    isDraft,
    verificationMethod: useApiVerification ? 'api' : 'manual',
    settings: {
      campaignUrl,
      ...(taskType === 'patreon_tier_check' && {
        tierName,
        minimumAmountCents: minimumAmountCents || undefined,
      }),
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
    <div className="p-4 bg-gradient-to-r from-[#FF424D]/10 to-[#FF424D]/5 rounded-lg border border-[#FF424D]/20">
      <div className="flex items-center gap-3 mb-3">
        <FaPatreon className="h-5 w-5 text-[#FF424D]" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-[#FF424D]">Type:</span>{' '}
          {taskType === 'patreon_support' ? 'Become a Patron' : 'Join Specific Tier'}
        </p>
        <p>
          <span className="text-[#FF424D]">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-[#FF424D]">Campaign:</span> {campaignUrl || 'Not set'}
        </p>
        {taskType === 'patreon_tier_check' && (
          <p>
            <span className="text-[#FF424D]">Tier:</span> {tierName || 'Not set'}
          </p>
        )}
        <p>
          <span className="text-[#FF424D]">Points:</span> {points} points
        </p>
        <p>
          <span className="text-[#FF424D]">Verification:</span>{' '}
          {useApiVerification ? 'API' : 'Manual'}
        </p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<FaPatreon className="h-6 w-6 text-[#FF424D]" />}
      title="Patreon Task"
      description="Create Patreon membership engagement tasks"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Patreon tasks incentivize fans to support you financially."
      exampleUse="Offer 200 points for becoming a patron or 150 points for joining a specific tier."
    >
      <div className="space-y-6">
        {!patreonConnected && !checkingConnection && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Patreon Not Connected</strong>
                  <p className="text-sm mt-1">
                    You must connect your Patreon account before creating Patreon tasks.
                  </p>
                </div>
                <button
                  onClick={connectPatreon}
                  className="px-4 py-2 bg-[#FF424D] text-white rounded-lg hover:bg-[#FF424D]/80 ml-4"
                >
                  Connect Patreon
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {patreonConnected && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Patreon Connected</strong> - Your Patreon account is linked and ready to use.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'patreon_support'
                ? 'Patron Support Configuration'
                : 'Tier Membership Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder={
                  taskType === 'patreon_support' ? 'Become a Patron' : 'Join Patreon Tier'
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Support us on Patreon and earn rewards!"
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
              <Label className="text-white">Patreon Campaign URL *</Label>
              <Input
                value={campaignUrl}
                onChange={(e) => setCampaignUrl(e.target.value)}
                placeholder="https://www.patreon.com/yourcreatorname"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">Your Patreon campaign URL</p>
            </div>

            {taskType === 'patreon_tier_check' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Tier Name *</Label>
                  <Input
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="Gold Supporter"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    The name of the Patreon tier fans must join
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Minimum Amount (cents, optional)</Label>
                  <NumberInput
                    value={minimumAmountCents}
                    onChange={(val) => setMinimumAmountCents(val || 0)}
                    min={0}
                    max={100000}
                    allowEmpty={false}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    Minimum pledge amount in cents (e.g., 500 = $5.00). Leave at 0 to accept any
                    amount in the tier.
                  </p>
                </div>
              </>
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
                <Badge variant="outline" className="border-[#FF424D]/30 text-[#FF424D]">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-[#FF424D]/10 border-[#FF424D]/20">
                <Info className="h-4 w-4 text-[#FF424D]" />
                <AlertDescription className="text-[#FF424D] text-sm">
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
                    <strong>Instant Rewards</strong> - Fans will be automatically verified via
                    Patreon API
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
