/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi, queryClient } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Layers,
  Plus,
  Eye,
  Rocket,
  Save,
  AlertCircle,
  Megaphone,
  CheckSquare,
  Palette,
  Settings,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Globe,
  Gift,
  LayoutGrid,
  Info,
} from 'lucide-react';
import { FacebookSDKManager } from '@/lib/facebook';
import { socialManager } from '@/lib/social-integrations';
import { TwitterSDKManager } from '@/lib/twitter';
import { useToast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Program, Campaign, Task } from '@shared/schema';
import { type ThemeTemplate, type CreatorTypeForTheme } from '@shared/theme-templates';
// New simplified builder components
import {
  ProgramBuilderModeToggle,
  getSavedBuilderMode,
  type BuilderMode,
} from '@/components/program/program-builder-mode-toggle';
import { CollapsibleSection } from '@/components/program/collapsible-section';
import { QuickThemePicker } from '@/components/program/quick-theme-picker';
import { EssentialInfoSection } from '@/components/program/essential-info-section';
import { PlatformConnectionPriority } from '@/components/program/platform-connection-priority';
import {
  getCreatorTemplate,
  type CreatorType,
} from '@/components/program/creator-program-templates';
import { QuickSetupWizard, type QuickSetupData } from '@/components/program/quick-setup-wizard';
import { PreviewModal } from '@/components/program/preview-modal';
import { AnnouncementsManager } from '@/components/program/announcements-manager';
import {
  PageLayoutTemplates,
  layoutConfigToVisibility,
  type PageLayoutTemplate,
} from '@/components/program/page-layout-templates';
import {
  ProgramBrandingSection,
  ProgramCreatorDetails,
  ProgramVisibilitySection,
} from './program-builder-components';

interface ProgramWithDetails extends Program {
  campaigns?: Campaign[];
  tasks?: Task[];
}

