import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  Share2, 
  Users,
  Trophy,
  Target,
  Gift,
  User,
  Megaphone,
  CheckSquare,
  ExternalLink,
  Twitter,
  Instagram,
  MessageCircle,
  Globe
} from "lucide-react";
import type { Program, Creator, Task, Campaign } from "@shared/schema";
import { FanTaskCard } from "@/components/tasks/FanTaskCard";
import { useUserTaskCompletions } from "@/hooks/useTaskCompletion";
import { ActivityFeed } from "@/components/program/activity-feed";
import { 
  YourStatsWidget,
  LeaderboardWidget, 
  ActiveCampaignsWidget, 
  ActiveTasksWidget,
  FanStatsWidget 
} from "@/components/program/widgets";
import { transformImageUrl } from "@/lib/image-utils";
import { getThemeColors, isDarkTheme } from "@/lib/theme-utils";
import { useAuth } from "@/hooks/use-auth";

interface ProgramPublicData extends Program {
  creator: {
    id: string;
    displayName: string;
    bio?: string;
    imageUrl?: string;
    bannerImage?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      discord?: string;
      facebook?: string;
    };
  };
  campaigns: Campaign[];
  tasks: Task[];
}

export default function ProgramPublic() {
  const params = useParams<{ slug?: string; programId?: string }>();
  const slug = params.slug;
  const programId = params.programId; // For preview mode
  const isPreviewMode = !!programId; // Preview uses programId instead of slug
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'campaigns' | 'tasks' | 'rewards'>('dashboard');
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Fetch program public data (or preview data)
  const { data: programData, isLoading } = useQuery<ProgramPublicData>({
    queryKey: isPreviewMode
      ? [`/api/programs/${programId}/preview`]
      : [`/api/programs/public/${slug}`],
    queryFn: async () => {
      const endpoint = isPreviewMode
        ? `/api/programs/${programId}/preview`
        : `/api/programs/public/${slug}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch program data');
      }
      return response.json();
    },
    enabled: !!(slug || programId),
  });

  // Inject CSS variables for branding (Phase 1: Enhanced Theming)
  // IMPORTANT: This must be called BEFORE any conditional returns to avoid hooks error
  useEffect(() => {
    if (!programData) return;

    const root = document.documentElement;
    const theme = programData.pageConfig?.theme;
    const brandColors = programData.pageConfig?.brandColors || { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B' };

    console.log('🎨 [FRONTEND] Applying theme CSS variables');
    console.log('🎨 [FRONTEND] Theme object:', theme);
    console.log('🎨 [FRONTEND] Brand colors:', brandColors);

    // === COLORS ===
    // Check for Phase 1 enhanced theme structure
    if (theme?.colors) {
      console.log('✨ [FRONTEND] Using Phase 1 enhanced theme structure');
      // Brand colors
      root.style.setProperty('--color-primary', theme.colors.primary ?? '');
      root.style.setProperty('--color-secondary', theme.colors.secondary ?? '');
      root.style.setProperty('--color-accent', theme.colors.accent ?? '');

      // Surface colors
      root.style.setProperty('--color-background', theme.colors.background ?? '');
      root.style.setProperty('--color-surface', theme.colors.surface ?? '');
      root.style.setProperty('--color-surface-hover', theme.colors.surfaceHover ?? '');

      // Text colors
      root.style.setProperty('--color-text-primary', theme.colors.text?.primary ?? '');
      root.style.setProperty('--color-text-secondary', theme.colors.text?.secondary ?? '');
      root.style.setProperty('--color-text-tertiary', theme.colors.text?.tertiary ?? '');

      // UI state colors
      root.style.setProperty('--color-border', theme.colors.border ?? '');
      root.style.setProperty('--color-success', theme.colors.success ?? '');
      root.style.setProperty('--color-warning', theme.colors.warning ?? '');
      root.style.setProperty('--color-error', theme.colors.error ?? '');
      root.style.setProperty('--color-info', theme.colors.info ?? '');
    } else {
      console.log('📦 [FRONTEND] Using Phase 0 basic theme structure');
      // Fallback to Phase 0 basic colors for backward compatibility
      if (brandColors.primary) {
        root.style.setProperty('--color-primary', brandColors.primary);
        root.style.setProperty('--color-brand-primary', brandColors.primary);
      }
      if (brandColors.secondary) {
        root.style.setProperty('--color-secondary', brandColors.secondary);
        root.style.setProperty('--color-brand-secondary', brandColors.secondary);
      }
      if (brandColors.accent) {
        root.style.setProperty('--color-accent', brandColors.accent);
        root.style.setProperty('--color-brand-accent', brandColors.accent);
      }

      // Phase 0: Apply backgroundColor and textColor if provided
      if (theme?.backgroundColor) {
        root.style.setProperty('--color-background', theme.backgroundColor);
        console.log('🎨 [FRONTEND] Set background color:', theme.backgroundColor);
      }
      if (theme?.textColor) {
        root.style.setProperty('--color-text-primary', theme.textColor);
        console.log('🎨 [FRONTEND] Set text color:', theme.textColor);
      }
    }

    // === TYPOGRAPHY ===
    if (theme?.typography) {
      // Font families
      if (theme.typography.fontFamily) {
        root.style.setProperty('--font-heading', theme.typography.fontFamily.heading ?? '');
        root.style.setProperty('--font-body', theme.typography.fontFamily.body ?? '');
        root.style.setProperty('--font-mono', theme.typography.fontFamily.mono ?? '');
      }

      // Font sizes
      if (theme.typography.fontSize) {
        const fs = theme.typography.fontSize;
        root.style.setProperty('--font-size-xs', fs.xs ?? '');
        root.style.setProperty('--font-size-sm', fs.sm ?? '');
        root.style.setProperty('--font-size-base', fs.base ?? '');
        root.style.setProperty('--font-size-lg', fs.lg ?? '');
        root.style.setProperty('--font-size-xl', fs.xl ?? '');
        root.style.setProperty('--font-size-2xl', (fs as Record<string, string>)['2xl'] ?? '');
        root.style.setProperty('--font-size-3xl', (fs as Record<string, string>)['3xl'] ?? '');
        root.style.setProperty('--font-size-4xl', (fs as Record<string, string>)['4xl'] ?? '');
        root.style.setProperty('--font-size-5xl', (fs as Record<string, string>)['5xl'] ?? '');
      }

      // Font weights
      if (theme.typography.fontWeight) {
        const fw = theme.typography.fontWeight;
        root.style.setProperty('--font-weight-light', String(fw.light ?? ''));
        root.style.setProperty('--font-weight-normal', String(fw.normal ?? ''));
        root.style.setProperty('--font-weight-medium', String(fw.medium ?? ''));
        root.style.setProperty('--font-weight-semibold', String(fw.semibold ?? ''));
        root.style.setProperty('--font-weight-bold', String(fw.bold ?? ''));
        root.style.setProperty('--font-weight-extrabold', String(fw.extrabold ?? ''));
      }

      // Line heights
      if (theme.typography.lineHeight) {
        const lh = theme.typography.lineHeight;
        root.style.setProperty('--line-height-tight', String(lh.tight ?? ''));
        root.style.setProperty('--line-height-normal', String(lh.normal ?? ''));
        root.style.setProperty('--line-height-relaxed', String(lh.relaxed ?? ''));
        root.style.setProperty('--line-height-loose', String(lh.loose ?? ''));
      }
    }

    // === LAYOUT ===
    if (theme?.layout) {
      // Border radius
      if (theme.layout.borderRadius) {
        const br = theme.layout.borderRadius as Record<string, string>;
        root.style.setProperty('--border-radius-none', br.none ?? '');
        root.style.setProperty('--border-radius-sm', br.sm ?? '');
        root.style.setProperty('--border-radius-md', br.md ?? '');
        root.style.setProperty('--border-radius-lg', br.lg ?? '');
        root.style.setProperty('--border-radius-xl', br.xl ?? '');
        root.style.setProperty('--border-radius-2xl', br['2xl'] ?? '');
        root.style.setProperty('--border-radius-full', br.full ?? '');
      }

      // Spacing scale
      if (theme.layout?.spacing && typeof theme.layout.spacing === 'object' && theme.layout.spacing !== null && 'scale' in theme.layout.spacing) {
        root.style.setProperty('--spacing-scale', String((theme.layout.spacing as { scale?: number }).scale));
      }

      // Shadows
      const shadow = theme.layout?.shadow as { sm?: string; md?: string; lg?: string; xl?: string; inner?: string } | undefined;
      if (shadow) {
        root.style.setProperty('--shadow-sm', shadow.sm ?? '');
        root.style.setProperty('--shadow-md', shadow.md ?? '');
        root.style.setProperty('--shadow-lg', shadow.lg ?? '');
        root.style.setProperty('--shadow-xl', shadow.xl ?? '');
        root.style.setProperty('--shadow-inner', shadow.inner ?? '');
      }
    }

    // Cleanup on unmount - remove all CSS variables
    return () => {
      // Colors
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-surface');
      root.style.removeProperty('--color-surface-hover');
      root.style.removeProperty('--color-text-primary');
      root.style.removeProperty('--color-text-secondary');
      root.style.removeProperty('--color-text-tertiary');
      root.style.removeProperty('--color-border');
      root.style.removeProperty('--color-success');
      root.style.removeProperty('--color-warning');
      root.style.removeProperty('--color-error');
      root.style.removeProperty('--color-info');
      // Legacy Phase 0 colors
      root.style.removeProperty('--color-brand-primary');
      root.style.removeProperty('--color-brand-secondary');
      root.style.removeProperty('--color-brand-accent');

      // Typography
      root.style.removeProperty('--font-heading');
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--font-mono');
      root.style.removeProperty('--font-size-xs');
      root.style.removeProperty('--font-size-sm');
      root.style.removeProperty('--font-size-base');
      root.style.removeProperty('--font-size-lg');
      root.style.removeProperty('--font-size-xl');
      root.style.removeProperty('--font-size-2xl');
      root.style.removeProperty('--font-size-3xl');
      root.style.removeProperty('--font-size-4xl');
      root.style.removeProperty('--font-size-5xl');
      root.style.removeProperty('--font-weight-light');
      root.style.removeProperty('--font-weight-normal');
      root.style.removeProperty('--font-weight-medium');
      root.style.removeProperty('--font-weight-semibold');
      root.style.removeProperty('--font-weight-bold');
      root.style.removeProperty('--font-weight-extrabold');
      root.style.removeProperty('--line-height-tight');
      root.style.removeProperty('--line-height-normal');
      root.style.removeProperty('--line-height-relaxed');
      root.style.removeProperty('--line-height-loose');

      // Layout
      root.style.removeProperty('--border-radius-none');
      root.style.removeProperty('--border-radius-sm');
      root.style.removeProperty('--border-radius-md');
      root.style.removeProperty('--border-radius-lg');
      root.style.removeProperty('--border-radius-xl');
      root.style.removeProperty('--border-radius-2xl');
      root.style.removeProperty('--border-radius-full');
      root.style.removeProperty('--spacing-scale');
      root.style.removeProperty('--shadow-sm');
      root.style.removeProperty('--shadow-md');
      root.style.removeProperty('--shadow-lg');
      root.style.removeProperty('--shadow-xl');
      root.style.removeProperty('--shadow-inner');
    };
  }, [programData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Program Not Found</h2>
          <p className="text-gray-400 mb-6">The program page you're looking for doesn't exist.</p>
          <Link href="/find-creators">
            <Button variant="outline" className="border-brand-primary text-brand-primary">
              Browse Creators
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { creator, campaigns, tasks } = programData;
  
  // Prioritize program-specific images over creator profile images
  const bannerImage = programData.pageConfig?.headerImage || creator.bannerImage;
  const profileImage = programData.pageConfig?.logo || creator.imageUrl;
  
  const brandColors = programData.pageConfig?.brandColors || { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B' };
  const socialLinks = programData.pageConfig?.socialLinks || creator.socialLinks || {};
  
  // Get visibility settings from pageConfig
  const visibility = programData.pageConfig?.visibility || {
    showProfile: true,
    showCampaigns: true,
    showTasks: true,
    showRewards: true,
    showLeaderboard: true,
    showActivityFeed: true,
    showFanWidget: true,
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const activeTasks = tasks.filter(t => !t.isDraft && t.isActive);

  // Transform image URLs
  const profileImageUrl = transformImageUrl(profileImage);
  const bannerImageUrl = transformImageUrl(bannerImage);

  // Get theme colors
  const themeColors = getThemeColors(programData.pageConfig?.theme);
  const isThemeDark = isDarkTheme(programData.pageConfig?.theme);

  // Memoize style objects to prevent unnecessary re-renders
  const styles = useMemo(() => ({
    container: { backgroundColor: themeColors.background },
    gradientBanner: {
      background: `linear-gradient(135deg, ${brandColors.primary || '#6366f1'}, ${brandColors.secondary || '#8b5cf6'})`
    },
    gradientOverlay: { color: themeColors.background },
    avatar: { borderColor: themeColors.background, backgroundColor: themeColors.background },
    textPrimary: { color: themeColors.text.primary },
    textSecondary: { color: themeColors.text.secondary },
    textTertiary: { color: themeColors.text.tertiary },
    primaryBadge: {
      backgroundColor: brandColors.primary + '20',
      color: brandColors.primary,
      borderColor: brandColors.primary + '40',
    },
    secondaryBadge: {
      backgroundColor: brandColors.secondary + '20',
      color: brandColors.secondary,
      borderColor: brandColors.secondary + '40',
    },
    accentBadge: {
      backgroundColor: brandColors.accent + '20',
      color: brandColors.accent,
      borderColor: brandColors.accent + '40',
    },
    outlineButton: {
      borderColor: isThemeDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      color: themeColors.text.primary,
    },
    tabsList: {
      backgroundColor: isThemeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderColor: isThemeDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    },
    card: {
      backgroundColor: isThemeDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
      borderColor: isThemeDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
    },
  }), [themeColors, brandColors, isThemeDark]);

  // Debug logging
  console.log('[ProgramPublic] Image URLs:', {
    programLogo: programData.pageConfig?.logo,
    programBanner: programData.pageConfig?.headerImage,
    creatorImage: creator.imageUrl,
    creatorBanner: creator.bannerImage,
    finalProfile: profileImageUrl,
    finalBanner: bannerImageUrl
  });
  console.log('[ProgramPublic] Theme:', {
    theme: programData.pageConfig?.theme,
    colors: themeColors,
    isDark: isThemeDark
  });
  console.log('[ProgramPublic] Brand Colors Injected:', brandColors);

  return (
    <div className="min-h-screen" style={styles.container}>
      {/* Hero Banner Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-brand-primary to-brand-secondary overflow-hidden">
        {bannerImageUrl ? (
          <img 
            src={bannerImageUrl} 
            className="w-full h-full object-cover" 
            alt="Program banner"
          />
        ) : (
          <div 
            className="w-full h-full" 
            style={styles.gradientBanner}
          />
        )}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-current" 
          style={styles.gradientOverlay}
        ></div>
      </div>

      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
          <Avatar 
            className="w-32 h-32 border-4 shadow-xl" 
            style={styles.avatar}
          >
            <AvatarImage src={profileImageUrl || undefined} alt={creator.displayName} />
            <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-3xl font-bold">
              {programData.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left pb-4">
            <h1 
              className="text-3xl md:text-4xl font-bold mb-2"
              style={styles.textPrimary}
            >
              {programData.name}
            </h1>
            <p 
              className="mb-4 max-w-2xl"
              style={styles.textSecondary}
            >
              {programData.description}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
              <Badge style={styles.primaryBadge}>
                <Trophy className="h-3 w-3 mr-1" />
                {programData.pointsName}
              </Badge>
              <Badge style={styles.secondaryBadge}>
                <Megaphone className="h-3 w-3 mr-1" />
                {activeCampaigns.length} Active Campaigns
              </Badge>
              <Badge style={styles.accentBadge}>
                <CheckSquare className="h-3 w-3 mr-1" />
                {activeTasks.length} Tasks
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Button 
                onClick={() => setIsEnrolled(!isEnrolled)}
                className={isEnrolled ? "" : "text-white"}
                style={isEnrolled ? {
                  backgroundColor: isThemeDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: themeColors.text.primary
                } : {
                  backgroundColor: brandColors.primary,
                }}
              >
                {isEnrolled ? (
                  <>
                    <Heart className="h-4 w-4 mr-2 fill-current" />
                    Enrolled
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Enroll
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                style={{...styles.outlineButton, backgroundColor: 'transparent'}}
                className="hover:opacity-80"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {/* Social Links */}
              {socialLinks.twitter && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-brand-primary/10"
                  style={styles.textTertiary}
                  onClick={() => window.open(socialLinks.twitter, '_blank')}
                >
                  <Twitter className="h-5 w-5" />
                </Button>
              )}
              {socialLinks.instagram && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-brand-primary/10"
                  style={styles.textTertiary}
                  onClick={() => window.open(socialLinks.instagram, '_blank')}
                >
                  <Instagram className="h-5 w-5" />
                </Button>
              )}
              {socialLinks.discord && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-brand-primary/10"
                  style={styles.textTertiary}
                  onClick={() => window.open(socialLinks.discord, '_blank')}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              )}
              {(socialLinks as { website?: string }).website && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-brand-primary/10"
                  style={styles.textTertiary}
                  onClick={() => window.open((socialLinks as { website?: string }).website, '_blank')}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-8">
          <TabsList 
            className="w-full justify-start border-b"
            style={styles.tabsList}
          >
            {visibility.showActivityFeed && (
              <TabsTrigger 
                value="dashboard"
                style={styles.textSecondary}
                className="data-[state=active]:text-white"
                data-active-bg={brandColors.primary}
              >
                <style>{`
                  [data-active-bg="${brandColors.primary}"][data-state="active"] {
                    background-color: ${brandColors.primary} !important;
                    color: white !important;
                  }
                `}</style>
                Dashboard
              </TabsTrigger>
            )}
            {visibility.showProfile && (
              <TabsTrigger 
                value="profile"
                style={styles.textSecondary}
                className="data-[state=active]:text-white"
                data-active-bg={brandColors.primary}
              >
                <style>{`
                  [data-active-bg="${brandColors.primary}"][data-state="active"] {
                    background-color: ${brandColors.primary} !important;
                    color: white !important;
                  }
                `}</style>
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
            )}
            {visibility.showCampaigns && (
              <TabsTrigger 
                value="campaigns"
                style={styles.textSecondary}
                className="data-[state=active]:text-white"
                data-active-bg={brandColors.primary}
              >
                <style>{`
                  [data-active-bg="${brandColors.primary}"][data-state="active"] {
                    background-color: ${brandColors.primary} !important;
                    color: white !important;
                  }
                `}</style>
                <Megaphone className="h-4 w-4 mr-2" />
                Campaigns
              </TabsTrigger>
            )}
            {visibility.showTasks && (
              <TabsTrigger 
                value="tasks"
                style={styles.textSecondary}
                className="data-[state=active]:text-white"
                data-active-bg={brandColors.primary}
              >
                <style>{`
                  [data-active-bg="${brandColors.primary}"][data-state="active"] {
                    background-color: ${brandColors.primary} !important;
                    color: white !important;
                  }
                `}</style>
                <Target className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
            )}
            {visibility.showRewards && (
              <TabsTrigger 
                value="rewards"
                style={styles.textSecondary}
                className="data-[state=active]:text-white"
                data-active-bg={brandColors.primary}
              >
                <style>{`
                  [data-active-bg="${brandColors.primary}"][data-state="active"] {
                    background-color: ${brandColors.primary} !important;
                    color: white !important;
                  }
                `}</style>
                <Gift className="h-4 w-4 mr-2" />
                Rewards
              </TabsTrigger>
            )}
          </TabsList>

          {/* Main Content Area with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-12">
            {/* Main Feed (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <TabsContent value="dashboard" className="mt-0">
                <ActivityFeed 
                  programId={programData.id} 
                  creatorName={creator.displayName}
                  creatorAvatar={creator.imageUrl ?? undefined}
                />
              </TabsContent>

              <TabsContent value="profile" className="mt-0">
                <ProfileTab program={programData} creator={creator} />
              </TabsContent>

              <TabsContent value="campaigns" className="mt-0">
                <CampaignsTab campaigns={campaigns} pointsName={programData.pointsName ?? 'Points'} />
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <TasksTab 
                  tasks={tasks} 
                  pointsName={programData.pointsName ?? 'Points'}
                  themeColors={themeColors}
                  brandColors={brandColors}
                  isThemeDark={isThemeDark}
                />
              </TabsContent>

              <TabsContent value="rewards" className="mt-0">
                <RewardsTab programId={programData.id} />
              </TabsContent>
            </div>

            {/* Right Sidebar Widgets (1/3 width) */}
            <div className="space-y-6">
              {/* Your Stats - Always show for logged-in users */}
              <YourStatsWidget
                programId={programData.id}
                pointsName={programData.pointsName || 'Points'}
                themeColors={themeColors}
                brandColors={brandColors}
                isThemeDark={isThemeDark}
              />
              
              {visibility.showFanWidget && (
                <FanStatsWidget 
                  fanCount={0} 
                  activeCampaigns={activeCampaigns.length}
                />
              )}
              {visibility.showLeaderboard && (
                <LeaderboardWidget programId={programData.id} />
              )}
              {visibility.showCampaigns && activeCampaigns.length > 0 && (
                <ActiveCampaignsWidget campaigns={campaigns} />
              )}
              {visibility.showTasks && activeTasks.length > 0 && (
                <ActiveTasksWidget tasks={tasks} />
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ program, creator }: { program: ProgramPublicData; creator: any }) {
  const { user } = useAuth();
  
  // Fetch social task completions for the current user
  const { data: socialCompletions = {} } = useQuery<Record<string, { completed: boolean; completedAt?: Date }>>({
    queryKey: [`/api/programs/${program.id}/social-task-completions`],
    enabled: !!user?.id,
  });

  // Get granular visibility settings
  const profileVisibility = program.pageConfig?.visibility?.profileData || {
    showBio: true,
    showSocialLinks: true,
    showTiers: true,
    showVerificationBadge: true,
  };

  // Transform image URL
  const creatorImageUrl = transformImageUrl(creator.imageUrl);

  return (
    <div className="space-y-6">
      {/* Program Information Card */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">About {program.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Only show description if bio visibility is enabled */}
          {profileVisibility.showBio && program.description && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">Program Description</h3>
              <p className="text-gray-700">{program.description}</p>
            </div>
          )}

          {profileVisibility.showBio && program.description && <Separator className="bg-gray-200" />}

          {/* Program Stats */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Program Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-xs">Points Name</p>
                <p className="text-gray-900 font-semibold">{program.pointsName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-xs">Status</p>
                <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-xs">Published</p>
                <p className="text-gray-900 font-semibold">
                  {program.publishedAt ? new Date(program.publishedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creator Profile Card */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Creator Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-gray-200">
              <AvatarImage src={creatorImageUrl || undefined} />
              <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xl">
                {creator.displayName?.substring(0, 2).toUpperCase() || 'CR'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-gray-900 font-semibold text-lg">{creator.displayName}</h3>
                {/* Show verification badge only if enabled */}
                {profileVisibility.showVerificationBadge && creator.verified && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              {/* Show bio only if enabled */}
              {profileVisibility.showBio && creator.bio && (
                <p className="text-gray-700 text-sm leading-relaxed">{creator.bio}</p>
              )}
            </div>
          </div>

          {/* Show social links only if enabled */}
          {profileVisibility.showSocialLinks && creator.socialLinks && (
            <>
              <Separator className="bg-gray-200" />
              <div>
                <h4 className="text-gray-900 font-semibold mb-3">Connect with Creator</h4>
                <p className="text-sm text-gray-600 mb-3">Follow on social media to support the creator and earn rewards!</p>
                <div className="flex flex-wrap gap-2">
                  {creator.socialLinks.twitter && (
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${
                          socialCompletions.twitter?.completed ? 'border-green-300 bg-green-50' : ''
                        }`}
                        onClick={() => window.open(creator.socialLinks.twitter, '_blank')}
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                        {socialCompletions.twitter?.completed && (
                          <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </Button>
                      {!socialCompletions.twitter?.completed && user && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary items-center justify-center text-white text-xs font-bold">!</span>
                        </span>
                      )}
                    </div>
                  )}
                  {creator.socialLinks.instagram && (
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${
                          socialCompletions.instagram?.completed ? 'border-green-300 bg-green-50' : ''
                        }`}
                        onClick={() => window.open(creator.socialLinks.instagram, '_blank')}
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        Instagram
                        {socialCompletions.instagram?.completed && (
                          <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </Button>
                      {!socialCompletions.instagram?.completed && user && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary items-center justify-center text-white text-xs font-bold">!</span>
                        </span>
                      )}
                    </div>
                  )}
                  {creator.socialLinks.discord && (
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${
                          socialCompletions.discord?.completed ? 'border-green-300 bg-green-50' : ''
                        }`}
                        onClick={() => window.open(creator.socialLinks.discord, '_blank')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Discord
                        {socialCompletions.discord?.completed && (
                          <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </Button>
                      {!socialCompletions.discord?.completed && user && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary items-center justify-center text-white text-xs font-bold">!</span>
                        </span>
                      )}
                    </div>
                  )}
                  {creator.socialLinks.facebook && (
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${
                          socialCompletions.facebook?.completed ? 'border-green-300 bg-green-50' : ''
                        }`}
                        onClick={() => window.open(creator.socialLinks.facebook, '_blank')}
                      >
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                        {socialCompletions.facebook?.completed && (
                          <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </Button>
                      {!socialCompletions.facebook?.completed && user && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary items-center justify-center text-white text-xs font-bold">!</span>
                        </span>
                      )}
                    </div>
                  )}
                  {creator.socialLinks.website && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => window.open(creator.socialLinks.website, '_blank')}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                  )}
                </div>
                {user && (
                  <p className="text-xs text-gray-500 mt-3">
                    ✓ = Task completed • ! = Action required to earn rewards
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Show tiers only if enabled */}
      {profileVisibility.showTiers && program.tiers && program.tiers.length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Reward Tiers</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Unlock exclusive benefits as you earn more points</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {program.tiers.map((tier) => (
                <div key={tier.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-900 font-semibold text-lg">{tier.name}</h4>
                    <Badge style={{ backgroundColor: tier.color + '20', color: tier.color, borderColor: tier.color + '40' }}>
                      {tier.minPoints}+ {program.pointsName}
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                        <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Campaigns Tab Component
function CampaignsTab({ campaigns, pointsName }: { campaigns: Campaign[]; pointsName: string }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="space-y-4">
      {activeCampaigns.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Active Campaigns</h3>
            <p className="text-gray-400">Check back soon for new campaigns!</p>
          </CardContent>
        </Card>
      ) : (
        activeCampaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-white/5 border-white/10 hover:border-brand-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{campaign.name}</h3>
                  <p className="text-gray-300 mb-4">{campaign.description}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                {campaign.startDate && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span>Started {new Date(campaign.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {campaign.endDate && (
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>Ends {new Date(campaign.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Button className="mt-4 bg-brand-primary hover:bg-brand-primary/80 w-full">
                View Campaign
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Tasks Tab Component
function TasksTab({
  tasks,
  pointsName,
  themeColors,
  brandColors,
  isThemeDark
}: {
  tasks: Task[];
  pointsName: string;
  themeColors: any;
  brandColors: any;
  isThemeDark: boolean;
}) {
  const { user } = useAuth();
  const activeTasks = tasks.filter(t => !t.isDraft && t.isActive);

  // Fetch task completions for the current user
  const { data: completionsData } = useUserTaskCompletions();
  const completions = completionsData?.completions || [];

  // Create a map of task completions by task ID for quick lookup
  const completionMap = new Map(
    completions.map(c => [c.taskId, c])
  );

  return (
    <div className="space-y-4">
      {activeTasks.length === 0 ? (
        <Card
          className="shadow-sm"
          style={styles.card}
        >
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-16 w-16 mx-auto mb-4" style={styles.textTertiary} />
            <h3 className="text-lg font-medium mb-2" style={styles.textPrimary}>No Tasks Available</h3>
            <p style={styles.textSecondary}>Check back soon for new tasks!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTasks.map((task) => (
            <FanTaskCard
              key={task.id}
              task={task}
              completion={completionMap.get(task.id)}
              tenantId={task.tenantId ?? ''}
              themeColors={themeColors}
              brandColors={brandColors}
              pointsName={pointsName}
              isThemeDark={isThemeDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Rewards Tab Component
function RewardsTab({ programId }: { programId: string }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-12 text-center">
        <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Rewards Coming Soon</h3>
        <p className="text-gray-400">Earn points by completing tasks and campaigns to unlock exclusive rewards!</p>
      </CardContent>
    </Card>
  );
}

