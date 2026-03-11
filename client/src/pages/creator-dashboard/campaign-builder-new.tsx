/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi, queryClient } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Check,
  Rocket,
  AlertCircle,
  Plus,
  X,
  Clock,
  Trophy,
  Gift,
  Users,
  CheckSquare,
  Lock,
  Award,
  Loader2,
  GripVertical,
  Zap,
  Shield,
  Hash,
  Calendar,
  Target,
  Save,
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  useCreateCampaign,
  useUpdateCampaign,
  usePublishCampaign,
  useCampaignBuilderData,
  useAddSponsor,
  useRemoveSponsor,
  useCampaignSponsors,
} from '@/hooks/useCampaignBuilder';
import type { Task, Campaign } from '@shared/schema';
import { RewardPickerDialog } from '@/components/campaigns/reward-picker-dialog';
import { Image, Ticket } from 'lucide-react';
import { CollapsibleSection } from '@/components/program/collapsible-section';
import { useToast } from '@/hooks/use-toast';

const PLATFORMS = [
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@handle' },
  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
  { key: 'youtube', label: 'YouTube', placeholder: '@channel' },
  { key: 'facebook', label: 'Facebook', placeholder: 'Page name' },
  { key: 'twitch', label: 'Twitch', placeholder: '@handle' },
  { key: 'discord', label: 'Discord', placeholder: 'Server invite' },
  { key: 'kick', label: 'Kick', placeholder: '@handle' },
];

// ============================================================================
// Types
// ============================================================================

interface CompletionReward {
  type: 'nft' | 'raffle_entry' | 'badge' | 'reward';
  rewardId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  displayName?: string;
  displayImage?: string;
}

interface SponsorData {
  id?: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  socialHandles: Record<string, string>;
  showInCampaignBanner: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export default function CampaignBuilderNew() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Core state
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Unified campaign data state
  const [campaignData, setCampaignData] = useState({
    // Basics
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isIndefinite: false,
    bannerImageUrl: '',
    accentColor: '#8B5CF6',
    // Task Flow
    enforceSequentialTasks: false,
    verificationMode: 'immediate' as 'immediate' | 'deferred',
    // Rewards
    campaignMultiplier: 1,
    completionBonusPoints: 0,
    // Gating
    accessCodeEnabled: false,
    accessCode: '',
    minimumReputationScore: 0,
    requiredPreviousCampaigns: [] as string[],
    requiredBadgeIds: [] as string[],
    requiredNftCollectionIds: [] as string[],
  });

  const [completionRewards, setCompletionRewards] = useState<CompletionReward[]>([]);
  const [sponsors, setSponsors] = useState<SponsorData[]>([]);
  const [assignedTaskIds, setAssignedTaskIds] = useState<string[]>([]);

  // UI state
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Mutations
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const publishCampaign = usePublishCampaign();
  const addSponsorMutation = useAddSponsor();
  const removeSponsorMutation = useRemoveSponsor();

  // Queries
  const { data: builderData } = useCampaignBuilderData(campaignId);
  const { data: savedSponsors = [] } = useCampaignSponsors(campaignId);

