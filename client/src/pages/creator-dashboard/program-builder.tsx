import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi, queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Layers, 
  Plus, 
  Eye, 
  Rocket,
  Save,
  AlertCircle,
  ArrowLeft,
  Megaphone,
  CheckSquare,
  Palette,
  Settings,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Check,
  Globe,
  Gift,
  LayoutGrid,
  MapPin,
  User,
  Info
} from "lucide-react";
import { FacebookSDKManager } from "@/lib/facebook";
import { socialManager } from "@/lib/social-integrations";
import { TwitterSDKManager } from "@/lib/twitter";
import { useToast } from "@/hooks/use-toast";
import { invalidateSocialConnections } from "@/hooks/use-social-connections";
import { ImageUpload } from "@/components/ui/image-upload";
import type { Program, Campaign, Task } from "@shared/schema";
import { type ThemeTemplate, type CreatorTypeForTheme } from "@shared/theme-templates";
// New simplified builder components
import { ProgramBuilderModeToggle, getSavedBuilderMode, type BuilderMode } from "@/components/program/program-builder-mode-toggle";
import { CollapsibleSection } from "@/components/program/collapsible-section";
import { QuickThemePicker } from "@/components/program/quick-theme-picker";
import { EssentialInfoSection } from "@/components/program/essential-info-section";
import { PlatformConnectionPriority } from "@/components/program/platform-connection-priority";
import { getCreatorTemplate, type CreatorType } from "@/components/program/creator-program-templates";
import { QuickSetupWizard, type QuickSetupData } from "@/components/program/quick-setup-wizard";
import { PreviewModal } from "@/components/program/preview-modal";
import { AnnouncementsManager } from "@/components/program/announcements-manager";

interface ProgramWithDetails extends Program {
  campaigns?: Campaign[];
  tasks?: Task[];
}

