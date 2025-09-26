import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Instagram, Music, Twitter, Youtube, Zap, 
  Check, AlertCircle, ExternalLink, Loader2,
  Users, Heart, MessageCircle, Share2
} from "lucide-react";
import { FaTiktok, FaSpotify } from "react-icons/fa";
import { socialManager, type SocialMediaAccount } from "@/lib/social-integrations";
import { TwitterSDKManager } from "@/lib/twitter";
import { useToast } from "@/hooks/use-toast";

interface SocialPlatform {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  benefits: string[];
  requiresApproval?: boolean;
}

const platforms: SocialPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    description: 'Connect your Instagram account to track followers and engagement',
    benefits: ['Follower tracking', 'Post engagement metrics', 'Growth analytics'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: FaTiktok,
    color: '#000000',
    description: 'Integrate TikTok for video content and viral metrics',
    benefits: ['Video view tracking', 'Viral content analysis', 'Creator insights'],
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    description: 'Connect Twitter for real-time engagement and trending analysis',
    benefits: ['Tweet engagement', 'Hashtag tracking', 'Audience insights'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    description: 'Link YouTube channel for subscriber and video performance data',
    benefits: ['Subscriber analytics', 'Video metrics', 'Revenue tracking'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: FaSpotify,
    color: '#1DB954',
    description: 'Connect Spotify for music streaming and playlist analytics',
    benefits: ['Listener statistics', 'Playlist performance', 'Monthly listeners'],
  }
];

interface ConnectedAccount {
  platform: string;
  username: string;
  displayName: string;
  followers: number;
  verified: boolean;
  profileUrl: string;
  lastSync?: Date;
  status: 'connected' | 'error' | 'expired';
}

interface SocialMediaConnectProps {
  onAccountsChange?: (accounts: ConnectedAccount[]) => void;
  showMetrics?: boolean;
  requiredPlatforms?: string[];
}

export default function SocialMediaConnect({ 
  onAccountsChange, 
  showMetrics = true,
  requiredPlatforms = []
}: SocialMediaConnectProps) {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check for OAuth callbacks
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        toast({
          title: "Connection Failed",
          description: `OAuth error: ${error}`,
          variant: "destructive"
        });
        return;
      }

      if (code && state) {
        const platform = state.replace('_auth', '');
        // Skip Twitter - it uses popup flow via TwitterSDKManager, not redirect
        if (platform !== 'twitter') {
          await handleOAuthSuccess(platform, code);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleOAuthSuccess = async (platform: string, code: string) => {
    // Skip Twitter - it uses popup flow via TwitterSDKManager, not redirect
    if (platform === 'twitter') {
      console.log('[Social Connect] Skipping Twitter redirect callback - uses popup flow');
      return;
    }

    setIsLoading(true);
    try {
      const account = await socialManager.connectAccount(platform, code);
      
      if (!account) {
        throw new Error('Failed to connect account - no account data received');
      }
      
      const connectedAccount: ConnectedAccount = {
        platform: account.platform,
        username: account.username,
        displayName: account.displayName,
        followers: account.followers,
        verified: account.verified,
        profileUrl: account.profileUrl,
        lastSync: new Date(),
        status: 'connected'
      };

      setConnectedAccounts(prev => {
        const filtered = prev.filter(acc => acc.platform !== platform);
        const updated = [...filtered, connectedAccount];
        onAccountsChange?.(updated);
        return updated;
      });

      toast({
        title: "Account Connected",
        description: `Successfully connected your ${platform} account`,
      });

    } catch (error) {
      console.error('OAuth success handling error:', error);
      toast({
        title: "Connection Failed",
        description: `Failed to connect ${platform} account`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setConnectingPlatform(null);
    }
  };

  const connectPlatform = async (platformId: string) => {
    if (connectingPlatform) return;
    
    setConnectingPlatform(platformId);
    try {
      if (platformId === 'twitter') {
        // Use popup PKCE flow via TwitterSDKManager
        const userType = (window as any).__userType || 'fan';
        const result = await TwitterSDKManager.secureLogin(userType, (user as any)?.dynamicUserId || user?.id);
        if (result.success && result.accessToken) {
          // Fetch profile directly using the token
          const userInfo = await TwitterSDKManager.fetchUserInfo(result.accessToken);
          if (!userInfo) throw new Error('Failed to load X profile');
          const connectedAccount: ConnectedAccount = {
            platform: 'twitter',
            username: userInfo.username,
            displayName: userInfo.name,
            followers: userInfo.followersCount || 0,
            verified: false,
            profileUrl: `https://twitter.com/${userInfo.username}`,
            lastSync: new Date(),
            status: 'connected',
          };
          setConnectedAccounts(prev => {
            const filtered = prev.filter(acc => acc.platform !== 'twitter');
            const updated = [...filtered, connectedAccount];
            onAccountsChange?.(updated);
            return updated;
          });
        } else if (!result.success) {
          throw new Error(result.error || 'Twitter connect failed');
        }
      } else {
        const authUrl = socialManager.getAuthUrl(platformId);
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Connect platform error:', error);
      toast({
        title: "Connection Error",
        description: `Failed to initiate ${platformId} connection. Please check your API keys.`,
        variant: "destructive"
      });
      setConnectingPlatform(null);
    }
  };

  const disconnectPlatform = async (platformId: string) => {
    try {
      await fetch(`/api/social/${platformId}`, {
        method: 'DELETE'
      });

      setConnectedAccounts(prev => {
        const updated = prev.filter(acc => acc.platform !== platformId);
        onAccountsChange?.(updated);
        return updated;
      });

      toast({
        title: "Account Disconnected",
        description: `${platformId} account has been disconnected`,
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: `Failed to disconnect ${platformId} account`,
        variant: "destructive"
      });
    }
  };

  const getConnectionProgress = () => {
    const totalRequired = requiredPlatforms.length || platforms.length;
    const connected = connectedAccounts.length;
    return Math.round((connected / totalRequired) * 100);
  };

  const isAccountConnected = (platformId: string) => {
    return connectedAccounts.some(acc => acc.platform === platformId);
  };

  const getConnectedAccount = (platformId: string) => {
    return connectedAccounts.find(acc => acc.platform === platformId);
  };

  return (
    <div className="space-y-6">
      {/* Connection Progress */}
      {requiredPlatforms.length > 0 && (
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-primary" />
              Social Media Integration Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Connected Accounts</span>
                <span className="text-white">{connectedAccounts.length} of {requiredPlatforms.length}</span>
              </div>
              <Progress value={getConnectionProgress()} className="h-2" />
              {getConnectionProgress() === 100 && (
                <Alert className="border-green-500/20 bg-green-500/10">
                  <Check className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    All required social media accounts connected successfully!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Connection Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms
          .filter(platform => requiredPlatforms.length === 0 || requiredPlatforms.includes(platform.id))
          .map((platform) => {
            const Icon = platform.icon;
            const isConnected = isAccountConnected(platform.id);
            const account = getConnectedAccount(platform.id);
            const isConnecting = connectingPlatform === platform.id;

            return (
              <Card 
                key={platform.id}
                className={`bg-white/10 border-white/20 transition-all duration-300 ${
                  isConnected ? 'border-green-500/30 bg-green-500/5' : 'hover:bg-white/15'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${platform.color}20` }}
                      >
                        <Icon 
                          className="h-5 w-5" 
                          style={{ color: platform.color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{platform.name}</CardTitle>
                        {isConnected && account && (
                          <p className="text-sm text-gray-300">@{account.username}</p>
                        )}
                      </div>
                    </div>
                    {isConnected && (
                      <Badge className="bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm">{platform.description}</p>

                  {/* Benefits */}
                  <div className="space-y-2">
                    <p className="text-white text-sm font-medium">Benefits:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {platform.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-brand-primary rounded-full" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Connection Stats */}
                  {isConnected && account && showMetrics && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-white font-semibold">
                          <Users className="h-3 w-3" />
                          {account.followers.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-400">Followers</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-400 font-semibold">
                          <Check className="h-3 w-3" />
                          Active
                        </div>
                        <p className="text-xs text-gray-400">Status</p>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    {!isConnected ? (
                      <Button
                        onClick={() => connectPlatform(platform.id)}
                        disabled={isConnecting || isLoading}
                        className="w-full"
                        style={{ backgroundColor: platform.color }}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Connect {platform.name}
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => disconnectPlatform(platform.id)}
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          Disconnect
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            if (account?.profileUrl) {
                              window.open(account.profileUrl, '_blank');
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Missing API Keys Warning */}
      {connectedAccounts.length === 0 && !isLoading && (
        <Alert className="border-yellow-500/20 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            <strong>Developer Setup Required:</strong> To connect social media accounts, you need to set up API keys for each platform. 
            Please add the following environment variables:
            <ul className="mt-2 ml-4 space-y-1 text-sm">
              <li>• VITE_INSTAGRAM_CLIENT_ID</li>
              <li>• VITE_TIKTOK_CLIENT_KEY</li>
              <li>• VITE_TWITTER_CLIENT_ID</li>
              <li>• VITE_YOUTUBE_CLIENT_ID</li>
              <li>• VITE_SPOTIFY_CLIENT_ID</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}