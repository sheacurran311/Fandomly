import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FacebookSDKManager as FacebookSDK } from "@/lib/facebook";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Facebook, 
  User, 
  Mail, 
  CheckCircle,
  Download,
  RefreshCw,
  Shield
} from "lucide-react";

interface FacebookProfileData {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface FacebookProfileImportProps {
  className?: string;
}

export default function FacebookProfileImport({ className }: FacebookProfileImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [facebookProfile, setFacebookProfile] = useState<FacebookProfileData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check Facebook login status on component mount
  useEffect(() => {
    checkFacebookStatus();
  }, []);

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDK.ensureFBReady('fan');
      const status = await FacebookSDK.getLoginStatus();
      setIsCheckingStatus(false);
      
      if (status.isLoggedIn) {
        setIsConnected(true);
        // Load user info
        window.FB.api('/me', 'GET', {
          fields: 'id,name,email,picture.width(200).height(200)'
        }, (response) => {
          if (response && !response.error) {
            setFacebookProfile(response as FacebookProfileData);
          }
        });
      } else {
        setIsConnected(false);
        setFacebookProfile(null);
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setIsCheckingStatus(false);
    }
  };

  const fetchFacebookProfile = async (accessToken: string) => {
    try {
      window.FB.api('/me', 'GET', {
        fields: 'id,name,email,picture.width(200).height(200)',
        access_token: accessToken
      }, (response) => {
        if (response && !response.error) {
          console.log('Facebook profile data:', response);
          setFacebookProfile(response as FacebookProfileData);
        } else {
          console.error('Error fetching Facebook profile:', response.error);
        }
      });
    } catch (error) {
      console.error('Error fetching Facebook profile:', error);
    }
  };

  // Connect to Facebook mutation
  const connectFacebook = useMutation({
    mutationFn: async () => {
      const result = await FacebookSDK.secureLogin('fan');
      
      if (result.success && result.user) {
        return result.user as FacebookProfileData;
      } else {
        throw new Error(result.error || 'Facebook login failed');
      }
    },
    onSuccess: (profileData) => {
      setIsConnected(true);
      setFacebookProfile(profileData);
      
      toast({
        title: "Facebook Connected! 🎉",
        description: `Connected as ${profileData.name}. You can now import your profile data.`,
        duration: 4000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Facebook. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Import profile data mutation
  const importProfile = useMutation({
    mutationFn: async () => {
      if (!user || !facebookProfile) {
        throw new Error("User or Facebook profile not available");
      }

      const response = await apiRequest("POST", "/api/auth/facebook-profile-import", {
        userId: user.id,
        facebookData: {
          id: facebookProfile.id,
          name: facebookProfile.name,
          email: facebookProfile.email,
          picture: facebookProfile.picture?.data?.url
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import profile');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate user data to refetch updated profile
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Profile Imported! ✅",
        description: `Successfully imported ${Object.entries(data.imported).filter(([_, imported]) => imported).map(([field]) => field).join(', ')} from Facebook.`,
        duration: 4000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import Facebook profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Disconnect from Facebook
  const disconnectFacebook = async () => {
    try {
      await FacebookSDK.logout();
      setIsConnected(false);
      setFacebookProfile(null);
      
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from Facebook. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isCheckingStatus) {
    return (
      <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-gray-300">Checking Facebook connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Facebook className="h-5 w-5 text-blue-500" />
          <span>Facebook Profile Import</span>
          {isConnected && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Connected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {!isConnected ? (
          <div className="text-center py-6">
            <Facebook className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect Your Facebook Account</h3>
            <p className="text-gray-300 text-sm mb-6">
              Import your profile information to enhance your fan experience.
              We only access basic profile data and email with your permission.
            </p>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mb-6">
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Basic Profile</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3" />
                <span>Email Only</span>
              </div>
            </div>
            
            <Button
              onClick={() => connectFacebook.mutate()}
              disabled={connectFacebook.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
              data-testid="button-connect-facebook"
            >
              {connectFacebook.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Facebook className="h-4 w-4 mr-2" />
                  Connect with Facebook
                </>
              )}
            </Button>
          </div>
        ) : (
          <div>
            {facebookProfile && (
              <div className="space-y-4">
                {/* Facebook Profile Preview */}
                <div className="flex items-center space-x-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Avatar className="w-16 h-16">
                    <AvatarImage 
                      src={facebookProfile.picture?.data?.url} 
                      alt={facebookProfile.name} 
                    />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {facebookProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white flex items-center space-x-2">
                      <span>{facebookProfile.name}</span>
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                    </h4>
                    {facebookProfile.email && (
                      <p className="text-sm text-gray-300">{facebookProfile.email}</p>
                    )}
                    <p className="text-xs text-gray-400">Facebook ID: {facebookProfile.id}</p>
                  </div>
                </div>

                {/* Import Actions */}
                <div className="space-y-3">
                  <div className="text-sm text-gray-300">
                    <p className="mb-2">Available data to import:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span>Profile name: {facebookProfile.name}</span>
                      </li>
                      {facebookProfile.email && (
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>Email address: {facebookProfile.email}</span>
                        </li>
                      )}
                      {facebookProfile.picture && (
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>Profile picture</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={() => importProfile.mutate()}
                      disabled={importProfile.isPending}
                      className="flex-1 bg-brand-primary hover:bg-brand-primary/80 text-white"
                      data-testid="button-import-profile"
                    >
                      {importProfile.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import to Profile
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={disconnectFacebook}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      data-testid="button-disconnect-facebook"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}