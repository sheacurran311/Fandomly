import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FacebookSDKManager } from "@/lib/facebook";
import DashboardLayout from "@/components/layout/dashboard-layout";
import CreatorProfileEditModal from "@/components/creator/creator-profile-edit-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Star,
  Edit,
  Camera,
  Facebook,
  Instagram,
  CheckCircle,
  AlertCircle,
  Unlink,
  Plus,
  BadgeCheck,
  Share2,
  Settings,
  Music,
  Video
} from "lucide-react";
import { Twitter } from "lucide-react";
import { TwitterSDKManager } from "@/lib/twitter";
import { useCreatorVerification } from "@/hooks/useCreatorVerification";
import CreatorReferralDashboard from "@/components/referrals/CreatorReferralDashboard";
import { CreatorVerificationProgress } from "@/components/creator/CreatorVerificationProgress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { creator, verificationData, isVerified } = useCreatorVerification();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [isCheckingTwitterStatus, setIsCheckingTwitterStatus] = useState(true);
  
  // Facebook import state
  const [isImporting, setIsImporting] = useState(false);
  const [isConnectedToFacebook, setIsConnectedToFacebook] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookUser, setFacebookUser] = useState<{ id: string; name?: string } | null>(null);
  
  // Instagram connection state (only for creators)
  const instagramConnection = user?.userType === 'creator' ? useInstagramConnection() : null;
  const { 
    isConnected: instagramConnected = false, 
    isConnecting: instagramConnecting = false,
    userInfo: instagramUserInfo = null,
    connectInstagram = async () => {},
    disconnectInstagram = async () => {}
  } = instagramConnection || {};
  
  // Check social connections status when user becomes available
  useEffect(() => {
    if (user?.dynamicUserId) {
      checkFacebookStatus();
      checkTwitterStatus();
    }
  }, [user?.dynamicUserId]);

  const checkTwitterStatus = async () => {
    try {
      setIsCheckingTwitterStatus(true);
      
      // Fetch existing social connections from backend
      const response = await fetch('/api/social/accounts', {
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const connections = await response.json();
        console.log('[Profile] Existing connections:', connections);
        
        // Check if Twitter connection exists
        const twitterConnection = connections.find((conn: any) => conn.platform === 'twitter');
        if (twitterConnection) {
          console.log('[Profile] Found existing Twitter connection:', twitterConnection);
          setTwitterConnected(true);
          setTwitterHandle(twitterConnection.username || twitterConnection.displayName);
        } else {
          console.log('[Profile] No Twitter connection found');
          setTwitterConnected(false);
          setTwitterHandle(null);
        }
      } else {
        console.warn('[Profile] Failed to fetch connections:', response.statusText);
        setTwitterConnected(false);
        setTwitterHandle(null);
      }
    } catch (error) {
      console.error('[Profile] Error checking Twitter status:', error);
      setTwitterConnected(false);
      setTwitterHandle(null);
    } finally {
      setIsCheckingTwitterStatus(false);
    }
  };
  
  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('creator');
      const status = await FacebookSDKManager.getLoginStatus();
      setIsConnectedToFacebook(status.isLoggedIn);
      if (status.isLoggedIn) {
        // Load minimal user info for display
        await new Promise<void>((resolve, reject) => {
          window.FB.api('/me', 'GET', { fields: 'id,name' }, (response: any) => {
            if (response && !response.error) {
              setFacebookUser({ id: response.id, name: response.name });
              resolve();
            } else {
              setFacebookUser(null);
              resolve();
            }
          });
        });
      } else {
        setFacebookUser(null);
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setIsConnectedToFacebook(false);
      setFacebookUser(null);
    }
  };
  
  // Facebook profile import mutation
  const importFacebookProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      
      // First ensure we're connected to Facebook
      if (!isConnectedToFacebook) {
        const result = await FacebookSDKManager.secureLogin('creator');
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

  const connectFacebook = async () => {
    try {
      setFacebookConnecting(true);
      await FacebookSDKManager.ensureFBReady('creator');
      const result = await FacebookSDKManager.secureLogin('creator');
      if (result.success) {
        setIsConnectedToFacebook(true);
        // Fetch user info for profile link
        await new Promise<void>((resolve) => {
          window.FB.api('/me', 'GET', { fields: 'id,name' }, (response: any) => {
            if (response && !response.error) {
              setFacebookUser({ id: response.id, name: response.name });
            } else {
              setFacebookUser(null);
            }
            resolve();
          });
        });
        toast({ title: 'Facebook Connected', description: result.user?.name || 'Connected successfully' });
      } else {
        toast({ title: 'Facebook Connect Failed', description: result.error || 'Try again', variant: 'destructive' });
      }
    } finally {
      setFacebookConnecting(false);
    }
  };

  const disconnectFacebook = async () => {
    try {
      await FacebookSDKManager.secureLogout();
      setIsConnectedToFacebook(false);
      setFacebookUser(null);
      toast({ title: 'Facebook Disconnected', description: 'Successfully disconnected' });
    } catch (error) {
      toast({ title: 'Disconnect Failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const connectTwitter = async () => {
    try {
      setTwitterConnecting(true);
      const result = await TwitterSDKManager.secureLogin('creator', (user as any)?.dynamicUserId || user?.id);
      if (result.success && result.user) {
        setTwitterConnected(true);
        setTwitterHandle(result.user.username);
        toast({ title: 'X Connected', description: `@${result.user.username}` });
      } else if (!result.success) {
        toast({ title: 'X Connect Failed', description: result.error || 'Try again', variant: 'destructive' });
      }
    } finally {
      setTwitterConnecting(false);
    }
  };

  // Helpers: format followers and total across connected socials
  const formatFollowers = (num: number): string => {
    if (!num || num < 0) return '0';
    if (num >= 10000) {
      const val = num / 1000;
      const dec = val < 100 ? 1 : 0;
      return `${val.toFixed(dec)}K`;
    }
    return num.toLocaleString();
  };

  const getTotalFollowers = (): number => {
    let total = 0;
    if (instagramConnected && instagramUserInfo?.followers_count) total += instagramUserInfo.followers_count;
    // Add X/Twitter follower count when available via profile context if desired
    return total;
  };

  const disconnectTwitter = async () => {
    try {
      // Call backend to remove connection
      const response = await fetch('/api/social/twitter', {
        method: 'DELETE',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setTwitterConnected(false);
        setTwitterHandle(null);
        toast({
          title: "X Disconnected",
          description: "Successfully disconnected from X",
          duration: 3000,
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Twitter disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from X. Please try again.",
        variant: 'destructive',
      });
    }
  };
  
  // Simplified: Facebook integration handled by dedicated components

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

  const userInitials = getInitials(user.username || user.profileData?.name || 'User');

  return (
    <DashboardLayout userType="creator">
      <div className="p-3 sm:p-4 lg:pl-6 lg:pr-2">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400">
              Manage your profile information and settings
            </p>
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
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                  {/* Left Column - Profile Card + Basic & Creator Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Profile Overview Card */}
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                      <CardHeader className="text-center">
                        <div className="relative mx-auto mb-4">
                          {/* Profile Photo */}
                          <div className="relative">
                            <Avatar className="w-32 h-32 mx-auto" data-testid="img-profile-photo">
                              <AvatarImage 
                                src={user.profileData?.avatar} 
                                alt={user.profileData?.name || user.username || "Creator"} 
                              />
                              <AvatarFallback className="w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 text-white text-2xl font-bold">
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
                          {user.profileData?.name || user.username || 'Creator'}
                        </CardTitle>
                        
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Badge variant="secondary" className="capitalize">
                            {user.userType || 'Creator'}
                          </Badge>
                          {user.userType === 'creator' && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending Verification
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-3 bg-white/5 rounded-lg">
                            <div className="text-2xl font-bold text-white">{formatFollowers(getTotalFollowers())}</div>
                            <div className="text-xs text-gray-400">Followers</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg">
                            <div className="text-2xl font-bold text-white">156</div>
                            <div className="text-xs text-gray-400">Posts</div>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-brand-primary hover:bg-brand-primary/80"
                          onClick={() => setIsEditModalOpen(true)}
                          data-testid="button-edit-profile"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </CardContent>
                    </Card>
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
                            <div className="text-white break-words" data-testid="text-username">
                              @{user.username || 'username'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">Email</label>
                            <div className="text-white flex items-start gap-2" data-testid="text-email">
                              <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="break-all min-w-0">{user.email || 'Not provided'}</span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">Member Since</label>
                            <div className="text-white flex items-center gap-2" data-testid="text-member-since">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Creator Details (if creator) */}
                    {user.userType === 'creator' && creator && (
                      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Creator Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="text-sm text-gray-400 mb-1 block">Creator Type</label>
                              <div className="text-white capitalize" data-testid="text-creator-type">
                                {creator.category === 'athlete' && '🏆 Athlete'}
                                {creator.category === 'musician' && '🎵 Musician'}
                                {creator.category === 'content_creator' && '🎥 Content Creator'}
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm text-gray-400 mb-1 block">Verification Status</label>
                              {isVerified ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified Creator
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending Verification
                                </Badge>
                              )}
                            </div>
                            
                            {user.profileData?.location && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Location</label>
                                <div className="text-white flex items-center gap-2" data-testid="text-location">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  {user.profileData.location}
                                </div>
                              </div>
                            )}
                            
                            {creator.bio && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Bio</label>
                                <div className="text-white" data-testid="text-bio">
                                  {creator.bio}
                                </div>
                              </div>
                            )}
                          </div>

                    {/* Type-Specific Information */}
                    {creator.category === 'athlete' && (creator.typeSpecificData as any)?.athlete && (
                      <>
                        <Separator className="bg-white/10" />
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Athletic Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(creator.typeSpecificData as any).athlete.sport && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Sport</label>
                                <div className="text-white">{(creator.typeSpecificData as any).athlete.sport}</div>
                              </div>
                            )}
                            
                            {(creator.typeSpecificData as any).athlete.position && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Position</label>
                                <div className="text-white">{(creator.typeSpecificData as any).athlete.position}</div>
                              </div>
                            )}
                            
                            {(creator.typeSpecificData as any).athlete.education && (
                              <>
                                <div>
                                  <label className="text-sm text-gray-400 mb-1 block">Education Level</label>
                                  <div className="text-white capitalize">
                                    {(creator.typeSpecificData as any).athlete.education.level?.replace(/_/g, ' ')}
                                  </div>
                                </div>
                                
                                {(creator.typeSpecificData as any).athlete.education.grade && (
                                  <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Grade/Year</label>
                                    <div className="text-white capitalize">
                                      {(creator.typeSpecificData as any).athlete.education.grade}
                                    </div>
                                  </div>
                                )}
                                
                                {(creator.typeSpecificData as any).athlete.education.school && (
                                  <div>
                                    <label className="text-sm text-gray-400 mb-1 block">School/Institution</label>
                                    <div className="text-white">{(creator.typeSpecificData as any).athlete.education.school}</div>
                                  </div>
                                )}
                                
                                {(creator.typeSpecificData as any).athlete.education.graduationYear && (
                                  <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Graduation Year</label>
                                    <div className="text-white">{(creator.typeSpecificData as any).athlete.education.graduationYear}</div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {(creator.typeSpecificData as any).athlete.nilCompliant !== undefined && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">NIL Status</label>
                                <Badge variant="outline" className={
                                  (creator.typeSpecificData as any).athlete.nilCompliant
                                    ? "text-green-400 border-green-400"
                                    : "text-gray-400 border-gray-400"
                                }>
                                  {(creator.typeSpecificData as any).athlete.nilCompliant ? 'NIL Compliant' : 'Not NIL Compliant'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {creator.category === 'musician' && (creator.typeSpecificData as any)?.musician && (
                      <>
                        <Separator className="bg-white/10" />
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            Musical Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(creator.typeSpecificData as any).musician.bandArtistName && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Band/Artist Name</label>
                                <div className="text-white">{(creator.typeSpecificData as any).musician.bandArtistName}</div>
                              </div>
                            )}
                            
                            {(creator.typeSpecificData as any).musician.artistType && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Artist Type</label>
                                <div className="text-white capitalize">
                                  {(creator.typeSpecificData as any).musician.artistType.replace(/_/g, ' ')}
                                </div>
                              </div>
                            )}
                            
                            {(creator.typeSpecificData as any).musician.musicGenre && 
                             (creator.typeSpecificData as any).musician.musicGenre.length > 0 && (
                              <div className="md:col-span-2">
                                <label className="text-sm text-gray-400 mb-1 block">Music Genres</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(creator.typeSpecificData as any).musician.musicGenre.map((genre: string) => (
                                    <Badge key={genre} variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-400">
                                      {genre}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {creator.category === 'content_creator' && (creator.typeSpecificData as any)?.contentCreator && (
                      <>
                        <Separator className="bg-white/10" />
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Content Creator Information
                          </h4>
                          <div className="grid grid-cols-1 gap-4">
                            {(creator.typeSpecificData as any).contentCreator.contentType && 
                             (creator.typeSpecificData as any).contentCreator.contentType.length > 0 && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Content Types</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(creator.typeSpecificData as any).contentCreator.contentType.map((type: string) => (
                                    <Badge key={type} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-400">
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {(creator.typeSpecificData as any).contentCreator.platforms && 
                             (creator.typeSpecificData as any).contentCreator.platforms.length > 0 && (
                              <div>
                                <label className="text-sm text-gray-400 mb-1 block">Platforms</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(creator.typeSpecificData as any).contentCreator.platforms.map((platform: string) => (
                                    <Badge key={platform} variant="outline" className="bg-green-500/10 text-green-400 border-green-400">
                                      {platform}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                            </div>
                          </>
                        )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column - Social & Verification (Wider) */}
                  <div className="lg:col-span-3 space-y-6">
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
                          {isConnectedToFacebook && facebookUser ? `Connected as ${facebookUser.name || 'Facebook User'}` : 'Connect your Facebook account'}
                        </div>
                      </div>
                    </div>
                    {isConnectedToFacebook ? (
                      <div className="flex gap-2 items-center">
                        <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            const pageId = localStorage.getItem('fandomly_active_facebook_page_id');
                            const linkId = pageId || facebookUser?.id;
                            const url = linkId ? `https://facebook.com/${linkId}` : 'https://facebook.com';
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
                      <Button 
                        size="sm" 
                        className="bg-[#1877F2] text-white hover:bg-[#1877F2]/80"
                        onClick={connectFacebook}
                        disabled={facebookConnecting}
                        data-testid="button-login-facebook-profile"
                      >
                        {facebookConnecting ? 'Connecting…' : 'Login with Facebook'}
                      </Button>
                    )}
                  </div>
                  
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
                      <div className="flex gap-2 items-center">
                        <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => window.open(`https://twitter.com/${twitterHandle}`, '_blank')}
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
                      <Button 
                        size="sm" 
                        className="bg-black text-white hover:bg-black/80"
                        onClick={connectTwitter}
                        disabled={twitterConnecting}
                        data-testid="button-connect-twitter-profile"
                      >
                        {twitterConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
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
                            {instagramConnected && instagramUserInfo ? 
                              `Connected as @${instagramUserInfo.username}` : 
                              "Connect your Instagram Business account"
                            }
                          </div>
                        </div>
                      </div>
                      {instagramConnected ? (
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={() => window.open(`https://instagram.com/${instagramUserInfo?.username}`, '_blank')}
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
                        <Button 
                          className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
                          size="sm" 
                          onClick={connectInstagram}
                          disabled={instagramConnecting}
                          data-testid="button-connect-instagram"
                        >
                          {instagramConnecting ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

                        {/* Verification Section */}
                        {user.userType === 'creator' && creator && (
                          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center gap-2">
                                <BadgeCheck className="h-5 w-5" />
                                Creator Verification
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <CreatorVerificationProgress
                                creator={creator}
                                verificationData={verificationData}
                                onStartWizard={() => {
                                  setIsEditModalOpen(true);
                                }}
                                compact={false}
                              />
                            </CardContent>
                          </Card>
                        )}
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
                      onClick={() => window.location.href = '/creator-dashboard/settings'}
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
      
      {/* Creator Profile Edit Modal */}
      {user && (
        <CreatorProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          creator={creator || undefined}
        />
      )}
    </DashboardLayout>
  );
}