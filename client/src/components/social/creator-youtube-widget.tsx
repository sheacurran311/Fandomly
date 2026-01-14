import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { socialManager } from '@/lib/social-integrations';
import { Youtube, Users, ExternalLink, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface YouTubeUserInfo {
  id?: string;
  title?: string;
  subscriberCount?: number;
}

export default function CreatorYouTubeWidget() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<YouTubeUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  useEffect(() => {
    // Attempt to fetch stored connection
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/social-connections/youtube', {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[YouTube Widget] Connection data:', data);
          if (data.connected && data.connection) {
            setIsConnected(true);
            const conn = data.connection;
            const profile = conn.profileData;
            
            console.log('[YouTube Widget] Profile data:', profile);
            
            // Extract channel title from multiple possible locations
            const channelTitle = 
              profile?.title || 
              profile?.name ||
              profile?.channelTitle ||
              conn.platformDisplayName || 
              conn.platformUsername || 
              'Connected';
            
            const subscriberCount = 
              profile?.subscriberCount || 
              profile?.followers || 
              profile?.follower_count || 
              0;
            
            console.log('[YouTube Widget] Extracted - channelTitle:', channelTitle, 'subscribers:', subscriberCount);
            
            setUserInfo({
              id: profile?.id || conn.platformUserId || '',
              title: channelTitle,
              subscriberCount: subscriberCount
            });
          } else {
            setIsConnected(false);
            setUserInfo(null);
          }
        }
      } catch (e) {
        console.error('[YouTube Widget] Load error:', e);
      }
    };
    if (user?.id) {
      loadStatus();
    }
  }, [user?.id, user?.dynamicUserId]);

  const connectYouTube = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await socialManager.getAPI('youtube').secureLogin();
      // Reload status after connection
      setTimeout(async () => {
        const response = await fetch('/api/social-connections/youtube', {
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

  const disconnectYouTube = async () => {
    try {
      const response = await fetch('/api/social-connections/disconnect', {
        method: 'POST',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform: 'youtube' }),
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
            <Youtube className="h-4 w-4 text-red-500" />
            YouTube
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              {userInfo.title?.charAt(0) || 'Y'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm truncate">{userInfo.title}</p>
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
                <Users className="h-4 w-4 text-red-400" />
                <div>
                  <p className="text-xs text-gray-400">Subscribers</p>
                  <p className="text-sm font-medium text-white">{(userInfo.subscriberCount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-400">Channel</p>
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
              onClick={() => window.open('https://youtube.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Channel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={disconnectYouTube}
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
          <Youtube className="h-4 w-4 text-red-500" />
          YouTube
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Youtube className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your YouTube channel</p>
          <p className="text-xs text-gray-400 mb-2">Engage with your video audience</p>
          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
            +500 Points
          </Badge>
        </div>
        <Button 
          className="w-full bg-red-600 text-white hover:bg-red-700"
          onClick={connectYouTube}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Youtube className="h-4 w-4 mr-2" />
              Connect YouTube
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

