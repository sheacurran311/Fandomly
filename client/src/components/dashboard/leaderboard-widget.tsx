import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  totalPoints: number;
  currentPoints?: number;
  rank: number;
}

interface Props {
  programId?: string;
}

export default function LeaderboardWidget({ programId }: Props) {
  // Real-time data from API - no mock data
  const { data, isLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["program-leaderboard", programId],
    queryFn: async () => {
      const endpoint = programId
        ? `/api/leaderboards/program/${programId}?period=all_time&limit=5`
        : `/api/leaderboards/platform?period=all_time&limit=5`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const topFans = data?.leaderboard || [];
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-gray-400";
  };
  
  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasData = topFans.some(fan => fan.totalPoints > 0);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>Top Fans</span>
          </div>
          <Link href="/creator-dashboard/fans">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View All
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-400">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topFans.map((fan) => (
              <div
                key={fan.userId}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className={`text-lg font-bold w-6 text-center ${getRankColor(fan.rank)}`}>
                  {fan.rank}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={fan.avatarUrl || undefined} alt={fan.fullName} />
                  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-sm">
                    {fan.fullName?.split(' ').map(n => n[0]).join('') || fan.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">
                    {fan.fullName || fan.username || 'Anonymous'}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    @{fan.username || 'user'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-brand-primary font-bold text-sm">
                    {fan.totalPoints.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    points
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