export default function ProgramBuilderNew() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithDetails | null>(null);

  // Fetch programs
  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
    refetchOnMount: 'always',
  });

  // Fetch selected program details
  const { data: programDetails, refetch: refetchProgram } = useQuery<ProgramWithDetails>({
    queryKey: [`/api/programs/${selectedProgram?.id}`],
    enabled: !!selectedProgram?.id,
    refetchOnMount: 'always',
  });

  // Fetch campaigns for the selected program
  const { data: programCampaigns = [] } = useQuery<Campaign[]>({
    queryKey: [`/api/campaigns/program/${selectedProgram?.id}`],
    queryFn: async () => {
      const response = await fetchApi(`/api/campaigns/creator/${user?.creator?.id}`);
      const allCampaigns = await response.json();
      // Filter campaigns by programId
      return allCampaigns.filter((c: any) => c.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id && !!user?.creator?.id,
  });

  // Fetch tasks for the selected program
  const { data: programTasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/tasks/program/${selectedProgram?.id}`],
    queryFn: async () => {
      const response = await fetchApi('/api/tasks');
      const allTasks = await response.json();
      // Filter tasks by programId
      return allTasks.filter((t: any) => t.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id,
  });

  useEffect(() => {
    if (programDetails) {
      setSelectedProgram(programDetails);
    }
  }, [programDetails]);

  // Select first program by default
  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0]);
    }
  }, [programs, selectedProgram]);

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchApi("/api/programs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newProgram) => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setIsCreateModalOpen(false);
      setSelectedProgram(newProgram);
    },
  });

  // Publish program mutation
  const publishProgramMutation = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      return fetchApi(`/api/programs/${id}/publish`, {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      if (selectedProgram?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/programs/${selectedProgram.id}`] });
      }
      refetchProgram();
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout userType="creator">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading programs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="creator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Program Builder</h1>
            <p className="text-gray-400">Customize your program page and manage settings</p>
          </div>
          {programs.length === 0 && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          )}
        </div>

        {programs.length === 0 ? (
          <WelcomeScreen onCreateProgram={() => setIsCreateModalOpen(true)} />
        ) : selectedProgram ? (
          <ProgramCustomizer
            program={selectedProgram}
            onPublish={(slug) => publishProgramMutation.mutate({ id: selectedProgram.id, slug })}
            onUpdate={refetchProgram}
            campaigns={programCampaigns}
            tasks={programTasks}
          />
        ) : null}

        {/* Create Program Modal */}
        <CreateProgramModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createProgramMutation.mutate(data)}
          isSubmitting={createProgramMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

function WelcomeScreen({ onCreateProgram }: { onCreateProgram: () => void }) {
  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardContent className="p-12 text-center">
        <div className="max-w-2xl mx-auto">
          <Layers className="h-24 w-24 text-brand-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to Program Builder</h2>
          <p className="text-gray-300 text-lg mb-8">
            Your program is the foundation of your fan engagement system. Create a stunning public page
            that showcases your campaigns, tasks, and rewards all in one place.
          </p>
          <Button
            onClick={onCreateProgram}
            size="lg"
            className="bg-brand-primary hover:bg-brand-primary/80"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Program
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramCustomizer({ 
  program, 
  onPublish,
  onUpdate,
  campaigns = [],
  tasks = []
}: { 
  program: ProgramWithDetails;
  onPublish: (slug: string) => void;
  onUpdate: () => void;
  campaigns?: Campaign[];
  tasks?: Task[];
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Builder mode state (simple/advanced)
  const [builderMode, setBuilderMode] = useState<BuilderMode>(() => getSavedBuilderMode());
  
  // Get creator type from user context
  const creatorType: CreatorType = (user?.creator?.category as CreatorType) || 'content_creator';
  const creatorTemplate = getCreatorTemplate(creatorType);
  
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [recentlyConnected, setRecentlyConnected] = useState<Set<string>>(new Set<string>());
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSlug, setPublishSlug] = useState(program.slug || "");
  
  // Quick Setup Wizard - show on first visit if program has no theme configured
  const [showQuickSetup, setShowQuickSetup] = useState(() => {
    // Check if this is a new/unconfigured program
    const hasTheme = program.pageConfig?.theme?.templateId;
    const hasSeenWizard = localStorage.getItem(`quickSetup_${program.id}`);
    return !hasTheme && !hasSeenWizard && builderMode === 'simple';
  });
  const [customizeData, setCustomizeData] = useState({
    displayName: program.name,
    pointsName: program.pointsName || 'Points',
    bio: program.description || '',
    // Program-specific images
    headerImage: program.pageConfig?.headerImage || '',
    logo: program.pageConfig?.logo || '',
    brandColors: program.pageConfig?.brandColors || {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B'
    },
    // Social links
    socialLinks: program.pageConfig?.socialLinks || {
      twitter: '',
      instagram: '',
      discord: '',
      website: '',
    },
    // Theme settings
    theme: program.pageConfig?.theme || {
      mode: 'light' as 'light' | 'dark' | 'custom',
      backgroundColor: '#ffffff',
      textColor: '#111827',
    },
    // Visibility toggles
    showProfile: program.pageConfig?.visibility?.showProfile ?? true,
    showCampaigns: program.pageConfig?.visibility?.showCampaigns ?? true,
    showTasks: program.pageConfig?.visibility?.showTasks ?? true,
    showRewards: program.pageConfig?.visibility?.showRewards ?? true,
    showLeaderboard: program.pageConfig?.visibility?.showLeaderboard ?? true,
    showActivityFeed: program.pageConfig?.visibility?.showActivityFeed ?? true,
    showFanWidget: program.pageConfig?.visibility?.showFanWidget ?? true,
    // Granular profile data visibility
    profileData: program.pageConfig?.visibility?.profileData || {
      showBio: true,
      showSocialLinks: true,
      showTiers: true,
      showVerificationBadge: true,
      showLocation: true,
      showWebsite: true,
      showJoinDate: true,
      showFollowerCount: true,
    },
    // Creator details (type-specific info - sport, position, genre, etc.)
    creatorDetails: (program.pageConfig?.creatorDetails || {}) as Record<string, Record<string, unknown>>,
    // Location
    location: program.pageConfig?.location || '',
  });

  // Sync customizeData when the program prop changes (e.g., after re-navigation or refetch)
  useEffect(() => {
    setCustomizeData({
      displayName: program.name,
      pointsName: program.pointsName || 'Points',
      bio: program.description || '',
      headerImage: program.pageConfig?.headerImage || '',
      logo: program.pageConfig?.logo || '',
      brandColors: program.pageConfig?.brandColors || {
        primary: '#8B5CF6',
        secondary: '#EC4899',
        accent: '#F59E0B'
      },
      socialLinks: program.pageConfig?.socialLinks || {
        twitter: '',
        instagram: '',
        discord: '',
        website: '',
      },
      theme: program.pageConfig?.theme || {
        mode: 'light' as 'light' | 'dark' | 'custom',
        backgroundColor: '#ffffff',
        textColor: '#111827',
      },
      showProfile: program.pageConfig?.visibility?.showProfile ?? true,
      showCampaigns: program.pageConfig?.visibility?.showCampaigns ?? true,
      showTasks: program.pageConfig?.visibility?.showTasks ?? true,
      showRewards: program.pageConfig?.visibility?.showRewards ?? true,
      showLeaderboard: program.pageConfig?.visibility?.showLeaderboard ?? true,
      showActivityFeed: program.pageConfig?.visibility?.showActivityFeed ?? true,
      showFanWidget: program.pageConfig?.visibility?.showFanWidget ?? true,
      profileData: program.pageConfig?.visibility?.profileData || {
        showBio: true,
        showSocialLinks: true,
        showTiers: true,
        showVerificationBadge: true,
        showLocation: true,
        showWebsite: true,
        showJoinDate: true,
        showFollowerCount: true,
      },
      creatorDetails: (program.pageConfig?.creatorDetails || {}) as Record<string, Record<string, unknown>>,
      location: program.pageConfig?.location || '',
    });
    setPublishSlug(program.slug || "");
  }, [program.id, program.updatedAt]);

  // Fetch social connections
  const { data: socialConnectionsData } = useQuery({
    queryKey: ['/api/social-connections'],
    queryFn: async () => {
      const response = await fetchApi('/api/social-connections');
      return response;
    },
  });

  const connectedPlatforms = new Set<string>(
    (socialConnectionsData?.connections?.map((c: { platform?: string }) => c.platform).filter((p: unknown): p is string => typeof p === 'string') || [])
  );

  // Social platform connection handlers
  // Unified connect handler for all social platforms
  const handleConnectPlatform = async (platformId: string) => {
    const platformNames: Record<string, string> = {
      twitter: 'Twitter',
      instagram: 'Instagram',
      discord: 'Discord',
      facebook: 'Facebook',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      spotify: 'Spotify',
      twitch: 'Twitch',
    };

    const platformName = platformNames[platformId] || platformId;
    setConnectingPlatform(platformId);

    try {
      let result: { success: boolean; error?: string; user?: any; accessToken?: string; refreshToken?: string };

      // Handle platform-specific login logic
      if (platformId === 'twitter') {
        result = await TwitterSDKManager.secureLogin('creator');
        // Twitter requires additional save step
        if (result.success && result.user) {
          try {
            await fetchApi('/api/social-connections', {
              method: 'POST',
              body: JSON.stringify({
                platform: 'twitter',
                platformUserId: result.user.id,
                platformUsername: result.user.username,
                platformDisplayName: result.user.name,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                profileData: {
                  profileImageUrl: result.user.profileImageUrl,
                  followersCount: result.user.followersCount,
                  followingCount: result.user.followingCount,
                },
              }),
            });
          } catch (saveErr) {
            console.warn('[ProgramBuilder] Parent save failed (popup may have already saved):', saveErr);
          }
        }
      } else if (platformId === 'facebook') {
        result = await FacebookSDKManager.login('pages_show_list,pages_read_engagement,business_management');
        result.success = result.success && !!result.accessToken;
      } else {
        // Use socialManager for other platforms
        const api = socialManager[platformId as keyof typeof socialManager];
        if (!api) {
          console.warn('Unknown platform:', platformId);
          return;
        }
        result = await api.secureLogin();
      }

      if (result.success) {
        setRecentlyConnected(prev => new Set(prev).add(platformId));
        toast({
          title: `${platformName} Connected! +500 Points`,
          description: `Successfully connected your ${platformName} account`,
        });
        invalidateSocialConnections();
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || `Failed to connect ${platformName}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `An error occurred while connecting ${platformName}`,
        variant: "destructive",
      });
    } finally {
      setConnectingPlatform(null);
    }
  };

  // Handler for QuickThemePicker theme selection
  const handleSelectTheme = (template: ThemeTemplate) => {
    setCustomizeData(prev => ({
      ...prev,
      theme: template as any,
      brandColors: {
        primary: template.colors.primary,
        secondary: template.colors.secondary,
        accent: template.colors.accent
      }
    }));
    toast({
      title: "Theme Applied",
      description: `${template.name} theme has been applied to your program.`,
    });
  };

  // Handler for EssentialInfoSection updates
  const handleEssentialInfoChange = (updates: Partial<{
    displayName: string;
    bio: string;
    pointsName: string;
    logo: string;
    headerImage: string;
  }>) => {
    setCustomizeData(prev => ({ ...prev, ...updates }));
    // Auto-save when images are uploaded or removed (don't wait for manual Save click)
    if ('logo' in updates || 'headerImage' in updates) {
      const saveData = buildSaveData(updates);
      updateProgramMutation.mutate(saveData);
    }
  };

  // Handler for QuickSetupWizard completion
  const handleQuickSetupComplete = (data: QuickSetupData) => {
    // Apply the wizard data
    const updates: any = {
      displayName: data.displayName || customizeData.displayName,
      bio: data.bio || customizeData.bio,
      pointsName: data.pointsName || customizeData.pointsName,
    };
    
    // Apply selected theme if any
    if (data.selectedTheme) {
      updates.theme = data.selectedTheme;
      updates.brandColors = {
        primary: data.selectedTheme.colors.primary,
        secondary: data.selectedTheme.colors.secondary,
        accent: data.selectedTheme.colors.accent,
      };
    }
    
    setCustomizeData(prev => ({ ...prev, ...updates }));
    
    // Mark wizard as seen for this program
    localStorage.setItem(`quickSetup_${program.id}`, 'true');
    
    toast({
      title: "Setup Complete!",
      description: "Your program has been configured. Don't forget to save your changes.",
    });
  };

  const updateProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchApi(`/api/programs/${program.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${program.id}`] });
      onUpdate();
      toast({
        title: "Changes Saved",
        description: "Your program has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error saving program:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save program changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Build the full save payload from current customizeData (or with overrides)
  const buildSaveData = (overrides: Partial<typeof customizeData> = {}) => {
    const merged = { ...customizeData, ...overrides };
    return {
      name: merged.displayName,
      pointsName: merged.pointsName,
      description: merged.bio,
      pageConfig: {
        ...program.pageConfig,
        headerImage: merged.headerImage,
        logo: merged.logo,
        brandColors: merged.brandColors,
        socialLinks: merged.socialLinks,
        theme: merged.theme,
        creatorDetails: merged.creatorDetails,
        location: merged.location,
        visibility: {
          showProfile: merged.showProfile,
          showCampaigns: merged.showCampaigns,
          showTasks: merged.showTasks,
          showRewards: merged.showRewards,
          showLeaderboard: merged.showLeaderboard,
          showActivityFeed: merged.showActivityFeed,
          showFanWidget: merged.showFanWidget,
          profileData: merged.profileData,
        }
      }
    };
  };

  // Auto-save a specific image field immediately after upload
  const handleImageUpload = (field: 'headerImage' | 'logo', url: string) => {
    // Update local state
    setCustomizeData(prev => ({ ...prev, [field]: url }));
    // Auto-save to backend so the image persists immediately
    const saveData = buildSaveData({ [field]: url });
    updateProgramMutation.mutate(saveData);
  };

  // Remove an image field and auto-save
  const handleImageRemove = (field: 'headerImage' | 'logo') => {
    setCustomizeData(prev => ({ ...prev, [field]: '' }));
    const saveData = buildSaveData({ [field]: '' });
    updateProgramMutation.mutate(saveData);
  };

  const handleSave = () => {
    const saveData = buildSaveData();

    console.log('🔍 SAVING PROGRAM DATA:', JSON.stringify(saveData, null, 2));
    console.log('🎨 Brand Colors:', customizeData.brandColors);
    console.log('🎨 Theme:', customizeData.theme);
    console.log('👁️ Visibility:', {
      showProfile: customizeData.showProfile,
      showCampaigns: customizeData.showCampaigns,
      showTasks: customizeData.showTasks,
      showRewards: customizeData.showRewards,
      showLeaderboard: customizeData.showLeaderboard,
      showActivityFeed: customizeData.showActivityFeed,
      showFanWidget: customizeData.showFanWidget,
      profileData: customizeData.profileData,
    });

    updateProgramMutation.mutate(saveData);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-white/20 text-white">
                {program.status === 'published' ? (
                  <><Rocket className="h-3 w-3 mr-1" /> Published</>
                ) : (
                  <>Draft</>
                )}
              </Badge>
              {program.status === 'published' && program.slug && (
                <a
                  href={`/programs/${program.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline text-sm flex items-center gap-1"
                >
                  View Public Page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Builder Mode Toggle */}
              <ProgramBuilderModeToggle 
                mode={builderMode} 
                onModeChange={setBuilderMode} 
              />
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={updateProgramMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProgramMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {program.status === 'published' ? 'Update Published URL' : 'Publish Program'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Only shown after program is published */}
      {program.status === 'published' ? (
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setLocation('/creator-dashboard/campaigns')}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
              >
                <Megaphone className="h-8 w-8 mb-3 text-orange-400" />
                <span className="font-semibold text-lg">Create Campaign</span>
                <span className="text-xs text-gray-400 mt-1">Time-based task collection</span>
              </Button>

              <Button
                onClick={() => setLocation('/creator-dashboard/tasks/create')}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
              >
                <CheckSquare className="h-8 w-8 mb-3 text-indigo-400" />
                <span className="font-semibold text-lg">Create Task</span>
                <span className="text-xs text-gray-400 mt-1">Single action for fans</span>
              </Button>

              <Button
                onClick={() => setLocation('/creator-dashboard/rewards')}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
              >
                <Settings className="h-8 w-8 mb-3 text-purple-400" />
                <span className="font-semibold text-lg">Manage Rewards</span>
                <span className="text-xs text-gray-400 mt-1">Set up reward store</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 text-sm">
              Publish your program first to create tasks, campaigns, and manage rewards.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ========== SIMPLE MODE COMPONENTS ========== */}
      {builderMode === 'simple' && (
        <>
          {/* Quick Theme Picker - Always visible in Simple Mode */}
          <QuickThemePicker
            creatorType={creatorType as CreatorTypeForTheme}
            selectedThemeId={customizeData.theme?.templateId || null}
            onSelectTheme={handleSelectTheme}
          />

          {/* Essential Info Section - Always visible in Simple Mode */}
          <EssentialInfoSection
            data={{
              displayName: customizeData.displayName,
              bio: customizeData.bio,
              pointsName: customizeData.pointsName,
              logo: customizeData.logo,
              headerImage: customizeData.headerImage,
            }}
            creatorType={creatorType}
            onChange={handleEssentialInfoChange}
          />

          {/* Collapsible: Connect Platforms */}
          <CollapsibleSection
            title="Connect Social Platforms"
            icon={Gift}
            description="Connect your social accounts to build network-specific tasks"
            badge={`${connectedPlatforms.size} connected`}
            defaultOpen={false}
          >
            <PlatformConnectionPriority
              creatorType={creatorType}
              connectedPlatforms={connectedPlatforms}
              socialConnections={socialConnectionsData?.connections || []}
              recentlyConnected={recentlyConnected}
              connectingPlatform={connectingPlatform}
              onConnect={handleConnectPlatform}
              asCard={false}
            />
          </CollapsibleSection>

          {/* Collapsible: Creator Details - type-specific fields */}
          <CollapsibleSection
            title="Creator Details"
            icon={Info}
            description="Add details about you that fans will see"
            defaultOpen={false}
          >
            <div className="space-y-4">
              {/* Location */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-primary" />
                  Location
                </Label>
                <Input
                  value={customizeData.location}
                  onChange={(e) => setCustomizeData({ ...customizeData, location: e.target.value })}
                  placeholder="e.g., Los Angeles, CA"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Athlete-specific fields */}
              {creatorType === 'athlete' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Sport</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.athlete as { sport?: string })?.sport ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            athlete: { ...(customizeData.creatorDetails?.athlete ?? {}), sport: e.target.value }
                          }
                        })}
                        placeholder="e.g., Basketball, Football"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Position</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.athlete as { position?: string })?.position ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            athlete: { ...(customizeData.creatorDetails?.athlete ?? {}), position: e.target.value }
                          }
                        })}
                        placeholder="e.g., Point Guard, Quarterback"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">School</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.athlete as { school?: string })?.school ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            athlete: { ...(customizeData.creatorDetails?.athlete ?? {}), school: e.target.value }
                          }
                        })}
                        placeholder="e.g., Ohio State University"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Education Level</Label>
                      <select
                        value={String((customizeData.creatorDetails?.athlete as { education?: { level?: string } })?.education?.level ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            athlete: {
                              ...(customizeData.creatorDetails?.athlete ?? {}),
                              education: { ...(customizeData.creatorDetails?.athlete?.education ?? {}), level: e.target.value }
                            }
                          }
                        })}
                        className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3"
                      >
                        <option value="">Select level</option>
                        <option value="high_school">High School</option>
                        <option value="college_d1">College D1</option>
                        <option value="college_d2">College D2</option>
                        <option value="college_d3">College D3</option>
                        <option value="professional">Professional</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Current Sponsors</Label>
                    <Input
                      value={String((customizeData.creatorDetails?.athlete as { currentSponsors?: string })?.currentSponsors ?? '')}
                      onChange={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                          athlete: { ...(customizeData.creatorDetails?.athlete ?? {}), currentSponsors: e.target.value }
                        }
                      })}
                      placeholder="e.g., Nike, Gatorade (comma separated)"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Musician-specific fields */}
              {creatorType === 'musician' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Band / Artist Name</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.musician as { bandArtistName?: string })?.bandArtistName ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            musician: { ...(customizeData.creatorDetails?.musician ?? {}), bandArtistName: e.target.value }
                          }
                        })}
                        placeholder="Your stage name or band name"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Artist Type</Label>
                      <select
                        value={String((customizeData.creatorDetails?.musician as { artistType?: string })?.artistType ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            musician: { ...(customizeData.creatorDetails?.musician ?? {}), artistType: e.target.value }
                          }
                        })}
                        className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3"
                      >
                        <option value="">Select type</option>
                        <option value="independent">Independent</option>
                        <option value="signed">Signed</option>
                        <option value="hobby">Hobby</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Music Genre</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.musician as { musicGenre?: string })?.musicGenre ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            musician: { ...(customizeData.creatorDetails?.musician ?? {}), musicGenre: e.target.value }
                          }
                        })}
                        placeholder="e.g., Hip Hop, Pop, Rock"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Music Catalog URL</Label>
                      <Input
                        value={String((customizeData.creatorDetails?.musician as { musicCatalogUrl?: string })?.musicCatalogUrl ?? '')}
                        onChange={(e) => setCustomizeData({
                          ...customizeData,
                          creatorDetails: {
                            ...(customizeData.creatorDetails ?? {}),
                            musician: { ...(customizeData.creatorDetails?.musician ?? {}), musicCatalogUrl: e.target.value }
                          }
                        })}
                        placeholder="Spotify, Apple Music, or SoundCloud link"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Content Creator-specific fields */}
              {creatorType === 'content_creator' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Topics of Focus</Label>
                    <Input
                      value={Array.isArray((customizeData.creatorDetails?.contentCreator as { topicsOfFocus?: string[] })?.topicsOfFocus) 
                        ? (customizeData.creatorDetails?.contentCreator as { topicsOfFocus: string[] }).topicsOfFocus.join(', ') 
                        : String((customizeData.creatorDetails?.contentCreator as { topicsOfFocus?: string })?.topicsOfFocus ?? '')}
                      onChange={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                            contentCreator: {
                            ...(customizeData.creatorDetails?.contentCreator ?? {}),
                            topicsOfFocus: e.target.value.split(',').map((s: string) => s.trim())
                          }
                        }
                      })}
                      onBlur={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                            contentCreator: {
                            ...(customizeData.creatorDetails?.contentCreator ?? {}),
                            topicsOfFocus: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                          }
                        }
                      })}
                      placeholder="e.g., Gaming, Tech Reviews, Fitness (comma separated)"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <p className="text-xs text-gray-400">Separate topics with commas</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Platforms</Label>
                    <Input
                      value={Array.isArray((customizeData.creatorDetails?.contentCreator as { platforms?: string[] })?.platforms)
                        ? (customizeData.creatorDetails?.contentCreator as { platforms: string[] }).platforms.join(', ')
                        : String((customizeData.creatorDetails?.contentCreator as { platforms?: string })?.platforms ?? '')}
                      onChange={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                            contentCreator: {
                            ...(customizeData.creatorDetails?.contentCreator ?? {}),
                            platforms: e.target.value.split(',').map((s: string) => s.trim())
                          }
                        }
                      })}
                      onBlur={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                            contentCreator: {
                            ...(customizeData.creatorDetails?.contentCreator ?? {}),
                            platforms: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                          }
                        }
                      })}
                      placeholder="e.g., YouTube, TikTok, Twitch (comma separated)"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Sponsorships</Label>
                    <Input
                      value={String((customizeData.creatorDetails?.contentCreator as { sponsorships?: string })?.sponsorships ?? '')}
                      onChange={(e) => setCustomizeData({
                        ...customizeData,
                        creatorDetails: {
                          ...(customizeData.creatorDetails ?? {}),
                            contentCreator: {
                            ...(customizeData.creatorDetails?.contentCreator ?? {}),
                            sponsorships: e.target.value
                          }
                        }
                      })}
                      placeholder="Current brand partnerships"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Collapsible: Brand Colors */}
          <CollapsibleSection
            title="Customize Colors"
            icon={Palette}
            description="Override theme colors with your brand"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label className="text-white">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customizeData.brandColors.primary}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, primary: e.target.value }
                    })}
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.primary}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, primary: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label className="text-white">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customizeData.brandColors.secondary}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                    })}
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.secondary}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#EC4899"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="text-white">Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customizeData.brandColors.accent}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, accent: e.target.value }
                    })}
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.accent}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      brandColors: { ...customizeData.brandColors, accent: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#F59E0B"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Collapsible: Page Sections Visibility */}
          <CollapsibleSection
            title="Page Sections"
            icon={LayoutGrid}
            description="Control what appears on your public page"
            badge={`${[customizeData.showProfile, customizeData.showCampaigns, customizeData.showTasks, customizeData.showRewards, customizeData.showLeaderboard].filter(Boolean).length} visible`}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Profile Tab</p>
                  <p className="text-sm text-gray-400">Display your profile information</p>
                </div>
                <Switch
                  checked={customizeData.showProfile}
                  onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showProfile: checked })}
                />
              </div>
              {program.status === 'published' ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Show Campaigns</p>
                      <p className="text-sm text-gray-400">Display active campaigns</p>
                    </div>
                    <Switch
                      checked={customizeData.showCampaigns}
                      onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showCampaigns: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Show Tasks</p>
                      <p className="text-sm text-gray-400">Display available tasks</p>
                    </div>
                    <Switch
                      checked={customizeData.showTasks}
                      onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showTasks: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Show Rewards</p>
                      <p className="text-sm text-gray-400">Display reward store</p>
                    </div>
                    <Switch
                      checked={customizeData.showRewards}
                      onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showRewards: checked })}
                    />
                  </div>
                </>
              ) : (
                <div className="p-3 bg-white/5 rounded-lg border border-dashed border-white/10">
                  <p className="text-gray-400 text-sm text-center">
                    Publish your program to configure Campaigns, Tasks, and Rewards visibility.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Leaderboard</p>
                  <p className="text-sm text-gray-400">Display fan rankings</p>
                </div>
                <Switch
                  checked={customizeData.showLeaderboard}
                  onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showLeaderboard: checked })}
                />
              </div>
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* ========== ADVANCED MODE COMPONENTS ========== */}
      {builderMode === 'advanced' && (
        <>
          {/* Profile Information */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Program Information</CardTitle>
              <p className="text-sm text-gray-400">Customize how your program appears to fans</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Program Name</Label>
                <Input
                  value={customizeData.displayName}
                  onChange={(e) => setCustomizeData({ ...customizeData, displayName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="My Loyalty Program"
                />
              </div>
              <div>
                <Label className="text-white">Points Name</Label>
                <Input
                  value={customizeData.pointsName}
                  onChange={(e) => setCustomizeData({ ...customizeData, pointsName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="Points, Stars, Coins, etc."
                />
                <p className="text-xs text-gray-400 mt-1">
                  What you'll call the rewards fans earn (e.g., "Thunder Points", "Luna Coins")
                </p>
              </div>
              <div>
                <Label className="text-white">Description</Label>
                <Textarea
                  value={customizeData.bio}
                  onChange={(e) => setCustomizeData({ ...customizeData, bio: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  rows={3}
                  placeholder="Tell your fans what this program is about..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Program Images */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Program Images
              </CardTitle>
              <p className="text-sm text-gray-400">Customize your program's banner and logo (separate from your personal profile)</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-white mb-3 block">Banner Image</Label>
                <p className="text-sm text-gray-400 mb-3">
                  This banner will appear at the top of your program page. If not set, your creator profile banner will be used.
                </p>
                <ImageUpload
                  type="banner"
                  currentImageUrl={customizeData.headerImage}
                  onUploadSuccess={(url) => handleImageUpload('headerImage', url)}
                  onRemove={() => handleImageRemove('headerImage')}
                />
          </div>

          <Separator className="bg-white/10" />

          <div>
            <Label className="text-white mb-3 block">Program Logo</Label>
            <p className="text-sm text-gray-400 mb-3">
              This logo will appear as your program's profile picture. If not set, your creator profile photo will be used.
            </p>
            <ImageUpload
              type="avatar"
              currentImageUrl={customizeData.logo}
              onUploadSuccess={(url) => handleImageUpload('logo', url)}
              onRemove={() => handleImageRemove('logo')}
            />
          </div>

          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-gray-300 text-sm">
              <strong>Tip:</strong> Use program-specific images to differentiate your loyalty program from your personal brand. Leave blank to use your creator profile images.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Social Connections - Use shared component */}
      <PlatformConnectionPriority
        creatorType={creatorType}
        connectedPlatforms={connectedPlatforms}
        socialConnections={socialConnectionsData?.connections || []}
        recentlyConnected={recentlyConnected}
        connectingPlatform={connectingPlatform}
        onConnect={handleConnectPlatform}
        asCard={true}
      />

      {/* Website URL */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-white">Website URL</Label>
            <Input
              value={customizeData.socialLinks?.website || ''}
              onChange={(e) => setCustomizeData({
                ...customizeData,
                socialLinks: { ...customizeData.socialLinks, website: e.target.value }
              })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="https://yourwebsite.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your website will be displayed on your program page
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Templates - Use shared QuickThemePicker */}
      <QuickThemePicker
        creatorType={creatorType as CreatorTypeForTheme}
        selectedThemeId={customizeData.theme?.templateId || null}
        onSelectTheme={handleSelectTheme}
      />

      {/* Brand Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <p className="text-sm text-gray-400">Customize colors used throughout your program page</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Primary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner, Buttons, Highlights</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#6366f1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for primary CTAs, badges, and active states</p>
            </div>

            {/* Secondary Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Secondary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner Gradient, Accents</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#8b5cf6"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used in banner gradients and secondary accents</p>
            </div>

            {/* Accent Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Accent Color</Label>
                <span className="text-xs text-gray-500 italic">Links, Hover States</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customizeData.brandColors.accent}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, accent: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={customizeData.brandColors.accent}
                  onChange={(e) => setCustomizeData({
                    ...customizeData,
                    brandColors: { ...customizeData.brandColors, accent: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#f59e0b"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for links, hover states, and call-to-actions</p>
            </div>
          </div>

          <Alert className="border-blue-500/20 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300 text-sm">
              <strong>Brand Colors:</strong> These colors are applied to buttons, badges, banners, and interactive elements throughout your program page. Changes here will override the theme template colors.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Page Theme - Background & Text Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Page Theme
          </CardTitle>
          <p className="text-sm text-gray-400">Choose a preset theme or customize background and text colors</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode Selector */}
          <div>
            <Label className="text-white mb-3 block">Theme Preset</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setCustomizeData({
                  ...customizeData,
                  theme: { ...customizeData.theme, mode: 'light', backgroundColor: '#ffffff', textColor: '#111827' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme?.mode === 'light'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-white border border-gray-300 mb-2"></div>
                <p className="text-white font-medium text-sm">Light</p>
                <p className="text-gray-400 text-xs">White background</p>
              </button>

              <button
                onClick={() => setCustomizeData({
                  ...customizeData,
                  theme: { ...customizeData.theme, mode: 'dark', backgroundColor: '#0f172a', textColor: '#ffffff' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme?.mode === 'dark'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-slate-900 border border-gray-700 mb-2"></div>
                <p className="text-white font-medium text-sm">Dark</p>
                <p className="text-gray-400 text-xs">Dark background</p>
              </button>

              <button
                onClick={() => setCustomizeData({
                  ...customizeData,
                  theme: { ...customizeData.theme, mode: 'custom' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme?.mode === 'custom'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-gradient-to-br from-purple-500 to-pink-500 mb-2"></div>
                <p className="text-white font-medium text-sm">Custom</p>
                <p className="text-gray-400 text-xs">Your colors</p>
              </button>
            </div>
          </div>

          {/* Custom Color Pickers (shown when Custom is selected) */}
          {customizeData.theme?.mode === 'custom' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <Label className="text-white mb-2 block">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customizeData.theme.backgroundColor || '#ffffff'}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      theme: { ...customizeData.theme, backgroundColor: e.target.value }
                    })}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizeData.theme.backgroundColor || '#ffffff'}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      theme: { ...customizeData.theme, backgroundColor: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main page background color</p>
              </div>

              <div>
                <Label className="text-white mb-2 block">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customizeData.theme.textColor || '#111827'}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      theme: { ...customizeData.theme, textColor: e.target.value }
                    })}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizeData.theme.textColor || '#111827'}
                    onChange={(e) => setCustomizeData({
                      ...customizeData,
                      theme: { ...customizeData.theme, textColor: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#111827"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Primary text color for headings and body</p>
              </div>

              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-gray-300 text-sm">
                  <strong>Tip:</strong> Ensure good contrast between background and text colors for readability. Light backgrounds pair best with dark text, and dark backgrounds with light text.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Color Preview Box */}
          <div
            className="p-6 rounded-lg border-2 border-white/20"
            style={{
              backgroundColor: customizeData.theme?.backgroundColor || '#ffffff',
              color: customizeData.theme?.textColor || '#111827'
            }}
          >
            <h3 className="font-bold text-lg mb-2">Preview</h3>
            <p className="text-sm opacity-80">This is how your text will look on your page background.</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge
                style={{
                  backgroundColor: customizeData.brandColors.primary + '20',
                  color: customizeData.brandColors.primary,
                  borderColor: customizeData.brandColors.primary + '40'
                }}
                className="border"
              >
                Primary Badge
              </Badge>
              <Badge
                style={{
                  backgroundColor: customizeData.brandColors.secondary + '20',
                  color: customizeData.brandColors.secondary,
                  borderColor: customizeData.brandColors.secondary + '40'
                }}
                className="border"
              >
                Secondary Badge
              </Badge>
              <Badge
                style={{
                  backgroundColor: customizeData.brandColors.accent + '20',
                  color: customizeData.brandColors.accent,
                  borderColor: customizeData.brandColors.accent + '40'
                }}
                className="border"
              >
                Accent Badge
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              <Button
                size="sm"
                style={{ backgroundColor: customizeData.brandColors.primary, color: '#ffffff' }}
              >
                Primary Button
              </Button>
              <p className="text-xs opacity-60">
                <strong>Applied to:</strong> Program name badge, Active Campaign badges, Task badges, Enroll button, Share button, Tab highlights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Visibility */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Page Sections</CardTitle>
          <p className="text-sm text-gray-400">Control what appears on your public program page</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show Profile Tab - with granular controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Show Profile Tab</p>
                <p className="text-sm text-gray-400">Display your profile information and about section</p>
              </div>
              <Switch
                checked={customizeData.showProfile}
                onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showProfile: checked })}
              />
            </div>
            
            {/* Collapsible Profile Data Controls */}
            {customizeData.showProfile && (
              <div className="ml-6 space-y-2 border-l-2 border-brand-primary/30 pl-4">
                <p className="text-xs text-gray-400 mb-2 italic">Profile Data Visibility</p>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Bio/Description</span>
                  <Switch
                    checked={customizeData.profileData?.showBio ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showBio: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Social Links</span>
                  <Switch
                    checked={customizeData.profileData?.showSocialLinks ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showSocialLinks: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Reward Tiers</span>
                  <Switch
                    checked={customizeData.profileData?.showTiers ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showTiers: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Verification Badge</span>
                  <Switch
                    checked={customizeData.profileData?.showVerificationBadge ?? true}
                    onCheckedChange={(checked) => setCustomizeData({
                      ...customizeData,
                      profileData: { ...customizeData.profileData, showVerificationBadge: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Location</span>
                  <Switch
                    checked={customizeData.profileData?.showLocation ?? true}
                    onCheckedChange={(checked) => setCustomizeData({
                      ...customizeData,
                      profileData: { ...customizeData.profileData, showLocation: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Website</span>
                  <Switch
                    checked={customizeData.profileData?.showWebsite ?? true}
                    onCheckedChange={(checked) => setCustomizeData({
                      ...customizeData,
                      profileData: { ...customizeData.profileData, showWebsite: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Join Date</span>
                  <Switch
                    checked={customizeData.profileData?.showJoinDate ?? true}
                    onCheckedChange={(checked) => setCustomizeData({
                      ...customizeData,
                      profileData: { ...customizeData.profileData, showJoinDate: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Follower Count</span>
                  <Switch
                    checked={customizeData.profileData?.showFollowerCount ?? true}
                    onCheckedChange={(checked) => setCustomizeData({
                      ...customizeData,
                      profileData: { ...customizeData.profileData, showFollowerCount: checked }
                    })}
                  />
                </div>
              </div>
            )}
          </div>
          
          {program.status === 'published' ? (
            <>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Campaigns Tab</p>
                  <p className="text-sm text-gray-400">Display active and upcoming campaigns</p>
                </div>
                <Switch
                  checked={customizeData.showCampaigns}
                  onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showCampaigns: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Tasks Tab</p>
                  <p className="text-sm text-gray-400">Display available tasks for fans</p>
                </div>
                <Switch
                  checked={customizeData.showTasks}
                  onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Rewards Tab</p>
                  <p className="text-sm text-gray-400">Display reward store and available rewards</p>
                </div>
                <Switch
                  checked={customizeData.showRewards}
                  onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showRewards: checked })}
                />
              </div>
            </>
          ) : (
            <div className="p-3 bg-white/5 rounded-lg border border-dashed border-white/10">
              <p className="text-gray-400 text-sm text-center">
                Publish your program to configure Campaigns, Tasks, and Rewards visibility.
              </p>
            </div>
          )}
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Leaderboard Widget</p>
              <p className="text-sm text-gray-400">Display top fans leaderboard in sidebar</p>
            </div>
            <Switch
              checked={customizeData.showLeaderboard}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showLeaderboard: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Activity Feed</p>
              <p className="text-sm text-gray-400">Display recent activity and announcements</p>
            </div>
            <Switch
              checked={customizeData.showActivityFeed}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showActivityFeed: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Fan Stats Widget</p>
              <p className="text-sm text-gray-400">Display community stats and engagement metrics</p>
            </div>
            <Switch
              checked={customizeData.showFanWidget}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showFanWidget: checked })}
            />
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {/* ========== SHARED COMPONENTS (Both Modes) ========== */}

      {/* Program Content (Campaigns & Tasks) - Only shown after program is published */}
      {program.status === 'published' && (
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Program Content
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">Campaigns and tasks associated with this program</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaigns Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-400" />
                  Campaigns ({campaigns.length})
                </h3>
                <Button
                  onClick={() => window.location.href = '/creator-dashboard/campaigns'}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Campaign
                </Button>
              </div>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 text-sm">No campaigns associated with this program yet</p>
                  <p className="text-gray-500 text-xs mt-1">Create a campaign and assign it to this program</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {campaigns.map((campaign: any) => (
                    <Card key={campaign.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-sm">{campaign.name}</h4>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{campaign.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                className={`text-xs ${
                                  campaign.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}
                              >
                                {campaign.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* Tasks Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-indigo-400" />
                  Tasks ({tasks.length})
                </h3>
                <Button
                  onClick={() => window.location.href = '/creator-dashboard/tasks/create'}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                  <CheckSquare className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 text-sm">No tasks associated with this program yet</p>
                  <p className="text-gray-500 text-xs mt-1">Create a task and assign it to this program</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tasks.map((task: any) => (
                    <Card key={task.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">{task.name}</h4>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-1">{task.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-xs">
                                +{task.pointsToReward} pts
                              </Badge>
                              {task.isActive && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements Section */}
      <AnnouncementsManager programId={program.id} />

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          program={program}
          customizeData={customizeData}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Quick Setup Wizard */}
      <QuickSetupWizard
        isOpen={showQuickSetup}
        onClose={() => {
          setShowQuickSetup(false);
          localStorage.setItem(`quickSetup_${program.id}`, 'true');
        }}
        creatorType={creatorType}
        creatorName={user?.creator?.displayName || (user as { displayName?: string })?.displayName || (user as { name?: string })?.name || ''}
        onComplete={handleQuickSetupComplete}
        connectedPlatforms={connectedPlatforms}
        socialConnections={socialConnectionsData?.connections || []}
        recentlyConnected={recentlyConnected}
        connectingPlatform={connectingPlatform}
        onConnect={handleConnectPlatform}
      />

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {program.status === 'published' ? 'Update Published Program' : 'Publish Program'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {program.status === 'published' && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">
                  This program is already published at <strong>/programs/{program.slug}</strong>
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label className="text-white">Public URL Slug</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">/programs/</span>
                <Input
                  value={publishSlug}
                  onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="my-loyalty-program"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {program.status === 'published' 
                  ? 'Update the URL slug for your published program'
                  : 'This will be your program\'s public URL'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPublishDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onPublish(publishSlug);
                  setShowPublishDialog(false);
                }}
                className="bg-brand-primary hover:bg-brand-primary/80"
                disabled={!publishSlug}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {program.status === 'published' ? 'Update URL' : 'Publish Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateProgramModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsName: 'Points'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Program</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label className="text-white">Program Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="My Loyalty Program"
              required
            />
          </div>
          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Tell your fans what this program is about..."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-white">Points Name</Label>
            <Input
              value={formData.pointsName}
              onChange={(e) => setFormData({ ...formData, pointsName: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Points, Stars, Coins, etc."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
