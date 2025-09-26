import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FacebookSDKManager } from "@/lib/facebook";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
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
  Plus
} from "lucide-react";
import { Twitter } from "lucide-react";
import { TwitterSDKManager } from "@/lib/twitter";

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [isCheckingTwitterStatus, setIsCheckingTwitterStatus] = useState(true);
  
  // Facebook import state
  const [isImporting, setIsImporting] = useState(false);
  const [isConnectedToFacebook, setIsConnectedToFacebook] = useState(false);
  
  // Instagram connection state (only for creators)
  const instagramConnection = user?.userType === 'creator' ? useInstagramConnection() : null;
  const { 
    isConnected: instagramConnected = false, 
    isConnecting: instagramConnecting = false,
    userInfo: instagramUserInfo = null,
    connectInstagram = async () => {},
    disconnectInstagram = async () => {}
  } = instagramConnection || {};
  
  // Check social connections status
  useEffect(() => {
    if (user) {
      checkFacebookStatus();
      checkTwitterStatus();
    }
  }, [user]);

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
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setIsConnectedToFacebook(false);
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
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400">
              Manage your profile information and settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Profile Overview Card */}
            <div className="lg:col-span-1">
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
                      <Badge variant="outline" className="text-brand-primary border-brand-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">2.8K</div>
                      <div className="text-xs text-gray-400">Followers</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">156</div>
                      <div className="text-xs text-gray-400">Posts</div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80"
                    onClick={() => {
                      toast({
                        title: "Edit Profile",
                        description: "Profile editing modal will be implemented soon. Currently, you can import your profile data from Facebook!",
                        duration: 3000
                      });
                    }}
                    data-testid="button-edit-profile"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                    <div className="sm:col-span-2">
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
              {user.userType === 'creator' && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Creator Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Creator Type</label>
                        <div className="text-white capitalize" data-testid="text-creator-type">
                          {user.profileData?.creatorType || 'General Creator'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Specialty</label>
                        <div className="text-white" data-testid="text-specialty">
                          {user.profileData?.specialty || 'Content Creation'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Location</label>
                        <div className="text-white flex items-center gap-2" data-testid="text-location">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {user.profileData?.location || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Verification Status</label>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          <Star className="h-3 w-3 mr-1" />
                          Verified Creator
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          Connect your Facebook page from the dashboard
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/creator-dashboard/social'}
                      data-testid="button-connect-facebook-profile"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
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
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={disconnectTwitter}
                          data-testid="button-disconnect-twitter-profile"
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
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
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(`https://instagram.com/${instagramUserInfo?.username}`, '_blank')}
                          >
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={disconnectInstagram}
                            data-testid="button-disconnect-instagram"
                          >
                            <Unlink className="h-4 w-4" />
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

              {/* Account Settings */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-300 border-gray-600 hover:bg-white/10"
                    data-testid="button-privacy-settings"
                  >
                    Privacy Settings
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-300 border-gray-600 hover:bg-white/10"
                    data-testid="button-notification-preferences"
                  >
                    Notification Preferences
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-300 border-gray-600 hover:bg-white/10"
                    data-testid="button-connected-apps"
                  >
                    Connected Apps & Services
                  </Button>
                  
                  <Separator className="bg-gray-600" />
                  
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
      </div>
    </div>
  );
}