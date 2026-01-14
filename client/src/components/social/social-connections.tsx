import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Video, Check, MessageSquare, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FacebookSDKManager } from "@/lib/facebook";
import { socialManager } from "@/lib/social-integrations";

interface SocialConnectionsProps {
  userType?: "fan" | "creator";
}

export default function SocialConnections({ userType = "fan" }: SocialConnectionsProps) {
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchConnecting, setTwitchConnecting] = useState(false);
  const { toast } = useToast();

  // Check Facebook and TikTok connection status
  useEffect(() => {
    checkFacebookStatus();
    checkTiktokStatus();
    checkDiscordStatus();
    checkTwitchStatus();
  }, [userType]);

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady(userType);
      const status = await FacebookSDKManager.getLoginStatus();
      setFacebookConnected(status.isLoggedIn);
    } catch (error) {
      console.error('[Social] Error checking Facebook status:', error);
      setFacebookConnected(false);
    }
  };

  const checkTiktokStatus = async () => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected } = await getSocialConnection('tiktok');
      setTiktokConnected(connected);
    } catch (error) {
      console.error('[Social] Error checking TikTok status:', error);
      setTiktokConnected(false);
    }
  };

  const checkDiscordStatus = async () => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected } = await getSocialConnection('discord');
      setDiscordConnected(connected);
    } catch (error) {
      console.error('[Social] Error checking Discord status:', error);
      setDiscordConnected(false);
    }
  };

  const checkTwitchStatus = async () => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected } = await getSocialConnection('twitch');
      setTwitchConnected(connected);
    } catch (error) {
      console.error('[Social] Error checking Twitch status:', error);
      setTwitchConnected(false);
    }
  };

  const handleTiktokConnect = async () => {
    try {
      setTiktokConnecting(true);
      const tiktokAPI = socialManager['tiktok'];
      const result = await tiktokAPI.secureLogin();
      
      if (result.success) {
        setTiktokConnected(true);
        toast({
          title: "TikTok Connected! 🎉",
          description: "Successfully connected to TikTok.",
        });
        // Refresh connection status
        checkTiktokStatus();
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Failed to connect TikTok. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect TikTok. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTiktokConnecting(false);
    }
  };

  const handleDiscordConnect = async () => {
    try {
      setDiscordConnecting(true);
      const discordAPI = socialManager['discord'];
      const result = await discordAPI.secureLogin();
      
      if (result.success) {
        setDiscordConnected(true);
        toast({
          title: "Discord Connected! 🎉",
          description: "Successfully connected to Discord.",
        });
        checkDiscordStatus();
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Failed to connect Discord. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Discord connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect Discord. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDiscordConnecting(false);
    }
  };

  const handleTwitchConnect = async () => {
    try {
      setTwitchConnecting(true);
      const twitchAPI = socialManager['twitch'];
      const result = await twitchAPI.secureLogin();
      
      if (result.success) {
        setTwitchConnected(true);
        toast({
          title: "Twitch Connected! 🎉",
          description: result.displayName ? `Connected as ${result.displayName}` : "Successfully connected to Twitch.",
        });
        checkTwitchStatus();
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || 'Failed to connect Twitch. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Twitch connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect Twitch. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTwitchConnecting(false);
    }
  };

const handleFacebookConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await FacebookSDKManager.secureLogin(userType);
      if (result.success) {
        setFacebookConnected(true);
        toast({
          title: "Facebook Connected! 🎉",
          description: "Successfully connected to Facebook.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Facebook login failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
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
        <Button 
          variant="outline" 
          className={`justify-start border-white/20 text-white ${tiktokConnected ? 'bg-purple-500/20 border-purple-500/30' : ''}`}
          onClick={handleTiktokConnect}
          disabled={tiktokConnecting}
          data-testid="button-connect-tiktok-social"
        >
          <Video className="h-4 w-4 mr-2"/>
          {tiktokConnecting ? 'Connecting...' : tiktokConnected ? (
            <>
              <Check className="h-4 w-4 ml-auto" />
              TikTok Connected
            </>
          ) : 'Connect TikTok'}
        </Button>
        <Button 
          variant="outline" 
          className={`justify-start border-white/20 text-white ${discordConnected ? 'bg-indigo-500/20 border-indigo-500/30' : ''}`}
          onClick={handleDiscordConnect}
          disabled={discordConnecting}
          data-testid="button-connect-discord-social"
        >
          <MessageSquare className="h-4 w-4 mr-2"/>
          {discordConnecting ? 'Connecting...' : discordConnected ? (
            <>
              <Check className="h-4 w-4 ml-auto" />
              Discord Connected
            </>
          ) : 'Connect Discord'}
        </Button>
        <Button 
          variant="outline" 
          className={`justify-start border-white/20 text-white ${twitchConnected ? 'bg-purple-500/20 border-purple-500/30' : ''}`}
          onClick={handleTwitchConnect}
          disabled={twitchConnecting}
          data-testid="button-connect-twitch-social"
        >
          <Radio className="h-4 w-4 mr-2"/>
          {twitchConnecting ? 'Connecting...' : twitchConnected ? (
            <>
              <Check className="h-4 w-4 ml-auto" />
              Twitch Connected
            </>
          ) : 'Connect Twitch'}
        </Button>
      </CardContent>
    </Card>
  );
}


