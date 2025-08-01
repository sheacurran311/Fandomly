import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Instagram, Music, Twitter, Youtube, Zap, 
  Check, AlertCircle, ExternalLink, Loader2,
  Users, Heart, MessageCircle, Share2, Key
} from "lucide-react";
import { FaTiktok, FaSpotify } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

interface MockSocialAccount {
  platform: string;
  username: string;
  displayName: string;
  followers: number;
  verified: boolean;
  profileImage: string;
  connected: boolean;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  benefits: string[];
  mockData: MockSocialAccount;
}

const platforms: SocialPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    description: 'Connect your Instagram account to track followers and engagement',
    benefits: ['Follower tracking', 'Post engagement metrics', 'Growth analytics'],
    mockData: {
      platform: 'instagram',
      username: 'athlete_star',
      displayName: 'Athlete Star',
      followers: 15420,
      verified: true,
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      connected: false
    }
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: FaTiktok,
    color: '#000000',
    description: 'Integrate TikTok for video content and viral metrics',
    benefits: ['Video view tracking', 'Viral content analysis', 'Creator insights'],
    mockData: {
      platform: 'tiktok',
      username: 'sportstok_hero',
      displayName: 'SportsTok Hero',
      followers: 8750,
      verified: false,
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b0e5?w=150&h=150&fit=crop&crop=face',
      connected: false
    }
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    description: 'Connect Twitter for real-time engagement and trending analysis',
    benefits: ['Tweet engagement', 'Hashtag tracking', 'Audience insights'],
    mockData: {
      platform: 'twitter',
      username: 'champion_voice',
      displayName: 'Champion Voice',
      followers: 3240,
      verified: true,
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      connected: false
    }
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    description: 'Link YouTube channel for subscriber and video performance data',
    benefits: ['Subscriber analytics', 'Video metrics', 'Revenue tracking'],
    mockData: {
      platform: 'youtube',
      username: 'athletevlogs',
      displayName: 'Athlete Vlogs',
      followers: 12800,
      verified: false,
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      connected: false
    }
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: FaSpotify,
    color: '#1DB954',
    description: 'Connect Spotify for music streaming and playlist analytics',
    benefits: ['Listener statistics', 'Playlist performance', 'Monthly listeners'],
    mockData: {
      platform: 'spotify',
      username: 'workout_beats',
      displayName: 'Workout Beats',
      followers: 1850,
      verified: false,
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
      connected: false
    }
  }
];

interface MockSocialConnectProps {
  onAccountsChange?: (accounts: MockSocialAccount[]) => void;
  showMetrics?: boolean;
  requiredPlatforms?: string[];
}

export default function MockSocialConnect({ 
  onAccountsChange, 
  showMetrics = true,
  requiredPlatforms = []
}: MockSocialConnectProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<MockSocialAccount[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const { toast } = useToast();

  const connectPlatform = async (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;

    setConnectingPlatform(platformId);
    
    // Simulate API call delay
    setTimeout(() => {
      const mockAccount = { ...platform.mockData, connected: true };
      
      setConnectedAccounts(prev => {
        const filtered = prev.filter(acc => acc.platform !== platformId);
        const updated = [...filtered, mockAccount];
        onAccountsChange?.(updated);
        return updated;
      });

      toast({
        title: "Mock Connection Successful",
        description: `Demo ${platform.name} account connected. Real connection requires API keys.`,
      });

      setConnectingPlatform(null);
    }, 1500);
  };

  const disconnectPlatform = (platformId: string) => {
    setConnectedAccounts(prev => {
      const updated = prev.filter(acc => acc.platform !== platformId);
      onAccountsChange?.(updated);
      return updated;
    });

    toast({
      title: "Account Disconnected",
      description: `Mock ${platformId} account disconnected`,
    });
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
      {/* API Keys Required Warning */}
      <Alert className="border-yellow-500/20 bg-yellow-500/10">
        <Key className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-300">
          <strong>Demo Mode:</strong> Social media connections are currently in demo mode. 
          To enable real connections, add your social media API credentials to the environment variables.
          This demo shows the full integration experience.
        </AlertDescription>
      </Alert>

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
                        Demo
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
                          Demo
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
                        disabled={isConnecting}
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
                            Demo Connect {platform.name}
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
                          disabled
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

      {/* Demo Data Notice */}
      {connectedAccounts.length > 0 && (
        <Alert className="border-blue-500/20 bg-blue-500/10">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <strong>Demo Data:</strong> The social media metrics shown are sample data. 
            With real API keys, you'll see authentic follower counts, engagement rates, and growth analytics 
            from each connected platform.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}