import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Users, 
  Trophy, 
  Gift, 
  BarChart3, 
  Settings,
  Instagram,
  Twitter,
  Facebook,
  Music
} from "lucide-react";
import StatsGrid from "@/components/dashboard/stats-grid";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Creator, type User } from "@shared/schema";

export default function CreatorDashboard() {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

  // Get user data
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user", user?.id],
    enabled: !!user?.id,
  });

  // Get creator profile
  const { data: creator, isLoading: isLoadingCreator } = useQuery<Creator>({
    queryKey: ["/api/creators/user", userData?.id],
    enabled: !!userData?.id,
  });

  // Create creator mutation
  const createCreatorMutation = useMutation({
    mutationFn: async (creatorData: {
      displayName: string;
      bio: string;
      category: string;
    }) => {
      if (!userData) throw new Error("User data not available");
      
      return apiRequest("POST", "/api/creators", {
        userId: userData.id,
        ...creatorData,
        brandColors: {
          primary: "#dd20be",
          secondary: "#a4fc07",
          accent: "#03a0fd",
        },
        socialLinks: {},
        followerCount: 0,
        isVerified: false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your creator profile has been created!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create creator profile",
        variant: "destructive",
      });
    },
  });

  const stats = [
    { label: "Total Fans", value: "12,450", color: "secondary" as const },
    { label: "Active Rewards", value: "28", color: "primary" as const },
    { label: "Redemption Rate", value: "89%", color: "accent" as const },
    { label: "NFTs Issued", value: "1,254", color: "secondary" as const },
  ];

  // If user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">
              Please connect your wallet to access the creator dashboard.
            </p>
            <Button 
              onClick={() => window.location.href = "/"}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If creator profile doesn't exist, show onboarding
  if (!isLoadingCreator && !creator) {
    return (
      <div className="min-h-screen bg-brand-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl font-bold gradient-text text-center">
                  Welcome to Fandomly!
                </CardTitle>
                <p className="text-gray-300 text-center">
                  Let's set up your creator profile to start building your loyalty program.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createCreatorMutation.mutate({
                      displayName: formData.get("displayName") as string,
                      bio: formData.get("bio") as string,
                      category: formData.get("category") as string,
                    });
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name *
                      </label>
                      <Input
                        name="displayName"
                        required
                        placeholder="Your name or brand"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <Textarea
                        name="bio"
                        placeholder="Tell your fans about yourself..."
                        className="bg-white/10 border-white/20 text-white"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        name="category"
                        required
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                      >
                        <option value="">Select a category</option>
                        <option value="athlete">Athlete</option>
                        <option value="musician">musician</option>
                        <option value="creator">Creator</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={createCreatorMutation.isPending}
                    className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/80"
                  >
                    {createCreatorMutation.isPending ? "Creating Profile..." : "Create Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingCreator) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {creator?.displayName}!
            </h1>
            <p className="text-gray-300">
              Here's what's happening with your loyalty program today.
            </p>
          </div>
          <div className="flex gap-3 mt-4 lg:mt-0">
            <Button
              onClick={() => setIsCreatingProgram(true)}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
            <Button variant="outline" className="border-white/20 text-gray-300">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <StatsGrid stats={stats} />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="programs" className="data-[state=active]:bg-brand-primary">
              <Trophy className="h-4 w-4 mr-2" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-brand-primary">
              <Gift className="h-4 w-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="fans" className="data-[state=active]:bg-brand-primary">
              <Users className="h-4 w-4 mr-2" />
              Fans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-brand-secondary rounded-full"></div>
                      <div className="text-sm text-gray-300">Fan joined from Instagram post</div>
                      <div className="text-xs text-gray-500 ml-auto">2m ago</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                      <div className="text-sm text-gray-300">NFT reward claimed</div>
                      <div className="text-xs text-gray-500 ml-auto">5m ago</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
                      <div className="text-sm text-gray-300">New tier milestone reached</div>
                      <div className="text-xs text-gray-500 ml-auto">12m ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Add Reward
                    </Button>
                    <Button
                      variant="outline"
                      className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Fans
                    </Button>
                    <Button
                      variant="outline"
                      className="border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Connect Social
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="programs" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Loyalty Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Programs Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first loyalty program to start engaging with your fans.
                  </p>
                  <Button
                    onClick={() => setIsCreatingProgram(true)}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Program
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Rewards Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Add rewards to your loyalty program to give fans something to work towards.
                  </p>
                  <Button className="bg-brand-secondary hover:bg-brand-secondary/80 text-brand-dark-bg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reward
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fans" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Fan Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Fans Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Once fans start joining your loyalty program, you'll see them here.
                  </p>
                  <Button
                    variant="outline"
                    className="border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white"
                  >
                    Share Your Program
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
