/**
 * Sprint 8: Program Leaderboard Component
 * Displays real-time program rankings for loyalty programs
 * CRITICAL: Uses only real-time API data - NO mock/hardcoded data
 * REPLACES: leaderboard-widget.tsx (which has mock data)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, ExternalLink, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface ProgramLeaderboardEntry {
  program_id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  current_points: number;
  total_points_earned: number;
  current_tier: string | null;
  joined_at: string;
  rank: number;
  current_rank: number;
  rank_change: number;
  points_change: number;
}

interface ProgramLeaderboardProps {
  programId: string;
  programName?: string;
  showViewAll?: boolean;
  limit?: number;
  compactMode?: boolean; // For widget display
}

export default function ProgramLeaderboard({
  programId,
  programName,
  showViewAll = false,
  limit = 5,
  compactMode = false
}: ProgramLeaderboardProps) {

  // Fetch program leaderboard from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['program-leaderboard', programId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/leaderboards/program/${programId}?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch program leaderboard');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const leaderboard = data?.leaderboard || [];

  // Get rank display styling
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-gray-400";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-orange-400" />;
    return null;
  };

  // Rank change indicator
  const RankChangeIndicator = ({ change }: { change: number }) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-400 text-xs">
          <TrendingUp className="h-3 w-3" />
          <span>+{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-400 text-xs">
          <TrendingDown className="h-3 w-3" />
          <span>{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-0.5 text-gray-500 text-xs">
        <Minus className="h-3 w-3" />
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span>{compactMode ? 'Top Fans' : (programName ? `${programName} Leaderboard` : 'Program Leaderboard')}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>{compactMode ? 'Top Fans' : 'Program Leaderboard'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 text-sm">Failed to load leaderboard</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span>{compactMode ? 'Top Fans' : (programName ? `${programName} Leaderboard` : 'Program Leaderboard')}</span>
            </div>
            {showViewAll && (
              <Link href={`/creator-dashboard/fans?program=${programId}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View All
                </Button>
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No fans yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Fans will appear here as they join your program
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>{compactMode ? 'Top Fans' : (programName ? `${programName} Leaderboard` : 'Program Leaderboard')}</span>
          </div>
          {showViewAll && (
            <Link href={`/creator-dashboard/fans?program=${programId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View All
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`space-y-${compactMode ? '3' : '2'}`}>
          {leaderboard.map((fan: ProgramLeaderboardEntry) => {
            const rankColor = getRankColor(fan.rank);
            const rankIcon = getRankIcon(fan.rank);

            return (
              <div
                key={fan.user_id}
                className={`flex items-center gap-3 ${compactMode ? 'p-2' : 'p-3'} rounded-lg hover:bg-white/5 transition-colors`}
              >
                {/* Rank */}
                <div className={`${rankColor} ${compactMode ? 'text-lg' : 'text-xl'} font-bold w-6 text-center flex items-center justify-center`}>
                  {rankIcon || fan.rank}
                </div>

                {/* Avatar */}
                <Avatar className={compactMode ? "h-10 w-10" : "h-12 w-12"}>
                  <AvatarImage src={fan.avatar || undefined} alt={fan.username} />
                  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-sm">
                    {fan.username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-white font-medium text-sm truncate">
                      {fan.username}
                    </div>
                    {fan.current_tier && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                        {fan.current_tier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-gray-400 text-xs">
                      {fan.total_points_earned.toLocaleString()} earned
                    </div>
                    <RankChangeIndicator change={fan.rank_change} />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className={`${rankColor} font-bold text-sm`}>
                    {fan.current_points.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    points
                  </div>
                  {fan.points_change > 0 && (
                    <div className="text-green-400 text-xs">
                      +{fan.points_change}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show total count if available */}
        {data?.pagination && data.pagination.total > limit && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Showing top {limit} of {data.pagination.total} fans
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
