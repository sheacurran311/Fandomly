import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
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

  const userInitials = getInitials(user.username || user.firstName || 'User');

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400">
              Manage your profile information and settings
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
                      data-testid="button-update-photo"
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Import from Facebook
                    </Button>
                  </div>
                  
                  <CardTitle className="text-white text-xl">
                    {user.username || user.firstName || 'Creator'}
                  </CardTitle>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {user.type || 'Creator'}
                    </Badge>
                    {user.type === 'creator' && (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                      <div className="text-white" data-testid="text-full-name">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.username || 'Not provided'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Username</label>
                      <div className="text-white" data-testid="text-username">
                        @{user.username || 'username'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Email</label>
                      <div className="text-white flex items-center gap-2" data-testid="text-email">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {user.email || 'Not provided'}
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
              {user.type === 'creator' && (
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
                          {user.creatorType || 'General Creator'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Specialty</label>
                        <div className="text-white" data-testid="text-specialty">
                          {user.specialty || 'Content Creation'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Location</label>
                        <div className="text-white flex items-center gap-2" data-testid="text-location">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {user.location || 'Not specified'}
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
                      <Instagram className="h-5 w-5 text-pink-400" />
                      <div>
                        <div className="text-white font-medium">Instagram</div>
                        <div className="text-xs text-gray-400">Connect your Instagram account</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-connect-instagram">
                      Connect
                    </Button>
                  </div>
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