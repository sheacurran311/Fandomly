import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Trophy, Clock, Target, Search, ArrowRight, Zap, Shield } from 'lucide-react';
import { useLocation } from 'wouter';

interface CampaignCard {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  startDate: string;
  endDate?: string;
  tenantId: string;
  creatorId: string;
  bannerImageUrl?: string;
  accentColor?: string;
  campaignMultiplier?: number;
  completionBonusPoints?: number;
  accessCodeEnabled?: boolean;
  enforceSequentialTasks?: boolean;
  totalParticipants?: number;
  creator?: {
    displayName: string;
    imageUrl?: string;
    category: string;
  };
  taskAssignments?: Array<{ id: string; taskId: string }>;
  sponsors?: Array<{ id: string; name: string; logoUrl?: string }>;
  requirements?: {
    requiredNftCollectionIds?: string[];
    requiredBadgeIds?: string[];
  };
}

export default function FanCampaigns() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<CampaignCard[]>({
    queryKey: ['/api/campaigns/active'],
    enabled: isAuthenticated && !!user,
  });

  const filteredCampaigns = campaigns.filter((c) => {
    const name = c.name || c.title || '';
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTimeRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return `${Math.floor(days / 30)} months left`;
    if (days > 0) return `${days} days left`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours left`;
  };

  if (isLoading || campaignsLoading) {
    return (
      <DashboardLayout userType="fan">
        <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
          <div className="text-white">Loading campaigns...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <DashboardLayout userType="fan">
        <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
          <div className="text-white">Please connect your wallet to access campaigns.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-gray-400">
            Join campaigns from your favorite creators and earn amazing rewards.
          </p>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-brand-primary data-[state=active]:text-white text-gray-400"
            >
              All ({filteredCampaigns.length})
            </TabsTrigger>
            <TabsTrigger
              value="ending-soon"
              className="data-[state=active]:bg-brand-primary data-[state=active]:text-white text-gray-400"
            >
              Ending Soon
            </TabsTrigger>
            <TabsTrigger
              value="popular"
              className="data-[state=active]:bg-brand-primary data-[state=active]:text-white text-gray-400"
            >
              Popular
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Campaigns Grid */}
        <div className="space-y-6">
          {filteredCampaigns.length === 0 ? (
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardContent className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Campaigns Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'No campaigns are currently active. Check back later.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(activeTab === 'ending-soon'
                ? [...filteredCampaigns]
                    .filter((c) => c.endDate)
                    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
                : activeTab === 'popular'
                  ? [...filteredCampaigns].sort(
                      (a, b) => (b.totalParticipants || 0) - (a.totalParticipants || 0)
                    )
                  : filteredCampaigns
              ).map((campaign) => {
                const accentColor = campaign.accentColor || '#8B5CF6';
                const taskCount = campaign.taskAssignments?.length || 0;
                const timeLeft = getTimeRemaining(campaign.endDate);
                const hasGating =
                  campaign.accessCodeEnabled ||
                  (campaign.requirements?.requiredNftCollectionIds?.length || 0) > 0 ||
                  (campaign.requirements?.requiredBadgeIds?.length || 0) > 0;
                const multiplier = Number(campaign.campaignMultiplier) || 1;

                return (
                  <Card
                    key={campaign.id}
                    className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all cursor-pointer group overflow-hidden"
                    onClick={() => setLocation(`/fan-dashboard/campaigns/${campaign.id}`)}
                  >
                    {/* Banner */}
                    {campaign.bannerImageUrl ? (
                      <div className="h-32 overflow-hidden">
                        <img
                          src={campaign.bannerImageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-24"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                        }}
                      />
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-1 line-clamp-1">
                            {campaign.name || campaign.title}
                          </CardTitle>
                          <p className="text-sm text-gray-400">
                            by {campaign.creator?.displayName || 'Creator'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {campaign.description && (
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}

                      {/* Sponsor logos */}
                      {campaign.sponsors && campaign.sponsors.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          {campaign.sponsors.slice(0, 3).map((s) => (
                            <div key={s.id} className="flex items-center gap-1">
                              {s.logoUrl ? (
                                <img
                                  src={s.logoUrl}
                                  alt={s.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-brand-primary/30 flex items-center justify-center text-[10px] text-white font-bold">
                                  {s.name[0]}
                                </div>
                              )}
                            </div>
                          ))}
                          {campaign.sponsors.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{campaign.sponsors.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {taskCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs border-white/20 text-gray-300"
                          >
                            <Target className="h-3 w-3 mr-1" /> {taskCount} tasks
                          </Badge>
                        )}
                        {multiplier > 1 && (
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            <Zap className="h-3 w-3 mr-1" /> {multiplier}x
                          </Badge>
                        )}
                        {hasGating && (
                          <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                            <Shield className="h-3 w-3 mr-1" /> Gated
                          </Badge>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {timeLeft ? (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeLeft}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Ongoing</span>
                        )}
                        <Button
                          size="sm"
                          className="text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
