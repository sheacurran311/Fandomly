import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { TwitterSDKManager } from '@/lib/twitter';
import { Twitter, Users, MessageSquare, ExternalLink, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface TwitterUserInfo {
  id?: string;
  name?: string;
  username?: string;
  followers_count?: number;
}

export default function CreatorTwitterWidget() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<TwitterUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  useEffect(() => {
    // Attempt to fetch stored connection
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/social/accounts', {
          headers: {
            'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (response.ok) {
          const connections = await response.json();
          const tw = connections.find((c: any) => c.platform === 'twitter');
          if (tw) {
            setIsConnected(true);
            setUserInfo({ id: tw.accountId, name: tw.displayName, username: tw.username, followers_count: tw.followers });
          } else {
            setIsConnected(false);
            setUserInfo(null);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadStatus();
  }, [user?.id]);

  const connectTwitter = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const result = await TwitterSDKManager.secureLogin('creator', (user as any)?.dynamicUserId || user?.id);
      if (result.success && result.user) {
        setIsConnected(true);
        setUserInfo({ id: result.user.id, name: result.user.name, username: result.user.username });
      } else {
        setError(result.error || 'Failed to connect');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectTwitter = async () => {
    try {
      const response = await fetch('/api/social/twitter', {
        method: 'DELETE',
        headers: {
          'x-dynamic-user-id': (user as any)?.dynamicUserId || user?.id || '',
          'Content-Type': 'application/json'
        },
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
            <Twitter className="h-4 w-4 text-white" />
            X (Twitter)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              @{userInfo.username?.charAt(0) || 'X'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium text-sm truncate">@{userInfo.username}</p>
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              {userInfo.name && (
                <p className="text-xs text-gray-400 truncate">{userInfo.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Followers</p>
                  <p className="text-sm font-medium text-white">{(userInfo.followers_count || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Messages</p>
                  <p className="text-sm font-medium text-white">Ready</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
              onClick={() => window.open(`https://twitter.com/${userInfo.username}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={disconnectTwitter}
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
          <Twitter className="h-4 w-4 text-white" />
          X (Twitter)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Twitter className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your X account</p>
          <p className="text-xs text-gray-400 mb-4">Enable messaging and audience insights</p>
        </div>
        <Button 
          className="w-full bg-black text-white hover:bg-black/80"
          onClick={connectTwitter}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Twitter className="h-4 w-4 mr-2" />
              Connect X
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


