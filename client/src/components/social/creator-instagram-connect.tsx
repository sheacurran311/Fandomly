import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { 
  Instagram, 
  MessageCircle, 
  Users, 
  Image, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function CreatorInstagramConnect() {
  const { user } = useAuth();
  
  const {
    isConnected,
    isConnecting,
    userInfo,
    businessAccountId,
    error,
    connectInstagram,
    disconnectInstagram,
    refreshConnection
  } = useInstagramConnection();

  const [showRequirements, setShowRequirements] = useState(false);

  // Check if user is a creator
  const isCreator = user?.userType === 'creator';

  if (!isCreator) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram for Creators
          </CardTitle>
          <CardDescription>
            Instagram messaging is only available for creator accounts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleConnect = async () => {
    await connectInstagram();
  };

  const handleDisconnect = async () => {
    await disconnectInstagram();
  };

  const handleRefresh = async () => {
    await refreshConnection();
  };

  if (showRequirements) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram Business Account Required
          </CardTitle>
          <CardDescription>
            To enable Instagram messaging for your creator campaigns, you need an Instagram Business Account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How to set up Instagram Business Account:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to your Instagram app settings</li>
              <li>Switch to a Professional Account</li>
              <li>Choose "Business" as your account type</li>
              <li>Complete your business profile setup</li>
              <li>Return here to connect your account</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://help.instagram.com/502981923235522', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Setup Guide
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRequirements(false)}
            >
              I Have a Business Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnected && userInfo) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram Connected
          </CardTitle>
          <CardDescription>
            Your Instagram Business Account is connected and ready for messaging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {userInfo.profile_picture_url && (
              <img 
                src={userInfo.profile_picture_url} 
                alt={userInfo.username}
                className="h-12 w-12 rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">@{userInfo.username}</h3>
                {userInfo.account_type === 'BUSINESS' && (
                  <Badge variant="secondary">Business</Badge>
                )}
              </div>
              {userInfo.name && (
                <p className="text-sm text-muted-foreground">{userInfo.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Followers</p>
                <p className="text-xs text-muted-foreground">
                  {userInfo.followers_count?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Image className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Posts</p>
                <p className="text-xs text-muted-foreground">
                  {userInfo.media_count?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Messaging</p>
                <p className="text-xs text-muted-foreground">Enabled</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isConnecting}
              size="sm"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Instagram className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open(`https://instagram.com/${userInfo.username}`, '_blank')}
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          Connect Instagram
        </CardTitle>
        <CardDescription>
          Connect your Instagram Business Account to enable messaging for fan campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-medium">Instagram Messaging Features:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              Send messages to fans who engage with your campaigns
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Automated fan engagement and rewards
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              Track message delivery and responses
            </li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Separator />

        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Instagram className="h-4 w-4 mr-2" />
          )}
          Connect Instagram Business Account
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Requires Instagram Business Account with messaging permissions
        </p>
      </CardContent>
    </Card>
  );
}