export default function ProgramBuilderNew() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithDetails | null>(null);

  // Fetch programs (refetch aggressively so onboarding-created program appears immediately)
  const {
    data: programs = [],
    isLoading,
    refetch: refetchPrograms,
  } = useQuery<Program[]>({
    queryKey: ['/api/programs'],
    enabled: !!user,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
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
      const allCampaigns = await (response as any).json();
      // Filter campaigns by programId
      return allCampaigns.filter((c: Campaign) => c.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id && !!user?.creator?.id,
  });

  // Fetch tasks for the selected program
  const { data: programTasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/tasks/program/${selectedProgram?.id}`],
    queryFn: async () => {
      const response = await fetchApi('/api/tasks');
      const allTasks = await (response as any).json();
      // Filter tasks by programId
      return allTasks.filter((t: Task) => t.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id,
  });

  useEffect(() => {
    if (programDetails) {
      setSelectedProgram(programDetails);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync query cache to local state
  }, [programDetails]);

  // Select first program by default; refetch once if empty on mount (catches onboarding-created program)
  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0]);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize default selection
  }, [programs, selectedProgram]);

  // When programs is empty after load, refetch once (handles direct nav from onboarding)
  useEffect(() => {
    if (!isLoading && programs.length === 0 && user?.id) {
      const t = setTimeout(() => refetchPrograms(), 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, programs.length, user?.id, refetchPrograms]);

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (data: Partial<Program>) => {
      return fetchApi('/api/programs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newProgram) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      setIsCreateModalOpen(false);
      setSelectedProgram(newProgram as any);
    },
  });

  // Publish program mutation
  const publishProgramMutation = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      return fetchApi(`/api/programs/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ slug }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
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
            Your program is the foundation of your fan engagement system. Create a stunning public
            page that showcases your campaigns, tasks, and rewards all in one place.
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
  tasks = [],
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
  const _creatorTemplate = getCreatorTemplate(creatorType);

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [recentlyConnected, setRecentlyConnected] = useState<Set<string>>(new Set<string>());
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSlug, setPublishSlug] = useState(program.slug || '');

  // Page Layout template selection
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | undefined>(
    () => localStorage.getItem(`layout_${program.id}`) || undefined
  );

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
      accent: '#F59E0B',
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
    creatorDetails: (program.pageConfig?.creatorDetails || {}) as Record<
      string,
      Record<string, unknown>
    >,
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
        accent: '#F59E0B',
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
      creatorDetails: (program.pageConfig?.creatorDetails || {}) as Record<
        string,
        Record<string, unknown>
      >,
      location: program.pageConfig?.location || '',
    });
    setPublishSlug(program.slug || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync only on id/updatedAt change
  }, [program.id, program.updatedAt]);

  // Fetch social connections
  const { data: socialConnectionsData } = useQuery({
    queryKey: ['/api/social-connections'],
    queryFn: async () => {
      const response = await fetchApi('/api/social-connections');
      return response as any;
    },
  });

  const connectedPlatforms = new Set<string>(
    (socialConnectionsData as any)?.connections
      ?.map((c: { platform?: string }) => c.platform)
      .filter((p: unknown): p is string => typeof p === 'string') || []
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
      let result: {
        success: boolean;
        error?: string;
        user?: unknown;
        accessToken?: string;
        refreshToken?: string;
      };

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
                platformUserId: (result.user as any).id,
                platformUsername: String((result.user as any).username),
                platformDisplayName: String((result.user as any).name),
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                profileData: {
                  profileImageUrl: (result.user as any).profileImageUrl,
                  followersCount: (result.user as any).followersCount,
                  followingCount: (result.user as any).followingCount,
                },
              }),
            });
          } catch (saveErr) {
            console.warn(
              '[ProgramBuilder] Parent save failed (popup may have already saved):',
              saveErr
            );
          }
        }
      } else if (platformId === 'facebook') {
        result = await FacebookSDKManager.login(
          'pages_show_list,pages_read_engagement,business_management'
        );
        result.success = result.success && !!result.accessToken;
      } else {
        // Use socialManager for other platforms
        const api = (socialManager as any)[platformId as keyof typeof socialManager];
        if (!api) {
          console.warn('Unknown platform:', platformId);
          return;
        }
        result = await (api as any).secureLogin();
      }

      if (result.success) {
        setRecentlyConnected((prev) => new Set(prev).add(platformId));
        toast({
          title: `${platformName} Connected! +500 Points`,
          description: `Successfully connected your ${platformName} account`,
        });
        invalidateSocialConnections();
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || `Failed to connect ${platformName}`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection Failed',
        description: `An error occurred while connecting ${platformName}`,
        variant: 'destructive',
      });
    } finally {
      setConnectingPlatform(null);
    }
  };

  // Handler for QuickThemePicker theme selection
  const handleSelectTheme = (template: ThemeTemplate) => {
    setCustomizeData((prev) => ({
      ...prev,
      theme: template as ThemeTemplate,
      brandColors: {
        primary: template.colors.primary,
        secondary: template.colors.secondary,
        accent: template.colors.accent,
      },
    }));
    toast({
      title: 'Theme Applied',
      description: `${template.name} theme has been applied to your program.`,
    });
  };

  // Handler for EssentialInfoSection updates
  const handleEssentialInfoChange = (
    updates: Partial<{
      displayName: string;
      bio: string;
      pointsName: string;
      logo: string;
      headerImage: string;
    }>
  ) => {
    setCustomizeData((prev) => ({ ...prev, ...updates }));
    // Auto-save when images are uploaded or removed (don't wait for manual Save click)
    if ('logo' in updates || 'headerImage' in updates) {
      const saveData = buildSaveData(updates);
      updateProgramMutation.mutate(saveData);
    }
  };

  // Handler for QuickSetupWizard completion
  const handleQuickSetupComplete = (data: QuickSetupData) => {
    // Apply the wizard data
    const updates: Partial<typeof customizeData> = {
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

    setCustomizeData((prev) => ({ ...prev, ...updates }));

    // Mark wizard as seen for this program
    localStorage.setItem(`quickSetup_${program.id}`, 'true');

    toast({
      title: 'Setup Complete!',
      description: "Your program has been configured. Don't forget to save your changes.",
    });
  };

  // Handler for page layout template selection
  const handleSelectLayout = (template: PageLayoutTemplate) => {
    setSelectedLayoutId(template.id);
    localStorage.setItem(`layout_${program.id}`, template.id);

    // Convert layout config to visibility settings
    const visibility = layoutConfigToVisibility(template.config);
    setCustomizeData((prev) => ({
      ...prev,
      showProfile: visibility.showProfile ?? true,
      showCampaigns: visibility.showCampaigns ?? true,
      showTasks: visibility.showTasks ?? true,
      showRewards: visibility.showRewards ?? true,
      showLeaderboard: visibility.showLeaderboard ?? true,
      showActivityFeed: visibility.showActivityFeed ?? true,
      showFanWidget: visibility.showFanWidget ?? true,
    }));

    toast({
      title: 'Layout Applied',
      description: `"${template.name}" layout has been applied. Save to keep changes.`,
    });
  };

  const updateProgramMutation = useMutation({
    mutationFn: async (data: Partial<Program>) => {
      return fetchApi(`/api/programs/${program.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${program.id}`] });
      onUpdate();
      toast({
        title: 'Changes Saved',
        description: 'Your program has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Error saving program:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save program changes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Build the full save payload from current customizeData (or with overrides)
  const buildSaveData = (overrides: Partial<typeof customizeData> = {}) => {
    const merged = { ...customizeData, ...overrides };
    // For content creators, auto-merge mainContentPlatforms from connected integrations
    let creatorDetails = merged.creatorDetails;
    if (creatorType === 'content_creator' && connectedPlatforms.size > 0) {
      creatorDetails = {
        ...creatorDetails,
        contentCreator: {
          ...(creatorDetails?.contentCreator ?? {}),
          mainContentPlatforms: Array.from(connectedPlatforms),
        },
      };
    }
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
        creatorDetails,
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
        },
      },
    };
  };

  // Auto-save a specific image field immediately after upload
  const handleImageUpload = (field: 'headerImage' | 'logo', url: string) => {
    // Update local state
    setCustomizeData((prev) => ({ ...prev, [field]: url }));
    // Auto-save to backend so the image persists immediately
    const saveData = buildSaveData({ [field]: url });
    updateProgramMutation.mutate(saveData);
  };

  // Remove an image field and auto-save
  const handleImageRemove = (field: 'headerImage' | 'logo') => {
    setCustomizeData((prev) => ({ ...prev, [field]: '' }));
    const saveData = buildSaveData({ [field]: '' });
    updateProgramMutation.mutate(saveData);
  };

  const handleSave = () => {
    const saveData = buildSaveData();

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
                  <>
                    <Rocket className="h-3 w-3 mr-1" /> Published
                  </>
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
              <ProgramBuilderModeToggle mode={builderMode} onModeChange={setBuilderMode} />

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

          {/* Page Layout Templates */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <PageLayoutTemplates
                creatorType={creatorType}
                currentLayoutId={selectedLayoutId}
                onSelect={handleSelectLayout}
              />
            </CardContent>
          </Card>

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
              socialConnections={(socialConnectionsData as any)?.connections || []}
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
            <ProgramCreatorDetails
              creatorType={creatorType}
              location={(customizeData as any).location}
              creatorDetails={(customizeData as any).creatorDetails}
              onLocationChange={(location) => setCustomizeData({ ...customizeData, location })}
              onCreatorDetailsChange={(creatorDetails) =>
                setCustomizeData({ ...customizeData, creatorDetails: creatorDetails as any })
              }
              connectedPlatformIds={Array.from(connectedPlatforms)}
            />
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
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, primary: e.target.value },
                      })
                    }
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.primary}
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, primary: e.target.value },
                      })
                    }
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
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, secondary: e.target.value },
                      })
                    }
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.secondary}
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, secondary: e.target.value },
                      })
                    }
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
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, accent: e.target.value },
                      })
                    }
                    className="w-12 h-10 rounded border-2 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={customizeData.brandColors.accent}
                    onChange={(e) =>
                      setCustomizeData({
                        ...customizeData,
                        brandColors: { ...customizeData.brandColors, accent: e.target.value },
                      })
                    }
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
                  onCheckedChange={(checked) =>
                    setCustomizeData({ ...customizeData, showProfile: checked })
                  }
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
                      onCheckedChange={(checked) =>
                        setCustomizeData({ ...customizeData, showCampaigns: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Show Tasks</p>
                      <p className="text-sm text-gray-400">Display available tasks</p>
                    </div>
                    <Switch
                      checked={customizeData.showTasks}
                      onCheckedChange={(checked) =>
                        setCustomizeData({ ...customizeData, showTasks: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Show Rewards</p>
                      <p className="text-sm text-gray-400">Display reward store</p>
                    </div>
                    <Switch
                      checked={customizeData.showRewards}
                      onCheckedChange={(checked) =>
                        setCustomizeData({ ...customizeData, showRewards: checked })
                      }
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
                  onCheckedChange={(checked) =>
                    setCustomizeData({ ...customizeData, showLeaderboard: checked })
                  }
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
                  onChange={(e) =>
                    setCustomizeData({ ...customizeData, displayName: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="My Loyalty Program"
                />
              </div>
              <div>
                <Label className="text-white">Points Name</Label>
                <Input
                  value={customizeData.pointsName}
                  onChange={(e) =>
                    setCustomizeData({ ...customizeData, pointsName: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="Points, Stars, Coins, etc."
                />
                <p className="text-xs text-gray-400 mt-1">
                  What you&apos;ll call the rewards fans earn (e.g., &quot;Thunder Points&quot;,
                  &quot;Luna Coins&quot;)
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
              <p className="text-sm text-gray-400">
                Customize your program&apos;s banner and logo (separate from your personal profile)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-white mb-3 block">Banner Image</Label>
                <p className="text-sm text-gray-400 mb-3">
                  This banner will appear at the top of your program page. If not set, your creator
                  profile banner will be used.
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
                  This logo will appear as your program&apos;s profile picture. If not set, your
                  creator profile photo will be used.
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
                  <strong>Tip:</strong> Use program-specific images to differentiate your loyalty
                  program from your personal brand. Leave blank to use your creator profile images.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Social Connections - Use shared component */}
          <PlatformConnectionPriority
            creatorType={creatorType}
            connectedPlatforms={connectedPlatforms}
            socialConnections={(socialConnectionsData as any)?.connections || []}
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
                  onChange={(e) =>
                    setCustomizeData({
                      ...customizeData,
                      socialLinks: { ...customizeData.socialLinks, website: e.target.value },
                    })
                  }
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

          {/* Brand Colors and Page Theme */}
          <ProgramBrandingSection
            brandColors={customizeData.brandColors}
            theme={customizeData.theme}
            onBrandColorsChange={(brandColors) =>
              setCustomizeData({ ...customizeData, brandColors })
            }
            onThemeChange={(theme) => setCustomizeData({ ...customizeData, theme })}
          />

          {/* Page Visibility */}
          <ProgramVisibilitySection
            isProgramPublished={program.status === 'published'}
            showProfile={customizeData.showProfile}
            showCampaigns={customizeData.showCampaigns}
            showTasks={customizeData.showTasks}
            showRewards={customizeData.showRewards}
            showLeaderboard={customizeData.showLeaderboard}
            showActivityFeed={customizeData.showActivityFeed}
            showFanWidget={customizeData.showFanWidget}
            profileData={customizeData.profileData}
            onShowProfileChange={(showProfile) =>
              setCustomizeData({ ...customizeData, showProfile })
            }
            onShowCampaignsChange={(showCampaigns) =>
              setCustomizeData({ ...customizeData, showCampaigns })
            }
            onShowTasksChange={(showTasks) => setCustomizeData({ ...customizeData, showTasks })}
            onShowRewardsChange={(showRewards) =>
              setCustomizeData({ ...customizeData, showRewards })
            }
            onShowLeaderboardChange={(showLeaderboard) =>
              setCustomizeData({ ...customizeData, showLeaderboard })
            }
            onShowActivityFeedChange={(showActivityFeed) =>
              setCustomizeData({ ...customizeData, showActivityFeed })
            }
            onShowFanWidgetChange={(showFanWidget) =>
              setCustomizeData({ ...customizeData, showFanWidget })
            }
            onProfileDataChange={(profileData) =>
              setCustomizeData({ ...customizeData, profileData })
            }
          />
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
                <p className="text-sm text-gray-400 mt-1">
                  Campaigns and tasks associated with this program
                </p>
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
                  onClick={() => (window.location.href = '/creator-dashboard/campaigns')}
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
                  <p className="text-gray-400 text-sm">
                    No campaigns associated with this program yet
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Create a campaign and assign it to this program
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-sm">{campaign.name}</h4>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                              {campaign.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                className={`text-xs ${
                                  campaign.status === 'active'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : campaign.status === 'draft'
                                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
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
                  onClick={() => (window.location.href = '/creator-dashboard/tasks/create')}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Create a task and assign it to this program
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tasks.map((task) => (
                    <Card key={task.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">{task.name}</h4>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                              {task.description}
                            </p>
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
        creatorName={
          user?.creator?.displayName ||
          (user as { displayName?: string })?.displayName ||
          (user as { name?: string })?.name ||
          ''
        }
        onComplete={handleQuickSetupComplete}
        connectedPlatforms={connectedPlatforms}
        socialConnections={(socialConnectionsData as any)?.connections || []}
        recentlyConnected={recentlyConnected}
        connectingPlatform={connectingPlatform}
        onConnect={handleConnectPlatform}
      />

      {/* Publish Dialog */}
      <PublishDialog
        program={program}
        publishSlug={publishSlug}
        setPublishSlug={setPublishSlug}
        showPublishDialog={showPublishDialog}
        setShowPublishDialog={setShowPublishDialog}
        onPublish={onPublish}
        customizeData={customizeData}
        creatorType={creatorType}
        connectedPlatforms={connectedPlatforms}
      />
    </div>
  );
}

function CreateProgramModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Program>) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsName: 'Points',
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

type CreatorType = 'athlete' | 'musician' | 'content_creator';

interface PublishRequirement {
  label: string;
  met: boolean;
}

function getPublishRequirements(
  customizeData: Record<string, any>,
  creatorType: CreatorType,
  connectedPlatforms: Set<string>
): PublishRequirement[] {
  const reqs: PublishRequirement[] = [
    { label: 'Program Name', met: !!customizeData.displayName?.trim() },
    { label: 'Bio / Description', met: !!customizeData.bio?.trim() },
    { label: 'Profile Image (Logo)', met: !!customizeData.logo },
  ];

  const cd = customizeData.creatorDetails || {};

  if (creatorType === 'athlete') {
    reqs.push({ label: 'Sport', met: !!cd.athlete?.sport });
    reqs.push({
      label: 'Education Level',
      met: !!(cd.athlete?.education?.level || cd.athlete?.education),
    });
  } else if (creatorType === 'musician') {
    reqs.push({ label: 'Artist / Band Name', met: !!cd.musician?.bandArtistName });
    reqs.push({ label: 'Artist Type', met: !!cd.musician?.artistType });
    reqs.push({ label: 'Music Genre', met: !!cd.musician?.musicGenre });
    reqs.push({ label: 'Music Catalog URL', met: !!cd.musician?.musicCatalogUrl });
  } else if (creatorType === 'content_creator') {
    const cc = cd.contentCreator || {};
    reqs.push({
      label: 'Content Type',
      met: Array.isArray(cc.contentType) ? cc.contentType.length > 0 : !!cc.contentType,
    });
    reqs.push({
      label: 'Topics of Focus',
      met: Array.isArray(cc.topicsOfFocus) ? cc.topicsOfFocus.length > 0 : !!cc.topicsOfFocus,
    });
    reqs.push({ label: 'About Me', met: !!cc.aboutMe?.trim() });
  }

  reqs.push({
    label: 'At least 1 connected social account',
    met: connectedPlatforms.size >= 1,
  });

  return reqs;
}

function PublishDialog({
  program,
  publishSlug,
  setPublishSlug,
  showPublishDialog,
  setShowPublishDialog,
  onPublish,
  customizeData,
  creatorType,
  connectedPlatforms,
}: {
  program: ProgramWithDetails;
  publishSlug: string;
  setPublishSlug: (v: string) => void;
  showPublishDialog: boolean;
  setShowPublishDialog: (v: boolean) => void;
  onPublish: (slug: string) => void;
  customizeData: Record<string, any>;
  creatorType: CreatorType;
  connectedPlatforms: Set<string>;
}) {
  const isAlreadyPublished = program.status === 'published';
  const requirements = getPublishRequirements(customizeData, creatorType, connectedPlatforms);
  const allMet = requirements.every((r) => r.met);
  const canPublish = isAlreadyPublished ? !!publishSlug : !!publishSlug && allMet;

  return (
    <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isAlreadyPublished ? 'Update Published Program' : 'Publish Program'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {isAlreadyPublished && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <Check className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                This program is already published at <strong>/programs/{program.slug}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Publish Requirements Checklist (only for first publish) */}
          {!isAlreadyPublished && (
            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">Publish Requirements</Label>
              <div className="space-y-1.5 bg-white/5 rounded-lg p-3">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className={req.met ? 'text-gray-300' : 'text-red-300'}>{req.label}</span>
                  </div>
                ))}
              </div>
              {!allMet && (
                <p className="text-xs text-red-400">
                  Please complete all requirements before publishing.
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-white">Public URL Slug</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-400 text-sm">/programs/</span>
              <Input
                value={publishSlug}
                onChange={(e) =>
                  setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                className="bg-white/5 border-white/10 text-white"
                placeholder="my-loyalty-program"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isAlreadyPublished
                ? 'Update the URL slug for your published program'
                : 'This will be your program&apos;s public URL'}
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
              disabled={!canPublish}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {isAlreadyPublished ? 'Update URL' : 'Publish Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
