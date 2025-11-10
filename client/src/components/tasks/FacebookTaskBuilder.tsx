/**
 * Facebook Task Builder Component
 * 
 * Allows creators to create Facebook-based tasks with:
 * - Follow (Like Page) tasks
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
import { SiFacebook } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { FacebookSDKManager } from "@/lib/facebook";

interface FacebookTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'facebook_like_page' | 'facebook_like_post' | 'facebook_comment_post' | 'facebook_comment_photo';
  initialData?: any;
  isEditMode?: boolean;
}

export default function FacebookTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode }: FacebookTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [pageUrl, setPageUrl] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [requiredText, setRequiredText] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

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
      if (initialData.settings?.pageUrl) {
        setPageUrl(initialData.settings.pageUrl);
      }
      if (initialData.settings?.postUrl) {
        setPostUrl(initialData.settings.postUrl);
      }
      if (initialData.settings?.requiredText) {
        setRequiredText(initialData.settings.requiredText);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  // Check if Facebook is connected and get page URL
  useEffect(() => {
    const checkFacebookConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/facebook', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setFacebookConnected(data.connected);
          
          // Auto-fill page URL for follow tasks if available
          if (data.connected && data.connection?.profileData) {
            const fbData = data.connection.profileData;
            // Try to get page URL from profile data or construct from username/id
            if (taskType === 'facebook_like_page' && !pageUrl) {
              // If we have pages, use the first page's URL
              if (fbData.pages && fbData.pages.length > 0) {
                const firstPage = fbData.pages[0];
                setPageUrl(`https://facebook.com/${firstPage.id}`);
              } else if (fbData.id) {
                // Fall back to user profile URL
                setPageUrl(`https://facebook.com/${fbData.id}`);
              }
            }
          }
        } else {
          setFacebookConnected(false);
        }
      } catch (error) {
        console.error('[FacebookTaskBuilder] Error checking Facebook connection:', error);
        setFacebookConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    
    if (user?.id) {
      checkFacebookConnection();
    } else {
      setCheckingConnection(false);
    }
  }, [user?.id, user?.dynamicUserId, taskType]);

  const getDefaultValues = () => {
    switch (taskType) {
      case 'facebook_like_page':
        return {
          name: 'Like Our Facebook Page',
          description: 'Like our Facebook page to stay connected!',
          points: 50,
        };
      case 'facebook_like_post':
        return {
          name: 'Like Our Facebook Post',
          description: 'Show some love by liking our Facebook post!',
          points: 25,
        };
      case 'facebook_comment_post':
        return {
          name: 'Comment on Facebook Post',
          description: 'Share your thoughts by commenting on our Facebook post!',
          points: 30,
        };
      case 'facebook_comment_photo':
        return {
          name: 'Comment on Facebook Photo',
          description: 'Tell us what you think about our Facebook photo!',
          points: 30,
        };
      default:
        return { name: '', description: '', points: 50 };
    }
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];

    // Check Facebook connection first
    if (!facebookConnected) {
      errors.push('You must connect your Facebook account before creating Facebook tasks');
    }

    if (!taskName.trim()) {
      errors.push('Task name is required');
    }
    if (!description.trim()) {
      errors.push('Description is required');
    }
    if (points < 1 || points > 10000) {
      errors.push('Points must be between 1 and 10,000');
    }
    
    if (taskType === 'facebook_like_page') {
      if (!pageUrl.trim()) {
        errors.push('Facebook page URL is required');
      } else if (!pageUrl.includes('facebook.com')) {
        errors.push('Invalid Facebook page URL');
      }
    } else {
      if (!postUrl.trim()) {
        errors.push('Facebook post URL is required');
      } else if (!postUrl.includes('facebook.com')) {
        errors.push('Invalid Facebook post URL');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, pageUrl, postUrl, requiredText, taskType, facebookConnected]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'facebook' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
    };

    if (taskType === 'facebook_like_page') {
      return {
        ...baseConfig,
        settings: {
          pageUrl,
        },
      };
    } else if (taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo') {
      return {
        ...baseConfig,
        settings: {
          postUrl,
          requiredText: requiredText || undefined,
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

  const getTaskTypeLabel = () => {
    switch (taskType) {
      case 'facebook_like_page':
        return 'Like Page';
      case 'facebook_like_post':
        return 'Like Post';
      case 'facebook_comment_post':
        return 'Comment';
      case 'facebook_comment_photo':
        return 'Comment';
      default:
        return 'Facebook Task';
    }
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-blue-600/10 to-blue-400/10 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiFacebook className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-blue-400">Type:</span> {getTaskTypeLabel()}</p>
        <p><span className="text-blue-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-blue-400">Points:</span> {points} points</p>
        <p><span className="text-blue-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiFacebook className="h-6 w-6 text-blue-600" />}
      title="Facebook Task"
      description="Create Facebook-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Facebook tasks help increase your social media engagement. Fans earn points for following your page or liking your posts."
      exampleUse="A creator could offer 50 points for fans to like their Facebook page, or 25 points for liking a specific post announcing an event."
    >
      <div className="space-y-6">
        {/* Facebook Connection Status */}
        {!checkingConnection && !facebookConnected && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Facebook Not Connected</strong>
                  <p className="text-sm mt-1">You must connect your Facebook account before creating Facebook tasks.</p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      await FacebookSDKManager.ensureFBReady('creator');
                      const result = await FacebookSDKManager.secureLogin('creator');
                      
                      if (result.success) {
                        toast({ title: "Facebook Connected! 📘" });
                        // Re-check connection to update UI
                        const response = await fetch('/api/social-connections/facebook', {
                          headers: {
                            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                            'Content-Type': 'application/json'
                          },
                          credentials: 'include'
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          setFacebookConnected(data.connected);
                        }
                      } else {
                        toast({ 
                          title: "Connection Failed",
                          description: result.error || "Failed to connect Facebook",
                          variant: "destructive" 
                        });
                      }
                    } catch (error) {
                      console.error('Facebook connection error:', error);
                      toast({ title: "Error", description: "Failed to connect Facebook", variant: "destructive" });
                    }
                  }}
                  className="bg-[#1877F2] text-white hover:bg-[#1877F2]/80 ml-4"
                >
                  <SiFacebook className="h-4 w-4 mr-2" />
                  Connect Facebook
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!checkingConnection && facebookConnected && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Facebook Connected</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {taskType === 'facebook_like_page' && 'Like Page Configuration'}
              {taskType === 'facebook_like_post' && 'Like Post Configuration'}
              {taskType === 'facebook_comment_post' && 'Comment on Post Configuration'}
              {taskType === 'facebook_comment_photo' && 'Comment on Photo Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-white">Task Name</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Follow us on Facebook"
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what fans need to do"
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
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
                className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!facebookConnected}
              />
              <p className="text-xs text-gray-400">
                How many points fans will earn for completing this task
              </p>
            </div>

            {/* Task-Specific Fields */}
            {taskType === 'facebook_like_page' ? (
              <div className="space-y-2">
                <Label className="text-white">Facebook Page URL</Label>
                <Input
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!facebookConnected}
                />
                <p className="text-xs text-gray-400">
                  The full URL of your Facebook page
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">
                    {taskType === 'facebook_comment_photo' ? 'Facebook Photo URL' : 'Facebook Post URL'}
                  </Label>
                  <Input
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://facebook.com/username/posts/1234567890"
                    className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!facebookConnected}
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the Facebook {taskType === 'facebook_comment_photo' ? 'photo' : 'post'} you want fans to {taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo' ? 'comment on' : 'like'}
                  </p>
                </div>

                {/* Required Text field for comment tasks */}
                {(taskType === 'facebook_comment_post' || taskType === 'facebook_comment_photo') && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Text (Optional)</Label>
                    <Input
                      value={requiredText}
                      onChange={(e) => setRequiredText(e.target.value)}
                      placeholder="e.g., #MyBrand or specific keyword"
                      className={`bg-white/5 border-white/10 text-white ${!facebookConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!facebookConnected}
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
                    Use Facebook API to verify task completion (requires Facebook connection)
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
                      <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <SiFacebook className="h-5 w-5 text-blue-600" />
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

