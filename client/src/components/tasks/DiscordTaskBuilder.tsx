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
import { CheckCircle2, AlertCircle } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { SocialIntegrationManager } from "@/lib/social-integrations";

interface DiscordTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'discord_join' | 'discord_verify';
  initialData?: any;
  isEditMode?: boolean;
}

export default function DiscordTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
}: DiscordTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Task settings
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);

  // Discord-specific settings
  const [serverInviteUrl, setServerInviteUrl] = useState('');
  const [serverId, setServerId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [requireRole, setRequireRole] = useState(taskType === 'discord_verify');

  // Verification settings
  const [useApiVerification, setUseApiVerification] = useState(true);

  // Connection status
  const [discordConnected, setDiscordConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Check Discord connection
  useEffect(() => {
    const checkDiscordConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/discord', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setDiscordConnected(data.connected);
        } else {
          setDiscordConnected(false);
        }
      } catch (error) {
        console.error('[DiscordTaskBuilder] Error checking Discord connection:', error);
        setDiscordConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    if (user?.id) {
      checkDiscordConnection();
    }
  }, [user?.id, user?.dynamicUserId]);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = taskType === 'discord_join'
        ? { name: 'Join Our Discord Server', description: 'Join our Discord community!', points: 100 }
        : { name: 'Get Discord Member Role', description: 'Verify your Discord membership!', points: 150 };
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode, taskName]);

  // Load initial data for edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.points || initialData.pointsToReward || 50);
      setServerInviteUrl(initialData.settings?.serverInviteUrl || '');
      setServerId(initialData.settings?.serverId || '');
      setRoleId(initialData.settings?.roleId || '');
      setRequireRole(initialData.settings?.requireRole || taskType === 'discord_verify');
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData, taskType]);

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
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Discord tasks help build your community on Discord."
      exampleUse="Offer 100 points for joining your Discord server or 150 points for obtaining a specific member role."
    >
      {!discordConnected && !checkingConnection && (
        <Alert className="mb-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Discord Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Discord account before creating Discord tasks.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const socialManager = new SocialIntegrationManager();
                    const result = await socialManager['discord'].secureLogin();

                    if (result.success) {
                      toast({ title: "Discord Connected! 🎮" });
                      const response = await fetch('/api/social-connections/discord', {
                        headers: {
                          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });

                      if (response.ok) {
                        const data = await response.json();
                        setDiscordConnected(data.connected || false);
                        setCheckingConnection(false);
                      }
                    } else {
                      toast({
                        title: "Connection Failed",
                        description: result.error || "Failed to connect Discord",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    console.error('Discord connection error:', error);
                    toast({ title: "Error", description: "Failed to connect Discord", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 ml-4"
              >
                Connect Discord
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {discordConnected && (
        <Alert className="mb-4 bg-green-500/10 border-green-500/20">
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
    </TaskBuilderBase>
  );
}
