/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { transformImageUrl } from '@/lib/image-utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  Share2,
  Star,
  Trophy,
  Users,
  Gift,
  CheckCircle,
  Crown,
  Target,
  TrendingUp,
  Clock,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  Lock,
  Sparkles,
  MessageCircle,
  Video,
  Zap,
} from 'lucide-react';
import type { Creator, Task, Campaign } from '@shared/schema';

interface CreatorPublicData {
  creator: Creator & {
    user: {
      username: string;
      displayName: string;
      profileData: any;
    };
    tenant: {
      slug: string;
      branding: any;
    };
    publicPageSettings?: {
      showAbout: boolean;
      showTasks: boolean;
      showSocialPosts: boolean;
      showAnalytics: boolean;
      showRewards: boolean;
      showCommunity: boolean;
    };
  };
  tasks: Task[];
  campaigns: Campaign[];
  fanCount: number;
  stats: {
    activeCampaigns: number;
    totalRewards: number;
    engagementRate?: number;
  };
}

export default function CreatorPublic() {
  const { creatorUrl } = useParams<{ creatorUrl: string }>();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch creator public data
  const { data: creatorData, isLoading } = useQuery<CreatorPublicData>({
    queryKey: ['/api/creators/public', creatorUrl],
    queryFn: async () => {
      const response = await fetch(`/api/creators/public/${creatorUrl}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch creator data');
      }
      return response.json();
    },
    enabled: !!creatorUrl,
  });

  // Update document title for browser tab
  useEffect(() => {
    if (creatorData?.creator) {
      const name = creatorData.creator.user?.displayName || creatorData.creator.user?.username;
      document.title = `${name} on Fandomly`;
      return () => {
        document.title = 'Fandomly - AI-Powered Loyalty Platform for Creators';
      };
    }
  }, [creatorData]);

  // Fetch user's fan programs to check join status
  const { data: userPrograms = [] } = useQuery({
    queryKey: ['/api/fan-programs/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/fan-programs/user/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id && !!creatorData,
  });

  // Check if user has joined this creator's program
  const hasJoinedProgram = userPrograms.some(
    (program: any) => program.creatorId === creatorData?.creator?.id
  );

  // Join program mutation
  const joinProgramMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be authenticated to join');
      if (!creatorData) throw new Error('Creator data not loaded');

      // Fetch creator's loyalty programs
      const programsResponse = await fetch(
        `/api/loyalty-programs/creator/${creatorData.creator.id}`,
        {
          credentials: 'include',
        }
      );

      if (!programsResponse.ok) {
        throw new Error('No loyalty programs available');
      }

      const programs = await programsResponse.json();

      if (programs.length === 0) {
        throw new Error("This creator hasn't created a loyalty program yet");
      }

      // Join the first active program
      const program = programs[0];
      const response = await apiRequest('POST', '/api/fan-programs', {
        tenantId: program.tenantId,
        programId: program.id,
      });

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: `You've joined ${creatorData?.creator?.displayName}'s loyalty program!`,
      });
      // Invalidate queries to refresh join state
      queryClient.invalidateQueries({ queryKey: ['/api/fan-programs/user', user?.id] });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading creator page...</p>
        </div>
      </div>
    );
  }

  if (!creatorData) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Creator Not Found</h2>
          <p className="text-gray-400 mb-6">
            The creator page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/find-creators">
            <Button variant="outline" className="border-brand-primary text-brand-primary">
              Browse Creators
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { creator, tasks, campaigns, fanCount, stats } = creatorData;
  const settings = creator.publicPageSettings || {
    showAbout: true,
    showTasks: true,
    showSocialPosts: true,
    showAnalytics: false,
    showRewards: true,
    showCommunity: true,
  };
  const branding = creator.tenant?.branding;

  // Filter published tasks (not draft and is active)
  const publishedTasks = tasks.filter((t) => !t.isDraft && t.isActive);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-bg via-brand-dark-purple to-brand-dark-bg">
      {/* Hero Section with Banner */}
      <section className="relative h-[400px] md:h-[500px]">
        {/* Banner Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              ((creator as { bannerImage?: string }).bannerImage ??
              creator.user?.profileData?.bannerImage)
                ? `url(${transformImageUrl((creator as { bannerImage?: string }).bannerImage ?? creator.user?.profileData?.bannerImage ?? '')})`
                : `linear-gradient(135deg, ${branding?.primaryColor || '#1a1f3a'}, ${branding?.secondaryColor || '#0f1629'})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-dark-bg/50 to-brand-dark-bg"></div>
        </div>

        {/* Creator Profile Info - Overlay on Banner */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-8">
              {/* Profile Photo */}
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white/20 shadow-xl">
                  <AvatarImage
                    src={transformImageUrl(creator.imageUrl) || undefined}
                    alt={creator.displayName}
                  />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {creator.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-brand-dark-bg">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Creator Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                    {creator.displayName}
                  </h1>
                  {creator.isVerified && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <p className="text-lg text-gray-300 mb-3">@{creator.user?.username}</p>

                {creator.bio && <p className="text-gray-400 max-w-2xl mb-4">{creator.bio}</p>}

                {/* Stats Row */}
                <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-secondary" />
                    <span className="text-white font-semibold">{fanCount.toLocaleString()}</span>
                    <span className="text-gray-400">Fans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-brand-accent" />
                    <span className="text-white font-semibold">{stats.activeCampaigns}</span>
                    <span className="text-gray-400">Active Campaigns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-400" />
                    <span className="text-white font-semibold">
                      {stats.totalRewards.toLocaleString()}
                    </span>
                    <span className="text-gray-400">Rewards Given</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="bg-brand-accent hover:bg-brand-accent/90 text-white"
                  onClick={() => setShowPremiumModal(true)}
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Premium Access
                </Button>
                <Button
                  size="lg"
                  disabled={joinProgramMutation.isPending || hasJoinedProgram}
                  className={
                    hasJoinedProgram
                      ? 'bg-green-500 hover:bg-green-500/80 text-white'
                      : 'bg-brand-primary hover:bg-brand-primary/90 text-white'
                  }
                  onClick={() => joinProgramMutation.mutate()}
                >
                  {joinProgramMutation.isPending ? (
                    'Joining...'
                  ) : hasJoinedProgram ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Joined
                    </>
                  ) : (
                    <>
                      <Heart className="h-5 w-5 mr-2" />
                      Join Program
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Banner for Non-Members */}
      {!hasJoinedProgram && (
        <section className="py-8 px-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-y border-purple-500/20">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="h-6 w-6 text-brand-accent" />
                  Unlock Premium Benefits
                </h3>
                <p className="text-gray-300">
                  Get exclusive access to private campaigns, direct messages, and more!
                </p>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                onClick={() => setShowPremiumModal(true)}
              >
                <Crown className="h-5 w-5 mr-2" />
                View Premium Tiers
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              {settings.showAbout && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-brand-primary" />
                      About {creator.displayName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {creator.category && (
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Type</label>
                          <div className="text-white flex items-center gap-2 capitalize">
                            {creator.category === 'athlete' && (
                              <Trophy className="h-4 w-4 text-amber-400" />
                            )}
                            {creator.category.replace('_', ' ')}
                          </div>
                        </div>
                      )}

                      {creator.user?.profileData?.location && (
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Location</label>
                          <div className="text-white">{creator.user.profileData.location}</div>
                        </div>
                      )}

                      {/* Athlete details */}
                      {creator.category === 'athlete' &&
                        (creator.typeSpecificData as any)?.athlete &&
                        (() => {
                          const a = (creator.typeSpecificData as any).athlete;
                          const educLabels: Record<string, string> = {
                            high_school: 'High School',
                            college_d1: 'College D1',
                            college_d2: 'College D2',
                            college_d3: 'College D3',
                            professional: 'Professional',
                            other: 'Other',
                          };
                          return (
                            <>
                              {a.sport && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Sport</label>
                                  <div className="text-white">{a.sport}</div>
                                </div>
                              )}
                              {a.position && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">
                                    Position
                                  </label>
                                  <div className="text-white">{a.position}</div>
                                </div>
                              )}
                              {a.education?.level && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Level</label>
                                  <div className="text-white">
                                    {educLabels[a.education.level] || a.education.level}
                                  </div>
                                </div>
                              )}
                              {a.school && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">School</label>
                                  <div className="text-white">{a.school}</div>
                                </div>
                              )}
                              {a.currentSponsors && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">
                                    Sponsors
                                  </label>
                                  <div className="text-white">{a.currentSponsors}</div>
                                </div>
                              )}
                            </>
                          );
                        })()}

                      {/* Musician details */}
                      {creator.category === 'musician' &&
                        (creator.typeSpecificData as any)?.musician &&
                        (() => {
                          const m = (creator.typeSpecificData as any).musician;
                          return (
                            <>
                              {m.bandArtistName && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Artist</label>
                                  <div className="text-white">{m.bandArtistName}</div>
                                </div>
                              )}
                              {m.artistType && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">
                                    Artist Type
                                  </label>
                                  <div className="text-white capitalize">{m.artistType}</div>
                                </div>
                              )}
                              {m.musicGenre && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Genre</label>
                                  <div className="text-white">{m.musicGenre}</div>
                                </div>
                              )}
                              {m.musicCatalogUrl && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Music</label>
                                  <a
                                    href={m.musicCatalogUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Listen
                                  </a>
                                </div>
                              )}
                            </>
                          );
                        })()}

                      {/* Content creator details */}
                      {creator.category === 'content_creator' &&
                        (creator.typeSpecificData as any)?.contentCreator &&
                        (() => {
                          const cc = (creator.typeSpecificData as any).contentCreator;
                          return (
                            <>
                              {cc.contentType?.length > 0 && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">
                                    Content
                                  </label>
                                  <div className="text-white">{cc.contentType.join(', ')}</div>
                                </div>
                              )}
                              {cc.topicsOfFocus && (
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Topics</label>
                                  <div className="text-white">
                                    {Array.isArray(cc.topicsOfFocus)
                                      ? cc.topicsOfFocus.join(', ')
                                      : cc.topicsOfFocus}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks & Campaigns Section */}
              {settings.showTasks && (publishedTasks.length > 0 || activeCampaigns.length > 0) && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-brand-accent" />
                      Active Tasks & Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {publishedTasks.slice(0, 3).map((task: Task) => (
                        <div
                          key={task.id}
                          className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold mb-1">{task.name}</h4>
                              <p className="text-sm text-gray-400">{task.description}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-brand-accent/30 text-brand-accent"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              {(task as { pointsToReward?: number }).pointsToReward ?? 0} pts
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                            <Target className="h-3 w-3" />
                            <span className="capitalize">{task.taskType?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}

                      {activeCampaigns.slice(0, 2).map((campaign: any) => (
                        <div
                          key={campaign.id}
                          className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold mb-1">{campaign.name}</h4>
                              <p className="text-sm text-gray-400">{campaign.description}</p>
                            </div>
                            <Badge variant="outline" className="border-blue-400/30 text-blue-400">
                              Campaign
                            </Badge>
                          </div>
                          {campaign.endDate && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                              <Clock className="h-3 w-3" />
                              <span>Ends {new Date(campaign.endDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              {settings.showAnalytics && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-primary" />
                      Public Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Fans</span>
                      <span className="text-white font-semibold">{fanCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Campaigns</span>
                      <span className="text-white font-semibold">{stats.activeCampaigns}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Rewards Distributed</span>
                      <span className="text-white font-semibold">
                        {stats.totalRewards.toLocaleString()}
                      </span>
                    </div>
                    {stats.engagementRate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Engagement Rate</span>
                        <span className="text-green-400 font-semibold">
                          {stats.engagementRate}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Connect
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {creator.socialLinks?.facebook && (
                    <a
                      href={creator.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-400" />
                        <span className="text-white text-sm">Facebook</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                  )}
                  {creator.socialLinks?.twitter && (
                    <a
                      href={creator.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-blue-400" />
                        <span className="text-white text-sm">Twitter</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                  )}
                  {creator.socialLinks?.instagram && (
                    <a
                      href={creator.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-400" />
                        <span className="text-white text-sm">Instagram</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Premium Features Section */}
          <div className="mt-12">
            <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-2">
                  <Lock className="h-6 w-6 text-brand-accent" />
                  Premium Content & Features
                </CardTitle>
                <p className="text-gray-300">Unlock exclusive access with a premium subscription</p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Target className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Private Campaigns</h4>
                        <p className="text-sm text-gray-400">
                          Access exclusive campaigns and challenges
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Coming Soon
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-pink-500/20">
                        <MessageCircle className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Direct Messages</h4>
                        <p className="text-sm text-gray-400">Chat directly with the creator</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Coming Soon
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Video className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Personalized Cameos</h4>
                        <p className="text-sm text-gray-400">Get custom video messages</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Coming Soon
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Crown className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">VIP Rewards</h4>
                        <p className="text-sm text-gray-400">Exclusive merchandise and perks</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Coming Soon
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                    onClick={() => setShowPremiumModal(true)}
                  >
                    <Crown className="h-5 w-5 mr-2" />
                    Get Early Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Premium Modal Placeholder */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-brand-dark-bg border-white/10 max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-brand-accent" />
                Premium Subscription Tiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                Premium subscriptions are coming soon! Get ready for exclusive content, direct
                access, and VIP rewards.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                  <h4 className="text-white font-bold mb-2">Basic</h4>
                  <div className="text-3xl font-bold text-brand-primary mb-2">Free</div>
                  <p className="text-sm text-gray-400 mb-4">Enroll and earn rewards</p>
                  <Badge className="bg-green-500/20 text-green-400">Current</Badge>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-center transform scale-105">
                  <Badge className="bg-purple-500/30 text-purple-300 mb-2">Popular</Badge>
                  <h4 className="text-white font-bold mb-2">Premium</h4>
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    $9.99<span className="text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Private campaigns + DMs</p>
                  <Badge className="bg-yellow-500/20 text-yellow-400">Coming Soon</Badge>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                  <h4 className="text-white font-bold mb-2">VIP</h4>
                  <div className="text-3xl font-bold text-brand-accent mb-2">
                    $24.99<span className="text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Everything + Cameos</p>
                  <Badge className="bg-yellow-500/20 text-yellow-400">Coming Soon</Badge>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowPremiumModal(false)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
