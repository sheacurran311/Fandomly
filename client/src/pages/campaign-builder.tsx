import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { apiRequest } from "@/lib/queryClient";
import { type User, type Creator } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, Users, Target, Gift, Zap, 
  TrendingUp, Heart, Share2, Trophy, Star, Coins
} from "lucide-react";

// OpenLoyalty-style Campaign Templates
const campaignTemplates = [
  {
    id: "welcome-bonus",
    name: "Welcome Bonus",
    description: "Reward new fans for joining your loyalty program",
    category: "Direct",
    trigger: "internal_event", 
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    estimatedEngagement: "High",
    setup: {
      trigger: "Member Registration",
      condition: "New member signup",
      effect: "Award 100 welcome points",
      audience: "All new members"
    }
  },
  {
    id: "social-follow",
    name: "Social Media Follow",
    description: "Points for following on Instagram, TikTok, Twitter",
    category: "Direct",
    trigger: "custom_event",
    icon: Share2,
    color: "from-blue-500 to-cyan-500", 
    estimatedEngagement: "Very High",
    setup: {
      trigger: "Social Media Follow",
      condition: "Follow on any platform",
      effect: "Award 50 points per platform",
      audience: "All members"
    }
  },
  {
    id: "birthday-reward",
    name: "Birthday Celebration",
    description: "Special birthday rewards for your biggest fans",
    category: "Automation",
    trigger: "birthday",
    icon: Gift,
    color: "from-purple-500 to-indigo-500",
    estimatedEngagement: "High",
    setup: {
      trigger: "Member Birthday",
      condition: "Birthday month",
      effect: "Exclusive birthday reward + 200 bonus points",
      audience: "All members"
    }
  },
  {
    id: "purchase-points",
    name: "Purchase Rewards",
    description: "Earn points for every dollar spent on merchandise",
    category: "Direct",
    trigger: "purchase_transaction",
    icon: Coins,
    color: "from-yellow-500 to-orange-500",
    estimatedEngagement: "High",
    setup: {
      trigger: "Purchase Transaction",
      condition: "Any merchandise purchase",
      effect: "1 point per $1 spent",
      audience: "All members"
    }
  },
  {
    id: "tier-upgrade",
    name: "VIP Tier Rewards",
    description: "Exclusive perks when fans reach VIP status",
    category: "Direct", 
    trigger: "internal_event",
    icon: Trophy,
    color: "from-amber-500 to-yellow-600",
    estimatedEngagement: "Medium",
    setup: {
      trigger: "Tier Upgrade",
      condition: "Reach VIP tier",
      effect: "Exclusive VIP welcome package",
      audience: "VIP tier members"
    }
  },
  {
    id: "referral-program",
    name: "Friend Referral",
    description: "Reward both referrer and friend for successful referrals",
    category: "Referral",
    trigger: "internal_event",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    estimatedEngagement: "High",
    setup: {
      trigger: "Successful Referral",
      condition: "Friend joins and makes first purchase",
      effect: "500 points for referrer, 200 points for friend",
      audience: "All members"
    }
  }
];

const categoryColors = {
  "Direct": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Automation": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", 
  "Referral": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
};

