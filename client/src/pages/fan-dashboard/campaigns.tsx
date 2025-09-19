import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FacebookSDKManager } from "@/lib/facebook";
import { 
  Trophy, 
  Clock, 
  Target, 
  Search,
  Filter,
  Star,
  Users,
  Calendar,
  ArrowRight,
  Facebook,
  Twitter,
  Instagram,
  Heart,
  Share2,
  MessageCircle,
  UserPlus
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaignType: string;
  status: string;
  startDate: string;
  endDate?: string;
  tenantId: string;
  creatorId: string;
  creator?: {
    displayName: string;
    imageUrl?: string;
    category: string;
  };
  rules?: Array<{
    effects: Array<{
      type: string;
      value: number;
      notificationTemplate: string;
    }>;
  }>;
}

export default function FanCampaigns() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns/active'],
    enabled: isAuthenticated && !!user,
  });

  // Campaign participation mutation
  const participateMutation = useMutation({
    mutationFn: async ({ campaignId, actionType, metadata }: {
      campaignId: string;
      actionType: string;
      metadata?: any;
    }) => {
      const response = await apiRequest("POST", "/api/campaigns/participate", {
        campaignId,
        actionType,
        metadata
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "🎉 Points Earned!",
        description: `${data.message} You earned ${data.pointsEarned} points!`,
      });
      // Invalidate relevant queries to refresh points
      queryClient.invalidateQueries({ queryKey: ['/api/fan-programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: "Could not complete this action. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSocialAction = async (campaignId: string, actionType: string) => {
    try {
      let metadata = {};
      
      if (actionType.includes('facebook')) {
        // Use Facebook SDK for Facebook actions
        await FacebookSDKManager.ensureFBReady('fan');
        const status = await FacebookSDKManager.getLoginStatus();
        
        if (!status.isLoggedIn) {
          toast({
            title: "Facebook Connection Required",
            description: "Please connect your Facebook account first.",
            variant: "destructive"
          });
          return;
        }
        
        metadata = { platform: 'facebook', timestamp: new Date().toISOString() };
      }

      // Submit campaign participation
      await participateMutation.mutateAsync({
        campaignId,
        actionType,
        metadata
      });
    } catch (error) {
      console.error('Social action error:', error);
    }
  };

  const getSocialActionButton = (campaign: Campaign) => {
    if (!campaign.rules || campaign.rules.length === 0) {
      return (
        <Button 
          className="w-full bg-brand-primary hover:bg-brand-primary/80"
          onClick={() => handleSocialAction(campaign.id, 'general_participation')}
          disabled={participateMutation.isPending}
        >
          Join Campaign
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      );
    }

    const effects = campaign.rules[0]?.effects || [];
    
    return (
      <div className="space-y-2">
        {effects.map((effect, index) => {
          const actionType = effect.notificationTemplate;
          let icon, text, bgColor;
          
          switch(actionType) {
            case 'follow_facebook':
              icon = <Facebook className="h-4 w-4" />;
              text = 'Follow on Facebook';
              bgColor = 'bg-blue-600 hover:bg-blue-700';
              break;
            case 'follow_instagram':
              icon = <Instagram className="h-4 w-4" />;
              text = 'Follow on Instagram';
              bgColor = 'bg-pink-600 hover:bg-pink-700';
              break;
            case 'follow_x':
              icon = <Twitter className="h-4 w-4" />;
              text = 'Follow on X';
              bgColor = 'bg-gray-800 hover:bg-gray-900';
              break;
            case 'like_post':
              icon = <Heart className="h-4 w-4" />;
              text = 'Like Post';
              bgColor = 'bg-red-600 hover:bg-red-700';
              break;
            case 'share_post':
              icon = <Share2 className="h-4 w-4" />;
              text = 'Share Post';
              bgColor = 'bg-green-600 hover:bg-green-700';
              break;
            case 'comment_post':
              icon = <MessageCircle className="h-4 w-4" />;
              text = 'Comment on Post';
              bgColor = 'bg-purple-600 hover:bg-purple-700';
              break;
            default:
              icon = <UserPlus className="h-4 w-4" />;
              text = `${effect.value} pts`;
              bgColor = 'bg-brand-primary hover:bg-brand-primary/80';
          }
          
          return (
            <Button
              key={index}
              className={`w-full ${bgColor} text-white`}
              onClick={() => handleSocialAction(campaign.id, actionType)}
              disabled={participateMutation.isPending}
              data-testid={`button-${actionType}-${campaign.id}`}
            >
              {icon}
              <span className="ml-2">{text} (+{effect.value} pts)</span>
            </Button>
          );
        })}
      </div>
    );
  };

  if (isLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading campaigns...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access campaigns.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
            <p className="text-gray-400">
              Join campaigns from your favorite creators and earn amazing rewards.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Campaigns Grid */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Available Campaigns ({campaigns.length})</h2>
            
            {campaigns.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Campaigns</h3>
                  <p className="text-gray-400 mb-6">
                    No campaigns are currently active. Check back later for new opportunities to earn rewards.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {campaigns.map((campaign: Campaign) => (
                  <Card key={campaign.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-1">{campaign.title}</CardTitle>
                          <p className="text-sm text-gray-400">
                            by {campaign.creator?.displayName || 'Creator'}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-brand-primary/30 text-brand-primary">
                          {campaign.creator?.category || 'General'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 mb-4">{campaign.description}</p>
                      
                      <div className="space-y-4">
                        {campaign.rules && campaign.rules.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-brand-secondary" />
                            <span className="text-brand-secondary font-medium">
                              Up to {Math.max(...campaign.rules[0]?.effects?.map(e => e.value) || [0])} points per action
                            </span>
                          </div>
                        )}
                        
                        {getSocialActionButton(campaign)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}