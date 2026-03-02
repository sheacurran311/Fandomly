import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Filter,
  Heart,
  Star,
  MoreVertical,
  UserPlus,
  MessageCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';

/**
 * Fan tier point thresholds (cumulative points required for each tier).
 * TODO: These should eventually be pulled from the loyalty program configuration via the API
 * so creators can customize tier thresholds per program.
 */
const TIER_THRESHOLDS = {
  platinum: 10_000,
  gold: 5_000,
  silver: 1_000,
} as const;

interface Fan {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  totalPoints: number;
  tier: string;
  lastActive: string;
  campaigns: number;
  username?: string;
}

export default function CreatorFans() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Get creator's tenant to fetch fans
  const { data: creator } = useQuery({
    queryKey: ['/api/creators/user', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/creators/user/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch real fan data from fan_programs (which has correct points data)
  const {
    data: fans = [],
    isLoading: fansLoading,
    error: fansError,
  } = useQuery<Fan[]>({
    queryKey: ['/api/creator-fans', creator?.id, user?.id],
    queryFn: async (): Promise<Fan[]> => {
      if (!creator?.id) return [];

      // Get creator's loyalty programs
      const programsResponse = await apiRequest(
        'GET',
        `/api/loyalty-programs/creator/${creator.id}`
      );
      const programs = await programsResponse.json();

      if (programs.length === 0) return [];

      // Fetch fans from each program's fan_programs
      const allFans: Map<string, Fan> = new Map();

      for (const program of programs) {
        try {
          const fansResponse = await apiRequest('GET', `/api/fan-programs/program/${program.id}`);
          const fanPrograms = await fansResponse.json();

          for (const fanProgram of fanPrograms) {
            // Skip the creator's own account
            if (fanProgram.fanId === user?.id || fanProgram.fanId === creator.userId) {
              continue;
            }

            const existingFan = allFans.get(fanProgram.fanId);
            if (existingFan) {
              // Accumulate points across programs
              existingFan.totalPoints += fanProgram.totalPointsEarned || 0;
            } else {
              // Calculate tier based on total points
              const points = fanProgram.totalPointsEarned || 0;
              let tier = 'Bronze';
              if (points >= TIER_THRESHOLDS.platinum) tier = 'Platinum';
              else if (points >= TIER_THRESHOLDS.gold) tier = 'Gold';
              else if (points >= TIER_THRESHOLDS.silver) tier = 'Silver';

              allFans.set(fanProgram.fanId, {
                id: fanProgram.fanId,
                name: fanProgram.fullName || fanProgram.username || fanProgram.email || 'Fan',
                email: fanProgram.email || 'No email',
                joinDate: new Date(fanProgram.joinedAt).toLocaleDateString(),
                totalPoints: points,
                tier: fanProgram.currentTier || tier,
                lastActive: fanProgram.joinedAt
                  ? getRelativeTime(new Date(fanProgram.joinedAt))
                  : 'Unknown',
                campaigns: 0, // Will be calculated below
                username: fanProgram.username,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch fans for program ${program.id}:`, error);
        }
      }

      // Get task completion counts as a proxy for campaign participation
      for (const program of programs) {
        try {
          const completionsResponse = await apiRequest(
            'GET',
            `/api/task-completions/program/${program.id}`
          );
          const completions = await completionsResponse.json();

          // Count completions per fan
          const fanCompletionCounts: { [fanId: string]: number } = {};
          completions.forEach((c: Record<string, unknown>) => {
            if (c.userId && (c.status === 'completed' || c.status === 'claimed')) {
              fanCompletionCounts[c.userId as string] =
                (fanCompletionCounts[c.userId as string] || 0) + 1;
            }
          });

          // Update fan campaign counts (using completion count as proxy)
          Object.entries(fanCompletionCounts).forEach(([fanId, count]) => {
            const fan = allFans.get(fanId);
            if (fan) {
              fan.campaigns += count;
            }
          });
        } catch (error) {
          console.warn(`Failed to get completions for program ${program.id}:`, error);
        }
      }

      return Array.from(allFans.values());
    },
    enabled: !!creator?.id && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to get relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  // Filter fans based on search term
  const filteredFans = fans.filter(
    (fan) =>
      fan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fan.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fan.username && fan.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-purple-500/20 text-purple-400';
      case 'Gold':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Silver':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-green-500/20 text-green-400';
    }
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Users className="mr-3 h-8 w-8 text-brand-primary" />
            Fan Management
          </h1>
          <p className="text-gray-400">
            Manage your fan community and track engagement across campaigns.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Fandomly Followers</p>
                  <p className="text-2xl font-bold text-white">{fans.length.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-brand-primary" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-400">Total Fandomly platform followers</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Fans</p>
                  <p className="text-2xl font-bold text-white">
                    {fans.filter((fan) => fan.totalPoints > 0).length.toLocaleString()}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-red-400" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-400">
                  {fans.length > 0
                    ? Math.round(
                        (fans.filter((fan) => fan.totalPoints > 0).length / fans.length) * 100
                      )
                    : 0}
                  % engagement rate
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Top Tier Fans</p>
                  <p className="text-2xl font-bold text-white">
                    {fans.filter((fan) => fan.tier === 'Platinum' || fan.tier === 'Gold').length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-400">Platinum & Gold members</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Points</p>
                  <p className="text-2xl font-bold text-white">
                    {fans.reduce((sum, fan) => sum + fan.totalPoints, 0).toLocaleString()}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-brand-secondary" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-400">Points distributed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fan Management */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Fan Community</span>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search fans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white w-64"
                  />
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fansLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-300/20 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300/20 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-300/20 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : fansError ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">Failed to load fans</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : filteredFans.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">
                    {searchTerm ? 'No fans found matching your search' : 'No fans have joined yet'}
                  </p>
                  <Button variant="outline" className="border-brand-primary/30 text-brand-primary">
                    Share Your Profile
                  </Button>
                </div>
              ) : (
                filteredFans.map((fan) => (
                  <div key={fan.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">{fan.name[0]}</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{fan.name}</h4>
                          <p className="text-sm text-gray-400">{fan.email}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">Joined {fan.joinDate}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              Last active {fan.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            {fan.totalPoints.toLocaleString()} pts
                          </p>
                          <Badge className={getTierColor(fan.tier)}>{fan.tier}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{fan.campaigns} campaigns</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
