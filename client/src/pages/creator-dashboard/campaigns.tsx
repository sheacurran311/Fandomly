import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter,
  Target,
  Users,
  Calendar,
  BarChart3,
  Play,
  Pause,
  Edit,
  Trash2,
  TrendingUp,
  Eye
} from "lucide-react";

export default function CreatorCampaigns() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch real campaigns data
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns/creator", user?.creator?.id],
    queryFn: () => fetchApi(`/api/campaigns/creator/${user?.creator?.id}`),
    enabled: !!user?.creator?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access campaigns.</div>
      </div>
    );
  }

  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Megaphone className="mr-3 h-8 w-8 text-brand-primary" />
                Campaign Management
              </h1>
              <p className="text-gray-400">
                Create, manage, and track your fan engagement campaigns.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button 
                className="bg-brand-primary hover:bg-brand-primary/80"
                onClick={() => window.location.href = '/campaign-builder'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{campaigns.length}</div>
                <div className="text-sm text-gray-400">Total Campaigns</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-6 w-6 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {campaigns.filter((c: any) => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-400">Active</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {campaigns.reduce((sum: number, c: any) => sum + (c.totalParticipants || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Total Participants</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {campaigns.reduce((sum: number, c: any) => sum + (c.totalIssued || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Points Issued</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-brand-primary" : "border-white/20 text-gray-300"}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
                className={statusFilter === "active" ? "bg-brand-primary" : "border-white/20 text-gray-300"}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                onClick={() => setStatusFilter("draft")}
                className={statusFilter === "draft" ? "bg-brand-primary" : "border-white/20 text-gray-300"}
              >
                Draft
              </Button>
            </div>
          </div>

          {/* Campaigns List */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Your Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                  <p className="text-gray-300">Loading campaigns...</p>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    {campaigns.length === 0 ? "No Campaigns Yet" : "No Matching Campaigns"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {campaigns.length === 0 
                      ? "Create your first campaign to start engaging with your fans."
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                  <Button 
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    onClick={() => window.location.href = '/campaign-builder'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign: any) => (
                    <div key={campaign.id} className="p-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                            <Badge 
                              className={
                                campaign.status === 'active' ? "bg-green-500/20 text-green-400" :
                                campaign.status === 'draft' ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-gray-500/20 text-gray-400"
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-gray-300 mb-4">{campaign.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Participants:</span>
                              <span className="text-white ml-1">{campaign.totalParticipants || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Points Issued:</span>
                              <span className="text-white ml-1">{campaign.totalIssued || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Start Date:</span>
                              <span className="text-white ml-1">
                                {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">End Date:</span>
                              <span className="text-white ml-1">
                                {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
