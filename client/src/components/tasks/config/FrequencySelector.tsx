/**
 * Frequency Selector Component
 *
 * Allows creators to configure how often users can complete a task:
 * - One-time only
 * - Daily (resets at midnight)
 * - Weekly (resets on Monday)
 * - Monthly (resets on 1st of month)
 */

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RewardFrequency = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'unlimited';

interface FrequencySelectorProps {
  value: RewardFrequency;
  onChange: (frequency: RewardFrequency) => void;
  showUnlimited?: boolean; // Some tasks may allow unlimited completions
}

export function FrequencySelector({ value, onChange, showUnlimited = false }: FrequencySelectorProps) {
  const frequencyDescriptions: Record<RewardFrequency, string> = {
    one_time: 'Users can only complete this task once ever',
    daily: 'Users can complete once per day (resets at midnight)',
    weekly: 'Users can complete once per week (resets Monday)',
    monthly: 'Users can complete once per month (resets on 1st)',
    unlimited: 'Users can complete this task unlimited times',
  };

  const frequencyExamples: Record<RewardFrequency, string> = {
    one_time: 'Best for: Account creation, first purchase, referral signup',
    daily: 'Best for: Daily check-ins, daily votes, daily shares',
    weekly: 'Best for: Weekly challenges, weekly content creation',
    monthly: 'Best for: Monthly subscriptions, monthly surveys',
    unlimited: 'Best for: Every interaction counts (likes, comments, shares)',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <CardTitle>Reward Frequency</CardTitle>
        </div>
        <CardDescription>
          How often can users earn points for this task?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="frequency">Frequency</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Controls how often users can complete this task and earn points.
                    All time-based limits reset at calendar boundaries.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">
                <div className="flex items-center gap-2">
                  <span>One-time only</span>
                </div>
              </SelectItem>
              <SelectItem value="daily">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Daily</span>
                </div>
              </SelectItem>
              <SelectItem value="weekly">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Weekly</span>
                </div>
              </SelectItem>
              <SelectItem value="monthly">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Monthly</span>
                </div>
              </SelectItem>
              {showUnlimited && (
                <SelectItem value="unlimited">
                  <div className="flex items-center gap-2">
                    <span>Unlimited</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <p className="text-sm font-medium">{frequencyDescriptions[value]}</p>
          <p className="text-xs text-muted-foreground">{frequencyExamples[value]}</p>

          {value === 'daily' && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                ⏰ Resets daily at 12:00 AM (user's timezone)
              </p>
            </div>
          )}

          {value === 'weekly' && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                ⏰ Resets every Monday at 12:00 AM (user's timezone)
              </p>
            </div>
          )}

          {value === 'monthly' && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                ⏰ Resets on the 1st of each month at 12:00 AM (user's timezone)
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
