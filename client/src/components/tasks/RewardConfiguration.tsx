/**
 * Reward Configuration Component
 * Snag-inspired reward and timing configuration for tasks
 * 
 * Features:
 * - Reward type selector (Points vs Multiplier)
 * - Update cadence selector (Immediate, Daily, Weekly, Monthly)
 * - Reward frequency selector (One-time, Daily, Weekly, Monthly)
 * - Smart defaults based on task type
 * - Verification tier guidance for transparent point recommendations
 * - Validation and help text
 */

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, Shield, ShieldCheck, ShieldAlert, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

export type RewardType = 'points' | 'multiplier';
export type UpdateCadence = 'immediate' | 'daily' | 'weekly' | 'monthly';
export type RewardFrequency = 'one_time' | 'daily' | 'weekly' | 'monthly';

interface RewardConfigurationProps {
  // Reward Type
  rewardType: RewardType;
  onRewardTypeChange: (value: RewardType) => void;
  
  // Points Reward Configuration
  pointsToReward?: number;
  onPointsToRewardChange?: (value: number) => void;
  pointCurrency?: string;
  onPointCurrencyChange?: (value: string) => void;
  
  // Multiplier Reward Configuration
  multiplierValue?: number;
  onMultiplierValueChange?: (value: number) => void;
  currenciesToApply?: string[];
  onCurrenciesToApplyChange?: (value: string[]) => void;
  applyToExistingBalance?: boolean;
  onApplyToExistingBalanceChange?: (value: boolean) => void;
  
  // Timing Configuration
  updateCadence: UpdateCadence;
  onUpdateCadenceChange: (value: UpdateCadence) => void;
  rewardFrequency: RewardFrequency;
  onRewardFrequencyChange: (value: RewardFrequency) => void;
  
  // Task Type Info (for smart defaults and validation)
  taskType?: string;
  platform?: string;
  
  // Verification tier for guidance display
  verificationTier?: VerificationTier;
  
  // Available currencies
  availableCurrencies?: Array<{ value: string; label: string }>;
  
  // Locked fields (some task types have fixed cadence/frequency)
  lockCadence?: boolean;
  lockFrequency?: boolean;
  
  // Validation
  errors?: string[];
}

// Task types that should default to non-immediate cadence
const DELAYED_VERIFICATION_TASKS = [
  'twitter_follow',
  'instagram_follow',
  'tiktok_follow',
  'youtube_subscribe',
  'twitch_follow',
  'spotify_follow',
];

// Task types that should be one-time only
const ONE_TIME_ONLY_TASKS = [
  'complete_profile',
  'referral',
  'quiz',
  'poll',
];

// Get tier icon based on verification tier
function getTierIcon(tier: VerificationTier) {
  switch (tier) {
    case 'T1': return <ShieldCheck className="h-4 w-4" />;
    case 'T2': return <Shield className="h-4 w-4" />;
    case 'T3': return <ShieldAlert className="h-4 w-4" />;
  }
}

// Get tier badge color
function getTierBadgeVariant(tier: VerificationTier): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case 'T1': return 'default';
    case 'T2': return 'secondary';
    case 'T3': return 'outline';
  }
}

