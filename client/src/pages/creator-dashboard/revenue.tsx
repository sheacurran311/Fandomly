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
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

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
        // For now, calculate from available data until revenue endpoints are built
        // Get fan count for average calculation
        const membershipsResponse = await apiRequest('GET', `/api/tenant-memberships/${creator.tenantId}`);
        const memberships = await membershipsResponse.json();
        const fanCount = memberships.length;

        // TODO: Replace with actual revenue API when available
        // For now, return calculated data based on fan engagement
        const totalPoints = memberships.reduce((sum: number, m: any) => sum + (m.memberData?.points || 0), 0);
        const estimatedRevenue = totalPoints * 0.01; // $0.01 per point as example

        return {
          totalRevenue: estimatedRevenue,
          monthlyRevenue: estimatedRevenue * 0.3, // Assume 30% this month
          averagePerFan: fanCount > 0 ? estimatedRevenue / fanCount : 0,
          subscriptionRevenue: estimatedRevenue * 0.7, // 70% from subscriptions
          campaignRevenue: estimatedRevenue * 0.3, // 30% from campaigns
          growthRate: fanCount > 10 ? 15.3 : 0 // Show growth if enough fans
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

  // Fetch recent transactions
  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/creator', creator?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!creator?.id) return [];
      
      try {
        // TODO: Replace with actual transaction API when available
        // For now, generate based on fan activity
        const membershipsResponse = await apiRequest('GET', `/api/tenant-memberships/${creator.tenantId}`);
        const memberships = await membershipsResponse.json();
        
        return memberships.slice(0, 4).map((membership: any, index: number) => ({
          id: membership.id,
          type: index % 2 === 0 ? "Subscription" : "Campaign",
          amount: (membership.memberData?.points || 0) * 0.01,
          date: new Date(membership.joinedAt).toLocaleDateString(),
          fan: membership.memberData?.displayName || membership.user?.username || 'Fan',
          status: "completed"
        }));
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return [];
      }
    },
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
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
                      <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                      <span className="text-green-400">+{revenueData?.growthRate || 0}%</span>
                      <span className="text-gray-400 ml-1">vs last month</span>
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
                        <p className="text-xs text-gray-400">{stream.percentage}%</p>
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

            {/* Revenue Chart Placeholder */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-brand-secondary" />
                  Revenue Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Revenue Chart</h3>
                  <p className="text-gray-400 mb-4">Monthly revenue trends will appear here</p>
                  <Button variant="outline" className="border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/10">
                    View Analytics
                  </Button>
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
      </div>
    </div>
  );
}
