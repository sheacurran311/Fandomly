/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, getAuthHeaders } from '@/lib/queryClient';
import {
  User,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { FaSpotify, FaTiktok } from 'react-icons/fa';
import { SocialIntegrationManager } from '@/lib/social-integrations';
import { FacebookSDKManager } from '@/lib/facebook';
import { getSocialConnection } from '@/lib/social-connection-api';

const socialManager = new SocialIntegrationManager();

export default function AdminProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Social connection states
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // Social data
  const [facebookName, setFacebookName] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState<string | null>(null);
  const [youtubeChannel, setYoutubeChannel] = useState<string | null>(null);
  const [spotifyName, setSpotifyName] = useState<string | null>(null);

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    facebook: false,
    twitter: false,
    instagram: false,
    tiktok: false,
    youtube: false,
    spotify: false,
  });

  const checkAllConnections = useCallback(async () => {
    await Promise.all([
      checkFacebookStatus(),
      checkTwitterStatus(),
      checkInstagramStatus(),
      checkTiktokStatus(),
      checkYoutubeStatus(),
      checkSpotifyStatus(),
    ]);
  }, []);

  useEffect(() => {
    checkAllConnections();
  }, [checkAllConnections]);

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDKManager.ensureFBReady('creator');
      const status = await FacebookSDKManager.getLoginStatus();

      if (status.isLoggedIn) {
        const pages = await FacebookSDKManager.getUserPages();
        if (pages.length > 0) {
          setFacebookConnected(true);
          setFacebookName(pages[0].name);
        }
      } else {
        setFacebookConnected(false);
        setFacebookName(null);
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setFacebookConnected(false);
    }
  };

  const connectFacebook = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, facebook: true }));
      await FacebookSDKManager.ensureFBReady('creator');
      const result = await FacebookSDKManager.secureLogin('creator');

      if (result.success) {
        await checkFacebookStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'Facebook Connected! 📘' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Facebook',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect Facebook', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, facebook: false }));
    }
  };

  const checkTwitterStatus = async () => {
    try {
      const connection = await getSocialConnection('twitter');

      if (connection.connected && connection.connection) {
        setTwitterConnected(true);
        setTwitterHandle(
          connection.connection.platformUsername ||
            connection.connection.platformDisplayName ||
            null
        );
      } else {
        setTwitterConnected(false);
        setTwitterHandle(null);
      }
    } catch (error) {
      console.error('Error checking Twitter status:', error);
      setTwitterConnected(false);
    }
  };

  const connectTwitter = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, twitter: true }));
      const twitterAPI = socialManager['twitter'] as unknown as {
        secureLogin: () => Promise<{ success: boolean; error?: string }>;
      };
      const result = await twitterAPI.secureLogin();

      if (result.success) {
        await checkTwitterStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'Twitter/X Connected! 🐦' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Twitter',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Twitter connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect Twitter', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, twitter: false }));
    }
  };

  const checkInstagramStatus = async () => {
    try {
      const connection = await getSocialConnection('instagram');

      if (connection.connected && connection.connection) {
        setInstagramConnected(true);
        setInstagramHandle(
          connection.connection.platformUsername ||
            connection.connection.platformDisplayName ||
            null
        );
      } else {
        setInstagramConnected(false);
        setInstagramHandle(null);
      }
    } catch (error) {
      console.error('Error checking Instagram status:', error);
      setInstagramConnected(false);
    }
  };

  const connectInstagram = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, instagram: true }));
      const instagramAPI = (socialManager as any)['instagram'];
      const result = await instagramAPI.secureLogin();

      if (result.success) {
        await checkInstagramStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'Instagram Connected! 📸' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Instagram',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Instagram connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect Instagram', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, instagram: false }));
    }
  };

  const checkTiktokStatus = async () => {
    try {
      const response = await fetch('/api/social-connections/tiktok', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTiktokConnected(data.connected || false);
        setTiktokUsername(data.displayName || data.username || data.handle || null);
      } else {
        setTiktokConnected(false);
        setTiktokUsername(null);
      }
    } catch (error) {
      console.error('Error checking TikTok status:', error);
      setTiktokConnected(false);
    }
  };

  const connectTiktok = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, tiktok: true }));
      const tiktokAPI = socialManager['tiktok'];
      const result = await tiktokAPI.secureLogin();

      if (result.success) {
        await checkTiktokStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'TikTok Connected! 🎵' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect TikTok',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('TikTok connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect TikTok', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, tiktok: false }));
    }
  };

  const checkYoutubeStatus = async () => {
    try {
      const response = await fetch('/api/social-connections/youtube', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setYoutubeConnected(data.connected || false);
        setYoutubeChannel(data.channelTitle || data.channelName || null);
      } else {
        setYoutubeConnected(false);
        setYoutubeChannel(null);
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
      setYoutubeConnected(false);
    }
  };

  const connectYoutube = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, youtube: true }));
      const youtubeAPI = socialManager['youtube'];
      const result = await youtubeAPI.secureLogin();

      if (result.success) {
        await checkYoutubeStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'YouTube Connected! 📺' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect YouTube',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('YouTube connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect YouTube', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, youtube: false }));
    }
  };

  const checkSpotifyStatus = async () => {
    try {
      const response = await fetch('/api/social-connections/spotify', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSpotifyConnected(data.connected || false);
        setSpotifyName(data.displayName || data.username || null);
      } else {
        setSpotifyConnected(false);
        setSpotifyName(null);
      }
    } catch (error) {
      console.error('Error checking Spotify status:', error);
      setSpotifyConnected(false);
    }
  };

  const connectSpotify = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, spotify: true }));
      const spotifyAPI = socialManager['spotify'];
      const result = await spotifyAPI.secureLogin();

      if (result.success) {
        await checkSpotifyStatus();
        // Invalidate admin social connections cache
        queryClient.invalidateQueries({ queryKey: ['admin-social-connections'] });
        toast({ title: 'Spotify Connected! 🎧' });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect Spotify',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Spotify connection error:', error);
      toast({ title: 'Error', description: 'Failed to connect Spotify', variant: 'destructive' });
    } finally {
      setLoadingStates((prev) => ({ ...prev, spotify: false }));
    }
  };

  const socialAccounts = [
    {
      name: 'Facebook',
      icon: Facebook,
      connected: facebookConnected,
      handle: facebookName || 'Not connected',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
      onConnect: connectFacebook,
      loading: loadingStates.facebook,
    },
    {
      name: 'Twitter/X',
      icon: Twitter,
      connected: twitterConnected,
      handle: twitterHandle || 'Not connected',
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/20',
      onConnect: connectTwitter,
      loading: loadingStates.twitter,
    },
    {
      name: 'Instagram',
      icon: Instagram,
      connected: instagramConnected,
      handle: instagramHandle || 'Not connected',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/20',
      onConnect: connectInstagram,
      loading: loadingStates.instagram,
    },
    {
      name: 'TikTok',
      icon: FaTiktok,
      connected: tiktokConnected,
      handle: tiktokUsername || 'Not connected',
      color: 'text-gray-100',
      bgColor: 'bg-gray-100/20',
      onConnect: connectTiktok,
      loading: loadingStates.tiktok,
    },
    {
      name: 'YouTube',
      icon: Youtube,
      connected: youtubeConnected,
      handle: youtubeChannel || 'Not connected',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      onConnect: connectYoutube,
      loading: loadingStates.youtube,
    },
    {
      name: 'Spotify',
      icon: FaSpotify,
      connected: spotifyConnected,
      handle: spotifyName || 'Not connected',
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      onConnect: connectSpotify,
      loading: loadingStates.spotify,
    },
  ];

  return (
    <AdminLayout
      title="Admin Profile"
      description="Manage your admin profile and connect social accounts for platform tasks"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Info */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="mr-2 h-5 w-5 text-brand-primary" />
              Admin Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{user?.email || 'Not available'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Administrator
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Connections */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Platform Social Accounts</CardTitle>
            <p className="text-sm text-gray-400 mt-2">
              Connect Fandomly&apos;s official social accounts. These will be used when creating
              platform-wide tasks (e.g., &ldquo;Follow Fandomly on Twitter&rdquo;).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <div
                    key={account.name}
                    className={`p-4 rounded-lg border ${
                      account.connected
                        ? 'bg-white/5 border-white/20'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-full ${account.bgColor} flex items-center justify-center`}
                        >
                          <Icon className={`h-5 w-5 ${account.color}`} />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{account.name}</h3>
                          <p className="text-xs text-gray-400">{account.handle}</p>
                        </div>
                      </div>
                      {account.connected ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <Button
                      onClick={account.onConnect}
                      disabled={account.loading || account.connected}
                      className={`w-full ${
                        account.connected
                          ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed'
                          : 'bg-brand-primary hover:bg-brand-primary/80'
                      }`}
                      variant={account.connected ? 'outline' : 'default'}
                    >
                      {account.loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : account.connected ? (
                        'Connected'
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">About Platform Social Accounts</h4>
                <p className="text-sm text-gray-300">
                  These social connections are used for creating platform-wide tasks that users can
                  complete to earn Fandomly Points. For example, &ldquo;Follow Fandomly on
                  Twitter&rdquo; or &ldquo;Subscribe to Fandomly&apos;s YouTube Channel&rdquo;. Make
                  sure to connect official Fandomly accounts here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
