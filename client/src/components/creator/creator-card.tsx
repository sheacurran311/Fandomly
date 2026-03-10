import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Creator } from '@shared/schema';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Trophy, Target, Calendar, ExternalLink, Check } from 'lucide-react';
import { transformImageUrl } from '@/lib/image-utils';
import { VerifiedBadgeNFT } from '@/components/creator/VerifiedBadgeNFT';

// Progress data for the "progress" variant (fan dashboard)
interface ProgressData {
  points: number;
  tier?: string;
  joinedDate: string;
  activeTasks: number;
}

interface CreatorCardProps {
  creator: Creator & {
    user?: {
      username: string;
      profileData?: {
        avatar?: string;
        bannerImage?: string;
      };
    };
    tenant?: {
      slug: string;
      branding?: Record<string, unknown>;
    };
    program?: {
      id?: string;
      name?: string;
      slug?: string;
      status?: string;
      pointsName?: string;
      pageConfig?: {
        logo?: string;
        headerImage?: string;
        brandColors?: Record<string, string>;
        socialLinks?: Record<string, string>;
        location?: string;
        creatorDetails?: Record<string, unknown>;
      };
    } | null;
    isLive?: boolean;
    activeCampaignsCount?: number;
    publishedTasksCount?: number;
    hasActiveCampaign?: boolean;
  };

  // Variant determines the card layout
  variant?: 'full' | 'compact' | 'selection' | 'progress';

  // Display options (can override variant defaults)
  showBanner?: boolean;
  showBio?: boolean;
  showStats?: boolean;
  showJoinButton?: boolean;

  // Selection variant props
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (creatorId: string) => void;

  // Progress variant props
  progress?: ProgressData;

  // Auth handling
  onUnauthenticatedClick?: () => void;
}

