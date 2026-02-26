import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FacebookSDKManager, FacebookPage } from "@/lib/facebook";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { SyncControls } from "@/components/analytics/SyncControls";
import { useSyncHistory } from "@/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Link as LinkIcon,
  Plus,
  Settings,
  Users,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Unlink,
  Video
} from "lucide-react";
import { FaSpotify, FaDiscord, FaTwitch } from "react-icons/fa";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import { 
  useTikTokConnection,
  useYouTubeConnection,
  useSpotifyConnection,
  useDiscordConnection,
  useTwitchConnection,
  useFacebookConnection,
} from "@/hooks/use-social-connection";

function SyncHistorySection() {
  const { data, isLoading } = useSyncHistory(10);
  const logs = data?.logs || [];

  if (isLoading || logs.length === 0) return null;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm">Recent Sync Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${log.status === 'completed' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <span className="text-sm text-white capitalize">{log.platform}</span>
                <span className="text-xs text-gray-400">{log.syncType}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {log.itemsSynced > 0 && <span>{log.itemsSynced} items</span>}
                {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                <span>{new Date(log.startedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreatorSocial() {
  // Format follower counts: comma format below 10k, K-format at 10k+
  const formatFollowers = (num: number): string => {
    if (!num || num < 0) return '0';
    if (num >= 10000) {
      const val = num / 1000;
      const dec = val < 100 ? 1 : 0; // 10k-99.9k -> 1 decimal, 100k+ -> no decimals
      return `${val.toFixed(dec)}K`;
    }
    return num.toLocaleString();
  };
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Instagram connection state
  const { 
    isConnected: instagramConnected, 
    isConnecting: instagramConnecting,
    userInfo: instagramUserInfo,
    connectInstagram,
    disconnectInstagram
  } = useInstagramConnection();
  
  // Facebook connection via unified hook (same pattern as Twitter)
  const {
    isConnected: facebookConnected,
    isConnecting: facebookConnecting,
    userInfo: facebookUserInfo,
    connect: connectFacebook,
    disconnect: disconnectFacebook,
    refresh: refreshFacebook,
  } = useFacebookConnection();
  
  // Facebook page state (needed for page selection UI on social page)
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [showPageModal, setShowPageModal] = useState(false);
  
  // Twitter connection using unified hook
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    disconnect: disconnectTwitter
  } = useTwitterConnection();
  
  const twitterHandle = twitterUserInfo?.username || null;
  const twitterFollowers = twitterUserInfo?.followersCount || twitterUserInfo?.followers_count || 0;

  // TikTok connection via standardized hook
  const {
    isConnected: tiktokConnected,
    isConnecting: tiktokConnecting,
    userInfo: tiktokUserInfo,
    connect: connectTiktok,
    disconnect: disconnectTiktok,
  } = useTikTokConnection();

  const tiktokHandle = tiktokUserInfo?.username || tiktokUserInfo?.displayName || null;
  const tiktokFollowers = tiktokUserInfo?.followersCount || tiktokUserInfo?.followers_count || 0;

  // YouTube connection via standardized hook
  const {
    isConnected: youtubeConnected,
    isConnecting: youtubeConnecting,
    userInfo: youtubeUserInfo,
    connect: connectYoutube,
    disconnect: disconnectYoutube,
  } = useYouTubeConnection();

  const youtubeChannelName = youtubeUserInfo?.displayName || youtubeUserInfo?.name || null;
  const youtubeSubscribers = youtubeUserInfo?.followersCount || youtubeUserInfo?.followers_count || 0;

  // Spotify connection via standardized hook
  const {
    isConnected: spotifyConnected,
    isConnecting: spotifyConnecting,
    userInfo: spotifyUserInfo,
    connect: connectSpotify,
    disconnect: disconnectSpotify,
  } = useSpotifyConnection();

  const spotifyDisplayName = spotifyUserInfo?.displayName || spotifyUserInfo?.name || null;
  const spotifyFollowers = spotifyUserInfo?.followersCount || spotifyUserInfo?.followers_count || 0;

  // Discord connection via standardized hook
  const {
    isConnected: discordConnected,
    isConnecting: discordConnecting,
    userInfo: discordUserInfo,
    connect: connectDiscord,
    disconnect: disconnectDiscord,
  } = useDiscordConnection();

  const discordDisplayName = discordUserInfo?.displayName || discordUserInfo?.username || null;

  // Twitch connection via standardized hook
  const {
    isConnected: twitchConnected,
    isConnecting: twitchConnecting,
    userInfo: twitchUserInfo,
    connect: connectTwitch,
    disconnect: disconnectTwitch,
  } = useTwitchConnection();

  const twitchDisplayName = twitchUserInfo?.displayName || twitchUserInfo?.username || null;
  const twitchFollowers = twitchUserInfo?.followersCount || twitchUserInfo?.followers_count || 0;

  // Load Facebook pages when connection status changes to connected
  useEffect(() => {
    if (facebookConnected) {
      loadFacebookPages();
    } else {
      setFacebookPages([]);
      setActivePage(null);
    }
  }, [facebookConnected]);

  const loadFacebookPages = async () => {
    try {
      // Try live SDK pages first
      let pages: FacebookPage[] = [];
      try {
        await FacebookSDKManager.ensureFBReady('creator');
        const status = await FacebookSDKManager.getLoginStatus();
        if (status.isLoggedIn) {
          pages = await FacebookSDKManager.getUserPages();
        }
      } catch {
        // SDK not available
      }

      // Fall back to stored pages from database profile data
      if (pages.length === 0 && facebookUserInfo) {
        const { getSocialConnection } = await import('@/lib/social-connection-api');
        const { connection } = await getSocialConnection('facebook');
        if (connection?.profileData?.pages?.length) {
          pages = connection.profileData.pages;
        }
      }

      setFacebookPages(pages);
      
      if (pages.length > 0) {
        const savedActivePageId = localStorage.getItem('fandomly_active_facebook_page_id');
        let pageToSet: FacebookPage | null = null;
        
        if (savedActivePageId) {
          pageToSet = pages.find(page => page.id === savedActivePageId) || null;
        }
        
        if (!pageToSet) {
          pageToSet = pages[0];
        }
        
        setActivePage(pageToSet);
        localStorage.setItem('fandomly_active_facebook_page_id', pageToSet.id);
      } else {
        setActivePage(null);
        localStorage.removeItem('fandomly_active_facebook_page_id');
      }
    } catch (error) {
      console.error('Error loading Facebook pages:', error);
      setFacebookPages([]);
      setActivePage(null);
      localStorage.removeItem('fandomly_active_facebook_page_id');
    }
  };

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

  // Calculate dynamic stats
  const getConnectedPlatformsCount = () => {
    let count = 0;
    if (instagramConnected) count++;
    if (twitterConnected) count++;
    if (facebookConnected) count++;
    if (tiktokConnected) count++;
    if (youtubeConnected) count++;
    if (spotifyConnected) count++;
    if (discordConnected) count++;
    if (twitchConnected) count++;
    return count;
  };

  const getTotalFollowers = () => {
    let total = 0;
    if (instagramConnected && instagramUserInfo?.followers_count) {
      total += instagramUserInfo.followers_count;
    }
    if (twitterConnected) {
      total += twitterFollowers;
    }
    if (tiktokConnected) {
      total += tiktokFollowers;
    }
    if (youtubeConnected) {
      total += youtubeSubscribers;
    }
    if (spotifyConnected) {
      total += spotifyFollowers;
    }
    if (twitchConnected) {
      total += twitchFollowers;
    }
    // Facebook page followers and Discord don't have follower counts
    return total;
  };

  const getAverageEngagement = () => {
    const connectedCount = getConnectedPlatformsCount();
    if (connectedCount === 0) return "0%";
    return "Active"; // For now, show Active when any platform is connected
  };

  // Get real Facebook and Instagram data, static data for other platforms
  const socialAccounts = [
    {
      platform: "Instagram",
      icon: Instagram,
      handle: instagramConnected && instagramUserInfo ? `@${instagramUserInfo.username}` : "Not connected",
      followers: instagramConnected && instagramUserInfo ? 
        `${formatFollowers(instagramUserInfo.followers_count || 0)} Followers` : 
        "0 Followers",
      engagement: instagramConnected ? "Active" : "—",
      connected: instagramConnected,
      color: "text-pink-400",
      bgColor: "bg-pink-400/20"
    },
    {
      platform: "Twitter",
      icon: Twitter,
      handle: twitterConnected && twitterHandle ? `@${twitterHandle}` : '@yourhandle',
      followers: twitterConnected ? `${formatFollowers(twitterFollowers)} Followers` : "0 Followers",
      engagement: twitterConnected ? "Active" : "—",
      connected: twitterConnected,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20"
    },
    {
      platform: "TikTok",
      icon: Video,
      handle: tiktokConnected && tiktokHandle ? `@${tiktokHandle}` : '@yourhandle',
      followers: tiktokConnected ? `${formatFollowers(tiktokFollowers)} Followers` : "0 Followers",
      engagement: tiktokConnected ? "Active" : "—",
      connected: tiktokConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20"
    },
    {
      platform: "YouTube",
      icon: Youtube,
      handle: youtubeConnected && youtubeChannelName ? youtubeChannelName : "Your Channel",
      followers: youtubeConnected ? `${formatFollowers(youtubeSubscribers)} Subscribers` : "0 Subscribers",
      engagement: youtubeConnected ? "Active" : "—",
      connected: youtubeConnected,
      color: "text-red-400",
      bgColor: "bg-red-400/20"
    },
    {
      platform: "Spotify",
      icon: FaSpotify,
      handle: spotifyConnected && spotifyDisplayName ? spotifyDisplayName : "Your Artist Profile",
      followers: spotifyConnected ? `${formatFollowers(spotifyFollowers)} Followers` : "0 Followers",
      engagement: spotifyConnected ? "Active" : "—",
      connected: spotifyConnected,
      color: "text-green-400",
      bgColor: "bg-green-400/20"
    },
    // Facebook managed by state above
    {
      platform: "Facebook",
      icon: Facebook,
      handle: facebookConnected && activePage ? activePage.name : (facebookConnected ? "No active page" : "@your-page"),
      followers: facebookConnected && activePage?.followers_count ? 
        `${activePage.followers_count.toLocaleString()}` : "0",
      engagement: facebookConnected && activePage ? "Active" : (facebookConnected ? "Select page" : "Connect to view"), 
      connected: facebookConnected,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      isManaged: true // Flag to show it's managed separately
    },
    {
      platform: "Discord",
      icon: FaDiscord,
      handle: discordConnected && discordDisplayName ? discordDisplayName : "Not connected",
      followers: "—", // Discord doesn't have public follower counts
      engagement: discordConnected ? "Active" : "—",
      connected: discordConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20"
    },
    {
      platform: "Twitch",
      icon: FaTwitch,
      handle: twitchConnected && twitchDisplayName ? twitchDisplayName : "Not connected",
      followers: twitchConnected ? `${formatFollowers(twitchFollowers)} Followers` : "0 Followers",
      engagement: twitchConnected ? "Active" : "—",
      connected: twitchConnected,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20"
    }
  ];

  // Social activity filter state
  const [activityFilters, setActivityFilters] = useState({
    instagram: true,
    twitter: true,
    tiktok: true,
    facebook: true,
    youtube: true,
    spotify: true,
    discord: true,
    twitch: true
  });

  const toggleFilter = (platform: keyof typeof activityFilters) => {
    setActivityFilters(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Social Accounts</h1>
              <p className="text-gray-400">
                Connect and manage your social media platforms for automated fan rewards.
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Connect Platform
              </Button>
            </div>
          </div>

          {/* Connected Accounts Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{getConnectedPlatformsCount()}</div>
                <div className="text-sm text-gray-400">Connected Platforms</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-brand-secondary" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {formatFollowers(getTotalFollowers())}
                </div>
                <div className="text-sm text-gray-400">Total Followers</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{getAverageEngagement()}</div>
                <div className="text-sm text-gray-400">Avg Engagement</div>
              </CardContent>
            </Card>
          </div>

          {/* Social Media Platforms */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Social Media Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialAccounts.map((account, index) => {
                  const Icon = account.icon;
                  return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      {/* Icon and Platform Info */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 flex-shrink-0 ${account.bgColor} rounded-full flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${account.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="text-white font-medium">{account.platform}</h4>
                            {account.connected ? (
                              <>
                                <Badge className="bg-green-500/20 text-green-400 text-xs flex-shrink-0">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs flex-shrink-0">
                                  Rewarded
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs flex-shrink-0">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Connected
                                </Badge>
                                <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs flex-shrink-0">
                                  +500 Points
                                </Badge>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">{account.handle}</p>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-bold text-white">{account.followers}</div>
                          <p className="text-xs sm:text-sm text-gray-400">{account.engagement} engagement</p>
                        </div>
                      
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                        {account.platform === "Facebook" ? (
                          // Facebook-specific buttons using unified state
                          account.connected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                                onClick={disconnectFacebook}
                                data-testid="button-disconnect-facebook-social"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                              {facebookPages.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg_white/10"
                                  onClick={() => setShowPageModal(true)}
                                  data-testid="button-switch-facebook-page"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Switch Page
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button 
                              className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
                              onClick={connectFacebook}
                              disabled={facebookConnecting}
                              data-testid="button-connect-facebook-social"
                            >
                              {facebookConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          )
                        ) : account.platform === "Instagram" ? (
                          // Instagram-specific buttons using real state
                          account.connected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={disconnectInstagram}
                                data-testid="button-disconnect-instagram-social"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Disconnect
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                                onClick={() => window.open(`https://instagram.com/${instagramUserInfo?.username}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
                              onClick={connectInstagram}
                              disabled={instagramConnecting}
                              data-testid="button-connect-instagram-social"
                            >
                              {instagramConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                          )
                        ) : (
                          account.platform === 'Twitter' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectTwitter}
                                  data-testid="button-disconnect-twitter-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg-white/10" 
                                  onClick={() => window.open(`https://twitter.com/${twitterHandle}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-black text-white hover:bg-black/80" 
                                onClick={connectTwitter} 
                                disabled={twitterConnecting}
                                data-testid="button-connect-twitter-social"
                              >
                                {twitterConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'TikTok' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectTiktok}
                                  data-testid="button-disconnect-tiktok-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-gray-300 hover:bg-white/10" 
                                  onClick={() => window.open(`https://tiktok.com/@${tiktokHandle}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700" 
                                onClick={connectTiktok} 
                                disabled={tiktokConnecting}
                                data-testid="button-connect-tiktok-social"
                              >
                                {tiktokConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'YouTube' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectYoutube}
                                  data-testid="button-disconnect-youtube-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-red-600 hover:bg-red-700" 
                                onClick={connectYoutube} 
                                disabled={youtubeConnecting}
                                data-testid="button-connect-youtube-social"
                              >
                                {youtubeConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'Spotify' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectSpotify}
                                  data-testid="button-disconnect-spotify-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-green-600 hover:bg-green-700" 
                                onClick={connectSpotify} 
                                disabled={spotifyConnecting}
                                data-testid="button-connect-spotify-social"
                              >
                                {spotifyConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'Discord' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectDiscord}
                                  data-testid="button-disconnect-discord-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700" 
                                onClick={connectDiscord} 
                                disabled={discordConnecting}
                                data-testid="button-connect-discord-social"
                              >
                                {discordConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : account.platform === 'Twitch' ? (
                            account.connected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-white/20 text-white hover:bg-white/10"
                                  onClick={disconnectTwitch}
                                  data-testid="button-disconnect-twitch-social"
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700" 
                                onClick={connectTwitch} 
                                disabled={twitchConnecting}
                                data-testid="button-connect-twitch-social"
                              >
                                {twitchConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            )
                          ) : (
                            // Other platform buttons (static for now)
                            account.connected ? (
                            <>
                              <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                                <Settings className="h-4 w-4 mr-1" />
                                Settings
                              </Button>
                              <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                            ) : (
                              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                                Connect
                              </Button>
                            )
                          )
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Data Sync Settings */}
          <SyncControls />

          {/* Sync History */}
          <SyncHistorySection />
        </div>
      
      {/* Facebook Page Selection Modal */}
      <Dialog open={showPageModal} onOpenChange={setShowPageModal}>
        <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Facebook Pages</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              Select which Facebook page to use for your campaigns. Only one page can be active at a time.
            </div>
            
            {facebookPages.length > 0 ? (
              <div className="space-y-3">
                {facebookPages.map((page, index) => (
                  <div 
                    key={page.id} 
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      activePage?.id === page.id 
                        ? 'border-brand-primary bg-brand-primary/10' 
                        : 'border-white/20 hover:border-white/30 bg-white/5'
                    }`}
                    onClick={() => {
                      setActivePage(page);
                      localStorage.setItem('fandomly_active_facebook_page_id', page.id);
                      toast({
                        title: "Active Page Changed",
                        description: `"${page.name}" is now your active Facebook page.`,
                        duration: 3000
                      });
                    }}
                    data-testid={`facebook-page-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={page.picture?.data?.url} alt={page.name} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400">
                          {page.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-white font-medium">{page.name}</div>
                          {activePage?.id === page.id && (
                            <Badge className="bg-brand-primary/20 text-brand-primary text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {page.category} • {page.followers_count?.toLocaleString() || 0} followers
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No Facebook pages found. Connect to Facebook first.
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                onClick={async () => {
                  try {
                    // Re-login to get access to potentially new pages
                    await FacebookSDKManager.secureLogin('creator');
                    await loadFacebookPages();
                    toast({
                      title: "Pages Refreshed",
                      description: "Successfully refreshed your Facebook pages.",
                      duration: 3000
                    });
                  } catch (error) {
                    console.error('Error refreshing pages:', error);
                    toast({
                      title: "Refresh Failed",
                      description: "Failed to refresh Facebook pages. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
                data-testid="button-refresh-facebook-pages"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Pages
              </Button>
              
              <Button 
                onClick={() => setShowPageModal(false)}
                className="bg-brand-primary hover:bg-brand-primary/80"
                data-testid="button-close-page-modal"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}