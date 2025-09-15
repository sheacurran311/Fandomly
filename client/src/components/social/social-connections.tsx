import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFacebookConnection } from "@/contexts/facebook-connection-context";
import { Instagram, Twitter, Facebook, Music2, Check } from "lucide-react";

interface SocialConnectionsProps {
  userType?: "fan" | "creator";
}

export default function SocialConnections({ userType = "fan" }: SocialConnectionsProps) {
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { connectFacebook, isConnected } = useFacebookConnection();

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
      await connectFacebook();
      setFacebookConnected(true);
      toast({ title: "Facebook Connected! 🎉", description: "Your Facebook account is linked." });
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
          {isConnecting ? 'Connecting...' : (facebookConnected || isConnected) ? (
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


