import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Megaphone, 
  CheckSquare, 
  Users,
  TrendingUp,
  Calendar,
  Star,
  Target
} from "lucide-react";
import type { Campaign, Task } from "@shared/schema";

// Your Stats Widget (for logged-in fans)
export function YourStatsWidget({
  programId,
  pointsName,
  themeColors,
  brandColors,
  isThemeDark
}: {
  programId: string;
  pointsName: string;
  themeColors?: any;
  brandColors?: any;
  isThemeDark?: boolean;
}) {
  const { user } = useAuth();

  const { data: userStats } = useQuery<{
    points: number;
    tasksCompleted: number;
    leaderboardRank: number | null;
  }>({
    queryKey: [`/api/programs/${programId}/user-stats`],
    enabled: !!user,
  });

  if (!user || !userStats) {
    return null;
  }

  // Use theme colors if provided, otherwise fallback to defaults
  const colors = themeColors || {
    background: '#1a1a1a',
    text: {
      primary: '#ffffff',
      secondary: '#a3a3a3',
      tertiary: '#737373'
    }
  };
  const brand = brandColors || {
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F59E0B'
  };

  return (
    <Card
      className="shadow-sm"
      style={{
        background: isThemeDark
          ? `linear-gradient(135deg, ${brand.primary}15, ${brand.secondary}15)`
          : `linear-gradient(135deg, ${brand.primary}20, ${brand.secondary}20)`,
        borderColor: brand.primary + '30',
        backgroundColor: isThemeDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: colors.text.primary }}>
          <Star className="h-5 w-5" style={{ color: brand.accent }} />
          Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" style={{ color: brand.primary }} />
              <span className="text-sm" style={{ color: colors.text.secondary }}>{pointsName}</span>
            </div>
            <span className="font-bold text-lg" style={{ color: colors.text.primary }}>
              {userStats.points.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: brand.secondary }} />
              <span className="text-sm" style={{ color: colors.text.secondary }}>Tasks Completed</span>
            </div>
            <span className="font-bold text-lg" style={{ color: colors.text.primary }}>
              {userStats.tasksCompleted}
            </span>
          </div>

          {userStats.leaderboardRank && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: brand.accent }} />
                <span className="text-sm" style={{ color: colors.text.secondary }}>Leaderboard Rank</span>
              </div>
              <Badge
                style={{
                  backgroundColor: brand.accent + '20',
                  color: brand.accent,
                  borderColor: brand.accent + '40'
                }}
              >
                #{userStats.leaderboardRank}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Leaderboard Widget
export function LeaderboardWidget({ programId }: { programId: string }) {
  const { data: leaderboard = [] } = useQuery<Array<{
    userId: string;
    username: string;
    avatar: string | null;
    points: number;
    currentTier: string | null;
  }>>({
    queryKey: [`/api/programs/${programId}/leaderboard`],
  });

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Fans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No fans yet</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((fan, index) => (
              <div key={fan.userId} className="flex items-center gap-3">
                <span className="text-2xl w-8">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <Avatar className="w-8 h-8 border border-gray-200">
                  <AvatarImage src={fan.avatar || undefined} />
                  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                    {fan.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{fan.username}</p>
                  <p className="text-gray-600 text-xs">{fan.points} points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Active Campaigns Widget
export function ActiveCampaignsWidget({ campaigns }: { campaigns: Campaign[] }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-orange-500" />
          Active Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeCampaigns.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No active campaigns</p>
        ) : (
          <div className="space-y-3">
            {activeCampaigns.slice(0, 3).map(campaign => (
              <div key={campaign.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-primary/40 transition-colors">
                <h4 className="text-gray-900 font-semibold text-sm mb-1">{campaign.name}</h4>
                <p className="text-gray-600 text-xs line-clamp-2">{campaign.description}</p>
                {campaign.endDate && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Ends {new Date(campaign.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Active Tasks Widget
export function ActiveTasksWidget({ tasks }: { tasks: Task[] }) {
  const activeTasks = tasks.filter(t => t.isActive).slice(0, 3);
  
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-indigo-500" />
          Quick Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTasks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No tasks available</p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map(task => (
              <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-400 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 font-semibold text-sm mb-1 truncate">{task.name}</h4>
                    <p className="text-gray-600 text-xs line-clamp-1">{task.description}</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs whitespace-nowrap">
                    +{task.pointsToReward}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Fan Stats Widget
export function FanStatsWidget({ 
  fanCount, 
  totalPoints,
  activeCampaigns 
}: { 
  fanCount: number;
  totalPoints?: number;
  activeCampaigns?: number;
}) {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Community Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700 text-sm">Total Fans</span>
            </div>
            <span className="text-gray-900 font-semibold">{fanCount.toLocaleString()}</span>
          </div>
          
          {totalPoints !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gray-600" />
                <span className="text-gray-700 text-sm">Points Awarded</span>
              </div>
              <span className="text-gray-900 font-semibold">{totalPoints.toLocaleString()}</span>
            </div>
          )}
          
          {activeCampaigns !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-gray-600" />
                <span className="text-gray-700 text-sm">Active Campaigns</span>
              </div>
              <span className="text-gray-900 font-semibold">{activeCampaigns}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

