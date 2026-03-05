import { createElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, Trophy, Crown, Zap, Target } from 'lucide-react';
interface UserLevel {
  currentLevel: number | null;
  levelPoints: number | null;
  nextLevelThreshold: number | null;
  totalPoints: number | null;
  achievementsUnlocked: number | null;
}

interface LevelProgressProps {
  userLevel: UserLevel;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function LevelProgress({
  userLevel,
  size = 'md',
  showDetails = true,
}: LevelProgressProps): React.ReactElement {
  const progressPercentage =
    ((userLevel.levelPoints ?? 0) / (userLevel.nextLevelThreshold ?? 1000)) * 100;
  const pointsToNext = (userLevel.nextLevelThreshold ?? 1000) - (userLevel.levelPoints ?? 0);

  const getLevelIcon = (level: number | null) => {
    const lvl = level ?? 1;
    if (lvl >= 50) return Crown;
    if (lvl >= 25) return Trophy;
    if (lvl >= 10) return Star;
    return Target;
  };

  const getLevelColor = (level: number | null) => {
    const lvl = level ?? 1;
    if (lvl >= 50) return 'from-purple-400 to-purple-600';
    if (lvl >= 25) return 'from-yellow-400 to-yellow-600';
    if (lvl >= 10) return 'from-blue-400 to-blue-600';
    return 'from-green-400 to-green-600';
  };

  const getLevelBadgeColor = (level: number | null) => {
    const lvl = level ?? 1;
    if (lvl >= 50) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (lvl >= 25) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (lvl >= 10) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  const levelIcon = getLevelIcon(userLevel.currentLevel);

  if (size === 'sm') {
    return (
      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getLevelColor(userLevel.currentLevel)} flex items-center justify-center`}
        >
          {createElement(levelIcon, { className: 'h-5 w-5 text-white' })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-white">
              Level {userLevel.currentLevel ?? 1}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${getLevelBadgeColor(userLevel.currentLevel)}`}
            >
              {(userLevel.totalPoints ?? 0).toLocaleString()} XP
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${getLevelColor(userLevel.currentLevel)} flex items-center justify-center`}
            >
              {createElement(levelIcon, { className: 'h-6 w-6 text-white' })}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">Level {userLevel.currentLevel ?? 1}</span>
                <Badge variant="outline" className={getLevelBadgeColor(userLevel.currentLevel)}>
                  {(userLevel.totalPoints ?? 0).toLocaleString()} XP
                </Badge>
              </div>
              {showDetails && (
                <p className="text-sm text-gray-400">
                  {pointsToNext.toLocaleString()} XP to level {(userLevel.currentLevel ?? 1) + 1}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-brand-secondary">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">
                {userLevel.achievementsUnlocked ?? 0} badges
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      {showDetails && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Level Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Level Progress</span>
                <span className="text-white">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{(userLevel.levelPoints ?? 0).toLocaleString()} XP</span>
                <span>{(userLevel.nextLevelThreshold ?? 1000).toLocaleString()} XP</span>
              </div>
            </div>

            {/* Level Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-center space-x-1 text-brand-primary mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-lg font-bold">{userLevel.currentLevel ?? 1}</span>
                </div>
                <span className="text-xs text-gray-400">Current Level</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-center space-x-1 text-brand-secondary mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-lg font-bold">{userLevel.achievementsUnlocked ?? 0}</span>
                </div>
                <span className="text-xs text-gray-400">Achievements</span>
              </div>
            </div>

            {/* Next Level Preview */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Next Level Rewards</h4>
                  <p className="text-xs text-gray-400">Level {(userLevel.currentLevel ?? 1) + 1}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-brand-secondary">+500 XP</div>
                  <div className="text-xs text-gray-400">Bonus unlock</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
