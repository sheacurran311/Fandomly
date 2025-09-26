import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import FanProfileEditModal from "@/components/fan/fan-profile-edit-modal";
import FacebookProfileImport from "@/components/fan/facebook-profile-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Instagram
} from "lucide-react";
import { Twitter } from "lucide-react";
import { TwitterSDKManager } from "@/lib/twitter";

export default function FanProfile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);

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
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
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
                    
                    <FacebookProfileImport />
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

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg mt-3">
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
                      <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          setTwitterConnecting(true);
                          try {
                            const result = await TwitterSDKManager.secureLogin('fan');
                            if (result.success && result.user) {
                              setTwitterConnected(true);
                              setTwitterHandle(result.user.username);
                            }
                          } finally {
                            setTwitterConnecting(false);
                          }
                        }}
                        disabled={twitterConnecting}
                      >
                        {twitterConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
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
                    
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-300">Interests</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.profileData?.interests?.map((interest: "musicians" | "athletes" | "content_creators") => (
                          <Badge 
                            key={interest} 
                            variant="outline" 
                            className="border-brand-primary text-brand-primary"
                          >
                            {interest}
                          </Badge>
                        )) || <span className="text-gray-400">No interests selected</span>}
                      </div>
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
      </div>
      
      {/* Profile Edit Modal */}
      <FanProfileEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
    </div>
  );
}