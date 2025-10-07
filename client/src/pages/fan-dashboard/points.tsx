import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  TrendingUp,
  Gift,
  Star,
  Trophy,
  Calendar,
  History,
  Target,
  Coins,
  Award,
  Clock,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { usePointTransactionHistory, usePointsSummary, useAvailableRewards, useRewardRedemptions, useRedeemReward } from "@/hooks/use-points";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

export default function FanPoints() {
  const { toast } = useToast();
  
  // Real API data hooks
  const { data: pointsSummary, isLoading: pointsLoading } = usePointsSummary();
  const { data: transactionHistory = [], isLoading: transactionsLoading } = usePointTransactionHistory();
  const { data: availableRewards = [], isLoading: rewardsLoading } = useAvailableRewards();
  const { data: redemptionHistory = [], isLoading: redemptionsLoading } = useRewardRedemptions();
  const redeemRewardMutation = useRedeemReward();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "text-purple-400";
      case "Gold": return "text-yellow-400";
      case "Silver": return "text-gray-400";
      default: return "text-green-400";
    }
  };

  const getTierFromPoints = (points: number) => {
    if (points >= 50000) return "Platinum";
    if (points >= 20000) return "Gold";
    if (points >= 5000) return "Silver";
    return "Bronze";
  };

  const getNextTier = (currentTier: string) => {
    switch (currentTier) {
      case "Bronze": return "Silver";
      case "Silver": return "Gold";
      case "Gold": return "Platinum";
      case "Platinum": return "Diamond";
      default: return "Silver";
    }
  };

  const getPointsToNextTier = (points: number, currentTier: string) => {
    switch (currentTier) {
      case "Bronze": return 5000 - points;
      case "Silver": return 20000 - points;
      case "Gold": return 50000 - points;
      default: return 0;
    }
  };

  const handleRedeemReward = async (rewardId: string, programId: string) => {
    try {
      await redeemRewardMutation.mutateAsync({ rewardId, programId });
      toast({
        title: "🎉 Reward Redeemed!",
        description: "Your reward has been successfully redeemed.",
      });
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: "Could not redeem reward. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getActionIcon = (source: string) => {
    switch (source) {
      case 'social_follow': return <Star className="h-4 w-4" />;
      case 'social_like': return <Gift className="h-4 w-4" />;
      case 'campaign_complete': return <Target className="h-4 w-4" />;
      case 'reward_redemption': return <Award className="h-4 w-4" />;
      default: return <Coins className="h-4 w-4" />;
    }
  };

  if (pointsLoading || transactionsLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading points data...</div>
      </div>
    );
  }

  const currentTier = getTierFromPoints(pointsSummary?.totalPoints || 0);
  const nextTier = getNextTier(currentTier);
  const pointsToNextTier = getPointsToNextTier(pointsSummary?.totalPoints || 0, currentTier);

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <CreditCard className="mr-3 h-8 w-8 text-brand-primary" />
              Points Dashboard
            </h1>
            <p className="text-gray-400">
              Track your points, view earning history, and manage your rewards.
            </p>
          </div>

          {/* Points Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Points</p>
                    <p className="text-2xl font-bold text-white">{(pointsSummary?.totalPoints || 0).toLocaleString()}</p>
                  </div>
                  <Coins className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-green-400">
                    +{transactionHistory.filter(tx => 
                      tx.type === 'earned' && 
                      new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ).reduce((sum, tx) => sum + tx.points, 0).toLocaleString()}
                  </span>
                  <span className="text-gray-400 ml-1">this month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Available</p>
                    <p className="text-2xl font-bold text-white">{(pointsSummary?.availablePoints || 0).toLocaleString()}</p>
                  </div>
                  <Gift className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">{availableRewards.length} rewards available</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Current Tier</p>
                    <p className={`text-2xl font-bold ${getTierColor(currentTier)}`}>
                      {currentTier}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Next: {nextTier}</p>
                  {pointsToNextTier > 0 && (
                    <p className="text-xs text-gray-500">{pointsToNextTier.toLocaleString()} points to go</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-white">
                      {transactionHistory.filter(tx => 
                        tx.type === 'earned' && 
                        new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).reduce((sum, tx) => sum + tx.points, 0).toLocaleString()}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">+18% vs last month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Tier Progress */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Target className="mr-2 h-5 w-5 text-brand-primary" />
                  Tier Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${getTierColor(currentTier)}`}>
                      {currentTier} Tier
                    </span>
                    <span className="text-sm text-gray-400">
                      {pointsToNextTier > 0 ? `${pointsToNextTier.toLocaleString()} to ${nextTier}` : "Max tier reached"}
                    </span>
                  </div>
                  <Progress 
                    value={pointsToNextTier > 0 ? ((5000 - pointsToNextTier) / 5000) * 100 : 100} 
                    className="h-3" 
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{Math.floor((pointsSummary?.totalPoints || 0) / 5000) * 5000}</span>
                    <span>{(Math.floor((pointsSummary?.totalPoints || 0) / 5000) + 1) * 5000}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-white font-medium">{nextTier} Benefits:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• 2x points multiplier on all activities</li>
                    <li>• Exclusive platinum-tier rewards</li>
                    <li>• Priority customer support</li>
                    <li>• Early access to new campaigns</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Points by Creator */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Award className="mr-2 h-5 w-5 text-brand-secondary" />
                  Available Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableRewards.slice(0, 3).map((reward, index) => (
                    <div key={reward.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-brand-primary' : index === 1 ? 'bg-brand-secondary' : 'bg-yellow-400'}`}></div>
                        <div>
                          <p className="text-white font-medium">{reward.name}</p>
                          <p className="text-xs text-gray-400">{reward.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{reward.pointsCost.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Recent Activity
                </span>
                <Button variant="outline" size="sm" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                  View All History
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactionHistory.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
                        {getActionIcon(transaction.source)}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {transaction.source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {transaction.metadata?.socialPlatform || 'Platform activity'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-bold ${transaction.type === 'earned' ? 'text-brand-secondary' : 'text-red-400'}`}>
                        {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
                      </p>
                      <p className="text-xs text-gray-400">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}
