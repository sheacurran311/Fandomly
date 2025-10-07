import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCheck, Info, CheckCircle, Sparkles } from "lucide-react";
import type { CompleteProfileSettings } from "@shared/taskRuleSchema";
import TaskBuilderBase from "@/components/tasks/TaskBuilderBase";

interface CompleteProfileTaskBuilderProps {
  initialConfig?: Partial<CompleteProfileSettings>;
  onSave?: (config: any) => void;
  onPublish?: (config: any) => void;
  onBack?: () => void;
}

// Field definitions for Fan profiles
const FAN_PROFILE_FIELDS = [
  { 
    id: "username" as const, 
    label: "Username", 
    description: "Unique display name",
    category: "basic",
    defaultRequired: true
  },
  { 
    id: "avatar" as const, 
    label: "Profile Picture", 
    description: "Upload a profile photo",
    category: "basic",
    defaultRequired: true
  },
  { 
    id: "bio" as const, 
    label: "Bio", 
    description: "Tell us about yourself",
    category: "basic",
    defaultRequired: false
  },
  { 
    id: "location" as const, 
    label: "Location", 
    description: "City or region",
    category: "basic",
    defaultRequired: false
  },
  { 
    id: "interests" as const, 
    label: "Interests", 
    description: "What types of creators do you follow?",
    category: "preferences",
    defaultRequired: true
  },
  { 
    id: "twitter" as const, 
    label: "Twitter/X", 
    description: "Connect your Twitter account",
    category: "social",
    defaultRequired: false
  },
  { 
    id: "instagram" as const, 
    label: "Instagram", 
    description: "Connect your Instagram account",
    category: "social",
    defaultRequired: false
  },
  { 
    id: "discord" as const, 
    label: "Discord", 
    description: "Connect your Discord account",
    category: "social",
    defaultRequired: false
  },
  { 
    id: "telegram" as const, 
    label: "Telegram", 
    description: "Connect your Telegram account",
    category: "social",
    defaultRequired: false
  },
  { 
    id: "youtube" as const, 
    label: "YouTube", 
    description: "Connect your YouTube account",
    category: "social",
    defaultRequired: false
  },
  { 
    id: "spotify" as const, 
    label: "Spotify", 
    description: "Connect your Spotify account",
    category: "social",
    defaultRequired: false
  },
];

