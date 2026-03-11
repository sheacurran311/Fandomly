/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import useUsernameValidation from '@/hooks/use-username-validation';
import {
  User,
  Mail,
  Calendar,
  Users,
  Edit,
  Facebook,
  Instagram,
  CheckCircle,
  AlertCircle,
  Unlink,
  Share2,
  Settings,
  Video,
  X,
  Check,
  Rocket,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Twitter } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';
import { FaSpotify, FaDiscord, FaTwitch } from 'react-icons/fa';
import {
  useTikTokConnection,
  useSpotifyConnection,
  useTwitchConnection,
  useYouTubeConnection,
  useDiscordConnection,
  useFacebookConnection,
  useInstagramConnection,
} from '@/hooks/use-social-connection';
import { useTwitterConnection } from '@/hooks/use-twitter-connection';
import CreatorReferralDashboard from '@/components/referrals/CreatorReferralDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export default function Profile() {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.userType === 'fan') {
      setLocation('/fan-profile');
    }
  }, [isLoading, isAuthenticated, user?.userType, setLocation]);

  // Fetch creator's program for program details section
  const { data: programs = [], isLoading: programsLoading } = useQuery<
    Array<Record<string, unknown>>
  >({
    queryKey: ['/api/programs'],
    enabled: isAuthenticated && user?.userType === 'creator',
  });
  const program = programs[0]; // Single-program model
  const isPublished = program?.status === 'published';

  // Social connections via standardized hooks
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    disconnect: disconnectTwitter,
  } = useTwitterConnection();
  const twitterHandle = twitterUserInfo?.username || null;

  const {
    isConnected: isConnectedToFacebook,
    isConnecting: facebookConnecting,
    userInfo: facebookUserInfo,
    connect: connectFacebook,
    disconnect: disconnectFacebook,
  } = useFacebookConnection();
  const facebookUser = facebookUserInfo
    ? {
        id: facebookUserInfo.id || '',
        name: facebookUserInfo.displayName || facebookUserInfo.name || 'Facebook User',
      }
    : null;

  const {
    isConnected: instagramConnected,
    isConnecting: instagramConnecting,
    userInfo: instagramUserInfo,
    connect: connectInstagram,
    disconnect: disconnectInstagram,
  } = useInstagramConnection();

  const {
    isConnected: tiktokConnected,
    isConnecting: tiktokConnecting,
    userInfo: tiktokUserInfo,
    connect: connectTiktok,
    disconnect: disconnectTiktok,
  } = useTikTokConnection();
  const tiktokHandle = tiktokUserInfo?.displayName || tiktokUserInfo?.username || null;

  const {
    isConnected: youtubeConnected,
    isConnecting: youtubeConnecting,
    userInfo: youtubeUserInfo,
    connect: connectYoutube,
    disconnect: disconnectYoutube,
  } = useYouTubeConnection();
  const youtubeChannelName = youtubeUserInfo?.displayName || youtubeUserInfo?.name || null;

  const {
    isConnected: spotifyConnected,
    isConnecting: spotifyConnecting,
    userInfo: spotifyUserInfo,
    connect: connectSpotify,
    disconnect: disconnectSpotify,
  } = useSpotifyConnection();
  const spotifyDisplayName = spotifyUserInfo?.displayName || spotifyUserInfo?.name || null;

  const {
    isConnected: discordConnected,
    isConnecting: discordConnecting,
    userInfo: discordUserInfo,
    connect: connectDiscord,
    disconnect: disconnectDiscord,
  } = useDiscordConnection();
  const discordDisplayName = discordUserInfo?.displayName || discordUserInfo?.username || null;

  const {
    isConnected: twitchConnected,
    isConnecting: twitchConnecting,
    userInfo: twitchUserInfo,
    connect: connectTwitch,
    disconnect: disconnectTwitch,
  } = useTwitchConnection();
  const twitchDisplayName = twitchUserInfo?.displayName || twitchUserInfo?.username || null;

  // Username editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const {
    isChecking,
    isAvailable,
    error: usernameError,
    hasChecked,
  } = useUsernameValidation(isEditingUsername ? editedUsername : '');

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
        <div className="text-white">Please connect your wallet to access your profile.</div>
      </div>
    );
  }

  return (
    <DashboardLayout userType={user.userType === 'fan' ? 'fan' : 'creator'}>
      <div className="p-3 sm:p-4 lg:pl-6 lg:pr-2">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-400">Manage your profile information and settings</p>
        </div>

        <div className="max-w-6xl">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="profile" className="data-[state=active]:bg-brand-primary">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="referrals" className="data-[state=active]:bg-brand-primary">
                <Share2 className="h-4 w-4 mr-2" />
                Referrals
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-brand-primary">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Left Column - Basic Info & Program Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                          <div className="text-white break-words" data-testid="text-full-name">
                            {user.profileData?.name || user.username || 'Not provided'}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Username</label>
                          {isEditingUsername ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Input
                                    value={editedUsername}
                                    onChange={(e) => {
                                      setEditedUsername(e.target.value);
                                    }}
                                    placeholder="Enter username"
                                    className="bg-white/5 border-white/20 text-white"
                                  />
                                  {isChecking && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Checking availability...
                                    </p>
                                  )}
                                  {usernameError && (
                                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {usernameError}
                                    </p>
                                  )}
                                  {isAvailable &&
                                    !usernameError &&
                                    editedUsername &&
                                    hasChecked && (
                                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Username available!
                                      </p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (isAvailable && editedUsername) {
                                        try {
                                          await apiRequest('POST', '/api/auth/profile', {
                                            userId: user.id,
                                            username: editedUsername,
                                          });

                                          // Refresh the auth context user state so the new username persists
                                          await refreshUser();

                                          toast({
                                            title: 'Success!',
                                            description: 'Username updated successfully',
                                          });

                                          setIsEditingUsername(false);
                                        } catch (error: unknown) {
                                          toast({
                                            title: 'Error',
                                            description:
                                              (error as Error).message ||
                                              'Failed to update username',
                                            variant: 'destructive',
                                          });
                                        }
                                      }
                                    }}
                                    disabled={!isAvailable || !editedUsername || isChecking}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setIsEditingUsername(false);
                                      setEditedUsername(user.username || '');
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-white break-words" data-testid="text-username">
                                @{user.username || 'username'}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditedUsername(user.username || '');
                                  setIsEditingUsername(true);
                                }}
                                className="text-brand-primary hover:text-brand-primary/80"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Email</label>
                          <div
                            className="text-white flex items-start gap-2"
                            data-testid="text-email"
                          >
                            <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="break-all min-w-0">
                              {user.email || 'Not provided'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Member Since</label>
                          <div
                            className="text-white flex items-center gap-2"
                            data-testid="text-member-since"
                          >
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString()
                              : 'Recently'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Program Details */}
                  {user.userType === 'creator' && (
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Rocket className="h-5 w-5" />
                          Program Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {programsLoading ? (
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-white/10 rounded w-2/3" />
                            <div className="h-4 bg-white/10 rounded w-1/2" />
                          </div>
                        ) : !program ? (
                          // No program - prompt to create
                          <Alert className="bg-yellow-500/10 border-yellow-500/20">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <AlertDescription className="text-yellow-400">
                              <p className="mb-3">
                                You haven&apos;t created a fan program yet. Create one to start
                                engaging with your audience!
                              </p>
                              <Button
                                size="sm"
                                className="bg-brand-primary hover:bg-brand-primary/80"
                                onClick={() =>
                                  (window.location.href = '/creator-dashboard/program-builder')
                                }
                              >
                                Create Your Program <ArrowRight className="h-3 w-3 ml-2" />
                              </Button>
                            </AlertDescription>
                          </Alert>
                        ) : !isPublished ? (
                          // Draft program - prompt to continue
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {(program as any).name || 'Your Program'}
                                </p>
                                <p className="text-sm text-gray-400">Draft - not yet published</p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-yellow-400 border-yellow-400"
                              >
                                Draft
                              </Badge>
                            </div>
                            <Button
                              className="w-full bg-brand-primary hover:bg-brand-primary/80"
                              onClick={() =>
                                (window.location.href = '/creator-dashboard/program-builder')
                              }
                            >
                              Continue Building <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        ) : (
                          // Published program
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">{(program as any).name}</p>
                                <p className="text-sm text-gray-400">
                                  {(program as any).slug
                                    ? `/programs/${(program as any).slug}`
                                    : 'Published'}
                                </p>
                              </div>
                              <Badge className="bg-green-500/20 text-green-400 border-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Live
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              {(program as any).slug && (
                                <Button
                                  variant="outline"
                                  className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                                  onClick={() =>
                                    window.open(`/programs/${(program as any).slug}`, '_blank')
                                  }
                                >
                                  View Program <ExternalLink className="h-4 w-4 ml-2" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="flex-1 border-white/20 text-white hover:bg-white/10"
                                onClick={() =>
                                  (window.location.href = '/creator-dashboard/program-builder')
                                }
                              >
                                Edit Program
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column - Social Connections */}
                <div className="space-y-6">
                  {/* Social Connections */}
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Social Connections
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Facebook className="h-5 w-5 text-blue-400" />
                          <div>
                            <div className="text-white font-medium">Facebook</div>
                            <div className="text-xs text-gray-400">
                              {isConnectedToFacebook && facebookUser
                                ? `Connected as ${facebookUser.name || 'Facebook User'}`
                                : 'Connect your Facebook account'}
                            </div>
                          </div>
                        </div>
                        {isConnectedToFacebook ? (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              Rewarded
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={() => {
                                const pageId = localStorage.getItem(
                                  'fandomly_active_facebook_page_id'
                                );
                                const linkId = pageId || facebookUser?.id;
                                const url = linkId
                                  ? `https://facebook.com/${linkId}`
                                  : 'https://facebook.com';
                                window.open(url, '_blank');
                              }}
                            >
                              Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={disconnectFacebook}
                              data-testid="button-disconnect-facebook-profile"
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              +500 Points
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-[#1877F2] text-white hover:bg-[#1877F2]/80"
                              onClick={connectFacebook}
                              disabled={facebookConnecting}
                              data-testid="button-login-facebook-profile"
                            >
                              {facebookConnecting ? 'Connecting…' : 'Login with Facebook'}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Twitter className="h-5 w-5 text-blue-400" />
                          <div>
                            <div className="text-white font-medium">X (Twitter)</div>
                            <div className="text-xs text-gray-400">
                              {twitterConnected && twitterHandle
                                ? `Connected as @${twitterHandle}`
                                : 'Connect your X account'}
                            </div>
                          </div>
                        </div>
                        {twitterConnected ? (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              Rewarded
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={() =>
                                window.open(`https://twitter.com/${twitterHandle}`, '_blank')
                              }
                            >
                              Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={disconnectTwitter}
                              data-testid="button-disconnect-twitter-profile"
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              +500 Points
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-black text-white hover:bg-black/80"
                              onClick={connectTwitter}
                              disabled={twitterConnecting}
                              data-testid="button-connect-twitter-profile"
                            >
                              {twitterConnecting ? 'Connecting…' : 'Connect'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Instagram integration - only show for creators */}
                      {user?.userType === 'creator' && (
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Instagram className="h-5 w-5 text-pink-400" />
                            <div>
                              <div className="text-white font-medium">Instagram</div>
                              <div className="text-xs text-gray-400">
                                {instagramConnected && instagramUserInfo
                                  ? `Connected as @${instagramUserInfo.username}`
                                  : 'Connect your Instagram Business account'}
                              </div>
                            </div>
                          </div>
                          {instagramConnected ? (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                Rewarded
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() =>
                                  window.open(
                                    `https://instagram.com/${instagramUserInfo?.username}`,
                                    '_blank'
                                  )
                                }
                              >
                                Profile
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectInstagram}
                                data-testid="button-disconnect-instagram"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                +500 Points
                              </Badge>
                              <Button
                                className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
                                size="sm"
                                onClick={connectInstagram}
                                disabled={instagramConnecting}
                                data-testid="button-connect-instagram"
                              >
                                {instagramConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TikTok integration - only show for creators */}
                      {user?.userType === 'creator' && (
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Video className="h-5 w-5 text-purple-400" />
                            <div>
                              <div className="text-white font-medium">TikTok</div>
                              <div className="text-xs text-gray-400">
                                {tiktokConnected && tiktokHandle
                                  ? `Connected as ${tiktokHandle}`
                                  : 'Connect your TikTok account'}
                              </div>
                            </div>
                          </div>
                          {tiktokConnected ? (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                Rewarded
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() =>
                                  window.open(`https://tiktok.com/@${tiktokHandle}`, '_blank')
                                }
                              >
                                Profile
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectTiktok}
                                data-testid="button-disconnect-tiktok"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                +500 Points
                              </Badge>
                              <Button
                                className="bg-black text-white hover:bg-black/80"
                                size="sm"
                                onClick={connectTiktok}
                                disabled={tiktokConnecting}
                                data-testid="button-connect-tiktok"
                              >
                                {tiktokConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* YouTube integration - only show for creators */}
                      {user?.userType === 'creator' && (
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FaYoutube className="h-5 w-5 text-red-500" />
                            <div>
                              <div className="text-white font-medium">YouTube Channel</div>
                              <div className="text-xs text-gray-400">
                                {youtubeConnected && youtubeChannelName
                                  ? `Connected as ${youtubeChannelName}`
                                  : 'Connect your YouTube channel'}
                              </div>
                            </div>
                          </div>
                          {youtubeConnected ? (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                Rewarded
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => window.open('https://youtube.com', '_blank')}
                              >
                                Profile
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectYoutube}
                                data-testid="button-disconnect-youtube"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                +500 Points
                              </Badge>
                              <Button
                                className="bg-red-600 text-white hover:bg-red-700"
                                size="sm"
                                onClick={connectYoutube}
                                disabled={youtubeConnecting}
                                data-testid="button-connect-youtube"
                              >
                                {youtubeConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Spotify integration - only show for creators */}
                      {user?.userType === 'creator' && (
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FaSpotify className="h-5 w-5 text-green-500" />
                            <div>
                              <div className="text-white font-medium">Spotify</div>
                              <div className="text-xs text-gray-400">
                                {spotifyConnected && spotifyDisplayName
                                  ? `Connected as ${spotifyDisplayName}`
                                  : 'Connect your Spotify account'}
                              </div>
                            </div>
                          </div>
                          {spotifyConnected ? (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                Rewarded
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => window.open('https://spotify.com', '_blank')}
                              >
                                Profile
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectSpotify}
                                data-testid="button-disconnect-spotify"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                                +500 Points
                              </Badge>
                              <Button
                                className="bg-green-600 text-white hover:bg-green-700"
                                size="sm"
                                onClick={connectSpotify}
                                disabled={spotifyConnecting}
                                data-testid="button-connect-spotify"
                              >
                                {spotifyConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Discord integration */}
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaDiscord className="h-5 w-5 text-[#5865F2]" />
                          <div>
                            <div className="text-white font-medium">Discord</div>
                            <div className="text-xs text-gray-400">
                              {discordConnected && discordDisplayName
                                ? `Connected as ${discordDisplayName}`
                                : 'Connect your Discord account'}
                            </div>
                          </div>
                        </div>
                        {discordConnected ? (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              Rewarded
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={() => window.open('https://discord.com/app', '_blank')}
                            >
                              Open Discord
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={disconnectDiscord}
                              data-testid="button-disconnect-discord"
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              +500 Points
                            </Badge>
                            <Button
                              className="bg-[#5865F2] text-white hover:bg-[#5865F2]/80"
                              size="sm"
                              onClick={connectDiscord}
                              disabled={discordConnecting}
                              data-testid="button-connect-discord"
                            >
                              {discordConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* Twitch integration */}
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaTwitch className="h-5 w-5 text-[#9146FF]" />
                          <div>
                            <div className="text-white font-medium">Twitch</div>
                            <div className="text-xs text-gray-400">
                              {twitchConnected && twitchDisplayName
                                ? `Connected as ${twitchDisplayName}`
                                : 'Connect your Twitch account'}
                            </div>
                          </div>
                        </div>
                        {twitchConnected ? (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              Rewarded
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={() =>
                                window.open(`https://twitch.tv/${twitchDisplayName}`, '_blank')
                              }
                            >
                              Channel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                              onClick={disconnectTwitch}
                              data-testid="button-disconnect-twitch"
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                              +500 Points
                            </Badge>
                            <Button
                              className="bg-[#9146FF] text-white hover:bg-[#9146FF]/80"
                              size="sm"
                              onClick={connectTwitch}
                              disabled={twitchConnecting}
                              data-testid="button-connect-twitch"
                            >
                              {twitchConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals" className="space-y-6">
              <CreatorReferralDashboard />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-gray-300 border-gray-600 hover:bg-white/10"
                    onClick={() => (window.location.href = '/creator-dashboard/settings')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings Page
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
