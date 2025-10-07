import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Calendar, RefreshCw, CheckCircle, Info } from "lucide-react";
import type { UpdateCadence, RewardFrequency } from "@shared/taskRuleSchema";

interface TaskTimingConfigProps {
  updateCadence: UpdateCadence;
  rewardFrequency: RewardFrequency;
  onChange: (field: "updateCadence" | "rewardFrequency", value: string) => void;
  taskType?: string;
  disabled?: boolean;
}

// Some tasks have fixed cadences based on their logic
const FIXED_CADENCE_TASKS = [
  "check_in",
  "reach_followers", 
  "twitter_reach_followers",
  "instagram_reach_followers"
];

const FIXED_FREQUENCY_TASKS = [
  "complete_profile",
  "connect_account",
  "connect_email",
  "connect_wallet"
];

export function TaskTimingConfig({ 
  updateCadence, 
  rewardFrequency, 
  onChange, 
  taskType,
  disabled = false 
}: TaskTimingConfigProps) {
  // Check if this task type has fixed timing
  const hasFixedCadence = taskType ? FIXED_CADENCE_TASKS.some(t => taskType.includes(t)) : false;
  const hasFixedFrequency = taskType ? FIXED_FREQUENCY_TASKS.some(t => taskType.includes(t)) : false;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timing & Frequency</CardTitle>
        <CardDescription>Configure when and how often fans can earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Update Cadence */}
        <div className="space-y-3">
          <Label htmlFor="update-cadence" className="text-base font-semibold">
            Update Cadence
          </Label>
          <p className="text-sm text-gray-400">
            How often we check if the task is completed
          </p>
          
          <Select
            value={updateCadence}
            onValueChange={(val) => onChange("updateCadence", val)}
            disabled={disabled || hasFixedCadence}
          >
            <SelectTrigger id="update-cadence" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">
                <div className="flex items-center gap-3 py-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-medium">Immediate</div>
                    <div className="text-xs text-gray-400">Instant validation when action is taken</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="daily">
                <div className="flex items-center gap-3 py-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Daily</div>
                    <div className="text-xs text-gray-400">Check at midnight UTC every day</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="weekly">
                <div className="flex items-center gap-3 py-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Weekly</div>
                    <div className="text-xs text-gray-400">Check Monday midnight UTC</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="monthly">
                <div className="flex items-center gap-3 py-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Monthly</div>
                    <div className="text-xs text-gray-400">Check 1st of month midnight UTC</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {hasFixedCadence && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This task type has a fixed update cadence based on its verification logic
              </AlertDescription>
            </Alert>
          )}
          
          {/* Help text for each cadence */}
          {updateCadence === "immediate" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Quizzes, code entry, link clicks, manual submissions
            </p>
          )}
          {updateCadence === "daily" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Check-ins, daily engagement tasks, follower count milestones
            </p>
          )}
          {updateCadence === "weekly" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Weekly challenges, engagement tracking
            </p>
          )}
          {updateCadence === "monthly" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Monthly goals, long-term milestones
            </p>
          )}
        </div>
        
        {/* Reward Frequency */}
        <div className="space-y-3">
          <Label htmlFor="reward-frequency" className="text-base font-semibold">
            Reward Frequency
          </Label>
          <p className="text-sm text-gray-400">
            How often fans can earn rewards from this task
          </p>
          
          <Select
            value={rewardFrequency}
            onValueChange={(val) => onChange("rewardFrequency", val)}
            disabled={disabled || hasFixedFrequency}
          >
            <SelectTrigger id="reward-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">
                <div className="flex items-center gap-3 py-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">One Time</div>
                    <div className="text-xs text-gray-400">Task disappears after completion</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="daily">
                <div className="flex items-center gap-3 py-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Daily</div>
                    <div className="text-xs text-gray-400">Resets at midnight UTC</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="weekly">
                <div className="flex items-center gap-3 py-2">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Weekly</div>
                    <div className="text-xs text-gray-400">Resets Monday midnight UTC</div>
                  </div>
                </div>
              </SelectItem>
              
              <SelectItem value="monthly">
                <div className="flex items-center gap-3 py-2">
                  <RefreshCw className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Monthly</div>
                    <div className="text-xs text-gray-400">Resets 1st of month midnight UTC</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {hasFixedFrequency && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This task type can only be completed once per user
              </AlertDescription>
            </Alert>
          )}
          
          {/* Help text for each frequency */}
          {rewardFrequency === "one_time" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Profile setup, account connections, one-time milestones
            </p>
          )}
          {rewardFrequency === "daily" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Daily check-ins, daily engagement tasks
            </p>
          )}
          {rewardFrequency === "weekly" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Weekly challenges, content creation tasks
            </p>
          )}
          {rewardFrequency === "monthly" && (
            <p className="text-xs text-gray-500 pl-1">
              Best for: Monthly goals, subscription rewards
            </p>
          )}
        </div>
        
        {/* Timing Preview */}
        <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">Timing Preview</h4>
          <p className="text-sm text-gray-300">
            {updateCadence === "immediate" && "Completion is checked instantly when fans take action. "}
            {updateCadence === "daily" && "Completion is checked daily at midnight UTC. "}
            {updateCadence === "weekly" && "Completion is checked every Monday at midnight UTC. "}
            {updateCadence === "monthly" && "Completion is checked on the 1st of each month at midnight UTC. "}
            
            {rewardFrequency === "one_time" && "Fans can earn rewards only once."}
            {rewardFrequency === "daily" && "Fans can earn rewards once per day."}
            {rewardFrequency === "weekly" && "Fans can earn rewards once per week."}
            {rewardFrequency === "monthly" && "Fans can earn rewards once per month."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