export function CompleteProfileTaskBuilder({
  initialConfig,
  onSave,
  onPublish,
  onBack
}: CompleteProfileTaskBuilderProps) {
  // Initialize settings with defaults
  const [settings, setSettings] = useState<CompleteProfileSettings>({
    requiredFields: initialConfig?.requiredFields || ['username', 'avatar'],
    rewardMode: initialConfig?.rewardMode || 'all_or_nothing',
    pointsPerField: initialConfig?.pointsPerField,
  });

  const [taskName, setTaskName] = useState(initialConfig?.name || "Complete Your Profile");
  const [taskDescription, setTaskDescription] = useState(
    initialConfig?.description || "Complete your profile to earn Fandomly Points"
  );
  const defaultPoints = 100;
  
  const [previewMode, setPreviewMode] = useState<"all" | "per_field">(settings.rewardMode);
  
  const toggleField = (fieldId: typeof settings.requiredFields[number]) => {
    const newFields = settings.requiredFields.includes(fieldId)
      ? settings.requiredFields.filter(f => f !== fieldId)
      : [...settings.requiredFields, fieldId];
    
    setSettings({
      ...settings,
      requiredFields: newFields
    });
  };
  
  const setRewardMode = (mode: "all_or_nothing" | "per_field") => {
    setSettings({
      ...settings,
      rewardMode: mode,
      pointsPerField: mode === "per_field" ? Math.floor(defaultPoints / settings.requiredFields.length) : undefined
    });
    setPreviewMode(mode);
  };
  
  const setPointsPerField = (points: number) => {
    setSettings({
      ...settings,
      pointsPerField: points
    });
  };

  // Build task configuration for save/publish
  const buildTaskConfig = () => {
    return {
      name: taskName,
      description: taskDescription,
      taskType: 'complete_profile' as const,
      customSettings: settings,
      section: 'user_onboarding' as const,
      updateCadence: 'immediate' as const,
      rewardFrequency: 'one_time' as const,
    };
  };

  const handleSave = () => {
    if (onSave) {
      onSave(buildTaskConfig());
    }
  };

  const handlePublish = () => {
    if (onPublish) {
      onPublish(buildTaskConfig());
    }
  };
  
  const basicFields = FAN_PROFILE_FIELDS.filter(f => f.category === "basic");
  const preferenceFields = FAN_PROFILE_FIELDS.filter(f => f.category === "preferences");
  const socialFields = FAN_PROFILE_FIELDS.filter(f => f.category === "social");
  
  const totalPossiblePoints = settings.rewardMode === "per_field" && settings.pointsPerField
    ? settings.requiredFields.length * settings.pointsPerField
    : defaultPoints;

  const isValid = settings.requiredFields.length > 0;
  
  return (
    <TaskBuilderBase
      title="Complete Profile Task"
      description="Reward fans for completing their profile"
      icon={<UserCheck className="h-6 w-6 text-brand-primary" />}
      category="User Onboarding"
      onBack={onBack}
      onSaveDraft={handleSave}
      onPublish={handlePublish}
      isValid={isValid}
      helpText="Encourage fans to complete their profiles by rewarding them with Fandomly Points. Choose between all-or-nothing or per-field rewards."
    >
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <UserCheck className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle>Complete Profile Task Configuration</CardTitle>
            <CardDescription>Configure which profile fields fans must complete to earn Fandomly Points</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This task rewards fans with <strong>Fandomly Points</strong> (application-wide currency) for completing their profile. Use this to encourage fan engagement across the entire platform.
          </AlertDescription>
        </Alert>
        
        {/* Reward Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Reward Mode</Label>
          <RadioGroup
            value={settings.rewardMode}
            onValueChange={(val) => setRewardMode(val as "all_or_nothing" | "per_field")}
            className="space-y-3"
          >
            {/* All or Nothing */}
            <div
              className={`
                flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${settings.rewardMode === "all_or_nothing" 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-white/20 hover:border-white/40"}
              `}
              onClick={() => setRewardMode("all_or_nothing")}
            >
              <RadioGroupItem value="all_or_nothing" id="all-or-nothing" className="mt-1" />
              <Label htmlFor="all-or-nothing" className="flex-1 cursor-pointer">
                <div className="font-medium text-lg mb-1">All or Nothing</div>
                <div className="text-sm text-gray-400">
                  Fans only earn points when ALL selected fields are completed. Best for comprehensive profile completion.
                </div>
                {settings.rewardMode === "all_or_nothing" && (
                  <div className="mt-2 p-2 bg-blue-500/10 rounded text-sm">
                    <strong>{defaultPoints} Fandomly Points</strong> when all {settings.requiredFields.length} fields are completed
                  </div>
                )}
              </Label>
            </div>
            
            {/* Per Field */}
            <div
              className={`
                flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${settings.rewardMode === "per_field" 
                  ? "border-green-500 bg-green-500/10" 
                  : "border-white/20 hover:border-white/40"}
              `}
              onClick={() => setRewardMode("per_field")}
            >
              <RadioGroupItem value="per_field" id="per-field" className="mt-1" />
              <Label htmlFor="per-field" className="flex-1 cursor-pointer">
                <div className="font-medium text-lg mb-1">Per Field</div>
                <div className="text-sm text-gray-400">
                  Fans earn points for each individual field they complete. Best for incremental progress and engagement.
                </div>
                {settings.rewardMode === "per_field" && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="points-per-field" className="text-sm">Points per field</Label>
                    <Input
                      id="points-per-field"
                      type="number"
                      value={settings.pointsPerField || 10}
                      onChange={(e) => setPointsPerField(Number(e.target.value))}
                      min={1}
                      max={500}
                      className="w-32"
                    />
                    <p className="text-xs text-gray-400">
                      Total possible: <strong>{totalPossiblePoints} Fandomly Points</strong> ({settings.requiredFields.length} fields × {settings.pointsPerField || 10} points)
                    </p>
                  </div>
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        {/* Field Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Required Profile Fields</Label>
            <Badge variant="secondary">
              {settings.requiredFields.length} field{settings.requiredFields.length !== 1 ? 's' : ''} selected
            </Badge>
          </div>
          
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Select which fields fans must complete. The more fields you require, the more comprehensive their profile will be.
            </AlertDescription>
          </Alert>
          
          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-300">Basic Information</h4>
            <div className="space-y-2">
              {basicFields.map((field) => (
                <div
                  key={field.id}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${settings.requiredFields.includes(field.id)
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-white/10 hover:border-white/20"}
                  `}
                  onClick={() => toggleField(field.id)}
                >
                  <Checkbox
                    id={field.id}
                    checked={settings.requiredFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <div className="flex-1 cursor-pointer">
                    <Label htmlFor={field.id} className="font-medium cursor-pointer">
                      {field.label}
                      {field.defaultRequired && (
                        <Badge variant="outline" className="ml-2 text-xs">Recommended</Badge>
                      )}
                    </Label>
                    <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                  </div>
                  {settings.requiredFields.includes(field.id) && (
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Preferences */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-300">Preferences & Interests</h4>
            <div className="space-y-2">
              {preferenceFields.map((field) => (
                <div
                  key={field.id}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${settings.requiredFields.includes(field.id)
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-white/10 hover:border-white/20"}
                  `}
                  onClick={() => toggleField(field.id)}
                >
                  <Checkbox
                    id={field.id}
                    checked={settings.requiredFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <div className="flex-1 cursor-pointer">
                    <Label htmlFor={field.id} className="font-medium cursor-pointer">
                      {field.label}
                      {field.defaultRequired && (
                        <Badge variant="outline" className="ml-2 text-xs">Recommended</Badge>
                      )}
                    </Label>
                    <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                  </div>
                  {settings.requiredFields.includes(field.id) && (
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Social Connections */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-300">Social Media Connections</h4>
            <div className="space-y-2">
              {socialFields.map((field) => (
                <div
                  key={field.id}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${settings.requiredFields.includes(field.id)
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-white/10 hover:border-white/20"}
                  `}
                  onClick={() => toggleField(field.id)}
                >
                  <Checkbox
                    id={field.id}
                    checked={settings.requiredFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <div className="flex-1 cursor-pointer">
                    <Label htmlFor={field.id} className="font-medium cursor-pointer">{field.label}</Label>
                    <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                  </div>
                  {settings.requiredFields.includes(field.id) && (
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Task Preview */}
        {settings.requiredFields.length > 0 && (
          <>
            <Separator />
            <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Task Preview
              </h4>
              <p className="text-sm text-gray-300">
                {settings.rewardMode === "all_or_nothing" ? (
                  <>
                    Fans must complete <strong>all {settings.requiredFields.length} selected fields</strong> to earn <strong className="text-blue-400">{defaultPoints} Fandomly Points</strong>.
                  </>
                ) : (
                  <>
                    Fans earn <strong className="text-green-400">{settings.pointsPerField} Fandomly Points</strong> for each field they complete. 
                    Maximum possible: <strong className="text-green-400">{totalPossiblePoints} points</strong> ({settings.requiredFields.length} fields).
                  </>
                )}
              </p>
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2">Required fields:</p>
                <div className="flex flex-wrap gap-2">
                  {settings.requiredFields.map((fieldId) => {
                    const field = FAN_PROFILE_FIELDS.find(f => f.id === fieldId);
                    return field ? (
                      <Badge key={fieldId} variant="secondary" className="text-xs">
                        {field.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </>
        )}
        
        {settings.requiredFields.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please select at least one required field to configure this task.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
    </TaskBuilderBase>
  );
}

