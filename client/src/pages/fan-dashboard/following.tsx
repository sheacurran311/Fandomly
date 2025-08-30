import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Heart, 
  Search, 
  Filter,
  Star,
  ExternalLink,
  Plus,
  Users,
  Trophy,
  Calendar,
  MoreVertical
} from "lucide-react";

export default function FanFollowing() {
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
        <div className="text-white">Please connect your wallet to access following.</div>
      </div>
    );
  }

  const followingCreators = [
    {
      id: "1",
      name: "Aerial Ace Athletics",
      category: "Athlete",
      description: "Olympic aerial jumping specialist bringing you behind-the-scenes training content",
      followers: "12.4K",
      programs: 2,
      yourPoints: 4250,
      tier: "Gold",
      joinedDate: "Jan 2024",
      avatar: "AA",
      verified: true,
      recentActivity: "Posted new training video 2 hours ago"
    },
    {
      id: "2", 
      name: "Luna Music",
      category: "Musician",
      description: "Indie pop artist sharing exclusive tracks and concert experiences",
      followers: "8.9K",
      programs: 1,
      yourPoints: 3100,
      tier: "Silver",
      joinedDate: "Feb 2024",
      avatar: "LM",
      verified: true,
      recentActivity: "Released new single yesterday"
    },
    {
      id: "3",
      name: "Tech Creator Hub",
      category: "Creator",
      description: "Developer tutorials, coding challenges, and tech industry insights",
      followers: "15.7K",
      programs: 3,
      yourPoints: 5100,
      tier: "Platinum",
      joinedDate: "Dec 2023",
      avatar: "TC",
      verified: false,
      recentActivity: "Started new coding bootcamp series"
    },
    {
      id: "4",
      name: "Fitness Pro",
      category: "Athlete",
      description: "Personal trainer helping you achieve your fitness goals",
      followers: "6.2K",
      programs: 1,
      yourPoints: 1800,
      tier: "Bronze",
      joinedDate: "Mar 2024",
      avatar: "FP",
      verified: false,
      recentActivity: "Posted workout routine 1 day ago"
    }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "bg-purple-500/20 text-purple-300";
      case "Gold": return "bg-yellow-500/20 text-yellow-300";
      case "Silver": return "bg-gray-400/20 text-gray-300";
      default: return "bg-orange-500/20 text-orange-300";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Athlete": return "text-green-400";
      case "Musician": return "text-purple-400";
      default: return "text-blue-400";
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Following</h1>
              <p className="text-gray-400">
                Manage your followed creators and track your engagement with their programs.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button className="bg-brand-secondary hover:bg-brand-secondary/80">
                <Plus className="h-4 w-4 mr-2" />
                Discover Creators
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{followingCreators.length}</div>
                <div className="text-sm text-gray-400">Following</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {followingCreators.reduce((sum, creator) => sum + creator.programs, 0)}
                </div>
                <div className="text-sm text-gray-400">Active Programs</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {followingCreators.reduce((sum, creator) => sum + creator.yourPoints, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Total Points</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {followingCreators.reduce((sum, creator) => sum + parseFloat(creator.followers.replace('K', '')), 0).toFixed(1)}K
                </div>
                <div className="text-sm text-gray-400">Combined Reach</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search creators..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Following List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {followingCreators.map((creator) => (
              <Card key={creator.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center text-white font-bold">
                        {creator.avatar}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-white text-lg">{creator.name}</CardTitle>
                          {creator.verified && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`text-xs border-transparent ${getCategoryColor(creator.category)}`}>
                            {creator.category}
                          </Badge>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{creator.followers} followers</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-4">{creator.description}</p>
                  
                  <div className="space-y-4">
                    {/* Your Progress */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Your Progress</span>
                        <Badge className={getTierColor(creator.tier)}>
                          {creator.tier}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-brand-secondary">{creator.yourPoints.toLocaleString()} pts</span>
                        <span className="text-sm text-gray-400">{creator.programs} programs</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>

                    {/* Recent Activity */}
                    <div className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                        <span className="text-xs text-gray-400">Recent Activity</span>
                      </div>
                      <p className="text-sm text-gray-300">{creator.recentActivity}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Following since {creator.joinedDate}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/80">
                          View Programs
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Discovery CTA */}
          <Card className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 mt-8">
            <CardContent className="text-center py-8">
              <Plus className="h-16 w-16 text-brand-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Discover More Creators</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Find new creators and athletes to follow. Join their loyalty programs and start earning exclusive rewards.
              </p>
              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}