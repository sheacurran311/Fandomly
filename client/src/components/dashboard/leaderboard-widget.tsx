import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface LeaderboardEntry {
  id: string;
  name: string;
  username: string;
  points: number;
  avatar?: string;
  rank: number;
}

export default function LeaderboardWidget() {
  // Mock data - replace with actual API call
  const topFans: LeaderboardEntry[] = [
    { id: "1", name: "Sarah Mitchell", username: "@sarahm", points: 2450, rank: 1 },
    { id: "2", name: "Mike Rodriguez", username: "@miker", points: 2180, rank: 2 },
    { id: "3", name: "Emma Chen", username: "@emm achen", points: 1950, rank: 3 },
    { id: "4", name: "James Wilson", username: "@jwilson", points: 1820, rank: 4 },
    { id: "5", name: "Lisa Anderson", username: "@lisaa", points: 1690, rank: 5 },
  ];
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-gray-400";
  };
  
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
        <div className="space-y-3">
          {topFans.map((fan) => (
            <div
              key={fan.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className={`text-lg font-bold w-6 text-center ${getRankColor(fan.rank)}`}>
                {fan.rank}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={fan.avatar} alt={fan.name} />
                <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-sm">
                  {fan.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">
                  {fan.name}
                </div>
                <div className="text-gray-400 text-xs truncate">
                  {fan.username}
                </div>
              </div>
              <div className="text-right">
                <div className="text-brand-primary font-bold text-sm">
                  {fan.points.toLocaleString()}
                </div>
                <div className="text-gray-400 text-xs">
                  points
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

