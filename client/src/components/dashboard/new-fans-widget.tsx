import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, TrendingDown, ExternalLink, Loader2, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface FanEnrollment {
  id: string;
  name: string;
  username: string;
  joinedAt: string;
  avatar?: string;
}

interface NewFansData {
  fans: FanEnrollment[];
  thisWeek: number;
  lastWeek: number;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

export default function NewFansWidget() {
  const { user } = useAuth();
  
  // Fetch real fan enrollment data
  const { data, isLoading, error } = useQuery<NewFansData>({
    queryKey: ['creator-new-fans', user?.id],
    queryFn: async () => {
      // Fetch recent activity filtered to 'join' type
      const response = await fetch(`/api/creator/activity/${user?.id}?type=join`);
      if (!response.ok) {
        throw new Error('Failed to fetch new fans');
      }
      const activities = await response.json();
      
      // Transform activity data to fan format
      const fans: FanEnrollment[] = activities.slice(0, 5).map((activity: any) => ({
        id: activity.id,
        name: activity.fanName || activity.fan || 'New Fan',
        username: activity.fanUsername ? `@${activity.fanUsername}` : '',
        joinedAt: formatRelativeTime(activity.timestamp),
        avatar: activity.fanAvatar
      }));
      
      // Calculate weekly growth
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const thisWeek = activities.filter((a: any) => new Date(a.timestamp) >= weekAgo).length;
      const lastWeek = activities.filter((a: any) => {
        const date = new Date(a.timestamp);
        return date >= twoWeeksAgo && date < weekAgo;
      }).length;
      
      return { fans, thisWeek, lastWeek };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const weeklyGrowth = data?.thisWeek || 0;
  const isGrowing = (data?.thisWeek || 0) >= (data?.lastWeek || 0);
  
  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-green-400" />
            <span>New Fans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-green-400" />
            <span>New Fans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            Unable to load fan data
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
            <Users className="h-5 w-5 text-green-400" />
            <span>New Fans</span>
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
        <div className="space-y-4">
          {/* Weekly Growth Banner */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            weeklyGrowth > 0 
              ? 'bg-green-400/10 border-green-400/20' 
              : 'bg-gray-400/10 border-gray-400/20'
          }`}>
            {weeklyGrowth > 0 ? (
              isGrowing ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-yellow-400" />
              )
            ) : (
              <UserPlus className="h-4 w-4 text-gray-400" />
            )}
            <div>
              <div className={`font-bold text-sm ${
                weeklyGrowth > 0 ? 'text-green-400' : 'text-gray-400'
              }`}>
                {weeklyGrowth > 0 ? `+${weeklyGrowth} this week` : 'No new fans this week'}
              </div>
              <div className="text-gray-400 text-xs">
                {weeklyGrowth > 0 
                  ? (isGrowing ? 'Growing steadily' : 'Slower than last week')
                  : 'Share your program to grow'
                }
              </div>
            </div>
          </div>
          
          {/* Recent Fans List */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Recent Signups
            </div>
            {data?.fans && data.fans.length > 0 ? (
              data.fans.map((fan) => (
                <div
                  key={fan.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={fan.avatar} alt={fan.name} />
                    <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                      {fan.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {fan.name}
                    </div>
                    {fan.username && (
                      <div className="text-gray-400 text-xs truncate">
                        {fan.username}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {fan.joinedAt}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                No fans yet. Share your program to get started!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
