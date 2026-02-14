import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FacebookSDKManager } from "@/lib/facebook";
import { useToast } from "@/hooks/use-toast";
import { useFanStats } from "@/hooks/use-fan-dashboard";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Music, 
  Link as LinkIcon,
  Plus,
  Settings,
  Eye,
  Users,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Unlink,
  Target,
  Heart,
  ThumbsUp,
  MessageSquare,
  Share,
  Award,
  Video
} from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import { socialManager } from "@/lib/social-integrations";

export default function FanSocial() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data: fanStats } = useFanStats();
  
  // Get task completion stats for platform breakdown
  const { data: taskStats } = useQuery({
    queryKey: ['/api/fan/dashboard/task-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/fan/dashboard/task-completion-stats?timeframe=monthly');
      return response.json();
    },
    enabled: !!user,
  });

  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  
  // Use the unified Twitter connection hook (handles saving connections properly)
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    disconnect: disconnectTwitter,
  } = useTwitterConnection();
  const twitterHandle = twitterUserInfo?.username || null;
  
  // TikTok connection state
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState<string | null>(null);
  const [tiktokFollowers, setTiktokFollowers] = useState<number>(0);
  const [isCheckingTiktokStatus, setIsCheckingTiktokStatus] = useState(true);

  // YouTube connection state
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const [youtubeChannelName, setYoutubeChannelName] = useState<string | null>(null);
  const [youtubeSubscribers, setYoutubeSubscribers] = useState<number>(0);
  const [isCheckingYoutubeStatus, setIsCheckingYoutubeStatus] = useState(true);

  // Spotify connection state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null);
  const [spotifyFollowers, setSpotifyFollowers] = useState<number>(0);
  const [isCheckingSpotifyStatus, setIsCheckingSpotifyStatus] = useState(true);

  // Discord connection state
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordDisplayName, setDiscordDisplayName] = useState<string | null>(null);
  const [isCheckingDiscordStatus, setIsCheckingDiscordStatus] = useState(true);

  // Twitch connection state
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchConnecting, setTwitchConnecting] = useState(false);
  const [twitchDisplayName, setTwitchDisplayName] = useState<string | null>(null);
  const [twitchFollowers, setTwitchFollowers] = useState<number>(0);
  const [isCheckingTwitchStatus, setIsCheckingTwitchStatus] = useState(true);
  
  // Check social connections status when user becomes available
  // Note: Twitter status is managed by useTwitterConnection hook automatically
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTiktokStatus();
      checkYoutubeStatus();
      checkSpotifyStatus();
      checkDiscordStatus();
      checkTwitchStatus();
    }
  }, [user?.dynamicUserId]);

  const checkDiscordStatus = async () => {
    try {
      setIsCheckingDiscordStatus(true);
      const response = await fetch('/api/social-connections/discord', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const connected = data.connected;
        const connection = data.connection;
        
        setDiscordConnected(connected);
        if (connected && connection) {
          const profile = connection.profileData;
          const displayName = connection.platformDisplayName || profile?.global_name || profile?.username || null;
          setDiscordDisplayName(displayName);
        } else {
          setDiscordDisplayName(null);
        }
      }
    } catch (error) {
      console.error('[Fan Social] Error checking Discord status:', error);
      setDiscordConnected(false);
      setDiscordDisplayName(null);
    } finally {
      setIsCheckingDiscordStatus(false);
    }
  };

  const connectDiscord = async () => {
    try {
      setDiscordConnecting(true);
      const discordAPI = socialManager['discord'];
      const result = await discordAPI.secureLogin();
      if (result.success) {
        await checkDiscordStatus();
        toast({
          title: "Discord Connected! 💬",
          description: result.displayName ? `Connected ${result.displayName}` : "Successfully connected to Discord",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Discord login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Discord connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || 'Failed to connect Discord.',
        variant: 'destructive',
      });
    } finally {
      setDiscordConnecting(false);
    }
  };

  const disconnectDiscord = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('discord');
      
      if (result.success) {
        setDiscordConnected(false);
        setDiscordDisplayName(null);
        toast({
          title: "Discord Disconnected",
          description: "Successfully disconnected from Discord",
        });
      }
    } catch (error) {
      console.error('Error disconnecting Discord:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Discord. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const checkTwitchStatus = async () => {
    try {
      setIsCheckingTwitchStatus(true);
      const response = await fetch('/api/social-connections/twitch', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const connected = data.connected;
      const connection = data.connection;
      
      setTwitchConnected(connected);
      if (connected && connection) {
        const profile = connection.profileData;
        const displayName = 
          connection.platformDisplayName || 
          profile?.display_name ||
          profile?.login ||
          null;
        const followers = 
          profile?.followers || 
          profile?.follower_count || 
          0;
        setTwitchDisplayName(displayName);
        setTwitchFollowers(followers);
      } else {
        setTwitchDisplayName(null);
        setTwitchFollowers(0);
      }
    } catch (error) {
      console.error('[Fan Social] Error checking Twitch status:', error);
      setTwitchConnected(false);
      setTwitchDisplayName(null);
      setTwitchFollowers(0);
    } finally {
      setIsCheckingTwitchStatus(false);
    }
  };

  const connectTwitch = async () => {
    try {
      setTwitchConnecting(true);
      const twitchAPI = socialManager['twitch'];
      const result = await twitchAPI.secureLogin();
      if (result.success) {
        await checkTwitchStatus();
        toast({
          title: "Twitch Connected! 🎮",
          description: result.displayName ? `Connected as ${result.displayName}` : "Successfully connected to Twitch",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Twitch login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Twitch connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || 'Failed to connect Twitch.',
        variant: 'destructive',
      });
    } finally {
      setTwitchConnecting(false);
    }
  };

  const disconnectTwitch = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('twitch');
      
      if (result.success) {
        setTwitchConnected(false);
        setTwitchDisplayName(null);
        setTwitchFollowers(0);
      }
    } catch (error) {
      console.error('Error disconnecting Twitch:', error);
    }
  };

  const checkTiktokStatus = async () => {
    console.log('[Fan Social] Starting TikTok status check...');
    try {
      setIsCheckingTiktokStatus(true);
      const response = await fetch('/api/social-connections/tiktok', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('[Fan Social] TikTok status check failed:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Fan Social] TikTok raw response:', data);
      
      const connected = data.connected;
      const connection = data.connection;
      console.log('[Fan Social] TikTok status check:', { connected, connection });
      
      setTiktokConnected(connected);
      if (connected && connection) {
        const profile = connection.profileData;
        // Check multiple possible fields for the username/handle (same as creator)
        const handle = 
          connection.platformUsername || 
          profile?.display_name || 
          profile?.username ||
          connection.platformDisplayName ||
          null;
        const followers = 
          profile?.follower_count || 
          profile?.followers || 
          0;
        console.log('[Fan Social] TikTok extracted:', { handle, followers });
        setTiktokHandle(handle);
        setTiktokFollowers(followers);
      } else {
        console.log('[Fan Social] TikTok not connected, clearing state');
        setTiktokHandle(null);
        setTiktokFollowers(0);
      }
    } catch (error) {
      console.error('[Fan Social] Error checking TikTok status:', error);
      setTiktokConnected(false);
      setTiktokHandle(null);
      setTiktokFollowers(0);
    } finally {
      setIsCheckingTiktokStatus(false);
    }
  };

  const connectTiktok = async () => {
    try {
      setTiktokConnecting(true);
      // Use popup flow (same as creators) instead of full-page redirect
      const tiktokAPI = socialManager['tiktok'];
      const result = await tiktokAPI.secureLogin();
      
      if (result.success) {
        // Reload status after successful connection
        await checkTiktokStatus();
        toast({
          title: "TikTok Connected! 🎵",
          description: (result as { username?: string }).username ? `Connected @${(result as { username?: string }).username}` : "Successfully connected to TikTok",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'TikTok login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || 'Failed to connect TikTok.',
        variant: 'destructive',
      });
    } finally {
      setTiktokConnecting(false);
    }
  };

  const disconnectTiktok = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('tiktok');
      
      if (result.success) {
        setTiktokConnected(false);
        setTiktokHandle(null);
        setTiktokFollowers(0);
        toast({
          title: "TikTok Disconnected",
          description: "Successfully disconnected from TikTok",
        });
      } else {
        console.error('Failed to disconnect TikTok:', result.error);
        toast({
          title: "Disconnect Failed",
          description: result.error || "Failed to disconnect TikTok.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect TikTok. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('fan');
      const status = await FacebookSDKManager.getLoginStatus();
      setFacebookConnected(status.isLoggedIn);
    } catch (error) {
      console.error('[Fan Social] Error checking Facebook status:', error);
      setFacebookConnected(false);
    }
  };

  const connectFacebook = async () => {
    try {
      setFacebookConnecting(true);
      await FacebookSDKManager.ensureFBReady('fan');
      const result = await FacebookSDKManager.secureLogin('fan');
      if (result.success) {
        setFacebookConnected(true);
        toast({
          title: "Facebook Connected! 🎉",
          description: "Successfully connected to Facebook for fan campaigns.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Facebook login was cancelled or failed.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
    } finally {
      setFacebookConnecting(false);
    }
  };

  const disconnectFacebook = async () => {
    try {
      // Disconnect from backend first
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('facebook');
      // Then logout from Facebook SDK
      await FacebookSDKManager.secureLogout();
      setFacebookConnected(false);
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    } catch (error) {
      console.error('Error during Facebook logout:', error);
      toast({
        title: "Logout Error", 
        description: "Error occurred while disconnecting. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Twitter connect/disconnect are now handled by useTwitterConnection hook

  const checkYoutubeStatus = async () => {
    try {
      setIsCheckingYoutubeStatus(true);
      const response = await fetch('/api/social-connections/youtube', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const connected = data.connected;
        const connection = data.connection;
        
        setYoutubeConnected(connected);
        if (connected && connection) {
          const profile = connection.profileData;
          const channelName = 
            connection.platformDisplayName || 
            profile?.title ||
            profile?.name ||
            profile?.channelTitle ||
            null;
          const subscribers = 
            profile?.subscriberCount || 
            profile?.followers || 
            profile?.follower_count || 
            0;
          setYoutubeChannelName(channelName);
          setYoutubeSubscribers(subscribers);
        } else {
          setYoutubeChannelName(null);
          setYoutubeSubscribers(0);
        }
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
      setYoutubeConnected(false);
    } finally {
      setIsCheckingYoutubeStatus(false);
    }
  };

  const connectYoutube = async () => {
    try {
      setYoutubeConnecting(true);
      // Use popup flow (same as creators) instead of full-page redirect
      const youtubeAPI = socialManager['youtube'];
      const result = await youtubeAPI.secureLogin();
      
      if (result.success) {
        // Reload status after successful connection
        await checkYoutubeStatus();
        toast({
          title: "YouTube Connected! 📺",
          description: result.channelName ? `Connected ${result.channelName}` : "Successfully connected to YouTube",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'YouTube login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('YouTube connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || 'Failed to connect YouTube.',
        variant: 'destructive',
      });
    } finally {
      setYoutubeConnecting(false);
    }
  };

  const disconnectYoutube = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('youtube');
      
      if (result.success) {
        setYoutubeConnected(false);
        setYoutubeChannelName(null);
        setYoutubeSubscribers(0);
        toast({
          title: "YouTube Disconnected",
          description: "Successfully disconnected from YouTube",
        });
      }
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect YouTube. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const checkSpotifyStatus = async () => {
    try {
      setIsCheckingSpotifyStatus(true);
      const response = await fetch('/api/social-connections/spotify', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const connected = data.connected;
        const connection = data.connection;
        
        setSpotifyConnected(connected);
        if (connected && connection) {
          const profile = connection.profileData;
          const displayName = 
            connection.platformDisplayName || 
            profile?.display_name ||
            profile?.name ||
            null;
          const followers = 
            profile?.followers?.total || 
            profile?.follower_count || 
            0;
          setSpotifyDisplayName(displayName);
          setSpotifyFollowers(followers);
        } else {
          setSpotifyDisplayName(null);
          setSpotifyFollowers(0);
        }
      }
    } catch (error) {
      console.error('Error checking Spotify status:', error);
      setSpotifyConnected(false);
    } finally {
      setIsCheckingSpotifyStatus(false);
    }
  };

  const connectSpotify = async () => {
    try {
      setSpotifyConnecting(true);
      // Use popup flow (same as creators) instead of full-page redirect
      const spotifyAPI = socialManager['spotify'];
      const result = await spotifyAPI.secureLogin();
      
      if (result.success) {
        // Reload status after successful connection
        await checkSpotifyStatus();
        toast({
          title: "Spotify Connected! 🎵",
          description: result.displayName ? `Connected ${result.displayName}` : "Successfully connected to Spotify",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Spotify login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Spotify connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || 'Failed to connect Spotify.',
        variant: 'destructive',
      });
    } finally {
      setSpotifyConnecting(false);
    }
  };

  const disconnectSpotify = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      const result = await disconnectSocialPlatform('spotify');
      
      if (result.success) {
        setSpotifyConnected(false);
        setSpotifyDisplayName(null);
        setSpotifyFollowers(0);
      }
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
    }
  };
  
  // For now, we'll use the simple Facebook connect component in the sidebar
  // The social accounts display will show placeholder data except Facebook

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
      platform: "Instagram",
      icon: Instagram,
      handle: "@yourhandle",
      followers: 0,
      connected: false,
      color: "text-pink-500",
      bgColor: "bg-pink-500/20",
      buttonColor: "border-pink-500/30 text-pink-500 hover:bg-pink-500/10",
      description: "Connect to participate in Instagram campaigns"
    },
    {
      platform: "Twitter",
      icon: Twitter,
      handle: twitterConnected && twitterHandle ? `@${twitterHandle}` : "@yourhandle",
      followers: 0,
      connected: twitterConnected,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
      buttonColor: "border-blue-400/30 text-blue-400 hover:bg-blue-400/10",
      description: "Connect to participate in Twitter campaigns"
    },
    {
      platform: "TikTok",
      icon: Video,
      handle: tiktokConnected && tiktokHandle ? `@${tiktokHandle}` : "@yourhandle",
      followers: tiktokFollowers,
      connected: tiktokConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
      buttonColor: "border-purple-400/30 text-purple-400 hover:bg-purple-400/10",
      description: "Connect to participate in TikTok campaigns"
    },
    {
      platform: "YouTube",
      icon: Youtube,
      handle: youtubeConnected && youtubeChannelName ? youtubeChannelName : "Your Channel",
      followers: youtubeSubscribers,
      connected: youtubeConnected,
      color: "text-red-500",
      bgColor: "bg-red-500/20",
      buttonColor: "border-red-500/30 text-red-500 hover:bg-red-500/10",
      description: "Connect to participate in YouTube campaigns"
    },
    {
      platform: "Spotify",
      icon: FaSpotify,
      handle: spotifyConnected && spotifyDisplayName ? spotifyDisplayName : "Your Profile",
      followers: spotifyFollowers,
      connected: spotifyConnected,
      color: "text-green-500",
      bgColor: "bg-green-500/20",
      buttonColor: "border-green-500/30 text-green-500 hover:bg-green-500/10",
      description: "Connect to participate in Spotify campaigns"
    },
    {
      platform: "Discord",
      icon: MessageSquare,
      handle: discordConnected && discordDisplayName ? discordDisplayName : "Your Discord",
      followers: 0,
      connected: discordConnected,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/20",
      buttonColor: "border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10",
      description: "Connect Discord to verify community tasks"
    },
    {
      platform: "Twitch",
      icon: Video,
      handle: twitchConnected && twitchDisplayName ? twitchDisplayName : "Your Twitch",
      followers: twitchFollowers,
      connected: twitchConnected,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      buttonColor: "border-purple-500/30 text-purple-300 hover:bg-purple-500/10",
      description: "Connect Twitch to participate in stream tasks"
    },
    {
      platform: "Facebook",
      icon: Facebook,
      handle: facebookConnected ? (user?.email || "Connected") : "Connect Facebook",
      followers: 0,
      connected: facebookConnected,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      buttonColor: "border-blue-500/30 text-blue-500 hover:bg-blue-500/10",
      description: "Connect to participate in Facebook campaigns and earn rewards"
    }
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
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${account.bgColor} rounded-full flex items-center justify-center`}>
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
                              <Badge variant="outline" className="border-gray-500/30 text-gray-400 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{account.handle}</p>
                          {account.connected && account.followers > 0 && (
                            <p className="text-xs text-gray-500">{formatFollowers(account.followers)} followers</p>
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
                        <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">Rewarded</Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={() => {
                            if (account.platform === 'Facebook') disconnectFacebook();
                            else if (account.platform === 'Twitter') disconnectTwitter();
                            else if (account.platform === 'TikTok') disconnectTiktok();
                            else if (account.platform === 'YouTube') disconnectYoutube();
                            else if (account.platform === 'Spotify') disconnectSpotify();
                            else if (account.platform === 'Discord') disconnectDiscord();
                            else if (account.platform === 'Twitch') disconnectTwitch();
                          }}
                          data-testid={`button-disconnect-${account.platform.toLowerCase()}-fan`}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">+500 Points</Badge>
                        <Button 
                          variant="outline" 
                          className={account.buttonColor}
                          onClick={() => {
                            if (account.platform === 'Facebook') connectFacebook();
                            else if (account.platform === 'Twitter') connectTwitter();
                            else if (account.platform === 'TikTok') connectTiktok();
                            else if (account.platform === 'YouTube') connectYoutube();
                            else if (account.platform === 'Spotify') connectSpotify();
                            else if (account.platform === 'Discord') connectDiscord();
                            else if (account.platform === 'Twitch') connectTwitch();
                          }}
                          disabled={
                            (account.platform === 'Facebook' && facebookConnecting) ||
                            (account.platform === 'Twitter' && twitterConnecting) ||
                            (account.platform === 'TikTok' && tiktokConnecting) ||
                            (account.platform === 'YouTube' && youtubeConnecting) ||
                            (account.platform === 'Spotify' && spotifyConnecting) ||
                            (account.platform === 'Discord' && discordConnecting) ||
                            (account.platform === 'Twitch' && twitchConnecting) ||
                            account.platform === 'Instagram'
                          }
                          data-testid={`button-connect-${account.platform.toLowerCase()}-fan`}
                        >
                          {(
                            (account.platform === 'Facebook' && facebookConnecting) ||
                            (account.platform === 'Twitter' && twitterConnecting) ||
                            (account.platform === 'TikTok' && tiktokConnecting) ||
                            (account.platform === 'YouTube' && youtubeConnecting) ||
                            (account.platform === 'Spotify' && spotifyConnecting) ||
                            (account.platform === 'Discord' && discordConnecting) ||
                            (account.platform === 'Twitch' && twitchConnecting)
                          ) ? 'Connecting…' : account.platform === 'Instagram' ? 'Coming Soon' : 'Connect'}
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
                    onClick={() => window.location.href = '/fan-dashboard/tasks'}
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
                      <Badge className="bg-green-500/20 text-green-400">Spotify tasks available</Badge>
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
                        <span className="text-sm font-medium text-white">{totalPointsEarned.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Rewards Claimed</span>
                        <span className="text-sm font-medium text-white">{fanStats?.rewardsEarned || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Earning Tips</h4>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Connect multiple platforms to access more campaigns</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-secondary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Engage authentically to maximize your rewards</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-brand-accent mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300">Join campaigns early for bonus multipliers</p>
                      </div>
                    </div>
                  </div>

                  {/* Connected Platforms Status */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Connected Platforms</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">Twitter</span>
                        <Badge className={twitterConnected ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {twitterConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">TikTok</span>
                        <Badge className={tiktokConnected ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {tiktokConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">YouTube</span>
                        <Badge className={youtubeConnected ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {youtubeConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">Spotify</span>
                        <Badge className={spotifyConnected ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {spotifyConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">Discord</span>
                        <Badge className={discordConnected ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {discordConnected ? "Connected" : "Not Connected"}
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