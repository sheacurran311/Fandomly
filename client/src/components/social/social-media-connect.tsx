/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Instagram,
  Music,
  Twitter,
  Zap,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Video,
} from 'lucide-react';
import { FaTiktok, FaSpotify, FaDiscord, FaTwitch, FaYoutube } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';
import { usePlatformConnectors } from '@/hooks/use-social-connection';
import { disconnectSocialPlatform } from '@/lib/social-connection-api';

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
    name: 'YouTube Channel',
    icon: FaYoutube,
    color: '#FF0000',
    description: 'Link your YouTube channel (separate from Google sign-in)',
    benefits: ['Subscriber analytics', 'Video metrics', 'Revenue tracking'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: FaSpotify,
    color: '#1DB954',
    description: 'Connect Spotify for music streaming and playlist analytics',
    benefits: ['Listener statistics', 'Playlist performance', 'Monthly listeners'],
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: FaDiscord,
    color: '#5865F2',
    description: 'Connect Discord for community engagement and server analytics',
    benefits: ['Server member tracking', 'Role management', 'Community insights'],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: FaTwitch,
    color: '#9146FF',
    description: 'Link Twitch for streaming analytics and subscriber data',
    benefits: ['Subscriber tracking', 'Stream analytics', 'Follower insights'],
  },
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
  requiredPlatforms = [],
}: SocialMediaConnectProps) {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const { connect: hookConnect, connectingPlatform, hooks: platformHooks } = usePlatformConnectors();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load persisted social accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/social/accounts', { credentials: 'include' });
        const accounts = await res.json();
        const mapped: ConnectedAccount[] = (accounts || []).map((a: any) => ({
          platform: a.platform,
          username: a.username,
          displayName: a.displayName,
          followers: Number(a.followers || 0),
          verified: Boolean(a.verified || false),
          profileUrl: a.profileUrl || (a.username ? `https://twitter.com/${a.username}` : '#'),
          lastSync: a.connectedAt ? new Date(a.connectedAt) : undefined,
          status: a.isActive === false ? 'expired' : 'connected',
        }));
        setConnectedAccounts(mapped);
        onAccountsChange?.(mapped);
      } catch (e) {
        console.warn('Failed to load social accounts:', e);
      }
    };
    loadAccounts();
  }, [onAccountsChange]);

  const connectPlatform = async (platformId: string) => {
    await hookConnect(platformId);
    invalidateSocialConnections();
    // Reload local account list to reflect changes
    try {
      const res = await fetch('/api/social/accounts', { credentials: 'include' });
      const accounts = await res.json();
      const mapped: ConnectedAccount[] = (accounts || []).map((a: any) => ({
        platform: a.platform,
        username: a.username,
        displayName: a.displayName,
        followers: Number(a.followers || 0),
        verified: Boolean(a.verified || false),
        profileUrl: a.profileUrl || '#',
        lastSync: a.connectedAt ? new Date(a.connectedAt) : undefined,
        status: a.isActive === false ? 'expired' : 'connected',
      }));
      setConnectedAccounts(mapped);
      onAccountsChange?.(mapped);
    } catch {
      // Hook already showed toast on success/failure
    }
  };

  const disconnectPlatform = async (platformId: string) => {
    try {
      const result = await disconnectSocialPlatform(platformId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setConnectedAccounts((prev) => {
        const updated = prev.filter((acc) => acc.platform !== platformId);
        onAccountsChange?.(updated);
        return updated;
      });

      // Invalidate social connections cache so all components get fresh data
      invalidateSocialConnections();

      toast({
        title: 'Account Disconnected',
        description: `${platformId} account has been disconnected`,
      });
    } catch (error) {
      toast({
        title: 'Disconnection Failed',
        description: `Failed to disconnect ${platformId} account`,
        variant: 'destructive',
      });
    }
  };

  const getConnectionProgress = () => {
    const totalRequired = requiredPlatforms.length || platforms.length;
    const connected = connectedAccounts.length;
    return Math.round((connected / totalRequired) * 100);
  };

  const isAccountConnected = (platformId: string) => {
    return connectedAccounts.some((acc) => acc.platform === platformId);
  };

  const getConnectedAccount = (platformId: string) => {
    return connectedAccounts.find((acc) => acc.platform === platformId);
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
                <span className="text-white">
                  {connectedAccounts.length} of {requiredPlatforms.length}
                </span>
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
          .filter(
            (platform) => requiredPlatforms.length === 0 || requiredPlatforms.includes(platform.id)
          )
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
                        <Icon className="h-5 w-5" style={{ color: platform.color }} />
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
            <strong>Developer Setup Required:</strong> To connect social media accounts, you need to
            set up API keys for each platform. Please add the following environment variables:
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
