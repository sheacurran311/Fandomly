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
import { TwitterSDKManager } from "@/lib/twitter";
import { FacebookSDKManager } from "@/lib/facebook";
import { socialManager } from "@/lib/social-integrations";
import { getCreatorTypeLabel } from "@shared/fanInterestOptions";
import FanReferralDashboard from "@/components/referrals/FanReferralDashboard";

export default function FanProfile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Facebook import state
  const [isImporting, setIsImporting] = useState(false);
  const [isConnectedToFacebook, setIsConnectedToFacebook] = useState(false);
  
  // Social media connection states
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [isCheckingTwitterStatus, setIsCheckingTwitterStatus] = useState(true);
  
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookUser, setFacebookUser] = useState<{ id: string; name?: string } | null>(null);
  
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState<string | null>(null);
  const [tiktokFollowers, setTiktokFollowers] = useState<number>(0);
  
  // Check social connections status when user becomes available
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTwitterStatus();
      checkTiktokStatus();
    }
  }, [user?.dynamicUserId]);

  const checkTwitterStatus = async () => {
    try {
      setIsCheckingTwitterStatus(true);
      const response = await fetch('/api/social/accounts', {
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const connections = await response.json();
        const tw = connections.find((c: any) => c.platform === 'twitter');
        if (tw) {
          setTwitterConnected(true);
          setTwitterHandle(tw.username);
        } else {
          setTwitterConnected(false);
          setTwitterHandle(null);
        }
      }
    } catch (error) {
      console.error('[Fan Profile] Error checking Twitter status:', error);
      setTwitterConnected(false);
    } finally {
      setIsCheckingTwitterStatus(false);
    }
  };

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
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected, connection } = await getSocialConnection('tiktok');
      
      if (connected && connection) {
        setTiktokConnected(true);
        setTiktokHandle(connection.platformUsername || null);
        setTiktokFollowers(connection.profileData?.followers || 0);
      } else {
        setTiktokConnected(false);
        setTiktokHandle(null);
        setTiktokFollowers(0);
      }
    } catch (error) {
      console.error('[Fan Profile] Error checking TikTok status:', error);
      setTiktokConnected(false);
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

  const connectTwitter = async () => {
    try {
      setTwitterConnecting(true);
      const result = await TwitterSDKManager.secureLogin('fan', (user as any)?.dynamicUserId || user?.id);
      if (result.success && result.user) {
        setTwitterConnected(true);
        setTwitterHandle(result.user.username);
        toast({
          title: "Twitter Connected! 🐦",
          description: `Connected @${result.user.username}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Twitter login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({ title: 'Connection Error', description: error?.message || 'Failed to connect Twitter', variant: 'destructive' });
    } finally {
      setTwitterConnecting(false);
    }
  };

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
      const authUrl = socialManager.getAuthUrl('tiktok');
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect TikTok. Please try again.',
        variant: 'destructive',
      });
      setTiktokConnecting(false);
    }
  };

  const disconnectTwitter = async () => {
    try {
      const response = await fetch('/api/social/twitter', {
        method: 'DELETE',
        headers: { 'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '' },
        credentials: 'include'
      });
      
      if (response.ok) {
        setTwitterConnected(false);
        setTwitterHandle(null);
        toast({ title: "Twitter Disconnected", description: "Your Twitter account has been disconnected." });
      }
    } catch (error) {
      toast({ title: "Disconnection Failed", description: "Failed to disconnect Twitter. Please try again.", variant: 'destructive' });
    }
  };

  const disconnectFacebook = async () => {
    try {
      await FacebookSDKManager.secureLogout();
      setFacebookConnected(false);
      setFacebookUser(null);
      toast({ title: 'Facebook Disconnected', description: 'Successfully disconnected' });
    } catch (error) {
      toast({ title: 'Disconnect Failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const disconnectTiktok = async () => {
    try {
      localStorage.removeItem('fandomly_tiktok_connection');
      setTiktokConnected(false);
      setTiktokHandle(null);
      setTiktokFollowers(0);
      toast({ title: "TikTok Disconnected", description: "Your TikTok account has been disconnected." });
    } catch (error) {
      toast({ title: "Disconnection Failed", description: "Failed to disconnect TikTok. Please try again.", variant: 'destructive' });
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
            {/* Profile Overview Card */}
            <div className="lg:col-span-1">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader className="text-center">
                  <div className="relative mx-auto mb-4">
                    {/* Profile Photo */}
                    <div className="relative">
                      <Avatar className="w-32 h-32 mx-auto" data-testid="img-fan-profile-photo">
                        <AvatarImage 
                          src={user.profileData?.avatar} 
                          alt={user.profileData?.name || user.username || "Fan"} 
                        />
                        <AvatarFallback className="w-32 h-32 bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-2xl font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Camera Icon Overlay */}
                      <div className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
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
                        Following
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

              {/* Fan Referral Dashboard */}
              <FanReferralDashboard />
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Marketing Preferences - NEW */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Marketing & Creator Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Phone Number */}
                  {((user.profileData as any)?.phone) && (
                    <div>
                      <label className="text-sm text-gray-300 flex items-center">
                        <Phone className="mr-1 h-4 w-4" />
                        Phone Number (SMS)
                      </label>
                      <div className="text-white font-medium">
                        {(user.profileData as any).phone}
                      </div>
                    </div>
                  )}
                  
                  {/* Creator Type Interests */}
                  {((user.profileData as any)?.creatorTypeInterests && (user.profileData as any).creatorTypeInterests.length > 0) && (
                    <div>
                      <label className="text-sm text-gray-300">Creator Types You Follow</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(user.profileData as any).creatorTypeInterests.map((type: string) => (
                          <Badge 
                            key={type} 
                            className="bg-brand-primary/20 text-brand-primary border-brand-primary"
                          >
                            {type === "athletes" && <Users className="mr-1 h-3 w-3" />}
                            {type === "musicians" && <Music className="mr-1 h-3 w-3" />}
                            {type === "content_creators" && <Video className="mr-1 h-3 w-3" />}
                            {getCreatorTypeLabel(type as any)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Interest Subcategories */}
                  {((user.profileData as any)?.interestSubcategories) && (
                    <>
                      {(user.profileData as any).interestSubcategories.athletes?.length > 0 && (
                        <div className="pl-4 border-l-2 border-brand-primary/30">
                          <label className="text-sm text-gray-300 flex items-center mb-2">
                            <Users className="mr-1 h-4 w-4" />
                            Sports I Follow
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(user.profileData as any).interestSubcategories.athletes.map((sport: string) => (
                              <Badge key={sport} variant="outline" className="text-xs bg-gray-800">
                                {sport}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(user.profileData as any).interestSubcategories.musicians?.length > 0 && (
                        <div className="pl-4 border-l-2 border-brand-primary/30">
                          <label className="text-sm text-gray-300 flex items-center mb-2">
                            <Music className="mr-1 h-4 w-4" />
                            Music Genres I Follow
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(user.profileData as any).interestSubcategories.musicians.map((genre: string) => (
                              <Badge key={genre} variant="outline" className="text-xs bg-gray-800">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(user.profileData as any).interestSubcategories.content_creators?.length > 0 && (
                        <div className="pl-4 border-l-2 border-brand-primary/30">
                          <label className="text-sm text-gray-300 flex items-center mb-2">
                            <Video className="mr-1 h-4 w-4" />
                            Content Types I Follow
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(user.profileData as any).interestSubcategories.content_creators.map((type: string) => (
                              <Badge key={type} variant="outline" className="text-xs bg-gray-800">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Empty State */}
                  {!(user.profileData as any)?.phone && 
                   (!(user.profileData as any)?.creatorTypeInterests || (user.profileData as any).creatorTypeInterests.length === 0) && (
                    <div className="text-center py-6 text-gray-400">
                      <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No marketing preferences set</p>
                      <p className="text-xs text-gray-500 mt-1">Help us connect you with the right creators</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      variant="outline" 
                      className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Update Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
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
                            Started following creator
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

              {/* Account Settings */}
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