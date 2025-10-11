import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Save, Smartphone, Mail, MessageSquare, AlertCircle, Megaphone, Trophy, Users } from "lucide-react";
import { defaultNotificationPreferences, canEnableSMS, type NotificationPreferences } from "@shared/notificationPreferences";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesSectionProps {
  userPhone?: string | null;
}

export default function NotificationPreferencesSection({ 
  userPhone
}: NotificationPreferencesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  
  // Fetch notification preferences from API
  const { data: fetchedPreferences, isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/preferences', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
  });

  // Update local state when API data loads
  useEffect(() => {
    if (fetchedPreferences) {
      setPreferences(fetchedPreferences);
    }
  }, [fetchedPreferences]);
  
  // Save mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const response = await apiRequest('POST', '/api/notifications/preferences', prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Saved!",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    },
  });
  
  const smsEnabled = canEnableSMS(userPhone);

  const handleChannelToggle = (category: keyof NotificationPreferences, channel: 'push' | 'email' | 'sms', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...(typeof prev[category] === 'object' ? prev[category] : {}),
        [channel]: value,
      },
    }));
  };

  const handleSimpleToggle = (key: 'weeklyDigest' | 'monthlyReport', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    savePreferencesMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-gray-400">Loading preferences...</p>
      </div>
    );
  }

  const NotificationRow = ({ 
    title, 
    description,
    category,
    icon: Icon
  }: { 
    title: string; 
    description: string;
    category: keyof Omit<NotificationPreferences, 'weeklyDigest' | 'monthlyReport'>;
    icon: any;
  }) => {
    const pref = preferences[category];
    if (typeof pref !== 'object') return null;

    return (
      <div className="space-y-3 p-4 bg-white/5 rounded-lg">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-brand-primary mt-1" />
          <div className="flex-1">
            <h4 className="text-white font-medium">{title}</h4>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 ml-8">
          {/* Push Notifications */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Switch
              checked={pref.push}
              onCheckedChange={(checked) => handleChannelToggle(category, 'push', checked)}
            />
            <div className="flex items-center gap-1 text-sm text-gray-300">
              <Smartphone className="h-4 w-4" />
              <span>Push</span>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Switch
              checked={pref.email}
              onCheckedChange={(checked) => handleChannelToggle(category, 'email', checked)}
            />
            <div className="flex items-center gap-1 text-sm text-gray-300">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Switch
              checked={pref.sms}
              onCheckedChange={(checked) => handleChannelToggle(category, 'sms', checked)}
              disabled={!smsEnabled}
            />
            <div className="flex items-center gap-1 text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className={smsEnabled ? "text-gray-300" : "text-gray-500"}>SMS</span>
              {!smsEnabled && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 text-gray-500 border-gray-600">
                  Setup Required
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!smsEnabled && (
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200 text-sm">
            Add your phone number in your profile to enable SMS notifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Marketing Notifications */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-primary" />
            Marketing & Platform Updates
          </CardTitle>
          <p className="text-sm text-gray-400">Promotional content and platform announcements</p>
        </CardHeader>
        <CardContent>
          <NotificationRow
            title="Marketing Communications"
            description="Platform updates, new features, and special offers"
            category="marketing"
            icon={Megaphone}
          />
        </CardContent>
      </Card>

      {/* Creator Notifications */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" />
            Creator Updates
          </CardTitle>
          <p className="text-sm text-gray-400">Updates from creators you follow</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotificationRow
            title="Campaign Updates"
            description="New campaigns and campaign status changes"
            category="campaignUpdates"
            icon={Trophy}
          />
          <NotificationRow
            title="Creator Posts"
            description="New posts and updates from creators"
            category="creatorUpdates"
            icon={Users}
          />
          <NotificationRow
            title="New Tasks"
            description="New tasks available to complete"
            category="newTasks"
            icon={Trophy}
          />
          <NotificationRow
            title="New Rewards"
            description="New rewards available to claim"
            category="newRewards"
            icon={Trophy}
          />
        </CardContent>
      </Card>

      {/* Achievement Notifications */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-primary" />
            Achievement Alerts
          </CardTitle>
          <p className="text-sm text-gray-400">Level ups, badges, and milestones</p>
        </CardHeader>
        <CardContent>
          <NotificationRow
            title="Achievement Unlocked"
            description="When you earn new achievements and level up"
            category="achievementAlerts"
            icon={Trophy}
          />
        </CardContent>
      </Card>

      {/* Additional Preferences */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Digest & Summary Emails</CardTitle>
          <p className="text-sm text-gray-400">Periodic summaries of your activity</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Weekly Digest</h4>
              <p className="text-sm text-gray-400">Summary of your week's activity</p>
            </div>
            <Switch
              checked={preferences.weeklyDigest}
              onCheckedChange={(checked) => handleSimpleToggle('weeklyDigest', checked)}
            />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Monthly Report</h4>
              <p className="text-sm text-gray-400">Monthly summary with stats and insights</p>
            </div>
            <Switch
              checked={preferences.monthlyReport}
              onCheckedChange={(checked) => handleSimpleToggle('monthlyReport', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave} 
        disabled={savePreferencesMutation.isPending}
        className="w-full bg-brand-primary hover:bg-brand-primary/80"
      >
        <Save className="h-4 w-4 mr-2" />
        {savePreferencesMutation.isPending ? 'Saving...' : 'Save Notification Preferences'}
      </Button>
    </div>
  );
}

