import { AdminLayout } from "@/components/admin/AdminLayout";
import { VerificationAnalyticsDashboard } from "@/components/analytics/VerificationAnalyticsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAnalytics() {
  return (
    <AdminLayout
      title="Analytics & Insights"
      description="Platform-wide analytics dashboard"
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Analytics Dashboard</CardTitle>
              <CardDescription className="text-gray-400">
                Analytics dashboard coming soon — currently being rebuilt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-gray-300">
                  <strong className="text-white">Coming Soon:</strong> The analytics dashboard is
                  currently being rebuilt with new data sources.
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
                  Google Analytics Integration
                </h3>
                <p className="text-gray-400 mb-4">
                  Track page views, traffic sources, and user behavior across the platform.
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>Real-time visitor tracking</li>
                  <li>Traffic source attribution</li>
                  <li>Page-level analytics</li>
                  <li>Conversion funnel tracking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
