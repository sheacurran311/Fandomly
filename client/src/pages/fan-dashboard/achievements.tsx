import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import AchievementBadge from "@/components/achievements/achievement-badge";
import LevelProgress from "@/components/achievements/level-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  Star, 
  Users, 
  Heart,
  Target,
  Crown,
  Search,
  Filter,
  TrendingUp,
  Gift,
  Zap
} from "lucide-react";

export default function FanAchievements() {
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
        <div className="text-white">Please connect your wallet to access achievements.</div>
      </div>
    );
  }

  // Mock data for achievements
  const mockUserLevel = {
    id: "1",
    userId: user.id || "user1",
    tenantId: "tenant1",
    currentLevel: 12,
    totalPoints: 14250,
    levelPoints: 250,
    nextLevelThreshold: 1000,
    achievementsUnlocked: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAchievements = [
    {
      id: "1",
      tenantId: "tenant1",
      name: "First Steps",
      description: "Join your first loyalty program",
      icon: "star",
      category: "milestones",
      type: "bronze",
      pointsRequired: 0,
      actionRequired: "program_join",
      actionCount: 1,
      rewardPoints: 100,
      rewardType: "points",
      rewardValue: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2", 
      tenantId: "tenant1",
      name: "Social Butterfly",
      description: "Follow 5 different creators on social media",
      icon: "heart",
      category: "social",
      type: "silver",
      pointsRequired: 0,
      actionRequired: "social_follow",
      actionCount: 5,
      rewardPoints: 250,
      rewardType: "points",
      rewardValue: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "3",
      tenantId: "tenant1", 
      name: "Point Collector",
      description: "Earn your first 1,000 points",
      icon: "trophy",
      category: "engagement",
      type: "gold",
      pointsRequired: 1000,
      actionRequired: "points_earned",
      actionCount: 1000,
      rewardPoints: 500,
      rewardType: "points",
      rewardValue: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "4",
      tenantId: "tenant1",
      name: "Campaign Master",
      description: "Complete 10 different campaigns",
      icon: "target",
      category: "engagement",
      type: "platinum",
      pointsRequired: 0,
      actionRequired: "campaign_complete",
      actionCount: 10,
      rewardPoints: 1000,
      rewardType: "points",
      rewardValue: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "5",
      tenantId: "tenant1",
      name: "Ultimate Fan",
      description: "Reach Level 25 and unlock elite status",
      icon: "crown",
      category: "special",
      type: "diamond",
      pointsRequired: 0,
      actionRequired: "level_reached",
      actionCount: 25,
      rewardPoints: 2500,
      rewardType: "nft",
      rewardValue: '{"nft_type": "exclusive_badge", "rarity": "legendary"}',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  const mockUserAchievements = [
    {
      id: "1",
      userId: user.id || "user1",
      achievementId: "1",
      progress: 1,
      completed: true,
      completedAt: new Date(),
      claimed: true,
      claimedAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: "2",
      userId: user.id || "user1", 
      achievementId: "2",
      progress: 3,
      completed: false,
      completedAt: null,
      claimed: false,
      claimedAt: null,
      createdAt: new Date(),
    },
    {
      id: "3",
      userId: user.id || "user1",
      achievementId: "3", 
      progress: 1420,
      completed: true,
      completedAt: new Date(),
      claimed: false,
      claimedAt: null,
      createdAt: new Date(),
    },
    {
      id: "4",
      userId: user.id || "user1",
      achievementId: "4",
      progress: 7,
      completed: false,
      completedAt: null,
      claimed: false,
      claimedAt: null,
      createdAt: new Date(),
    },
    {
      id: "5",
      userId: user.id || "user1",
      achievementId: "5",
      progress: 12,
      completed: false,
      completedAt: null,
      claimed: false,
      claimedAt: null,
      createdAt: new Date(),
    }
  ];

  const getAchievementWithProgress = (achievement: any) => {
    const userAchievement = mockUserAchievements.find(ua => ua.achievementId === achievement.id);
    return { achievement, userAchievement };
  };

  const completedAchievements = mockAchievements.filter(achievement => {
    const userAchievement = mockUserAchievements.find(ua => ua.achievementId === achievement.id);
    return userAchievement?.completed;
  });

  const inProgressAchievements = mockAchievements.filter(achievement => {
    const userAchievement = mockUserAchievements.find(ua => ua.achievementId === achievement.id);
    return userAchievement && !userAchievement.completed && userAchievement.progress > 0;
  });

  const availableAchievements = mockAchievements.filter(achievement => {
    const userAchievement = mockUserAchievements.find(ua => ua.achievementId === achievement.id);
    return !userAchievement || userAchievement.progress === 0;
  });

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Achievements & Levels</h1>
            <p className="text-gray-400">
              Track your progress, unlock badges, and level up your fan experience.
            </p>
          </div>

          {/* Level Progress */}
          <div className="mb-8">
            <LevelProgress userLevel={mockUserLevel} size="lg" showDetails />
          </div>

          {/* Achievement Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{completedAchievements.length}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{inProgressAchievements.length}</div>
                <div className="text-sm text-gray-400">In Progress</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{availableAchievements.length}</div>
                <div className="text-sm text-gray-400">Available</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-6 w-6 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {mockUserAchievements.reduce((sum, ua) => sum + (ua.completed ? mockAchievements.find(a => a.id === ua.achievementId)?.rewardPoints || 0 : 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search achievements..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Achievement Tabs */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="all" className="data-[state=active]:bg-brand-primary">
                <Trophy className="h-4 w-4 mr-2" />
                All ({mockAchievements.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-brand-primary">
                <Star className="h-4 w-4 mr-2" />
                Completed ({completedAchievements.length})
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-brand-primary">
                <TrendingUp className="h-4 w-4 mr-2" />
                In Progress ({inProgressAchievements.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="data-[state=active]:bg-brand-primary">
                <Target className="h-4 w-4 mr-2" />
                Available ({availableAchievements.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mockAchievements.map((achievement) => {
                  const { userAchievement } = getAchievementWithProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      onClaim={() => console.log("Claiming achievement:", achievement.id)}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completedAchievements.map((achievement) => {
                  const { userAchievement } = getAchievementWithProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      onClaim={() => console.log("Claiming achievement:", achievement.id)}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inProgressAchievements.map((achievement) => {
                  const { userAchievement } = getAchievementWithProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      onClaim={() => console.log("Claiming achievement:", achievement.id)}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="available" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableAchievements.map((achievement) => {
                  const { userAchievement } = getAchievementWithProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      showProgress={false}
                    />
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Achievement Categories */}
          <Card className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 mt-8">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Achievement Categories</h3>
                <p className="text-gray-300">Explore different types of achievements you can unlock</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: "Milestones", icon: Trophy, count: 5, color: "text-yellow-400" },
                  { name: "Social", icon: Heart, count: 8, color: "text-pink-400" },
                  { name: "Engagement", icon: Users, count: 12, color: "text-blue-400" },
                  { name: "Special", icon: Crown, count: 3, color: "text-purple-400" },
                ].map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <div key={index} className="text-center p-4 rounded-lg bg-white/10">
                      <Icon className={`h-8 w-8 ${category.color} mx-auto mb-2`} />
                      <h4 className="text-white font-medium">{category.name}</h4>
                      <p className="text-sm text-gray-400">{category.count} achievements</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}