/**
 * Instagram Task Builder Component
 * 
 * Allows creators to create Instagram-based tasks with:
 * - Follow tasks
 * - Like Post tasks
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
import { SiInstagram } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { SocialIntegrationManager } from "@/lib/social-integrations";

interface InstagramTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'instagram_follow' | 'instagram_like';
  initialData?: any;
  isEditMode?: boolean;
}

export default function InstagramTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode }: InstagramTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [username, setUsername] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check if Instagram is connected and auto-populate username
  useEffect(() => {
    const checkInstagramConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/instagram', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setInstagramConnected(data.connected || false);
          if (data.connected && data.username) {
            setInstagramHandle(data.username);
            // Auto-populate username for follow tasks
            if (taskType === 'instagram_follow' && !username) {
              setUsername(data.username);
            }
          }
        } else {
          setInstagramConnected(false);
        }
      } catch (error) {
        console.error('[InstagramTaskBuilder] Error checking Instagram connection:', error);
        setInstagramConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    
    if (user?.id) {
      checkInstagramConnection();
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
      setPoints(initialData.points || 50);
      if (initialData.settings?.username) {
        setUsername(initialData.settings.username);
      }
      if (initialData.settings?.postUrl) {
        setPostUrl(initialData.settings.postUrl);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  const getDefaultValues = () => {
    switch (taskType) {
      case 'instagram_follow':
        return {
          name: 'Follow on Instagram',
          description: 'Follow us on Instagram to see our latest content!',
          points: 50,
        };
      case 'instagram_like':
        return {
          name: 'Like Our Instagram Post',
          description: 'Show some love by liking our Instagram post!',
          points: 25,
        };
      default:
        return { name: '', description: '', points: 50 };
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
    
    if (taskType === 'instagram_follow') {
      if (!username.trim()) {
        errors.push('Instagram username is required');
      }
    } else {
      if (!postUrl.trim()) {
        errors.push('Instagram post URL is required');
      } else if (!postUrl.includes('instagram.com')) {
        errors.push('Invalid Instagram post URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, username, postUrl, taskType]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'instagram' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
    };

    if (taskType === 'instagram_follow') {
      return {
        ...baseConfig,
        settings: {
          username: username.startsWith('@') ? username.substring(1) : username,
        },
      };
    } else {
      return {
        ...baseConfig,
        settings: {
          postUrl,
        },
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
    <div className="p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-lg border border-pink-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiInstagram className="h-5 w-5 text-pink-500" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-pink-400">Type:</span> {taskType === 'instagram_follow' ? 'Follow Account' : 'Like Post'}</p>
        <p><span className="text-pink-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-pink-400">Points:</span> {points} points</p>
        <p><span className="text-pink-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiInstagram className="h-6 w-6 text-pink-500" />}
      title="Instagram Task"
      description="Create Instagram-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Instagram tasks help increase your social media engagement. Fans earn points for following your account or liking your posts."
      exampleUse="A creator could offer 50 points for fans to follow them on Instagram, or 25 points for liking a specific post showcasing new merchandise."
    >
      {!instagramConnected && !checkingConnection && (
        <Alert className="mb-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Instagram Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Instagram account before creating Instagram tasks.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const socialManager = new SocialIntegrationManager();
                    const result = await socialManager['instagram'].secureLogin();
                    
                    if (result.success) {
                      toast({ title: "Instagram Connected! 📸" });
                      // Re-check connection
                      const response = await fetch('/api/social-connections/instagram', {
                        headers: {
                          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setInstagramConnected(data.connected || false);
                        if (data.connected && data.username) {
                          setInstagramHandle(data.username);
                          if (taskType === 'instagram_follow' && !username) {
                            setUsername(data.username);
                          }
                        }
                        setCheckingConnection(false);
                      }
                    } else {
                      toast({ 
                        title: "Connection Failed",
                        description: result.error || "Failed to connect Instagram",
                        variant: "destructive" 
                      });
                    }
                  } catch (error) {
                    console.error('Instagram connection error:', error);
                    toast({ title: "Error", description: "Failed to connect Instagram", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 ml-4"
              >
                Connect Instagram
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {instagramConnected && (
        <Alert className="mb-4 bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Instagram Connected</strong> {instagramHandle && `- @${instagramHandle}`}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'instagram_follow' && 'Follow Account Configuration'}
              {taskType === 'instagram_like' && 'Like Post Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Follow us on Instagram"
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
            {taskType === 'instagram_follow' ? (
              <div className="space-y-2">
                <Label className="text-white">Instagram Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username or username"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  Your Instagram username (with or without @)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-white">Instagram Post URL</Label>
                <Input
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://instagram.com/p/ABC123..."
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  The full URL of the Instagram post you want fans to like
                </p>
              </div>
            )}

            {/* API Verification Toggle */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-white font-semibold">Automatic Verification</Label>
                  <p className="text-xs text-gray-400">
                    Use Instagram API to verify task completion (requires Instagram connection)
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
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                        <SiInstagram className="h-5 w-5 text-white" />
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

