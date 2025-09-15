import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Eye,
  Heart,
  Key,
  Trash2,
  Save,
  Download
} from "lucide-react";

export default function FanSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    // Profile Settings
    displayName: user?.profileData?.name || user?.username || "",
    email: user?.email || "",
    age: user?.profileData?.age || "",
    interests: user?.profileData?.interests || [],
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    campaignUpdates: true,
    creatorUpdates: true,
    achievementAlerts: true,
    weeklyDigest: false,
    
    // Privacy Settings
    publicProfile: true,
    showPoints: true,
    showAchievements: true,
    allowCreatorMessages: true,
    shareActivity: false,
  });

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
        <div className="text-white">Please connect your wallet to access settings.</div>
      </div>
    );
  }

  const handleSave = () => {
    // TODO: Implement save to backend
    console.log("Saving fan settings:", settings);
  };

  const handleExportData = () => {
    // TODO: Implement data export
    console.log("Exporting user data");
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log("Account deletion requested");
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Settings className="mr-3 h-8 w-8 text-brand-primary" />
              Settings
            </h1>
            <p className="text-gray-400">
              Manage your account preferences and privacy settings.
            </p>
          </div>

          <div className="max-w-4xl">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="profile" className="data-[state=active]:bg-brand-primary">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-brand-primary">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="privacy" className="data-[state=active]:bg-brand-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger value="account" className="data-[state=active]:bg-brand-primary">
                  <Key className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                        <Input
                          id="displayName"
                          value={settings.displayName}
                          onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="age" className="text-gray-300">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          value={settings.age}
                          onChange={(e) => setSettings(prev => ({ ...prev, age: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary/80">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-400">Receive important updates via email</p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Push Notifications</h4>
                        <p className="text-sm text-gray-400">Browser notifications for real-time updates</p>
                      </div>
                      <Switch
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Campaign Updates</h4>
                        <p className="text-sm text-gray-400">New campaigns from creators you follow</p>
                      </div>
                      <Switch
                        checked={settings.campaignUpdates}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, campaignUpdates: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Creator Updates</h4>
                        <p className="text-sm text-gray-400">Posts and updates from followed creators</p>
                      </div>
                      <Switch
                        checked={settings.creatorUpdates}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, creatorUpdates: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Achievement Alerts</h4>
                        <p className="text-sm text-gray-400">When you unlock new achievements</p>
                      </div>
                      <Switch
                        checked={settings.achievementAlerts}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, achievementAlerts: checked }))}
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary/80">
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Privacy Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Public Profile</h4>
                        <p className="text-sm text-gray-400">Allow others to find your profile</p>
                      </div>
                      <Switch
                        checked={settings.publicProfile}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, publicProfile: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Show Points</h4>
                        <p className="text-sm text-gray-400">Display your point balance publicly</p>
                      </div>
                      <Switch
                        checked={settings.showPoints}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showPoints: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Show Achievements</h4>
                        <p className="text-sm text-gray-400">Display your achievements on your profile</p>
                      </div>
                      <Switch
                        checked={settings.showAchievements}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showAchievements: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Allow Creator Messages</h4>
                        <p className="text-sm text-gray-400">Let creators send you direct messages</p>
                      </div>
                      <Switch
                        checked={settings.allowCreatorMessages}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowCreatorMessages: checked }))}
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary/80">
                      <Save className="h-4 w-4 mr-2" />
                      Save Privacy Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Account Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-white font-medium mb-2">Data Export</h4>
                      <p className="text-gray-400 text-sm mb-4">Download a copy of your data</p>
                      <Button 
                        variant="outline" 
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                        onClick={handleExportData}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export My Data
                      </Button>
                    </div>
                    
                    <Separator className="bg-white/10" />
                    
                    <div>
                      <h4 className="text-white font-medium mb-2">Connected Accounts</h4>
                      <p className="text-gray-400 text-sm mb-4">Manage your connected social media accounts</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-300">Facebook</span>
                          <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-300">Instagram</span>
                          <Button variant="outline" size="sm" className="border-white/20 text-gray-300">
                            Connect
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="bg-white/10" />
                    
                    <div>
                      <h4 className="text-red-400 font-medium mb-2">Danger Zone</h4>
                      <p className="text-gray-400 text-sm mb-4">Permanently delete your account and all data</p>
                      <Button 
                        variant="outline" 
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={handleDeleteAccount}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