function CreatorCard({
  creator,
  variant = 'full',
  showBanner: showBannerProp,
  showBio: showBioProp,
  showStats: showStatsProp,
  showJoinButton: showJoinButtonProp,
  selectable: _selectable = false,
  selected = false,
  onSelect,
  progress,
  onUnauthenticatedClick,
}: CreatorCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine display options based on variant (with prop overrides)
  const showBanner = showBannerProp ?? variant !== 'compact';
  const showBio = showBioProp ?? (variant === 'full' || variant === 'progress');
  const showStats = showStatsProp ?? variant === 'full';
  const showJoinButton = showJoinButtonProp ?? variant === 'full';

  // Fetch tenant/branding data if not provided
  const { data: creatorData } = useQuery({
    queryKey: ['/api/store', creator.user?.username],
    queryFn: async () => {
      const response = await fetch(`/api/store/${creator.user?.username}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!creator.user?.username && !creator.tenant,
  });

  // Get tenantId from creator or fetched data
  const tenantId = creator.tenantId || creatorData?.creator?.tenantId;

  // Fetch user's fan programs to check join status
  const { data: userPrograms = [] } = useQuery({
    queryKey: ['/api/fan-programs/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/fan-programs/user/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
  });

  // Check if user has joined a program for this creator
  const hasJoinedProgram = userPrograms.some(
    (program: Record<string, unknown>) =>
      program.creatorId === creator.id || program.tenantId === tenantId
  );

  // Join program mutation - one-tap: follow tenant + enroll in program
  const joinProgramMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be authenticated to join');

      // One-tap join: single API call handles follow + enroll
      const response = await apiRequest('POST', `/api/fan-programs/join-creator/${creator.id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: `You've joined ${creator.displayName}'s loyalty program!`,
      });
      // Invalidate queries to refresh join state immediately
      queryClient.invalidateQueries({ queryKey: ['/api/fan-programs/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/fan-programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
    },
    onError: (error) => {
      console.error('Join program error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join program',
        variant: 'destructive',
      });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'athlete':
        return 'bg-brand-secondary text-brand-dark-bg';
      case 'musician':
        return 'bg-brand-primary text-white';
      case 'creator':
        return 'bg-brand-accent text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return '0 fans';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M fans`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K fans`;
    return `${count} fans`;
  };

  // Program is the single source of truth for fan-facing data.
  // The backend enriches creator responses with program data, so
  // creator.imageUrl, creator.displayName, etc. already reflect program values.
  // We still fall back to legacy sources for older data that hasn't been migrated.
  const programPageConfig = creator.program?.pageConfig;

  // Banner: program headerImage is canonical
  const bannerUrl = transformImageUrl(
    programPageConfig?.headerImage ||
      creator.user?.profileData?.bannerImage ||
      creatorData?.user?.profileData?.bannerImage ||
      creator.tenant?.branding?.bannerUrl
  );

  // Profile photo: program logo is canonical
  const profilePhotoUrl = transformImageUrl(
    programPageConfig?.logo ||
      creator.imageUrl ||
      creator.user?.profileData?.avatar ||
      creatorData?.user?.profileData?.avatar ||
      creator.tenant?.branding?.logoUrl
  );

  // Build the destination URL: /programs/:slug when a program slug exists,
  // otherwise fall back to the creator's public profile at /@username
  const programSlug = creator.program?.slug || creator.tenant?.slug;
  const creatorProfileUrl = creator.user?.username ? `/@${creator.user.username}` : null;
  const destinationUrl = programSlug ? `/programs/${programSlug}` : creatorProfileUrl;

  const handleCardClick = () => {
    if (variant === 'selection' && onSelect) {
      onSelect(creator.id);
      return;
    }

    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else if (destinationUrl) {
      window.location.href = destinationUrl;
    }
  };

  const handleVisitProgramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (destinationUrl) {
      window.location.href = destinationUrl;
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else {
      joinProgramMutation.mutate();
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(creator.id);
    }
  };

  // Render profile photo component (reused across variants)
  const renderProfilePhoto = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-10 h-10 text-sm',
      md: 'w-14 h-14 text-lg',
      lg: 'w-16 h-16 text-xl',
    };

    const borderClasses = {
      sm: 'border-2',
      md: 'border-2',
      lg: 'border-4',
    };

    if (profilePhotoUrl) {
      return (
        <img
          src={profilePhotoUrl}
          alt={creator.displayName}
          className={`${sizeClasses[size]} rounded-full ${borderClasses[size]} border-brand-dark-bg object-cover`}
        />
      );
    }

    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full ${borderClasses[size]} border-brand-dark-bg flex items-center justify-center text-white font-bold`}
      >
        {creator.displayName?.[0] || 'C'}
      </div>
    );
  };

  // Render verification badge
  const renderVerificationBadge = (size: 'sm' | 'md' | 'lg' = 'md') => {
    return <VerifiedBadgeNFT isVerified={!!creator.isVerified} size={size} className="ml-1" />;
  };

  // ============================================
  // COMPACT VARIANT
  // ============================================
  if (variant === 'compact') {
    return (
      <div
        className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10 hover:border-brand-primary/50 transition-all duration-300 cursor-pointer p-3"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3">
          {renderProfilePhoto('sm')}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate flex items-center">
              {creator.displayName}
              {renderVerificationBadge('sm')}
            </h3>
            <Badge className={`${getCategoryColor(creator.category)} text-xs scale-90 origin-left`}>
              {creator.category}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // SELECTION VARIANT (for fan-choose-creators)
  // ============================================
  if (variant === 'selection') {
    return (
      <div
        className={`bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
          selected
            ? 'border-brand-primary bg-brand-primary/10'
            : 'border-white/10 hover:border-brand-primary/50'
        }`}
        onClick={handleCardClick}
      >
        {/* Banner Image */}
        {showBanner && (
          <div
            className="h-24 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 relative bg-cover bg-center"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}
          >
            <div className="absolute top-2 right-2">
              <Badge className={`${getCategoryColor(creator.category)} text-xs`}>
                {creator.category}
              </Badge>
            </div>
            {/* Active Campaign Badge */}
            {creator.hasActiveCampaign && (
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-green-500/90 text-white border-0 text-xs">Active</Badge>
              </div>
            )}
            {/* Selection Indicator */}
            {selected && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {/* Profile Photo and Info */}
          <div className={`flex items-start gap-3 ${showBanner ? '-mt-8' : ''}`}>
            <div className="relative flex-shrink-0">{renderProfilePhoto('md')}</div>
            <div className={`flex-1 min-w-0 ${showBanner ? 'pt-6' : ''}`}>
              <h3 className="text-base font-bold text-white truncate flex items-center">
                {creator.displayName}
                {renderVerificationBadge('sm')}
              </h3>
              <p className="text-xs text-gray-400">{formatFollowerCount(creator.followerCount)}</p>
            </div>
          </div>

          {/* Bio */}
          {showBio && creator.bio && (
            <p className="text-gray-300 text-sm mt-3 line-clamp-2">{creator.bio}</p>
          )}

          {/* Selection Button */}
          <div className="mt-4">
            <Button
              variant={selected ? 'default' : 'neon'}
              className={`w-full ${selected ? 'bg-brand-primary' : ''}`}
              onClick={handleSelectClick}
            >
              {selected ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Selected
                </>
              ) : (
                'Enroll'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PROGRESS VARIANT (for fan-dashboard/joined)
  // ============================================
  if (variant === 'progress') {
    return (
      <div
        className="bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:bg-white/10 transition-colors"
        onClick={handleCardClick}
      >
        <div className="p-5">
          {/* Header with Profile Photo */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {renderProfilePhoto('md')}
              <div>
                <div className="flex items-center">
                  <h3 className="text-lg font-bold text-white">{creator.displayName}</h3>
                  {renderVerificationBadge()}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs border-transparent ${
                    creator.category === 'athlete'
                      ? 'text-green-400'
                      : creator.category === 'musician'
                        ? 'text-purple-400'
                        : 'text-blue-400'
                  }`}
                >
                  {creator.category || 'Creator'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bio */}
          {showBio && (
            <p className="text-gray-300 text-sm mt-4 line-clamp-2">
              {creator.bio || 'Creating amazing content and building community.'}
            </p>
          )}

          {/* Progress Section */}
          {progress && (
            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Your Progress</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-brand-secondary">
                    {progress.points?.toLocaleString() || 0} pts
                  </span>
                  {progress.tier && <span className="text-sm text-gray-400">{progress.tier}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                  <Target className="h-3 w-3" />
                  <span>
                    {progress.activeTasks} active task{progress.activeTasks !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Since {progress.joinedDate}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-gray-300 hover:bg-white/10"
                    onClick={handleVisitProgramClick}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    onClick={handleVisitProgramClick}
                  >
                    View Program
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // FULL VARIANT (default - original behavior)
  // ============================================
  return (
    <div
      className="bg-white/5 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Banner Image */}
      {showBanner && (
        <div
          className="h-32 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 relative bg-cover bg-center"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}
        >
          <div className="absolute top-3 right-3">
            <Badge className={getCategoryColor(creator.category)}>{creator.category}</Badge>
          </div>
          {/* Live Badge - Only show if creator has active content */}
          {creator.isLive && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-green-500/90 text-white border-0">Live</Badge>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Profile Photo and Info */}
        <div className={`flex items-start mb-3 ${showBanner ? '-mt-10' : ''}`}>
          <div className="relative">{renderProfilePhoto('lg')}</div>
          <div className={`ml-3 ${showBanner ? 'mt-10' : ''}`}>
            <h3 className="text-lg font-bold text-white flex items-center">
              {creator.displayName}
              {renderVerificationBadge()}
            </h3>
            <p className="text-gray-400 text-xs">{formatFollowerCount(creator.followerCount)}</p>
          </div>
        </div>

        {showBio && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {creator.bio || 'Creating amazing content and building community.'}
          </p>
        )}

        {/* Activity Stats */}
        {showStats && (creator.activeCampaignsCount || creator.publishedTasksCount) ? (
          <div className="flex gap-3 mb-3 text-xs text-gray-400">
            {(creator.activeCampaignsCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-brand-primary" />
                <span>
                  {creator.activeCampaignsCount} campaign
                  {creator.activeCampaignsCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {(creator.publishedTasksCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-brand-accent" />
                <span>
                  {creator.publishedTasksCount} task{creator.publishedTasksCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        {showJoinButton && (
          <div className="flex gap-2">
            <Button
              onClick={handleVisitProgramClick}
              variant="outline"
              className="flex-1 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
            >
              Visit Program
            </Button>
            <Button
              onClick={handleJoinClick}
              disabled={joinProgramMutation.isPending || hasJoinedProgram}
              className={`flex-1 transition-colors ${
                hasJoinedProgram
                  ? 'bg-green-500 hover:bg-green-500/80 text-white'
                  : 'bg-brand-primary hover:bg-brand-primary/80 text-white'
              }`}
            >
              {joinProgramMutation.isPending
                ? 'Enrolling...'
                : hasJoinedProgram
                  ? 'Enrolled'
                  : 'Enroll'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CreatorCard);
