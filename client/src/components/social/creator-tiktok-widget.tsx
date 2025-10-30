import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { socialManager } from '@/lib/social-integrations';
import { Video, Users, ExternalLink, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface TikTokUserInfo {
  open_id?: string;
  display_name?: string;
  follower_count?: number;
}

export default function CreatorTikTokWidget() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<TikTokUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  useEffect(() => {
    // Attempt to fetch stored connection
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/social-connections/tiktok', {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[TikTok Widget] Full connection response:', JSON.stringify(data, null, 2));
          if (data.connected && data.connection) {
            setIsConnected(true);
            const conn = data.connection;
            const profile = conn.profileData;
            
            console.log('[TikTok Widget] Profile data:', profile);
            
            // Extract display name from multiple possible locations
            const displayName = 
              profile?.display_name || 
              profile?.username ||
              conn.platformDisplayName || 
              conn.platformUsername || 
              'Connected';
            
            const followerCount = 
              profile?.follower_count || 
              profile?.followers || 
              0;
            
            console.log('[TikTok Widget] Extracted - displayName:', displayName, 'followers:', followerCount);
            
            setUserInfo({
              open_id: profile?.open_id || conn.platformUserId || '',
              display_name: displayName,
              follower_count: followerCount
            });
          } else {
            setIsConnected(false);
            setUserInfo(null);
          }
        }
      } catch (e) {
        console.error('[TikTok Widget] Load error:', e);
      }
    };
    if (user?.id) {
      loadStatus();
    }
  }, [user?.id, user?.dynamicUserId]);

  const connectTikTok = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await socialManager.getAPI('tiktok').secureLogin();
      // Reload status after connection
      setTimeout(async () => {
        const response = await fetch('/api/social-connections/tiktok', {
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

  const disconnectTikTok = async () => {
    try {
      const response = await fetch('/api/social-connections/disconnect', {
        method: 'POST',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform: 'tiktok' }),
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
            <Video className="h-4 w-4 text-purple-400" />
            TikTok
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              {userInfo.display_name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium text-sm truncate">{userInfo.display_name}</p>
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Followers</p>
                  <p className="text-sm font-medium text-white">{(userInfo.follower_count || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-400">Videos</p>
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
              onClick={() => window.open(`https://tiktok.com/@${userInfo.display_name}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={disconnectTikTok}
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
          <Video className="h-4 w-4 text-purple-400" />
          TikTok
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Video className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your TikTok account</p>
          <p className="text-xs text-gray-400 mb-4">Share content and grow your audience</p>
        </div>
        <Button 
          className="w-full bg-black text-white hover:bg-black/80"
          onClick={connectTikTok}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Video className="h-4 w-4 mr-2" />
              Connect TikTok
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

