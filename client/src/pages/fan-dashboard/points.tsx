import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  TrendingUp,
  Star,
  Trophy,
  Calendar,
  History,
  Target,
  Coins,
  Award,
  Clock,
  CheckCircle,
  Sparkles,
  User
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  usePointTransactionHistory, 
  usePointsSummary, 
  useAvailableRewards, 
  useRewardRedemptions, 
  useRedeemReward,
  usePlatformPointsBalance,
  usePlatformPointsTransactions
} from "@/hooks/use-points";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { TimeframeSelector, type Timeframe } from "@/components/charts/TimeframeSelector";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { apiRequest } from "@/lib/queryClient";

export default function FanPoints() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  
  // Platform Points Data
  const { data: platformPointsData, isLoading: platformLoading } = usePlatformPointsBalance();
  const { data: platformTransactions, isLoading: platformTxLoading } = usePlatformPointsTransactions();
  const platformBalance = platformPointsData?.balance || 0;
  const platformTxList = platformTransactions?.transactions || [];

  // Creator Points Data
  const { data: pointsSummary, isLoading: pointsLoading } = usePointsSummary();
  const { data: transactionHistory = [], isLoading: transactionsLoading } = usePointTransactionHistory();
  const { data: availableRewards = [], isLoading: rewardsLoading } = useAvailableRewards();
  const { data: redemptionHistory = [], isLoading: redemptionsLoading } = useRewardRedemptions();
  const redeemRewardMutation = useRedeemReward();

  // Fetch points history for charts
  const { data: pointsHistory } = useQuery({
    queryKey: ['/api/fan/dashboard/points-history', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fan/dashboard/points-history?timeframe=${timeframe}`);
      return response.json();
    },
  });

  // Fetch points breakdown for charts
  const { data: pointsBreakdown } = useQuery({
    queryKey: ['/api/fan/points/breakdown'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/fan/points/breakdown');
      return response.json();
    },
  });

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
    if (source.includes('platform_task')) return <Star className="h-4 w-4" />;
    if (source.includes('social')) return <Target className="h-4 w-4" />;
    if (source.includes('campaign')) return <Trophy className="h-4 w-4" />;
    if (source.includes('reward')) return <Award className="h-4 w-4" />;
    return <Coins className="h-4 w-4" />;
  };

  const getSourceLabel = (source: string) => {
    if (source.includes('platform_task')) return 'Platform Task';
    if (source.includes('social_follow')) return 'Social Follow';
    if (source.includes('social_like')) return 'Social Like';
    if (source.includes('campaign')) return 'Campaign';
    if (source.includes('reward')) return 'Reward Redemption';
    return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (platformLoading || pointsLoading) {
    return (
      <DashboardLayout userType="fan">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p>Loading points data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate platform points this month
  const platformPointsThisMonth = platformTxList
    .filter((tx: any) => {
      const txDate = new Date(tx.createdAt);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, tx: any) => sum + tx.points, 0);

  // Calculate creator points this month
  const creatorPointsThisMonth = transactionHistory
    .filter(tx => {
      if (tx.type !== 'earned') return false;
      const txDate = new Date(tx.createdAt);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, tx) => sum + tx.points, 0);

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

        {/* Main Tabs */}
        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Platform Points
            </TabsTrigger>
            <TabsTrigger value="creator" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Creator Points
            </TabsTrigger>
          </TabsList>

          {/* Platform Points Tab */}
          <TabsContent value="platform" className="space-y-6">
            {/* Platform Points Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 backdrop-blur-lg border-brand-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Platform Points</p>
                      <p className="text-3xl font-bold text-white">{platformBalance.toLocaleString()}</p>
                    </div>
                    <Sparkles className="h-10 w-10 text-brand-primary" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-400">Fandomly-issued rewards only</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">This Month</p>
                      <p className="text-2xl font-bold text-white">{platformPointsThisMonth.toLocaleString()}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">Platform tasks completed</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Earned</p>
                      <p className="text-2xl font-bold text-white">{platformBalance.toLocaleString()}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">All-time platform points</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Points Charts */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Points Analytics</h3>
              <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <LineChartCard
                title="Platform Points Over Time"
                description="Your earning trend"
                data={pointsHistory?.platformPoints?.map((item: any) => ({
                  period: item.period,
                  points: item.points
                })) || []}
                dataKeys={[
                  { key: 'points', color: '#8b5cf6', name: 'Platform Points' }
                ]}
                xAxisKey="period"
                height={280}
              />

              <PieChartCard
                title="Platform Points by Task"
                description="Breakdown by activity type"
                data={(pointsBreakdown?.platformPoints || [])
                  .map((item: any) => ({
                    name: getSourceLabel(item.source),
                    value: Number(item.total_points) || 0,
                    color: '#8b5cf6'
                  }))
                  .filter((item: any) => item.value > 0)}
                height={280}
              />
            </div>

            {/* Platform Transaction History */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Platform Points History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {platformTxLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-400">Loading transactions...</p>
                  </div>
                ) : platformTxList.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No platform points earned yet</p>
                    <p className="text-sm text-gray-500 mt-1">Complete platform tasks to start earning</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {platformTxList.slice(0, 10).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-brand-primary/20 rounded-lg">
                            {getActionIcon(tx.source)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{getSourceLabel(tx.source)}</p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(tx.createdAt), 'MMM dd, yyyy • hh:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${tx.points > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Rewards Section */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    Platform Rewards
                  </span>
                  <Badge className="bg-yellow-500/20 text-yellow-400">Coming Soon</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400">Platform rewards coming soon!</p>
                  <p className="text-sm text-gray-500 mt-1">NFTs, badges, and exclusive offers</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Creator Points Tab */}
          <TabsContent value="creator" className="space-y-6">
            {/* Creator Points Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      +{creatorPointsThisMonth.toLocaleString()}
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
                    <Award className="h-8 w-8 text-brand-secondary" />
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
                      <p className="text-sm text-gray-400">This Month</p>
                      <p className="text-2xl font-bold text-white">{creatorPointsThisMonth.toLocaleString()}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">From creator tasks</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Creator Points Charts */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Points Analytics</h3>
              <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <LineChartCard
                title="Creator Points Over Time"
                description="Your earning trend"
                data={pointsHistory?.creatorPoints?.map((item: any) => ({
                  period: item.period,
                  points: item.points
                })) || []}
                dataKeys={[
                  { key: 'points', color: '#3b82f6', name: 'Creator Points' }
                ]}
                xAxisKey="period"
                height={280}
              />

              <PieChartCard
                title="Creator Points by Source"
                description="Breakdown by creator"
                data={(pointsBreakdown?.creatorPoints || [])
                  .map((item: any) => ({
                    name: item.source,
                    value: Number(item.total_points) || 0,
                    color: '#3b82f6'
                  }))
                  .filter((item: any) => item.value > 0)}
                height={280}
              />
            </div>

            {/* Creator Transaction History */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Creator Points History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-400">Loading transactions...</p>
                  </div>
                ) : transactionHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No creator points earned yet</p>
                    <p className="text-sm text-gray-500 mt-1">Complete creator tasks to start earning</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactionHistory.slice(0, 10).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-brand-secondary/20 rounded-lg">
                            {getActionIcon(tx.source)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{getSourceLabel(tx.source)}</p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(tx.createdAt), 'MMM dd, yyyy • hh:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${tx.points > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Creator Rewards */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    Available Creator Rewards
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rewardsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-400">Loading rewards...</p>
                  </div>
                ) : availableRewards.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No rewards available yet</p>
                    <p className="text-sm text-gray-500 mt-1">Enroll with more creators to unlock rewards</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableRewards.map((reward: any) => (
                      <Card key={reward.id} className="bg-white/5 border-white/10 hover:border-brand-primary/50 transition-colors">
                        <CardContent className="p-4">
                          {reward.imageUrl && (
                            <img src={reward.imageUrl} alt={reward.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                          )}
                          <h4 className="text-white font-semibold mb-1">{reward.name}</h4>
                          <p className="text-xs text-gray-400 mb-3">{reward.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-brand-primary/20 text-brand-primary">
                              {reward.pointsCost} pts
                            </Badge>
                            <Button 
                              size="sm" 
                              className="bg-brand-primary hover:bg-brand-primary/80"
                              onClick={() => handleRedeemReward(reward.id, reward.programId)}
                              disabled={redeemRewardMutation.isPending || (pointsSummary?.availablePoints || 0) < reward.pointsCost}
                            >
                              {redeemRewardMutation.isPending ? 'Redeeming...' : 'Redeem'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Redemption History */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Redemption History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {redemptionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-400">Loading redemptions...</p>
                  </div>
                ) : redemptionHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No rewards redeemed yet</p>
                    <p className="text-sm text-gray-500 mt-1">Start earning points to redeem rewards</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {redemptionHistory.map((redemption: any) => (
                      <div key={redemption.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Award className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{redemption.reward?.name || 'Reward'}</p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(redemption.redeemedAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            redemption.status === 'fulfilled' ? 'bg-green-500/20 text-green-400' :
                            redemption.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }>
                            {redemption.status}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">-{redemption.pointsSpent} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
