import { useState, useEffect } from "react";
import TaskBuilderBase from "./TaskBuilderBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Coins,
  TrendingUp,
  Plus,
  X,
  Info,
  Gift,
  Target,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { TIER_GUIDANCE } from "@shared/taskTemplates";

// Referral tasks are T1 (internal platform verification)
const REFERRAL_TIER = 'T1' as const;
const tierGuidance = TIER_GUIDANCE[REFERRAL_TIER];

interface QualifyingCondition {
  type: 'quest_completion' | 'point_threshold' | 'account_age' | 'revenue_threshold';
  value: string | number;
}

interface ReferralTaskConfig {
  name: string;
  description: string;
  rewardStructure: 'fixed' | 'percentage';
  
  // Fixed rewards
  referrerPoints: number;
  referredPoints: number;
  
  // Percentage rewards
  percentageOfReferred: number;
  
  // Qualifying conditions
  qualifyingConditions: QualifyingCondition[];
  
  // Limits
  maxReferralsPerUser: number | null;
  totalMaxReferrals: number | null;
}

// API expects this structure
interface ReferralTaskAPIPayload {
  taskType: 'referral';
  name: string;
  description: string;
  isDraft: boolean;
  rewardType: 'points';
  pointsToReward: number;
  customSettings: {
    referralTier: 'platform_creator_to_creator' | 'platform_fan_to_fan' | 'campaign_fan_to_fan';
    rewardStructure: 'fixed' | 'percentage' | 'revenue_share';
    referrerPoints?: number;
    referredPoints?: number;
    percentageOfReferred?: number;
    qualifyingConditions?: QualifyingCondition[];
    maxReferralsPerUser?: number | null;
    totalMaxReferrals?: number | null;
  };
}

interface ReferralTaskBuilderProps {
  initialData?: any;
  isEditMode?: boolean;
  onSave?: (config: ReferralTaskAPIPayload) => void;
  onPublish?: (config: ReferralTaskAPIPayload) => void;
  onBack?: () => void;
  programSelector?: React.ReactNode;
}

