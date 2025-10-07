import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [notificationSettings, setNotificationSettings] = useState({
    campaignUpdates: true,
    newRewards: true,
    pointsEarned: true,
    creatorPosts: true,
    achievements: true,
    emailDigest: false,
    pushNotifications: true,
  });

  // Mock notifications data
  const notifications = [
    {
      id: "1",
      type: "points",
      title: "Points Earned!",
      message: "You earned 50 points for liking Aerial Ace's post",
      timestamp: "2 hours ago",
      read: false,
      icon: Star,
      color: "text-yellow-400"
    },
    {
      id: "2",
      type: "campaign",
      title: "New Campaign Available",
      message: "Luna Music started a new streaming campaign - earn 100 points!",
      timestamp: "4 hours ago",
      read: false,
      icon: Trophy,
      color: "text-brand-primary"
    },
    {
      id: "3",
      type: "achievement",
      title: "Achievement Unlocked",
      message: "You've unlocked the 'Social Butterfly' achievement!",
      timestamp: "1 day ago",
      read: true,
      icon: Trophy,
      color: "text-purple-400"
    },
    {
      id: "4",
      type: "creator",
      title: "Creator Update",
      message: "Tech Creator Hub posted a new tutorial video",
      timestamp: "2 days ago",
      read: true,
      icon: Users,
      color: "text-blue-400"
    },
    {
      id: "5",
      type: "reward",
      title: "Reward Available",
      message: "You have enough points to claim the VIP Discord Access reward",
      timestamp: "3 days ago",
      read: false,
      icon: Gift,
      color: "text-green-400"
    }
  ];

  if (isLoading) {
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    // TODO: Implement mark as read API call
    console.log("Mark as read:", id);
  };

  const markAllAsRead = () => {
    // TODO: Implement mark all as read API call
    console.log("Mark all as read");
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
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                <Settings className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
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
                    {notifications.map((notification) => {
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
                    <span className="text-gray-300 text-sm">Creator Posts</span>
                    <Switch
                      checked={notificationSettings.creatorPosts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, creatorPosts: checked }))}
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
                      <span className="text-white font-medium">{notifications.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Unread</span>
                      <span className="text-brand-primary font-medium">{unreadCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">This Week</span>
                      <span className="text-white font-medium">12</span>
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
