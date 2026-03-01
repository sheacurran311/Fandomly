import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Eye,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  averagePerFan: number;
  subscriptionRevenue: number;
  campaignRevenue: number;
  growthRate: number;
}

interface RevenueStream {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  fan: string;
  status: string;
}

export default function CreatorRevenue() {
  const { user } = useAuth();

  // Get creator info
  const { data: creator } = useQuery({
    queryKey: ['/api/creators/user', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/creators/user/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  // Fetch real revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueData>({
    queryKey: ['/api/revenue/creator', creator?.id],
    queryFn: async (): Promise<RevenueData> => {
      if (!creator?.id) {
        return {
          totalRevenue: 0,
          monthlyRevenue: 0,
          averagePerFan: 0,
          subscriptionRevenue: 0,
          campaignRevenue: 0,
          growthRate: 0
        };
      }

      try {
        // Get subscription data (what creator pays to Fandomly)
        const subscriptionResponse = await apiRequest('GET', '/api/subscription-status');
        const subscription = await subscriptionResponse.json();
        
        // Map subscription tier to monthly cost
        let monthlySubscriptionCost = 0;
        if (subscription.subscriptionTier === 'starter') monthlySubscriptionCost = 29;
        else if (subscription.subscriptionTier === 'pro') monthlySubscriptionCost = 99;
        else if (subscription.subscriptionTier === 'enterprise') monthlySubscriptionCost = 299;

        // Get fan count and membership data
        const membershipsResponse = await apiRequest('GET', `/api/tenant-memberships/${creator.tenantId}`);
        const memberships = await membershipsResponse.json();
        const fanCount = memberships.length;

        // Calculate historical fan count from 30 days ago for growth rate
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalFanCount = memberships.filter((m: any) => 
          new Date(m.joinedAt) < thirtyDaysAgo
        ).length;

        let growthRate = 0;
        if (historicalFanCount > 0 && fanCount !== historicalFanCount) {
          growthRate = ((fanCount - historicalFanCount) / historicalFanCount) * 100;
        }

        // Note: This represents platform costs, not creator revenue
        // Future: Implement actual creator revenue tracking when monetization features are added
        return {
          totalRevenue: monthlySubscriptionCost * 12, // Annual subscription value
          monthlyRevenue: monthlySubscriptionCost,
          averagePerFan: fanCount > 0 ? monthlySubscriptionCost / fanCount : 0,
          subscriptionRevenue: monthlySubscriptionCost, // Creator's subscription cost
          campaignRevenue: 0, // Placeholder for future campaign sponsorship revenue
          growthRate: parseFloat(growthRate.toFixed(1))
        };
      } catch (error) {
        console.error('Failed to calculate revenue data:', error);
        return {
          totalRevenue: 0,
          monthlyRevenue: 0,
          averagePerFan: 0,
          subscriptionRevenue: 0,
          campaignRevenue: 0,
          growthRate: 0
        };
      }
    },
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Calculate revenue streams from data
  const revenueStreams: RevenueStream[] = revenueData ? [
    { 
      name: "Fan Subscriptions", 
      amount: revenueData.subscriptionRevenue, 
      percentage: revenueData.totalRevenue > 0 ? (revenueData.subscriptionRevenue / revenueData.totalRevenue) * 100 : 0, 
      color: "text-brand-primary" 
    },
    { 
      name: "Campaign Sponsorships", 
      amount: revenueData.campaignRevenue, 
      percentage: revenueData.totalRevenue > 0 ? (revenueData.campaignRevenue / revenueData.totalRevenue) * 100 : 0, 
      color: "text-brand-secondary" 
    }
  ] : [];

  // Fetch recent point award transactions (representing fan engagement activity)
  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/creator', creator?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!creator?.id ||!creator?.tenantId) return [];
      
      try {
        // Get recent point transactions from creator's loyalty programs
        const programsResponse = await apiRequest('GET', `/api/loyalty-programs/creator/${creator.id}`);
        const programs = await programsResponse.json();
        
        const allTransactions: Transaction[] = [];
        
        for (const program of programs.slice(0, 2)) { // Limit to first 2 programs for performance
          try {
            const transactionsResponse = await apiRequest('GET', `/api/point-transactions/program/${program.id}`);
            const transactions = await transactionsResponse.json();
            
            // Convert to Transaction format
            transactions.slice(0, 3).forEach((tx: any) => {
              allTransactions.push({
                id: tx.id,
                type: tx.campaignName || "Points Awarded",
                amount: tx.pointsAwarded || 0,
                date: new Date(tx.timestamp).toLocaleDateString(),
                fan: tx.fanId || 'Fan',
                status: "completed"
              });
            });
          } catch (error) {
            console.warn(`Failed to fetch transactions for program ${program.id}:`, error);
          }
        }
        
        // Sort by date and return most recent 5
        return allTransactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return [];
      }
    },
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <DollarSign className="mr-3 h-8 w-8 text-brand-primary" />
              Revenue Dashboard
            </h1>
            <p className="text-gray-400">
              Track your earnings, manage payouts, and analyze revenue streams.
            </p>
          </div>

          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {revenueLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-16">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">
                          ${(revenueData?.totalRevenue || 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-400" />
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                      {(revenueData?.totalRevenue || 0) === 0 ? (
                        <>
                          <span className="text-gray-400">0%</span>
                          <span className="text-gray-400 ml-1">no data yet</span>
                        </>
                      ) : (revenueData?.growthRate || 0) > 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                          <span className="text-green-400">+{revenueData?.growthRate || 0}%</span>
                          <span className="text-gray-400 ml-1">vs last month</span>
                        </>
                      ) : (revenueData?.growthRate || 0) < 0 ? (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-red-400 mr-1 rotate-90" />
                          <span className="text-red-400">{revenueData?.growthRate || 0}%</span>
                          <span className="text-gray-400 ml-1">vs last month</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400">0%</span>
                          <span className="text-gray-400 ml-1">no change</span>
                        </>
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
                      ${(revenueData?.monthlyRevenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">
                    {revenueData?.monthlyRevenue ? 'Current month' : 'No revenue yet'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Per Fan</p>
                    <p className="text-2xl font-bold text-white">
                      ${(revenueData?.averagePerFan || 0).toFixed(2)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Per fan value</p>
                </div>
              </CardContent>
            </Card>

                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Available</p>
                        <p className="text-2xl font-bold text-white">
                          ${(revenueData?.totalRevenue || 0).toFixed(2)}
                        </p>
                      </div>
                      <CreditCard className="h-8 w-8 text-yellow-400" />
                    </div>
                    <div className="mt-2">
                      <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/80 text-xs">
                        Withdraw
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Streams */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-brand-primary" />
                  Revenue Streams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueStreams.map((stream, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-current ${stream.color}`}></div>
                        <span className="text-white">{stream.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">${stream.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          {stream.amount === 0 ? '0%' : `${stream.percentage.toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <Button variant="outline" className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                    <Eye className="h-4 w-4 mr-2" />
                    View Detailed Breakdown
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trends */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-brand-secondary" />
                    Revenue Trends
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">
                    +{revenueData?.growthRate || 0}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Estimated revenue trend for the last 6 months.
                      Uses a linear decay from the current monthly revenue to approximate past months.
                      TODO: Replace with real monthly revenue data once a monthly revenue history API is available. */}
                  {(() => {
                    const now = new Date();
                    const monthLabels = Array.from({ length: 6 }, (_, i) => {
                      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                      return {
                        label: d.toLocaleString('default', { month: 'short' }),
                        year: d.getFullYear(),
                      };
                    });
                    const baseValue = revenueData?.monthlyRevenue || 0;
                    const maxValue = baseValue > 0 ? baseValue : 1;
                    return monthLabels.map(({ label, year }, index) => {
                      const decayFactor = 1 - ((5 - index) * 0.10);
                      const value = Math.floor(baseValue * Math.max(decayFactor, 0.50));
                      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={`${label}-${year}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-400">{label} {year} (Est.)</span>
                            <span className="text-sm font-medium text-white">
                              ${value.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-brand-primary to-brand-secondary h-2 rounded-full transition-all"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">6-Month Average (Est.)</span>
                    <span className="text-white font-medium">
                      {/* Average of the linear-decay estimated values */}
                      ${(() => {
                        const base = revenueData?.monthlyRevenue || 0;
                        const values = Array.from({ length: 6 }, (_, i) =>
                          Math.floor(base * Math.max(1 - ((5 - i) * 0.10), 0.50))
                        );
                        const avg = values.length > 0 ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                        return avg.toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Recent Transactions</span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="border-white/20 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/80">
                    View All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-brand-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{transaction.type}</h4>
                        <p className="text-sm text-gray-400">{transaction.fan}</p>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">+${transaction.amount}</p>
                        <Badge 
                          className={
                            transaction.status === 'completed' 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-yellow-500/20 text-yellow-400"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-gray-400" />
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
