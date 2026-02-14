/**
 * Discord Task Builder Component
 *
 * Supports:
 * - discord_join: Join Discord Server
 * - discord_verify: Have Discord Member Role
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FaDiscord } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useDiscordConnection } from "@/hooks/use-social-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Discord has excellent API support via bot - all tasks are T1 (fully automated)
const DISCORD_TASK_TIERS: Record<string, VerificationTier> = {
  discord_join: 'T1',
  discord_verify: 'T1',
};

interface DiscordTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'discord_join' | 'discord_verify';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function DiscordTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: DiscordTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get verification tier for this task type (all Discord tasks are T1)
  const tier = DISCORD_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];

  // Use unified Discord connection hook
  const {
    isConnected: discordConnected,
    isLoading: checkingConnection,
    connect: connectDiscord,
    userInfo: discordUserInfo,
  } = useDiscordConnection();

  // Task settings
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);

  // Discord-specific settings
  const [serverInviteUrl, setServerInviteUrl] = useState('');
  const [serverId, setServerId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [requireRole, setRequireRole] = useState(taskType === 'discord_verify');

  // Verification settings
  const [useApiVerification, setUseApiVerification] = useState(true);

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      // All Discord tasks are T1 with API verification
      const defaults = taskType === 'discord_join'
        ? { name: 'Join Our Discord Server', description: 'Join our Discord community!', points: 75 }
        : { name: 'Get Discord Member Role', description: 'Verify your Discord membership!', points: 100 }; // Higher for role verification
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
      
      setServerInviteUrl(settings.serverInviteUrl || '');
      setServerId(settings.serverId || '');
      setRoleId(settings.roleId || '');
      setRequireRole(settings.requireRole || taskType === 'discord_verify');
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData, taskType]);

  // Auto-populate from connected Discord profile when creating new tasks
  useEffect(() => {
    if (!isEditMode && discordConnected && discordUserInfo) {
      const profileData = (discordUserInfo as any)?.profileData || {};
      const defaultInvite = profileData.inviteUrl || profileData.serverInviteUrl;
      const defaultServerId = profileData.serverId || profileData.guildId;
      const defaultRoleId = profileData.roleId;

      if (!serverInviteUrl && defaultInvite) {
        setServerInviteUrl(defaultInvite);
      }
      if (!serverId && defaultServerId) {
        setServerId(defaultServerId);
      }
      if (requireRole && !roleId && defaultRoleId) {
        setRoleId(defaultRoleId);
      }
    }
  }, [isEditMode, discordConnected, discordUserInfo, serverInviteUrl, serverId, roleId, requireRole]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!discordConnected) {
      errors.push('You must connect your Discord account before creating Discord tasks');
    }

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!serverInviteUrl.trim()) errors.push('Discord server invite URL is required');

    if (requireRole && !roleId.trim()) {
      errors.push('Role ID is required when requiring a specific role');
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, serverInviteUrl, serverId, roleId, requireRole, discordConnected]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({ title: "Validation Error", description: validationErrors[0], variant: "destructive" });
      return;
    }

    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'discord' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: {
        serverInviteUrl,
        serverId: serverId || undefined,
        roleId: roleId || undefined,
        requireRole,
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
      platform: 'discord' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: {
        serverInviteUrl,
        serverId: serverId || undefined,
        roleId: roleId || undefined,
        requireRole,
      },
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-purple-600/10 to-blue-500/10 rounded-lg border border-purple-500/20">
      <div className="flex items-center gap-3 mb-3">
        <FaDiscord className="h-5 w-5 text-purple-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-purple-400">Type:</span> {taskType === 'discord_join' ? 'Join Discord Server' : 'Get Discord Member Role'}</p>
        <p><span className="text-purple-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-purple-400">Points:</span> {points} points</p>
        {requireRole && <p><span className="text-purple-400">Requires Role:</span> Yes</p>}
        <p><span className="text-purple-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<FaDiscord className="h-6 w-6 text-purple-400" />}
      title="Discord Task"
      description="Create Discord community engagement tasks"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Discord tasks help build your community on Discord."
      exampleUse="Offer 100 points for joining your Discord server or 150 points for obtaining a specific member role."
    >
      <div className="space-y-6">
      {!discordConnected && !checkingConnection && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Discord Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Discord account before creating Discord tasks.</p>
              </div>
              <button
                onClick={connectDiscord}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 ml-4"
              >
                Connect Discord
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {discordConnected && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Discord Connected</strong> - Your Discord account is linked and ready to use.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {taskType === 'discord_join' ? 'Join Server Configuration' : 'Member Role Configuration'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Join Our Discord Server"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Join our Discord community and connect with other fans!"
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
            <Label className="text-white">Discord Server Invite URL *</Label>
            <Input
              value={serverInviteUrl}
              onChange={(e) => setServerInviteUrl(e.target.value)}
              placeholder="https://discord.gg/..."
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              The invite link to your Discord server (e.g., https://discord.gg/yourserver)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Server ID (Optional)</Label>
            <Input
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="123456789012345678"
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Your Discord server ID (for API verification)
            </p>
          </div>

          {(taskType === 'discord_verify' || requireRole) && (
            <div className="space-y-2">
              <Label className="text-white">Role ID{requireRole ? ' *' : ' (Optional)'}</Label>
              <Input
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                placeholder="987654321098765432"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                The Discord role ID that fans must have
              </p>
            </div>
          )}

          {taskType === 'discord_join' && (
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-white font-semibold">Require Specific Role</Label>
                <Switch checked={requireRole} onCheckedChange={setRequireRole} />
              </div>
              <p className="text-xs text-gray-400">
                If enabled, fans must obtain a specific role to complete the task
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
                  <strong>Instant Rewards</strong> - Fans will be automatically verified via Discord API
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
