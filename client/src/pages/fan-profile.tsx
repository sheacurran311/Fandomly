import { useState } from "react";
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
import { SiKick } from "react-icons/si";
import { useTwitterConnection } from "@/hooks/use-twitter-connection";
import {
  useFacebookConnection,
  useTikTokConnection,
  useYouTubeConnection,
  useSpotifyConnection,
  useKickConnection,
} from "@/hooks/use-social-connection";
import { FacebookSDKManager } from "@/lib/facebook";
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
  
  // Social connection hooks — all status checks, connect, and disconnect are managed by the hooks
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    userInfo: twitterUserInfo,
    connect: connectTwitter,
    disconnect: disconnectTwitter,
  } = useTwitterConnection();
  const twitterHandle = twitterUserInfo?.username || null;

  const {
    isConnected: facebookConnected,
    isConnecting: facebookConnecting,
    userInfo: facebookUserInfo,
    connect: connectFacebook,
    disconnect: disconnectFacebook,
  } = useFacebookConnection();

  const {
    isConnected: tiktokConnected,
    isConnecting: tiktokConnecting,
    userInfo: tiktokUserInfo,
    connect: connectTiktok,
    disconnect: disconnectTiktok,
  } = useTikTokConnection();
  const tiktokHandle = tiktokUserInfo?.username || tiktokUserInfo?.displayName || null;

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
    isConnected: kickConnected,
    isConnecting: kickConnecting,
    userInfo: kickUserInfo,
    connect: connectKick,
    disconnect: disconnectKick,
  } = useKickConnection();
  const kickDisplayName = kickUserInfo?.displayName || kickUserInfo?.username || null;

  // Facebook profile import mutation (Fan-specific — uses FacebookSDKManager directly for the FB Graph API call)
  const importFacebookProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      
      // Ensure Facebook SDK is ready and user is logged in
      await FacebookSDKManager.ensureFBReady('fan');
      if (!facebookConnected) {
        const result = await FacebookSDKManager.secureLogin('fan');
        if (!result.success) {
          throw new Error(result.error || "Failed to connect to Facebook");
        }
      }
      
      // Get user profile data from Facebook Graph API
      return new Promise((resolve, reject) => {
        window.FB.api('/me', 'GET', {
          fields: 'id,name,email,picture.width(200).height(200)'
        }, (response) => {
          if (response && !response.error) {
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
                          {facebookConnected && facebookUserInfo ? `Connected as ${facebookUserInfo.name || facebookUserInfo.displayName}` : 'Connect your Facebook account'}
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

                  {/* Kick */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <SiKick className="h-5 w-5 text-[#53FC18]" />
                      <div>
                        <div className="text-white font-medium">Kick</div>
                        <div className="text-xs text-gray-400">
                          {kickConnected && kickDisplayName ? `Connected as ${kickDisplayName}` : 'Connect your Kick account'}
                        </div>
                      </div>
                    </div>
                    {kickConnected ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={disconnectKick}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#53FC18]/30 text-[#53FC18] hover:bg-[#53FC18]/10"
                        onClick={connectKick}
                        disabled={kickConnecting}
                      >
                        {kickConnecting ? 'Connecting…' : 'Connect'}
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