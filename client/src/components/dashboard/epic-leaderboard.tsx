import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, Award, TrendingUp, Users, Loader2 } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  totalPoints: number;
  rank: number;
  participationCount?: number;
  currentTier?: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  timePeriod: string;
  totalParticipants: number;
  campaignId?: string;
  campaignName?: string;
  programId?: string;
  programName?: string;
}

interface EpicLeaderboardProps {
  type: "platform" | "campaign" | "program";
  targetId?: string; // campaignId or programId
  title?: string;
  showTimePeriodFilter?: boolean;
  limit?: number;
  compact?: boolean;
}

export default function EpicLeaderboard({
  type,
  targetId,
  title,
  showTimePeriodFilter = true,
  limit = 10,
  compact = false,
}: EpicLeaderboardProps) {
  const [timePeriod, setTimePeriod] = useState<"this_week" | "this_month" | "all_time">("all_time");

  // Build API endpoint based on type
  const getEndpoint = () => {
    switch (type) {
      case "platform":
        return `/api/leaderboards/platform?period=${timePeriod}&limit=${limit}`;
      case "campaign":
        return `/api/leaderboards/campaign/${targetId}?period=${timePeriod}&limit=${limit}`;
      case "program":
        return `/api/leaderboards/program/${targetId}?period=${timePeriod}&limit=${limit}`;
    }
  };

  const { data, isLoading, error } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", type, targetId, timePeriod, limit],
    queryFn: async () => {
      const res = await fetch(getEndpoint());
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: type === "platform" || !!targetId,
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-400" />;
    return null;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-500/30";
    return "bg-white/5 border-white/10";
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case "platform":
        return "Platform Leaderboard";
      case "campaign":
        return data?.campaignName ? `${data.campaignName} Leaderboard` : "Campaign Leaderboard";
      case "program":
        return data?.programName ? `${data.programName} Leaderboard` : "Program Leaderboard";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "platform":
        return <Trophy className="h-5 w-5 text-purple-400" />;
      case "campaign":
        return <TrendingUp className="h-5 w-5 text-blue-400" />;
      case "program":
        return <Users className="h-5 w-5 text-green-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardContent className="text-center py-12 text-red-400">
          Failed to load leaderboard
        </CardContent>
      </Card>
    );
  }

  const leaderboard = data?.leaderboard || [];
  const hasData = leaderboard.some((entry) => entry.totalPoints > 0);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {getIcon()}
            <span>{getTitle()}</span>
            {data?.totalParticipants !== undefined && (
              <Badge variant="secondary" className="ml-2 bg-white/10 text-gray-300">
                {data.totalParticipants} participants
              </Badge>
            )}
          </CardTitle>
        </div>
        {showTimePeriodFilter && (
          <Tabs
            value={timePeriod}
            onValueChange={(v) => setTimePeriod(v as typeof timePeriod)}
            className="mt-3"
          >
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger
                value="this_week"
                className="data-[state=active]:bg-brand-primary data-[state=active]:text-white"
              >
                This Week
              </TabsTrigger>
              <TabsTrigger
                value="this_month"
                className="data-[state=active]:bg-brand-primary data-[state=active]:text-white"
              >
                This Month
              </TabsTrigger>
              <TabsTrigger
                value="all_time"
                className="data-[state=active]:bg-brand-primary data-[state=active]:text-white"
              >
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-2">No activity yet</p>
            <p className="text-sm text-gray-500">
              Be the first to earn points and claim the top spot!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] ${getRankBgColor(
                  entry.rank
                )}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank) || (
                    <span className="text-lg font-bold text-gray-400">{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className={`${entry.rank <= 3 ? "h-12 w-12 ring-2 ring-offset-2 ring-offset-transparent" : "h-10 w-10"} ${
                  entry.rank === 1 ? "ring-yellow-400" : entry.rank === 2 ? "ring-gray-300" : entry.rank === 3 ? "ring-orange-400" : ""
                }`}>
                  <AvatarImage src={entry.avatarUrl || undefined} alt={entry.fullName} />
                  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-sm">
                    {entry.fullName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || entry.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">
                    {entry.fullName || entry.username || "Anonymous"}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    @{entry.username || "user"}
                    {entry.currentTier && (
                      <Badge variant="outline" className="ml-2 text-xs py-0 px-1 border-white/20">
                        {entry.currentTier}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className={`font-bold text-sm ${
                    entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-200" : entry.rank === 3 ? "text-orange-400" : "text-brand-primary"
                  }`}>
                    {entry.totalPoints.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">points</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {hasData && data && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-brand-primary">
                {leaderboard.reduce((sum, e) => sum + e.totalPoints, 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Total Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {data.totalParticipants}
              </div>
              <div className="text-xs text-gray-400">Participants</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
