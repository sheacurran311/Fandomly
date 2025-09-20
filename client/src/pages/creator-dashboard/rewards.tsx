import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Gift, Ticket, Package, Star, Coins, Users, Calendar, Edit, Trash2, Eye } from "lucide-react";
import type { Reward } from "@shared/schema";
import { insertRewardSchema } from "@shared/schema";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";

// Form schema extending insertRewardSchema with additional validation
const rewardCreationFormSchema = insertRewardSchema.extend({
  name: z.string().min(1, "Reward name is required").max(100, "Name too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pointsCost: z.number().min(1, "Points cost must be at least 1"),
  rewardType: z.enum(["raffle", "physical", "custom", "nft"], {
    required_error: "Please select a reward type"
  }),
  maxRedemptions: z.number().min(1).optional().nullable(),
  // Type-specific validation handled dynamically
});

type RewardFormData = z.infer<typeof rewardCreationFormSchema>;

// Utility functions for reward type icons and colors
const getRewardTypeIcon = (type: string) => {
  switch (type) {
    case 'raffle': return <Ticket className="h-5 w-5" />;
    case 'physical': return <Package className="h-5 w-5" />;
    case 'custom': return <Star className="h-5 w-5" />;
    case 'nft': return <Gift className="h-5 w-5" />;
    default: return <Gift className="h-5 w-5" />;
  }
};

const getRewardTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'raffle': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'physical': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';  
    case 'custom': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'nft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export default function RewardsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRewardType, setSelectedRewardType] = useState<string>("");

  // Fetch creator's rewards
  const { data: rewards = [], isLoading: rewardsLoading, refetch } = useQuery({
    queryKey: ['/api/rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/rewards/creator/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Calculate reward stats
  const rewardStats = {
    totalRewards: rewards.length,
    activeRewards: rewards.filter((r: Reward) => r.isActive).length,
    totalRedemptions: rewards.reduce((sum: number, r: Reward) => sum + (r.currentRedemptions || 0), 0),
    pointsAllocated: rewards.reduce((sum: number, r: Reward) => sum + (r.pointsCost * (r.currentRedemptions || 0)), 0),
  };


  const handleCreateReward = async (rewardData: any) => {
    try {
      await apiRequest('POST', '/api/rewards', {
        ...rewardData,
        creatorId: user?.id,
      });
      
      toast({
        title: "Reward Created",
        description: "Your new reward has been created successfully!",
        duration: 3000
      });
      
      setCreateModalOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reward. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Reward Management
                </h1>
                <p className="text-gray-400">
                  Create and manage rewards for your fans to redeem with points
                </p>
              </div>
              
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
                  <RewardCreationForm onSubmit={handleCreateReward} onCancel={() => setCreateModalOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
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
                  <p className="text-gray-400 mb-6">Create your first reward to engage your fans with points-based redemption!</p>
                  <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-primary hover:bg-brand-primary/80">
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
        </div>
      </div>
    </div>
  );
}

// Reward Card Component
function RewardCard({ reward, onUpdate }: { reward: Reward; onUpdate: () => void }) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const toggleRewardStatus = async () => {
    try {
      await apiRequest('PUT', `/api/rewards/${reward.id}`, {
        isActive: !reward.isActive
      });
      
      toast({
        title: reward.isActive ? "Reward Deactivated" : "Reward Activated",
        description: `${reward.name} has been ${reward.isActive ? 'deactivated' : 'activated'}.`,
        duration: 3000
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reward status.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <Card className={`bg-white/5 border-white/10 transition-all hover:border-brand-primary/30 ${!reward.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-primary/20 rounded-lg">
              {getRewardTypeIcon(reward.rewardType)}
            </div>
            <div>
              <CardTitle className="text-white text-lg">{reward.name}</CardTitle>
              <Badge className={`text-xs mt-1 ${getRewardTypeBadgeColor(reward.rewardType)}`}>
                {reward.rewardType.charAt(0).toUpperCase() + reward.rewardType.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
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
              {reward.isActive ? <Edit className="h-4 w-4" /> : <Star className="h-4 w-4" />}
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
            <div className="text-xs text-blue-400 bg-blue-500/10 p-2 rounded">
              {reward.rewardData.physicalData.shippingRequired ? '📦 Ships worldwide' : '📍 Local pickup'}
            </div>
          )}
          
          {reward.rewardType === 'custom' && reward.rewardData?.customData && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded">
              {reward.rewardData.customData.serviceName} via {reward.rewardData.customData.deliveryMethod}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Reward Creation Form Component with react-hook-form + zodResolver
function RewardCreationForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const form = useForm<RewardFormData>({
    resolver: zodResolver(rewardCreationFormSchema),
    defaultValues: {
      name: '',
      description: '',
      rewardType: undefined,
      pointsCost: 50,
      maxRedemptions: null,
      rewardData: {
        raffleData: {
          prizeDescription: '',
          prizeValue: 0,
          entryPointsCost: 1,
          drawDate: '',
          winnerSelectionMethod: 'random'
        },
        physicalData: {
          itemName: '',
          itemDescription: '',
          shippingRequired: true,
          stockQuantity: 0
        },
        customData: {
          serviceName: '',
          serviceDescription: '',
          deliveryMethod: 'email',
          requiresPersonalization: false
        }
      }
    }
  });

  const watchedRewardType = form.watch('rewardType');

  const handleFormSubmit = (data: RewardFormData) => {
    // Process form data based on reward type
    const processedData = {
      ...data,
      // Ensure proper type-specific data structure
      rewardData: watchedRewardType === 'raffle' ? { raffleData: data.rewardData?.raffleData } :
                  watchedRewardType === 'physical' ? { physicalData: data.rewardData?.physicalData } :
                  watchedRewardType === 'custom' ? { customData: data.rewardData?.customData } :
                  {}
    };
    onSubmit(processedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6" data-testid="form-reward-creation">
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Reward Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Exclusive Video Call, Limited Edition NFT"
                    className="mt-2 bg-white/10 border-white/20 text-white"
                    data-testid="input-reward-name"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
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
              control={form.control}
              name="rewardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Reward Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} data-testid="select-reward-type">
                      <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select reward type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raffle">Raffle Entry</SelectItem>
                        <SelectItem value="physical">Physical Item</SelectItem>
                        <SelectItem value="custom">Custom Service</SelectItem>
                        <SelectItem value="nft">Digital NFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
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
            control={form.control}
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
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
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
        {watchedRewardType === 'raffle' && (
          <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg" data-testid="section-raffle-config">
            <h3 className="text-white font-medium">Raffle Configuration</h3>
            <FormField
              control={form.control}
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
              control={form.control}
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
          <div className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg" data-testid="section-physical-config">
            <h3 className="text-white font-medium">Physical Item Configuration</h3>
            <FormField
              control={form.control}
              name="rewardData.physicalData.itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Item Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., T-Shirt, Signed Poster, Merchandise"
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-physical-item"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rewardData.physicalData.stockQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Stock Quantity</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      placeholder="100"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className="mt-2 bg-white/10 border-white/20 text-white"
                      data-testid="input-physical-stock"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </div>
        )}

        {watchedRewardType === 'custom' && (
          <div className="space-y-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" data-testid="section-custom-config">
            <h3 className="text-white font-medium">Custom Service Configuration</h3>
            <FormField
              control={form.control}
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
              control={form.control}
              name="rewardData.customData.deliveryMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Delivery Method</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} data-testid="select-custom-delivery">
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