import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Gift, Ticket, Package, Star, Coins, Users, Calendar, Edit, Trash2, Eye } from "lucide-react";
import type { Reward } from "@shared/schema";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";

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

// Reward Creation Form Component  
function RewardCreationForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rewardType: '',
    pointsCost: 50,
    maxRedemptions: null as number | null,
    // Type-specific data
    raffleData: {
      prizeDescription: '',
      prizeValue: 0,
      entryPointsCost: 1,
      drawDate: '',
      winnerSelectionMethod: 'random' as const
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
      deliveryMethod: 'email' as const,
      requiresPersonalization: false
    }
  });

  const handleSubmit = () => {
    const rewardData: any = {
      name: formData.name,
      description: formData.description,
      rewardType: formData.rewardType,
      pointsCost: formData.pointsCost,
      maxRedemptions: formData.maxRedemptions,
      rewardData: {} as any
    };

    // Add type-specific data
    if (formData.rewardType === 'raffle') {
      rewardData.rewardData.raffleData = formData.raffleData;
    } else if (formData.rewardType === 'physical') {
      rewardData.rewardData.physicalData = formData.physicalData;
    } else if (formData.rewardType === 'custom') {
      rewardData.rewardData.customData = formData.customData;
    }

    onSubmit(rewardData);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedData = (type: 'raffleData' | 'physicalData' | 'customData', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label className="text-white">Reward Name</Label>
          <Input
            placeholder="e.g., Exclusive Video Call, Limited Edition NFT"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className="mt-2 bg-white/10 border-white/20 text-white"
          />
        </div>
        
        <div>
          <Label className="text-white">Description</Label>
          <Textarea
            placeholder="Describe what fans will receive..."
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            className="mt-2 bg-white/10 border-white/20 text-white"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Reward Type</Label>
            <Select value={formData.rewardType} onValueChange={(value) => updateFormData('rewardType', value)}>
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
          </div>
          
          <div>
            <Label className="text-white">Points Cost</Label>
            <Input
              type="number"
              min="1"
              placeholder="50"
              value={formData.pointsCost}
              onChange={(e) => updateFormData('pointsCost', parseInt(e.target.value) || 0)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <div>
          <Label className="text-white">Max Redemptions (optional)</Label>
          <Input
            type="number"
            min="1"
            placeholder="Leave empty for unlimited"
            value={formData.maxRedemptions || ''}
            onChange={(e) => updateFormData('maxRedemptions', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-2 bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>

      {/* Type-Specific Configuration */}
      {formData.rewardType === 'raffle' && (
        <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <h3 className="text-white font-medium">Raffle Configuration</h3>
          <div>
            <Label className="text-white">Prize Description</Label>
            <Input
              placeholder="e.g., Signed Poster, Video Call Session"
              value={formData.raffleData.prizeDescription}
              onChange={(e) => updateNestedData('raffleData', 'prizeDescription', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Draw Date</Label>
            <Input
              type="date"
              value={formData.raffleData.drawDate}
              onChange={(e) => updateNestedData('raffleData', 'drawDate', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
          <p className="text-sm text-purple-300">1 point = 1 raffle entry</p>
        </div>
      )}

      {formData.rewardType === 'physical' && (
        <div className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-white font-medium">Physical Item Configuration</h3>
          <div>
            <Label className="text-white">Item Name</Label>
            <Input
              placeholder="e.g., T-Shirt, Signed Poster, Merchandise"
              value={formData.physicalData.itemName}
              onChange={(e) => updateNestedData('physicalData', 'itemName', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Stock Quantity</Label>
            <Input
              type="number"
              min="0"
              placeholder="100"
              value={formData.physicalData.stockQuantity}
              onChange={(e) => updateNestedData('physicalData', 'stockQuantity', parseInt(e.target.value) || 0)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
      )}

      {formData.rewardType === 'custom' && (
        <div className="space-y-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <h3 className="text-white font-medium">Custom Service Configuration</h3>
          <div>
            <Label className="text-white">Service Name</Label>
            <Input
              placeholder="e.g., Personal Video Message, 1-on-1 Coaching Session"
              value={formData.customData.serviceName}
              onChange={(e) => updateNestedData('customData', 'serviceName', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Delivery Method</Label>
            <Select 
              value={formData.customData.deliveryMethod} 
              onValueChange={(value: any) => updateNestedData('customData', 'deliveryMethod', value)}
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
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.name || !formData.rewardType}
          className="bg-brand-primary hover:bg-brand-primary/80"
        >
          Create Reward
        </Button>
      </div>
    </div>
  );
}