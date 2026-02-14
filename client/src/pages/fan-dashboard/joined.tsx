import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CreatorCard from "@/components/creator/creator-card";
import { 
  Heart, 
  Search, 
  Star,
  Plus,
  Trophy,
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
      const creatorIds = Array.from(new Set(fanPrograms.map((fp: any) => fp.creatorId))).filter(Boolean);
      
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
          <div className="text-white">Please sign in to view your enrolled creators.</div>
        </div>
      </DashboardLayout>
    );
  }

  const followingCreators = creatorsData;

  // Filter creators based on search
  const filteredCreators = followingCreators.filter((creator: any) => 
    !searchQuery || 
    creator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate active tasks for each creator
  const getActiveTasks = (creatorId: string) => {
    return tasksData.filter((t: any) => t.creatorId === creatorId && !t.isDraft && t.isActive);
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
                {followingCreators.reduce((sum: number, creator: any) => sum + (creator.programs || 0), 0)}
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
                {followingCreators.reduce((sum: number, creator: any) => sum + (creator.yourPoints || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Total Points</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
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

        {/* Enrolled Programs List */}
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
            {filteredCreators.map((creator: any) => {
              const activeTasks = getActiveTasks(creator.id);
              
              return (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  variant="progress"
                  progress={{
                    points: creator.yourPoints || 0,
                    tier: creator.programs > 1 ? `${creator.programs} programs` : undefined,
                    joinedDate: creator.joinedDate,
                    activeTasks: activeTasks.length,
                  }}
                  showBio={true}
                />
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
