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
  ArrowUpRight
} from "lucide-react";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

export default function CreatorRevenue() {
  // Mock revenue data - in production this would come from API
  const revenueData = {
    totalRevenue: 24580,
    monthlyRevenue: 3240,
    averagePerFan: 8.64,
    subscriptionRevenue: 18400,
    campaignRevenue: 6180,
    growthRate: 15.3
  };

  const revenueStreams = [
    { name: "Fan Subscriptions", amount: 18400, percentage: 74.9, color: "text-brand-primary" },
    { name: "Campaign Sponsorships", amount: 4200, percentage: 17.1, color: "text-brand-secondary" },
    { name: "Premium Content", amount: 1980, percentage: 8.0, color: "text-yellow-400" }
  ];

  const recentTransactions = [
    { id: "1", type: "Subscription", amount: 120, date: "2024-01-15", fan: "Alex Johnson", status: "completed" },
    { id: "2", type: "Campaign", amount: 450, date: "2024-01-14", fan: "Brand Partnership", status: "completed" },
    { id: "3", type: "Premium", amount: 25, date: "2024-01-14", fan: "Sarah Chen", status: "completed" },
    { id: "4", type: "Subscription", amount: 120, date: "2024-01-13", fan: "Mike Rodriguez", status: "pending" }
  ];

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
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">${revenueData.totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-green-400">+{revenueData.growthRate}%</span>
                  <span className="text-gray-400 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-white">${revenueData.monthlyRevenue.toLocaleString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">On track for $3,800</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Per Fan</p>
                    <p className="text-2xl font-bold text-white">${revenueData.averagePerFan}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Monthly average</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Available</p>
                    <p className="text-2xl font-bold text-white">$2,450</p>
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