  const { data: availableTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: () => fetchApi<Task[]>('/api/tasks'),
    enabled: !!user?.creator?.id,
  });

  const { data: previousCampaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns/creator', user?.creator?.id],
    queryFn: () => fetchApi<Campaign[]>(`/api/campaigns/creator/${user?.creator?.id}`),
    enabled: !!user?.creator?.id,
  });

  // Task assignment mutations
  const assignTaskMutation = useMutation({
    mutationFn: ({ taskId, campaignId }: { taskId: string; campaignId: string }) =>
      fetchApi(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ campaignId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', campaignId] });
    },
  });

  const unassignTaskMutation = useMutation({
    mutationFn: ({ taskId, campaignId }: { taskId: string; campaignId: string }) =>
      fetchApi(`/api/tasks/${taskId}/unassign`, {
        method: 'DELETE',
        body: JSON.stringify({ campaignId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-builder', campaignId] });
    },
  });

  // Create task inline
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    description: '',
    taskType: 'twitter_follow',
    points: 100,
    targetUrl: '',
    targetUsername: '',
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Record<string, unknown>) =>
      fetchApi('/api/tasks', { method: 'POST', body: JSON.stringify(taskData) }) as Promise<
        Record<string, unknown>
      >,
    onSuccess: async (newTask: Record<string, unknown>) => {
      if (campaignId && newTask.id) {
        await assignTaskMutation.mutateAsync({ taskId: newTask.id as string, campaignId });
        setAssignedTaskIds((prev) => [...prev, newTask.id as string]);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsTaskModalOpen(false);
      setNewTaskData({
        name: '',
        description: '',
        taskType: 'twitter_follow',
        points: 100,
        targetUrl: '',
        targetUsername: '',
      });
    },
  });

  // Sponsor management
  const [sponsorForm, setSponsorForm] = useState({
    name: '',
    logoUrl: '',
    websiteUrl: '',
    socialHandles: {} as Record<string, string>,
    showInCampaignBanner: true,
  });

  const handleAddSponsor = async () => {
    if (!sponsorForm.name) return;
    if (campaignId) {
      await addSponsorMutation.mutateAsync({
        campaignId,
        data: { ...sponsorForm },
      });
    } else {
      setSponsors((prev) => [...prev, { ...sponsorForm }]);
    }
    setSponsorForm({
      name: '',
      logoUrl: '',
      websiteUrl: '',
      socialHandles: {},
      showInCampaignBanner: true,
    });
    setSponsorModalOpen(false);
  };

  const handleRemoveSponsor = async (index: number) => {
    const sponsor = campaignId ? savedSponsors[index] : sponsors[index];
    if (campaignId && sponsor?.id) {
      await removeSponsorMutation.mutateAsync(sponsor.id);
    } else {
      setSponsors((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const displaySponsors = campaignId ? savedSponsors : sponsors;

  // Load builder data into state
  const builderDataJson = builderData ? JSON.stringify((builderData as any).campaign.id) : null;
  useEffect(() => {
    if (!builderData) return;
    const c = (builderData as any).campaign;
    const campaignAny = c as Record<string, unknown>;
    const reqAny = ((c as any).requirements || {}) as Record<string, unknown>;
    setCampaignData({
      name: c.name || '',
      description: c.description || '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
      isIndefinite: !c.endDate,
      bannerImageUrl: (campaignAny.bannerImageUrl as string) || '',
      accentColor: (campaignAny.accentColor as string) || '#8B5CF6',
      enforceSequentialTasks: (campaignAny.enforceSequentialTasks as boolean) || false,
      verificationMode: (campaignAny.verificationMode as 'immediate' | 'deferred') || 'immediate',
      campaignMultiplier: Number(campaignAny.campaignMultiplier) || 1,
      completionBonusPoints: (campaignAny.completionBonusPoints as number) || 0,
      accessCodeEnabled: (campaignAny.accessCodeEnabled as boolean) || false,
      accessCode: (campaignAny.accessCode as string) || '',
      minimumReputationScore: (campaignAny.minimumReputationScore as number) || 0,
      requiredPreviousCampaigns: (reqAny.requiredPreviousCampaigns as string[]) || [],
      requiredBadgeIds: (reqAny.requiredBadgeIds as string[]) || [],
      requiredNftCollectionIds: (reqAny.requiredNftCollectionIds as string[]) || [],
    });
    // Load completion rewards
    const savedBonusRewards = (campaignAny.completionBonusRewards as any[]) || [];
    if (savedBonusRewards.length > 0) {
      setCompletionRewards(
        savedBonusRewards.map((r: any) => ({
          type: r.type,
          rewardId: r.rewardId,
          value: r.value,
          metadata: r.metadata,
          displayName: r.metadata?.displayName || r.metadata?.name || r.type,
          displayImage: r.metadata?.displayImage || r.metadata?.imageUrl,
        }))
      );
    }
    if (builderData.taskAssignments) {
      setAssignedTaskIds(builderData.taskAssignments.map((ta) => ta.taskId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderDataJson]);

  // Parse date helper
  const safeParseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  };

  // Build save payload
  const buildSavePayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      name: campaignData.name?.trim() || 'Untitled Campaign',
      description: campaignData.description?.trim() || undefined,
      bannerImageUrl: campaignData.bannerImageUrl || undefined,
      accentColor: campaignData.accentColor,
      campaignMultiplier: campaignData.campaignMultiplier,
      completionBonusPoints: campaignData.completionBonusPoints,
      completionBonusRewards: completionRewards.map((r) => ({
        type: r.type,
        rewardId: r.rewardId,
        value: r.value,
        metadata: { ...r.metadata, displayName: r.displayName, displayImage: r.displayImage },
      })),
      verificationMode: campaignData.verificationMode,
      enforceSequentialTasks: campaignData.enforceSequentialTasks,
      accessCodeEnabled: campaignData.accessCodeEnabled,
      accessCode: campaignData.accessCodeEnabled ? campaignData.accessCode : undefined,
      minimumReputationScore: campaignData.minimumReputationScore || undefined,
    };

    const parsedStart = safeParseDate(campaignData.startDate);
    if (parsedStart) payload.startDate = parsedStart;
    if (campaignData.isIndefinite) {
      payload.endDate = null;
    } else {
      const parsedEnd = safeParseDate(campaignData.endDate);
      if (parsedEnd) payload.endDate = parsedEnd;
    }

    if (campaignData.requiredPreviousCampaigns.length > 0) {
      (payload as any).prerequisiteCampaigns = campaignData.requiredPreviousCampaigns;
    }
    if (campaignData.requiredBadgeIds.length > 0) {
      (payload as any).requiredBadgeIds = campaignData.requiredBadgeIds;
    }
    if (campaignData.requiredNftCollectionIds.length > 0) {
      (payload as any).requiredNftCollectionIds = campaignData.requiredNftCollectionIds;
    }

    return payload;
  };

  // Save campaign (create or update)
  const handleSave = async () => {
    if (!campaignData.name.trim()) {
      toast({ title: 'Campaign name is required', variant: 'destructive' });
      return;
    }

    // Validate dates
    setDateError(null);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const parsedStart = safeParseDate(campaignData.startDate);
    const parsedEnd = campaignData.isIndefinite ? null : safeParseDate(campaignData.endDate);

    if (parsedStart && new Date(parsedStart) < today) {
      setDateError('Start date cannot be in the past');
      return;
    }
    if (parsedStart && parsedEnd && new Date(parsedEnd) <= new Date(parsedStart)) {
      setDateError('End date must be after start date');
      return;
    }

    const payload = buildSavePayload();

    try {
      if (campaignId) {
        await updateCampaign.mutateAsync({ campaignId, data: payload as any });
      } else {
        const result = (await createCampaign.mutateAsync(payload as any)) as any;
        if (result.id) {
          setCampaignId(result.id);
          // Save sponsors that were added before campaign was created
          for (const s of sponsors) {
            await addSponsorMutation.mutateAsync({ campaignId: result.id, data: s });
          }
          setSponsors([]);
        }
      }
      toast({ title: 'Campaign saved' });
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Failed to save campaign',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    if (!campaignId) return;
    try {
      await handleSave();
      await publishCampaign.mutateAsync(campaignId);
      toast({ title: 'Campaign published!' });
      setLocation('/creator-dashboard/campaigns');
    } catch (err: any) {
      toast({
        title: 'Publish failed',
        description: err?.message || 'Failed to publish campaign',
        variant: 'destructive',
      });
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!campaignId) return;
    if (assignedTaskIds.includes(taskId)) {
      await unassignTaskMutation.mutateAsync({ taskId, campaignId });
      setAssignedTaskIds((prev) => prev.filter((id) => id !== taskId));
    } else {
      await assignTaskMutation.mutateAsync({ taskId, campaignId });
      setAssignedTaskIds((prev) => [...prev, taskId]);
    }
  };

  // Helper to update campaignData
  const updateData = (updates: Partial<typeof campaignData>) => {
    setCampaignData((prev) => ({ ...prev, ...updates }));
  };

  const isSaving = createCampaign.isPending || updateCampaign.isPending;
  const isPublishing = publishCampaign.isPending;
  const campaignStatus = (builderData as any)?.campaign?.status;

  return (
    <DashboardLayout userType="creator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/creator-dashboard/campaigns')}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Badge variant="outline" className="border-white/20 text-white">
                  {campaignStatus === 'active' ? (
                    <>
                      <Rocket className="h-3 w-3 mr-1" /> Published
                    </>
                  ) : (
                    <>Draft</>
                  )}
                </Badge>
                <h1 className="text-lg font-semibold text-white truncate max-w-[300px]">
                  {campaignData.name || 'New Campaign'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={isSaving || !campaignData.name.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                  disabled={!campaignId || isPublishing}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {campaignStatus === 'active' ? 'Update Campaign' : 'Publish Campaign'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== SECTION 1: CAMPAIGN BASICS ========== */}
        <CollapsibleSection
          title="Campaign Basics"
          icon={Calendar}
          description="Set up the essential details for your campaign"
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-white">Campaign Name *</Label>
              <Input
                value={campaignData.name}
                onChange={(e) => updateData({ name: e.target.value })}
                placeholder="e.g., Summer Fan Challenge 2026"
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={campaignData.description}
                onChange={(e) => updateData({ description: e.target.value })}
                placeholder="Describe what fans will do and earn..."
                className="mt-1 bg-white/5 border-white/20 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white">Accent Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={campaignData.accentColor}
                  onChange={(e) => updateData({ accentColor: e.target.value })}
                  className="w-10 h-10 rounded border border-white/20 cursor-pointer"
                />
                <Input
                  value={campaignData.accentColor}
                  onChange={(e) => updateData({ accentColor: e.target.value })}
                  className="w-32 bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <Label className="text-white">Indefinite Campaign</Label>
                <p className="text-sm text-gray-400">No end date</p>
              </div>
              <Switch
                checked={campaignData.isIndefinite}
                onCheckedChange={(checked) =>
                  updateData({
                    isIndefinite: checked,
                    endDate: checked ? '' : campaignData.endDate,
                  })
                }
              />
            </div>

            {!campaignData.isIndefinite && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={campaignData.startDate}
                    onChange={(e) => {
                      updateData({ startDate: e.target.value });
                      setDateError(null);
                    }}
                    className="mt-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">End Date</Label>
                  <Input
                    type="datetime-local"
                    value={campaignData.endDate}
                    onChange={(e) => {
                      updateData({ endDate: e.target.value });
                      setDateError(null);
                    }}
                    className="mt-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            )}
            {dateError && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">{dateError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CollapsibleSection>

        {/* ========== SECTION 2: SPONSORS ========== */}
        <CollapsibleSection
          title="Campaign Sponsors"
          icon={Users}
          description="Add sponsors and brand partners"
          badge={
            displaySponsors.length > 0
              ? `${displaySponsors.length} sponsor${displaySponsors.length !== 1 ? 's' : ''}`
              : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                Add sponsors whose social accounts can be used in task verification.
              </p>
              <Button
                onClick={() => {
                  setSponsorForm({
                    name: '',
                    logoUrl: '',
                    websiteUrl: '',
                    socialHandles: {},
                    showInCampaignBanner: true,
                  });
                  setSponsorModalOpen(true);
                }}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Sponsor
              </Button>
            </div>

            {displaySponsors.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-lg border border-dashed border-white/20">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                <p className="text-gray-400">No sponsors added yet</p>
                <p className="text-sm text-gray-500">Sponsors are optional</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displaySponsors.map((sponsor, index) => (
                  <div
                    key={sponsor.id || index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {sponsor.logoUrl ? (
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                          <span className="text-brand-primary font-bold">{sponsor.name[0]}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{sponsor.name}</p>
                        <div className="flex gap-2 mt-1">
                          {Object.entries(sponsor.socialHandles || {})
                            .filter(([, v]) => v)
                            .map(([platform, handle]) => (
                              <Badge
                                key={platform}
                                variant="outline"
                                className="text-xs border-white/20 text-gray-300"
                              >
                                {platform}: {handle as string}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSponsor(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ========== SECTION 3: TASKS ========== */}
        <CollapsibleSection
          title="Campaign Tasks"
          icon={CheckSquare}
          description="Assign tasks for fans to complete"
          badge={
            assignedTaskIds.length > 0
              ? `${assignedTaskIds.length} task${assignedTaskIds.length !== 1 ? 's' : ''}`
              : undefined
          }
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Select existing tasks or create new ones.</p>
              <Button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" /> Create Task
              </Button>
            </div>

            {!campaignId ? (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  Save the campaign first to assign tasks.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-white font-medium mb-3">
                    Assigned Tasks ({assignedTaskIds.length})
                  </h3>
                  {assignedTaskIds.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-lg border border-dashed border-white/20">
                      <Target className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-gray-400">No tasks assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableTasks
                        .filter((t) => assignedTaskIds.includes(t.id))
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-brand-primary/10 rounded-lg border border-brand-primary/30"
                          >
                            <div>
                              <p className="text-white font-medium">{task.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs border-white/20 text-gray-300"
                                >
                                  {task.taskType}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-yellow-500/30 text-yellow-300"
                                >
                                  {task.pointsToReward} pts
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTask(task.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-white font-medium mb-3">Available Tasks</h3>
                  {availableTasks.filter((t) => !assignedTaskIds.includes(t.id)).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No more tasks available. Create new ones above.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableTasks
                        .filter((t) => !assignedTaskIds.includes(t.id))
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
                          >
                            <div>
                              <p className="text-white font-medium">{task.name}</p>
                              <Badge
                                variant="outline"
                                className="text-xs border-white/20 text-gray-300"
                              >
                                {task.taskType}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleTask(task.id)}
                              className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* ========== SECTION 4: TASK FLOW ========== */}
        <CollapsibleSection
          title="Task Flow & Ordering"
          icon={Target}
          description="Control how tasks are completed"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <Label className="text-white">Enforce Sequential Order</Label>
                <p className="text-sm text-gray-400">
                  Fans must complete tasks in the order listed below
                </p>
              </div>
              <Switch
                checked={campaignData.enforceSequentialTasks}
                onCheckedChange={(checked) => updateData({ enforceSequentialTasks: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <Label className="text-white">Verification Timing</Label>
                <p className="text-sm text-gray-400">When should tasks be verified?</p>
              </div>
              <Select
                value={campaignData.verificationMode}
                onValueChange={(v: string) =>
                  updateData({ verificationMode: v as 'immediate' | 'deferred' })
                }
              >
                <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/20">
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="deferred">At Campaign End</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {campaignData.verificationMode === 'deferred' && (
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Clock className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Tasks will be verified in a single batch when the campaign ends. Fans will see
                  &ldquo;Pending verification&rdquo; status until then.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-white font-medium mb-3">Task Order</h3>
              {assignedTaskIds.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Assign tasks first to configure order.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableTasks
                    .filter((t) => assignedTaskIds.includes(t.id))
                    .map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <GripVertical className="h-4 w-4 text-gray-500" />
                        <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{task.name}</p>
                          <Badge
                            variant="outline"
                            className="text-xs border-white/20 text-gray-300"
                          >
                            {task.taskType}
                          </Badge>
                        </div>
                        {campaignData.enforceSequentialTasks && index > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs border-yellow-500/30 text-yellow-300"
                          >
                            <Lock className="h-3 w-3 mr-1" /> After #{index}
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ========== SECTION 5: REWARDS ========== */}
        <CollapsibleSection
          title="Rewards & Multipliers"
          icon={Gift}
          description="Set point multipliers and completion bonuses"
          badge={
            completionRewards.length > 0
              ? `${completionRewards.length} reward${completionRewards.length !== 1 ? 's' : ''}`
              : undefined
          }
        >
          <div className="space-y-6">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
              <div>
                <Label className="text-white">Campaign Multiplier</Label>
                <p className="text-sm text-gray-400 mb-3">
                  Multiply all task point rewards in this campaign (1x = normal, 5x = 5 times the
                  points)
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[campaignData.campaignMultiplier]}
                    onValueChange={([v]) => updateData({ campaignMultiplier: v })}
                    min={1}
                    max={5}
                    step={0.25}
                    className="flex-1"
                  />
                  <span className="text-white font-bold text-lg w-16 text-right">
                    {campaignData.campaignMultiplier}x
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <Label className="text-white">Completion Bonus Points</Label>
              <p className="text-sm text-gray-400 mb-3">
                Extra points awarded when a fan completes ALL required tasks
              </p>
              <Input
                type="number"
                value={campaignData.completionBonusPoints}
                onChange={(e) =>
                  updateData({ completionBonusPoints: parseInt(e.target.value) || 0 })
                }
                className="w-40 bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Campaign Completion Rewards */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
              <div>
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-brand-primary" />
                  Campaign Completion Rewards
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Rewards fans receive when they complete all required tasks
                </p>
              </div>

              {completionRewards.length > 0 && (
                <div className="space-y-2">
                  {completionRewards.map((reward, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {reward.displayImage ? (
                          <img
                            src={reward.displayImage}
                            alt={reward.displayName || ''}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                            {reward.type === 'nft' && <Image className="w-5 h-5 text-purple-400" />}
                            {reward.type === 'raffle_entry' && (
                              <Ticket className="w-5 h-5 text-amber-400" />
                            )}
                            {reward.type === 'badge' && <Award className="w-5 h-5 text-blue-400" />}
                            {reward.type === 'reward' && (
                              <Gift className="w-5 h-5 text-green-400" />
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">
                            {reward.displayName || reward.type}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-white/10 text-gray-300 border-white/20"
                          >
                            {reward.type === 'nft'
                              ? 'NFT'
                              : reward.type === 'raffle_entry'
                                ? 'Raffle Entry'
                                : reward.type === 'badge'
                                  ? 'Badge'
                                  : 'Reward'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCompletionRewards((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setShowRewardPicker(true)}
                className="w-full border-dashed border-white/20 text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Completion Reward
              </Button>
            </div>

            <RewardPickerDialog
              open={showRewardPicker}
              onOpenChange={setShowRewardPicker}
              onAddReward={(reward) => {
                setCompletionRewards((prev) => [...prev, reward]);
              }}
              existingRewards={completionRewards}
            />

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-white font-medium mb-2">Task Point Summary</h3>
              <div className="space-y-2">
                {availableTasks
                  .filter((t) => assignedTaskIds.includes(t.id))
                  .map((task: any) => (
                    <div key={task.id} className="flex justify-between text-sm">
                      <span className="text-gray-300">{task.name}</span>
                      <span className="text-white font-medium">
                        {task.pointsToReward ?? 0} x {campaignData.campaignMultiplier} ={' '}
                        {Math.round((task.pointsToReward ?? 0) * campaignData.campaignMultiplier)}{' '}
                        pts
                      </span>
                    </div>
                  ))}
                {campaignData.completionBonusPoints > 0 && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-300 font-medium">Completion Bonus</span>
                      <span className="text-yellow-300 font-bold">
                        +{campaignData.completionBonusPoints} pts
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ========== SECTION 6: ACCESS & GATING ========== */}
        <CollapsibleSection
          title="Access & Gating"
          icon={Shield}
          description="Control who can join this campaign"
        >
          <div className="space-y-6">
            {/* Access Code */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-white flex items-center gap-2">
                    <Hash className="h-4 w-4" /> Access Code
                  </Label>
                  <p className="text-sm text-gray-400">Require a code to join</p>
                </div>
                <Switch
                  checked={campaignData.accessCodeEnabled}
                  onCheckedChange={(checked) => updateData({ accessCodeEnabled: checked })}
                />
              </div>
              {campaignData.accessCodeEnabled && (
                <Input
                  value={campaignData.accessCode}
                  onChange={(e) => updateData({ accessCode: e.target.value })}
                  placeholder="Enter access code"
                  className="bg-white/5 border-white/20 text-white"
                />
              )}
            </div>

            {/* Reputation Minimum */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <Label className="text-white flex items-center gap-2">
                <Zap className="h-4 w-4" /> Minimum Reputation Score
              </Label>
              <p className="text-sm text-gray-400 mb-3">
                Fan must have earned this many total points
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[campaignData.minimumReputationScore]}
                  onValueChange={([v]) => updateData({ minimumReputationScore: v })}
                  min={0}
                  max={10000}
                  step={100}
                  className="flex-1"
                />
                <span className="text-white font-bold w-20 text-right">
                  {campaignData.minimumReputationScore}
                </span>
              </div>
            </div>

            {/* NFT Gating */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <Label className="text-white flex items-center gap-2">
                <Award className="h-4 w-4" /> NFT Requirement
              </Label>
              <p className="text-sm text-gray-400 mb-3">Fan must own an NFT from your collection</p>
              <Input
                placeholder="Enter NFT collection address"
                value={campaignData.requiredNftCollectionIds[0] || ''}
                onChange={(e) =>
                  updateData({
                    requiredNftCollectionIds: e.target.value ? [e.target.value] : [],
                  })
                }
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Badge Gating */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <Label className="text-white flex items-center gap-2">
                <Award className="h-4 w-4" /> Badge Requirement
              </Label>
              <p className="text-sm text-gray-400 mb-3">Fan must hold a specific badge</p>
              <Input
                placeholder="Enter badge ID"
                value={campaignData.requiredBadgeIds[0] || ''}
                onChange={(e) =>
                  updateData({
                    requiredBadgeIds: e.target.value ? [e.target.value] : [],
                  })
                }
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Prerequisite Campaigns */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <Label className="text-white flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Prerequisite Campaigns
              </Label>
              <p className="text-sm text-gray-400 mb-3">Fan must have completed these campaigns</p>
              {previousCampaigns.filter((c) => c.id !== campaignId && c.status === 'active')
                .length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {previousCampaigns
                    .filter((c) => c.id !== campaignId && c.status === 'active')
                    .map((campaign) => (
                      <label key={campaign.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignData.requiredPreviousCampaigns.includes(campaign.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateData({
                                requiredPreviousCampaigns: [
                                  ...campaignData.requiredPreviousCampaigns,
                                  campaign.id,
                                ],
                              });
                            } else {
                              updateData({
                                requiredPreviousCampaigns:
                                  campaignData.requiredPreviousCampaigns.filter(
                                    (id) => id !== campaign.id
                                  ),
                              });
                            }
                          }}
                          className="rounded border-white/20"
                        />
                        <span className="text-white text-sm">{campaign.name}</span>
                      </label>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No previous campaigns available</p>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ========== PUBLISH DIALOG ========== */}
        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent className="bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Publish Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-white/5 border-white/10">
                <AlertCircle className="h-4 w-4 text-brand-primary" />
                <AlertDescription className="text-gray-300">
                  Publishing will make this campaign visible to your fans.
                </AlertDescription>
              </Alert>

              {/* Validation checklist */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {campaignData.name.trim() ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-white text-sm">Campaign name set</span>
                </div>
                <div className="flex items-center gap-2">
                  {assignedTaskIds.length > 0 ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-white text-sm">At least one task assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  {campaignData.startDate ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-white text-sm">Start date set</span>
                </div>
              </div>

              {/* Quick summary */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Tasks</p>
                  <p className="text-white font-medium">{assignedTaskIds.length} assigned</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Multiplier</p>
                  <p className="text-white font-medium">{campaignData.campaignMultiplier}x</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Sponsors</p>
                  <p className="text-white font-medium">{displaySponsors.length}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Verification</p>
                  <p className="text-white font-medium capitalize">
                    {campaignData.verificationMode}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPublishDialog(false)}
                className="border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={
                  !campaignData.name.trim() ||
                  assignedTaskIds.length === 0 ||
                  !campaignData.startDate ||
                  isPublishing
                }
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publish Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== SPONSOR MODAL ========== */}
        <Dialog open={sponsorModalOpen} onOpenChange={setSponsorModalOpen}>
          <DialogContent className="bg-gray-900 border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Add Sponsor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white">Sponsor Name *</Label>
                <Input
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Nike Basketball"
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Website URL</Label>
                <Input
                  value={sponsorForm.websiteUrl}
                  onChange={(e) => setSponsorForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>
              <Separator className="bg-white/10" />
              <div>
                <Label className="text-white mb-2 block">Social Handles</Label>
                <p className="text-sm text-gray-400 mb-3">
                  These handles can be used in task verification (e.g., &ldquo;Follow @Nike on
                  Twitter&rdquo;)
                </p>
                <div className="space-y-3">
                  {PLATFORMS.map((platform) => (
                    <div key={platform.key} className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm w-24 flex-shrink-0">
                        {platform.label}
                      </span>
                      <Input
                        value={sponsorForm.socialHandles[platform.key] || ''}
                        onChange={(e) =>
                          setSponsorForm((p) => ({
                            ...p,
                            socialHandles: { ...p.socialHandles, [platform.key]: e.target.value },
                          }))
                        }
                        placeholder={platform.placeholder}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-white">Show in campaign banner</Label>
                <Switch
                  checked={sponsorForm.showInCampaignBanner}
                  onCheckedChange={(checked) =>
                    setSponsorForm((p) => ({ ...p, showInCampaignBanner: checked }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSponsorModalOpen(false)}
                className="border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSponsor}
                disabled={!sponsorForm.name || addSponsorMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {addSponsorMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Sponsor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== CREATE TASK MODAL ========== */}
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="bg-gray-900 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white">Task Name *</Label>
                <Input
                  value={newTaskData.name}
                  onChange={(e) => setNewTaskData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Follow on Twitter"
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Description</Label>
                <Textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what fans need to do..."
                  className="mt-1 bg-white/5 border-white/20 text-white min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-white">Task Type</Label>
                <Select
                  value={newTaskData.taskType}
                  onValueChange={(v) => setNewTaskData((p) => ({ ...p, taskType: v }))}
                >
                  <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/20">
                    <SelectItem value="twitter_follow">Twitter Follow</SelectItem>
                    <SelectItem value="twitter_retweet">Twitter Retweet</SelectItem>
                    <SelectItem value="twitter_like">Twitter Like</SelectItem>
                    <SelectItem value="instagram_follow">Instagram Follow</SelectItem>
                    <SelectItem value="instagram_like_post">Instagram Like</SelectItem>
                    <SelectItem value="youtube_subscribe">YouTube Subscribe</SelectItem>
                    <SelectItem value="youtube_like">YouTube Like</SelectItem>
                    <SelectItem value="tiktok_follow">TikTok Follow</SelectItem>
                    <SelectItem value="spotify_follow">Spotify Follow</SelectItem>
                    <SelectItem value="discord_join">Discord Join</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website_visit">Website Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Points Reward</Label>
                  <Input
                    type="number"
                    value={newTaskData.points}
                    onChange={(e) =>
                      setNewTaskData((p) => ({ ...p, points: parseInt(e.target.value) || 0 }))
                    }
                    className="mt-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Target Username</Label>
                  <Input
                    value={newTaskData.targetUsername}
                    onChange={(e) =>
                      setNewTaskData((p) => ({ ...p, targetUsername: e.target.value }))
                    }
                    placeholder="@username"
                    className="mt-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Target URL (optional)</Label>
                <Input
                  value={newTaskData.targetUrl}
                  onChange={(e) => setNewTaskData((p) => ({ ...p, targetUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsTaskModalOpen(false)}
                className="border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  createTaskMutation.mutate({
                    name: newTaskData.name,
                    description: newTaskData.description,
                    taskType: newTaskData.taskType,
                    pointsToReward: newTaskData.points,
                    customSettings: {
                      targetUrl: newTaskData.targetUrl,
                      targetUsername: newTaskData.targetUsername,
                    },
                    campaignId,
                  })
                }
                disabled={!newTaskData.name || createTaskMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
