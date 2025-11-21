/**
 * Reward Configuration Component
 * Snag-inspired reward and timing configuration for tasks
 * 
 * Features:
 * - Reward type selector (Points vs Multiplier)
 * - Update cadence selector (Immediate, Daily, Weekly, Monthly)
 * - Reward frequency selector (One-time, Daily, Weekly, Monthly)
 * - Smart defaults based on task type
 * - Validation and help text
 */

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  
  return (
    <div className="space-y-6">
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
                <Label htmlFor="pointsToReward">Points to Reward *</Label>
                <div className="flex gap-2">
                  <NumberInput
                    id="pointsToReward"
                    value={pointsToReward}
                    onChange={onPointsToRewardChange}
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
                  Enter the amount and type of points the user will earn upon completing the rule.
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
                  onChange={onMultiplierValueChange}
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