export default function ReferralTaskBuilder({
  initialData,
  isEditMode,
  onSave,
  onPublish,
  onBack,
  programSelector,
}: ReferralTaskBuilderProps) {
  // Handle both local config format and API format (customSettings)
  const getInitialValue = <T,>(key: keyof ReferralTaskConfig, defaultValue: T): T => {
    if (initialData && key in initialData && initialData[key] !== undefined) {
      return initialData[key] as T;
    }
    const customSettings = (initialData as any)?.customSettings;
    if (customSettings && key in customSettings && customSettings[key] !== undefined) {
      return customSettings[key] as T;
    }
    return defaultValue;
  };

  const [config, setConfig] = useState<ReferralTaskConfig>({
    name: (initialData as any)?.name || "Refer a Friend",
    description: (initialData as any)?.description || "Invite friends to join and earn rewards",
    rewardStructure: getInitialValue('rewardStructure', 'fixed'),
    referrerPoints: getInitialValue('referrerPoints', 100),
    referredPoints: getInitialValue('referredPoints', 50),
    percentageOfReferred: getInitialValue('percentageOfReferred', 10),
    qualifyingConditions: getInitialValue('qualifyingConditions', []),
    maxReferralsPerUser: getInitialValue('maxReferralsPerUser', null),
    totalMaxReferrals: getInitialValue('totalMaxReferrals', null),
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Validate configuration
  useEffect(() => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push("Task name is required");
    }

    if (config.rewardStructure === 'fixed') {
      if (config.referrerPoints <= 0) {
        errors.push("Referrer points must be greater than 0");
      }
      if (config.referredPoints < 0) {
        errors.push("Referred points cannot be negative");
      }
    } else {
      if (config.percentageOfReferred <= 0 || config.percentageOfReferred > 100) {
        errors.push("Percentage must be between 1 and 100");
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [config]);

  const updateConfig = (updates: Partial<ReferralTaskConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addCondition = () => {
    updateConfig({
      qualifyingConditions: [
        ...config.qualifyingConditions,
        { type: 'point_threshold', value: 100 }
      ]
    });
  };

  const updateCondition = (index: number, updates: Partial<QualifyingCondition>) => {
    const newConditions = [...config.qualifyingConditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateConfig({ qualifyingConditions: newConditions });
  };

  const removeCondition = (index: number) => {
    updateConfig({
      qualifyingConditions: config.qualifyingConditions.filter((_, i) => i !== index)
    });
  };

  // Build API payload with proper structure
  const buildAPIPayload = (isDraft: boolean): ReferralTaskAPIPayload => {
    // Derive pointsToReward from referrer points (the primary reward for the person doing the referral)
    const derivedPoints = config.rewardStructure === 'fixed' ? config.referrerPoints : 50;
    
    return {
      taskType: 'referral',
      name: config.name,
      description: config.description,
      isDraft,
      rewardType: 'points' as const,
      pointsToReward: derivedPoints,
      customSettings: {
        referralTier: 'campaign_fan_to_fan', // Default to campaign fan-to-fan referrals
        rewardStructure: config.rewardStructure,
        referrerPoints: config.rewardStructure === 'fixed' ? config.referrerPoints : undefined,
        referredPoints: config.rewardStructure === 'fixed' ? config.referredPoints : undefined,
        percentageOfReferred: config.rewardStructure === 'percentage' ? config.percentageOfReferred : undefined,
        qualifyingConditions: config.qualifyingConditions.length > 0 ? config.qualifyingConditions : undefined,
        maxReferralsPerUser: config.maxReferralsPerUser,
        totalMaxReferrals: config.totalMaxReferrals,
      },
    };
  };

  const handleSaveDraft = () => {
    if (onSave) onSave(buildAPIPayload(true));
  };

  const handlePublish = () => {
    if (isValid && onPublish) onPublish(buildAPIPayload(false));
  };

  // Preview Component
  const previewComponent = (
    <div className="space-y-4">
      <div className="p-4 bg-brand-dark-purple/30 rounded-lg border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold">{config.name}</div>
            <div className="text-xs text-gray-400">{config.description}</div>
          </div>
        </div>

        {config.rewardStructure === 'fixed' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">You earn</span>
              <div className="flex items-center gap-1 text-brand-secondary font-semibold">
                <Coins className="h-4 w-4" />
                {config.referrerPoints} pts
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Friend earns</span>
              <div className="flex items-center gap-1 text-brand-accent font-semibold">
                <Gift className="h-4 w-4" />
                {config.referredPoints} pts
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-center py-2 bg-green-500/10 border border-green-500/20 rounded">
            <TrendingUp className="h-4 w-4 inline mr-1 text-green-400" />
            <span className="text-white font-semibold">{config.percentageOfReferred}%</span>
            <span className="text-gray-400"> of friend's earnings</span>
          </div>
        )}

        {config.qualifyingConditions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-2">Friend must:</div>
            <div className="space-y-1">
              {config.qualifyingConditions.map((condition, index) => (
                <div key={index} className="text-xs text-gray-300 flex items-center gap-2">
                  <Target className="h-3 w-3 text-brand-primary" />
                  {condition.type === 'point_threshold' && `Earn ${condition.value} points`}
                  {condition.type === 'account_age' && `Be active for ${condition.value} days`}
                  {condition.type === 'quest_completion' && `Complete a quest`}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full mt-4 bg-brand-primary hover:bg-brand-primary/90">
          Share Referral Link
        </Button>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Preview of how fans will see this task
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<Users className="h-5 w-5 text-brand-primary" />}
      title="Referral Task"
      description="Reward fans for inviting their friends"
      category="Onboarding"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Referral tasks are one of the most powerful ways to grow your fanbase. Choose between fixed rewards or percentage-based earnings."
      exampleUse="A musician could offer 100 points to fans who refer friends, plus 10% of their friend's future earnings to create ongoing incentive."
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-white">Task Name</Label>
              <Input
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., Refer a Friend"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Input
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="e.g., Invite friends to join and earn rewards"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Tier Guidance */}
        <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="font-medium text-green-400">{tierGuidance.label}</span>
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
              {tierGuidance.trustLevel}
            </Badge>
          </div>
          <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
          <p className="text-sm font-medium text-green-400">{tierGuidance.pointsRange}</p>
          {tierGuidance.tip && (
            <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
          )}
        </div>

        {/* Reward Structure */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Reward Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={config.rewardStructure}
              onValueChange={(value: 'fixed' | 'percentage') => updateConfig({ rewardStructure: value })}
            >
              {/* Fixed Points Option */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                config.rewardStructure === 'fixed'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                  <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      <span className="font-medium text-white">Fixed Points</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      Set specific point amounts for both the referrer and the person they invite
                    </div>

                    {config.rewardStructure === 'fixed' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-sm text-gray-300">Referrer Points</Label>
                          <Input
                            type="number"
                            value={config.referrerPoints}
                            onChange={(e) => updateConfig({ referrerPoints: Number(e.target.value) })}
                            placeholder="100"
                            className="bg-white/5 border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-400 mt-1">Person who shares</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-300">Referred Points</Label>
                          <Input
                            type="number"
                            value={config.referredPoints}
                            onChange={(e) => updateConfig({ referredPoints: Number(e.target.value) })}
                            placeholder="50"
                            className="bg-white/5 border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-400 mt-1">Person who signs up</p>
                        </div>
                      </div>
                    )}
                  </Label>
                </div>
              </div>

              {/* Percentage Option */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                config.rewardStructure === 'percentage'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="percentage" id="percentage" className="mt-1" />
                  <Label htmlFor="percentage" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <span className="font-medium text-white">Percentage of Earnings</span>
                      <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                        Ongoing
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      Referrer earns a percentage of all points the referred user earns in the future
                    </div>

                    {config.rewardStructure === 'percentage' && (
                      <div className="mt-4">
                        <Label className="text-sm text-gray-300 mb-2 block">
                          Referrer Earnings Percentage
                        </Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[config.percentageOfReferred]}
                            onValueChange={(vals) => updateConfig({ percentageOfReferred: vals[0] })}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1 min-w-[80px]">
                            <Input
                              type="number"
                              value={config.percentageOfReferred}
                              onChange={(e) => updateConfig({ percentageOfReferred: Number(e.target.value) })}
                              className="w-16 bg-white/5 border-white/10 text-white"
                              min={1}
                              max={50}
                            />
                            <span className="text-sm text-gray-400">%</span>
                          </div>
                        </div>
                        <Alert className="mt-3 bg-green-500/10 border-green-500/20">
                          <Info className="h-4 w-4 text-green-400" />
                          <AlertDescription className="text-gray-300">
                            Referrer will earn <strong>{config.percentageOfReferred}%</strong> of all points their friend earns
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

        {/* Qualifying Conditions */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Qualifying Conditions
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Requirements the referred user must meet before referrer gets rewarded
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addCondition} className="border-white/20 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {config.qualifyingConditions.length === 0 ? (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-gray-300">
                  No conditions set - referrer gets rewarded immediately when someone signs up
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {config.qualifyingConditions.map((condition, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="shrink-0">
                        {index + 1}
                      </Badge>

                      <Select
                        value={condition.type}
                        onValueChange={(val: any) => updateCondition(index, { type: val })}
                      >
                        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="point_threshold">Reach Points</SelectItem>
                          <SelectItem value="account_age">Account Age (days)</SelectItem>
                          <SelectItem value="quest_completion">Complete Quest</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
                        placeholder={condition.type === 'point_threshold' ? 'Points' : 'Days'}
                        className="w-[120px] bg-white/5 border-white/10 text-white"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(index)}
                        className="ml-auto text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limits */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Referral Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Max Referrals Per User</Label>
                <Input
                  type="number"
                  value={config.maxReferralsPerUser || ''}
                  onChange={(e) => updateConfig({ 
                    maxReferralsPerUser: e.target.value ? Number(e.target.value) : null 
                  })}
                  placeholder="Unlimited"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How many friends each fan can refer
                </p>
              </div>
              <div>
                <Label className="text-white">Total Max Referrals</Label>
                <Input
                  type="number"
                  value={config.totalMaxReferrals || ''}
                  onChange={(e) => updateConfig({ 
                    totalMaxReferrals: e.target.value ? Number(e.target.value) : null 
                  })}
                  placeholder="Unlimited"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Total referrals across all fans
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TaskBuilderBase>
  );
}

