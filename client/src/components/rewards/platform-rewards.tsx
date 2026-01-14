import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Coins, 
  Gift, 
  Star, 
  Clock, 
  TrendingUp,
  Sparkles,
  Twitter,
  Instagram,
  Facebook,
  Youtube
} from "lucide-react";
import { FaDiscord, FaTwitch, FaSpotify, FaTiktok } from "react-icons/fa";

interface PointTransaction {
  id: string;
  points: number;
  source: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Helper to get icon and color for each source
const getSourceInfo = (source: string, metadata?: Record<string, any>) => {
  const platform = metadata?.platform || source;
  
  switch (platform) {
    case 'twitter':
      return { icon: Twitter, color: 'text-blue-400', bgColor: 'bg-blue-400/20', label: 'Twitter' };
    case 'instagram':
      return { icon: Instagram, color: 'text-pink-400', bgColor: 'bg-pink-400/20', label: 'Instagram' };
    case 'discord':
      return { icon: FaDiscord, color: 'text-purple-400', bgColor: 'bg-purple-400/20', label: 'Discord' };
    case 'facebook':
      return { icon: Facebook, color: 'text-blue-500', bgColor: 'bg-blue-500/20', label: 'Facebook' };
    case 'youtube':
      return { icon: Youtube, color: 'text-red-400', bgColor: 'bg-red-400/20', label: 'YouTube' };
    case 'spotify':
      return { icon: FaSpotify, color: 'text-green-400', bgColor: 'bg-green-400/20', label: 'Spotify' };
    case 'twitch':
      return { icon: FaTwitch, color: 'text-purple-500', bgColor: 'bg-purple-500/20', label: 'Twitch' };
    case 'tiktok':
      return { icon: FaTiktok, color: 'text-white', bgColor: 'bg-gray-700', label: 'TikTok' };
    case 'platform_task_completion':
      return { icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', label: 'Platform Task' };
    case 'social_connection_reward':
      return { icon: Sparkles, color: 'text-green-400', bgColor: 'bg-green-400/20', label: 'Social Connection' };
    default:
      return { icon: Coins, color: 'text-brand-primary', bgColor: 'bg-brand-primary/20', label: 'Platform Points' };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function PlatformRewards() {
  // Fetch platform points balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/platform-points/balance'],
    queryFn: async () => {
      const response = await fetchApi('/api/platform-points/balance');
      return response;
    },
  });

  // Fetch platform points transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/platform-points/transactions'],
    queryFn: async () => {
      const response = await fetchApi('/api/platform-points/transactions?limit=20');
      return response;
    },
  });

  const balance = balanceData?.balance || 0;
  const transactions: PointTransaction[] = transactionsData?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Points Balance Card */}
      <Card className="bg-gradient-to-br from-brand-primary/20 via-purple-600/10 to-pink-500/10 backdrop-blur-lg border border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Your Platform Points</p>
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-yellow-400" />
                <span className="text-4xl font-bold text-white">
                  {balanceLoading ? '...' : balance.toLocaleString()}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Earn points by connecting socials, completing tasks, and more!
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400/30 to-orange-500/30 flex items-center justify-center">
                <Star className="h-12 w-12 text-yellow-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Earn Points */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Connect Social Accounts</p>
                  <p className="text-sm text-gray-400">+500 points each</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Connect Twitter, Instagram, Discord, and more to earn points instantly.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Complete Platform Tasks</p>
                  <p className="text-sm text-gray-400">Varies by task</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Complete platform tasks and challenges to earn bonus points.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Rewards - Coming Soon */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-400" />
            Platform Rewards
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">Coming Soon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-brand-primary/30 bg-brand-primary/10">
            <Sparkles className="h-4 w-4 text-brand-primary" />
            <AlertDescription className="text-gray-300">
              Soon you'll be able to redeem your platform points for exclusive rewards, 
              discounts, and special perks. Stay tuned!
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
              <Gift className="h-8 w-8 text-pink-400 mx-auto mb-2" />
              <p className="text-white font-medium">Exclusive Merch</p>
              <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
              <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-white font-medium">Premium Features</p>
              <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
              <Coins className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-medium">Fee Credits</p>
              <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Points Activity */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Recent Points Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No points activity yet</p>
              <p className="text-sm text-gray-500 mt-1">Connect your social accounts to start earning!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => {
                const sourceInfo = getSourceInfo(tx.source, tx.metadata);
                const Icon = sourceInfo.icon;
                return (
                  <div 
                    key={tx.id || index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${sourceInfo.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${sourceInfo.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {tx.metadata?.taskName || sourceInfo.label}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      +{tx.points} pts
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

