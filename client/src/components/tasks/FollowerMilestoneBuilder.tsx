import { useState, useEffect } from "react";
import TaskBuilderBase from "./TaskBuilderBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TaskTimingConfig } from "@/components/templates/TaskTimingConfig";
import {
  TrendingUp,
  Plus,
  X,
  Info,
  Target,
  Calendar,
  Award,
  Twitter,
  Instagram,
  Music,
  Youtube,
} from "lucide-react";

interface FollowerMilestone {
  followers: number;
  points: number;
}

interface FollowerMilestoneConfig {
  name: string;
  description: string;
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'spotify';
  milestoneType: 'single' | 'tiered';
  
  // Single milestone
  singleFollowerCount: number;
  singlePoints: number;
  
  // Tiered milestones
  tiers: FollowerMilestone[];
  
  // Timing (always daily for follower checks)
  updateCadence: string;
  rewardFrequency: string;
}

interface FollowerMilestoneBuilderProps {
  initialConfig?: Partial<FollowerMilestoneConfig>;
  onSave?: (config: FollowerMilestoneConfig) => void;
  onPublish?: (config: FollowerMilestoneConfig) => void;
  onBack?: () => void;
}

const PLATFORM_CONFIG = {
  twitter: {
    icon: Twitter,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    label: 'Twitter/X',
    metricName: 'followers',
  },
  instagram: {
    icon: Instagram,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30',
    label: 'Instagram',
    metricName: 'followers',
  },
  tiktok: {
    icon: Music,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    label: 'TikTok',
    metricName: 'followers',
  },
  youtube: {
    icon: Youtube,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    label: 'YouTube',
    metricName: 'subscribers',
  },
  spotify: {
    icon: Music,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    label: 'Spotify',
    metricName: 'followers',
  },
};

