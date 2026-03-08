/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Facebook,
  Twitter,
  Instagram,
  Video,
  Check,
  MessageSquare,
  Radio,
  Youtube,
  Music,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FacebookSDKManager } from '@/lib/facebook';
import { useTwitterConnection } from '@/hooks/use-twitter-connection';
import InstagramSDKManager from '@/lib/instagram';
import { socialManager } from '@/lib/social-integrations';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { useAuth } from '@/hooks/use-auth';

interface SocialConnectionsProps {
  userType?: string;
}

export default function SocialConnections({ userType = 'fan' }: SocialConnectionsProps) {
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);

  // Twitter connection via unified hook (handles saving connections properly)
  const {
    isConnected: twitterConnected,
    isConnecting: twitterConnecting,
    connect: handleTwitterConnect,
  } = useTwitterConnection();

  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramConnecting, setInstagramConnecting] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchConnecting, setTwitchConnecting] = useState(false);
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);
  const [appleMusicConnecting, setAppleMusicConnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check all connection statuses (Twitter is handled by useTwitterConnection hook)
  useEffect(() => {
    const checkStatus = async (platform: string, setter: (v: boolean) => void) => {
      try {
        const { getSocialConnection } = await import('@/lib/social-connection-api');
        const { connected } = await getSocialConnection(platform);
        setter(connected);
      } catch (error) {
        console.error(`[Social] Error checking ${platform} status:`, error);
        setter(false);
      }
    };

    checkStatus('facebook', setFacebookConnected);
    // Twitter status is managed by useTwitterConnection hook
    checkStatus('instagram', setInstagramConnected);
    checkStatus('tiktok', setTiktokConnected);
    checkStatus('youtube', setYoutubeConnected);
    checkStatus('spotify', setSpotifyConnected);
    checkStatus('discord', setDiscordConnected);
    checkStatus('twitch', setTwitchConnected);
    checkStatus('apple_music', setAppleMusicConnected);
  }, [userType]);

  const refreshStatus = async (platform: string, setter: (v: boolean) => void) => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connected } = await getSocialConnection(platform);
      setter(connected);
    } catch {}
  };

  // Twitter connect is handled by useTwitterConnection hook (handleTwitterConnect)

  const handleInstagramConnect = async () => {
    try {
      setInstagramConnecting(true);
      // Instagram only supports creator/business auth -- always use 'creator'
      const result = await InstagramSDKManager.secureLogin('creator');
      if (result.success) {
        setInstagramConnected(true);
        toast({
          title: 'Instagram Connected!',
          description: 'Successfully connected to Instagram.',
        });
        invalidateSocialConnections();
        refreshStatus('instagram', setInstagramConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Instagram. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Instagram connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Instagram.',
        variant: 'destructive',
      });
    } finally {
      setInstagramConnecting(false);
    }
  };

  const handleFacebookConnect = async () => {
    try {
      setFacebookConnecting(true);
      const result = await FacebookSDKManager.secureLogin(userType);
      if (result.success) {
        setFacebookConnected(true);
        invalidateSocialConnections();
        toast({ title: 'Facebook Connected!', description: 'Successfully connected to Facebook.' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Facebook login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'An error occurred while connecting to Facebook.',
        variant: 'destructive',
      });
    } finally {
      setFacebookConnecting(false);
    }
  };

  const handleTiktokConnect = async () => {
    try {
      setTiktokConnecting(true);
      const tiktokAPI = socialManager['tiktok'];
      const result = await tiktokAPI.secureLogin();
      if (result.success) {
        setTiktokConnected(true);
        toast({ title: 'TikTok Connected!', description: 'Successfully connected to TikTok.' });
        invalidateSocialConnections();
        refreshStatus('tiktok', setTiktokConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect TikTok.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('TikTok connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect TikTok.',
        variant: 'destructive',
      });
    } finally {
      setTiktokConnecting(false);
    }
  };

  const handleYoutubeConnect = async () => {
    try {
      setYoutubeConnecting(true);
      const youtubeAPI = socialManager['youtube'];
      const result = await youtubeAPI.secureLogin();
      if (result.success) {
        setYoutubeConnected(true);
        toast({
          title: 'YouTube Connected!',
          description: result.channelName
            ? `Connected ${result.channelName}`
            : 'Successfully connected to YouTube.',
        });
        invalidateSocialConnections();
        refreshStatus('youtube', setYoutubeConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect YouTube.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('YouTube connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect YouTube.',
        variant: 'destructive',
      });
    } finally {
      setYoutubeConnecting(false);
    }
  };

  const handleSpotifyConnect = async () => {
    try {
      setSpotifyConnecting(true);
      const spotifyAPI = socialManager['spotify'];
      const result = await spotifyAPI.secureLogin();
      if (result.success) {
        setSpotifyConnected(true);
        toast({
          title: 'Spotify Connected!',
          description: result.displayName
            ? `Connected ${result.displayName}`
            : 'Successfully connected to Spotify.',
        });
        invalidateSocialConnections();
        refreshStatus('spotify', setSpotifyConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Spotify.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Spotify connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Spotify.',
        variant: 'destructive',
      });
    } finally {
      setSpotifyConnecting(false);
    }
  };

  const handleDiscordConnect = async () => {
    try {
      setDiscordConnecting(true);
      const discordAPI = socialManager['discord'];
      const result = await discordAPI.secureLogin();
      if (result.success) {
        setDiscordConnected(true);
        toast({ title: 'Discord Connected!', description: 'Successfully connected to Discord.' });
        invalidateSocialConnections();
        refreshStatus('discord', setDiscordConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Discord.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Discord connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Discord.',
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
          title: 'Twitch Connected!',
          description: result.displayName
            ? `Connected as ${result.displayName}`
            : 'Successfully connected to Twitch.',
        });
        invalidateSocialConnections();
        refreshStatus('twitch', setTwitchConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Twitch.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Twitch connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Twitch.',
        variant: 'destructive',
      });
    } finally {
      setTwitchConnecting(false);
    }
  };

  const handleAppleMusicConnect = async () => {
    try {
      setAppleMusicConnecting(true);
      const { AppleMusicAPI } = await import('@/lib/social-integrations');
      const appleMusicAPI = new AppleMusicAPI();
      const result = await appleMusicAPI.secureLogin();
      if (result.success) {
        setAppleMusicConnected(true);
        toast({
          title: 'Apple Music Connected!',
          description: result.displayName
            ? `Connected ${result.displayName}`
            : 'Successfully connected to Apple Music.',
        });
        invalidateSocialConnections();
        refreshStatus('apple_music', setAppleMusicConnected);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Apple Music.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Apple Music connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Apple Music.',
        variant: 'destructive',
      });
    } finally {
      setAppleMusicConnecting(false);
    }
  };

  const renderButton = (
    label: string,
    icon: React.ReactNode,
    connected: boolean,
    connecting: boolean,
    handler: () => void,
    connectedColor: string,
    testId?: string
  ) => (
    <Button
      variant="outline"
      className={`justify-start border-white/20 text-white ${connected ? `${connectedColor}` : ''}`}
      onClick={handler}
      disabled={connecting}
      data-testid={testId}
    >
      {icon}
      {connecting ? (
        'Connecting...'
      ) : connected ? (
        <>
          <Check className="h-4 w-4 ml-auto" />
          {label} Connected
        </>
      ) : (
        `Connect ${label}`
      )}
    </Button>
  );

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Connect Socials</CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        {renderButton(
          'X (Twitter)',
          <Twitter className="h-4 w-4 mr-2" />,
          twitterConnected,
          twitterConnecting,
          handleTwitterConnect,
          'bg-blue-500/20 border-blue-500/30',
          'button-connect-twitter-social'
        )}
        {renderButton(
          'Instagram',
          <Instagram className="h-4 w-4 mr-2" />,
          instagramConnected,
          instagramConnecting,
          handleInstagramConnect,
          'bg-pink-500/20 border-pink-500/30',
          'button-connect-instagram-social'
        )}
        {renderButton(
          'Facebook',
          <Facebook className="h-4 w-4 mr-2" />,
          facebookConnected,
          facebookConnecting,
          handleFacebookConnect,
          'bg-green-500/20 border-green-500/30',
          'button-connect-facebook-creator'
        )}
        {renderButton(
          'TikTok',
          <Video className="h-4 w-4 mr-2" />,
          tiktokConnected,
          tiktokConnecting,
          handleTiktokConnect,
          'bg-purple-500/20 border-purple-500/30',
          'button-connect-tiktok-social'
        )}
        {renderButton(
          'YouTube',
          <Youtube className="h-4 w-4 mr-2" />,
          youtubeConnected,
          youtubeConnecting,
          handleYoutubeConnect,
          'bg-red-500/20 border-red-500/30',
          'button-connect-youtube-social'
        )}
        {renderButton(
          'Spotify',
          <Music className="h-4 w-4 mr-2" />,
          spotifyConnected,
          spotifyConnecting,
          handleSpotifyConnect,
          'bg-green-500/20 border-green-500/30',
          'button-connect-spotify-social'
        )}
        {renderButton(
          'Apple Music',
          <Music className="h-4 w-4 mr-2" />,
          appleMusicConnected,
          appleMusicConnecting,
          handleAppleMusicConnect,
          'bg-pink-500/20 border-pink-500/30',
          'button-connect-apple-music-social'
        )}
        {renderButton(
          'Discord',
          <MessageSquare className="h-4 w-4 mr-2" />,
          discordConnected,
          discordConnecting,
          handleDiscordConnect,
          'bg-indigo-500/20 border-indigo-500/30',
          'button-connect-discord-social'
        )}
        {renderButton(
          'Twitch',
          <Radio className="h-4 w-4 mr-2" />,
          twitchConnected,
          twitchConnecting,
          handleTwitchConnect,
          'bg-purple-500/20 border-purple-500/30',
          'button-connect-twitch-social'
        )}
      </CardContent>
    </Card>
  );
}
