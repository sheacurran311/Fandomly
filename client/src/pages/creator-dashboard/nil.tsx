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
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

export default function CreatorNIL() {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock NIL data - in production this would come from API
  const nilData = {
    totalEarnings: 15420,
    monthlyEarnings: 2340,
    complianceScore: 98,
    activeDealCount: 5,
    pendingDealCount: 2,
    dealValue: 45000
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Shield className="mr-3 h-8 w-8 text-brand-primary" />
              NIL Dashboard
            </h1>
            <p className="text-gray-400">
              Manage your Name, Image, and Likeness opportunities with full compliance tracking.
            </p>
          </div>

          {/* NIL Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total NIL Earnings</p>
                    <p className="text-2xl font-bold text-white">${nilData.totalEarnings.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-green-400">+23.1%</span>
                  <span className="text-gray-400 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Deals</p>
                    <p className="text-2xl font-bold text-white">{nilData.activeDealCount}</p>
                  </div>
                  <Award className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-yellow-500/20 text-yellow-400">
                    {nilData.pendingDealCount} pending
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Compliance Score</p>
                    <p className="text-2xl font-bold text-green-400">{nilData.complianceScore}%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Compliant
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Deal Value</p>
                    <p className="text-2xl font-bold text-white">${nilData.dealValue.toLocaleString()}</p>
                  </div>
                  <Target className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Potential earnings</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NIL Management Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Recent NIL Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div>
                          <p className="text-green-400 font-medium">Deal Completed</p>
                          <p className="text-sm text-gray-300">SportsBrand Partnership</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">+$2,500</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div>
                          <p className="text-blue-400 font-medium">New Opportunity</p>
                          <p className="text-sm text-gray-300">Local Restaurant Chain</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400">Review</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div>
                          <p className="text-yellow-400 font-medium">Compliance Check</p>
                          <p className="text-sm text-gray-300">Quarterly Review Due</p>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400">Action Required</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Compliance Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComplianceChecker />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="deals" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Active NIL Deals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">NIL Deal Management</h3>
                    <p className="text-gray-400 mb-4">Track and manage your active NIL opportunities</p>
                    <Button className="bg-brand-primary hover:bg-brand-primary/80">
                      View All Deals
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <Alert className="border-green-500/20 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-green-400">Compliance Status: Good</strong><br />
                  All NIL activities are properly documented and compliant with NCAA regulations.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Compliance Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComplianceChecker />
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Social Media Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SocialIntegrationTracker />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">NIL Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Analytics Dashboard</h3>
                    <p className="text-gray-400 mb-4">Detailed NIL performance metrics will appear here</p>
                    <Button variant="outline" className="border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/10">
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
