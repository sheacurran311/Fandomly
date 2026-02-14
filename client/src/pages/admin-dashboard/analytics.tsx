import { AdminLayout } from "@/components/admin/AdminLayout";
import { VerificationAnalyticsDashboard } from "@/components/analytics/VerificationAnalyticsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Wallet, Activity, ExternalLink, AlertCircle, CheckCircle2, BarChart3, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { 
  useDynamicWalletAnalytics,
  useDynamicVisitAnalytics,
  useDynamicOverviewAnalytics,
  useDynamicEngagementAnalytics,
  useDynamicToplineAnalytics,
  useDynamicWalletBreakdown,
  useDynamicUsers,
} from "@/hooks/useDynamicAnalytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';

// Helper to safely extract data from API response
function safeGet(obj: any, path: string, defaultValue: any = '--') {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    return result ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to format numbers
function formatNumber(value: any): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value).toLocaleString();
  }
  return '--';
}

export default function AdminAnalytics() {
  const { user, isLoading: isUserLoading } = useAuth();
  
  // Only fetch analytics when user is loaded and is admin
  const shouldFetchAnalytics = !isUserLoading && user?.role === 'fandomly_admin';
  
  // Fetch Dynamic Analytics data
  const walletAnalytics = useDynamicWalletAnalytics(shouldFetchAnalytics);
  const visitAnalytics = useDynamicVisitAnalytics(shouldFetchAnalytics);
  const overviewAnalytics = useDynamicOverviewAnalytics(shouldFetchAnalytics);
  const engagementAnalytics = useDynamicEngagementAnalytics(shouldFetchAnalytics);
  const toplineAnalytics = useDynamicToplineAnalytics(shouldFetchAnalytics);
  const walletBreakdown = useDynamicWalletBreakdown(shouldFetchAnalytics);
  const dynamicUsers = useDynamicUsers(shouldFetchAnalytics);

  // Check if Dynamic is configured
  const isDynamicConfigured = walletAnalytics.data?.configured ?? false;
  const isLoading = isUserLoading || walletAnalytics.isLoading || visitAnalytics.isLoading;

  // Extract API response data
  const walletData = walletAnalytics.data?.data;
  const visitData = visitAnalytics.data?.data;
  const overviewData = overviewAnalytics.data?.data;
  const engagementData = engagementAnalytics.data?.data;
  const toplineData = toplineAnalytics.data?.data;
  const breakdownData = walletBreakdown.data?.data;
  const usersData = dynamicUsers.data?.data;

  console.log('📊 Dynamic Analytics Data:', {
    wallet: walletData,
    visit: visitData,
    overview: overviewData,
    engagement: engagementData,
    topline: toplineData,
    breakdown: breakdownData,
    users: usersData,
  });

  return (
    <AdminLayout
      title="Analytics & Insights"
      description="Platform-wide analytics powered by Dynamic and Google Analytics"
    >
      {/* Configuration Status */}
      {!isDynamicConfigured && !isLoading && (
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-400">Dynamic Analytics Not Configured</AlertTitle>
          <AlertDescription className="text-gray-300">
            Add <code className="bg-white/10 px-2 py-1 rounded">DYNAMIC_ENVIRONMENT_ID</code> and{' '}
            <code className="bg-white/10 px-2 py-1 rounded">DYNAMIC_API_TOKEN</code> to your .env file to enable real-time analytics.
          </AlertDescription>
        </Alert>
      )}

      {isDynamicConfigured && !isLoading && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-400">Dynamic Analytics Connected</AlertTitle>
          <AlertDescription className="text-gray-300">
            Live data from Dynamic is being displayed below.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Users/Visitors */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-brand-primary" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-2xl font-bold text-white animate-pulse">...</div>
                ) : isDynamicConfigured ? (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatNumber(
                        usersData?.users?.length || 
                        usersData?.count ||
                        overviewData?.totalUsers ||
                        toplineData?.totalUsers ||
                        visitData?.totalVisitors ||
                        0
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      From Dynamic Analytics
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">--</div>
                    <p className="text-xs text-gray-400 mt-1">Configure Dynamic</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Wallet Connections */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Wallet Connections
                </CardTitle>
                <Wallet className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-2xl font-bold text-white animate-pulse">...</div>
                ) : isDynamicConfigured ? (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatNumber(
                        walletData?.reduce((sum: number, w: { walletName: string; count: number }) => sum + w.count, 0) || 0
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {walletData?.map((wallet: { walletName: string; count: number }) => (
                        <span
                          key={wallet.walletName}
                          className={`text-xs px-2 py-1 rounded-full ${
                            wallet.walletName.includes('phantom') 
                              ? 'bg-purple-500/20 text-purple-300'
                              : wallet.walletName.includes('metamask')
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {wallet.walletName} ({wallet.count})
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">--</div>
                    <p className="text-xs text-gray-400 mt-1">Configure Dynamic</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Unique Visits */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Unique Visits
                </CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-2xl font-bold text-white animate-pulse">...</div>
                ) : isDynamicConfigured ? (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatNumber(visitData?.summedTotalUniqueCount || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        {formatNumber(visitData?.summedSessionsCount || 0)} total sessions
                      </p>
                      <span className="text-xs text-gray-600">•</span>
                      <p className="text-xs text-gray-400">
                        {formatNumber(visitData?.users?.totalUnique || 0)} unique users
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">--</div>
                    <p className="text-xs text-gray-400 mt-1">Configure Dynamic</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Active Sessions/Engagement */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Engagement
                </CardTitle>
                <Activity className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-2xl font-bold text-white animate-pulse">...</div>
                ) : isDynamicConfigured ? (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {formatNumber(
                        engagementData?.activeSessions ||
                        engagementData?.sessions ||
                        engagementData?.total ||
                        0
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Active sessions
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">--</div>
                    <p className="text-xs text-gray-400 mt-1">Configure Dynamic</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Wallet Distribution Chart */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Wallet Distribution</CardTitle>
                  <CardDescription className="text-gray-400">
                    Connected wallets by type
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {walletData?.length ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={walletData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis
                        dataKey="walletName"
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff10',
                          border: '1px solid #ffffff20',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Bar dataKey="count" name="Connected Wallets" fill="#3b82f6">
                        {walletData.map((entry: { walletName: string; count: number }, index: number) => (
                          <Cell
                            key={index}
                            fill={
                              entry.walletName.includes('phantom') ? '#9333ea' :
                              entry.walletName.includes('metamask') ? '#f97316' : '#3b82f6'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No wallet data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit Analytics Chart */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Visit Analytics</CardTitle>
                  <CardDescription className="text-gray-400">
                    Daily sessions and unique visitors
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {visitData?.users?.sessions ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={visitData.users.sessions}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <defs>
                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff10',
                          border: '1px solid #ffffff20',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      />
                      <Legend
                        wrapperStyle={{
                          color: '#ffffff80',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Total Sessions"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorSessions)"
                      />
                      <Area
                        type="monotone"
                        dataKey="uniqueUsers"
                        name="Unique Users"
                        stroke="#22c55e"
                        fillOpacity={1}
                        fill="url(#colorUnique)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No visit data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw Dynamic Data (for debugging) */}
          {isDynamicConfigured && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Dynamic API Response Data</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-white/20"
                    onClick={() => {
                      console.log('📊 Complete Dynamic Analytics:', {
                        wallet: walletData,
                        visit: visitData,
                        overview: overviewData,
                        engagement: engagementData,
                        topline: toplineData,
                        breakdown: breakdownData,
                        users: usersData,
                      });
                    }}
                  >
                    Log to Console
                  </Button>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Raw data from Dynamic Analytics API (for development)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Overview Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <h4 className="font-medium text-white">Overview</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(overviewData, null, 2)}
                    </pre>
                  </div>

                  {/* Wallet Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-green-400" />
                      <h4 className="font-medium text-white">Wallet Analytics</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(walletData, null, 2)}
                    </pre>
                  </div>

                  {/* Visit Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-400" />
                      <h4 className="font-medium text-white">Visit Analytics</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(visitData, null, 2)}
                    </pre>
                  </div>

                  {/* Engagement Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      <h4 className="font-medium text-white">Engagement</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(engagementData, null, 2)}
                    </pre>
                  </div>

                  {/* Topline Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-yellow-400" />
                      <h4 className="font-medium text-white">Topline Metrics</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(toplineData, null, 2)}
                    </pre>
                  </div>

                  {/* Users Data */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-brand-primary" />
                      <h4 className="font-medium text-white">Users ({usersData?.users?.length || 0})</h4>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-[200px]">
                      {JSON.stringify(usersData, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Wallet Analytics</CardTitle>
                  <CardDescription className="text-gray-400">
                    Powered by Dynamic Analytics API
                  </CardDescription>
                </div>
                <Button variant="outline" className="border-white/20" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Dynamic Docs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    🔌 Ready to Integrate
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Connect to Dynamic's powerful analytics endpoints:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• <code className="bg-white/10 px-2 py-1 rounded">GET /analytics/wallets</code> - Wallet connection data</li>
                    <li>• <code className="bg-white/10 px-2 py-1 rounded">GET /analytics/visits</code> - Visit tracking</li>
                    <li>• <code className="bg-white/10 px-2 py-1 rounded">GET /analytics/overview</code> - Overview metrics</li>
                    <li>• <code className="bg-white/10 px-2 py-1 rounded">GET /analytics/engagement</code> - Engagement data</li>
                  </ul>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-400">
                        Wallet Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">--</div>
                      <p className="text-xs text-gray-400 mt-1">Breakdown coming</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-400">
                        Chain Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">--</div>
                      <p className="text-xs text-gray-400 mt-1">By network</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-400">
                        Connection Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">--%</div>
                      <p className="text-xs text-gray-400 mt-1">Success rate</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">User Engagement</CardTitle>
              <CardDescription className="text-gray-400">
                Track how users interact with the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Avg. Session Time</div>
                  <div className="text-3xl font-bold text-white">-- min</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Daily Active Users</div>
                  <div className="text-3xl font-bold text-white">--</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Bounce Rate</div>
                  <div className="text-3xl font-bold text-white">--%</div>
                </div>
              </div>

              <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-gray-300">
                  <strong className="text-white">Coming Soon:</strong> Detailed engagement metrics 
                  via Dynamic Analytics API and Google Analytics integration.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <VerificationAnalyticsDashboard />
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Traffic Sources</CardTitle>
                  <CardDescription className="text-gray-400">
                    Powered by Google Analytics
                  </CardDescription>
                </div>
                <Button variant="outline" className="border-white/20" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Setup GA4
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">
                  📊 Google Analytics Integration
                </h3>
                <p className="text-gray-400 mb-4">
                  Track page views, traffic sources, and user behavior across the platform.
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Real-time visitor tracking</li>
                  <li>• Traffic source attribution</li>
                  <li>• Page-level analytics</li>
                  <li>• Conversion funnel tracking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

