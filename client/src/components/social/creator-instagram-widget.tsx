import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import { useAuth } from '@/hooks/use-auth';
import { 
  Instagram, 
  Users, 
  Image, 
  MessageCircle,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function CreatorInstagramWidget() {
  const { user } = useAuth();
  const {
    isConnected,
    isConnecting,
    userInfo,
    error,
    connectInstagram,
    refreshConnection
  } = useInstagramConnection();

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  if (isConnected && userInfo) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-400" />
            Instagram Business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Info */}
          <div className="flex items-center gap-3">
            {userInfo.profile_picture_url && (
              <img 
                src={userInfo.profile_picture_url} 
                alt={userInfo.username}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm truncate">@{userInfo.username}</p>
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

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Followers</p>
                  <p className="text-sm font-medium text-white">
                    {userInfo.followers_count?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Posts</p>
                  <p className="text-sm font-medium text-white">
                    {userInfo.media_count?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messaging Status */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">Messaging Enabled</p>
                <p className="text-xs text-green-300/70">Ready for fan campaigns</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
              onClick={refreshConnection}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Instagram className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-gray-300 hover:bg-white/10"
              onClick={() => window.open(`https://instagram.com/${userInfo.username}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
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
          <Instagram className="h-4 w-4 text-pink-400" />
          Instagram Business
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Instagram className="h-6 w-6 text-pink-400" />
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect Instagram Business</p>
          <p className="text-xs text-gray-400 mb-2">
            Enable messaging for fan campaigns
          </p>
          <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs">
            +500 Points
          </Badge>
        </div>

        {/* Features Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MessageCircle className="h-3 w-3" />
            <span>Send messages to fans</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Users className="h-3 w-3" />
            <span>Track follower growth</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Image className="h-3 w-3" />
            <span>Content engagement metrics</span>
          </div>
        </div>

        {/* Connect Button */}
        <Button 
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
          onClick={connectInstagram}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="h-4 w-4 mr-2" />
              Connect Instagram
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

        {/* Requirements Note */}
        <p className="text-xs text-gray-500 text-center">
          Requires Instagram Business Account
        </p>
      </CardContent>
    </Card>
  );
}
