import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useTwitchConnection } from '@/hooks/use-social-connection';
import { FaTwitch } from 'react-icons/fa';
import { Users, Video, ExternalLink, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CreatorTwitchWidget() {
  const { user } = useAuth();
  const { isConnected, isConnecting, userInfo, error, connect, disconnect } = useTwitchConnection();

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  if (isConnected && userInfo) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <FaTwitch className="h-4 w-4 text-[#9146FF]" />
            Twitch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#9146FF]/20 flex items-center justify-center text-[#9146FF]">
              {userInfo.username?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm truncate">{userInfo.username}</p>
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
                  Rewarded
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
                <Users className="h-4 w-4 text-[#9146FF]" />
                <div>
                  <p className="text-xs text-gray-400">Followers</p>
                  <p className="text-sm font-medium text-white">{(userInfo.followersCount || userInfo.followers_count || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Streaming</p>
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
              onClick={() => window.open(`https://twitch.tv/${userInfo.username}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Channel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={disconnect}
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
          <FaTwitch className="h-4 w-4 text-[#9146FF]" />
          Twitch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-[#9146FF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaTwitch className="h-6 w-6 text-[#9146FF]" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your Twitch account</p>
          <p className="text-xs text-gray-400 mb-2">Stream and engage with viewers</p>
          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
            +500 Points
          </Badge>
        </div>
        <Button 
          className="w-full bg-[#9146FF] text-white hover:bg-[#9146FF]/80"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <FaTwitch className="h-4 w-4 mr-2" />
              Connect Twitch
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

