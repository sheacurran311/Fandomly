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
  ArrowRight,
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
  Eye,
  Shield,
  Hash,
  Calendar,
  Target,
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

const STEPS = [
  { number: 1, label: 'Basics', icon: Calendar },
  { number: 2, label: 'Sponsors', icon: Users },
  { number: 3, label: 'Tasks', icon: CheckSquare },
  { number: 4, label: 'Task Flow', icon: Target },
  { number: 5, label: 'Rewards', icon: Gift },
  { number: 6, label: 'Gating', icon: Lock },
  { number: 7, label: 'Review', icon: Eye },
];

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

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.number} className="flex items-center flex-shrink-0">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors ${
                currentStep >= step.number
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <span
              className={`ml-1.5 text-xs font-medium hidden sm:inline ${
                currentStep >= step.number ? 'text-white' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={`w-6 lg:w-10 h-0.5 mx-2 ${
                  currentStep > step.number ? 'bg-brand-primary' : 'bg-gray-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CampaignBuilderNew() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Campaign data state
  const [basics, setBasics] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isIndefinite: false,
    bannerImageUrl: '',
    accentColor: '#8B5CF6',
  });

  const [sponsors, setSponsors] = useState<
    Array<{
      id?: string;
      name: string;
      logoUrl: string;
      websiteUrl: string;
      socialHandles: Record<string, string>;
      showInCampaignBanner: boolean;
    }>
  >([]);

  const [assignedTaskIds, setAssignedTaskIds] = useState<string[]>([]);

  const [taskFlow, setTaskFlow] = useState({
    enforceSequentialTasks: false,
  });

  const [rewards, setRewards] = useState({
    campaignMultiplier: 1,
    completionBonusPoints: 0,
  });

  const [completionRewards, setCompletionRewards] = useState<
    Array<{
      type: 'nft' | 'raffle_entry' | 'badge' | 'reward';
      rewardId?: string;
      value?: number;
      metadata?: Record<string, unknown>;
      displayName?: string;
      displayImage?: string;
    }>
  >([]);
  const [showRewardPicker, setShowRewardPicker] = useState(false);

  const [gating, setGating] = useState({
    accessCodeEnabled: false,
    accessCode: '',
    minimumReputationScore: 0,
    requiredPreviousCampaigns: [] as string[],
    requiredBadgeIds: [] as string[],
    requiredNftCollectionIds: [] as string[],
  });

  const [verificationMode, setVerificationMode] = useState<'immediate' | 'deferred'>('immediate');

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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
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
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
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
    setBasics({
      name: c.name || '',
      description: c.description || '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
      isIndefinite: !c.endDate,
      bannerImageUrl: (campaignAny.bannerImageUrl as string) || '',
      accentColor: (campaignAny.accentColor as string) || '#8B5CF6',
    });
    setTaskFlow({
      enforceSequentialTasks: (campaignAny.enforceSequentialTasks as boolean) || false,
    });
    setRewards({
      campaignMultiplier: Number(campaignAny.campaignMultiplier) || 1,
      completionBonusPoints: (campaignAny.completionBonusPoints as number) || 0,
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
    setGating({
      accessCodeEnabled: (campaignAny.accessCodeEnabled as boolean) || false,
      accessCode: (campaignAny.accessCode as string) || '',
      minimumReputationScore: (campaignAny.minimumReputationScore as number) || 0,
      requiredPreviousCampaigns: (reqAny.requiredPreviousCampaigns as string[]) || [],
      requiredBadgeIds: (reqAny.requiredBadgeIds as string[]) || [],
      requiredNftCollectionIds: (reqAny.requiredNftCollectionIds as string[]) || [],
    });
    setVerificationMode((campaignAny.verificationMode as 'immediate' | 'deferred') || 'immediate');
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

  // Save campaign (create or update)
  const saveCampaign = async () => {
    const payload: Record<string, unknown> = {
      name: basics.name?.trim() || 'Untitled Campaign',
      description: basics.description?.trim() || undefined,
      bannerImageUrl: basics.bannerImageUrl || undefined,
      accentColor: basics.accentColor,
      campaignMultiplier: rewards.campaignMultiplier,
      completionBonusPoints: rewards.completionBonusPoints,
      completionBonusRewards: completionRewards.map((r) => ({
        type: r.type,
        rewardId: r.rewardId,
        value: r.value,
        metadata: { ...r.metadata, displayName: r.displayName, displayImage: r.displayImage },
      })),
      verificationMode,
      enforceSequentialTasks: taskFlow.enforceSequentialTasks,
      accessCodeEnabled: gating.accessCodeEnabled,
      accessCode: gating.accessCodeEnabled ? gating.accessCode : undefined,
      minimumReputationScore: gating.minimumReputationScore || undefined,
    };

    const parsedStart = safeParseDate(basics.startDate);
    if (parsedStart) payload.startDate = parsedStart;
    if (basics.isIndefinite) {
      payload.endDate = null;
    } else {
      const parsedEnd = safeParseDate(basics.endDate);
      if (parsedEnd) payload.endDate = parsedEnd;
    }

    // Send gating fields at top level (server expects top-level, not nested under requirements)
    if (gating.requiredPreviousCampaigns.length > 0) {
      (payload as any).prerequisiteCampaigns = gating.requiredPreviousCampaigns;
    }
    if (gating.requiredBadgeIds.length > 0) {
      (payload as any).requiredBadgeIds = gating.requiredBadgeIds;
    }
    if (gating.requiredNftCollectionIds.length > 0) {
      (payload as any).requiredNftCollectionIds = gating.requiredNftCollectionIds;
    }

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
  };

  // Navigation
  const handleNext = async () => {
    if (currentStep === 1) {
      setDateError(null);
      if (!basics.name.trim()) return;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const parsedStart = safeParseDate(basics.startDate);
      const parsedEnd = basics.isIndefinite ? null : safeParseDate(basics.endDate);

      if (parsedStart && new Date(parsedStart) < today) {
        setDateError('Start date cannot be in the past');
        return;
      }
      if (parsedStart && parsedEnd && new Date(parsedEnd) <= new Date(parsedStart)) {
        setDateError('End date must be after start date');
        return;
      }
      await saveCampaign();
    }
    if (currentStep === 5 || currentStep === 6) {
      await saveCampaign();
    }
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handlePublish = async () => {
    if (!campaignId) return;
    await saveCampaign();
    await publishCampaign.mutateAsync(campaignId);
    setLocation('/creator-dashboard/campaigns');
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

  const isSaving = createCampaign.isPending || updateCampaign.isPending;
  const isPublishing = publishCampaign.isPending;

  return (
    <DashboardLayout userType="creator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Campaign Builder</h1>
            <p className="text-gray-400">Create powerful, multi-task campaigns for your fans</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation('/creator-dashboard/campaigns')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            {/* ========== STEP 1: BASICS ========== */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-primary" />
                  Campaign Basics
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Campaign Name *</Label>
                    <Input
                      value={basics.name}
                      onChange={(e) => setBasics((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Summer Fan Challenge 2026"
                      className="mt-1 bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Description</Label>
                    <Textarea
                      value={basics.description}
                      onChange={(e) => setBasics((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe what fans will do and earn..."
                      className="mt-1 bg-white/5 border-white/20 text-white min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Accent Color</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        value={basics.accentColor}
                        onChange={(e) => setBasics((p) => ({ ...p, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded border border-white/20 cursor-pointer"
                      />
                      <Input
                        value={basics.accentColor}
                        onChange={(e) => setBasics((p) => ({ ...p, accentColor: e.target.value }))}
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
                      checked={basics.isIndefinite}
                      onCheckedChange={(checked) => {
                        setBasics((p) => ({
                          ...p,
                          isIndefinite: checked,
                          endDate: checked ? '' : p.endDate,
                        }));
                      }}
                    />
                  </div>

                  {!basics.isIndefinite && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Start Date</Label>
                        <Input
                          type="datetime-local"
                          value={basics.startDate}
                          onChange={(e) => {
                            setBasics((p) => ({ ...p, startDate: e.target.value }));
                            setDateError(null);
                          }}
                          className="mt-1 bg-white/5 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">End Date</Label>
                        <Input
                          type="datetime-local"
                          value={basics.endDate}
                          onChange={(e) => {
                            setBasics((p) => ({ ...p, endDate: e.target.value }));
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
              </div>
            )}

            {/* ========== STEP 2: SPONSORS ========== */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-primary" />
                    Campaign Sponsors
                  </h2>
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
                <p className="text-gray-400 text-sm">
                  Add sponsors whose social accounts can be used in task verification (e.g.,
                  &ldquo;Follow @Nike on Twitter&rdquo;).
                </p>

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
                              <span className="text-brand-primary font-bold">
                                {sponsor.name[0]}
                              </span>
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
            )}

            {/* ========== STEP 3: TASKS ========== */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-brand-primary" />
                    Campaign Tasks
                  </h2>
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
                      Complete Step 1 first to save the campaign draft.
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
                      {availableTasks.filter((t) => !assignedTaskIds.includes(t.id)).length ===
                      0 ? (
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
            )}

            {/* ========== STEP 4: TASK FLOW ========== */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand-primary" />
                  Task Flow & Ordering
                </h2>
                <p className="text-gray-400 text-sm">
                  Control the order in which fans must complete tasks.
                </p>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <Label className="text-white">Enforce Sequential Order</Label>
                    <p className="text-sm text-gray-400">
                      Fans must complete tasks in the order listed below
                    </p>
                  </div>
                  <Switch
                    checked={taskFlow.enforceSequentialTasks}
                    onCheckedChange={(checked) =>
                      setTaskFlow((p) => ({ ...p, enforceSequentialTasks: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <Label className="text-white">Verification Timing</Label>
                    <p className="text-sm text-gray-400">When should tasks be verified?</p>
                  </div>
                  <Select
                    value={verificationMode}
                    onValueChange={(v: string) =>
                      setVerificationMode(v as 'immediate' | 'deferred')
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

                {verificationMode === 'deferred' && (
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
                    <p className="text-sm text-gray-500 italic">Add tasks in Step 3 first.</p>
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
                            {taskFlow.enforceSequentialTasks && index > 0 && (
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
            )}

            {/* ========== STEP 5: REWARDS ========== */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-brand-primary" />
                  Rewards & Multipliers
                </h2>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                  <div>
                    <Label className="text-white">Campaign Multiplier</Label>
                    <p className="text-sm text-gray-400 mb-3">
                      Multiply all task point rewards in this campaign (1x = normal, 5x = 5 times
                      the points)
                    </p>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[rewards.campaignMultiplier]}
                        onValueChange={([v]) =>
                          setRewards((p) => ({ ...p, campaignMultiplier: v }))
                        }
                        min={1}
                        max={5}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="text-white font-bold text-lg w-16 text-right">
                        {rewards.campaignMultiplier}x
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
                    value={rewards.completionBonusPoints}
                    onChange={(e) =>
                      setRewards((p) => ({
                        ...p,
                        completionBonusPoints: parseInt(e.target.value) || 0,
                      }))
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
                                {reward.type === 'nft' && (
                                  <Image className="w-5 h-5 text-purple-400" />
                                )}
                                {reward.type === 'raffle_entry' && (
                                  <Ticket className="w-5 h-5 text-amber-400" />
                                )}
                                {reward.type === 'badge' && (
                                  <Award className="w-5 h-5 text-blue-400" />
                                )}
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
                            {task.pointsToReward ?? 0} x {rewards.campaignMultiplier} ={' '}
                            {Math.round((task.pointsToReward ?? 0) * rewards.campaignMultiplier)}{' '}
                            pts
                          </span>
                        </div>
                      ))}
                    {rewards.completionBonusPoints > 0 && (
                      <>
                        <Separator className="bg-white/10" />
                        <div className="flex justify-between text-sm">
                          <span className="text-yellow-300 font-medium">Completion Bonus</span>
                          <span className="text-yellow-300 font-bold">
                            +{rewards.completionBonusPoints} pts
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========== STEP 6: ACCESS & GATING ========== */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-primary" />
                  Access & Gating
                </h2>
                <p className="text-gray-400 text-sm">Control who can join this campaign.</p>

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
                      checked={gating.accessCodeEnabled}
                      onCheckedChange={(checked) =>
                        setGating((p) => ({ ...p, accessCodeEnabled: checked }))
                      }
                    />
                  </div>
                  {gating.accessCodeEnabled && (
                    <Input
                      value={gating.accessCode}
                      onChange={(e) => setGating((p) => ({ ...p, accessCode: e.target.value }))}
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
                      value={[gating.minimumReputationScore]}
                      onValueChange={([v]) =>
                        setGating((p) => ({ ...p, minimumReputationScore: v }))
                      }
                      min={0}
                      max={10000}
                      step={100}
                      className="flex-1"
                    />
                    <span className="text-white font-bold w-20 text-right">
                      {gating.minimumReputationScore}
                    </span>
                  </div>
                </div>

                {/* NFT Gating */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-white flex items-center gap-2">
                    <Award className="h-4 w-4" /> NFT Requirement
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Fan must own an NFT from your collection
                  </p>
                  <Input
                    placeholder="Enter NFT collection address"
                    value={gating.requiredNftCollectionIds[0] || ''}
                    onChange={(e) =>
                      setGating((p) => ({
                        ...p,
                        requiredNftCollectionIds: e.target.value ? [e.target.value] : [],
                      }))
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
                    value={gating.requiredBadgeIds[0] || ''}
                    onChange={(e) =>
                      setGating((p) => ({
                        ...p,
                        requiredBadgeIds: e.target.value ? [e.target.value] : [],
                      }))
                    }
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                {/* Prerequisite Campaigns */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-white flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Prerequisite Campaigns
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Fan must have completed these campaigns
                  </p>
                  {previousCampaigns.filter((c) => c.id !== campaignId && c.status === 'active')
                    .length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {previousCampaigns
                        .filter((c) => c.id !== campaignId && c.status === 'active')
                        .map((campaign) => (
                          <label
                            key={campaign.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={gating.requiredPreviousCampaigns.includes(campaign.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGating((p) => ({
                                    ...p,
                                    requiredPreviousCampaigns: [
                                      ...p.requiredPreviousCampaigns,
                                      campaign.id,
                                    ],
                                  }));
                                } else {
                                  setGating((p) => ({
                                    ...p,
                                    requiredPreviousCampaigns: p.requiredPreviousCampaigns.filter(
                                      (id) => id !== campaign.id
                                    ),
                                  }));
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
            )}

            {/* ========== STEP 7: REVIEW & PUBLISH ========== */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-brand-primary" />
                  Review & Publish
                </h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Campaign</p>
                    <p className="text-white font-semibold mt-1">{basics.name || 'Untitled'}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {basics.isIndefinite
                        ? 'No end date'
                        : basics.endDate
                          ? `Ends ${new Date(basics.endDate).toLocaleDateString()}`
                          : 'No dates set'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Tasks</p>
                    <p className="text-white font-semibold mt-1">
                      {assignedTaskIds.length} tasks assigned
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {taskFlow.enforceSequentialTasks ? 'Sequential order' : 'Any order'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Rewards</p>
                    <p className="text-white font-semibold mt-1">
                      {rewards.campaignMultiplier}x multiplier
                    </p>
                    {rewards.completionBonusPoints > 0 && (
                      <p className="text-sm text-yellow-300 mt-1">
                        +{rewards.completionBonusPoints} bonus pts
                      </p>
                    )}
                    {completionRewards.length > 0 && (
                      <p className="text-sm text-purple-300 mt-1">
                        {completionRewards.length} completion reward
                        {completionRewards.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Sponsors</p>
                    <p className="text-white font-semibold mt-1">
                      {displaySponsors.length} sponsor{displaySponsors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Gating Summary */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Access Requirements
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gating.accessCodeEnabled && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Access Code
                      </Badge>
                    )}
                    {gating.minimumReputationScore > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        Min Reputation: {gating.minimumReputationScore}
                      </Badge>
                    )}
                    {gating.requiredNftCollectionIds.length > 0 && (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        NFT Required
                      </Badge>
                    )}
                    {gating.requiredBadgeIds.length > 0 && (
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        Badge Required
                      </Badge>
                    )}
                    {gating.requiredPreviousCampaigns.length > 0 && (
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        Prerequisite Campaigns
                      </Badge>
                    )}
                    {!gating.accessCodeEnabled &&
                      gating.minimumReputationScore === 0 &&
                      gating.requiredNftCollectionIds.length === 0 &&
                      gating.requiredBadgeIds.length === 0 &&
                      gating.requiredPreviousCampaigns.length === 0 && (
                        <span className="text-gray-400 text-sm">Open to all fans</span>
                      )}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Verification
                  </p>
                  <p className="text-white">
                    {verificationMode === 'immediate'
                      ? 'Immediate verification'
                      : 'Deferred (batch at campaign end)'}
                  </p>
                </div>

                {assignedTaskIds.length === 0 && (
                  <Alert className="bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      You need at least one task assigned to publish.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <div className="flex gap-3">
            {currentStep < 7 ? (
              <Button
                onClick={handleNext}
                disabled={(currentStep === 1 && !basics.name.trim()) || isSaving}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {currentStep === 1 ? 'Save & Continue' : 'Continue'}
              </Button>
            ) : (
              <Button
                onClick={handlePublish}
                disabled={assignedTaskIds.length === 0 || isPublishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Publish Campaign
              </Button>
            )}
          </div>
        </div>

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
