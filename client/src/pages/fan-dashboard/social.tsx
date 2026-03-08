/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { useFanStats } from '@/hooks/use-fan-dashboard';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Eye,
  CheckCircle,
  AlertCircle,
  Unlink,
  Target,
  MessageSquare,
  Award,
  Video,
  Music,
  Edit as EditIcon,
} from 'lucide-react';
import { FaSpotify, FaPatreon } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { useTwitterConnection } from '@/hooks/use-twitter-connection';
import {
  useTikTokConnection,
  useYouTubeConnection,
  useSpotifyConnection,
  useDiscordConnection,
  useTwitchConnection,
  useFacebookConnection,
  useKickConnection,
  usePatreonConnection,
  useAppleMusicConnection,
} from '@/hooks/use-social-connection';
import { useInstagramHandle } from '@/hooks/use-instagram-handle';
import { useState } from 'react';

export default function FanSocial() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: fanStats } = useFanStats();

  // Get task completion stats for platform breakdown
  const { data: _taskStats } = useQuery({
    queryKey: ['/api/fan/dashboard/task-stats'],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        '/api/fan/dashboard/task-completion-stats?timeframe=monthly'
      );
      return response.json();
    },
    enabled: !!user,
  });

  // Use standardized social connection hooks for all platforms
  const twitter = useTwitterConnection();
  const tiktok = useTikTokConnection();
  const youtube = useYouTubeConnection();
  const spotify = useSpotifyConnection();
  const discord = useDiscordConnection();
  const twitch = useTwitchConnection();
  const facebook = useFacebookConnection();
  const instagram = useInstagramHandle();

  // Local state for Instagram handle input
  const [instagramHandleInput, setInstagramHandleInput] = useState('');
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);

  // Derive display values from hook state
  const twitterConnected = twitter.isConnected;
  const twitterConnecting = twitter.isConnecting;
  const twitterHandle = twitter.userInfo?.username || null;

  const tiktokConnected = tiktok.isConnected;
  const tiktokConnecting = tiktok.isConnecting;
  const tiktokHandle = tiktok.userInfo?.username || tiktok.userInfo?.displayName || null;
  const tiktokFollowers = tiktok.userInfo?.followersCount || tiktok.userInfo?.followers_count || 0;

  const youtubeConnected = youtube.isConnected;
  const youtubeConnecting = youtube.isConnecting;
  const youtubeChannelName = youtube.userInfo?.displayName || youtube.userInfo?.name || null;
  const youtubeSubscribers =
    youtube.userInfo?.followersCount || youtube.userInfo?.followers_count || 0;

  const spotifyConnected = spotify.isConnected;
  const spotifyConnecting = spotify.isConnecting;
  const spotifyDisplayName = spotify.userInfo?.displayName || spotify.userInfo?.name || null;
  const spotifyFollowers =
    spotify.userInfo?.followersCount || spotify.userInfo?.followers_count || 0;

  const discordConnected = discord.isConnected;
  const discordConnecting = discord.isConnecting;
  const discordDisplayName = discord.userInfo?.displayName || discord.userInfo?.name || null;

  const twitchConnected = twitch.isConnected;
  const twitchConnecting = twitch.isConnecting;
  const twitchDisplayName = twitch.userInfo?.displayName || twitch.userInfo?.name || null;
  const twitchFollowers = twitch.userInfo?.followersCount || twitch.userInfo?.followers_count || 0;

  const facebookConnected = facebook.isConnected;
  const facebookConnecting = facebook.isConnecting;

  // Kick connection via standardized hook
  const kick = useKickConnection();
  const kickConnected = kick.isConnected;
  const kickConnecting = kick.isConnecting;
  const kickDisplayName = kick.userInfo?.displayName || kick.userInfo?.username || null;
  const kickFollowers = kick.userInfo?.followersCount || kick.userInfo?.followers_count || 0;

  // Patreon connection via standardized hook
  const patreon = usePatreonConnection();
  const patreonConnected = patreon.isConnected;
  const patreonConnecting = patreon.isConnecting;
  const patreonDisplayName = patreon.userInfo?.displayName || patreon.userInfo?.name || null;

  // Apple Music connection via standardized hook
  const appleMusic = useAppleMusicConnection();
  const appleMusicConnected = appleMusic.isConnected;
  const appleMusicConnecting = appleMusic.isConnecting;
  const appleMusicDisplayName =
    appleMusic.userInfo?.displayName || appleMusic.userInfo?.name || null;

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
        <div className="text-white">Please connect your wallet to access social accounts.</div>
      </div>
    );
  }

  // Format follower counts
  const formatFollowers = (num: number): string => {
    if (!num || num < 0) return '0';
    if (num >= 10000) {
      const val = num / 1000;
      const dec = val < 100 ? 1 : 0;
      return `${val.toFixed(dec)}K`;
    }
    return num.toLocaleString();
  };

  // Social accounts configured for fan participation
  const socialAccounts = [
    {
      platform: 'Instagram',
      icon: Instagram,
      handle: instagram.isConnected && instagram.handle ? `@${instagram.handle}` : '@yourhandle',
      followers: 0,
      connected: instagram.isConnected,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/20',
      buttonColor: 'border-pink-500/30 text-pink-500 hover:bg-pink-500/10',
      description: 'Add your Instagram handle to participate in campaigns',
    },
    {
      platform: 'Twitter',
      icon: Twitter,
      handle: twitterConnected && twitterHandle ? `@${twitterHandle}` : '@yourhandle',
      followers: 0,
      connected: twitterConnected,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      buttonColor: 'border-blue-400/30 text-blue-400 hover:bg-blue-400/10',
      description: 'Connect to participate in Twitter campaigns',
    },
    {
      platform: 'TikTok',
      icon: Video,
      handle: tiktokConnected && tiktokHandle ? `@${tiktokHandle}` : '@yourhandle',
      followers: tiktokFollowers,
      connected: tiktokConnected,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      buttonColor: 'border-purple-400/30 text-purple-400 hover:bg-purple-400/10',
      description: 'Connect to participate in TikTok campaigns',
    },
    {
      platform: 'YouTube',
      icon: Youtube,
      handle: youtubeConnected && youtubeChannelName ? youtubeChannelName : 'Your Channel',
      followers: youtubeSubscribers,
      connected: youtubeConnected,
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      buttonColor: 'border-red-500/30 text-red-500 hover:bg-red-500/10',
      description: 'Connect to participate in YouTube campaigns',
    },
    {
      platform: 'Spotify',
      icon: FaSpotify,
      handle: spotifyConnected && spotifyDisplayName ? spotifyDisplayName : 'Your Profile',
      followers: spotifyFollowers,
      connected: spotifyConnected,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      buttonColor: 'border-green-500/30 text-green-500 hover:bg-green-500/10',
      description: 'Connect to participate in Spotify campaigns',
    },
    {
      platform: 'Apple Music',
      icon: Music,
      handle: appleMusicConnected && appleMusicDisplayName ? appleMusicDisplayName : 'Your Profile',
      followers: 0,
      connected: appleMusicConnected,
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/20',
      buttonColor: 'border-pink-400/30 text-pink-400 hover:bg-pink-400/10',
      description: 'Connect to participate in Apple Music campaigns',
    },
    {
      platform: 'Discord',
      icon: MessageSquare,
      handle: discordConnected && discordDisplayName ? discordDisplayName : 'Your Discord',
      followers: 0,
      connected: discordConnected,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      buttonColor: 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10',
      description: 'Connect Discord to verify community tasks',
    },
    {
      platform: 'Twitch',
      icon: Video,
      handle: twitchConnected && twitchDisplayName ? twitchDisplayName : 'Your Twitch',
      followers: twitchFollowers,
      connected: twitchConnected,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      buttonColor: 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10',
      description: 'Connect Twitch to participate in stream tasks',
    },
    {
      platform: 'Facebook',
      icon: Facebook,
      handle: facebookConnected ? user?.email || 'Connected' : 'Connect Facebook',
      followers: 0,
      connected: facebookConnected,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
      buttonColor: 'border-blue-500/30 text-blue-500 hover:bg-blue-500/10',
      description: 'Connect to participate in Facebook campaigns and earn rewards',
    },
    {
      platform: 'Kick',
      icon: SiKick,
      handle: kickConnected && kickDisplayName ? kickDisplayName : 'Your Kick',
      followers: kickFollowers,
      connected: kickConnected,
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      buttonColor: 'border-green-400/30 text-green-400 hover:bg-green-400/10',
      description: 'Connect to participate in Kick stream tasks',
    },
    {
      platform: 'Patreon',
      icon: FaPatreon,
      handle: patreonConnected && patreonDisplayName ? patreonDisplayName : 'Your Patreon',
      followers: 0,
      connected: patreonConnected,
      color: 'text-[#FF424D]',
      bgColor: 'bg-[#FF424D]/20',
      buttonColor: 'border-[#FF424D]/30 text-[#FF424D] hover:bg-[#FF424D]/10',
      description: 'Connect to verify Patreon memberships and earn rewards',
    },
  ];

  // Calculate real stats from fanStats
  const totalPointsEarned = fanStats?.totalPoints || 0;
  const programsJoined = fanStats?.programsEnrolledCount || 0;

  // Note: Available campaigns now use real data from the tasks page
  // This section shows connected platforms which can be used for social tasks

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Social Accounts</h1>
          <p className="text-gray-400">
            Connect your social media accounts to participate in creator campaigns and earn rewards.
          </p>
        </div>

        {/* Social Media Platforms */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {socialAccounts.map((account, index) => {
                const Icon = account.icon;

                // Special handling for Instagram (manual handle input)
                if (account.platform === 'Instagram') {
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div
                          className={`w-12 h-12 ${account.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`h-6 w-6 ${account.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-white font-medium">{account.platform}</h4>
                            {account.connected ? (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-gray-500/30 text-gray-400 text-xs"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          {account.connected && !isEditingInstagram ? (
                            <p className="text-sm text-gray-400">{account.handle}</p>
                          ) : (
                            <>
                              {(isEditingInstagram || !account.connected) && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    type="text"
                                    placeholder="Enter handle (e.g. username)"
                                    value={instagramHandleInput}
                                    onChange={(e) => setInstagramHandleInput(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-9 max-w-xs"
                                    disabled={instagram.isSaving}
                                  />
                                  <Button
                                    size="sm"
                                    className="bg-pink-500 hover:bg-pink-600 text-white"
                                    onClick={async () => {
                                      if (!instagramHandleInput.trim()) return;
                                      const result =
                                        await instagram.saveHandle(instagramHandleInput);
                                      if (result.success) {
                                        setInstagramHandleInput('');
                                        setIsEditingInstagram(false);
                                      }
                                    }}
                                    disabled={!instagramHandleInput.trim() || instagram.isSaving}
                                  >
                                    {instagram.isSaving ? 'Saving...' : 'Save'}
                                  </Button>
                                  {isEditingInstagram && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-white/20 text-gray-300 hover:bg-white/10"
                                      onClick={() => {
                                        setIsEditingInstagram(false);
                                        setInstagramHandleInput('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              )}
                              {!account.connected && !isEditingInstagram && (
                                <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {account.connected ? (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              Rewarded
                            </Badge>
                            {!isEditingInstagram && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                                onClick={() => {
                                  setInstagramHandleInput(instagram.handle || '');
                                  setIsEditingInstagram(true);
                                }}
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-gray-300 hover:bg-white/10"
                              onClick={() => {
                                instagram.disconnect();
                                setIsEditingInstagram(false);
                                setInstagramHandleInput('');
                              }}
                              data-testid="button-disconnect-instagram-fan"
                            >
                              <Unlink className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                            +500 Points
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }

                // Standard OAuth platforms
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 ${account.bgColor} rounded-full flex items-center justify-center`}
                      >
                        <Icon className={`h-6 w-6 ${account.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-white font-medium">{account.platform}</h4>
                          {account.connected ? (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-gray-500/30 text-gray-400 text-xs"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{account.handle}</p>
                        {account.connected && account.followers > 0 && (
                          <p className="text-xs text-gray-500">
                            {formatFollowers(account.followers)} followers
                          </p>
                        )}
                        {!account.connected && (
                          <p className="text-xs text-gray-500">{account.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {account.connected ? (
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                            Rewarded
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-gray-300 hover:bg-white/10"
                            onClick={() => {
                              if (account.platform === 'Facebook') facebook.disconnect();
                              else if (account.platform === 'Twitter') twitter.disconnect();
                              else if (account.platform === 'TikTok') tiktok.disconnect();
                              else if (account.platform === 'YouTube') youtube.disconnect();
                              else if (account.platform === 'Spotify') spotify.disconnect();
                              else if (account.platform === 'Discord') discord.disconnect();
                              else if (account.platform === 'Twitch') twitch.disconnect();
                              else if (account.platform === 'Kick') kick.disconnect();
                              else if (account.platform === 'Patreon') patreon.disconnect();
                              else if (account.platform === 'Apple Music') appleMusic.disconnect();
                            }}
                            data-testid={`button-disconnect-${account.platform.toLowerCase()}-fan`}
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                            +500 Points
                          </Badge>
                          <Button
                            variant="outline"
                            className={account.buttonColor}
                            onClick={() => {
                              if (account.platform === 'Facebook') facebook.connect();
                              else if (account.platform === 'Twitter') twitter.connect();
                              else if (account.platform === 'TikTok') tiktok.connect();
                              else if (account.platform === 'YouTube') youtube.connect();
                              else if (account.platform === 'Spotify') spotify.connect();
                              else if (account.platform === 'Discord') discord.connect();
                              else if (account.platform === 'Kick') kick.connect();
                              else if (account.platform === 'Patreon') patreon.connect();
                              else if (account.platform === 'Twitch') twitch.connect();
                              else if (account.platform === 'Apple Music') appleMusic.connect();
                            }}
                            disabled={
                              (account.platform === 'Facebook' && facebookConnecting) ||
                              (account.platform === 'Twitter' && twitterConnecting) ||
                              (account.platform === 'TikTok' && tiktokConnecting) ||
                              (account.platform === 'YouTube' && youtubeConnecting) ||
                              (account.platform === 'Spotify' && spotifyConnecting) ||
                              (account.platform === 'Discord' && discordConnecting) ||
                              (account.platform === 'Twitch' && twitchConnecting) ||
                              (account.platform === 'Kick' && kickConnecting) ||
                              (account.platform === 'Patreon' && patreonConnecting) ||
                              (account.platform === 'Apple Music' && appleMusicConnecting)
                            }
                            data-testid={`button-connect-${account.platform.toLowerCase()}-fan`}
                          >
                            {(account.platform === 'Facebook' && facebookConnecting) ||
                            (account.platform === 'Twitter' && twitterConnecting) ||
                            (account.platform === 'TikTok' && tiktokConnecting) ||
                            (account.platform === 'YouTube' && youtubeConnecting) ||
                            (account.platform === 'Spotify' && spotifyConnecting) ||
                            (account.platform === 'Discord' && discordConnecting) ||
                            (account.platform === 'Twitch' && twitchConnecting) ||
                            (account.platform === 'Kick' && kickConnecting) ||
                            (account.platform === 'Patreon' && patreonConnecting) ||
                            (account.platform === 'Apple Music' && appleMusicConnecting)
                              ? 'Connecting...'
                              : 'Connect'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Available Social Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Social Tasks</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                  onClick={() => (window.location.href = '/fan-dashboard/tasks')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h4 className="text-white font-medium mb-2">Connect Your Accounts</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Link your social accounts above to unlock social tasks and earn points
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {!twitterConnected && (
                    <Badge className="bg-blue-500/20 text-blue-400">Twitter tasks available</Badge>
                  )}
                  {!youtubeConnected && (
                    <Badge className="bg-red-500/20 text-red-400">YouTube tasks available</Badge>
                  )}
                  {!tiktokConnected && (
                    <Badge className="bg-pink-500/20 text-pink-400">TikTok tasks available</Badge>
                  )}
                  {!spotifyConnected && (
                    <Badge className="bg-green-500/20 text-green-400">
                      Spotify tasks available
                    </Badge>
                  )}
                  {!kickConnected && (
                    <Badge className="bg-green-400/20 text-green-300">Kick tasks available</Badge>
                  )}
                  {!patreonConnected && (
                    <Badge className="bg-[#FF424D]/20 text-[#FF424D]">
                      Patreon tasks available
                    </Badge>
                  )}
                  {!appleMusicConnected && (
                    <Badge className="bg-pink-400/20 text-pink-300">
                      Apple Music tasks available
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Once connected, social tasks from your enrolled creators will appear here
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Stats & Tips */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Personal Stats - Real data from fanStats */}
                <div>
                  <h4 className="text-white font-medium mb-3">Your Activity</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Programs Joined</span>
                      <span className="text-sm font-medium text-white">{programsJoined}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Total Points Earned</span>
                      <span className="text-sm font-medium text-white">
                        {totalPointsEarned.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Rewards Claimed</span>
                      <span className="text-sm font-medium text-white">
                        {fanStats?.rewardsEarned || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <h4 className="text-white font-medium mb-3">Earning Tips</h4>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <Award className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-300">
                        Connect multiple platforms to access more campaigns
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Award className="h-4 w-4 text-brand-secondary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-300">
                        Engage authentically to maximize your rewards
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Award className="h-4 w-4 text-brand-accent mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-300">
                        Join campaigns early for bonus multipliers
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connected Platforms Status */}
                <div>
                  <h4 className="text-white font-medium mb-3">Connected Platforms</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Twitter</span>
                      <Badge
                        className={
                          twitterConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {twitterConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">TikTok</span>
                      <Badge
                        className={
                          tiktokConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {tiktokConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">YouTube</span>
                      <Badge
                        className={
                          youtubeConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {youtubeConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Spotify</span>
                      <Badge
                        className={
                          spotifyConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {spotifyConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Apple Music</span>
                      <Badge
                        className={
                          appleMusicConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {appleMusicConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Discord</span>
                      <Badge
                        className={
                          discordConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {discordConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Kick</span>
                      <Badge
                        className={
                          kickConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {kickConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-300">Patreon</span>
                      <Badge
                        className={
                          patreonConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {patreonConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
