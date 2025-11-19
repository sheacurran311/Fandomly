/**
 * Stream Code Task Builder Component
 *
 * Generic code verifier task for live streams/spaces across any platform
 * Creator sets a code that fans must input to prove they attended the stream
 *
 * Supports:
 * - stream_code_verify: Join Stream or Spaces (Code Verifier)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Video, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";

interface StreamCodeTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function StreamCodeTaskBuilder({
  onSave,
  onPublish,
  onBack,
  initialData,
  isEditMode,
}: StreamCodeTaskBuilderProps) {
  const { toast } = useToast();

  // Task settings
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(100);

  // Stream code settings
  const [secretCode, setSecretCode] = useState('');
  const [streamPlatform, setStreamPlatform] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [codeInstructions, setCodeInstructions] = useState('');

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Set default values
  useEffect(() => {
    if (!isEditMode && !taskName) {
      setTaskName('Join My Live Stream');
      setDescription('Watch my stream and enter the secret code I mention to earn points!');
      setCodeInstructions('I will announce the code during the stream. Watch and listen carefully!');
    }
  }, [isEditMode, taskName]);

  // Load initial data for edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.points || initialData.pointsToReward || 100);
      setSecretCode(initialData.settings?.secretCode || '');
      setStreamPlatform(initialData.settings?.streamPlatform || '');
      setStreamUrl(initialData.settings?.streamUrl || '');
      setCodeInstructions(initialData.settings?.codeInstructions || '');
    }
  }, [isEditMode, initialData]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (!secretCode.trim()) errors.push('Secret code is required');
    if (secretCode.trim().length < 4) errors.push('Secret code must be at least 4 characters');

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, secretCode]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({ title: "Validation Error", description: validationErrors[0], variant: "destructive" });
      return;
    }

    const config = {
      name: taskName,
      description,
      taskType: 'stream_code_verify',
      platform: 'generic' as const,
      points,
      isDraft: false,
      verificationMethod: 'manual', // Code verification is always manual
      settings: {
        secretCode,
        streamPlatform: streamPlatform || undefined,
        streamUrl: streamUrl || undefined,
        codeInstructions: codeInstructions || undefined,
        caseSensitive: false, // Make code verification case-insensitive by default
      },
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    const config = {
      name: taskName,
      description,
      taskType: 'stream_code_verify',
      platform: 'generic' as const,
      points,
      isDraft: true,
      verificationMethod: 'manual',
      settings: {
        secretCode,
        streamPlatform: streamPlatform || undefined,
        streamUrl: streamUrl || undefined,
        codeInstructions: codeInstructions || undefined,
        caseSensitive: false,
      },
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-blue-600/10 to-purple-500/10 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <Video className="h-5 w-5 text-blue-400" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-blue-400">Type:</span> Stream Code Verifier</p>
        <p><span className="text-blue-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-blue-400">Platform:</span> {streamPlatform || 'Any'}</p>
        <p><span className="text-blue-400">Points:</span> {points} points</p>
        <p><span className="text-blue-400">Verification:</span> Secret Code</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<Video className="h-6 w-6 text-blue-400" />}
      title="Stream Code Verifier"
      description="Create a code-based task for live streams and spaces"
      category="Live Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Perfect for rewarding fans who attend your live streams, spaces, or virtual events."
      exampleUse="Set up this task before going live. During the stream, announce the secret code. Fans who were watching can enter the code to prove they attended and earn points!"
    >
      <Alert className="mb-4 bg-blue-500/10 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-400">
          <strong>How it works:</strong> Create this task before your stream. During the stream, mention the secret code out loud. Fans watching can then enter the code to complete the task and earn points.
        </AlertDescription>
      </Alert>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Stream Code Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Join My Live Stream"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Watch my stream and enter the secret code!"
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
          </div>

          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Secret Code *
            </Label>
            <Input
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="STREAM2024"
              className="bg-white/5 border-white/10 text-white font-mono"
              maxLength={50}
            />
            <p className="text-xs text-gray-400">
              The code you'll announce during your stream (minimum 4 characters, case-insensitive)
            </p>
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertDescription className="text-yellow-400 text-xs">
                <strong>Important:</strong> Keep this code secret until you're ready to announce it during your stream!
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Stream Platform (Optional)</Label>
            <Input
              value={streamPlatform}
              onChange={(e) => setStreamPlatform(e.target.value)}
              placeholder="Twitch, YouTube Live, Twitter Spaces, etc."
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Which platform will you stream on? (e.g., Twitch, YouTube, Twitter Spaces)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Stream URL (Optional)</Label>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://twitch.tv/yourchannel"
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400">
              Link to your stream (optional, helps fans find your stream)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Instructions for Fans (Optional)</Label>
            <Textarea
              value={codeInstructions}
              onChange={(e) => setCodeInstructions(e.target.value)}
              placeholder="Join my stream and listen for the secret code! I'll announce it during the broadcast."
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-400">
              Additional instructions to help fans understand how to complete this task
            </p>
          </div>

          <Alert className="bg-green-500/10 border-green-500/20">
            <Info className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400 text-sm">
              <strong>Pro Tip:</strong> Use this task type for any live event across any platform - Twitch streams, YouTube Live, Twitter/X Spaces, Discord events, and more!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </TaskBuilderBase>
  );
}
