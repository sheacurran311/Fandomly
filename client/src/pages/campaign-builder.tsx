import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { type User, type Creator } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, Clock, Users, Target, Gift, Zap, 
  TrendingUp, Heart, Share2, Trophy, Star, Coins,
  ArrowLeft, ArrowRight, Check, Plus, X, Settings,
  Facebook, Instagram, Twitter, Youtube, Music, MessageCircle
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

// Multi-step Campaign Creation Modal Component
function CreateCampaignModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    // Step 1: Basics
    name: "",
    description: "",
    type: [] as string[], // Points, Raffle, NFT, Badge (can be combined)
    startDate: "",
    endDate: "",
    
    // Step 2: Social Platforms
    platforms: {
      facebook: false,
      instagram: false,
      twitter: false,
      tiktok: false,
      youtube: false,
      spotify: false,
      appleMusic: false,
      discord: false,
      telegram: false
    },
    
    // Step 3: Tasks Configuration
    tasks: {} as Record<string, any[]>,
    
    // Step 4: Rewards & Points
    rewardStructure: {
      campaignReward: { type: "", value: 0 },
      taskRewards: true, // If false, only campaign reward applies
      defaultPoints: 50
    },
    
    // Step 5: Requirements & Hierarchy
    requirements: {
      allTasksRequired: true,
      prerequisiteCampaigns: [] as string[]
    }
  });

  const steps = [
    { id: 1, title: "Campaign Basics", icon: Target },
    { id: 2, title: "Social Platforms", icon: Share2 },
    { id: 3, title: "Tasks Configuration", icon: Settings },
    { id: 4, title: "Rewards & Points", icon: Gift },
    { id: 5, title: "Requirements", icon: Trophy },
    { id: 6, title: "Review & Launch", icon: Check }
  ];

  const platformIcons = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    tiktok: Music,
    youtube: Youtube,
    spotify: Music,
    appleMusic: Music,
    discord: MessageCircle,
    telegram: MessageCircle
  };

  const taskTypes = [
    { id: 'follow', name: 'Follow/Like/Subscribe', platforms: ['facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'spotify'] },
    { id: 'playlist', name: 'Follow Playlist', platforms: ['spotify'] },
    { id: 'album', name: 'Add Album', platforms: ['appleMusic'] },
    { id: 'join', name: 'Join Server/Group', platforms: ['discord', 'telegram'] },
    { id: 'like_post', name: 'Like Specific Post', platforms: ['facebook', 'instagram', 'twitter', 'tiktok'] },
    { id: 'repost', name: 'Repost/Retweet', platforms: ['facebook', 'instagram', 'twitter', 'tiktok'] },
    { id: 'hashtag_post', name: 'Post with Hashtag', platforms: ['twitter', 'instagram', 'tiktok'] },
    { id: 'referral', name: 'Referral (1 point each)', platforms: ['all'] }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const updateCampaignData = (path: string, value: any) => {
    setCampaignData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newData;
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="campaign-name" className="text-white">Campaign Name</Label>
              <Input
                id="campaign-name"
                data-testid="input-campaign-name"
                placeholder="e.g., Fan Season 1, Shea's OG Fan Campaign, Winter Fan-Time"
                value={campaignData.name}
                onChange={(e) => updateCampaignData('name', e.target.value)}
                className="mt-2 bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="campaign-description" className="text-white">Description</Label>
              <Textarea
                id="campaign-description"
                data-testid="input-campaign-description"
                placeholder="Describe your campaign goals and what fans can expect..."
                value={campaignData.description}
                onChange={(e) => updateCampaignData('description', e.target.value)}
                className="mt-2 bg-white/10 border-white/20 text-white"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-white">Campaign Types (select multiple)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Points', 'Raffle', 'NFT', 'Badge'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Switch
                      data-testid={`switch-type-${type.toLowerCase()}`}
                      checked={campaignData.type.includes(type)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked 
                          ? [...campaignData.type, type]
                          : campaignData.type.filter(t => t !== type);
                        updateCampaignData('type', newTypes);
                      }}
                    />
                    <Label className="text-gray-300">{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-white">Start Date & Time</Label>
                <Input
                  id="start-date"
                  data-testid="input-start-date"
                  type="datetime-local"
                  value={campaignData.startDate}
                  onChange={(e) => updateCampaignData('startDate', e.target.value)}
                  className="mt-2 bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-white">End Date & Time</Label>
                <Input
                  id="end-date"
                  data-testid="input-end-date"
                  type="datetime-local"
                  value={campaignData.endDate}
                  onChange={(e) => updateCampaignData('endDate', e.target.value)}
                  className="mt-2 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Select Social Platforms</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(platformIcons).map(([platform, Icon]) => {
                  const isSelected = campaignData.platforms[platform as keyof typeof campaignData.platforms];
                  return (
                    <div
                      key={platform}
                      data-testid={`platform-${platform}`}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-brand-primary/20 border-brand-primary' 
                          : 'bg-white/5 border-white/20 hover:border-white/40'
                      }`}
                      onClick={() => updateCampaignData(`platforms.${platform}`, !isSelected)}
                    >
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-brand-primary' : 'text-gray-400'}`} />
                      <p className={`text-center text-sm capitalize ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {platform === 'appleMusic' ? 'Apple Music' : platform}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Configure Tasks</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {taskTypes.map((taskType) => {
                const applicablePlatforms = Object.keys(campaignData.platforms)
                  .filter(p => campaignData.platforms[p as keyof typeof campaignData.platforms])
                  .filter(p => taskType.platforms.includes(p) || taskType.platforms.includes('all'));
                
                if (applicablePlatforms.length === 0) return null;

                return (
                  <Card key={taskType.id} className="bg-white/5 border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg">{taskType.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {applicablePlatforms.map((platform) => {
                          const isEnabled = campaignData.tasks[platform]?.some((t: any) => t.type === taskType.id);
                          const taskData = campaignData.tasks[platform]?.find((t: any) => t.type === taskType.id);
                          
                          return (
                            <div key={`${taskType.id}-${platform}`} className="border border-white/10 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    data-testid={`task-${taskType.id}-${platform}`}
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      const currentTasks = campaignData.tasks[platform] || [];
                                      const newTasks = checked
                                        ? [...currentTasks, { 
                                            type: taskType.id, 
                                            platform,
                                            taskType: taskType.id,
                                            rewardValue: campaignData.rewardStructure.defaultPoints,
                                            rewardType: 'points',
                                            targetUrl: '',
                                            hashtags: [],
                                            inviteCode: '',
                                            customInstructions: ''
                                          }]
                                        : currentTasks.filter((t: any) => t.type !== taskType.id);
                                      updateCampaignData(`tasks.${platform}`, newTasks);
                                    }}
                                  />
                                  <span className="text-gray-300 capitalize font-medium">{platform}</span>
                                </div>
                                {isEnabled && (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      data-testid={`input-task-points-${taskType.id}-${platform}`}
                                      type="number"
                                      placeholder="Points"
                                      value={taskData?.rewardValue || campaignData.rewardStructure.defaultPoints}
                                      className="w-20 bg-white/10 border-white/20 text-white text-sm"
                                      onChange={(e) => {
                                        const tasks = campaignData.tasks[platform] || [];
                                        const updatedTasks = tasks.map((t: any) =>
                                          t.type === taskType.id ? { ...t, rewardValue: parseInt(e.target.value) || 0 } : t
                                        );
                                        updateCampaignData(`tasks.${platform}`, updatedTasks);
                                      }}
                                    />
                                    <Select
                                      value={taskData?.rewardType || 'points'}
                                      onValueChange={(value) => {
                                        const tasks = campaignData.tasks[platform] || [];
                                        const updatedTasks = tasks.map((t: any) =>
                                          t.type === taskType.id ? { ...t, rewardType: value } : t
                                        );
                                        updateCampaignData(`tasks.${platform}`, updatedTasks);
                                      }}
                                    >
                                      <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="points">Points</SelectItem>
                                        <SelectItem value="raffle">Raffle</SelectItem>
                                        <SelectItem value="nft">NFT</SelectItem>
                                        <SelectItem value="badge">Badge</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              
                              {isEnabled && (
                                <div className="space-y-3 border-t border-white/10 pt-3">
                                  {/* URL field for applicable task types */}
                                  {(['like_post', 'repost', 'playlist', 'album'].includes(taskType.id)) && (
                                    <div>
                                      <Label className="text-gray-300 text-sm">
                                        {taskType.id === 'playlist' ? 'Playlist URL' : 
                                         taskType.id === 'album' ? 'Album URL' : 'Post/Content URL'}
                                      </Label>
                                      <Input
                                        data-testid={`input-task-url-${taskType.id}-${platform}`}
                                        placeholder={`Enter ${taskType.id === 'playlist' ? 'playlist' : taskType.id === 'album' ? 'album' : 'post'} URL...`}
                                        value={taskData?.targetUrl || ''}
                                        className="mt-1 bg-white/10 border-white/20 text-white text-sm"
                                        onChange={(e) => {
                                          const tasks = campaignData.tasks[platform] || [];
                                          const updatedTasks = tasks.map((t: any) =>
                                            t.type === taskType.id ? { ...t, targetUrl: e.target.value } : t
                                          );
                                          updateCampaignData(`tasks.${platform}`, updatedTasks);
                                        }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Hashtags field for hashtag_post tasks */}
                                  {taskType.id === 'hashtag_post' && (
                                    <div>
                                      <Label className="text-gray-300 text-sm">Required Hashtags</Label>
                                      <Input
                                        data-testid={`input-task-hashtags-${taskType.id}-${platform}`}
                                        placeholder="Enter hashtags separated by commas: #fanseason1, #loyalty"
                                        value={(taskData?.hashtags || []).join(', ')}
                                        className="mt-1 bg-white/10 border-white/20 text-white text-sm"
                                        onChange={(e) => {
                                          const hashtags = e.target.value.split(',').map(h => h.trim()).filter(Boolean);
                                          const tasks = campaignData.tasks[platform] || [];
                                          const updatedTasks = tasks.map((t: any) =>
                                            t.type === taskType.id ? { ...t, hashtags } : t
                                          );
                                          updateCampaignData(`tasks.${platform}`, updatedTasks);
                                        }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Invite code for Discord/Telegram */}
                                  {taskType.id === 'join' && ['discord', 'telegram'].includes(platform) && (
                                    <div>
                                      <Label className="text-gray-300 text-sm">
                                        {platform === 'discord' ? 'Discord Server Invite' : 'Telegram Group Link'}
                                      </Label>
                                      <Input
                                        data-testid={`input-task-invite-${taskType.id}-${platform}`}
                                        placeholder={platform === 'discord' ? 'discord.gg/invitation' : 't.me/groupname'}
                                        value={taskData?.inviteCode || ''}
                                        className="mt-1 bg-white/10 border-white/20 text-white text-sm"
                                        onChange={(e) => {
                                          const tasks = campaignData.tasks[platform] || [];
                                          const updatedTasks = tasks.map((t: any) =>
                                            t.type === taskType.id ? { ...t, inviteCode: e.target.value } : t
                                          );
                                          updateCampaignData(`tasks.${platform}`, updatedTasks);
                                        }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Custom instructions */}
                                  <div>
                                    <Label className="text-gray-300 text-sm">Additional Instructions (Optional)</Label>
                                    <Textarea
                                      data-testid={`input-task-instructions-${taskType.id}-${platform}`}
                                      placeholder="Any special instructions for fans completing this task..."
                                      value={taskData?.customInstructions || ''}
                                      className="mt-1 bg-white/10 border-white/20 text-white text-sm"
                                      rows={2}
                                      onChange={(e) => {
                                        const tasks = campaignData.tasks[platform] || [];
                                        const updatedTasks = tasks.map((t: any) =>
                                          t.type === taskType.id ? { ...t, customInstructions: e.target.value } : t
                                        );
                                        updateCampaignData(`tasks.${platform}`, updatedTasks);
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Rewards & Points Structure</h3>
            
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Reward Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Task-based Rewards</Label>
                    <p className="text-sm text-gray-400">Give points for individual task completion</p>
                  </div>
                  <Switch
                    data-testid="switch-task-rewards"
                    checked={campaignData.rewardStructure.taskRewards}
                    onCheckedChange={(checked) => updateCampaignData('rewardStructure.taskRewards', checked)}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div>
                  <Label className="text-white">Campaign Completion Reward</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Select
                      value={campaignData.rewardStructure.campaignReward.type}
                      onValueChange={(value) => updateCampaignData('rewardStructure.campaignReward.type', value)}
                    >
                      <SelectTrigger data-testid="select-campaign-reward-type" className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Reward Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="raffle">Raffle Tickets</SelectItem>
                        <SelectItem value="nft">NFT</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      data-testid="input-campaign-reward-value"
                      type="number"
                      placeholder="Amount/Value"
                      value={campaignData.rewardStructure.campaignReward.value}
                      onChange={(e) => updateCampaignData('rewardStructure.campaignReward.value', parseInt(e.target.value) || 0)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Campaign Requirements</h3>
            
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Completion Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">All Tasks Required</Label>
                    <p className="text-sm text-gray-400">Fans must complete ALL tasks to be eligible for rewards</p>
                  </div>
                  <Switch
                    data-testid="switch-all-tasks-required"
                    checked={campaignData.requirements.allTasksRequired}
                    onCheckedChange={(checked) => updateCampaignData('requirements.allTasksRequired', checked)}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div>
                  <Label className="text-white">Prerequisite Campaigns</Label>
                  <p className="text-sm text-gray-400 mb-2">Campaigns that must be completed before this one</p>
                  <Input
                    data-testid="input-prerequisite-campaigns"
                    placeholder="e.g., Fan Season 1, Welcome Campaign"
                    className="bg-white/10 border-white/20 text-white"
                    onChange={(e) => {
                      const campaigns = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateCampaignData('requirements.prerequisiteCampaigns', campaigns);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Review & Launch</h3>
            
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="text-white font-medium">{campaignData.name || 'Untitled Campaign'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Types:</span>
                    <p className="text-white font-medium">{campaignData.type.join(', ') || 'Points'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Platforms:</span>
                    <p className="text-white font-medium">
                      {Object.entries(campaignData.platforms)
                        .filter(([_, enabled]) => enabled)
                        .map(([platform]) => platform)
                        .join(', ') || 'None selected'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Tasks:</span>
                    <p className="text-white font-medium">
                      {Object.values(campaignData.tasks).flat().length}
                    </p>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-200 text-sm">
                    <strong>Ready to launch:</strong> Your campaign will be created and made available to your fans immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] bg-brand-dark-bg border-white/20 overflow-hidden flex flex-col px-6 py-0">
        <DialogHeader className="pt-6 pb-4">
          <DialogTitle className="text-white text-2xl">Create New Campaign</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive 
                    ? 'bg-brand-primary border-brand-primary text-white' 
                    : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto mb-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between py-4 border-t border-white/10 bg-brand-dark-bg">
          <Button
            data-testid="button-prev-step"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-3">
            {currentStep < 6 ? (
              <Button
                data-testid="button-next-step"
                onClick={nextStep}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                data-testid="button-launch-campaign"
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  try {
                    // Convert tasks data to the format expected by the API
                    const socialTasks: any[] = [];
                    Object.entries(campaignData.tasks).forEach(([platform, tasks]) => {
                      (tasks as any[]).forEach((task, index) => {
                        socialTasks.push({
                          platform,
                          taskType: task.type,
                          targetUrl: task.targetUrl || null,
                          hashtags: task.hashtags || [],
                          inviteCode: task.inviteCode || null,
                          customInstructions: task.customInstructions || null,
                          rewardType: task.rewardType || 'points',
                          rewardValue: task.rewardValue || campaignData.rewardStructure.defaultPoints,
                          displayOrder: index + 1
                        });
                      });
                    });

                    // Prepare campaign data
                    const enhancedCampaignData = {
                      ...campaignData,
                      startDate: campaignData.startDate || new Date().toISOString(),
                      endDate: campaignData.endDate || null
                    };

                    // Call the enhanced campaign creation API
                    const response = await apiRequest("POST", "/api/campaigns/enhanced", {
                      campaignData: enhancedCampaignData,
                      socialTasks
                    });

                    if (response.ok) {
                      const result = await response.json();
                      console.log('Campaign created successfully:', result);
                      
                      // Invalidate campaigns cache to refresh the list
                      if (user?.creator?.id) {
                        await queryClient.invalidateQueries({ 
                          queryKey: ["/api/campaigns/creator", user.creator.id] 
                        });
                      }
                      
                      // Show success message and close modal
                      alert(`🎉 Campaign "${campaignData.name}" created successfully with ${socialTasks.length} tasks!`);
                      onClose();
                    } else {
                      throw new Error('Failed to create campaign');
                    }
                  } catch (error) {
                    console.error('Campaign creation failed:', error);
                    alert('Failed to create campaign. Please check your data and try again.');
                  }
                }}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Launch Campaign
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export the modal component separately for use in other pages
export function CampaignBuilderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <CreateCampaignModal isOpen={isOpen} onClose={onClose} />
  );
}

export default function CampaignBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
              data-testid="button-create-custom-campaign"
              variant="outline" 
              className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
              onClick={() => setShowCreateModal(true)}
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

        {/* Create Campaign Modal */}
        <CreateCampaignModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
      </div>
    </div>
  );
}