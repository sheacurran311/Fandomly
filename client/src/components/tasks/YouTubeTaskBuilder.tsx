/**
 * YouTube Task Builder Component
 * 
 * Allows creators to create YouTube-based tasks with:
 * - Subscribe tasks
 * - Like Video tasks
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { SocialIntegrationManager } from "@/lib/social-integrations";

interface YouTubeTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'youtube_subscribe' | 'youtube_like' | 'youtube_comment';
  initialData?: any;
  isEditMode?: boolean;
}

export default function YouTubeTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode }: YouTubeTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(100);
  const [channelUrl, setChannelUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [requiredText, setRequiredText] = useState(''); // For comment tasks
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeChannel, setYoutubeChannel] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check if YouTube is connected and auto-populate channel
  useEffect(() => {
    const checkYoutubeConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/youtube', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setYoutubeConnected(data.connected || false);
          if (data.connected && data.connection) {
            const ytData = data.connection.profileData || {};
            const channelTitle = ytData.title || ytData.channelTitle || data.connection.platformDisplayName;
            const channelId = ytData.channelId || ytData.id || data.connection.platformUserId;
            
            setYoutubeChannel(channelTitle || 'Your Channel');
            // Auto-populate channel URL for subscribe tasks
            if (taskType === 'youtube_subscribe' && !channelUrl && channelId) {
              setChannelUrl(`https://youtube.com/channel/${channelId}`);
            }
          }
        } else {
          setYoutubeConnected(false);
        }
      } catch (error) {
        console.error('[YouTubeTaskBuilder] Error checking YouTube connection:', error);
        setYoutubeConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    
    if (user?.id) {
      checkYoutubeConnection();
    } else {
      setCheckingConnection(false);
    }
  }, [user?.dynamicUserId, user?.id, taskType]);

  // Initialize form with defaults based on task type
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = getDefaultValues();
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);
  
  // Load initial data if editing
  useEffect(() => {
    if (initialData && isEditMode) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.points || 100);
      if (initialData.settings?.channelUrl) {
        setChannelUrl(initialData.settings.channelUrl);
      }
      if (initialData.settings?.videoUrl) {
        setVideoUrl(initialData.settings.videoUrl);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  const getDefaultValues = () => {
    switch (taskType) {
      case 'youtube_subscribe':
        return {
          name: 'Subscribe on YouTube',
          description: 'Subscribe to our YouTube channel for exclusive content!',
          points: 100,
        };
      case 'youtube_like':
        return {
          name: 'Like Our YouTube Video',
          description: 'Show some love by liking our YouTube video!',
          points: 25,
        };
      case 'youtube_comment':
        return {
          name: 'Comment on YouTube Video',
          description: 'Leave a comment on our YouTube video!',
          points: 50,
        };
      default:
        return { name: '', description: '', points: 100 };
    }
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];

    if (!taskName.trim()) {
      errors.push('Task name is required');
    }
    if (!description.trim()) {
      errors.push('Description is required');
    }
    if (points < 1 || points > 10000) {
      errors.push('Points must be between 1 and 10,000');
    }
    
    if (taskType === 'youtube_subscribe') {
      if (!channelUrl.trim()) {
        errors.push('YouTube channel URL is required');
      } else if (!channelUrl.includes('youtube.com')) {
        errors.push('Invalid YouTube channel URL');
      }
    } else {
      if (!videoUrl.trim()) {
        errors.push('YouTube video URL is required');
      } else if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
        errors.push('Invalid YouTube video URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, channelUrl, videoUrl, requiredText, taskType]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'youtube' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
    };

    if (taskType === 'youtube_subscribe') {
      return {
        ...baseConfig,
        settings: {
          channelUrl,
        },
      };
    } else {
      const settings: any = {
        videoUrl,
      };
      
      // Add optional requiredText for comment tasks
      if (taskType === 'youtube_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
      
      return {
        ...baseConfig,
        settings,
      };
    }
  };

  const handleSaveClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    onSave(buildTaskConfig(true));
  };

  const handlePublishClick = () => {
    const error = validateForm();
    if (error) {
      toast({
        title: "Cannot Publish Task",
        description: error,
        variant: "destructive",
      });
      return;
    }
    onPublish(buildTaskConfig(false));
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-red-600/10 to-red-400/10 rounded-lg border border-red-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiYoutube className="h-5 w-5 text-red-600" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-red-400">Type:</span> {taskType === 'youtube_subscribe' ? 'Subscribe' : taskType === 'youtube_comment' ? 'Comment' : 'Like Video'}</p>
        <p><span className="text-red-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-red-400">Points:</span> {points} points</p>
        <p><span className="text-red-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiYoutube className="h-6 w-6 text-red-600" />}
      title="YouTube Task"
      description="Create YouTube-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="YouTube tasks help grow your channel. Fans earn points for subscribing to your channel or liking your videos."
      exampleUse="A creator could offer 100 points for fans to subscribe to their channel, or 25 points for liking a specific video."
    >
      {!youtubeConnected && !checkingConnection && (
        <Alert className="mb-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>YouTube Not Connected</strong>
                <p className="text-sm mt-1">You must connect your YouTube account before creating YouTube tasks.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const socialManager = new SocialIntegrationManager();
                    const result = await socialManager['youtube'].secureLogin();
                    
                    if (result.success) {
                      toast({ title: "YouTube Connected! 📺" });
                      // Re-check connection
                      const response = await fetch('/api/social-connections/youtube', {
                        headers: {
                          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setYoutubeConnected(data.connected || false);
                        if (data.connected && (data.channelTitle || data.channelUrl)) {
                          setYoutubeChannel(data.channelTitle || 'Your Channel');
                          if (taskType === 'youtube_subscribe' && !channelUrl && data.channelUrl) {
                            setChannelUrl(data.channelUrl);
                          }
                        }
                        setCheckingConnection(false);
                      }
                    } else {
                      toast({ 
                        title: "Connection Failed",
                        description: result.error || "Failed to connect YouTube",
                        variant: "destructive" 
                      });
                    }
                  } catch (error) {
                    console.error('YouTube connection error:', error);
                    toast({ title: "Error", description: "Failed to connect YouTube", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ml-4"
              >
                Connect YouTube
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {youtubeConnected && (
        <Alert className="mb-4 bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>YouTube Connected</strong> {youtubeChannel && `- ${youtubeChannel}`}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'youtube_subscribe' && 'Subscribe Configuration'}
              {taskType === 'youtube_like' && 'Like Video Configuration'}
              {taskType === 'youtube_comment' && 'Comment Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Subscribe to our channel"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what fans need to do"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Points */}
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
                How many points fans will earn for completing this task
              </p>
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'youtube_subscribe' ? (
              <div className="space-y-2">
                <Label className="text-white">YouTube Channel URL</Label>
                <Input
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  The full URL of your YouTube channel
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">YouTube Video URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the YouTube video you want fans to {taskType === 'youtube_comment' ? 'comment on' : 'like'}
                  </p>
                </div>
                
                {/* Required Text for Comment Tasks */}
                {taskType === 'youtube_comment' && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Text (Optional)</Label>
                    <Input
                      value={requiredText}
                      onChange={(e) => setRequiredText(e.target.value)}
                      placeholder="e.g., #Fandomly or 'Great video!'"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-400">
                      If specified, fans must include this text in their comment
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* API Verification Toggle */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-white font-semibold">Automatic Verification</Label>
                  <p className="text-xs text-gray-400">
                    Use YouTube API to verify task completion (requires YouTube connection)
                  </p>
                </div>
                <Switch
                  checked={useApiVerification}
                  onCheckedChange={setUseApiVerification}
                />
              </div>

              {useApiVerification ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-400 text-sm">
                    <strong>Instant Rewards:</strong> Fans will get points immediately after completing the task!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-400 text-sm">
                    <strong>Manual Verification:</strong> You'll need to manually approve each completion.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-white">Preview</Label>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-600/20 flex items-center justify-center">
                        <SiYoutube className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{taskName || 'Task Name'}</h3>
                        <p className="text-sm text-gray-400">{description || 'Description'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-brand-primary text-brand-primary">
                      +{points} points
                    </Badge>
                  </div>
                  {useApiVerification && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Instant verification enabled
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </TaskBuilderBase>
  );
}

