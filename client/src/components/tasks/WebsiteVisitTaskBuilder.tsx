/**
 * Website Visit Task Builder Component
 *
 * Creates link-clicking tasks with auto-verification
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import {
  FrequencySelector,
  WebsiteVisitConfig,
  type RewardFrequency,
  type WebsiteVisitConfigData,
} from "./config";

interface WebsiteVisitTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function WebsiteVisitTaskBuilder({
  onSave,
  onPublish,
  onBack,
  initialData,
  isEditMode,
}: WebsiteVisitTaskBuilderProps) {
  const { toast } = useToast();

  // Basic task info
  const [taskName, setTaskName] = useState('Visit Our Website');
  const [description, setDescription] = useState('Visit our website and earn points!');
  const [points, setPoints] = useState(25);

  // Website Visit configuration
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteVisitConfigData>({
    destinationUrl: '',
  });

  // Website visits can be recurring (daily/weekly engagement)
  const [rewardFrequency, setRewardFrequency] = useState<RewardFrequency>('one_time');

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Load initial data if editing
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || 'Visit Our Website');
      setDescription(initialData.description || 'Visit our website and earn points!');
      setPoints(initialData.points || 25);
      setWebsiteConfig(
        initialData.settings?.websiteConfig || {
          destinationUrl: '',
        }
      );
      setRewardFrequency(initialData.rewardFrequency || 'one_time');
    }
  }, [isEditMode, initialData]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!websiteConfig.destinationUrl.trim()) {
      errors.push('Destination URL is required');
    } else {
      try {
        new URL(websiteConfig.destinationUrl);
      } catch {
        errors.push('Destination URL must be a valid URL (include http:// or https://)');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, websiteConfig]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }

    const config = {
      name: taskName,
      description,
      taskType: 'website_visit',
      platform: 'interactive' as const,
      points,
      isDraft: false,
      verificationMethod: 'auto_tracking',
      settings: {
        websiteConfig,
      },
      // Multipliers handled in campaigns
      rewardFrequency,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    const config = {
      name: taskName,
      description,
      taskType: 'website_visit',
      platform: 'interactive' as const,
      points,
      isDraft: true,
      verificationMethod: 'auto_tracking',
      settings: {
        websiteConfig,
      },
      // Multipliers handled in campaigns
      rewardFrequency,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-blue-600/10 to-cyan-400/10 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <ExternalLink className="h-5 w-5 text-blue-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-blue-400">Type:</span> Website Visit
        </p>
        <p>
          <span className="text-blue-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-blue-400">Points:</span> {points} points
        </p>
        {websiteConfig.destinationUrl && (
          <p className="truncate">
            <span className="text-blue-400">URL:</span>{' '}
            <a
              href={websiteConfig.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:underline"
            >
              {websiteConfig.destinationUrl}
            </a>
          </p>
        )}
        {websiteConfig.requireMinTimeOnSite && (
          <p>
            <span className="text-blue-400">Min Time:</span>{' '}
            {websiteConfig.minTimeOnSiteSeconds}s
          </p>
        )}
        {websiteConfig.requireActionCompletion && (
          <p>
            <span className="text-blue-400">Action:</span>{' '}
            {websiteConfig.actionType?.replace('_', ' ')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<ExternalLink className="h-6 w-6 text-blue-400" />}
      title="Website Visit Task"
      description="Create link-clicking tasks with auto-verification"
      category="Interactive"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Website visit tasks are auto-verified when fans click the tracked link. Perfect for driving traffic to your website, landing pages, or products."
      exampleUse="Drive traffic to your merch store, Patreon, new YouTube video, music release, or any external link."
    >
      {/* Basic Task Info */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Website Visit Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="e.g., Visit Our Merch Store"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="e.g., Check out our new merchandise and earn points!"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Points Reward</Label>
            <NumberInput
              value={points}
              onChange={(val) => setPoints(val || 1)}
              min={1}
              max={10000}
              allowEmpty={false}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Points awarded when user clicks the tracked link
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Website Visit Config */}
      <WebsiteVisitConfig value={websiteConfig} onChange={setWebsiteConfig} />

      {/* Frequency Configuration - Website visits can be recurring */}
      <FrequencySelector
        value={rewardFrequency}
        onChange={setRewardFrequency}
        showUnlimited={false}
      />

      {/* Info about campaign-level settings */}
      <Alert className="bg-blue-500/10 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-400 text-sm">
          Multipliers and verification cadence can be configured at the campaign level for advanced reward strategies.
        </AlertDescription>
      </Alert>

      {/* Auto-verification notice */}
      <Alert className="bg-green-500/10 border-green-500/20">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-400">
          <strong>Auto-verified:</strong> Website visits are instantly tracked and verified when
          fans click your link. No manual review needed!
        </AlertDescription>
      </Alert>

      {(websiteConfig.requireMinTimeOnSite || websiteConfig.requireActionCompletion) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Implementation Required</p>
            <p className="text-sm mt-1">
              To track time on site or action completion, you'll need to add the Fandomly tracking
              script to your destination page. Check our integration docs for details.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </TaskBuilderBase>
  );
}
