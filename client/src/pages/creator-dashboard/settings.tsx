import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Trash2,
  Save,
  Users,
  Download,
  Loader2,
} from 'lucide-react';
import { useCreatorVerification } from '@/hooks/useCreatorVerification';
import { CreatorVerificationProgress } from '@/components/creator/CreatorVerificationProgress';
import UserTypeSwitcher from '@/components/auth/user-type-switcher';

export default function CreatorSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    creator,
    verificationData,
    platformActivity,
    isLoading: verificationLoading,
  } = useCreatorVerification();

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [settings, setSettings] = useState({
    // Profile Settings
    displayName: user?.username || '',
    email: user?.email || '',
    bio: '',

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
    storeName: '',
    storeSlug: '',
    timezone: 'UTC',
    currency: 'USD',

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PATCH', '/api/auth/profile', {
        displayName: settings.displayName,
        email: settings.email,
        bio: settings.bio,
        notificationPreferences: {
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          marketingEmails: settings.marketingEmails,
          campaignUpdates: settings.campaignUpdates,
        },
        privacySettings: {
          publicProfile: settings.publicProfile,
          showFollowerCount: settings.showFollowerCount,
          allowDirectMessages: settings.allowDirectMessages,
        },
      });
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest('POST', '/api/gdpr/export', {
        dataTypes: ['all'],
        format: 'json',
      });
      const data = await res.json();
      toast({
        title: 'Export requested',
        description: data.estimatedTime || 'Your data export is being prepared.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not request data export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiRequest('POST', '/api/gdpr/delete', {
        type: 'full_deletion',
      });
      const data = await res.json();
      setShowDeleteDialog(false);
      toast({
        title: 'Deletion request submitted',
        description:
          data.confirmationInstructions ||
          'Check your email to confirm. You have 30 days to cancel.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Request failed',
        description: err instanceof Error ? err.message : 'Could not submit deletion request',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManagePayment = async () => {
    try {
      const res = await apiRequest('POST', '/api/stripe/create-portal-session');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      toast({
        title: 'Could not open billing portal',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    }
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
          <p className="text-gray-400">Manage your account, store, and notification preferences.</p>
        </div>

        <div className="max-w-4xl">
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="account" className="data-[state=active]:bg-brand-primary">
                <Users className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
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

            {/* Account Tab with User Type Switcher */}
            <TabsContent value="account" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Account Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">Switch Account Mode</h4>
                    <p className="text-sm text-gray-400 mb-4">
                      Toggle between Creator and Fan modes to access different features of the
                      platform.
                    </p>
                    {user && (
                      <UserTypeSwitcher
                        userId={user.id}
                        currentUserType={user.userType as 'fan' | 'creator'}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Verification Progress */}
              {!verificationLoading && verificationData && creator && (
                <CreatorVerificationProgress
                  creator={creator as Record<string, unknown>}
                  verificationData={verificationData}
                  platformActivity={platformActivity}
                  showWizardButton={false}
                />
              )}

              {/* Data Management */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Data Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">Data Export</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Download a copy of all your personal data (GDPR Article 20).
                    </p>
                    <Button
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={handleExportData}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export My Data
                    </Button>
                  </div>

                  <Separator className="bg-white/10" />

                  <div>
                    <h4 className="text-red-400 font-medium mb-2">Danger Zone</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Permanently delete your account, store, and all associated data. This action
                      has a 30-day grace period during which you can cancel the request.
                    </p>
                    <Button
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
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
                      <p className="text-sm text-gray-400">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Push Notifications</h4>
                      <p className="text-sm text-gray-400">
                        Browser notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, pushNotifications: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Marketing Emails</h4>
                      <p className="text-sm text-gray-400">
                        Product updates and feature announcements
                      </p>
                    </div>
                    <Switch
                      checked={settings.marketingEmails}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, marketingEmails: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Campaign Updates</h4>
                      <p className="text-sm text-gray-400">
                        Notifications about campaign performance
                      </p>
                    </div>
                    <Switch
                      checked={settings.campaignUpdates}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, campaignUpdates: checked }))
                      }
                    />
                  </div>
                  <Button
                    onClick={handleSave}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
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
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, publicProfile: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Show Follower Count</h4>
                      <p className="text-sm text-gray-400">Display your follower count publicly</p>
                    </div>
                    <Switch
                      checked={settings.showFollowerCount}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, showFollowerCount: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Allow Direct Messages</h4>
                      <p className="text-sm text-gray-400">Let fans send you direct messages</p>
                    </div>
                    <Switch
                      checked={settings.allowDirectMessages}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, allowDirectMessages: checked }))
                      }
                    />
                  </div>
                  <Button
                    onClick={handleSave}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
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
                      <Label htmlFor="storeName" className="text-gray-300">
                        Store Name
                      </Label>
                      <Input
                        id="storeName"
                        value={settings.storeName}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, storeName: e.target.value }))
                        }
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Your Store Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storeSlug" className="text-gray-300">
                        Store URL
                      </Label>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-2">fandomly.ai/</span>
                        <Input
                          id="storeSlug"
                          value={settings.storeSlug}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, storeSlug: e.target.value }))
                          }
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="your-store"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone" className="text-gray-300">
                        Timezone
                      </Label>
                      <Input
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-gray-300">
                        Currency
                      </Label>
                      <Input
                        id="currency"
                        value={settings.currency}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, currency: e.target.value }))
                        }
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSave}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
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
                  <p className="text-gray-400 text-sm">
                    Manage your subscription plan, payment method, and view invoices.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={handleManagePayment}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Payment Method
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={() => (window.location.href = '/creator-dashboard/subscriptions')}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      View Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-2">
              <p>
                This will permanently delete your creator account, store, all campaigns, tasks,
                rewards, and associated data.
              </p>
              <p>
                You will have a <strong className="text-white">30-day grace period</strong> to
                cancel this request. After that, your data will be permanently removed.
              </p>
              <p>If you have an active subscription, it will be cancelled automatically.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-gray-300 border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
