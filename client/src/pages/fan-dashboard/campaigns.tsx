import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  Clock, 
  Target, 
  Search,
  Filter,
  Star,
  Users,
  Calendar,
  ArrowRight
} from "lucide-react";

export default function FanCampaigns() {
  const { user, isLoading, isAuthenticated } = useAuth();

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

  const joinedCampaigns = [
    {
      id: "1",
      title: "Follow for Points",
      creator: "Aerial Ace Athletics",
      description: "Follow our social media accounts to earn points",
      points: 500,
      progress: 75,
      deadline: "3 days left",
      category: "Social",
      status: "active"
    },
    {
      id: "2", 
      title: "Stream & Earn",
      creator: "Luna Music",
      description: "Listen to our latest album on Spotify",
      points: 1000,
      progress: 45,
      deadline: "1 week left", 
      category: "Music",
      status: "active"
    },
    {
      id: "3",
      title: "Referral Bonus",
      creator: "Tech Creator Hub",
      description: "Refer friends to join the loyalty program",
      points: 2000,
      progress: 20,
      deadline: "2 weeks left",
      category: "Referral", 
      status: "active"
    }
  ];

  const allCampaigns = [
    ...joinedCampaigns,
    {
      id: "4",
      title: "Welcome Bonus",
      creator: "Fitness Pro",
      description: "Join our community and get instant rewards",
      points: 300,
      progress: 0,
      deadline: "No deadline",
      category: "Welcome",
      status: "available"
    },
    {
      id: "5",
      title: "Birthday Celebration",
      creator: "Gaming Legends",
      description: "Celebrate with us and earn special birthday points",
      points: 750,
      progress: 0,
      deadline: "5 days left",
      category: "Event",
      status: "available"
    },
    {
      id: "6",
      title: "VIP Challenge",
      creator: "Art Collective",
      description: "Complete art challenges to unlock VIP status",
      points: 1500,
      progress: 0,
      deadline: "1 month left",
      category: "Challenge",
      status: "available"
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
            <p className="text-gray-400">
              Join campaigns from your favorite creators and earn amazing rewards.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="joined" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="joined" className="data-[state=active]:bg-brand-primary">
                <Trophy className="h-4 w-4 mr-2" />
                My Campaigns ({joinedCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-brand-primary">
                <Target className="h-4 w-4 mr-2" />
                All Campaigns ({allCampaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="joined" className="space-y-6">
              {joinedCampaigns.length === 0 ? (
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardContent className="text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Campaigns</h3>
                    <p className="text-gray-400 mb-6">
                      You haven't joined any campaigns yet. Explore available campaigns to start earning rewards.
                    </p>
                    <Button className="bg-brand-primary hover:bg-brand-primary/80">
                      Browse Campaigns
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {joinedCampaigns.map((campaign) => (
                    <Card key={campaign.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white text-lg mb-1">{campaign.title}</CardTitle>
                            <p className="text-sm text-gray-400">by {campaign.creator}</p>
                          </div>
                          <Badge variant="outline" className="border-brand-primary/30 text-brand-primary">
                            {campaign.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 mb-4">{campaign.description}</p>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Star className="h-4 w-4 text-brand-secondary" />
                              <span className="text-brand-secondary font-medium">{campaign.points} points</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-400">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">{campaign.deadline}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Progress</span>
                              <span className="text-white">{campaign.progress}%</span>
                            </div>
                            <Progress value={campaign.progress} className="h-2" />
                          </div>
                          
                          <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                            Continue Campaign
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {allCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-1">{campaign.title}</CardTitle>
                          <p className="text-sm text-gray-400">by {campaign.creator}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant="outline" className="border-brand-primary/30 text-brand-primary">
                            {campaign.category}
                          </Badge>
                          {campaign.status === "active" && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Joined
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 mb-4">{campaign.description}</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-brand-secondary" />
                            <span className="text-brand-secondary font-medium">{campaign.points} points</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{campaign.deadline}</span>
                          </div>
                        </div>
                        
                        {campaign.status === "active" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Progress</span>
                              <span className="text-white">{campaign.progress}%</span>
                            </div>
                            <Progress value={campaign.progress} className="h-2" />
                          </div>
                        )}
                        
                        <Button 
                          className={`w-full ${
                            campaign.status === "active" 
                              ? "bg-brand-primary hover:bg-brand-primary/80" 
                              : "bg-brand-secondary hover:bg-brand-secondary/80"
                          }`}
                        >
                          {campaign.status === "active" ? "Continue" : "Join Campaign"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}