import { useState, useEffect } from "react";
import TaskBuilderBase from "./TaskBuilderBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar as CalendarIcon,
  Flame,
  Plus,
  X,
  Info,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Zap,
} from "lucide-react";

interface StreakMilestone {
  consecutiveDays: number;
  bonusPoints: number;
}

interface CheckInTaskConfig {
  name: string;
  description: string;
  pointsPerCheckIn: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  
  // Streak system
  enableStreak: boolean;
  rewardOnlyStreakCompletions: boolean;
  streakMilestones: StreakMilestone[];
  
  // Celebration
  celebrationType: 'none' | 'image' | 'video';
  celebrationUrl: string;
  
  // Advanced
  countAnyRuleAsCheckIn: boolean;
}

// API expects this structure
interface CheckInTaskAPIPayload {
  taskType: 'checkin';
  name: string;
  description: string;
  isDraft: boolean;
  customSettings: {
    pointsPerCheckIn: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    enableStreak: boolean;
    rewardOnlyStreakCompletions?: boolean;
    streakMilestones?: StreakMilestone[];
    celebrationType?: 'none' | 'image' | 'video';
    celebrationUrl?: string;
    countAnyRuleAsCheckIn?: boolean;
  };
}

interface CheckInTaskBuilderProps {
  initialConfig?: Partial<CheckInTaskConfig>;
  onSave?: (config: CheckInTaskAPIPayload) => void;
  onPublish?: (config: CheckInTaskAPIPayload) => void;
  onBack?: () => void;
}

