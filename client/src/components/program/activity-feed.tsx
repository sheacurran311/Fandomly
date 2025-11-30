import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  MessageCircle, 
  Share2,
  Trophy,
  CheckCircle,
  Sparkles,
  Pin
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'new_campaign' | 'new_task' | 'achievement';
  isPinned: boolean;
  createdAt: string;
  metadata?: {
    imageUrl?: string;
  };
}

interface Activity {
  completion: {
    id: string;
    completedAt: string;
    pointsEarned: number;
  };
  user: {
    username: string;
    avatar: string | null;
  };
  task: {
    name: string;
  };
}

export function ActivityFeed({ 
  programId, 
  creatorName,
  creatorAvatar 
}: { 
  programId: string;
  creatorName: string;
  creatorAvatar?: string;
}) {
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: [`/api/programs/${programId}/announcements`],
  });

  const { data: recentActivity = [] } = useQuery<Activity[]>({
    queryKey: [`/api/programs/${programId}/activity`],
  });

  // Helper to safely parse dates (returns null for invalid/epoch dates)
  const safeParseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    // Check if valid and not epoch (1970)
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return null;
    return date;
  };

  // Combine and sort by date - filter out activities with invalid dates
  const allActivity = [
    ...announcements.map(a => ({ type: 'announcement' as const, data: a, date: safeParseDate(a.createdAt) })),
    ...recentActivity
      .filter(a => a.completion?.completedAt) // Only include activities with valid completedAt
      .map(a => ({ type: 'activity' as const, data: a, date: safeParseDate(a.completion.completedAt) }))
  ]
    .filter(item => item.date !== null) // Remove items with invalid dates
    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

  if (allActivity.length === 0) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-600">Check back soon for updates and announcements!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {allActivity.map((item, index) => (
        item.type === 'announcement' ? (
          <AnnouncementCard 
            key={`announcement-${item.data.id}`}
            announcement={item.data}
            creatorName={creatorName}
            creatorAvatar={creatorAvatar}
          />
        ) : (
          <ActivityCard 
            key={`activity-${item.data.completion.id}-${index}`}
            activity={item.data}
          />
        )
      ))}
    </div>
  );
}

function AnnouncementCard({ 
  announcement, 
  creatorName,
  creatorAvatar 
}: { 
  announcement: Announcement;
  creatorName: string;
  creatorAvatar?: string;
}) {
  const getTypeIcon = () => {
    switch (announcement.type) {
      case 'new_campaign':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">New Campaign</Badge>;
      case 'new_task':
        return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">New Task</Badge>;
      case 'achievement':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Achievement</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Update</Badge>;
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12 border-2 border-gray-200">
            <AvatarImage src={creatorAvatar} />
            <AvatarFallback className="bg-brand-primary/20 text-brand-primary">
              {creatorName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-gray-900 font-semibold">{creatorName}</h3>
              {announcement.isPinned && (
                <Pin className="h-4 w-4 text-brand-primary" />
              )}
              {getTypeIcon()}
            </div>
            <h4 className="text-gray-900 font-medium mb-1">{announcement.title}</h4>
            <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{announcement.content}</p>
            
            {announcement.metadata?.imageUrl && (
              <img 
                src={announcement.metadata.imageUrl} 
                alt={announcement.title}
                className="rounded-lg mb-3 max-h-96 w-full object-cover border border-gray-200"
              />
            )}
            
            <div className="flex items-center gap-4 text-gray-600 text-sm">
              <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
              <button className="flex items-center gap-1 hover:text-brand-primary transition-colors">
                <Heart className="h-4 w-4" />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-1 hover:text-brand-primary transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>Comment</span>
              </button>
              <button className="flex items-center gap-1 hover:text-brand-primary transition-colors">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  // Safely format the completion date
  const getTimeAgo = () => {
    if (!activity.completion?.completedAt) return 'recently';
    try {
      const date = new Date(activity.completion.completedAt);
      // Check for invalid or epoch dates
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'recently';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-gray-200">
            <AvatarImage src={activity.user?.avatar || undefined} />
            <AvatarFallback className="bg-green-100 text-green-700">
              {(activity.user?.username || 'UN').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-sm">
              <span className="font-semibold">{activity.user?.username || 'Unknown'}</span>
              {' '}completed{' '}
              <span className="font-semibold">{activity.task?.name || 'a task'}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600 text-xs">
                {getTimeAgo()}
              </span>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                +{activity.completion?.pointsEarned || 0} points
              </Badge>
            </div>
          </div>
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

