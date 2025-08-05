import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useRBAC, RoleGuard } from "@/hooks/use-rbac";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  Users, 
  Settings, 
  BarChart3, 
  DollarSign, 
  Award,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Crown,
  Star,
  TrendingUp,
  UserCheck,
  Database,
  Lock,
  Activity,
  Globe,
  Zap
} from "lucide-react";
import { Link } from "wouter";

// Admin Dashboard Component
function FandomlyAdminDashboard() {
  const platformStats = {
    totalUsers: 15420,
    totalCreators: 1240,
    totalRevenue: 89500,
    activePrograms: 850,
    monthlyGrowth: 12.5,
    complianceIssues: 3
  };

  return (
    <div className="space-y-8">
      {/* Platform Overview Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{platformStats.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-brand-primary" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400">+{platformStats.monthlyGrowth}%</span>
              <span className="text-gray-400 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Creators</p>
                <p className="text-2xl font-bold text-white">{platformStats.totalCreators.toLocaleString()}</p>
              </div>
              <Award className="h-8 w-8 text-brand-secondary" />
            </div>
            <div className="mt-2">
              <Progress value={75} className="h-2" />
              <p className="text-xs text-gray-400 mt-1">75% verified</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Platform Revenue</p>
                <p className="text-2xl font-bold text-white">${platformStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-400">+23.1%</span>
              <span className="text-gray-400 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Compliance Issues</p>
                <p className="text-2xl font-bold text-white">{platformStats.complianceIssues}</p>
              </div>
              {platformStats.complianceIssues > 0 ? (
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-400" />
              )}
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">Requires attention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-brand-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">User Management</h3>
                <p className="text-sm text-gray-400">Manage all platform users and roles</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-brand-primary hover:bg-brand-primary/80">
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-brand-secondary/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-brand-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Analytics</h3>
                <p className="text-sm text-gray-400">View platform-wide analytics</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-brand-secondary hover:bg-brand-secondary/80">
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-purple-500/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Platform Settings</h3>
                <p className="text-sm text-gray-400">Configure global settings</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-purple-500 hover:bg-purple-500/80">
              Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Customer Admin Dashboard Component
function CustomerAdminDashboard() {
  const { userRole, isNILAthlete } = useRBAC();
  
  const creatorStats = {
    totalFans: 8750,
    activePrograms: 3,
    monthlyRevenue: 12400,
    engagementRate: 4.2,
    complianceScore: 98
  };

  return (
    <div className="space-y-8">
      {/* Creator/Athlete Profile Header */}
      <Card className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-brand-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isNILAthlete() && userRole?.customerAdminData?.nilAthleteData
                    ? `${userRole.customerAdminData.nilAthleteData.sport} Athlete`
                    : "Creator Account"}
                </h2>
                <p className="text-gray-300">
                  {isNILAthlete() && userRole?.customerAdminData?.nilAthleteData
                    ? `${userRole.customerAdminData.nilAthleteData.school} • ${userRole.customerAdminData.nilAthleteData.division}`
                    : "Premium Creator Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="h-4 w-4 mr-1" />
                Verified
              </Badge>
              {isNILAthlete() && (
                <Badge className="bg-brand-primary/20 text-brand-primary">
                  NIL Compliant
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creator Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-brand-primary" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{creatorStats.totalFans.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Total Fans</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-brand-secondary" />
            </div>
            <div className="text-2xl font-bold text-white">{creatorStats.activePrograms}</div>
            <p className="text-xs text-gray-400">Active Programs</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">${creatorStats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Monthly Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{creatorStats.engagementRate}%</div>
            <p className="text-xs text-gray-400">Engagement Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{creatorStats.complianceScore}%</div>
            <p className="text-xs text-gray-400">Compliance Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/creator-dashboard">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-6 text-center">
              <Award className="h-12 w-12 text-brand-primary mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Loyalty Programs</h3>
              <p className="text-sm text-gray-400">Manage your programs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/nil-dashboard">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-colors cursor-pointer">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-brand-secondary mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">NIL Dashboard</h3>
              <p className="text-sm text-gray-400">Compliance & earnings</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-green-500/50 transition-colors cursor-pointer">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">Analytics</h3>
            <p className="text-sm text-gray-400">Performance insights</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-purple-500/50 transition-colors cursor-pointer">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">Payouts</h3>
            <p className="text-sm text-gray-400">Manage earnings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Customer End User Dashboard Component  
function CustomerEndUserDashboard() {
  const { userRole } = useRBAC();
  
  const fanStats = {
    totalPoints: 2450,
    programsJoined: 5,
    rewardsEarned: 12,
    currentTier: userRole?.customerTier || 'basic',
    nextTierProgress: 68
  };

  const tierColors = {
    basic: 'text-gray-400',
    premium: 'text-brand-primary', 
    vip: 'text-yellow-400'
  };

  return (
    <div className="space-y-8">
      {/* Fan Profile Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Fan Dashboard</h2>
                <p className="text-gray-300">Track your loyalty journey across all programs</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${tierColors[fanStats.currentTier]} bg-current/20`}>
                <Crown className="h-4 w-4 mr-1" />
                {fanStats.currentTier.toUpperCase()} Tier
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fan Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Points</p>
                <p className="text-2xl font-bold text-white">{fanStats.totalPoints.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Programs Joined</p>
                <p className="text-2xl font-bold text-white">{fanStats.programsJoined}</p>
              </div>
              <Users className="h-8 w-8 text-brand-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Rewards Earned</p>
                <p className="text-2xl font-bold text-white">{fanStats.rewardsEarned}</p>
              </div>
              <Award className="h-8 w-8 text-brand-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">Next Tier Progress</p>
              <Progress value={fanStats.nextTierProgress} className="h-3 mb-2" />
              <p className="text-xs text-gray-400">{fanStats.nextTierProgress}% to {fanStats.currentTier === 'basic' ? 'Premium' : 'VIP'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Upgrade Options */}
      <RoleGuard allowedRoles={['customer_end_user']} minTier="basic">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Upgrade Your Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {fanStats.currentTier === 'basic' && (
                <Card className="bg-brand-primary/10 border-brand-primary/30">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Star className="h-12 w-12 text-brand-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Premium Tier</h3>
                      <p className="text-2xl font-bold text-brand-primary mb-4">$9.99/month</p>
                      <ul className="text-sm text-gray-300 space-y-2 mb-6">
                        <li>• 2x points on all activities</li>
                        <li>• Exclusive premium rewards</li>
                        <li>• Early access to new programs</li>
                        <li>• Priority customer support</li>
                      </ul>
                      <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                        Upgrade to Premium
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(fanStats.currentTier === 'basic' || fanStats.currentTier === 'premium') && (
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Crown className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">VIP Tier</h3>
                      <p className="text-2xl font-bold text-yellow-400 mb-4">$29.99/month</p>
                      <ul className="text-sm text-gray-300 space-y-2 mb-6">
                        <li>• 5x points on all activities</li>
                        <li>• Exclusive VIP-only rewards & NFTs</li>
                        <li>• Direct creator interactions</li>
                        <li>• VIP events and experiences</li>
                        <li>• API access for developers</li>
                      </ul>
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-500/80 text-black">
                        Upgrade to VIP
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  );
}

// Main RBAC Dashboard Component
export default function RBACDashboard() {
  const { userRole, isLoading, isFandomlyAdmin, isCustomerAdmin, isCustomerEndUser } = useRBAC();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
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
                Please connect your wallet to access your dashboard.
              </AlertDescription>
            </Alert>
            <Link href="/auth">
              <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                Connect Wallet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark-purple to-brand-dark-bg border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {isFandomlyAdmin() ? 'Platform Admin Dashboard' :
                 isCustomerAdmin() ? 'Creator Dashboard' : 
                 'Fan Dashboard'}
              </h1>
              <p className="text-gray-300">
                {isFandomlyAdmin() ? 'Manage the entire Fandomly platform' :
                 isCustomerAdmin() ? 'Manage your loyalty programs and fan engagement' :
                 'Track your loyalty journey and earn rewards'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={
                isFandomlyAdmin() ? "bg-purple-500/20 text-purple-400" :
                isCustomerAdmin() ? "bg-brand-primary/20 text-brand-primary" :
                "bg-brand-secondary/20 text-brand-secondary"
              }>
                <Shield className="h-4 w-4 mr-1" />
                {userRole.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role-Specific Dashboard Content */}
        <RoleGuard allowedRoles={['fandomly_admin']}>
          <FandomlyAdminDashboard />
        </RoleGuard>

        <RoleGuard allowedRoles={['customer_admin']}>
          <CustomerAdminDashboard />
        </RoleGuard>

        <RoleGuard allowedRoles={['customer_end_user']}>
          <CustomerEndUserDashboard />
        </RoleGuard>
      </div>
    </div>
  );
}