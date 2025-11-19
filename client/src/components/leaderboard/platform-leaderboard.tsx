/**
 * Sprint 8: Platform Leaderboard Component
 * Displays real-time platform-wide rankings based on Fandomly Points
 * CRITICAL: Uses only real-time API data - NO mock/hardcoded data
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PlatformLeaderboardEntry {
  user_id: string;
  username: string;
  avatar: string | null;
  total_points: number;
  transaction_count: number;
  last_activity: string;
  first_activity: string;
  rank: number;
  rank_change: number;
  points_change: number;
}

interface PlatformLeaderboardProps {
  showTopPodium?: boolean;
  limit?: number;
  showStats?: boolean;
}

export default function PlatformLeaderboard({
  showTopPodium = true,
  limit = 100,
  showStats = true
}: PlatformLeaderboardProps) {
  const [period, setPeriod] = useState<'all-time' | 'week' | 'month'>('all-time');

  // Fetch platform leaderboard from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-leaderboard', period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/leaderboards/platform?period=${period}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch platform leaderboard');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const leaderboard = data?.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);

  // Calculate stats
  const totalParticipants = data?.pagination?.total || 0;
  const totalPoints = leaderboard.reduce((sum: number, entry: PlatformLeaderboardEntry) =>
    sum + entry.total_points, 0
  );
  const avgPoints = totalParticipants > 0 ? Math.round(totalPoints / totalParticipants) : 0;

  // Get rank badge
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return {
        icon: <Crown className="h-5 w-5 text-yellow-400" />,
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/10",
        borderColor: "border-yellow-400",
        label: "1st"
      };
    }
    if (rank === 2) {
      return {
        icon: <Medal className="h-5 w-5 text-gray-300" />,
        color: "text-gray-300",
        bgColor: "bg-gray-300/10",
        borderColor: "border-gray-300",
        label: "2nd"
      };
    }
    if (rank === 3) {
      return {
        icon: <Award className="h-5 w-5 text-orange-400" />,
        color: "text-orange-400",
        bgColor: "bg-orange-400/10",
        borderColor: "border-orange-400",
        label: "3rd"
      };
    }
    return {
      icon: null,
      color: "text-gray-400",
      bgColor: "bg-transparent",
      borderColor: "border-white/10",
      label: `#${rank}`
    };
  };

  // Rank change indicator
  const RankChangeIndicator = ({ change }: { change: number }) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
          <TrendingUp className="h-3 w-3" />
          <span>+{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-400 text-xs font-semibold">
          <TrendingDown className="h-3 w-3" />
          <span>{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-500 text-xs">
        <Minus className="h-3 w-3" />
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-lg border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-2xl font-bold">Global Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-lg border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-2xl font-bold">Global Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-red-400">Failed to load leaderboard</p>
            <p className="text-sm text-gray-400 mt-2">{error.toString()}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-lg border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-2xl font-bold">Global Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No rankings yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Complete tasks to earn Fandomly Points and appear on the leaderboard!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-lg border border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Global Leaderboard
            </span>
          </CardTitle>

          {/* Time Period Filter */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList className="bg-white/10">
              <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
              <TabsTrigger value="all-time" className="text-xs">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-400 text-xs">Total Fans</p>
              <p className="text-white text-xl font-bold">{totalParticipants.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-400 text-xs">Total Points</p>
              <p className="text-purple-400 text-xl font-bold">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-gray-400 text-xs">Avg Points</p>
              <p className="text-pink-400 text-xl font-bold">{avgPoints.toLocaleString()}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Top 3 Podium */}
        {showTopPodium && topThree.length >= 3 && (
          <div className="mb-8">
            <div className="flex items-end justify-center gap-6 mb-6">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <Medal className="h-8 w-8 text-gray-300 mb-2 animate-bounce" />
                  <Avatar className="h-16 w-16 border-4 border-gray-300 shadow-lg shadow-gray-300/50">
                    <AvatarImage src={topThree[1].avatar || undefined} />
                    <AvatarFallback className="bg-gray-300/20 text-gray-300 text-lg font-bold">
                      {topThree[1].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-semibold mt-2 text-sm">{topThree[1].username}</p>
                  <p className="text-gray-300 text-sm font-bold">{topThree[1].total_points.toLocaleString()} pts</p>
                  <div className="bg-gradient-to-br from-gray-300/30 to-gray-400/30 rounded-lg px-4 py-2 mt-2 h-16 flex items-center justify-center border-2 border-gray-300">
                    <span className="text-2xl font-bold text-gray-300">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Taller) */}
              {topThree[0] && (
                <div className="flex flex-col items-center -mt-4">
                  <Crown className="h-12 w-12 text-yellow-400 mb-2 animate-pulse" />
                  <Avatar className="h-24 w-24 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/50">
                    <AvatarImage src={topThree[0].avatar || undefined} />
                    <AvatarFallback className="bg-yellow-400/20 text-yellow-400 text-2xl font-bold">
                      {topThree[0].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-bold mt-2 text-lg">{topThree[0].username}</p>
                  <p className="text-yellow-400 font-bold text-lg">{topThree[0].total_points.toLocaleString()} pts</p>
                  <div className="bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 rounded-lg px-6 py-4 mt-2 h-24 flex items-center justify-center border-2 border-yellow-400">
                    <span className="text-4xl font-bold text-yellow-400">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <Award className="h-7 w-7 text-orange-400 mb-2 animate-bounce" />
                  <Avatar className="h-14 w-14 border-4 border-orange-400 shadow-lg shadow-orange-400/50">
                    <AvatarImage src={topThree[2].avatar || undefined} />
                    <AvatarFallback className="bg-orange-400/20 text-orange-400 font-bold">
                      {topThree[2].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-medium mt-2 text-xs">{topThree[2].username}</p>
                  <p className="text-orange-400 text-xs font-bold">{topThree[2].total_points.toLocaleString()} pts</p>
                  <div className="bg-gradient-to-br from-orange-400/30 to-orange-500/30 rounded-lg px-3 py-1 mt-2 h-12 flex items-center justify-center border-2 border-orange-400">
                    <span className="text-xl font-bold text-orange-400">3</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="space-y-2">
          {leaderboard.map((entry: PlatformLeaderboardEntry) => {
            const rankDisplay = getRankDisplay(entry.rank);

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-4 rounded-lg transition-all hover:bg-white/10 border ${rankDisplay.borderColor} ${rankDisplay.bgColor}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {rankDisplay.icon || (
                    <span className={`text-lg font-bold ${rankDisplay.color}`}>
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.avatar || undefined} />
                  <AvatarFallback className={`${rankDisplay.bgColor} ${rankDisplay.color} font-semibold`}>
                    {entry.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{entry.username}</p>
                    {entry.rank <= 10 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                        Top 10
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gray-400 text-xs">
                      {entry.transaction_count} transaction{entry.transaction_count !== 1 ? 's' : ''}
                    </p>
                    <RankChangeIndicator change={entry.rank_change} />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className={`font-bold text-xl ${rankDisplay.color}`}>
                    {entry.total_points.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-xs">Fandomly Points</p>
                  {entry.points_change > 0 && (
                    <p className="text-green-400 text-xs font-semibold">+{entry.points_change}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Showing {leaderboard.length} of {data.pagination.total} fans
          </div>
        )}
      </CardContent>
    </Card>
  );
}