export default function FollowerMilestoneBuilder({
  initialConfig,
  onSave,
  onPublish,
  onBack,
}: FollowerMilestoneBuilderProps) {
  const [config, setConfig] = useState<FollowerMilestoneConfig>({
    name: initialConfig?.name || "Follower Milestone",
    description: initialConfig?.description || "Reach follower goals to earn rewards",
    platform: initialConfig?.platform || 'twitter',
    milestoneType: initialConfig?.milestoneType || 'tiered',
    singleFollowerCount: initialConfig?.singleFollowerCount || 1000,
    singlePoints: initialConfig?.singlePoints || 500,
    tiers: initialConfig?.tiers || [
      { followers: 1000, points: 100 },
      { followers: 5000, points: 500 },
      { followers: 10000, points: 1500 },
    ],
    updateCadence: 'daily',
    rewardFrequency: 'one_time',
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Validate configuration
  useEffect(() => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push("Task name is required");
    }

    if (config.milestoneType === 'single') {
      if (config.singleFollowerCount <= 0) {
        errors.push("Follower count must be greater than 0");
      }
      if (config.singlePoints <= 0) {
        errors.push("Points must be greater than 0");
      }
    } else {
      if (config.tiers.length === 0) {
        errors.push("At least one tier is required");
      }
      
      const sortedTiers = [...config.tiers].sort((a, b) => a.followers - b.followers);
      sortedTiers.forEach((tier, index) => {
        if (tier.followers <= 0) {
          errors.push(`Tier ${index + 1}: Follower count must be greater than 0`);
        }
        if (tier.points <= 0) {
          errors.push(`Tier ${index + 1}: Points must be greater than 0`);
        }
      });

      // Check for duplicate follower counts
      const followerCounts = config.tiers.map(t => t.followers);
      const duplicates = followerCounts.filter((item, index) => followerCounts.indexOf(item) !== index);
      if (duplicates.length > 0) {
        errors.push("Duplicate follower counts found. Each tier must have a unique threshold.");
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [config]);

  const updateConfig = (updates: Partial<FollowerMilestoneConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addTier = () => {
    const lastTier = config.tiers[config.tiers.length - 1];
    const nextFollowers = lastTier ? lastTier.followers + 5000 : 1000;
    const nextPoints = lastTier ? lastTier.points + 500 : 100;
    
    updateConfig({
      tiers: [
        ...config.tiers,
        { followers: nextFollowers, points: nextPoints }
      ]
    });
  };

  const updateTier = (index: number, updates: Partial<FollowerMilestone>) => {
    const newTiers = [...config.tiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    updateConfig({ tiers: newTiers });
  };

  const removeTier = (index: number) => {
    updateConfig({
      tiers: config.tiers.filter((_, i) => i !== index)
    });
  };

  const handleSaveDraft = () => {
    if (onSave) onSave(config);
  };

  const handlePublish = () => {
    if (isValid && onPublish) onPublish(config);
  };

  const platformConfig = PLATFORM_CONFIG[config.platform];
  const PlatformIcon = platformConfig.icon;

  // Calculate total possible points
  const totalPossiblePoints = config.milestoneType === 'single'
    ? config.singlePoints
    : config.tiers.reduce((sum, tier) => sum + tier.points, 0);

  // Preview Component
  const previewComponent = (
    <div className="space-y-4">
      <div className="p-4 bg-brand-dark-purple/30 rounded-lg border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full ${platformConfig.bgColor} flex items-center justify-center`}>
            <PlatformIcon className={`h-5 w-5 ${platformConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold">{config.name}</div>
            <div className="text-xs text-gray-400">{config.description}</div>
          </div>
        </div>

        <div className="mb-3">
          <Badge variant="outline" className={`${platformConfig.color} ${platformConfig.borderColor}`}>
            {platformConfig.label}
          </Badge>
        </div>

        {config.milestoneType === 'single' ? (
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-primary" />
                <span className="text-white text-sm">
                  {config.singleFollowerCount.toLocaleString()} {platformConfig.metricName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-brand-secondary font-semibold">
                <Award className="h-4 w-4" />
                {config.singlePoints} pts
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {config.tiers
              .sort((a, b) => a.followers - b.followers)
              .slice(0, 4)
              .map((tier, index) => (
                <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Tier {index + 1}
                      </Badge>
                      <span className="text-gray-300">
                        {tier.followers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-brand-secondary font-semibold">
                      <Award className="h-4 w-4" />
                      {tier.points} pts
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        <Alert className="mt-3 bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-xs text-gray-300">
            Checked daily at midnight UTC
          </AlertDescription>
        </Alert>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Preview of how fans will see this task
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<TrendingUp className="h-5 w-5 text-brand-primary" />}
      title="Follower Milestone Task"
      description="Reward fans for growing your social media presence"
      category="Social Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Follower milestones incentivize fans to help grow your social media presence. Follower counts are automatically checked daily."
      exampleUse="A musician could create tiered rewards: 1K followers (100 pts), 10K followers (1000 pts), 100K followers (10000 pts) to encourage fans to promote their Spotify page."
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Task Name</Label>
              <Input
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., Help Me Reach 10K Followers"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Input
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="e.g., Follow me and help me grow!"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Selection */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Social Media Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(PLATFORM_CONFIG).map(([key, platformInfo]) => {
                const Icon = platformInfo.icon;
                const isSelected = config.platform === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => updateConfig({ platform: key as any })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${platformInfo.borderColor} ${platformInfo.bgColor}`
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${platformInfo.color} mx-auto mb-2`} />
                    <div className="text-white text-sm font-medium">
                      {platformInfo.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Milestone Type */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Milestone Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={config.milestoneType}
              onValueChange={(value: 'single' | 'tiered') => updateConfig({ milestoneType: value })}
            >
              {/* Single Milestone */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                config.milestoneType === 'single'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="single" id="single" className="mt-1" />
                  <Label htmlFor="single" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-brand-primary" />
                      <span className="font-medium text-white">Single Milestone</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      One-time reward when reaching a specific follower count
                    </div>

                    {config.milestoneType === 'single' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-sm text-gray-300">
                            Target {platformConfig.metricName}
                          </Label>
                          <Input
                            type="number"
                            value={config.singleFollowerCount}
                            onChange={(e) => updateConfig({ singleFollowerCount: Number(e.target.value) })}
                            placeholder="1000"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-300">Points to Reward</Label>
                          <Input
                            type="number"
                            value={config.singlePoints}
                            onChange={(e) => updateConfig({ singlePoints: Number(e.target.value) })}
                            placeholder="500"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </Label>
                </div>
              </div>

              {/* Tiered Milestones */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                config.milestoneType === 'tiered'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="tiered" id="tiered" className="mt-1" />
                  <Label htmlFor="tiered" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <span className="font-medium text-white">Tiered Milestones</span>
                      <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                        Recommended
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      Multiple rewards at different follower thresholds
                    </div>

                    {config.milestoneType === 'tiered' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm text-gray-300">Milestone Tiers</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              addTier();
                            }}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tier
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {config.tiers
                            .sort((a, b) => a.followers - b.followers)
                            .map((tier, index) => (
                              <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                <div className="flex items-center gap-4">
                                  <Badge variant="secondary" className="shrink-0 bg-green-500/20 text-green-400 border-green-400">
                                    Tier {index + 1}
                                  </Badge>

                                  <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-gray-300">
                                        {platformConfig.metricName}
                                      </Label>
                                      <Input
                                        type="number"
                                        value={tier.followers}
                                        onChange={(e) => updateTier(index, { 
                                          followers: Number(e.target.value) 
                                        })}
                                        placeholder="1000"
                                        className="bg-white/5 border-white/10 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-300">Points</Label>
                                      <Input
                                        type="number"
                                        value={tier.points}
                                        onChange={(e) => updateTier(index, { 
                                          points: Number(e.target.value) 
                                        })}
                                        placeholder="100"
                                        className="bg-white/5 border-white/10 text-white"
                                      />
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeTier(index);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>

                        <Alert className="mt-3 bg-green-500/10 border-green-500/20">
                          <Info className="h-4 w-4 text-green-400" />
                          <AlertDescription className="text-gray-300">
                            Total possible: <strong>{totalPossiblePoints.toLocaleString()}</strong> points across all tiers
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Timing Info */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timing & Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-500/10 border-blue-500/20 mb-4">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300">
                Follower counts are automatically checked <strong>daily at midnight UTC</strong>. 
                When a milestone is reached, fans are rewarded immediately.
              </AlertDescription>
            </Alert>

            <TaskTimingConfig
              updateCadence={config.updateCadence}
              rewardFrequency={config.rewardFrequency}
              onChange={(timing) => updateConfig(timing)}
              fixedCadence={true}
            />
          </CardContent>
        </Card>
      </div>
    </TaskBuilderBase>
  );
}

