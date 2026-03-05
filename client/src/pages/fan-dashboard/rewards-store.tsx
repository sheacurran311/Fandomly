import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
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
} from 'lucide-react';
import { format } from 'date-fns';

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

export default function FanRewardsStore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);

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
      return response.json();
    },
    enabled: !!user,
  });

  const rewards = catalogData?.rewards || [];
  const userPoints = catalogData?.userPoints || 0;

  // Fetch reward detail
  const { data: rewardDetail, isLoading: isLoadingDetail } = useQuery<Reward>({
    queryKey: ['/api/rewards/catalog', selectedReward?.id],
    queryFn: async () => {
      if (!selectedReward?.id) return null;
      const response = await apiRequest('GET', `/api/rewards/catalog/${selectedReward.id}`);
      return response.json();
    },
    enabled: !!selectedReward?.id && showDetailDialog,
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async (data: { rewardId: string; shippingAddress?: ShippingAddress }) => {
      const response = await apiRequest('POST', '/api/rewards/redeem', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reward Redeemed!',
        description: 'Your reward has been successfully redeemed.',
      });
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
    redeemMutation.mutate({ rewardId: selectedReward.id });
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;

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
              Rewards Store
            </h1>
            <p className="text-gray-400 mt-1">Redeem your points for exclusive rewards</p>
          </div>

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
                  const config = rewardTypeConfig[reward.rewardType];
                  const Icon = config.icon;
                  const canAfford = reward.canAfford ?? userPoints >= reward.pointsCost;
                  const isOutOfStock =
                    reward.stockRemaining !== undefined && reward.stockRemaining <= 0;
                  const needsPoints = reward.pointsCost - userPoints;

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

                        {/* Stock Badge */}
                        {reward.stockRemaining !== undefined && (
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
                        <p className="text-sm text-gray-400 line-clamp-2">{reward.description}</p>

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

        {/* Reward Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-brand-dark-bg border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : rewardDetail ? (
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
                    <Badge
                      className={`${rewardTypeConfig[rewardDetail.rewardType].bgColor} ${rewardTypeConfig[rewardDetail.rewardType].color} border-0`}
                    >
                      {rewardTypeConfig[rewardDetail.rewardType].label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-brand-primary" />
                      <span className="text-xl font-bold text-white">
                        {rewardDetail.pointsCost.toLocaleString()} points
                      </span>
                    </div>
                  </div>

                  {/* Stock Info */}
                  {rewardDetail.stockRemaining !== undefined && (
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
                          <span className="text-white">{rewardDetail.metadata.turnaroundTime}</span>
                        </div>
                      )}
                      {rewardDetail.metadata.maxDuration && (
                        <div className="text-sm">
                          <span className="text-gray-400">Max Duration: </span>
                          <span className="text-white">{rewardDetail.metadata.maxDuration}</span>
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
                      (rewardDetail.stockRemaining !== undefined &&
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