export default function CampaignBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { user: dynamicUser } = useDynamicContext();
  const { data: userData } = useQuery<User>({ queryKey: ["/api/auth/user", dynamicUser?.userId], enabled: !!dynamicUser?.userId });
  const { data: creator } = useQuery<Creator>({ queryKey: ["/api/creators/user", userData?.id], enabled: !!userData?.id });

  const [followX, setFollowX] = useState(false);
  const [followInstagram, setFollowInstagram] = useState(false);
  const [followFacebook, setFollowFacebook] = useState(false);
  const [likePost, setLikePost] = useState(false);
  const [retweet, setRetweet] = useState(false);
  const [points, setPoints] = useState(50);

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!creator) throw new Error("Creator profile not found");
      const now = new Date().toISOString();
      const newCampaignRes = await apiRequest("POST", "/api/campaigns", {
        tenantId: creator.tenantId,
        creatorId: creator.id,
        name: "Social Engagement",
        description: "Earn points for social actions",
        campaignType: "direct",
        trigger: "custom_event",
        startDate: now,
        status: "active",
      });
      const campaign = await newCampaignRes.json();

      const effects: any[] = [];
      const add = (type: string) => effects.push({ type: 'add_units', value: points, notificationTemplate: type });
      if (followX) add('follow_x');
      if (followInstagram) add('follow_instagram');
      if (followFacebook) add('follow_facebook');
      if (likePost) add('like_post');
      if (retweet) add('retweet');

      if (effects.length > 0) {
        await apiRequest("POST", "/api/campaign-rules", {
          campaignId: campaign.id,
          ruleOrder: 1,
          conditions: [],
          effects,
        });
      }
      return campaign;
    },
  });

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Campaign Builder
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl">
            Create OpenLoyalty-style campaigns to engage your fans and grow your community. 
            Choose from proven templates or build custom campaigns with triggers, conditions, and effects.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Active Campaigns</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <Zap className="h-8 w-8 text-brand-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Total Participants</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <Users className="h-8 w-8 text-brand-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Points Issued</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <Star className="h-8 w-8 text-brand-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Engagement Rate</p>
                  <p className="text-2xl font-bold text-white">0%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Social Campaign */}
        <div className="mb-10">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Quick Social Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button variant={followX ? 'default' : 'outline'} onClick={() => setFollowX(v => !v)} className={followX ? 'bg-brand-primary' : 'border-white/20 text-white'}>
                  Follow on X
                </Button>
                <Button variant={followInstagram ? 'default' : 'outline'} onClick={() => setFollowInstagram(v => !v)} className={followInstagram ? 'bg-brand-primary' : 'border-white/20 text-white'}>
                  Follow on Instagram
                </Button>
                <Button variant={followFacebook ? 'default' : 'outline'} onClick={() => setFollowFacebook(v => !v)} className={followFacebook ? 'bg-brand-primary' : 'border-white/20 text-white'}>
                  Follow on Facebook
                </Button>
                <Button variant={likePost ? 'default' : 'outline'} onClick={() => setLikePost(v => !v)} className={likePost ? 'bg-brand-primary' : 'border-white/20 text-white'}>
                  Like Post
                </Button>
                <Button variant={retweet ? 'default' : 'outline'} onClick={() => setRetweet(v => !v)} className={retweet ? 'bg-brand-primary' : 'border-white/20 text-white'}>
                  Retweet
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">Points per action</span>
                <input type="number" className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} />
                <Button className="ml-auto bg-brand-primary" disabled={createCampaign.isPending} onClick={() => createCampaign.mutate()}>
                  {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Templates */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Campaign Templates</h2>
            <Button 
              variant="outline" 
              className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
            >
              Create Custom Campaign
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaignTemplates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    isSelected 
                      ? "bg-white/20 border-brand-primary shadow-xl" 
                      : "bg-white/10 border-white/20 hover:border-brand-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge className={categoryColors[template.category as keyof typeof categoryColors]}>
                        {template.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-xl">{template.name}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">{template.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Trigger:</span>
                        <span className="text-gray-200">{template.setup.trigger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Effect:</span>
                        <span className="text-gray-200">{template.setup.effect}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Engagement:</span>
                        <Badge variant="secondary" className="text-xs">
                          {template.estimatedEngagement}
                        </Badge>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full gradient-primary text-[#101636] font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to campaign setup with this template
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Campaign Features */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-6 w-6 text-brand-primary" />
                Advanced Targeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-primary rounded-full" />
                  <span className="text-gray-300">Tier-based campaigns (Basic, VIP, Premium)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                  <span className="text-gray-300">Custom audience segments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-accent rounded-full" />
                  <span className="text-gray-300">Purchase history targeting</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Social engagement filters</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-6 w-6 text-brand-secondary" />
                Smart Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-primary rounded-full" />
                  <span className="text-gray-300">Time-based triggers (daily, weekly, monthly)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                  <span className="text-gray-300">Event-driven campaigns</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-accent rounded-full" />
                  <span className="text-gray-300">Follow-up campaign sequences</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Budget and limit controls</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}