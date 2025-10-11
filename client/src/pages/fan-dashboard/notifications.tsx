import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  Bell, 
  Check, 
  X,
  Star,
  Trophy,
  Heart,
  Gift,
  Users,
  Calendar,
  Settings
} from "lucide-react";

export default function FanNotifications() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // In-app only notification settings for Quick Settings
  const [notificationSettings, setNotificationSettings] = useState({
    campaignUpdates: true,
    newRewards: true,
    pointsEarned: true,
    taskCompleted: true,
    creatorPosts: true,
    achievements: true,
  });

  // Fetch notifications from API
  const { data: apiNotifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?limit=50', {
        credentials: 'include',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Map API notifications to UI format
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'points_earned': return { icon: Star, color: 'text-yellow-400' };
      case 'task_completed': return { icon: Trophy, color: 'text-green-400' };
      case 'campaign_new':
      case 'campaign_update': return { icon: Trophy, color: 'text-brand-primary' };
      case 'creator_post':
      case 'creator_update': return { icon: Users, color: 'text-blue-400' };
      case 'reward_available':
      case 'reward_claimed': return { icon: Gift, color: 'text-green-400' };
      case 'achievement_unlocked':
      case 'level_up': return { icon: Trophy, color: 'text-purple-400' };
      default: return { icon: Bell, color: 'text-gray-400' };
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const notificationList = apiNotifications.map((n: any) => {
    const { icon, color } = getNotificationIcon(n.type);
    return {
      ...n,
      timestamp: formatTimestamp(n.createdAt),
      icon,
      color,
    };
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('POST', `/api/notifications/${notificationId}/mark-read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/notifications/mark-all-read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  if (isLoading || loadingNotifications) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access notifications.</div>
      </div>
    );
  }

  const unreadCount = notificationList.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Bell className="mr-3 h-8 w-8 text-brand-primary" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-3 bg-brand-primary text-white">
                    {unreadCount} new
                  </Badge>
                )}
              </h1>
              <p className="text-gray-400">
                Stay updated with your fan activity and rewards.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button 
                variant="outline" 
                className="border-white/20 text-gray-300 hover:bg-white/10"
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <Link href="/fan-dashboard/settings#notifications">
                <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                  <Settings className="h-4 w-4 mr-2" />
                  Notification Settings
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notifications List */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Recent Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationList.map((notification) => {
                      const Icon = notification.icon;
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            notification.read 
                              ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                              : 'bg-brand-primary/10 border-brand-primary/20 hover:bg-brand-primary/15'
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              notification.read ? 'bg-white/10' : 'bg-brand-primary/20'
                            }`}>
                              <Icon className={`h-5 w-5 ${notification.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-white font-medium">{notification.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-400">{notification.timestamp}</span>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm">{notification.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notification Settings Sidebar */}
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Settings</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">In-app notifications only</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Campaign Updates</span>
                    <Switch
                      checked={notificationSettings.campaignUpdates}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, campaignUpdates: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">New Rewards</span>
                    <Switch
                      checked={notificationSettings.newRewards}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newRewards: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Points Earned</span>
                    <Switch
                      checked={notificationSettings.pointsEarned}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pointsEarned: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Task Completed</span>
                    <Switch
                      checked={notificationSettings.taskCompleted}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskCompleted: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Creator Posts</span>
                    <Switch
                      checked={notificationSettings.creatorPosts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, creatorPosts: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Achievements</span>
                    <Switch
                      checked={notificationSettings.achievements}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, achievements: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Notification Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Total</span>
                      <span className="text-white font-medium">{notificationList.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Unread</span>
                      <span className="text-brand-primary font-medium">{unreadCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">This Week</span>
                      <span className="text-white font-medium">{notificationList.filter(n => !n.read).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </DashboardLayout>
  );
}
