/**
 * Sprint 8: Campaign Leaderboard Component
 * Displays real-time campaign rankings with time period filtering
 * CRITICAL: Uses only real-time API data - NO mock/hardcoded data
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardEntry {
  campaign_id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  points: number;
  participation_count: number;
  last_participation: string;
  rank: number;
  joined_at: string;
  rank_change: number;
  points_change: number;
}

interface CampaignLeaderboardProps {
  campaignId: string;
  campaignName?: string;
  showTopPodium?: boolean;
  limit?: number;
}

export default function CampaignLeaderboard({
  campaignId,
  campaignName,
  showTopPodium = true,
  limit = 100
}: CampaignLeaderboardProps) {
  const [period, setPeriod] = useState<'all-time' | 'week' | 'month'>('all-time');

  // Fetch leaderboard data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign-leaderboard', campaignId, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/leaderboards/campaign/${campaignId}?period=${period}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const leaderboard = data?.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  // Get rank badge icon and color
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return {
        icon: <Crown className="h-5 w-5 text-yellow-400" />,
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/10",
        label: "1st"
      };
    }
    if (rank === 2) {
      return {
        icon: <Medal className="h-5 w-5 text-gray-300" />,
        color: "text-gray-300",
        bgColor: "bg-gray-300/10",
        label: "2nd"
      };
    }
    if (rank === 3) {
      return {
        icon: <Award className="h-5 w-5 text-orange-400" />,
        color: "text-orange-400",
        bgColor: "bg-orange-400/10",
        label: "3rd"
      };
    }
    return {
      icon: null,
      color: "text-gray-400",
      bgColor: "bg-transparent",
      label: `${rank}${getRankSuffix(rank)}`
    };
  };

  const getRankSuffix = (rank: number) => {
    const j = rank % 10;
    const k = rank % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Render rank change indicator
  const RankChangeIndicator = ({ change }: { change: number }) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-400 text-xs">
          <TrendingUp className="h-3 w-3" />
          <span>+{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-400 text-xs">
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

  // Render loading state
  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>Campaign Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>Campaign Leaderboard</span>
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

  // Render empty state
  if (leaderboard.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>{campaignName ? `${campaignName} Leaderboard` : 'Campaign Leaderboard'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No participants yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Be the first to participate and climb the leaderboard!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>{campaignName ? `${campaignName} Leaderboard` : 'Campaign Leaderboard'}</span>
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
      </CardHeader>

      <CardContent>
        {/* Top 3 Podium Display */}
        {showTopPodium && topThree.length >= 3 && (
          <div className="mb-8">
            <div className="flex items-end justify-center gap-4 mb-6">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <Medal className="h-8 w-8 text-gray-300 mb-2" />
                  <Avatar className="h-16 w-16 border-4 border-gray-300">
                    <AvatarImage src={topThree[1].avatar || undefined} />
                    <AvatarFallback className="bg-gray-300/20 text-gray-300">
                      {topThree[1].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-semibold mt-2 text-sm">{topThree[1].username}</p>
                  <p className="text-gray-300 text-xs">{topThree[1].points.toLocaleString()} pts</p>
                  <div className="bg-gray-300/20 rounded-lg px-4 py-2 mt-2 h-16 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Taller) */}
              {topThree[0] && (
                <div className="flex flex-col items-center">
                  <Crown className="h-10 w-10 text-yellow-400 mb-2 animate-pulse" />
                  <Avatar className="h-20 w-20 border-4 border-yellow-400">
                    <AvatarImage src={topThree[0].avatar || undefined} />
                    <AvatarFallback className="bg-yellow-400/20 text-yellow-400">
                      {topThree[0].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-bold mt-2">{topThree[0].username}</p>
                  <p className="text-yellow-400 font-semibold">{topThree[0].points.toLocaleString()} pts</p>
                  <div className="bg-yellow-400/20 rounded-lg px-5 py-3 mt-2 h-24 flex items-center justify-center">
                    <span className="text-3xl font-bold text-yellow-400">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <Award className="h-7 w-7 text-orange-400 mb-2" />
                  <Avatar className="h-14 w-14 border-4 border-orange-400">
                    <AvatarImage src={topThree[2].avatar || undefined} />
                    <AvatarFallback className="bg-orange-400/20 text-orange-400">
                      {topThree[2].username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-medium mt-2 text-xs">{topThree[2].username}</p>
                  <p className="text-orange-400 text-xs">{topThree[2].points.toLocaleString()} pts</p>
                  <div className="bg-orange-400/20 rounded-lg px-3 py-1 mt-2 h-12 flex items-center justify-center">
                    <span className="text-xl font-bold text-orange-400">3</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const rankDisplay = getRankDisplay(entry.rank);

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/10 ${rankDisplay.bgColor}`}
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
                  <AvatarFallback className={`${rankDisplay.bgColor} ${rankDisplay.color}`}>
                    {entry.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{entry.username}</p>
                    {entry.rank <= 3 && (
                      <span className={`text-xs px-2 py-0.5 rounded ${rankDisplay.bgColor} ${rankDisplay.color} font-semibold`}>
                        {rankDisplay.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gray-400 text-xs">
                      {entry.participation_count} participation{entry.participation_count !== 1 ? 's' : ''}
                    </p>
                    <RankChangeIndicator change={entry.rank_change} />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className={`font-bold text-lg ${rankDisplay.color}`}>
                    {entry.points.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-xs">points</p>
                  {entry.points_change > 0 && (
                    <p className="text-green-400 text-xs">+{entry.points_change}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Info */}
        {data?.pagination && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Showing {leaderboard.length} of {data.pagination.total} participants
          </div>
        )}
      </CardContent>
    </Card>
  );
}
