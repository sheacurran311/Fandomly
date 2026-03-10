/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useRewardRedemptions } from '@/hooks/use-points';
import { apiRequest, readJsonResponse } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Store,
  Search,
  Loader2,
  Gift,
  Package,
  Video,
  Sparkles,
  Ticket,
  Image as ImageIcon,
  Coins,
  AlertCircle,
  Clock,
  Calendar,
  MapPin,
  CheckCircle,
  History,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAccount } from '@particle-network/connectkit';

// Types
interface Reward {
  id: string;
  name: string;
  description: string;
  rewardType: 'raffle' | 'physical' | 'video' | 'custom' | 'nft';
  pointsCost: number;
  imageUrl?: string;
  stockCount?: number;
  stockRemaining?: number;
  isActive: boolean;
  canAfford?: boolean;
  metadata?: {
    // Physical rewards
    shippingInfo?: string;
    condition?: string;
    estimatedShipping?: string;
    // Video rewards
    turnaroundTime?: string;
    personalizationOptions?: string;
    maxDuration?: string;
    // Raffle rewards
    drawDate?: string;
    prizeDescription?: string;
    totalTickets?: number;
    ticketsRemaining?: number;
    // NFT rewards
    contractAddress?: string;
    tokenId?: string;
  };
  rewardData?: {
    nftData?: {
      collectionName?: string;
      imageUrl?: string;
      autoMintOnRedeem?: boolean;
    };
  };
  programId?: string;
  creatorName?: string;
}

interface CatalogResponse {
  rewards: Reward[];
  userPoints: number;
}

interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

