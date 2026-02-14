import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FanProfileEditModal from "@/components/fan/fan-profile-edit-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Heart, 
  Trophy, 
  Star,
  Edit,
  Camera,
  Facebook,
  Instagram,
  Twitter,
  Video,
  Youtube,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Unlink,
  Link as LinkIcon,
  MessageSquare,
  Users,
  Music,
  Phone
} from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import { FacebookSDKManager } from "@/lib/facebook";
import { socialManager } from "@/lib/social-integrations";
import { getCreatorTypeLabel } from "@shared/fanInterestOptions";
import FanReferralDashboard from "@/components/referrals/FanReferralDashboard";
import { Link } from "wouter";

export default function FanProfile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Facebook import state
  const [isImporting, setIsImporting] = useState(false);
  const [isConnectedToFacebook, setIsConnectedToFacebook] = useState(false);
  
  // Twitter connection via unified hook (handles saving connections properly)
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    disconnect: disconnectTwitter,
  } = useTwitterConnection();
  const twitterHandle = twitterUserInfo?.username || null;
  
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookUser, setFacebookUser] = useState<{ id: string; name?: string } | null>(null);
  
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState<string | null>(null);
  const [tiktokFollowers, setTiktokFollowers] = useState<number>(0);

  // YouTube connection state
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const [youtubeChannelName, setYoutubeChannelName] = useState<string | null>(null);
  const [youtubeSubscribers, setYoutubeSubscribers] = useState<number>(0);

  // Spotify connection state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null);
  const [spotifyFollowers, setSpotifyFollowers] = useState<number>(0);
  
  // Check social connections status when user becomes available
  // Note: Twitter status is managed by useTwitterConnection hook automatically
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTiktokStatus();
      checkYoutubeStatus();
      checkSpotifyStatus();
    }
  }, [user?.dynamicUserId]);

  // Twitter status is managed by useTwitterConnection hook automatically

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('fan');
      const status = await FacebookSDKManager.getLoginStatus();
      if (status.isLoggedIn) {
        setFacebookConnected(true);
        // Get user info
        window.FB.api('/me', 'GET', { fields: 'id,name' }, (response: any) => {
          if (response && !response.error) {
            setFacebookUser({ id: response.id, name: response.name });
          }
        });
      }
    } catch (error) {
      console.error('[Fan Profile] Error checking Facebook status:', error);
      setFacebookConnected(false);
    }
  };

  const checkTiktokStatus = async () => {
    console.log('[Fan Profile] Starting TikTok status check...');
    try {
      const response = await fetch('/api/social-connections/tiktok', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('[Fan Profile] TikTok status check failed:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Fan Profile] TikTok raw response:', data);
      
      const connected = data.connected;
      const connection = data.connection;
      console.log('[Fan Profile] TikTok status check:', { connected, connection });
      
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
        console.log('[Fan Profile] TikTok extracted:', { handle, followers });
        setTiktokHandle(handle);
        setTiktokFollowers(followers);
      } else {
        console.log('[Fan Profile] TikTok not connected, clearing state');
        setTiktokHandle(null);
        setTiktokFollowers(0);
      }
    } catch (error) {
      console.error('[Fan Profile] Error checking TikTok status:', error);
      setTiktokConnected(false);
      setTiktokHandle(null);
      setTiktokFollowers(0);
    }
  };
  
  // Facebook profile import mutation (Fan-specific)
  const importFacebookProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      
      // First ensure we're connected to Facebook (using FAN App ID)
      if (!isConnectedToFacebook) {
        const result = await FacebookSDKManager.secureLogin('fan');
        if (!result.success) {
          throw new Error(result.error || "Failed to connect to Facebook");
        }
        setIsConnectedToFacebook(true);
      }
      
      // Get user profile data from Facebook
      return new Promise((resolve, reject) => {
        window.FB.api('/me', 'GET', {
          fields: 'id,name,email,picture.width(200).height(200)'
        }, (response) => {
          if (response && !response.error) {
            // Call backend to save the imported data
            apiRequest("POST", "/api/auth/facebook-profile-import", {
              userId: user.id,
              facebookData: {
                id: response.id,
                name: response.name,
                email: response.email,
                picture: response.picture?.data?.url
              }
            })
            .then(resolve)
            .catch(reject);
          } else {
            reject(new Error(response?.error?.message || "Failed to get Facebook profile data"));
          }
        });
      });
    },
    onSuccess: () => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Profile Imported! 🎉",
        description: "Successfully imported your profile data from Facebook.",
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import profile from Facebook.",
        variant: "destructive"
      });
    }
  });
  
  const handleImportFromFacebook = async () => {
    setIsImporting(true);
    try {
      await importFacebookProfile.mutateAsync();
    } finally {
      setIsImporting(false);
    }
  };

  // Twitter connect/disconnect are handled by useTwitterConnection hook

  const connectFacebook = async () => {
    try {
      setFacebookConnecting(true);
      await FacebookSDKManager.ensureFBReady('fan');
      const result = await FacebookSDKManager.secureLogin('fan');
      if (result.success) {
        setFacebookConnected(true);
        // Fetch user info for profile link
        window.FB.api('/me', 'GET', { fields: 'id,name' }, (response: any) => {
          if (response && !response.error) {
            setFacebookUser({ id: response.id, name: response.name });
          }
        });
        toast({ title: 'Facebook Connected', description: result.user?.name || 'Connected successfully' });
      } else {
        toast({ title: 'Facebook Connect Failed', description: result.error || 'Try again', variant: 'destructive' });
      }
    } finally {
      setFacebookConnecting(false);
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
        title: "Connection Failed",
        description: error.message || 'Failed to connect TikTok. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTiktokConnecting(false);
    }
  };

  // disconnectTwitter is provided by useTwitterConnection hook

  const disconnectFacebook = async () => {
    try {
      // Disconnect from backend first
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('facebook');
      // Then logout from Facebook SDK
      await FacebookSDKManager.secureLogout();
      setFacebookConnected(false);
      setFacebookUser(null);
      toast({ title: 'Facebook Disconnected', description: 'Successfully disconnected' });
    } catch (error) {
      console.error('Facebook disconnect error:', error);
      toast({ title: 'Disconnect Failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const disconnectTiktok = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('tiktok');
      setTiktokConnected(false);
      setTiktokHandle(null);
      setTiktokFollowers(0);
      toast({ title: "TikTok Disconnected", description: "Your TikTok account has been disconnected." });
    } catch (error) {
      toast({ title: "Disconnection Failed", description: "Failed to disconnect TikTok. Please try again.", variant: 'destructive' });
    }
  };

  const checkYoutubeStatus = async () => {
    try {
      const response = await fetch('/api/social-connections/youtube', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setYoutubeConnected(data.connected);
        if (data.connected && data.connection) {
          const profile = data.connection.profileData;
          setYoutubeChannelName(data.connection.platformDisplayName || profile?.title || null);
          setYoutubeSubscribers(profile?.subscriberCount || 0);
        }
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
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
      toast({ title: 'Connection Failed', description: error.message || 'Failed to connect YouTube.', variant: 'destructive' });
    } finally {
      setYoutubeConnecting(false);
    }
  };

  const disconnectYoutube = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('youtube');
      setYoutubeConnected(false);
      setYoutubeChannelName(null);
      setYoutubeSubscribers(0);
      toast({ title: "YouTube Disconnected", description: "Your YouTube account has been disconnected." });
    } catch (error) {
      toast({ title: "Disconnection Failed", description: "Failed to disconnect YouTube.", variant: 'destructive' });
    }
  };

  const checkSpotifyStatus = async () => {
    try {
      const response = await fetch('/api/social-connections/spotify', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSpotifyConnected(data.connected);
        if (data.connected && data.connection) {
          const profile = data.connection.profileData;
          setSpotifyDisplayName(data.connection.platformDisplayName || profile?.display_name || null);
          setSpotifyFollowers(profile?.followers?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error checking Spotify status:', error);
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
      toast({ title: 'Connection Failed', description: error.message || 'Failed to connect Spotify.', variant: 'destructive' });
    } finally {
      setSpotifyConnecting(false);
    }
  };

  const disconnectSpotify = async () => {
    try {
      const { disconnectSocialPlatform } = await import('@/lib/social-connection-api');
      await disconnectSocialPlatform('spotify');
      setSpotifyConnected(false);
      setSpotifyDisplayName(null);
      setSpotifyFollowers(0);
      toast({ title: "Spotify Disconnected", description: "Your Spotify account has been disconnected." });
    } catch (error) {
      toast({ title: "Disconnection Failed", description: "Failed to disconnect Spotify.", variant: 'destructive' });
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
        <div className="text-white">Please connect your wallet to access your profile.</div>
      </div>
    );
  }

  // Generate initials for placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userInitials = getInitials(user.profileData?.name || user.username || 'Fan');

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Fan Profile</h1>
            <p className="text-gray-400">
              Manage your fan profile and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Overview + Personal Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10 overflow-hidden">
                {/* Banner Image Section */}
                <div className="relative h-32">
                  {user.profileData?.bannerImage ? (
                    <img 
                      src={user.profileData.bannerImage} 
                      alt="Profile Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-brand-primary/30 via-brand-secondary/30 to-brand-accent/30" />
                  )}
                  
                  {/* Upload Banner Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-black/70 hover:text-white"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Upload Banner
                  </Button>
                </div>

                <CardHeader className="text-center -mt-16 relative">
                  <div className="relative mx-auto mb-4">
                    {/* Profile Photo */}
                    <div className="relative">
                      <Avatar className="w-32 h-32 mx-auto ring-4 ring-gray-900" data-testid="img-fan-profile-photo">
                        <AvatarImage 
                          src={user.avatar || user.profileData?.avatar} 
                          alt={user.profileData?.name || user.username || "Fan"} 
                        />
                        <AvatarFallback className="w-32 h-32 bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-2xl font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Camera Icon Overlay - Make it clickable */}
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="absolute bottom-2 right-2 bg-brand-primary hover:bg-brand-primary/80 backdrop-blur-sm rounded-full p-2 transition-colors cursor-pointer"
                        title="Upload Profile Photo"
                      >
                        <Camera className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-gray-300 border-gray-600 hover:bg-white/10"
                      onClick={handleImportFromFacebook}
                      disabled={isImporting || importFacebookProfile.isPending}
                      data-testid="button-import-facebook-profile"
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      {isImporting || importFacebookProfile.isPending ? 'Importing...' : 'Import from Facebook'}
                    </Button>
                  </div>
                  
                  <CardTitle className="text-white text-xl">
                    {user.profileData?.name || user.username || "Fan"}
                  </CardTitle>
                  
                  <div className="flex items-center justify-center mt-2">
                    <Badge variant="secondary" className="bg-brand-primary/20 text-brand-primary">
                      Fan Account
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Mail className="mr-1 h-4 w-4" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  {/* Fan Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm flex items-center">
                        <Heart className="mr-2 h-4 w-4 text-red-400" />
                        Enrolled
                      </span>
                      <span className="text-white font-semibold">5</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm flex items-center">
                        <Trophy className="mr-2 h-4 w-4 text-yellow-400" />
                        Total Points
                      </span>
                      <span className="text-white font-semibold">1,250</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm flex items-center">
                        <Star className="mr-2 h-4 w-4 text-purple-400" />
                        Achievements
                      </span>
                      <span className="text-white font-semibold">8</span>
                    </div>
                  </div>

                  
                  <Separator className="bg-white/10" />
                  
                  <Button 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80" 
                    data-testid="button-edit-fan-profile"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Personal Information - Moved to Left Column */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-300">Username</label>
                      <div className="text-white font-medium">
                        @{user.username || "Not set"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-300">Display Name</label>
                      <div className="text-white font-medium">
                        {user.profileData?.name || "Not set"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-300">Age</label>
                      <div className="text-white font-medium">
                        {user.profileData?.age || "Not set"}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-300">Email</label>
                      <div className="text-white font-medium">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      variant="outline" 
                      className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                      data-testid="button-edit-personal-info"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Update Information
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column - Activity, Social, Referral, Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activity - Moved to Top */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Star className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            Earned 50 points
                          </div>
                          <div className="text-gray-400 text-xs">
                            Liked @athlete's post • 2 hours ago
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        +50 pts
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Heart className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            Enrolled in creator program
                          </div>
                          <div className="text-gray-400 text-xs">
                            @musician_name • Yesterday
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            Achievement unlocked
                          </div>
                          <div className="text-gray-400 text-xs">
                            "First Campaign Complete" • 2 days ago
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Accounts */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <LinkIcon className="mr-2 h-5 w-5" />
                    Social Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Facebook */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-white font-medium">Facebook</div>
                        <div className="text-xs text-gray-400">
                          {facebookConnected && facebookUser ? `Connected as ${facebookUser.name}` : 'Connect your Facebook account'}
                        </div>
                      </div>
                    </div>
                    {facebookConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectFacebook}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                        onClick={connectFacebook}
                        disabled={facebookConnecting}
                      >
                        {facebookConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </div>

                  {/* Twitter */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Twitter className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-white font-medium">X (Twitter)</div>
                        <div className="text-xs text-gray-400">
                          {twitterConnected && twitterHandle ? `Connected as @${twitterHandle}` : 'Connect your X account'}
                        </div>
                      </div>
                    </div>
                    {twitterConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectTwitter}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                        onClick={connectTwitter}
                        disabled={twitterConnecting}
                      >
                        {twitterConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </div>

                  {/* TikTok */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-purple-400" />
                      <div>
                        <div className="text-white font-medium">TikTok</div>
                        <div className="text-xs text-gray-400">
                          {tiktokConnected && tiktokHandle ? `Connected as @${tiktokHandle}` : 'Connect your TikTok account'}
                        </div>
                      </div>
                    </div>
                    {tiktokConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectTiktok}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                        onClick={connectTiktok}
                        disabled={tiktokConnecting}
                      >
                        {tiktokConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </div>

                  {/* YouTube */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="text-white font-medium">YouTube</div>
                        <div className="text-xs text-gray-400">
                          {youtubeConnected && youtubeChannelName ? `Connected: ${youtubeChannelName}` : 'Connect your YouTube channel'}
                        </div>
                      </div>
                    </div>
                    {youtubeConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectYoutube}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={connectYoutube}
                        disabled={youtubeConnecting}
                      >
                        {youtubeConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </div>

                  {/* Spotify */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaSpotify className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="text-white font-medium">Spotify</div>
                        <div className="text-xs text-gray-400">
                          {spotifyConnected && spotifyDisplayName ? `Connected: ${spotifyDisplayName}` : 'Connect your Spotify account'}
                        </div>
                      </div>
                    </div>
                    {spotifyConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectSpotify}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                        onClick={connectSpotify}
                        disabled={spotifyConnecting}
                      >
                        {spotifyConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </div>

                  {/* Instagram - Coming Soon for Fans */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-400" />
                      <div>
                        <div className="text-white font-medium">Instagram</div>
                        <div className="text-xs text-gray-400">
                          Coming soon for fan accounts
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-500/30 text-gray-400"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Fan Referral Dashboard - Moved to Right Column */}
              <FanReferralDashboard />

              {/* Account Settings - Last */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                    data-testid="button-privacy-settings"
                  >
                    Privacy Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    data-testid="button-notification-settings"
                  >
                    Notification Preferences
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    data-testid="button-connected-accounts"
                  >
                    Connected Accounts
                  </Button>
                  <Separator className="bg-white/10" />
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-400 border-red-600 hover:bg-red-500/10"
                    data-testid="button-deactivate-account"
                  >
                    Deactivate Account
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      
      {/* Profile Edit Modal */}
      <FanProfileEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
    </DashboardLayout>
  );
}