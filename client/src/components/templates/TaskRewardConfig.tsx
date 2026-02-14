import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Coins, TrendingUp, Info, Sparkles, Shield, ShieldCheck, ShieldAlert, Lightbulb } from "lucide-react";
import type { RewardType } from "@shared/taskRuleSchema";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

interface TaskRewardConfigProps {
  rewardType: RewardType;
  pointsToReward?: number;
  pointCurrency?: string;
  multiplierValue?: number;
  verificationTier?: VerificationTier;
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
}

// Get tier icon based on verification tier
function getTierIcon(tier: VerificationTier) {
  switch (tier) {
    case 'T1': return <ShieldCheck className="h-4 w-4 text-green-500" />;
    case 'T2': return <Shield className="h-4 w-4 text-blue-500" />;
    case 'T3': return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
  }
}

export function TaskRewardConfig({
  rewardType,
  pointsToReward = 50,
  pointCurrency = "default",
  multiplierValue = 1.5,
  verificationTier,
  onChange,
  disabled = false
}: TaskRewardConfigProps) {
  // Get tier guidance if available
  const tierGuidance = verificationTier ? TIER_GUIDANCE[verificationTier] : null;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reward Configuration</CardTitle>
            <CardDescription>Choose how fans are rewarded for completing this task</CardDescription>
          </div>
          {tierGuidance && (
            <Badge 
              variant={verificationTier === 'T1' ? 'default' : verificationTier === 'T2' ? 'secondary' : 'outline'}
              className="flex items-center gap-1"
            >
              {getTierIcon(verificationTier!)}
              {tierGuidance.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verification Tier Guidance */}
        {tierGuidance && (
          <div className={`p-4 rounded-lg border ${
            verificationTier === 'T1' ? 'bg-green-500/5 border-green-500/20' :
            verificationTier === 'T2' ? 'bg-blue-500/5 border-blue-500/20' :
            'bg-yellow-500/5 border-yellow-500/20'
          }`}>
            <div className="flex items-start gap-3">
              {getTierIcon(verificationTier!)}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tierGuidance.trustLevel}</span>
                  <span className={`text-sm font-medium ${
                    verificationTier === 'T1' ? 'text-green-600' :
                    verificationTier === 'T2' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {tierGuidance.pointsRange}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{tierGuidance.description}</p>
                {tierGuidance.warning && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ {tierGuidance.warning}
                  </p>
                )}
                {tierGuidance.tip && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{tierGuidance.tip}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Reward Type Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Reward Type</Label>
          <RadioGroup
            value={rewardType}
            onValueChange={(val) => onChange("rewardType", val)}
            disabled={disabled}
            className="space-y-3"
          >
            {/* Points Option */}
            <div
              className={`
                flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${rewardType === "points" 
                  ? "border-yellow-500 bg-yellow-500/10" 
                  : "border-white/20 hover:border-white/40"}
              `}
              onClick={() => !disabled && onChange("rewardType", "points")}
            >
              <RadioGroupItem value="points" id="points" />
              <Label htmlFor="points" className="flex-1 cursor-pointer">
                <div className="font-medium text-lg">Points</div>
                <div className="text-sm text-gray-400">
                  Award a fixed amount of points
                </div>
              </Label>
              <Coins className="h-6 w-6 text-yellow-500" />
            </div>
            
            {/* Multiplier Option */}
            <div
              className={`
                flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${rewardType === "multiplier" 
                  ? "border-green-500 bg-green-500/10" 
                  : "border-white/20 hover:border-white/40"}
              `}
              onClick={() => !disabled && onChange("rewardType", "multiplier")}
            >
              <RadioGroupItem value="multiplier" id="multiplier" />
              <Label htmlFor="multiplier" className="flex-1 cursor-pointer">
                <div className="font-medium text-lg">Multiplier</div>
                <div className="text-sm text-gray-400">
                  Apply a multiplier to future point earnings
                </div>
              </Label>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </RadioGroup>
        </div>
        
        {/* Points Configuration */}
        {rewardType === "points" && (
          <div className="space-y-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <h4 className="font-semibold">Points Configuration</h4>
              </div>
              {tierGuidance && (
                <span className="text-xs text-muted-foreground">
                  Recommended: {tierGuidance.recommendedPoints} pts
                </span>
              )}
            </div>
            
            {/* Points Amount */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="points-amount">Points to Award</Label>
                <span className="text-2xl font-bold text-yellow-500">
                  {pointsToReward?.toLocaleString()}
                </span>
              </div>
              
              {/* Slider for quick adjustment */}
              <Slider
                id="points-slider"
                min={1}
                max={1000}
                step={5}
                value={[pointsToReward || 50]}
                onValueChange={(vals) => onChange("pointsToReward", vals[0])}
                disabled={disabled}
                className="my-4"
              />
              
              {/* Direct input for precise values */}
              <NumberInput
                id="points-amount"
                value={pointsToReward}
                onChange={(val) => onChange("pointsToReward", val || 1)}
                placeholder="e.g., 100"
                min={1}
                max={100000}
                allowEmpty={false}
                disabled={disabled}
              />
              
              <p className="text-xs text-gray-400">
                Fans will receive exactly <strong>{pointsToReward} points</strong> for completing this task
              </p>
              
              {/* Warning for high points on unverifiable tasks */}
              {verificationTier === 'T3' && pointsToReward && pointsToReward > 30 && (
                <Alert className="bg-yellow-500/10 border-yellow-500/30">
                  <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-sm">
                    This task cannot be automatically verified. High point values may encourage abuse. 
                    Consider {tierGuidance?.recommendedPoints || 25} points or less.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Point Currency (for multi-currency systems) */}
            <div className="space-y-2">
              <Label htmlFor="point-currency">Point Currency</Label>
              <Select
                value={pointCurrency}
                onValueChange={(val) => onChange("pointCurrency", val)}
                disabled={disabled}
              >
                <SelectTrigger id="point-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div>
                      <div className="font-medium">Default Points</div>
                      <div className="text-xs text-gray-400">Standard point currency</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="bonus">
                    <div>
                      <div className="font-medium">Bonus Points</div>
                      <div className="text-xs text-gray-400">Special bonus currency</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div>
                      <div className="font-medium">Premium Points</div>
                      <div className="text-xs text-gray-400">Premium tier currency</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Choose which point currency to award (advanced feature)
              </p>
            </div>
          </div>
        )}
        
        {/* Multiplier Configuration */}
        {rewardType === "multiplier" && (
          <div className="space-y-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold">Multiplier Configuration</h4>
            </div>
            
            <Alert className="bg-green-500/10 border-green-500/20">
              <Sparkles className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Multipliers boost ALL future point earnings for the fan. This is more valuable than fixed points!
              </AlertDescription>
            </Alert>
            
            {/* Multiplier Value */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="multiplier-value">Multiplier Value</Label>
                <span className="text-2xl font-bold text-green-500">
                  {multiplierValue?.toFixed(2)}x
                </span>
              </div>
              
              <Select
                value={String(multiplierValue)}
                onValueChange={(val) => onChange("multiplierValue", Number(val))}
                disabled={disabled}
              >
                <SelectTrigger id="multiplier-value">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.1">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>1.1x</span>
                      <span className="text-xs text-gray-400">10% boost</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="1.25">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>1.25x</span>
                      <span className="text-xs text-gray-400">25% boost</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="1.5">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>1.5x</span>
                      <span className="text-xs text-gray-400">50% boost</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>2x</span>
                      <span className="text-xs text-gray-400">Double points</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2.5">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>2.5x</span>
                      <span className="text-xs text-gray-400">2.5x boost</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>3x</span>
                      <span className="text-xs text-gray-400">Triple points</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="5">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>5x</span>
                      <span className="text-xs text-gray-400">5x boost (rare)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <p className="text-xs text-gray-400">
                All future points earned will be multiplied by <strong>{multiplierValue}x</strong>
              </p>
            </div>
            
            {/* Example Calculation */}
            <div className="p-3 bg-white/5 rounded-md space-y-2">
              <p className="text-sm font-medium">Example:</p>
              <div className="text-sm text-gray-300 space-y-1">
                <p>• Fan completes this task → Gets <strong>{multiplierValue}x</strong> multiplier</p>
                <p>• Fan earns 100 points from another task → Gets <strong>{Math.round(100 * (multiplierValue || 1.5))}</strong> points instead</p>
                <p>• Fan earns 50 points from check-in → Gets <strong>{Math.round(50 * (multiplierValue || 1.5))}</strong> points instead</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Reward Summary */}
        <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-lg">
          <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Reward Summary
          </h4>
          <p className="text-sm text-gray-300">
            {rewardType === "points" && (
              <>
                Fans will earn <strong className="text-yellow-500">{pointsToReward} {pointCurrency === "default" ? "points" : `${pointCurrency} points`}</strong> when they complete this task.
              </>
            )}
            {rewardType === "multiplier" && (
              <>
                Fans will receive a <strong className="text-green-500">{multiplierValue}x multiplier</strong> on all future point earnings. This makes future tasks {Math.round((multiplierValue || 1.5 - 1) * 100)}% more valuable!
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

