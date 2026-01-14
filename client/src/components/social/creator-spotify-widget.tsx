import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { socialManager } from '@/lib/social-integrations';
import { FaSpotify } from 'react-icons/fa';
import { Users, ExternalLink, Loader2, CheckCircle, AlertTriangle, Music } from 'lucide-react';

interface SpotifyUserInfo {
  id?: string;
  display_name?: string;
  followers?: number;
}

export default function CreatorSpotifyWidget() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<SpotifyUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  useEffect(() => {
    // Attempt to fetch stored connection
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/social-connections/spotify', {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[Spotify Widget] Connection data:', data);
          if (data.connected && data.connection) {
            setIsConnected(true);
            const conn = data.connection;
            const profile = conn.profileData;
            
            console.log('[Spotify Widget] Profile data:', profile);
            
            // Extract display name from multiple possible locations
            const displayName = 
              profile?.display_name || 
              profile?.name ||
              profile?.username ||
              conn.platformDisplayName || 
              conn.platformUsername || 
              'Connected';
            
            const followerCount = 
              profile?.followers?.total || 
              profile?.followers || 
              profile?.follower_count || 
              0;
            
            console.log('[Spotify Widget] Extracted - displayName:', displayName, 'followers:', followerCount);
            
            setUserInfo({
              id: profile?.id || conn.platformUserId || '',
              display_name: displayName,
              followers: followerCount
            });
          } else {
            setIsConnected(false);
            setUserInfo(null);
          }
        }
      } catch (e) {
        console.error('[Spotify Widget] Load error:', e);
      }
    };
    if (user?.id) {
      loadStatus();
    }
  }, [user?.id, user?.dynamicUserId]);

  const connectSpotify = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await socialManager.getAPI('spotify').secureLogin();
      // Reload status after connection
      setTimeout(async () => {
        const response = await fetch('/api/social-connections/spotify', {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.connected && data.connectionData?.profile) {
            setIsConnected(true);
            setUserInfo(data.connectionData.profile);
          }
        }
        setIsConnecting(false);
      }, 1000);
    } catch (err) {
      setError('Failed to connect');
      setIsConnecting(false);
    }
  };

  const disconnectSpotify = async () => {
    try {
      const response = await fetch('/api/social-connections/disconnect', {
        method: 'POST',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform: 'spotify' }),
        credentials: 'include'
      });
      if (response.ok) {
        setIsConnected(false);
        setUserInfo(null);
      }
    } catch (e) {
      // ignore
    }
  };

  if (isConnected && userInfo) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <FaSpotify className="h-4 w-4 text-green-500" />
            Spotify
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              {userInfo.display_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm truncate">{userInfo.display_name}</p>
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                  Rewarded
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">Followers</p>
                  <p className="text-sm font-medium text-white">{(userInfo.followers || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-400">Music</p>
                  <p className="text-sm font-medium text-white">Active</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
              onClick={() => window.open('https://spotify.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={disconnectSpotify}
            >
              Disconnect
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <FaSpotify className="h-4 w-4 text-green-500" />
          Spotify
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaSpotify className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your Spotify account</p>
          <p className="text-xs text-gray-400 mb-2">Share your music with fans</p>
          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
            +500 Points
          </Badge>
        </div>
        <Button 
          className="w-full bg-green-600 text-white hover:bg-green-700"
          onClick={connectSpotify}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <FaSpotify className="h-4 w-4 mr-2" />
              Connect Spotify
            </>
          )}
        </Button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

