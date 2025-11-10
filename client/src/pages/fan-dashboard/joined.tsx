import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { transformImageUrl } from "@/lib/image-utils";
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
  MoreVertical,
  Target
} from "lucide-react";

export default function FanJoined() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's fan programs (programs they've joined)
  const { data: fanPrograms = [], isLoading: programsLoading } = useQuery({
    queryKey: ["/api/fan-programs/user", (user as any)?.id],
    queryFn: async () => {
      if (!(user as any)?.id) return [];
      const response = await apiRequest("GET", `/api/fan-programs/user/${(user as any).id}`);
      return await response.json();
    },
    enabled: !!user && !!isAuthenticated,
  });

  // Fetch creators for each program
  const { data: creatorsData = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["/api/creators/following", fanPrograms],
    queryFn: async () => {
      if (!fanPrograms || fanPrograms.length === 0) return [];
      
      // Get unique creator IDs from programs
      const creatorIds = [...new Set(fanPrograms.map((fp: any) => fp.creatorId))].filter(Boolean);
      
      if (creatorIds.length === 0) return [];
      
      // Fetch creator data for each
      const creators = await Promise.all(
        creatorIds.map(async (creatorId) => {
          try {
            const response = await apiRequest("GET", `/api/creators/${creatorId}`);
            const creator = await response.json();
            
            // Get fan program details for this creator
            const userPrograms = fanPrograms.filter((fp: any) => fp.creatorId === creatorId);
            const totalPoints = userPrograms.reduce((sum: number, fp: any) => sum + (fp.totalPoints || 0), 0);
            const joinedDate = userPrograms[0]?.joinedAt ? new Date(userPrograms[0].joinedAt) : new Date();
            
            return {
              ...creator,
              programs: userPrograms.length,
              yourPoints: totalPoints,
              joinedDate: joinedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              userPrograms,
            };
          } catch (error) {
            console.error(`Error fetching creator ${creatorId}:`, error);
            return null;
          }
        })
      );
      
      return creators.filter(Boolean);
    },
    enabled: !!fanPrograms && fanPrograms.length > 0,
  });

  // Fetch tasks for each creator to show recent activity
  const { data: tasksData = [] } = useQuery({
    queryKey: ["/api/tasks/following", creatorsData],
    queryFn: async () => {
      if (!creatorsData || creatorsData.length === 0) return [];
      
      const tasks = await Promise.all(
        creatorsData.map(async (creator: any) => {
          try {
            const response = await apiRequest("GET", `/api/tasks/creator/${creator.id}`);
            return await response.json();
          } catch (error) {
            return [];
          }
        })
      );
      
      return tasks.flat();
    },
    enabled: creatorsData.length > 0,
  });

  if (isLoading || programsLoading || creatorsLoading) {
    return (
      <DashboardLayout userType="fan">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your creators...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <DashboardLayout userType="fan">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-white">Please connect your wallet to access following.</div>
        </div>
      </DashboardLayout>
    );
  }

  const followingCreators = creatorsData;

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
    <DashboardLayout userType="fan">
      <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Creators</h1>
              <p className="text-gray-400">
                Manage your creators and track your engagement with their programs.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Link href="/find-creators">
                <Button className="bg-brand-secondary hover:bg-brand-secondary/80">
                  <Plus className="h-4 w-4 mr-2" />
                  Discover Creators
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{followingCreators.length}</div>
                <div className="text-sm text-gray-400">Creators Joined</div>
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
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Following List */}
          {followingCreators.length === 0 ? (
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="py-12 text-center">
                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Creators Yet</h3>
                <p className="text-gray-400 mb-6">
                  You haven't joined any creator programs yet. Discover amazing creators and start earning rewards!
                </p>
                <Link href="/find-creators">
                  <Button className="bg-brand-primary hover:bg-brand-primary/80">
                    <Plus className="h-4 w-4 mr-2" />
                    Find Creators
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {followingCreators
                .filter((creator: any) => 
                  !searchQuery || 
                  creator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  creator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((creator: any) => {
                  const profilePhoto = transformImageUrl(creator.imageUrl || creator.user?.profileData?.avatar);
                  const banner = transformImageUrl(creator.bannerImage || creator.user?.profileData?.bannerImage);
                  const creatorSlug = creator.tenant?.slug || creator.user?.username;
                  const activeTasks = tasksData.filter((t: any) => t.creatorId === creator.id && !t.isDraft && t.isActive);
                  
                  return (
                    <Card key={creator.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            {profilePhoto ? (
                              <img 
                                src={profilePhoto} 
                                alt={creator.displayName}
                                className="w-14 h-14 rounded-full border-2 border-brand-primary/30 object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {creator.displayName?.[0] || 'C'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-white text-lg">{creator.displayName}</CardTitle>
                                {creator.isVerified && (
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={`text-xs border-transparent ${getCategoryColor(creator.category)}`}>
                                  {creator.category || 'Creator'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {creator.bio || "Creating amazing content and building community."}
                        </p>
                        
                        <div className="space-y-4">
                          {/* Your Progress */}
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Your Progress</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold text-brand-secondary">
                                {creator.yourPoints?.toLocaleString() || 0} pts
                              </span>
                              <span className="text-sm text-gray-400">{creator.programs || 1} program{creator.programs !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                              <Target className="h-3 w-3" />
                              <span>{activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-2 text-gray-400">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs">Since {creator.joinedDate}</span>
                            </div>
                            <div className="flex space-x-2">
                              <Link href={`/programs/${creatorSlug}`}>
                                <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/programs/${creatorSlug}`}>
                                <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/80">
                                  View Program
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}

          {/* Discovery CTA */}
          <Card className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 mt-8">
            <CardContent className="text-center py-8">
              <Plus className="h-16 w-16 text-brand-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Discover More Creators</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Find new creators and athletes to follow. Join their loyalty programs and start earning exclusive rewards.
              </p>
              <Link href="/find-creators">
                <Button className="bg-brand-primary hover:bg-brand-primary/80">
                  Browse Creators
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}