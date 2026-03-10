/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, createElement, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, getCsrfToken, getAuthHeaders, readJsonResponse } from '@/lib/queryClient';
import {
  Gift,
  Ticket,
  Package,
  Star,
  Coins,
  Users,
  Eye,
  Video as VideoIcon,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Edit,
  Upload,
  Loader2,
} from 'lucide-react';
import type { Reward } from '@shared/schema';
import { insertRewardSchema } from '@shared/schema';
import DashboardLayout from '@/components/layout/dashboard-layout';
import DashboardCard from '@/components/dashboard/dashboard-card';
import { VideoUpload } from '@/components/ui/video-upload';
import PlatformRewards from '@/components/rewards/platform-rewards';

// Form schema extending insertRewardSchema with additional validation
const rewardCreationFormSchema = insertRewardSchema
  .omit({
    tenantId: true,
  })
  .extend({
  name: z.string().min(1, 'Reward name is required').max(100, 'Name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  pointsCost: z.number().min(1, 'Points cost must be at least 1'),
  rewardType: z.enum(['raffle', 'physical', 'custom', 'video', 'nft'], {
    required_error: 'Please select a reward type',
  }),
  maxRedemptions: z.number().min(1).optional().nullable(),
  // Type-specific validation handled dynamically
})
  .superRefine((data, ctx) => {
    if (data.rewardType === 'nft') {
      const nftData = (data.rewardData as any)?.nftData;
      if (!nftData?.collectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rewardData', 'nftData', 'collectionId'],
          message: 'Please select an NFT collection',
        });
      }
      if (!nftData?.imageUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rewardData', 'nftData', 'imageUrl'],
          message: 'Please upload or paste an NFT image URL',
        });
      }
    }
  });

type RewardFormData = z.infer<typeof rewardCreationFormSchema>;

// Utility functions for reward type icons and colors
const getRewardTypeIcon = (type: string) => {
  switch (type) {
    case 'raffle':
      return Ticket;
    case 'physical':
      return Package;
    case 'video':
      return VideoIcon;
    case 'custom':
      return Star;
    case 'nft':
      return ImageIcon;
    default:
      return Gift;
  }
};

const getRewardTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'raffle':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'physical':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'video':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'custom':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'nft':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export default function RewardsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [_selectedRewardType, _setSelectedRewardType] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('your-rewards');

  // Fetch creator's rewards
  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', '/api/rewards');
      return readJsonResponse(response);
    },
    enabled: !!user?.id,
  });

  const { data: nftCollectionsData } = useQuery({
    queryKey: ['/api/nft/collections', user?.id],
    queryFn: async () => {
      if (!user?.id) return { collections: [] as Array<Record<string, any>> };
      const response = await apiRequest('GET', '/api/nft/collections');
      return readJsonResponse<{ collections: Array<Record<string, any>> }>(response);
    },
    enabled: !!user?.id,
  });

  const nftCollections = nftCollectionsData?.collections || [];

  const { data: programs = [] } = useQuery({
    queryKey: ['/api/programs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', '/api/programs');
      return readJsonResponse<Array<{ id: string; name: string }>>(response);
    },
    enabled: !!user?.id,
  });

  // Calculate reward stats
  const rewardStats = {
    totalRewards: rewards.length,
    activeRewards: rewards.filter((r: Reward) => r.isActive).length,
    totalRedemptions: rewards.reduce(
      (sum: number, r: Reward) => sum + (r.currentRedemptions || 0),
      0
    ),
    pointsAllocated: rewards.reduce(
      (sum: number, r: Reward) => sum + r.pointsCost * (r.currentRedemptions || 0),
      0
    ),
  };

  const handleCreateReward = async (rewardData: Record<string, unknown>) => {
    try {
      await apiRequest('POST', '/api/rewards', {
        ...rewardData,
        creatorId: user?.id,
      });

      toast({
        title: 'Reward Created',
        description: 'Your new reward has been created successfully!',
        duration: 3000,
      });

      setCreateModalOpen(false);
      refetch();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create reward. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Rewards</h1>
          <p className="text-gray-400">Manage your fan rewards and view your platform points</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger
              value="your-rewards"
              className="data-[state=active]:bg-brand-primary data-[state=active]:text-white"
            >
              <Gift className="h-4 w-4 mr-2" />
              Your Rewards
            </TabsTrigger>
            <TabsTrigger
              value="platform"
              className="data-[state=active]:bg-brand-primary data-[state=active]:text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Platform Points
            </TabsTrigger>
          </TabsList>

          <TabsContent value="your-rewards" className="mt-0">
            {/* Create Reward Button */}
            <div className="flex justify-end mb-6">
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-brand-primary hover:bg-brand-primary/80">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Reward
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-brand-dark-bg border-white/10 max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Reward</DialogTitle>
                  </DialogHeader>
                  <RewardCreationForm
                    programs={programs}
                    collections={nftCollections}
                    onSubmit={handleCreateReward}
                    onCancel={() => setCreateModalOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard
                title="Total Rewards"
                value={rewardStats.totalRewards.toString()}
                icon={<Gift className="h-5 w-5" />}
                gradient
              />
              <DashboardCard
                title="Active Rewards"
                value={rewardStats.activeRewards.toString()}
                icon={<Star className="h-5 w-5" />}
              />
              <DashboardCard
                title="Total Redemptions"
                value={rewardStats.totalRedemptions.toString()}
                icon={<Users className="h-5 w-5" />}
              />
              <DashboardCard
                title="Points Spent"
                value={rewardStats.pointsAllocated.toLocaleString()}
                icon={<Coins className="h-5 w-5" />}
              />
            </div>

            {/* Rewards List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Your Rewards</h2>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                    Points-Based Redemption System
                  </Badge>
                </div>
              </div>

              {rewardsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded mb-4"></div>
                          <div className="h-8 bg-gray-700 rounded mb-2"></div>
                          <div className="h-4 bg-gray-700 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : rewards.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Rewards Yet</h3>
                    <p className="text-gray-400 mb-6">
                      Create your first reward to engage your fans with points-based redemption!
                    </p>
                    <Button
                      onClick={() => setCreateModalOpen(true)}
                      className="bg-brand-primary hover:bg-brand-primary/80"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Reward
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map((reward: Reward) => (
                    <RewardCard key={reward.id} reward={reward} onUpdate={refetch} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="platform" className="mt-0">
            <PlatformRewards />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Reward Card Component
function RewardCard({ reward, onUpdate }: { reward: Reward; onUpdate: () => void }) {
  const { toast } = useToast();
  const [_showDetails, _setShowDetails] = useState(false);
  const RewardIcon = useMemo(() => getRewardTypeIcon(reward.rewardType), [reward.rewardType]);

  const toggleRewardStatus = async () => {
    try {
      await apiRequest('PUT', `/api/rewards/${reward.id}`, {
        isActive: !reward.isActive,
      });

      toast({
        title: reward.isActive ? 'Reward Deactivated' : 'Reward Activated',
        description: `${reward.name} has been ${reward.isActive ? 'deactivated' : 'activated'}.`,
        duration: 3000,
      });

      onUpdate();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update reward status.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <Card
      className={`bg-white/5 border-white/10 transition-all hover:border-brand-primary/30 ${!reward.isActive ? 'opacity-60' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-primary/20 rounded-lg">
              {createElement(RewardIcon, { className: 'h-5 w-5' })}
            </div>
            <div>
              <CardTitle className="text-white text-lg">{reward.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getRewardTypeBadgeColor(reward.rewardType)}`}>
                  {reward.rewardType.charAt(0).toUpperCase() + reward.rewardType.slice(1)}
                </Badge>
                {reward.rewardType === 'physical' &&
                  reward.rewardData?.physicalData?.approvalStatus && (
                    <Badge
                      variant="outline"
                      className={
                        reward.rewardData.physicalData.approvalStatus === 'approved'
                          ? 'border-green-500/30 text-green-400'
                          : reward.rewardData.physicalData.approvalStatus === 'rejected'
                            ? 'border-red-500/30 text-red-400'
                            : 'border-yellow-500/30 text-yellow-400'
                      }
                    >
                      {reward.rewardData.physicalData.approvalStatus === 'approved' && '✓ Approved'}
                      {reward.rewardData.physicalData.approvalStatus === 'rejected' && '✗ Rejected'}
                      {reward.rewardData.physicalData.approvalStatus === 'pending' &&
                        '⏳ Pending Review'}
                    </Badge>
                  )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => _setShowDetails(true)}
              className="text-gray-400 hover:text-white p-1"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRewardStatus}
              className="text-gray-400 hover:text-white p-1"
            >
              {(reward as any).isActive ? (
                <Edit className="h-4 w-4" />
              ) : (
                <Star className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <p className="text-gray-300 text-sm line-clamp-2">{reward.description}</p>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-emerald-400">
              <Coins className="h-4 w-4" />
              <span className="font-medium">{reward.pointsCost} points</span>
            </div>

            <div className="text-gray-400">
              {reward.currentRedemptions}/{reward.maxRedemptions || '∞'} redeemed
            </div>
          </div>

          {/* Reward Type Specific Info */}
          {reward.rewardType === 'raffle' && reward.rewardData?.raffleData && (
            <div className="text-xs text-purple-400 bg-purple-500/10 p-2 rounded">
              Prize: {reward.rewardData.raffleData.prizeDescription}
            </div>
          )}

          {reward.rewardType === 'physical' && reward.rewardData?.physicalData && (
            <div className="space-y-2">
              <div className="text-xs text-blue-400 bg-blue-500/10 p-2 rounded">
                {reward.rewardData.physicalData.shippingRequired
                  ? '📦 Ships worldwide'
                  : '📍 Local pickup'}{' '}
                • Condition: {reward.rewardData.physicalData.condition}
              </div>
              {reward.rewardData.physicalData.approvalStatus === 'pending' && (
                <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                  ⏳ Awaiting admin approval - item must be sent to P.O. Box for inspection
                </div>
              )}
              {reward.rewardData.physicalData.approvalStatus === 'rejected' &&
                reward.rewardData.physicalData.adminNotes && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                    ✗ Rejected: {reward.rewardData.physicalData.adminNotes}
                  </div>
                )}
            </div>
          )}

          {reward.rewardType === 'video' && reward.rewardData?.videoData && (
            <div className="text-xs text-pink-400 bg-pink-500/10 p-2 rounded">
              🎥 {reward.rewardData.videoData.maxVideoDuration}s max •{' '}
              {reward.rewardData.videoData.turnaroundDays} day turnaround
            </div>
          )}

          {reward.rewardType === 'custom' && reward.rewardData?.customData && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded">
              {reward.rewardData.customData.serviceName} via{' '}
              {reward.rewardData.customData.deliveryMethod}
            </div>
          )}

          {reward.rewardType === 'nft' && (reward.rewardData as any)?.nftData && (
            <div className="text-xs text-indigo-400 bg-indigo-500/10 p-2 rounded">
              NFT: {(reward.rewardData as any).nftData.collectionName || 'Digital Collectible'}
              {(reward.rewardData as any).nftData.soulbound && ' (Soulbound)'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NftImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const headers: Record<string, string> = { ...getAuthHeaders() };
      const csrfToken = await getCsrfToken();
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const res = await fetch('/api/nft/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await readJsonResponse<{ gatewayUrl: string }>(res);
      onChange(data.gatewayUrl);
      setPreview(data.gatewayUrl);
    } catch (error) {
      setPreview(null);
      onChange('');
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image to IPFS',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
          <img src={preview} alt="NFT preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md cursor-pointer transition-colors">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading to IPFS...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Image
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setPreview(e.target.value || null);
        }}
        placeholder="Or paste image URL..."
        className="bg-white/10 border-white/20 text-white text-sm"
      />
    </div>
  );
}

// Reward Creation Form Component with react-hook-form + zodResolver
function RewardCreationForm({
  programs,
  collections,
  onSubmit,
  onCancel,
}: {
  programs: Array<{ id: string; name: string }>;
  collections: Array<Record<string, any>>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const _user = useAuth().user;
  const { toast } = useToast();
  const form = useForm<RewardFormData>({
    resolver: zodResolver(rewardCreationFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      rewardType: undefined,
      programId: programs[0]?.id || '',
      pointsCost: 50,
      maxRedemptions: null,
      rewardData: {
        raffleData: {
          prizeDescription: '',
          prizeValue: 0,
          entryPointsCost: 1,
          drawDate: '',
          winnerSelectionMethod: 'random',
        },
        physicalData: {
          itemName: '',
          itemDescription: '',
          shippingRequired: true,
          stockQuantity: 0,
          condition: 'new',
          quantity: 1,
          photos: [],
          approvalStatus: 'pending',
        },
        customData: {
          serviceName: '',
          serviceDescription: '',
          deliveryMethod: 'email',
          requiresPersonalization: false,
        },
        videoData: {
          maxVideoDuration: 60,
          deliveryInstructions: '',
          turnaroundDays: 7,
          requiresPersonalization: true,
          personalizationInstructions: '',
          sampleVideoUrl: '',
        },
        nftData: {
          collectionId: '',
          templateId: '',
          collectionName: '',
          collectionDescription: '',
          imageUrl: '',
          maxSupply: '',
          soulbound: false,
          autoMintOnRedeem: true,
        } as any,
      },
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedRewardType = form.watch('rewardType');
  const watchedCollectionId = form.watch('rewardData.nftData.collectionId' as any);

  useEffect(() => {
    const currentProgramId = form.getValues('programId');
    if (!currentProgramId && programs[0]?.id) {
      form.setValue('programId', programs[0].id, { shouldValidate: true });
    }
  }, [form, programs]);

  useEffect(() => {
    const selectedCollection = collections.find((collection) => collection.id === watchedCollectionId);
    if (!selectedCollection) return;

    const metadata = (selectedCollection.metadata as Record<string, unknown> | undefined) || {};
    const currentNftData = (form.getValues('rewardData.nftData' as any) as Record<string, any>) || {};

    form.setValue('rewardData.nftData.collectionName' as any, selectedCollection.name, {
      shouldValidate: true,
    });
    form.setValue(
      'rewardData.nftData.collectionDescription' as any,
      selectedCollection.description || '',
      { shouldValidate: false }
    );

    if (!currentNftData.imageUrl && typeof metadata.collectionImageUrl === 'string') {
      form.setValue('rewardData.nftData.imageUrl' as any, metadata.collectionImageUrl, {
        shouldValidate: true,
      });
    }
  }, [collections, form, watchedCollectionId]);

  const handleFormSubmit = (data: RewardFormData) => {
    const nftData = (data.rewardData as any)?.nftData;

    // Process form data based on reward type
    const processedData = {
      ...data,
      imageUrl: watchedRewardType === 'nft' ? nftData?.imageUrl || null : (data as any).imageUrl,
      // Ensure proper type-specific data structure
      rewardData:
        watchedRewardType === 'raffle'
          ? { raffleData: data.rewardData?.raffleData }
          : watchedRewardType === 'physical'
            ? { physicalData: data.rewardData?.physicalData }
            : watchedRewardType === 'video'
              ? { videoData: data.rewardData?.videoData }
              : watchedRewardType === 'custom'
                ? { customData: data.rewardData?.customData }
                : watchedRewardType === 'nft'
                  ? { nftData: (data.rewardData as any)?.nftData }
                  : {},
    };
    onSubmit(processedData);
  };

  return (
    <Form {...form}>
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      <form
        onSubmit={form.handleSubmit(handleFormSubmit as any)}
        className="space-y-6"
        data-testid="form-reward-creation"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            control={form.control as any}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Reward Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Exclusive Video Call, Limited Edition Merch"
                    className="mt-2 bg-white/10 border-white/20 text-white"
                    data-testid="input-reward-name"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Describe what fans will receive..."
                    className="mt-2 bg-white/10 border-white/20 text-white"
                    rows={3}
                    data-testid="textarea-reward-description"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Loyalty Program</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select loyalty program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="rewardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Reward Type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      data-testid="select-reward-type"
                    >
                      <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select reward type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nft">NFT (Digital Collectible)</SelectItem>
                        <SelectItem value="raffle">Raffle Entry</SelectItem>
                        <SelectItem value="physical">Physical Item</SelectItem>
                        <SelectItem value="video">Custom Video (Cameo)</SelectItem>
                        <SelectItem value="custom">Custom Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="pointsCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Points Cost</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      placeholder="50"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-points-cost"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name="maxRedemptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Max Redemptions (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={field.value || ''}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="mt-2 bg-white/10 border-white/20 text-white"
                    data-testid="input-max-redemptions"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Type-Specific Configuration */}
        {watchedRewardType === 'nft' && (
          <div
            className="space-y-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
            data-testid="section-nft-config"
          >
            <h3 className="text-white font-medium">NFT Configuration</h3>
            <p className="text-sm text-gray-400">
              Configure the NFT collection that will be minted as a reward on Avalanche Fuji
            </p>
            {collections.length === 0 && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300 text-sm">
                  Create an NFT collection in `NFT Collections` before creating an NFT reward.
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control as any}
              name="rewardData.nftData.collectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">NFT Collection</FormLabel>
                  <FormControl>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select an existing NFT collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            {watchedCollectionId && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-sm text-indigo-200">
                {collections.find((collection) => collection.id === watchedCollectionId)?.description ||
                  'This reward will mint into the selected collection.'}
              </div>
            )}
            <FormField
              control={form.control as any}
              name="rewardData.nftData.imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">NFT Image</FormLabel>
                  <FormControl>
                    <NftImageUploadField value={field.value || ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="rewardData.nftData.maxSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Max Supply (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="number"
                      placeholder="Leave empty for unlimited"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nft-soulbound"
                checked={!!form.watch('rewardData.nftData.soulbound' as any)}
                onChange={(e) =>
                  form.setValue('rewardData.nftData.soulbound' as any, e.target.checked)
                }
                className="rounded border-white/20"
              />
              <Label htmlFor="nft-soulbound" className="text-white cursor-pointer">
                Soulbound (non-transferable)
              </Label>
            </div>
            <p className="text-sm text-indigo-300">
              NFTs will be minted on Avalanche Fuji when fans redeem this reward.
            </p>
          </div>
        )}

        {watchedRewardType === 'raffle' && (
          <div
            className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
            data-testid="section-raffle-config"
          >
            <h3 className="text-white font-medium">Raffle Configuration</h3>
            <FormField
              control={form.control as any}
              name="rewardData.raffleData.prizeDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Prize Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Signed Poster, Video Call Session"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-raffle-prize"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="rewardData.raffleData.drawDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Draw Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-raffle-date"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <p className="text-sm text-purple-300">1 point = 1 raffle entry</p>
          </div>
        )}

        {watchedRewardType === 'physical' && (
          <div
            className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
            data-testid="section-physical-config"
          >
            <h3 className="text-white font-medium">Physical Item Configuration</h3>

            {/* Important Notice about Approval Process */}
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400 text-sm">
                <strong>Approval Process:</strong> Physical items require admin approval. You must
                send the item to our P.O. Box for inspection before it can be offered as a reward.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control as any}
              name="rewardData.physicalData.itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Item Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Autographed Photo, Game-Used Jersey, Ski Gloves"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-physical-item"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="rewardData.physicalData.itemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Item Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Provide detailed description of the item..."
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      rows={3}
                      data-testid="textarea-physical-description"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="rewardData.physicalData.condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Item Condition *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="like-new">Like New</SelectItem>
                          <SelectItem value="game-used">Game-Used</SelectItem>
                          <SelectItem value="sponsor-item">Sponsor Item</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="rewardData.physicalData.quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Quantity Available *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        placeholder="1"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="mt-2 bg-white/10 border-white/20 text-white"
                        data-testid="input-physical-quantity"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* P.O. Box Information */}
            <div className="p-4 bg-brand-dark-bg rounded-lg border border-white/10 space-y-2">
              <h4 className="text-white font-semibold text-sm">Shipping Instructions</h4>
              <p className="text-gray-300 text-sm">
                After creating this listing, please send the physical item to:
              </p>
              <div className="p-3 bg-white/5 rounded border border-brand-primary/30 font-mono text-sm text-brand-primary">
                Fandomly Physical Rewards
                <br />
                P.O. Box [TO BE ASSIGNED]
                <br />
                [City, State ZIP]
              </div>
              <p className="text-xs text-gray-400">
                Your item will be inspected by our team and approved within 3-5 business days.
              </p>
            </div>

            {/* Note: Photo upload would go here, using ImageUpload component */}
            <div className="space-y-2">
              <Label className="text-white">Item Photos (coming soon)</Label>
              <div className="p-8 border-2 border-dashed border-gray-600 rounded-lg text-center">
                <p className="text-sm text-gray-400">
                  Photo upload for physical items coming soon. For now, item will be reviewed when
                  received at our P.O. Box.
                </p>
              </div>
            </div>
          </div>
        )}

        {watchedRewardType === 'video' && (
          <div
            className="space-y-4 p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg"
            data-testid="section-video-config"
          >
            <h3 className="text-white font-medium flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              Custom Video (Cameo) Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="rewardData.videoData.maxVideoDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Max Video Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="15"
                        max="300"
                        placeholder="60"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        className="mt-2 bg-white/10 border-white/20 text-white"
                        data-testid="input-video-duration"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="rewardData.videoData.turnaroundDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Turnaround Time (days)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="30"
                        placeholder="7"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                        className="mt-2 bg-white/10 border-white/20 text-white"
                        data-testid="input-video-turnaround"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name="rewardData.videoData.deliveryInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Delivery Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain how fans will receive their custom video..."
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      rows={3}
                      data-testid="textarea-video-delivery"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="rewardData.videoData.personalizationInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Personalization Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="What information do you need from fans? (e.g., name, occasion, special message)"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      rows={3}
                      data-testid="textarea-video-personalization"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t border-white/10">
              <Label className="text-white mb-3 block">Sample Video (Optional)</Label>
              <p className="text-xs text-gray-400 mb-3">
                Upload a sample video to show fans what to expect. This helps set expectations for
                quality and style.
              </p>
              <VideoUpload
                onUploadSuccess={(url) => {
                  form.setValue('rewardData.videoData.sampleVideoUrl', url);
                  toast({
                    title: 'Sample Video Uploaded',
                    description: 'Your sample video has been saved.',
                  });
                }}
                currentVideoUrl={form.watch('rewardData.videoData.sampleVideoUrl')}
                maxSizeMB={50}
                label=""
              />
            </div>
          </div>
        )}

        {watchedRewardType === 'custom' && (
          <div
            className="space-y-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
            data-testid="section-custom-config"
          >
            <h3 className="text-white font-medium">Custom Service Configuration</h3>
            <FormField
              control={form.control as any}
              name="rewardData.customData.serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Service Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Personal Video Message, 1-on-1 Coaching Session"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-custom-service"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="rewardData.customData.deliveryMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Delivery Method</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      data-testid="select-custom-delivery"
                    >
                      <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="video_call">Video Call</SelectItem>
                        <SelectItem value="platform">In-Platform</SelectItem>
                        <SelectItem value="physical">Physical Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-reward"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            className="bg-brand-primary hover:bg-brand-primary/80"
            data-testid="button-create-reward"
          >
            {form.formState.isSubmitting ? 'Creating...' : 'Create Reward'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
