import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Gift, 
  History, 
  Star,
  ExternalLink,
  Coins,
  Award,
  Settings
} from "lucide-react";
import SocialConnections from "@/components/social/social-connections";

import { type FanProgram, type User } from "@shared/schema";

export default function FanDashboard() {
  const { user } = useDynamicContext();

  // Get user data from our backend (not directly from Dynamic)
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  // Get fan programs
  const { data: fanPrograms = [], isLoading } = useQuery<FanProgram[]>({
    queryKey: ["/api/fan-programs/user", userData?.id],
    enabled: !!userData?.id,
  });

  // If user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">
              Please connect your wallet to access your fan dashboard.
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Fan Dashboard
          </h1>
          <p className="text-gray-300">
            Track your loyalty points, rewards, and favorite creators.
          </p>
        </div>

        {fanPrograms.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <Card className="max-w-2xl mx-auto bg-white/5 border-white/10">
              <CardContent className="pt-16 pb-16">
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Start Your Fan Journey
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
                  Join loyalty programs from your favorite creators to earn exclusive rewards and get closer to the action.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => window.location.href = "/marketplace"}
                    size="lg"
                    className="bg-brand-primary hover:bg-brand-primary/80"
                  >
                    <Trophy className="h-5 w-5 mr-2" />
                    Explore Creators
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg"
                  >
                    <Star className="h-5 w-5 mr-2" />
                    How It Works
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Dashboard with programs
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">
                <Trophy className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="programs" className="data-[state=active]:bg-brand-primary">
                <Star className="h-4 w-4 mr-2" />
                My Programs
              </TabsTrigger>
              <TabsTrigger value="rewards" className="data-[state=active]:bg-brand-primary">
                <Gift className="h-4 w-4 mr-2" />
                Rewards
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-brand-primary">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{fanPrograms.length}</div>
                    <div className="text-sm text-gray-400">Programs Joined</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Coins className="h-8 w-8 text-brand-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">
                      {fanPrograms.reduce((total, program) => total + (program.currentPoints || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-400">Total Points</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Gift className="h-8 w-8 text-brand-accent mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">0</div>
                    <div className="text-sm text-gray-400">Rewards Claimed</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Award className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">0</div>
                    <div className="text-sm text-gray-400">NFTs Owned</div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Programs */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Your Active Programs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fanPrograms.map((program) => (
                      <div key={program.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold">
                            C
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Creator Program</h3>
                            <p className="text-sm text-gray-400">
                              {program.currentPoints || 0} points • {program.currentTier || "Bronze"} tier
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white"
                        >
                          View Details
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="programs" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fanPrograms.map((program) => (
                  <Card key={program.id} className="bg-white/5 border-white/10">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-brand-secondary text-brand-dark-bg">
                          {program.currentTier || "Bronze"}
                        </Badge>
                        <div className="text-sm text-gray-400">
                          Joined {new Date(program.joinedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">Current Points</span>
                            <span className="text-lg font-bold text-brand-primary">
                              {program.currentPoints || 0}
                            </span>
                          </div>
                          <Progress 
                            value={((program.currentPoints || 0) % 1000) / 10} 
                            className="h-2"
                          />
                          <div className="text-xs text-gray-400 mt-1">
                            {1000 - ((program.currentPoints || 0) % 1000)} points to next tier
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-white/10">
                          <Button 
                            className="w-full bg-brand-primary hover:bg-brand-primary/80"
                            size="sm"
                          >
                            View Program
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rewards" className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Available Rewards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Rewards Available</h3>
                    <p className="text-gray-400 mb-6">
                      Keep earning points to unlock exclusive rewards from your creators.
                    </p>
                    <Button
                      onClick={() => window.location.href = "/marketplace"}
                      className="bg-brand-secondary hover:bg-brand-secondary/80 text-brand-dark-bg"
                    >
                      Explore More Programs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Activity Yet</h3>
                    <p className="text-gray-400">
                      Your point earning and reward redemption history will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Account Settings Section */}
        <div id="account-settings" className="mt-16 border-t border-brand-primary/20 pt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Account Settings</h2>
            <p className="text-gray-300">Manage your account preferences</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <Settings className="h-12 w-12 text-brand-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Account Type: Fan</h3>
                <p className="text-gray-300 mb-4">
                  Want to become a creator? Visit the marketplace to set up your own loyalty program.
                </p>
                <Button
                  onClick={() => window.location.href = "/creator-onboarding"}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  Become a Creator
                </Button>
              </CardContent>
            </Card>

            <div className="mt-6">
              <SocialConnections />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