export function RewardConfiguration({
  rewardType,
  onRewardTypeChange,
  pointsToReward = 50,
  onPointsToRewardChange,
  pointCurrency = 'default',
  onPointCurrencyChange,
  multiplierValue = 1.5,
  onMultiplierValueChange,
  currenciesToApply = [],
  onCurrenciesToApplyChange,
  applyToExistingBalance = false,
  onApplyToExistingBalanceChange,
  updateCadence,
  onUpdateCadenceChange,
  rewardFrequency,
  onRewardFrequencyChange,
  taskType,
  platform,
  verificationTier,
  availableCurrencies = [
    { value: 'default', label: 'Default Points' },
    { value: 'premium', label: 'Premium Points' },
  ],
  lockCadence = false,
  lockFrequency = false,
  errors = [],
}: RewardConfigurationProps) {
  
  // Determine if this task type typically needs delayed verification
  const isDelayedVerificationTask = taskType && DELAYED_VERIFICATION_TASKS.includes(taskType);
  const isOneTimeOnlyTask = taskType && ONE_TIME_ONLY_TASKS.includes(taskType);
  
  // Get tier guidance if available
  const tierGuidance = verificationTier ? TIER_GUIDANCE[verificationTier] : null;
  
  return (
    <div className="space-y-6">
      {/* VERIFICATION TIER GUIDANCE */}
      {tierGuidance && (
        <Card className={
          verificationTier === 'T1' ? 'border-green-500/50 bg-green-500/5' :
          verificationTier === 'T2' ? 'border-blue-500/50 bg-blue-500/5' :
          'border-yellow-500/50 bg-yellow-500/5'
        }>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {getTierIcon(verificationTier!)}
              <span>Verification: {tierGuidance.label}</span>
              <Badge variant={getTierBadgeVariant(verificationTier!)} className="ml-auto">
                {tierGuidance.trustLevel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tierGuidance.description}
            </p>
            
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className={
                verificationTier === 'T1' ? 'text-green-600 dark:text-green-400' :
                verificationTier === 'T2' ? 'text-blue-600 dark:text-blue-400' :
                'text-yellow-600 dark:text-yellow-400'
              }>
                {tierGuidance.pointsRange}
              </span>
            </div>
            
            {tierGuidance.warning && (
              <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/30">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  {tierGuidance.warning}
                </AlertDescription>
              </Alert>
            )}
            
            {tierGuidance.tip && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-white/5 p-2 rounded">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{tierGuidance.tip}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* REWARD TYPE SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Reward Configuration
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reward Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="rewardType">Type of Reward *</Label>
            <Select value={rewardType} onValueChange={onRewardTypeChange}>
              <SelectTrigger id="rewardType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="multiplier">Multiplier</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose between <strong>Points</strong> (fixed reward) or <strong>Multiplier</strong> (amplify future earnings).
            </p>
          </div>

          {/* Points Reward Configuration */}
          {rewardType === 'points' && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pointsToReward">Points to Reward *</Label>
                  {tierGuidance && (
                    <span className="text-xs text-muted-foreground">
                      Recommended: {tierGuidance.recommendedPoints} points
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <NumberInput
                    id="pointsToReward"
                    value={pointsToReward}
                    onChange={(v) => onPointsToRewardChange?.(v ?? 0)}
                    min={1}
                    max={10000}
                    className="flex-1"
                  />
                  <Select value={pointCurrency} onValueChange={onPointCurrencyChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fans will receive exactly <strong>{pointsToReward} points</strong> for completing this task.
                  {tierGuidance && verificationTier === 'T3' && pointsToReward > 30 && (
                    <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                      ⚠️ This task cannot be verified. Consider using lower points to discourage abuse.
                    </span>
                  )}
                </p>
              </div>
            </>
          )}

          {/* Multiplier Reward Configuration */}
          {rewardType === 'multiplier' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="multiplierValue">Multiplier Value *</Label>
                <NumberInput
                  id="multiplierValue"
                  value={multiplierValue}
                  onChange={(v) => onMultiplierValueChange?.(v ?? 1)}
                  min={1.01}
                  max={10.0}
                  step={0.1}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the multiplier value applied to future rewards. Must be greater than 1.0 (e.g., 1.5 = 50% boost).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Currencies to Apply</Label>
                <Select
                  value={currenciesToApply[0] || 'all'}
                  onValueChange={(value) => onCurrenciesToApplyChange?.(value === 'all' ? [] : [value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Point Types</SelectItem>
                    {availableCurrencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select which point types the multiplier will affect.
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex-1">
                  <Label htmlFor="applyToExistingBalance">Apply multiplier to user's existing balance</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable this to retroactively increase the user's existing point balance based on the set multiplier.
                  </p>
                </div>
                <Switch
                  id="applyToExistingBalance"
                  checked={applyToExistingBalance}
                  onCheckedChange={onApplyToExistingBalanceChange}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* TIMING CONFIGURATION SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Timing Configuration
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Update Cadence */}
          <div className="space-y-2">
            <Label htmlFor="updateCadence">
              Update Cadence *
              {lockCadence && (
                <span className="ml-2 text-xs text-muted-foreground">(Fixed for this task type)</span>
              )}
            </Label>
            <Select
              value={updateCadence}
              onValueChange={onUpdateCadenceChange}
              disabled={lockCadence}
            >
              <SelectTrigger id="updateCadence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediately</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Select how often we'll validate user completion and update their balance:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Immediately:</strong> Completion is checked as soon as the user performs the action (e.g., answering a quiz, clicking a link).</li>
                <li><strong>Daily / Weekly / Monthly:</strong> Completion is checked at the end of each period and balances are updated if completed (e.g., Twitter follower rules to prevent follow/unfollow gaming).</li>
              </ul>
              {isDelayedVerificationTask && updateCadence === 'immediate' && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommendation:</strong> For {platform} follow tasks, consider using Daily or Weekly cadence to prevent users from unfollowing immediately after earning points.
                  </AlertDescription>
                </Alert>
              )}
              {lockCadence && (
                <p className="italic">Note: This task type has a default cadence that can't be changed due to its logic.</p>
              )}
            </div>
          </div>

          {/* Reward Frequency */}
          <div className="space-y-2">
            <Label htmlFor="rewardFrequency">
              User Reward Frequency *
              {lockFrequency && (
                <span className="ml-2 text-xs text-muted-foreground">(Fixed for this task type)</span>
              )}
            </Label>
            <Select
              value={rewardFrequency}
              onValueChange={onRewardFrequencyChange}
              disabled={lockFrequency}
            >
              <SelectTrigger id="rewardFrequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One Time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Select how often a user can receive this reward:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>One Time:</strong> The rule will disappear after the user completes it once.</li>
                <li><strong>Daily / Weekly / Monthly:</strong> Users can complete the rule again in the next period.</li>
              </ul>
              <p className="mt-2">
                • Daily resets at midnight UTC<br />
                • Weekly resets at midnight on Monday<br />
                • Monthly resets at midnight on the 1st of the month
              </p>
              {isOneTimeOnlyTask && rewardFrequency !== 'one_time' && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> This task type is typically configured as "One Time" only.
                  </AlertDescription>
                </Alert>
              )}
              {lockFrequency && (
                <p className="italic">Note: This task type has a default frequency that can't be changed due to its logic.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Helper function to get smart defaults based on task type
export function getRewardConfigDefaults(taskType: string, platform?: string): {
  updateCadence: UpdateCadence;
  rewardFrequency: RewardFrequency;
  lockCadence: boolean;
  lockFrequency: boolean;
} {
  // Special task types with locked configurations
  if (taskType === 'complete_profile') {
    return {
      updateCadence: 'immediate',
      rewardFrequency: 'one_time',
      lockCadence: true,
      lockFrequency: true,
    };
  }

  if (taskType === 'checkin') {
    return {
      updateCadence: 'immediate',
      rewardFrequency: 'daily',
      lockCadence: true,
      lockFrequency: true,
    };
  }

  if (taskType === 'quiz' || taskType === 'poll') {
    return {
      updateCadence: 'immediate',
      rewardFrequency: 'one_time',
      lockCadence: true,
      lockFrequency: false,
    };
  }

  if (taskType === 'website_visit' || taskType === 'stream_code') {
    return {
      updateCadence: 'immediate',
      rewardFrequency: 'one_time',
      lockCadence: true,
      lockFrequency: false,
    };
  }

  // Follow tasks - recommend daily verification to prevent gaming
  if (DELAYED_VERIFICATION_TASKS.includes(taskType)) {
    return {
      updateCadence: 'daily',
      rewardFrequency: 'one_time',
      lockCadence: false,
      lockFrequency: false,
    };
  }

  // Default for all other tasks
  return {
    updateCadence: 'immediate',
    rewardFrequency: 'one_time',
    lockCadence: false,
    lockFrequency: false,
  };
}