const rewardTypeConfig = {
  physical: { icon: Package, label: 'Physical', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  video: { icon: Video, label: 'Video', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  custom: {
    icon: Sparkles,
    label: 'Custom',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
  },
  raffle: { icon: Ticket, label: 'Raffle', color: 'text-pink-400', bgColor: 'bg-pink-400/20' },
  nft: { icon: ImageIcon, label: 'NFT', color: 'text-green-400', bgColor: 'bg-green-400/20' },
};

function getRewardTypeConfig(type: string | undefined) {
  if (type && type in rewardTypeConfig) {
    return rewardTypeConfig[type as keyof typeof rewardTypeConfig];
  }

  // Handle older/legacy reward type values gracefully in the fan UI.
  if (type === 'digital') {
    return { icon: Gift, label: 'Digital', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' };
  }

  return { icon: Gift, label: 'Reward', color: 'text-gray-400', bgColor: 'bg-gray-400/20' };
}

function getRedemptionStatusMeta(status: string, nftStatus?: string) {
  if (nftStatus === 'completed') {
    return { label: 'NFT Minted', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
  }
  if (nftStatus === 'pending_wallet') {
    return {
      label: 'Wallet Needed',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
  }
  if (nftStatus === 'pending_manual') {
    return {
      label: 'Awaiting Mint',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
  }
  if (nftStatus === 'failed') {
    return { label: 'Mint Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
  if (status === 'fulfilled' || status === 'completed') {
    return { label: 'Fulfilled', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
  }
  if (status === 'pending') {
    return { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  }
  return { label: status || 'Unknown', className: 'bg-white/5 text-gray-400 border-white/10' };
}

export default function FanRewardsStore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [storeView, setStoreView] = useState<'browse' | 'redemptions'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [lastRedeemed, setLastRedeemed] = useState<{
    name: string;
    points: number;
    type: string;
  } | null>(null);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
  });

  // Fetch catalog
  const { data: catalogData, isLoading } = useQuery<CatalogResponse>({
    queryKey: ['/api/rewards/catalog'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rewards/catalog');
      return readJsonResponse(response);
    },
    enabled: !!user,
  });

  const rewards = catalogData?.rewards || [];
  const userPoints = catalogData?.userPoints || 0;
  const { data: redemptionHistory = [], isLoading: redemptionsLoading } = useRewardRedemptions();
  const { address: particleAddress } = useAccount();
  const fanWalletAddress =
    particleAddress ||
    ((user as any)?.avalancheL1Address as string | undefined) ||
    ((user as any)?.walletAddress as string | undefined);

  // Fetch reward detail — the endpoint returns { reward, userBalance, canRedeem, ... }
  // so we flatten it into the Reward shape the UI expects.
  const { data: rewardDetail, isLoading: isLoadingDetail } = useQuery<Reward | null>({
    queryKey: ['/api/rewards/catalog', selectedReward?.id],
    queryFn: async (): Promise<Reward | null> => {
      if (!selectedReward?.id) return null;
      const response = await apiRequest('GET', `/api/rewards/catalog/${selectedReward.id}`);
      const data: any = await readJsonResponse(response);
      const r = data.reward ?? data;
      return {
        ...r,
        pointsCost: r.pointsCost ?? r.points_cost ?? 0,
        rewardType: r.rewardType ?? r.reward_type ?? 'custom',
        imageUrl: r.imageUrl ?? r.image_url,
        stockCount: r.stockCount ?? r.stock_quantity,
        stockRemaining:
          r.stockQuantity != null ? r.stockQuantity : (r.stockRemaining ?? r.stock_quantity),
        isActive: r.isActive ?? r.is_active ?? true,
        programId: r.programId ?? r.program_id ?? selectedReward?.programId,
        rewardData: r.rewardData ?? r.reward_data,
        canAfford: data.canRedeem ?? data.userBalance >= (r.pointsCost ?? r.points_cost ?? 0),
        creatorName: r.creatorName ?? selectedReward?.creatorName,
      } as Reward;
    },
    enabled: !!selectedReward?.id && showDetailDialog,
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async (data: {
      rewardId: string;
      programId: string;
      shippingAddress?: ShippingAddress;
    }) => {
      const response = await apiRequest('POST', '/api/rewards/redeem', data);
      return readJsonResponse(response);
    },
    onSuccess: (data: any) => {
      const rewardName = selectedReward?.name || 'Reward';
      const rewardPoints = selectedReward?.pointsCost || 0;
      const rewardType = selectedReward?.rewardType || 'custom';
      const nftMessage = data?.redemption?.metadata?.nftMintMessage;
      const nftStatus = data?.redemption?.metadata?.nftMintStatus;
      toast({
        title: 'Reward Redeemed!',
        description:
          nftMessage ||
          (nftStatus === 'completed'
            ? 'Your NFT was minted successfully.'
            : 'Your reward has been successfully redeemed.'),
      });
      setLastRedeemed({ name: rewardName, points: rewardPoints, type: rewardType });
      setTimeout(() => setLastRedeemed(null), 8000);
      setShowConfirmDialog(false);
      setShowShippingDialog(false);
      setShowDetailDialog(false);
      setSelectedReward(null);
      setShippingAddress({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        stateProvince: '',
        postalCode: '',
        country: '',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/catalog'] });
      queryClient.invalidateQueries({ queryKey: ['reward-redemptions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Redemption Failed',
        description: error.message || 'Could not redeem reward. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter rewards
  const filteredRewards = rewards.filter((reward) => {
    const matchesSearch =
      reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || reward.rewardType === selectedType;
    return matchesSearch && matchesType;
  });

  const handleRewardClick = (reward: Reward) => {
    setSelectedReward(reward);
    setShowDetailDialog(true);
  };

  const handleRedeemClick = () => {
    if (!selectedReward) return;

    if (selectedReward.rewardType === 'physical') {
      setShowDetailDialog(false);
      setShowShippingDialog(true);
    } else {
      setShowDetailDialog(false);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmRedeem = () => {
    if (!selectedReward) return;
    if (!selectedReward.programId) {
      toast({
        title: 'Redemption Failed',
        description: 'This reward is not linked to a loyalty program.',
        variant: 'destructive',
      });
      return;
    }
    redeemMutation.mutate({ rewardId: selectedReward.id, programId: selectedReward.programId });
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;
    if (!selectedReward.programId) {
      toast({
        title: 'Redemption Failed',
        description: 'This reward is not linked to a loyalty program.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (
      !shippingAddress.fullName ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.postalCode ||
      !shippingAddress.country
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    redeemMutation.mutate({
      rewardId: selectedReward.id,
      programId: selectedReward.programId!,
      shippingAddress,
    });
  };

  const pointsNeeded =
    selectedReward && !selectedReward.canAfford ? selectedReward.pointsCost - userPoints : 0;

  if (isLoading) {
    return (
      <DashboardLayout userType="fan">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading rewards store...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="fan">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Store className="h-8 w-8 text-brand-primary" />
              {storeView === 'browse' ? 'Rewards Store' : 'My Redemptions'}
            </h1>
            <p className="text-gray-400 mt-1">
              {storeView === 'browse'
                ? 'Redeem your points for exclusive rewards'
                : 'Track the status of your redeemed rewards'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Card className="bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30 md:w-auto">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Coins className="h-8 w-8 text-brand-primary" />
                  <div>
                    <p className="text-sm text-gray-400">Your Points</p>
                    <p className="text-2xl font-bold text-white">{userPoints.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={storeView === 'browse' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStoreView('browse')}
            className={
              storeView === 'browse'
                ? 'bg-brand-primary hover:bg-brand-primary/80'
                : 'border-white/10 text-gray-300 hover:bg-white/5'
            }
          >
            <Store className="h-4 w-4 mr-2" />
            Browse Rewards
          </Button>
          <Button
            variant={storeView === 'redemptions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStoreView('redemptions')}
            className={
              storeView === 'redemptions'
                ? 'bg-brand-primary hover:bg-brand-primary/80'
                : 'border-white/10 text-gray-300 hover:bg-white/5'
            }
          >
            <History className="h-4 w-4 mr-2" />
            My Redemptions
            {redemptionHistory.length > 0 && (
              <Badge className="ml-2 bg-white/10 text-white border-0 text-xs px-1.5">
                {redemptionHistory.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Success confirmation after redemption */}
        {lastRedeemed && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-400">Reward Redeemed Successfully</p>
              <p className="text-xs text-green-400/70">
                {lastRedeemed.name} &middot; {lastRedeemed.points.toLocaleString()} points spent
                {lastRedeemed.type === 'nft' && ' &middot; NFT minting in progress'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLastRedeemed(null);
                setStoreView('redemptions');
              }}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 shrink-0"
            >
              View Redemptions
            </Button>
          </div>
        )}

        {/* My Redemptions View */}
        {storeView === 'redemptions' && (
          <div className="space-y-4">
            {redemptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : redemptionHistory.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Redemptions Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Browse the rewards store and redeem your points for exclusive rewards.
                  </p>
                  <Button
                    onClick={() => setStoreView('browse')}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Browse Rewards
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Redemption stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{redemptionHistory.length}</p>
                      <p className="text-xs text-gray-400">Total Redeemed</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {
                          redemptionHistory.filter(
                            (r: any) =>
                              r.status === 'fulfilled' ||
                              r.status === 'completed' ||
                              r.metadata?.nftMintStatus === 'completed'
                          ).length
                        }
                      </p>
                      <p className="text-xs text-gray-400">Fulfilled</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        {
                          redemptionHistory.filter(
                            (r: any) =>
                              r.status === 'pending' ||
                              r.metadata?.nftMintStatus === 'pending_manual'
                          ).length
                        }
                      </p>
                      <p className="text-xs text-gray-400">Pending</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Redemption list */}
                {redemptionHistory.map((redemption: any) => {
                  const statusMeta = getRedemptionStatusMeta(
                    redemption.status,
                    redemption.metadata?.nftMintStatus
                  );
                  const rewardConfig = getRewardTypeConfig(
                    redemption.reward?.rewardType || redemption.reward?.type
                  );
                  const RewardIcon = rewardConfig.icon;

                  return (
                    <Card
                      key={redemption.id}
                      className="bg-white/5 border-white/10 hover:border-white/20 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Reward icon */}
                          <div
                            className={`w-12 h-12 rounded-xl ${rewardConfig.bgColor} flex items-center justify-center shrink-0`}
                          >
                            {redemption.reward?.imageUrl ? (
                              <img
                                src={redemption.reward.imageUrl}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover"
                              />
                            ) : (
                              <RewardIcon className={`w-6 h-6 ${rewardConfig.color}`} />
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-white truncate">
                                {redemption.reward?.name || 'Reward'}
                              </h4>
                              <Badge className={`${statusMeta.className} text-xs shrink-0`}>
                                {statusMeta.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                {(redemption.pointsSpent || 0).toLocaleString()} pts
                              </span>
                              {redemption.programName && (
                                <span className="truncate">{redemption.programName}</span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(redemption.redeemedAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            {redemption.metadata?.nftMintMessage && (
                              <p className="text-xs text-yellow-300 mt-1">
                                {redemption.metadata.nftMintMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Browse Store View */}
        {storeView === 'browse' && (
          <>
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search rewards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
              <TabsList className="bg-white/5 border-white/10">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
                <TabsTrigger value="raffle">Raffle</TabsTrigger>
                <TabsTrigger value="nft">NFT</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedType} className="mt-6">
                {filteredRewards.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-12 text-center">
                      <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Rewards Found</h3>
                      <p className="text-gray-400">
                        {searchQuery
                          ? 'Try adjusting your search or filters'
                          : 'No rewards available at the moment. Check back soon!'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRewards.map((reward) => {
                      const config = getRewardTypeConfig(reward.rewardType);
                      const Icon = config.icon;
                      const canAfford = reward.canAfford ?? userPoints >= (reward.pointsCost ?? 0);
                      const isOutOfStock =
                        reward.stockRemaining != null && reward.stockRemaining <= 0;
                      const needsPoints = (reward.pointsCost ?? 0) - userPoints;

                      return (
                        <Card
                          key={reward.id}
                          className="bg-white/5 border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group overflow-hidden"
                          onClick={() => handleRewardClick(reward)}
                        >
                          {/* Image */}
                          <div className="relative h-48 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 overflow-hidden">
                            {reward.imageUrl ? (
                              <img
                                src={reward.imageUrl}
                                alt={reward.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className={`h-20 w-20 ${config.color}`} />
                              </div>
                            )}

                            {/* Type Badge */}
                            <div className="absolute top-3 left-3">
                              <Badge className={`${config.bgColor} ${config.color} border-0`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>

                            {/* Stock Badge — only show when stock is tracked (non-null) */}
                            {reward.stockRemaining != null && (
                              <div className="absolute top-3 right-3">
                                <Badge
                                  className={
                                    isOutOfStock
                                      ? 'bg-red-500/20 text-red-400 border-0'
                                      : reward.stockRemaining < 10
                                        ? 'bg-yellow-500/20 text-yellow-400 border-0'
                                        : 'bg-green-500/20 text-green-400 border-0'
                                  }
                                >
                                  {isOutOfStock ? 'Out of Stock' : `${reward.stockRemaining} left`}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4 space-y-3">
                            {/* Title */}
                            <div>
                              <h3 className="text-lg font-semibold text-white line-clamp-1">
                                {reward.name}
                              </h3>
                              {reward.creatorName && (
                                <p className="text-xs text-gray-500">by {reward.creatorName}</p>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {reward.description}
                            </p>

                            {/* Points Cost */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                              <div className="flex items-center gap-2">
                                <Coins className="h-5 w-5 text-brand-primary" />
                                <span
                                  className={`text-lg font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}
                                >
                                  {reward.pointsCost.toLocaleString()}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                disabled={!canAfford || isOutOfStock}
                                className={
                                  canAfford && !isOutOfStock
                                    ? 'bg-brand-primary hover:bg-brand-primary/80'
                                    : 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRewardClick(reward);
                                }}
                              >
                                {isOutOfStock ? 'Unavailable' : 'Redeem'}
                              </Button>
                            </div>

                            {/* Need More Points */}
                            {!canAfford && !isOutOfStock && (
                              <div className="flex items-center gap-2 text-xs text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                <span>Need {needsPoints.toLocaleString()} more points</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Reward Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-brand-dark-bg border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : rewardDetail ? (
              (() => {
                const detailConfig = getRewardTypeConfig(rewardDetail.rewardType);
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-white text-2xl flex items-center gap-3">
                        {rewardDetail.imageUrl && (
                          <img
                            src={rewardDetail.imageUrl}
                            alt={rewardDetail.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          {rewardDetail.name}
                          {rewardDetail.creatorName && (
                            <p className="text-sm text-gray-400 font-normal">
                              by {rewardDetail.creatorName}
                            </p>
                          )}
                        </div>
                      </DialogTitle>
                      <DialogDescription className="text-gray-400 text-base">
                        {rewardDetail.description}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Type and Cost */}
                      <div className="flex items-center gap-4">
                        <Badge className={`${detailConfig.bgColor} ${detailConfig.color} border-0`}>
                          {detailConfig.label}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-brand-primary" />
                          <span className="text-xl font-bold text-white">
                            {(rewardDetail.pointsCost ?? 0).toLocaleString()} points
                          </span>
                        </div>
                      </div>

                      {/* Stock Info — only show when stock is tracked (non-null) */}
                      {rewardDetail.stockRemaining != null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            {rewardDetail.stockRemaining > 0
                              ? `${rewardDetail.stockRemaining} remaining`
                              : 'Out of stock'}
                          </span>
                        </div>
                      )}

                      {/* Physical Reward Details */}
                      {rewardDetail.rewardType === 'physical' && rewardDetail.metadata && (
                        <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-400" />
                            Shipping Information
                          </h4>
                          {rewardDetail.metadata.condition && (
                            <div className="text-sm">
                              <span className="text-gray-400">Condition: </span>
                              <span className="text-white">{rewardDetail.metadata.condition}</span>
                            </div>
                          )}
                          {rewardDetail.metadata.estimatedShipping && (
                            <div className="text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400">Est. Shipping: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.estimatedShipping}
                              </span>
                            </div>
                          )}
                          {rewardDetail.metadata.shippingInfo && (
                            <p className="text-sm text-gray-300">
                              {rewardDetail.metadata.shippingInfo}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Video Reward Details */}
                      {rewardDetail.rewardType === 'video' && rewardDetail.metadata && (
                        <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Video className="h-5 w-5 text-purple-400" />
                            Video Details
                          </h4>
                          {rewardDetail.metadata.turnaroundTime && (
                            <div className="text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400">Turnaround: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.turnaroundTime}
                              </span>
                            </div>
                          )}
                          {rewardDetail.metadata.maxDuration && (
                            <div className="text-sm">
                              <span className="text-gray-400">Max Duration: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.maxDuration}
                              </span>
                            </div>
                          )}
                          {rewardDetail.metadata.personalizationOptions && (
                            <div className="text-sm">
                              <span className="text-gray-400">Personalization: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.personalizationOptions}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Raffle Reward Details */}
                      {rewardDetail.rewardType === 'raffle' && rewardDetail.metadata && (
                        <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-pink-400" />
                            Raffle Details
                          </h4>
                          {rewardDetail.metadata.prizeDescription && (
                            <div className="text-sm">
                              <span className="text-gray-400">Prize: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.prizeDescription}
                              </span>
                            </div>
                          )}
                          {rewardDetail.metadata.drawDate && (
                            <div className="text-sm flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400">Draw Date: </span>
                              <span className="text-white">
                                {format(new Date(rewardDetail.metadata.drawDate), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          )}
                          {rewardDetail.metadata.ticketsRemaining !== undefined && (
                            <div className="text-sm">
                              <span className="text-gray-400">Tickets Remaining: </span>
                              <span className="text-white">
                                {rewardDetail.metadata.ticketsRemaining} /{' '}
                                {rewardDetail.metadata.totalTickets || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {rewardDetail.rewardType === 'nft' && (
                        <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-green-400" />
                            NFT Delivery
                          </h4>
                          <div className="text-sm">
                            <span className="text-gray-400">Collection: </span>
                            <span className="text-white">
                              {rewardDetail.rewardData?.nftData?.collectionName ||
                                'Selected NFT collection'}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">Delivery: </span>
                            <span className="text-white">
                              {rewardDetail.rewardData?.nftData?.autoMintOnRedeem === false
                                ? 'Manual mint by creator after redemption'
                                : 'Auto-mint to your connected wallet after redemption'}
                            </span>
                          </div>
                          {!fanWalletAddress && (
                            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                              No wallet is connected yet. You can still redeem this NFT reward, but
                              minting will stay pending until your wallet is connected.
                            </div>
                          )}
                          {fanWalletAddress && (
                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                              This NFT will be minted to {fanWalletAddress.slice(0, 6)}...
                              {fanWalletAddress.slice(-4)}.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Your Points */}
                      <div className="p-4 bg-brand-primary/10 rounded-lg border border-brand-primary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Your Points:</span>
                          <span className="text-xl font-bold text-white">
                            {userPoints.toLocaleString()}
                          </span>
                        </div>
                        {!rewardDetail.canAfford && pointsNeeded > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>You need {pointsNeeded.toLocaleString()} more points</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDetailDialog(false)}
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRedeemClick}
                        disabled={
                          !rewardDetail.canAfford ||
                          !rewardDetail.programId ||
                          (rewardDetail.stockRemaining != null &&
                            rewardDetail.stockRemaining <= 0) ||
                          redeemMutation.isPending
                        }
                        className="bg-brand-primary hover:bg-brand-primary/80"
                      >
                        {redeemMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Redeem Reward
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                );
              })()
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog (Non-Physical Rewards) */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-brand-dark-bg border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Redemption</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to spend {selectedReward?.pointsCost.toLocaleString()} points
                on {selectedReward?.name}?
              </DialogDescription>
            </DialogHeader>
            {selectedReward?.rewardType === 'nft' && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                {fanWalletAddress
                  ? `This NFT will be minted to ${fanWalletAddress.slice(0, 6)}...${fanWalletAddress.slice(-4)} after redemption.`
                  : 'This NFT reward can still be redeemed without a wallet, but minting will remain pending until you connect one.'}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="border-white/20 text-gray-300 hover:bg-white/10"
                disabled={redeemMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRedeem}
                disabled={redeemMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {redeemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shipping Address Dialog (Physical Rewards) */}
        <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
          <DialogContent className="bg-brand-dark-bg border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-primary" />
                Shipping Address
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide your shipping address for this physical reward.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-white">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={shippingAddress.fullName}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, fullName: e.target.value })
                  }
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label htmlFor="addressLine1" className="text-white">
                  Address Line 1 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="addressLine1"
                  value={shippingAddress.addressLine1}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })
                  }
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label htmlFor="addressLine2" className="text-white">
                  Address Line 2
                </Label>
                <Input
                  id="addressLine2"
                  value={shippingAddress.addressLine2}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-white">
                    City <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, city: e.target.value })
                    }
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="stateProvince" className="text-white">
                    State/Province <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="stateProvince"
                    value={shippingAddress.stateProvince}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, stateProvince: e.target.value })
                    }
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode" className="text-white">
                    Postal Code <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                    }
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="country" className="text-white">
                    Country <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="country"
                    value={shippingAddress.country}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, country: e.target.value })
                    }
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowShippingDialog(false)}
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                  disabled={redeemMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={redeemMutation.isPending}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  {redeemMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit & Redeem'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
