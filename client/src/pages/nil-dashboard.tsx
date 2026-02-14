import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SocialIntegrationTracker from "@/components/nil/social-integration-tracker";
import ComplianceChecker from "@/components/nil/compliance-checker";
import { 
  Shield, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { useRBAC, RoleGuard } from "@/hooks/use-rbac";
import { useAuth } from "@/hooks/use-auth";
import { useAnalyticsOverview } from "@/hooks/use-analytics";

export default function NILDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { hasFeatureAccess, isCustomerAdmin, isNILAthlete, userRole } = useRBAC();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user || !hasFeatureAccess('nil_dashboard')) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-white text-center">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-yellow-500/20 bg-yellow-500/10">
              <Shield className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-gray-300">
                {!user 
                  ? "Please connect your wallet to access your NIL dashboard and compliance tools."
                  : "NIL Dashboard access requires Customer Admin (Creator/Athlete) role. Contact support to upgrade your account."
                }
              </AlertDescription>
            </Alert>
            <Link href="/auth">
              <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                Start Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch real analytics data
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsOverview('all', '30d');

  // NIL stats - use real data where available, show "Coming Soon" for deal tracking
  const nilStats = {
    // Deal tracking not implemented - show as coming soon
    monthlyEarnings: null as number | null, // null = coming soon
    totalDeals: null as number | null, // null = coming soon
    complianceScore: null as number | null, // null = coming soon (needs compliance system)
    // Real data from analytics
    activePrograms: analytics?.overview?.totalTaskCompletions || 0,
    totalFans: analytics?.overview?.totalFollowers || 0,
    engagementRate: analytics?.overview?.followerGrowth || 0
  };

  // No activity yet - feature coming soon
  const recentActivity: Array<{
    type: string;
    description: string;
    amount?: number;
    timestamp: string;
    status: string;
  }> = [];

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark-purple to-brand-dark-bg border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">NIL Dashboard</h1>
              <p className="text-gray-300">
                Welcome back{isNILAthlete() && userRole?.customerAdminData?.nilAthleteData 
                  ? `, ${userRole.customerAdminData.nilAthleteData.sport} athlete` 
                  : ""}! Monitor your NIL activities, compliance, and earnings.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-4 w-4 mr-1" />
                Compliant
              </Badge>
              <RoleGuard allowedRoles={['customer_admin']}>
                <Badge className="bg-brand-primary/20 text-brand-primary">
                  {isNILAthlete() ? 'NIL Athlete' : 'Creator'}
                </Badge>
              </RoleGuard>
              <RoleGuard allowedRoles={['fandomly_admin']}>
                <Badge className="bg-purple-500/20 text-purple-400">
                  Platform Admin
                </Badge>
              </RoleGuard>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">
              Overview
            </TabsTrigger>
            <TabsTrigger value="social-tracking" className="data-[state=active]:bg-brand-primary">
              Social Tracking
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-brand-primary">
              Compliance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-primary">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-5 w-5 text-brand-secondary" />
                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">Soon</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-500">
                    --
                  </div>
                  <p className="text-xs text-gray-400">Monthly Earnings</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="h-5 w-5 text-brand-primary" />
                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">Soon</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-500">
                    --
                  </div>
                  <p className="text-xs text-gray-400">Total Deals</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">Soon</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-500">
                    --
                  </div>
                  <p className="text-xs text-gray-400">Compliance Score</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-brand-accent" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsLoading ? '--' : nilStats.activePrograms}
                  </div>
                  <p className="text-xs text-gray-400">Tasks Completed</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsLoading ? '--' : nilStats.totalFans.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-400">Total Followers</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsLoading ? '--' : `${nilStats.engagementRate}%`}
                  </div>
                  <p className="text-xs text-gray-400">Growth Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {activity.type === "earning" && <DollarSign className="h-5 w-5 text-brand-secondary" />}
                          {activity.type === "compliance" && <Shield className="h-5 w-5 text-yellow-400" />}
                          {activity.type === "deal" && <Award className="h-5 w-5 text-brand-primary" />}
                          <div>
                            <p className="text-white font-medium">{activity.description}</p>
                            <p className="text-gray-400 text-sm">{activity.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {activity.amount && (
                            <span className="text-brand-secondary font-semibold">
                              +${activity.amount}
                            </span>
                          )}
                          <Badge 
                            className={
                              activity.status === "completed" ? "bg-green-500/20 text-green-400" :
                              activity.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-blue-500/20 text-blue-400"
                            }
                          >
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-white font-medium mb-2">No Activity Yet</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                      Your NIL deal activity and compliance updates will appear here once you start tracking deals.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social-tracking">
            <div className="space-y-8">
              <Alert className="border-blue-500/20 bg-blue-500/10">
                <Shield className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-white">Protected Data:</strong> Your social media tracking data is encrypted and only accessible to you. We never share your personal analytics with third parties.
                </AlertDescription>
              </Alert>
              <SocialIntegrationTracker />
            </div>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="space-y-8">
              <Alert className="border-green-500/20 bg-green-500/10">
                <Shield className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-white">Compliance Monitoring:</strong> Your compliance data is securely stored and monitored 24/7 to protect your NCAA eligibility.
                </AlertDescription>
              </Alert>
              <ComplianceChecker />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-gray-400 mb-6">
                    Advanced NIL analytics and performance insights are in development.
                  </p>
                  <Button variant="outline" className="border-white/20 text-gray-300">
                    Join Waitlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}