export default function CheckInTaskBuilder({
  initialConfig,
  onSave,
  onPublish,
  onBack,
}: CheckInTaskBuilderProps) {
  // Handle both local config format and API format (customSettings)
  const getInitialValue = <T,>(key: keyof CheckInTaskConfig, defaultValue: T): T => {
    // First check if value exists directly on initialConfig
    if (initialConfig && key in initialConfig && initialConfig[key] !== undefined) {
      return initialConfig[key] as T;
    }
    // Check if value exists in customSettings (API format)
    const customSettings = (initialConfig as any)?.customSettings;
    if (customSettings && key in customSettings && customSettings[key] !== undefined) {
      return customSettings[key] as T;
    }
    return defaultValue;
  };

  const [config, setConfig] = useState<CheckInTaskConfig>({
    name: (initialConfig as any)?.name || "Daily Check-In",
    description: (initialConfig as any)?.description || "Check in every day to earn points",
    pointsPerCheckIn: getInitialValue('pointsPerCheckIn', 10),
    frequency: getInitialValue('frequency', 'daily'),
    enableStreak: getInitialValue('enableStreak', true),
    rewardOnlyStreakCompletions: getInitialValue('rewardOnlyStreakCompletions', false),
    streakMilestones: getInitialValue('streakMilestones', [
      { consecutiveDays: 3, bonusPoints: 50 },
      { consecutiveDays: 7, bonusPoints: 150 },
      { consecutiveDays: 30, bonusPoints: 1000 },
    ]),
    celebrationType: getInitialValue('celebrationType', 'none'),
    celebrationUrl: getInitialValue('celebrationUrl', ''),
    countAnyRuleAsCheckIn: getInitialValue('countAnyRuleAsCheckIn', false),
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Validate configuration
  useEffect(() => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push("Task name is required");
    }

    if (config.pointsPerCheckIn <= 0) {
      errors.push("Points per check-in must be greater than 0");
    }

    if (config.enableStreak && config.streakMilestones.length > 0) {
      const sortedMilestones = [...config.streakMilestones].sort((a, b) => a.consecutiveDays - b.consecutiveDays);
      sortedMilestones.forEach((milestone, index) => {
        if (milestone.consecutiveDays <= 0) {
          errors.push(`Milestone ${index + 1}: Days must be greater than 0`);
        }
        if (milestone.bonusPoints <= 0) {
          errors.push(`Milestone ${index + 1}: Bonus points must be greater than 0`);
        }
      });
    }

    if (config.celebrationType !== 'none' && !config.celebrationUrl.trim()) {
      errors.push("Celebration URL is required when celebration is enabled");
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [config]);

  const updateConfig = (updates: Partial<CheckInTaskConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addMilestone = () => {
    const lastMilestone = config.streakMilestones[config.streakMilestones.length - 1];
    const nextDays = lastMilestone ? lastMilestone.consecutiveDays + 7 : 7;
    const nextPoints = lastMilestone ? lastMilestone.bonusPoints + 100 : 100;
    
    updateConfig({
      streakMilestones: [
        ...config.streakMilestones,
        { consecutiveDays: nextDays, bonusPoints: nextPoints }
      ]
    });
  };

  const updateMilestone = (index: number, updates: Partial<StreakMilestone>) => {
    const newMilestones = [...config.streakMilestones];
    newMilestones[index] = { ...newMilestones[index], ...updates };
    updateConfig({ streakMilestones: newMilestones });
  };

  const removeMilestone = (index: number) => {
    updateConfig({
      streakMilestones: config.streakMilestones.filter((_, i) => i !== index)
    });
  };

  // Build API payload with proper structure
  const buildAPIPayload = (isDraft: boolean): CheckInTaskAPIPayload => {
    return {
      taskType: 'checkin',
      name: config.name,
      description: config.description,
      isDraft,
      customSettings: {
        pointsPerCheckIn: config.pointsPerCheckIn,
        frequency: config.frequency,
        enableStreak: config.enableStreak,
        rewardOnlyStreakCompletions: config.rewardOnlyStreakCompletions,
        streakMilestones: config.enableStreak ? config.streakMilestones : undefined,
        celebrationType: config.celebrationType,
        celebrationUrl: config.celebrationType !== 'none' ? config.celebrationUrl : undefined,
        countAnyRuleAsCheckIn: config.countAnyRuleAsCheckIn,
      },
    };
  };

  const handleSaveDraft = () => {
    if (onSave) onSave(buildAPIPayload(true));
  };

  const handlePublish = () => {
    if (isValid && onPublish) onPublish(buildAPIPayload(false));
  };

  // Calculate total possible points
  const totalPossiblePoints = config.enableStreak && !config.rewardOnlyStreakCompletions
    ? config.streakMilestones.reduce((sum, m) => sum + m.bonusPoints, 0) + 
      (config.streakMilestones.length > 0 
        ? config.streakMilestones[config.streakMilestones.length - 1].consecutiveDays * config.pointsPerCheckIn
        : config.pointsPerCheckIn * 30)
    : config.enableStreak && config.rewardOnlyStreakCompletions
    ? config.streakMilestones.reduce((sum, m) => sum + m.bonusPoints, 0)
    : config.pointsPerCheckIn * 30;

  // Preview Component
  const previewComponent = (
    <div className="space-y-4">
      <div className="p-4 bg-brand-dark-purple/30 rounded-lg border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold">{config.name}</div>
            <div className="text-xs text-gray-400">{config.description}</div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Frequency</span>
            <span className="text-white capitalize">{config.frequency}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Points per check-in</span>
            <span className="text-brand-secondary font-semibold">{config.pointsPerCheckIn} pts</span>
          </div>
        </div>

        {config.enableStreak && config.streakMilestones.length > 0 && (
          <>
            <div className="border-t border-white/10 pt-3 mb-3">
              <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                <Flame className="h-3 w-3 text-orange-400" />
                Streak Bonuses
              </div>
              <div className="space-y-1">
                {config.streakMilestones.slice(0, 3).map((milestone, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{milestone.consecutiveDays} days</span>
                    <span className="text-orange-400 font-semibold">+{milestone.bonusPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Check In Now
        </Button>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Preview of how fans will see this task
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<Flame className="h-5 w-5 text-orange-400" />}
      title="Check-In Task"
      description="Reward fans for regular engagement"
      category="Onboarding"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Check-in tasks encourage consistent engagement. Streak bonuses reward fans for coming back multiple days in a row."
      exampleUse="An athlete could offer 10 points per daily check-in, with bonus rewards at 7 days (100 pts), 30 days (500 pts), and 90 days (2000 pts) to build habit-forming engagement."
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
                placeholder="e.g., Daily Check-In"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Input
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="e.g., Check in every day to earn points"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Base Configuration */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Check-In Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Points Per Check-In</Label>
                <Input
                  type="number"
                  value={config.pointsPerCheckIn}
                  onChange={(e) => updateConfig({ pointsPerCheckIn: Number(e.target.value) })}
                  placeholder="10"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Frequency</Label>
                <Select
                  value={config.frequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => updateConfig({ frequency: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (resets midnight UTC)</SelectItem>
                    <SelectItem value="weekly">Weekly (resets Monday)</SelectItem>
                    <SelectItem value="monthly">Monthly (resets 1st)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300">
                Fans can earn up to ~<strong>{totalPossiblePoints.toLocaleString()}</strong> points per month with this configuration
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Streak System */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-400" />
                <CardTitle className="text-white">Streak Bonuses</CardTitle>
              </div>
              <Switch
                checked={config.enableStreak}
                onCheckedChange={(checked) => updateConfig({ enableStreak: checked })}
              />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Reward consecutive check-ins with bonus points
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.enableStreak && (
              <>
                {/* Reward Only Streak Completions */}
                <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-white">Reward Only Streak Completions</Label>
                    <p className="text-sm text-gray-400">
                      No daily points until full streak is achieved (hides check-in from UI until complete)
                    </p>
                  </div>
                  <Switch
                    checked={config.rewardOnlyStreakCompletions}
                    onCheckedChange={(checked) => updateConfig({ rewardOnlyStreakCompletions: checked })}
                  />
                </div>

                {/* Milestones */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-white">Streak Milestones</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addMilestone}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>

                  {config.streakMilestones.length === 0 ? (
                    <Alert className="bg-blue-500/10 border-blue-500/20">
                      <Info className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-gray-300">
                        No streak milestones configured. Fans will only earn daily check-in points.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {config.streakMilestones
                        .sort((a, b) => a.consecutiveDays - b.consecutiveDays)
                        .map((milestone, index) => (
                          <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary" className="shrink-0 bg-orange-500/20 text-orange-400 border-orange-400">
                                <Flame className="h-3 w-3 mr-1" />
                                #{index + 1}
                              </Badge>

                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-sm text-gray-300">Consecutive Days</Label>
                                  <Input
                                    type="number"
                                    value={milestone.consecutiveDays}
                                    onChange={(e) => updateMilestone(index, { 
                                      consecutiveDays: Number(e.target.value) 
                                    })}
                                    placeholder="7"
                                    className="bg-white/5 border-white/10 text-white"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-300">Bonus Points</Label>
                                  <Input
                                    type="number"
                                    value={milestone.bonusPoints}
                                    onChange={(e) => updateMilestone(index, { 
                                      bonusPoints: Number(e.target.value) 
                                    })}
                                    placeholder="100"
                                    className="bg-white/5 border-white/10 text-white"
                                  />
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMilestone(index)}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Celebration Asset */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Check-In Celebration
            </CardTitle>
            <p className="text-sm text-gray-400">
              Show a celebratory image or video on successful check-in
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={config.celebrationType}
              onValueChange={(value: 'none' | 'image' | 'video') => updateConfig({ celebrationType: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="text-gray-300 cursor-pointer">No celebration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="image" />
                <Label htmlFor="image" className="text-gray-300 cursor-pointer flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Show image (GIF or static)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="text-gray-300 cursor-pointer flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  Play video
                </Label>
              </div>
            </RadioGroup>

            {config.celebrationType !== 'none' && (
              <div>
                <Label className="text-white">Asset URL</Label>
                <Input
                  type="url"
                  value={config.celebrationUrl}
                  onChange={(e) => updateConfig({ celebrationUrl: e.target.value })}
                  placeholder={
                    config.celebrationType === 'image'
                      ? 'https://example.com/celebration.gif'
                      : 'https://example.com/celebration.mp4'
                  }
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Advanced Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex-1">
                <Label className="text-white">Count Any Task Completion as Check-In</Label>
                <p className="text-sm text-gray-400">
                  Completing any other task automatically counts as checking in
                </p>
              </div>
              <Switch
                checked={config.countAnyRuleAsCheckIn}
                onCheckedChange={(checked) => updateConfig({ countAnyRuleAsCheckIn: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </TaskBuilderBase>
  );
}

