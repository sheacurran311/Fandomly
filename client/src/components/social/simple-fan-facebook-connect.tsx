import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacebookUser {
  id: string;
  name: string;
  email?: string;
}

export default function SimpleFanFacebookConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<FacebookUser | null>(null);
  const { toast } = useToast();

  // Initialize Facebook SDK when component mounts
  useEffect(() => {
    // Check if Facebook SDK is loaded
    if (typeof window !== 'undefined' && window.FB) {
      checkLoginStatus();
    } else {
      // Wait for FB SDK to load
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          checkLoginStatus();
        }
      }, 100);
    }
  }, []);

  const checkLoginStatus = () => {
    console.log('[Fan FB Simple] Checking login status...');
    window.FB.getLoginStatus((response: any) => {
      console.log('[Fan FB Simple] Login status:', response);
      if (response.status === 'connected' && response.authResponse?.accessToken) {
        loadUserInfo(response.authResponse.accessToken);
      } else {
        setIsConnected(false);
        setUserInfo(null);
      }
    });
  };

  const loadUserInfo = async (accessToken: string) => {
    try {
      console.log('[Fan FB Simple] Loading user info...');
      window.FB.api('/me', 'GET', { fields: 'name,email' }, (response: any) => {
        console.log('[Fan FB Simple] User info response:', response);
        if (response && !response.error) {
          setUserInfo({
            id: response.id,
            name: response.name,
            email: response.email
          });
          setIsConnected(true);
          console.log('[Fan FB Simple] User connected successfully');
        } else {
          console.error('[Fan FB Simple] Error loading user info:', response?.error);
          setIsConnected(false);
          setUserInfo(null);
        }
      });
    } catch (error) {
      console.error('[Fan FB Simple] Error in loadUserInfo:', error);
      setIsConnected(false);
      setUserInfo(null);
    }
  };

  const connectFacebook = async () => {
    console.log('[Fan FB Simple] Connecting to Facebook...');
    setIsConnecting(true);

    try {
      // Use Facebook's basic login pattern
      window.FB.login((response: any) => {
        console.log('[Fan FB Simple] Login response:', response);
        
        if (response.authResponse && response.status === 'connected') {
          console.log('[Fan FB Simple] Login successful, loading user info...');
          loadUserInfo(response.authResponse.accessToken);
          toast({
            title: "Facebook Connected! 🎉",
            description: "Successfully connected to Facebook for fan campaigns.",
            duration: 4000
          });
        } else {
          console.log('[Fan FB Simple] Login failed or cancelled');
          toast({
            title: "Connection Failed",
            description: "Facebook login was cancelled or failed. Please try again.",
            variant: "destructive"
          });
        }
        
        setIsConnecting(false);
      }, { 
        scope: 'public_profile,email'
      });
    } catch (error) {
      console.error('[Fan FB Simple] Connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const disconnectFacebook = () => {
    console.log('[Fan FB Simple] Disconnecting Facebook...');
    window.FB.logout(() => {
      setIsConnected(false);
      setUserInfo(null);
      toast({
        title: "Facebook Disconnected",
        description: "Successfully disconnected from Facebook.",
      });
    });
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center">
          <Facebook className="h-4 w-4 mr-2 text-blue-500" />
          Facebook Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && userInfo ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userInfo.name}</p>
                <p className="text-xs text-gray-400">Connected to Facebook</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Ready to participate in Facebook campaigns!</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                onClick={disconnectFacebook}
                data-testid="button-disconnect-facebook-fan"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Facebook className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Connect Facebook</p>
              <p className="text-xs text-gray-400">Join campaigns and earn rewards</p>
            </div>
            
            <Button 
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              onClick={connectFacebook}
              disabled={isConnecting}
              data-testid="button-connect-facebook-fan"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Facebook'}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Connect to participate in creator campaigns and earn points
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}