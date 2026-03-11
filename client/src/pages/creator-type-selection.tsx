/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useAuth as useAuthContext } from '@/contexts/auth-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { THEME_TEMPLATES, type ThemeTemplate } from '@shared/theme-templates';
import {
  CREATOR_TEMPLATES,
  type CreatorType,
} from '@/components/program/creator-program-templates';
import { PlatformConnectionPriority } from '@/components/program/platform-connection-priority';
import { usePlatformConnectors } from '@/hooks/use-social-connection';
import {
  SUBSCRIPTION_TIERS,
  SELECTABLE_TIERS,
  type SubscriptionTier,
} from '@shared/subscription-config';
import {
  Trophy,
  Music,
  Video,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  Palette,
  Type,
  Camera,
  Star,
  Zap,
  Globe,
  Instagram,
  Youtube,
  Link2,
  CreditCard,
  AlertCircle,
  Crown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface CreatorTypeOption {
  id: CreatorType;
  title: string;
  subtitle: string;
  icon: typeof Trophy;
  gradient: string;
  iconBg: string;
  features: string[];
}

interface OnboardingState {
  creatorType: CreatorType | null;
  username: string;
  programName: string;
  programDescription: string;
  pointsName: string;
  themeId: string;
  logoUrl: string | null;
  subscriptionTier: SubscriptionTier;
  // Athlete fields
  sport: string;
  educationLevel: string;
  // Musician fields
  bandArtistName: string;
  artistType: string;
  musicGenre: string;
  musicCatalogUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────

const STEPS = [
  { id: 'type', label: 'Creator Type', icon: Star },
  { id: 'basics', label: 'Program Info', icon: Type },
  { id: 'theme', label: 'Style', icon: Palette },
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'socials', label: 'Socials', icon: Link2 },
  { id: 'plan', label: 'Plan', icon: CreditCard },
] as const;

const CREATOR_TYPES: CreatorTypeOption[] = [
  {
    id: 'athlete',
    title: 'Athlete',
    subtitle: 'College, Olympic, or professional athletes',
    icon: Trophy,
    gradient: 'from-sky-500 to-blue-600',
    iconBg: 'bg-sky-500/15 border-sky-500/30',
    features: [
      'NIL Valuation Calculator',
      'Sponsor Directory Access',
      'NFT & Digital Collectibles',
      'Fan Engagement Campaigns',
    ],
  },
  {
    id: 'musician',
    title: 'Musician',
    subtitle: 'Artists, bands, and music producers',
    icon: Music,
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    features: [
      'Streaming Platform Sync',
      'Token-Gated Experiences',
      'Ticket Marketplace Integrations',
      'Fan Loyalty Rewards',
    ],
  },
  {
    id: 'content_creator',
    title: 'Content Creator',
    subtitle: 'YouTubers, TikTokers, streamers, and influencers',
    icon: Video,
    gradient: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    features: [
      'Multi-Platform Analytics',
      'Brand Partnership Tools',
      'Audience Segmentation',
      'Creator Monetization',
    ],
  },
];

const DEFAULT_POINTS_NAMES: Record<CreatorType, string[]> = {
  athlete: ['Fan Points', 'MVP Points', 'Team Points', 'Loyalty Points'],
  musician: ['Fan Credits', 'Backstage Points', 'Superfan Points', 'Music Points'],
  content_creator: ['Community Points', 'VIP Points', 'Creator Points', 'Subscriber Points'],
};

// ─── Component ────────────────────────────────────────────────────

export default function CreatorTypeSelection() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { refreshUser } = useAuthContext();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    creatorType: null,
    username: user?.username || '',
    programName: '',
    programDescription: '',
    pointsName: '',
    themeId: '',
    logoUrl: null,
    subscriptionTier: 'free',
    sport: '',
    educationLevel: '',
    bandArtistName: '',
    artistType: '',
    musicGenre: '',
    musicCatalogUrl: '',
  });

  const { connect: connectPlatform, connectingPlatform } = usePlatformConnectors();
  const [recentlyConnected, setRecentlyConnected] = useState<Set<string>>(new Set<string>());

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

  const formRef = useRef<HTMLDivElement>(null);

  // Scroll form panel to top on step change
  useEffect(() => {
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Sync username from user when it loads
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (user?.username && !state.username) {
      setState((prev) => ({ ...prev, username: user.username }));
    }
  }, [user?.username, state.username]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Set smart defaults when creator type changes
  const selectCreatorType = useCallback(
    (type: CreatorType) => {
      const template = CREATOR_TEMPLATES[type];
      const displayName =
        (user?.profileData as Record<string, string>)?.name ||
        user?.username ||
        state.username ||
        'Creator';
      setState((prev) => ({
        ...prev,
        creatorType: type,
        programName: prev.programName || `${displayName}'s Program`,
        pointsName: prev.pointsName || template.pointsNameSuggestion,
        themeId: prev.themeId || template.defaultTheme,
      }));
    },
    [user, state.username]
  );

  const handleConnectPlatform = async (platformId: string) => {
    await connectPlatform(platformId);
    setRecentlyConnected((prev) => new Set(prev).add(platformId));
  };

  // API: create creator + tenant + program, then update program with user choices
  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!state.creatorType) throw new Error('No creator type selected');

      // Build type-specific data payload
      const typeSpecificData: Record<string, unknown> = {};
      if (state.creatorType === 'athlete') {
        typeSpecificData.athlete = {
          sport: state.sport.trim(),
          education: { level: state.educationLevel },
        };
      } else if (state.creatorType === 'musician') {
        typeSpecificData.musician = {
          bandArtistName: state.bandArtistName.trim(),
          artistType: state.artistType,
          musicGenre: state.musicGenre.trim(),
          musicCatalogUrl: state.musicCatalogUrl.trim(),
        };
      }

      // Step 1: Atomic scaffold (tenant + creator + draft program)
      const result = await fetchApi('/api/auth/set-creator-type', {
        method: 'POST',
        body: JSON.stringify({
          creatorType: state.creatorType,
          username: state.username.trim() || undefined,
          subscriptionTier: state.subscriptionTier,
          typeSpecificData,
        }),
      });

      const program = (result as Record<string, unknown>).program as
        | Record<string, unknown>
        | undefined;
      const programId = program?.id as string | undefined;

      // Step 2: Patch program with onboarding choices
      if (programId) {
        const themeTemplate = THEME_TEMPLATES[state.themeId];
        const updatePayload: Record<string, unknown> = {
          name: state.programName.trim() || undefined,
          description: state.programDescription.trim() || undefined,
          pointsName: state.pointsName || undefined,
        };

        // Build pageConfig updates
        const pageConfig: Record<string, unknown> = {};

        if (state.logoUrl) {
          pageConfig.logo = state.logoUrl;
        }

        if (themeTemplate) {
          pageConfig.brandColors = {
            primary: themeTemplate.colors.primary,
            secondary: themeTemplate.colors.secondary,
            accent: themeTemplate.colors.accent,
          };
          pageConfig.theme = {
            ...themeTemplate,
            mode: themeTemplate.mode ?? 'dark',
          };
        }

        if (Object.keys(typeSpecificData).length > 0) {
          pageConfig.creatorDetails = typeSpecificData;
        }

        if (Object.keys(pageConfig).length > 0) {
          updatePayload.pageConfig = pageConfig;
        }

        await fetchApi(`/api/programs/${programId}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        });
      }

      return result;
    },
    onSuccess: async () => {
      await refreshUser();
      setLocation('/creator-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Username validation: 3-30 chars, alphanumeric + _ . -
  const isUsernameValid = (u: string) =>
    u.length >= 3 && u.length <= 30 && /^[a-zA-Z0-9_.-]+$/.test(u);

  // Navigation helpers
  const canAdvance = () => {
    if (currentStep === 0) return !!state.creatorType;
    if (currentStep === 1) {
      const baseValid = isUsernameValid(state.username) && state.programName.trim().length > 0;
      if (!baseValid) return false;
      if (state.creatorType === 'athlete') {
        return !!state.sport.trim() && !!state.educationLevel;
      }
      if (state.creatorType === 'musician') {
        return (
          !!state.bandArtistName.trim() &&
          !!state.artistType &&
          !!state.musicGenre.trim() &&
          !!state.musicCatalogUrl.trim()
        );
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1 && canAdvance()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    if (!finishMutation.isPending) finishMutation.mutate();
  };

  // Get active theme for preview
  const activeTheme: ThemeTemplate | null = state.themeId
    ? THEME_TEMPLATES[state.themeId] || null
    : null;

  // Get recommended themes for selected creator type
  const recommendedThemeIds = state.creatorType
    ? CREATOR_TEMPLATES[state.creatorType].recommendedThemes
    : [];

  // ─── Loading / Auth Guards ────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Authentication required</p>
          <Button onClick={() => setLocation('/')} variant="neon">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-brand-dark-bg flex flex-col lg:flex-row">
      {/* ═══ LEFT: Form Panel ═══ */}
      <div
        ref={formRef}
        className="w-full lg:w-[48%] xl:w-[45%] min-h-screen flex flex-col overflow-y-auto"
      >
        {/* Top bar with logo + progress */}
        <div className="sticky top-0 z-20 bg-brand-dark-bg/95 backdrop-blur-md border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <img src="/fandomly2.png" alt="Fandomly" className="h-10 w-auto" />
            <span className="text-sm text-gray-400 tabular-nums">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    i < currentStep
                      ? 'bg-brand-primary w-full'
                      : i === currentStep
                        ? 'bg-brand-primary w-1/2 animate-pulse'
                        : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex gap-1.5 mt-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => i < currentStep && setCurrentStep(i)}
                  disabled={i > currentStep}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1 rounded transition-colors ${
                    i === currentStep
                      ? 'text-brand-primary font-medium'
                      : i < currentStep
                        ? 'text-gray-400 hover:text-gray-300 cursor-pointer'
                        : 'text-gray-600 cursor-default'
                  }`}
                >
                  {i < currentStep ? (
                    <Check className="h-3 w-3 text-brand-primary" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-12 py-8 lg:py-12">
          {/* Step 0: Creator Type Selection */}
          {currentStep === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                What kind of creator are you?
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                {"We'll customize your experience with the right tools and templates."}
              </p>

              <div className="space-y-3">
                {CREATOR_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = state.creatorType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => selectCreatorType(type.id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/8 ring-1 ring-brand-primary/30'
                          : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-brand-primary/20 border-brand-primary/40' : type.iconBg
                          }`}
                        >
                          <Icon
                            className={`h-6 w-6 ${isSelected ? 'text-brand-primary' : 'text-white/70'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-lg">{type.title}</span>
                            {isSelected && <Check className="h-4 w-4 text-brand-primary" />}
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{type.subtitle}</p>
                          <div className="flex flex-wrap gap-2">
                            {type.features.map((f) => (
                              <span
                                key={f}
                                className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/8"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Program Basics */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Choose your username & program
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Pick a unique username and name your program. You can change these later.
              </p>

              <div className="space-y-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <Input
                    value={state.username}
                    onChange={(e) => setState((s) => ({ ...s, username: e.target.value }))}
                    placeholder="e.g. yourname or yourname_creator"
                    maxLength={30}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base focus:border-brand-primary/60 focus:ring-brand-primary/20"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {state.username.length}/30 characters. Letters, numbers, underscores, dots,
                    hyphens only.
                  </p>
                  {state.username.length > 0 && !isUsernameValid(state.username) && (
                    <p className="text-xs text-amber-400 mt-1">Username must be 3–30 characters</p>
                  )}
                </div>

                {/* Program Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Program Name
                  </label>
                  <Input
                    value={state.programName}
                    onChange={(e) => setState((s) => ({ ...s, programName: e.target.value }))}
                    placeholder="e.g. Thunder Nation Rewards"
                    maxLength={80}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base focus:border-brand-primary/60 focus:ring-brand-primary/20"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {state.programName.length}/80 characters
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <Textarea
                    value={state.programDescription}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        programDescription: e.target.value,
                      }))
                    }
                    placeholder="Tell fans what your program is about..."
                    maxLength={300}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-base resize-none focus:border-brand-primary/60 focus:ring-brand-primary/20"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {state.programDescription.length}/300 characters
                  </p>
                </div>

                {/* Athlete-specific fields */}
                {state.creatorType === 'athlete' && (
                  <div className="space-y-4 p-4 rounded-xl bg-sky-500/5 border border-sky-500/15">
                    <p className="text-xs uppercase tracking-wider text-sky-400 font-medium">
                      Athlete Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Sport <span className="text-brand-primary">*</span>
                        </label>
                        <select
                          value={state.sport}
                          onChange={(e) => setState((s) => ({ ...s, sport: e.target.value }))}
                          className="w-full h-12 rounded-md bg-[#1a1a2e] border border-white/10 text-white px-3 text-base [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                        >
                          <option value="">Select sport</option>
                          <option value="Basketball">Basketball</option>
                          <option value="Football">Football</option>
                          <option value="Soccer">Soccer</option>
                          <option value="Baseball">Baseball</option>
                          <option value="Softball">Softball</option>
                          <option value="Track & Field">Track &amp; Field</option>
                          <option value="Swimming">Swimming</option>
                          <option value="Tennis">Tennis</option>
                          <option value="Golf">Golf</option>
                          <option value="Volleyball">Volleyball</option>
                          <option value="Wrestling">Wrestling</option>
                          <option value="Lacrosse">Lacrosse</option>
                          <option value="Hockey">Hockey</option>
                          <option value="Gymnastics">Gymnastics</option>
                          <option value="Cross Country">Cross Country</option>
                          <option value="Boxing">Boxing</option>
                          <option value="MMA">MMA</option>
                          <option value="Rowing">Rowing</option>
                          <option value="Cycling">Cycling</option>
                          <option value="Skiing">Skiing</option>
                          <option value="Snowboarding">Snowboarding</option>
                          <option value="Surfing">Surfing</option>
                          <option value="Skateboarding">Skateboarding</option>
                          <option value="Cheerleading">Cheerleading</option>
                          <option value="Esports">Esports</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Education Level <span className="text-brand-primary">*</span>
                        </label>
                        <select
                          value={state.educationLevel}
                          onChange={(e) =>
                            setState((s) => ({ ...s, educationLevel: e.target.value }))
                          }
                          className="w-full h-12 rounded-md bg-[#1a1a2e] border border-white/10 text-white px-3 text-base [&>option]:bg-[#1a1a2e] [&>option]:text-white"
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
                  </div>
                )}

                {/* Musician-specific fields */}
                {state.creatorType === 'musician' && (
                  <div className="space-y-4 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
                    <p className="text-xs uppercase tracking-wider text-violet-400 font-medium">
                      Musician Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Artist / Band Name <span className="text-brand-primary">*</span>
                        </label>
                        <Input
                          value={state.bandArtistName}
                          onChange={(e) =>
                            setState((s) => ({ ...s, bandArtistName: e.target.value }))
                          }
                          placeholder="Your stage name or band name"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Artist Type <span className="text-brand-primary">*</span>
                        </label>
                        <select
                          value={state.artistType}
                          onChange={(e) => setState((s) => ({ ...s, artistType: e.target.value }))}
                          className="w-full h-12 rounded-md bg-[#1a1a2e] border border-white/10 text-white px-3 text-base [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                        >
                          <option value="">Select type</option>
                          <option value="independent">Independent</option>
                          <option value="signed">Signed</option>
                          <option value="hobby">Hobby</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Music Genre <span className="text-brand-primary">*</span>
                        </label>
                        <Input
                          value={state.musicGenre}
                          onChange={(e) => setState((s) => ({ ...s, musicGenre: e.target.value }))}
                          placeholder="e.g., Hip Hop, Pop, Rock"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Music Catalog URL <span className="text-brand-primary">*</span>
                        </label>
                        <Input
                          value={state.musicCatalogUrl}
                          onChange={(e) =>
                            setState((s) => ({ ...s, musicCatalogUrl: e.target.value }))
                          }
                          placeholder="Spotify, Apple Music, or SoundCloud link"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Points Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Points Currency Name
                  </label>
                  <Input
                    value={state.pointsName}
                    onChange={(e) => setState((s) => ({ ...s, pointsName: e.target.value }))}
                    placeholder="e.g. Fan Points"
                    maxLength={30}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base focus:border-brand-primary/60 focus:ring-brand-primary/20"
                  />
                  {state.creatorType && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {DEFAULT_POINTS_NAMES[state.creatorType].map((name) => (
                        <button
                          key={name}
                          onClick={() => setState((s) => ({ ...s, pointsName: name }))}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            state.pointsName === name
                              ? 'border-brand-primary/50 bg-brand-primary/15 text-brand-primary'
                              : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-300 hover:border-white/20'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Theme Selection */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Pick a style
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Choose a theme for your program page. You can customize colors later.
              </p>

              {/* Recommended themes */}
              {recommendedThemeIds.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">
                    Recommended for you
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {recommendedThemeIds.map((tid) => {
                      const theme = THEME_TEMPLATES[tid];
                      if (!theme) return null;
                      return (
                        <ThemeCard
                          key={tid}
                          theme={theme}
                          selected={state.themeId === tid}
                          onSelect={() => setState((s) => ({ ...s, themeId: tid }))}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All themes */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">
                  All themes
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(THEME_TEMPLATES)
                    .filter(([tid]) => !recommendedThemeIds.includes(tid))
                    .map(([tid, theme]) => (
                      <ThemeCard
                        key={tid}
                        theme={theme}
                        selected={state.themeId === tid}
                        onSelect={() => setState((s) => ({ ...s, themeId: tid }))}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Photo Upload */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Add your photo
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Upload a profile photo or logo for your program. You can skip this and add one
                later.
              </p>

              <div className="max-w-xs">
                <ImageUpload
                  type="avatar"
                  currentImageUrl={state.logoUrl || undefined}
                  onUploadSuccess={(url) => setState((s) => ({ ...s, logoUrl: url }))}
                  onRemove={() => setState((s) => ({ ...s, logoUrl: null }))}
                />
              </div>
            </div>
          )}

          {/* Step 4: Social Connections */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Connect Your Social Accounts
              </h1>
              <p className="text-gray-400 mb-6 text-lg">
                Earn <span className="text-brand-primary font-semibold">+500 Fandomly Points</span>{' '}
                for each account you connect. These connections power your tasks and engagement
                tracking.
              </p>

              {connectedPlatforms.size === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-200 text-sm font-medium">No accounts connected yet</p>
                    <p className="text-amber-200/70 text-xs mt-1">
                      {
                        "You'll need at least one social account connected to publish your program. You can always add more later."
                      }
                    </p>
                  </div>
                </div>
              )}

              {connectedPlatforms.size > 0 && (
                <div className="flex items-center gap-2 mb-6">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {connectedPlatforms.size} connected
                  </Badge>
                  <span className="text-sm text-gray-400">
                    +{connectedPlatforms.size * 500} points earned
                  </span>
                </div>
              )}

              {state.creatorType && (
                <PlatformConnectionPriority
                  creatorType={state.creatorType}
                  connectedPlatforms={connectedPlatforms}
                  socialConnections={(socialConnectionsData as any)?.connections || []}
                  recentlyConnected={recentlyConnected}
                  connectingPlatform={connectingPlatform}
                  onConnect={handleConnectPlatform}
                  asCard={false}
                  maxConnections={SUBSCRIPTION_TIERS.free.limits.maxSocialConnections}
                />
              )}
            </div>
          )}

          {/* Step 5: Choose Plan */}
          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Choose Your Plan
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Start free and upgrade anytime as your community grows.
              </p>

              <div className="space-y-3">
                {SELECTABLE_TIERS.map((tierId) => {
                  const tier = SUBSCRIPTION_TIERS[tierId];
                  const isSelected = state.subscriptionTier === tierId;
                  const isRecommended = tier.recommended;

                  return (
                    <button
                      key={tierId}
                      onClick={() => setState((s) => ({ ...s, subscriptionTier: tierId }))}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 relative ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/8 ring-1 ring-brand-primary/30'
                          : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-2.5 right-4">
                          <Badge className="bg-brand-primary/90 text-white text-xs px-2.5 py-0.5 border-0">
                            <Crown className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-lg">{tier.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-brand-primary" />}
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{tier.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {tier.features.slice(0, 4).map((f) => (
                              <span
                                key={f}
                                className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/8"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold text-white">
                            {tier.price === 0 ? 'Free' : `$${tier.price}`}
                          </p>
                          {tier.price !== null && tier.price > 0 && (
                            <p className="text-xs text-gray-500">per month</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Enterprise CTA */}
              <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/8 text-center">
                <p className="text-gray-400 text-sm">
                  Need more?{' '}
                  <span className="text-brand-primary font-medium cursor-pointer hover:underline">
                    Contact us
                  </span>{' '}
                  about Agency & Enterprise plans.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="sticky bottom-0 bg-brand-dark-bg/95 backdrop-blur-md border-t border-white/5 px-6 sm:px-10 lg:px-12 py-5">
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={goBack} className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length - 1 ? (
              <div className="flex items-center gap-3">
                {/* Skip to Dashboard — available after creator type (step 0) is selected */}
                {currentStep >= 1 && state.creatorType && (
                  <Button
                    variant="ghost"
                    onClick={handleFinish}
                    disabled={finishMutation.isPending}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {finishMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : null}
                    Skip to Dashboard
                  </Button>
                )}
                {/* Skip step — for optional steps (photo, socials, plan) */}
                {currentStep >= 2 && (
                  <Button
                    variant="ghost"
                    onClick={goNext}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canAdvance()}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 h-11 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                  disabled={finishMutation.isPending}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  {finishMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Skip to Dashboard
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={finishMutation.isPending}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 h-11 rounded-xl font-semibold"
                >
                  {finishMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Finish Setup
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Live Preview ═══ */}
      <div className="hidden lg:flex w-[52%] xl:w-[55%] min-h-screen items-center justify-center p-8 xl:p-12 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(225,6,152,0.08),transparent_70%)]" />

        <div className="relative w-full max-w-lg">
          <ProgramPreview state={state} theme={activeTheme} />
        </div>
      </div>
    </div>
  );
}

// ─── Theme Card ─────────────────────────────────────────────────

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
        selected
          ? 'border-brand-primary ring-1 ring-brand-primary/30 scale-[1.02]'
          : 'border-white/8 hover:border-white/20'
      }`}
    >
      {/* Color swatch */}
      <div className="h-20 w-full relative" style={{ backgroundColor: theme.colors.background }}>
        {/* Surface card mock */}
        <div
          className="absolute bottom-2 left-2 right-2 h-10 rounded-md"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <div className="flex items-center gap-1.5 px-2 pt-2">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div className="flex-1 space-y-1">
              <div
                className="h-1.5 w-3/4 rounded-full"
                style={{ backgroundColor: theme.colors.text.primary, opacity: 0.6 }}
              />
              <div
                className="h-1 w-1/2 rounded-full"
                style={{ backgroundColor: theme.colors.text.secondary, opacity: 0.4 }}
              />
            </div>
          </div>
        </div>
        {/* Accent dot */}
        <div
          className="absolute top-2 right-2 w-3 h-3 rounded-full"
          style={{ backgroundColor: theme.colors.accent }}
        />
      </div>

      {/* Label */}
      <div className="bg-white/[0.03] px-3 py-2.5">
        <p className="text-xs text-white font-medium truncate">{theme.name}</p>
        <p className="text-[10px] text-gray-500 truncate">
          {theme.mode === 'dark' ? 'Dark' : theme.mode === 'light' ? 'Light' : 'Custom'}
        </p>
      </div>

      {/* Selected check */}
      {selected && (
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── Live Preview ───────────────────────────────────────────────

function ProgramPreview({ state, theme }: { state: OnboardingState; theme: ThemeTemplate | null }) {
  const bg = theme?.colors.background || '#0f172a';
  const surface = theme?.colors.surface || '#1e293b';
  const primary = theme?.colors.primary || '#e10698';
  const accent = theme?.colors.accent || '#14feee';
  const textPrimary = theme?.colors.text.primary || '#f1f5f9';
  const textSecondary = theme?.colors.text.secondary || '#94a3b8';
  const border = theme?.colors.border || '#334155';

  const displayName = state.programName || 'Your Program';
  const description = state.programDescription || 'Your fan engagement program lives here.';

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl border transition-all duration-500"
      style={{ backgroundColor: bg, borderColor: border + '40' }}
    >
      {/* Banner */}
      <div
        className="h-28 relative"
        style={{
          background: `linear-gradient(135deg, ${primary}30, ${accent}20, ${primary}15)`,
        }}
      >
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${primary}40 0%, transparent 50%), radial-gradient(circle at 80% 30%, ${accent}30 0%, transparent 40%)`,
          }}
        />
      </div>

      {/* Profile section */}
      <div className="px-6 -mt-10 relative z-10">
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-2xl border-4 overflow-hidden flex items-center justify-center"
          style={{
            borderColor: bg,
            backgroundColor: surface,
          }}
        >
          {state.logoUrl ? (
            <img src={state.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${primary}40, ${accent}30)` }}
            >
              <span className="text-2xl font-bold" style={{ color: textPrimary }}>
                {displayName[0]?.toUpperCase() || 'F'}
              </span>
            </div>
          )}
        </div>

        {/* Name + description */}
        <div className="mt-4 mb-5">
          <h3
            className="text-xl font-bold transition-all duration-300"
            style={{ color: textPrimary }}
          >
            {displayName}
          </h3>
          <p
            className="text-sm mt-1 transition-all duration-300 line-clamp-2"
            style={{ color: textSecondary }}
          >
            {description}
          </p>

          {state.pointsName && (
            <div className="flex items-center gap-2 mt-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: primary + '18',
                  color: primary,
                  border: `1px solid ${primary}30`,
                }}
              >
                <Star className="h-3 w-3" />
                {state.pointsName}
              </div>
            </div>
          )}
        </div>

        {/* Mock nav tabs */}
        <div className="flex gap-4 text-xs border-b pb-3" style={{ borderColor: border + '60' }}>
          {['Dashboard', 'Tasks', 'Rewards', 'Leaderboard'].map((tab, i) => (
            <span
              key={tab}
              className="transition-colors"
              style={{
                color: i === 0 ? primary : textSecondary,
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      {/* Mock content cards */}
      <div className="px-6 py-5 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Fans', value: '0' },
            { label: 'Tasks', value: '0' },
            { label: 'Rewards', value: '0' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: surface }}
            >
              <p className="text-lg font-bold" style={{ color: textPrimary }}>
                {stat.value}
              </p>
              <p className="text-[10px]" style={{ color: textSecondary }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Mock task card */}
        <div className="rounded-lg p-3" style={{ backgroundColor: surface }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: primary + '20' }}
            >
              <Zap className="h-4 w-4" style={{ color: primary }} />
            </div>
            <div className="flex-1">
              <div
                className="h-2.5 w-32 rounded-full"
                style={{ backgroundColor: textPrimary, opacity: 0.15 }}
              />
              <div
                className="h-2 w-20 rounded-full mt-1.5"
                style={{ backgroundColor: textSecondary, opacity: 0.15 }}
              />
            </div>
            <div
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: accent + '20', color: accent }}
            >
              +50
            </div>
          </div>
        </div>

        {/* Mock social links */}
        <div className="flex items-center gap-2 pt-1">
          {[Instagram, Youtube, Globe].map((Icon, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: surface }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: textSecondary }} />
            </div>
          ))}
        </div>
      </div>

      {/* Powered by footer */}
      <div
        className="px-6 py-3 border-t flex items-center justify-center gap-1.5"
        style={{ borderColor: border + '40' }}
      >
        <span className="text-[10px]" style={{ color: textSecondary + '80' }}>
          Powered by
        </span>
        <img src="/fandomly2.png" alt="Fandomly" className="h-4 opacity-40" />
      </div>
    </div>
  );
}
