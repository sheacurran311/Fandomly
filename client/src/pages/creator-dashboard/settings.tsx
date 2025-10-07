import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Globe,
  Palette,
  Key,
  Trash2,
  Save,
  BadgeCheck
} from "lucide-react";
import { useCreatorVerification } from "@/hooks/useCreatorVerification";
import { CreatorVerificationProgress } from "@/components/creator/CreatorVerificationProgress";

export default function CreatorSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { creator, verificationData, isLoading: verificationLoading } = useCreatorVerification();
  const [settings, setSettings] = useState({
    // Profile Settings
    displayName: user?.username || "",
    email: user?.email || "",
    bio: "",
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    campaignUpdates: true,
    
    // Privacy Settings
    publicProfile: true,
    showFollowerCount: true,
    allowDirectMessages: true,
    
    // Store Settings
    storeName: "",
    storeSlug: "",
    timezone: "UTC",
    currency: "USD",
    
    // NIL Settings (if applicable)
    nilCompliance: false,
    complianceReporting: false,
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
    console.log("Saving settings:", settings);
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Settings className="mr-3 h-8 w-8 text-brand-primary" />
              Settings
            </h1>
            <p className="text-gray-400">
              Manage your account, store, and notification preferences.
            </p>
          </div>

          <div className="max-w-4xl">
            <Tabs defaultValue="notifications" className="space-y-6">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="notifications" className="data-[state=active]:bg-brand-primary">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="privacy" className="data-[state=active]:bg-brand-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger value="store" className="data-[state=active]:bg-brand-primary">
                  <Globe className="h-4 w-4 mr-2" />
                  Store
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-brand-primary">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>
              

              <TabsContent value="notifications" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-400">Receive updates via email</p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Push Notifications</h4>
                        <p className="text-sm text-gray-400">Browser notifications for important updates</p>
                      </div>
                      <Switch
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Marketing Emails</h4>
                        <p className="text-sm text-gray-400">Product updates and feature announcements</p>
                      </div>
                      <Switch
                        checked={settings.marketingEmails}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, marketingEmails: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Campaign Updates</h4>
                        <p className="text-sm text-gray-400">Notifications about campaign performance</p>
                      </div>
                      <Switch
                        checked={settings.campaignUpdates}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, campaignUpdates: checked }))}
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
                    <CardTitle className="text-white">Privacy & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Public Profile</h4>
                        <p className="text-sm text-gray-400">Allow your profile to be discoverable</p>
                      </div>
                      <Switch
                        checked={settings.publicProfile}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, publicProfile: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Show Follower Count</h4>
                        <p className="text-sm text-gray-400">Display your follower count publicly</p>
                      </div>
                      <Switch
                        checked={settings.showFollowerCount}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showFollowerCount: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Allow Direct Messages</h4>
                        <p className="text-sm text-gray-400">Let fans send you direct messages</p>
                      </div>
                      <Switch
                        checked={settings.allowDirectMessages}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowDirectMessages: checked }))}
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary/80">
                      <Save className="h-4 w-4 mr-2" />
                      Save Privacy Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="store" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Store Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="storeName" className="text-gray-300">Store Name</Label>
                        <Input
                          id="storeName"
                          value={settings.storeName}
                          onChange={(e) => setSettings(prev => ({ ...prev, storeName: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Your Store Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storeSlug" className="text-gray-300">Store URL</Label>
                        <div className="flex items-center">
                          <span className="text-gray-400 text-sm mr-2">fandomly.com/</span>
                          <Input
                            id="storeSlug"
                            value={settings.storeSlug}
                            onChange={(e) => setSettings(prev => ({ ...prev, storeSlug: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="your-store"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timezone" className="text-gray-300">Timezone</Label>
                        <Input
                          id="timezone"
                          value={settings.timezone}
                          onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency" className="text-gray-300">Currency</Label>
                        <Input
                          id="currency"
                          value={settings.currency}
                          onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary/80">
                      <Save className="h-4 w-4 mr-2" />
                      Save Store Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Billing & Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-lg">
                      <h4 className="text-brand-primary font-medium mb-2">Current Plan: Professional</h4>
                      <p className="text-gray-300 text-sm">$99/month • Next billing: January 15, 2025</p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment Method
                      </Button>
                      <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
                        <Globe className="h-4 w-4 mr-2" />
                        Change Plan
                      </Button>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Danger Zone</h4>
                      <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
    </DashboardLayout>
  );
}
