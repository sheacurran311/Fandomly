import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FacebookSDK } from "@/lib/facebook";
import { Instagram, Twitter, Facebook, Music2, Check } from "lucide-react";

interface SocialConnectionsProps {
  userType?: "fan" | "creator";
}

export default function SocialConnections({ userType = "fan" }: SocialConnectionsProps) {
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleFacebookConnect = async () => {
    if (userType !== "creator") {
      toast({
        title: "Creator Feature",
        description: "Facebook connection is available for creators only.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Use the updated Facebook SDK for creators
      const loginResult = await FacebookSDK.login('public_profile,email');
      
      if (loginResult.success) {
        // Get creator-specific data using your updated API call
        const creatorData = await FacebookSDK.getCreatorData();
        
        if (creatorData) {
          setFacebookConnected(true);
          
          toast({
            title: "Facebook Connected! 🎉",
            description: `Successfully connected as ${creatorData.name}. Creator data imported.`,
            duration: 4000,
          });
          
          console.log('Creator Facebook data:', creatorData);
        }
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Facebook. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Connect Socials</CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        <Button variant="outline" className="justify-start border-white/20 text-white">
          <Twitter className="h-4 w-4 mr-2"/>Connect X (Twitter)
        </Button>
        <Button variant="outline" className="justify-start border-white/20 text-white">
          <Instagram className="h-4 w-4 mr-2"/>Connect Instagram
        </Button>
        <Button 
          variant="outline" 
          className={`justify-start border-white/20 text-white ${facebookConnected ? 'bg-green-500/20 border-green-500/30' : ''}`}
          onClick={handleFacebookConnect}
          disabled={isConnecting}
          data-testid="button-connect-facebook-creator"
        >
          <Facebook className="h-4 w-4 mr-2"/>
          {isConnecting ? 'Connecting...' : facebookConnected ? (
            <>
              <Check className="h-4 w-4 ml-auto" />
              Facebook Connected
            </>
          ) : 'Connect Facebook'}
        </Button>
        <Button variant="outline" className="justify-start border-white/20 text-white">
          <Music2 className="h-4 w-4 mr-2"/>Connect TikTok
        </Button>
      </CardContent>
    </Card>
  );
}


