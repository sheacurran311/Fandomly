import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AchievementBadge from '@/components/achievements/achievement-badge';
import LevelProgress from '@/components/achievements/level-progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
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
  Loader2,
  CheckCircle,
  Clock,
  Lock,
} from 'lucide-react';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { format } from 'date-fns';

/**
 * Level and achievement calculation configuration.
 * TODO: These values should come from the gamification settings API so they can be
 * tuned per-program without requiring a code change.
 */
const LEVEL_CONFIG = {
  /** Points required to advance one level */
  pointsPerLevel: 1_000,
  /** Points required to unlock one achievement */
  pointsPerAchievement: 500,
} as const;

interface Achievement {
  id: string;
  name: string;
  description: string;
  category?: string;
  isUnlocked: boolean;
  isClaimed?: boolean;
  progress?: number;
  maxProgress?: number;
  pointsAwarded?: number;
  rewardPoints?: number;
  unlockedAt?: string;
}

interface PointTransaction {
  pointsAwarded: number;
}

export default function FanAchievements() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Fetch real user level data
  const { data: userLevel, isLoading: levelLoading } = useQuery({
    queryKey: ['/api/user-levels', user?.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/user-levels/${user?.id}`);
        return response.json();
      } catch {
        // Fallback: calculate from fan programs
        const fanProgramsResponse = await fetch(`/api/fan-programs/user/${user?.id}`);
        const fanPrograms = await fanProgramsResponse.json();

        let totalPoints = 0;
        for (const program of fanPrograms) {
          const pointsResponse = await fetch(`/api/point-transactions/fan-program/${program.id}`);
          const transactions = await pointsResponse.json();
          totalPoints += transactions.reduce(
            (sum: number, tx: PointTransaction) => sum + tx.pointsAwarded,
            0
          );
        }

        const currentLevel = Math.floor(totalPoints / LEVEL_CONFIG.pointsPerLevel) + 1;
        const levelPoints = totalPoints % LEVEL_CONFIG.pointsPerLevel;

        return {
          id: `${user?.id}-level`,
          userId: user?.id,
          currentLevel,
          totalPoints,
          levelPoints,
          nextLevelThreshold: LEVEL_CONFIG.pointsPerLevel,
          achievementsUnlocked: Math.floor(totalPoints / LEVEL_CONFIG.pointsPerAchievement),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch real achievements data
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/achievements/user', user?.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/achievements/user/${user?.id}`);
        return response.json();
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
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
        <div className="text-white">Please connect your wallet to access achievements.</div>
      </div>
    );
  }

  // Filter achievements by status using real data from API
  const completedAchievements = achievements.filter(
    (achievement: Achievement) => achievement.isUnlocked
  );
  const inProgressAchievements = achievements.filter(
    (achievement: Achievement) => !achievement.isUnlocked && (achievement.progress || 0) > 0
  );
  const availableAchievements = achievements.filter(
    (achievement: Achievement) => !achievement.isUnlocked && (achievement.progress || 0) === 0
  );

  // Calculate total points earned from completed achievements
  const totalPointsEarned = completedAchievements.reduce(
    (sum: number, achievement: Achievement) =>
      sum + (achievement.pointsAwarded || achievement.rewardPoints || 0),
    0
  );

  // Calculate achievement categories from real data
  const categoryCounts = achievements.reduce(
    (acc: Record<string, number>, achievement: Achievement) => {
      const category = achievement.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    },
    {}
  );

  const achievementCategories = [
    {
      name: 'Milestones',
      icon: Trophy,
      count: categoryCounts.milestones || 0,
      color: 'text-yellow-400',
    },
    { name: 'Social', icon: Heart, count: categoryCounts.social || 0, color: 'text-pink-400' },
    {
      name: 'Engagement',
      icon: Users,
      count: categoryCounts.engagement || 0,
      color: 'text-blue-400',
    },
    { name: 'Special', icon: Crown, count: categoryCounts.special || 0, color: 'text-purple-400' },
  ];

  return (
    <DashboardLayout userType="fan">
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
          {levelLoading ? (
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ) : userLevel ? (
            <LevelProgress userLevel={userLevel} size="lg" showDetails />
          ) : (
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400">No level data available</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Achievement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-brand-primary" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {completedAchievements.length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-brand-secondary" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {inProgressAchievements.length}
              </div>
              <div className="text-sm text-gray-400">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-brand-accent" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {availableAchievements.length}
              </div>
              <div className="text-sm text-gray-400">Available</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {totalPointsEarned.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Points Earned</div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Progress Visualizations */}
        <div className="mb-8 space-y-6">
          {/* Progress Timeline */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Achievement Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inProgressAchievements.length === 0 && completedAchievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No progress to show yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Start completing tasks to track your progress
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Recently Completed */}
                    {completedAchievements.slice(0, 3).map((achievement: Achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                      >
                        <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{achievement.name}</p>
                          <p className="text-sm text-gray-400">{achievement.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500/20 text-green-400">
                            +{achievement.pointsAwarded || achievement.rewardPoints || 0} pts
                          </Badge>
                          {achievement.unlockedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(achievement.unlockedAt), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* In Progress */}
                    {inProgressAchievements.slice(0, 5).map((achievement: Achievement) => {
                      const progress = achievement.progress || 0;
                      const progressPercent = achievement.maxProgress
                        ? (progress / achievement.maxProgress) * 100
                        : 0;

                      return (
                        <div
                          key={achievement.id}
                          className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                        >
                          <Clock className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{achievement.name}</p>
                            <div className="mt-2 space-y-1">
                              <Progress value={progressPercent} className="h-2" />
                              <p className="text-xs text-gray-400">
                                {achievement.maxProgress
                                  ? `${progress} / ${achievement.maxProgress}`
                                  : `${Math.round(progressPercent)}% complete`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              {Math.round(progressPercent)}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}

                    {/* Available (Locked) */}
                    {availableAchievements.slice(0, 2).map((achievement: Achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg opacity-60"
                      >
                        <Lock className="h-6 w-6 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{achievement.name}</p>
                          <p className="text-sm text-gray-400">{achievement.description}</p>
                        </div>
                        <Badge className="bg-white/10 text-gray-300">Locked</Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Progress Chart */}
          <BarChartCard
            title="Progress by Category"
            description="Your achievement completion across categories"
            data={achievementCategories.map((cat) => ({
              category: cat.name,
              completed: completedAchievements.filter(
                (a: Achievement) => (a.category || 'other').toLowerCase() === cat.name.toLowerCase()
              ).length,
              inProgress: inProgressAchievements.filter(
                (a: Achievement) => (a.category || 'other').toLowerCase() === cat.name.toLowerCase()
              ).length,
              available: availableAchievements.filter(
                (a: Achievement) => (a.category || 'other').toLowerCase() === cat.name.toLowerCase()
              ).length,
            }))}
            dataKeys={[
              { key: 'completed', color: '#10b981', name: 'Completed' },
              { key: 'inProgress', color: '#f59e0b', name: 'In Progress' },
              { key: 'available', color: '#6b7280', name: 'Available' },
            ]}
            xAxisKey="category"
            height={300}
          />
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
              All ({achievements.length})
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
            {achievementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : achievements.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-12 text-center">
                  <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Achievements Yet</h3>
                  <p className="text-gray-400">Start completing tasks to unlock achievements!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {achievements.map((achievement: Achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    userAchievement={{
                      progress: achievement.progress || 0,
                      completed: achievement.isUnlocked || false,
                      claimed: achievement.isClaimed || false,
                    }}
                    onClaim={() => console.log('Claiming achievement:', achievement.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            {completedAchievements.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-12 text-center">
                  <Star className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Completed Achievements
                  </h3>
                  <p className="text-gray-400">Complete tasks to unlock your first achievement!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completedAchievements.map((achievement: Achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    userAchievement={{
                      progress: achievement.progress || 0,
                      completed: true,
                      claimed: achievement.isClaimed || false,
                    }}
                    onClaim={() => console.log('Claiming achievement:', achievement.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {inProgressAchievements.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Achievements In Progress
                  </h3>
                  <p className="text-gray-400">
                    Start working on achievements to see your progress here!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inProgressAchievements.map((achievement: Achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    userAchievement={{
                      progress: achievement.progress || 0,
                      completed: false,
                      claimed: false,
                    }}
                    onClaim={() => console.log('Claiming achievement:', achievement.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            {availableAchievements.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-12 text-center">
                  <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Available Achievements
                  </h3>
                  <p className="text-gray-400">You&apos;ve started all available achievements!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableAchievements.map((achievement: Achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    userAchievement={{
                      progress: 0,
                      completed: false,
                      claimed: false,
                    }}
                    showProgress={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Achievement Categories */}
        {achievements.length > 0 && (
          <Card className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 mt-8">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Achievement Categories</h3>
                <p className="text-gray-300">
                  Explore different types of achievements you can unlock
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {achievementCategories
                  .filter((cat) => cat.count > 0)
                  .map((category, index) => {
                    const Icon = category.icon;
                    return (
                      <div key={index} className="text-center p-4 rounded-lg bg-white/10">
                        <Icon className={`h-8 w-8 ${category.color} mx-auto mb-2`} />
                        <h4 className="text-white font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-400">
                          {category.count} achievement{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
