import { useState, useEffect } from "react";
import { type Task } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { type User, type Creator, type LoyaltyProgram } from "@shared/schema";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar, Clock, Users, Target, Gift, Zap, 
  TrendingUp, Heart, Share2, Trophy, Star, Coins,
  ArrowLeft, ArrowRight, Check, Plus, X, Settings,
  Facebook, Instagram, Twitter, Youtube, Music, MessageCircle,
  AlertCircle, Wallet
} from "lucide-react";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";
import { useLocation } from "wouter";

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
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    // Step 1: Basics
    name: "",
    description: "",
    type: "campaign", // Simplified: all campaigns are just "campaigns"
    startDate: "",
    endDate: "",
    isIndefinite: false, // Sprint 6: No end date

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
      campaignReward: { type: "points", value: 0 },
      taskRewards: true, // If false, only campaign reward applies
      defaultPoints: 50
    },

    // Step 5: Requirements & Hierarchy (Sprint 6 Enhanced)
    requirements: {
      allTasksRequired: true,
      prerequisiteCampaigns: [] as string[],
      requiresPaidSubscription: false,
      requiredSubscriberTier: "",
      requiredNftCollectionIds: [] as string[],
      requiredBadgeIds: [] as string[]
    },

    // Step 6: Task Dependencies (Sprint 6)
    taskDependencies: [] as Array<{
      taskId: string;
      dependsOn: string[];
      isOptional?: boolean;
    }>,
    requiredTaskIds: [] as string[] // Specific tasks required (overrides allTasksRequired)
  });

  // Authentication guard - show connect wallet prompt if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connect Your Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">
                Authentication Required
              </h3>
              <p className="text-gray-300">
                You need to connect your wallet to create campaigns and manage your loyalty programs.
              </p>
              <div className="pt-4">
                <ConnectWalletButton 
                  className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-xl"
                  data-testid="button-connect-wallet-campaign"
                >
                  Connect Wallet to Continue
                </ConnectWalletButton>
              </div>
              <p className="text-xs text-gray-400">
                Secure wallet connection powered by Dynamic
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-gray-300 mt-4">Checking authentication...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const steps = [
    { id: 1, title: "Campaign Basics", icon: Target },
    { id: 2, title: "Social Platforms", icon: Share2 },
    { id: 3, title: "Rewards & Points", icon: Gift },
    { id: 4, title: "Requirements", icon: Trophy },
    { id: 5, title: "Task Dependencies", icon: Settings },
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
    { id: 'spotify_playlist', name: 'Follow Playlist', platforms: ['spotify'] },
    { id: 'spotify_album', name: 'Add Album', platforms: ['spotify'] },
    { id: 'discord_join', name: 'Join Server/Group', platforms: ['discord'] },
    { id: 'like_post', name: 'Like Specific Post', platforms: ['facebook', 'instagram', 'twitter', 'tiktok'] },
    { id: 'repost', name: 'Repost/Retweet', platforms: ['facebook', 'instagram', 'twitter', 'tiktok'] },
    { id: 'twitter_hashtag_post', name: 'Post with Hashtag', platforms: ['twitter', 'instagram', 'tiktok'] },
    { id: 'referral', name: 'Referral (1 point each)', platforms: ['all'] }
  ];

  // Error display component
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <div className="flex items-center space-x-2 text-red-400 text-sm mt-1">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  };

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation functions for each step
  const validateStep = (step: number): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basics
        if (!campaignData.name.trim()) {
          errors.name = "Campaign name is required";
        }
        if (!campaignData.description.trim()) {
          errors.description = "Campaign description is required";
        }
        if (!campaignData.startDate.trim()) {
          errors.startDate = "Campaign start date is required";
        }
        if (!campaignData.isIndefinite && !campaignData.endDate.trim()) {
          errors.endDate = "Campaign end date is required (or enable indefinite campaign)";
        }
        if (!campaignData.isIndefinite && campaignData.startDate && campaignData.endDate && new Date(campaignData.startDate) >= new Date(campaignData.endDate)) {
          errors.endDate = "End date must be after start date";
        }
        break;

      case 2: // Platforms
        const selectedPlatforms = Object.values(campaignData.platforms).filter(Boolean);
        if (selectedPlatforms.length === 0) {
          errors.platforms = "At least one platform must be selected";
        }
        break;

      case 3: // Rewards
        if (!campaignData.rewardStructure.defaultPoints || campaignData.rewardStructure.defaultPoints <= 0) {
          errors.defaultPoints = "Default points must be greater than 0";
        }
        break;

      case 4: // Requirements
        // Requirements are optional, but we could add validation here if needed
        break;
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    setValidationErrors(validation.errors);

    if (validation.isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  const prevStep = () => {
    setValidationErrors({}); // Clear errors when going back
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

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
              <ErrorMessage error={validationErrors.name} />
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
              <ErrorMessage error={validationErrors.description} />
            </div>

            <div>
              <Label className="text-white">Campaign Type</Label>
              <div className="mt-2 p-3 bg-white/10 border border-white/20 rounded-md">
                <p className="text-white">Points-Based Campaign</p>
                <p className="text-sm text-gray-400">Fans earn points by completing tasks, then convert points to rewards</p>
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
                <ErrorMessage error={validationErrors.startDate} />
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
                  disabled={campaignData.isIndefinite}
                />
                <ErrorMessage error={validationErrors.endDate} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/10 border border-white/20 rounded-lg">
              <div>
                <Label className="text-white">Indefinite Campaign</Label>
                <p className="text-sm text-gray-400">Campaign runs continuously with no end date</p>
              </div>
              <Switch
                data-testid="switch-indefinite-campaign"
                checked={campaignData.isIndefinite}
                onCheckedChange={(checked) => {
                  updateCampaignData('isIndefinite', checked);
                  if (checked) {
                    updateCampaignData('endDate', '');
                  }
                }}
              />
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
              <ErrorMessage error={validationErrors.platforms} />
            </div>
          </div>
        );

      case 3:
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
                  <Label className="text-white">Campaign Completion Bonus</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white">
                      Points
                    </div>
                    <Input
                      data-testid="input-campaign-reward-value"
                      type="number"
                      placeholder="Bonus Points"
                      value={campaignData.rewardStructure.campaignReward.value}
                      onChange={(e) => updateCampaignData('rewardStructure.campaignReward.value', parseInt(e.target.value) || 0)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <ErrorMessage error={validationErrors.defaultPoints} />
          </div>
        );

      case 4:
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

            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Subscriber Requirements (Sprint 6)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Requires Paid Subscription</Label>
                    <p className="text-sm text-gray-400">Only paid subscribers can participate</p>
                  </div>
                  <Switch
                    data-testid="switch-requires-paid-subscription"
                    checked={campaignData.requirements.requiresPaidSubscription}
                    onCheckedChange={(checked) => updateCampaignData('requirements.requiresPaidSubscription', checked)}
                  />
                </div>

                {campaignData.requirements.requiresPaidSubscription && (
                  <>
                    <Separator className="bg-white/20" />
                    <div>
                      <Label className="text-white">Required Subscriber Tier (Optional)</Label>
                      <Input
                        data-testid="input-required-subscriber-tier"
                        placeholder="e.g., premium, vip, platinum"
                        value={campaignData.requirements.requiredSubscriberTier}
                        onChange={(e) => updateCampaignData('requirements.requiredSubscriberTier', e.target.value)}
                        className="mt-2 bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to allow any paid subscription tier</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">NFT & Badge Requirements (Sprint 6)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Required NFT Collections</Label>
                  <p className="text-sm text-gray-400 mb-2">Fans must own NFTs from these collections</p>
                  <Input
                    data-testid="input-required-nft-collections"
                    placeholder="Collection IDs (comma-separated)"
                    className="bg-white/10 border-white/20 text-white"
                    onChange={(e) => {
                      const collections = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateCampaignData('requirements.requiredNftCollectionIds', collections);
                    }}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div>
                  <Label className="text-white">Required Badges</Label>
                  <p className="text-sm text-gray-400 mb-2">Fans must have earned these badges</p>
                  <Input
                    data-testid="input-required-badges"
                    placeholder="Badge IDs (comma-separated)"
                    className="bg-white/10 border-white/20 text-white"
                    onChange={(e) => {
                      const badges = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateCampaignData('requirements.requiredBadgeIds', badges);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Task Dependencies (Sprint 6)</h3>

            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Task Completion Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Specific Required Tasks</Label>
                  <p className="text-sm text-gray-400 mb-2">
                    Override "All Tasks Required" by specifying exactly which tasks must be completed
                  </p>
                  <Input
                    data-testid="input-required-tasks"
                    placeholder="Task IDs (comma-separated, leave empty to require all tasks)"
                    className="bg-white/10 border-white/20 text-white"
                    onChange={(e) => {
                      const tasks = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateCampaignData('requiredTaskIds', tasks);
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {campaignData.requiredTaskIds.length > 0
                      ? `${campaignData.requiredTaskIds.length} specific task(s) required`
                      : campaignData.requirements.allTasksRequired
                        ? "All tasks required by default"
                        : "No specific tasks required"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Task Dependencies</CardTitle>
                <p className="text-sm text-gray-400">Define the order in which tasks must be completed</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-200 text-sm flex items-start gap-2">
                    <Settings className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Task dependencies will be configured after assigning tasks to this campaign.
                      This advanced feature allows you to create task sequences where certain tasks
                      must be completed before others become available.
                    </span>
                  </p>
                </div>

                <div className="text-center py-6 text-gray-400">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Task dependency configuration available after campaign creation</p>
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
                    <span className="text-gray-400">Type:</span>
                    <p className="text-white font-medium">Points-Based Campaign</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <p className="text-white font-medium">
                      {campaignData.isIndefinite ? 'Indefinite' : `${campaignData.startDate || 'Not set'} → ${campaignData.endDate || 'Not set'}`}
                    </p>
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
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2 text-sm">
                  <h4 className="text-white font-semibold">Sprint 6 Requirements:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      {campaignData.requirements.allTasksRequired ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">All Tasks Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaignData.requirements.requiresPaidSubscription ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">Paid Subscription</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaignData.requirements.prerequisiteCampaigns.length > 0 ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">
                        {campaignData.requirements.prerequisiteCampaigns.length > 0
                          ? `${campaignData.requirements.prerequisiteCampaigns.length} Prerequisite(s)`
                          : 'No Prerequisites'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaignData.requirements.requiredNftCollectionIds.length > 0 ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">
                        {campaignData.requirements.requiredNftCollectionIds.length > 0
                          ? `${campaignData.requirements.requiredNftCollectionIds.length} Required NFT(s)`
                          : 'No NFT Requirements'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaignData.requirements.requiredBadgeIds.length > 0 ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">
                        {campaignData.requirements.requiredBadgeIds.length > 0
                          ? `${campaignData.requirements.requiredBadgeIds.length} Required Badge(s)`
                          : 'No Badge Requirements'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaignData.requiredTaskIds.length > 0 ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-300">
                        {campaignData.requiredTaskIds.length > 0
                          ? `${campaignData.requiredTaskIds.length} Specific Task(s)`
                          : 'No Specific Tasks'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <strong>Campaign Setup:</strong> Your campaign will be created in "Pending Tasks" status. Assign tasks from the Tasks page before publishing to fans.
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
                disabled={!validateStep(currentStep).isValid}
                className="bg-brand-primary hover:bg-brand-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                data-testid="button-create-campaign"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  try {
                    // Prepare Sprint 6 enhanced campaign data
                    const sprint6CampaignData = {
                      name: campaignData.name,
                      description: campaignData.description,
                      startDate: campaignData.startDate || new Date().toISOString(),
                      endDate: campaignData.isIndefinite ? null : (campaignData.endDate || null),
                      status: 'pending_tasks',
                      platforms: campaignData.platforms,
                      rewardStructure: campaignData.rewardStructure,

                      // Sprint 6: Advanced Requirements
                      allTasksRequired: campaignData.requirements.allTasksRequired,
                      prerequisiteCampaigns: campaignData.requirements.prerequisiteCampaigns,
                      requiresPaidSubscription: campaignData.requirements.requiresPaidSubscription,
                      requiredSubscriberTier: campaignData.requirements.requiredSubscriberTier || null,
                      requiredNftCollectionIds: campaignData.requirements.requiredNftCollectionIds,
                      requiredBadgeIds: campaignData.requirements.requiredBadgeIds,
                      requiredTaskIds: campaignData.requiredTaskIds,
                      taskDependencies: campaignData.taskDependencies,

                      creatorId: user?.id
                    };

                    // Call campaign creation API with Sprint 6 fields
                    const response = await apiRequest("POST", "/api/campaigns", sprint6CampaignData);

                    if (response.ok) {
                      const result = await response.json();
                      console.log('Sprint 6 Campaign created successfully:', result);

                      // Invalidate campaigns cache to refresh the list
                      if (user?.creator?.id) {
                        await queryClient.invalidateQueries({
                          queryKey: ["/api/campaigns/creator", user.creator.id]
                        });
                      }

                      // Show success message and close modal
                      alert(`🎉 Campaign "${campaignData.name}" created successfully with Sprint 6 features! Assign tasks from the Tasks page before publishing.`);
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
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
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
  
  // Task assignment modal state
  const [showTaskAssignModal, setShowTaskAssignModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const { user: userData } = useAuth();
  const { data: creator } = useQuery<Creator>({ queryKey: ["/api/creators/user", userData?.id], enabled: !!userData?.id });

  const [followX, setFollowX] = useState(false);
  const [followInstagram, setFollowInstagram] = useState(false);
  const [followFacebook, setFollowFacebook] = useState(false);
  const [likePost, setLikePost] = useState(false);
  const [retweet, setRetweet] = useState(false);
  const [points, setPoints] = useState(50);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [, setLocation] = useLocation();

  // Fetch programs for the creator
  const { data: programsData, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/programs"],
    enabled: !!userData?.id,
  });
  const programs: LoyaltyProgram[] = Array.isArray(programsData) ? programsData : [];

  // Auto-select most recently created program
  useEffect(() => {
    if (programs.length > 0 && !selectedProgramId) {
      // Sort by createdAt DESC and select the most recent
      const sortedPrograms = [...programs].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSelectedProgramId(sortedPrograms[0].id);
    }
  }, [programs, selectedProgramId]);

  // Fetch available tasks for assignment
  const { data: availableTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks', userData?.id],
    queryFn: async (): Promise<Task[]> => {
      const response = await apiRequest('GET', '/api/tasks');
      return response.json();
    },
    enabled: !!userData?.id && showTaskAssignModal,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!creator) throw new Error("Creator profile not found");
      
      // REQUIRED: All campaigns must belong to a program
      if (!selectedProgramId) {
        throw new Error("All campaigns must be associated with a program. Please select a program.");
      }
      
      const now = new Date().toISOString();
      const newCampaignRes = await apiRequest("POST", "/api/campaigns", {
        tenantId: creator.tenantId,
        creatorId: creator.id,
        programId: selectedProgramId, // Required
        name: "Social Engagement",
        description: "Earn points for social actions",
        campaignType: "direct",
        trigger: "custom_event",
        startDate: now,
        status: "pending_tasks", // Use new workflow: Create -> Assign Tasks -> Publish
      });
      const campaign = await newCampaignRes.json();

      // Store selected social actions for task assignment
      const selectedActions = [];
      if (followX) selectedActions.push('Follow on X');
      if (followInstagram) selectedActions.push('Follow on Instagram');  
      if (followFacebook) selectedActions.push('Follow on Facebook');
      if (likePost) selectedActions.push('Like Post');
      if (retweet) selectedActions.push('Retweet');

      console.log(`🎯 Quick Social Campaign created! Selected actions: ${selectedActions.join(', ')}. Points: ${points} each. Assign tasks from the Tasks page to publish.`);
      
      return campaign;
    },
    onSuccess: (campaign) => {
      // Show success message with guidance
      const selectedActions = [];
      if (followX) selectedActions.push('Follow on X');
      if (followInstagram) selectedActions.push('Follow on Instagram');  
      if (followFacebook) selectedActions.push('Follow on Facebook');
      if (likePost) selectedActions.push('Like Post');
      if (retweet) selectedActions.push('Retweet');

      // Show task assignment modal for bidirectional workflow  
      setCreatedCampaignId(campaign.id);
      setShowTaskAssignModal(true);
      
      // Invalidate campaigns cache to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      
      // Reset form
      setFollowX(false);
      setFollowInstagram(false);
      setFollowFacebook(false);
      setLikePost(false);
      setRetweet(false);
    },
  });

  // Task assignment mutation for bidirectional workflow
  const assignTasksMutation = useMutation({
    mutationFn: async ({ campaignId, taskIds }: { campaignId: string; taskIds: string[] }) => {
      // Assign each selected task to the campaign
      const assignments = await Promise.all(
        taskIds.map(taskId => 
          apiRequest(`/api/tasks/${taskId}/assign`, 'POST', { campaignId }).then(r => r.json())
        )
      );
      return assignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', userData?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/pending'] });
    },
  });

  // Publish campaign mutation for bidirectional workflow
  const publishCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest(`/api/campaigns/${campaignId}/publish`, 'POST');
      return response.json();
    },
    onSuccess: () => {
      setShowTaskAssignModal(false);
      setCreatedCampaignId(null);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/pending'] });
    },
  });

  // Check if creator has any programs - required for creating campaigns
  if (!programsLoading && programs.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark-bg p-6">
        <div className="max-w-2xl mx-auto mt-12">
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500 text-lg font-semibold mb-2">
              Program Required
            </AlertTitle>
            <AlertDescription className="text-gray-300 mb-4">
              You must create a loyalty program before adding campaigns. Campaigns are always associated with a program to help organize your fan engagement strategy.
            </AlertDescription>
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={() => setLocation("/creator-dashboard/program-builder")}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                Create Program
              </Button>
              <Button 
                onClick={() => setLocation("/creator-dashboard/campaigns")}
                variant="outline"
              >
                Back to Campaigns
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

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
              {/* Program Selector */}
              <div>
                <Label className="text-white mb-2 block">Select Program <span className="text-red-400">*</span></Label>
                <Select value={selectedProgramId} onValueChange={(value) => setSelectedProgramId(value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a program (required)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {programs.map((program: any) => (
                      <SelectItem key={program.id} value={program.id} className="text-white hover:bg-white/10">
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  All campaigns must be associated with a loyalty program
                </p>
              </div>

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

        {/* Task Assignment Modal for Bidirectional Workflow */}
        <Dialog open={showTaskAssignModal} onOpenChange={setShowTaskAssignModal}>
          <DialogContent className="w-[95vw] max-w-4xl bg-brand-dark-bg border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Assign Tasks & Publish Campaign</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-4">
                  Select tasks to assign to your campaign. You need at least 1 task to publish.
                </p>
                
                {tasksLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading available tasks...</p>
                  </div>
                ) : availableTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">No tasks available</p>
                    <p className="text-gray-400 text-sm">Create tasks first, then assign them to campaigns</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {availableTasks.map((task) => (
                      <Card 
                        key={task.id}
                        className={`cursor-pointer transition-all border ${
                          selectedTaskIds.includes(task.id) 
                            ? 'bg-brand-primary/20 border-brand-primary' 
                            : 'bg-white/10 border-white/20 hover:border-brand-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedTaskIds(prev => 
                            prev.includes(task.id)
                              ? prev.filter(id => id !== task.id)
                              : [...prev, task.id]
                          );
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-medium">{task.name}</h3>
                              <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Type: {task.taskType}</span>
                                <span>Completions: {task.totalCompletions || 0}</span>
                                <span className={`px-2 py-1 rounded ${task.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                  {task.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            {selectedTaskIds.includes(task.id) && (
                              <Check className="h-5 w-5 text-brand-primary flex-shrink-0 ml-3" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400">
                  {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
                  {selectedTaskIds.length >= 1 && (
                    <span className="text-green-400 ml-2">✓ Ready to publish</span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTaskAssignModal(false)}
                    className="border-white/20 text-white"
                  >
                    Skip for Now
                  </Button>
                  
                  {selectedTaskIds.length > 0 && (
                    <>
                      <Button
                        onClick={async () => {
                          if (createdCampaignId) {
                            await assignTasksMutation.mutateAsync({
                              campaignId: createdCampaignId,
                              taskIds: selectedTaskIds
                            });
                            alert(`✅ ${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''} assigned successfully!`);
                          }
                        }}
                        disabled={assignTasksMutation.isPending}
                        className="bg-brand-secondary hover:bg-brand-secondary/80"
                      >
                        {assignTasksMutation.isPending ? 'Assigning...' : `Assign ${selectedTaskIds.length} Task${selectedTaskIds.length !== 1 ? 's' : ''}`}
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          if (createdCampaignId) {
                            // First assign tasks, then publish
                            await assignTasksMutation.mutateAsync({
                              campaignId: createdCampaignId,
                              taskIds: selectedTaskIds
                            });
                            await publishCampaignMutation.mutateAsync(createdCampaignId);
                          }
                        }}
                        disabled={assignTasksMutation.isPending || publishCampaignMutation.isPending}
                        className="bg-brand-primary hover:bg-brand-primary/80"
                      >
                        {assignTasksMutation.isPending || publishCampaignMutation.isPending 
                          ? 'Publishing...' 
                          : 'Assign & Publish Campaign'
                        }
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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