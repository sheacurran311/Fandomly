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
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useInstagramConnection } from "@/hooks/use-social-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Task type to verification tier mapping for Instagram
// Instagram lacks public API for follows/likes, so those are T3 (manual)
// Code-based tasks (comment with code, mention, keyword) are T2
const INSTAGRAM_TASK_TIERS: Record<string, VerificationTier> = {
  instagram_follow: 'T3',
  instagram_like_post: 'T3',
  comment_code: 'T2',
  mention_story: 'T2',
  keyword_comment: 'T2',
};

interface InstagramTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'instagram_follow' | 'instagram_like_post' | 'comment_code' | 'mention_story' | 'keyword_comment';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function InstagramTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode, programSelector }: InstagramTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get verification tier for this task type
  const tier = INSTAGRAM_TASK_TIERS[taskType] || 'T3';
  const tierGuidance = TIER_GUIDANCE[tier];
  
  // Use unified Instagram connection hook
  const {
    isConnected: instagramConnected,
    isLoading: checkingConnection,
    userInfo: instagramUserInfo,
    connect: connectInstagram,
  } = useInstagramConnection();
  
  // Derived from hook
  const instagramHandle = instagramUserInfo?.username || null;
  
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [username, setUsername] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [requireHashtag, setRequireHashtag] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Auto-populate username when Instagram connects
  useEffect(() => {
    if (instagramConnected && instagramHandle && taskType === 'instagram_follow' && !username && !isEditMode) {
      setUsername(instagramHandle);
    }
  }, [instagramConnected, instagramHandle, taskType, username, isEditMode]);

  // Initialize form with defaults based on task type
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = getDefaultValues();
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);
  
  // Load initial data if editing - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (initialData && isEditMode) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 50);
      
      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};
      
      if (settings.username) {
        setUsername(settings.username);
      }
      if (settings.postUrl || settings.contentUrl) {
        setPostUrl(settings.postUrl || settings.contentUrl);
      }
      if (settings.keyword) {
        setKeyword(settings.keyword);
      }
      if (settings.requireHashtag) {
        setRequireHashtag(settings.requireHashtag);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [initialData, isEditMode]);

  const getDefaultValues = () => {
    // Get tier-appropriate recommended points
    const taskTier = INSTAGRAM_TASK_TIERS[taskType] || 'T3';
    const guidance = TIER_GUIDANCE[taskTier];
    
    switch (taskType) {
      case 'instagram_follow':
        return {
          name: 'Follow on Instagram',
          description: 'Follow us on Instagram to see our latest content!',
          points: 20, // T3: Lower points for manual verification
        };
      case 'instagram_like_post':
        return {
          name: 'Like Our Instagram Post',
          description: 'Show some love by liking our Instagram post!',
          points: 15, // T3: Lower for simple engagement
        };
      case 'comment_code':
        return {
          name: 'Comment on Instagram Post',
          description: 'Comment with your unique code on our Instagram post!',
          points: guidance.recommendedPoints, // T2: 40 pts - code verified
        };
      case 'mention_story':
        return {
          name: 'Mention in Instagram Story',
          description: 'Post an Instagram Story and mention us!',
          points: 50, // T2: Higher for story mention
        };
      case 'keyword_comment':
        return {
          name: 'Comment with Keyword',
          description: 'Comment with the special keyword on our Instagram post!',
          points: guidance.recommendedPoints, // T2: 40 pts - code verified
        };
      default:
        return { name: '', description: '', points: guidance.recommendedPoints };
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
    } else if (taskType === 'mention_story') {
      // Mention story doesn't need post URL, just creator's handle
      if (!instagramHandle) {
        errors.push('Instagram account must be connected for mention story tasks');
      }
    } else {
      // comment_code, keyword_comment, instagram_like all need post URL
      if (!postUrl.trim()) {
        errors.push('Instagram post URL is required');
      } else if (!postUrl.includes('instagram.com')) {
        errors.push('Invalid Instagram post URL');
      }
      
      // keyword_comment needs keyword
      if (taskType === 'keyword_comment' && !keyword.trim()) {
        errors.push('Keyword is required for keyword comment tasks');
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length > 0 ? errors[0] : null;
  };

  // Validate on config changes
  useEffect(() => {
    validateForm();
  }, [taskName, description, points, username, postUrl, keyword, taskType, instagramHandle]);

  const buildTaskConfig = (isDraft: boolean) => {
    const baseConfig = {
      name: taskName,
      description,
      taskType,
      platform: 'instagram' as const,
      points,
      isDraft,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };

    if (taskType === 'instagram_follow') {
      return {
        ...baseConfig,
        settings: {
          username: username.startsWith('@') ? username.substring(1) : username,
        },
      };
    } else if (taskType === 'mention_story') {
      return {
        ...baseConfig,
        settings: {
          creatorUsername: instagramHandle,
          requireHashtag: requireHashtag || undefined,
        },
      };
    } else if (taskType === 'comment_code') {
      // Extract media ID from URL for comment code tasks
      const mediaId = extractMediaIdFromUrl(postUrl);
      return {
        ...baseConfig,
        settings: {
          postUrl,
          mediaUrl: postUrl,
          mediaId,
        },
      };
    } else if (taskType === 'keyword_comment') {
      // Extract media ID from URL for keyword comment tasks
      const mediaId = extractMediaIdFromUrl(postUrl);
      return {
        ...baseConfig,
        settings: {
          postUrl,
          mediaUrl: postUrl,
          mediaId,
          keyword,
        },
      };
    } else {
      // instagram_like
      return {
        ...baseConfig,
        settings: {
          postUrl,
        },
      };
    }
  };

  // Helper function to extract media ID from Instagram URL
  const extractMediaIdFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(s => s);
      // Instagram URLs are like /p/{mediaId}/ or /reel/{mediaId}/
      const mediaIdIndex = (pathSegments.indexOf('p') + 1) || (pathSegments.indexOf('reel') + 1);
      if (mediaIdIndex > 0 && pathSegments[mediaIdIndex]) {
        return pathSegments[mediaIdIndex];
      }
    } catch (error) {
      console.error('Error extracting media ID from URL:', url, error);
    }
    // Fallback: return the last segment of the path
    return url.split('/').filter(s => s).pop() || '';
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
      case 'instagram_follow':
        return 'Follow Account';
      case 'instagram_like_post':
        return 'Like Post';
      case 'comment_code':
        return 'Comment';
      case 'mention_story':
        return 'Mention';
      case 'keyword_comment':
        return 'Comment';
      default:
        return 'Instagram Task';
    }
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-lg border border-pink-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiInstagram className="h-5 w-5 text-pink-500" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-pink-400">Type:</span> {getTaskTypeLabel()}</p>
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
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Instagram tasks help increase your social media engagement. Fans earn points for following your account or liking your posts."
      exampleUse="A creator could offer 50 points for fans to follow them on Instagram, or 25 points for liking a specific post showcasing new merchandise."
    >
      {!instagramConnected && !checkingConnection && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Instagram Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Instagram account before creating Instagram tasks.</p>
              </div>
              <button
                onClick={connectInstagram}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 ml-4"
              >
                Connect Instagram
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {instagramConnected && (
        <Alert className="bg-green-500/10 border-green-500/20">
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
              {taskType === 'instagram_like_post' && 'Like Post Configuration'}
              {taskType === 'comment_code' && 'Comment with Code Configuration'}
              {taskType === 'mention_story' && 'Mention in Story Configuration'}
              {taskType === 'keyword_comment' && 'Comment with Keyword Configuration'}
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

            {/* Verification Tier Guidance */}
            <div className={`p-4 rounded-lg border ${
              tier === 'T1' ? 'bg-green-500/10 border-green-500/30' :
              tier === 'T2' ? 'bg-blue-500/10 border-blue-500/30' :
              'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {tier === 'T1' ? <ShieldCheck className="h-4 w-4 text-green-400" /> :
                 tier === 'T2' ? <Shield className="h-4 w-4 text-blue-400" /> :
                 <ShieldAlert className="h-4 w-4 text-amber-400" />}
                <span className={`font-medium ${
                  tier === 'T1' ? 'text-green-400' :
                  tier === 'T2' ? 'text-blue-400' :
                  'text-amber-400'
                }`}>{tierGuidance.label}</span>
                <Badge variant="outline" className={`text-xs ${
                  tier === 'T1' ? 'border-green-500/30 text-green-400' :
                  tier === 'T2' ? 'border-blue-500/30 text-blue-400' :
                  'border-amber-500/30 text-amber-400'
                }`}>
                  {tierGuidance.trustLevel}
                </Badge>
              </div>
              <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
              <p className={`text-sm font-medium ${
                tier === 'T1' ? 'text-green-400' :
                tier === 'T2' ? 'text-blue-400' :
                'text-amber-400'
              }`}>{tierGuidance.pointsRange}</p>
              {tierGuidance.warning && (
                <p className="text-xs text-amber-400 mt-2">{tierGuidance.warning}</p>
              )}
              {tierGuidance.tip && (
                <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
              )}
            </div>

            {/* Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Points Reward</Label>
                <span className="text-xs text-gray-400">
                  Recommended: {tierGuidance.recommendedPoints} pts
                </span>
              </div>
              <NumberInput
                value={points}
                onChange={(val) => setPoints(val || tierGuidance.recommendedPoints)}
                min={1}
                max={10000}
                allowEmpty={false}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                How many points fans will earn for completing this task
              </p>
              {tier === 'T3' && points > 25 && (
                <p className="text-xs text-amber-400">
                  ⚠️ High points for a manually verified task. Consider lowering to reduce abuse potential.
                </p>
              )}
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
            ) : taskType === 'mention_story' ? (
              <div className="space-y-2">
                <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fans will post an Instagram Story mentioning your connected Instagram account (@{instagramHandle || 'your_username'}).
                    No post URL is required - the task verifies automatically when they mention you.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2 mt-4">
                  <Label className="text-white">Required Hashtag (Optional)</Label>
                  <Input
                    value={requireHashtag}
                    onChange={(e) => setRequireHashtag(e.target.value)}
                    placeholder="#MyBrand (optional)"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    If specified, fans must also include this hashtag in their Story
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Instagram Post URL</Label>
                  <Input
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://instagram.com/p/ABC123..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    The full URL of the Instagram post you want fans to {taskType === 'comment_code' || taskType === 'keyword_comment' ? 'comment on' : 'like'}
                  </p>
                </div>

                {/* Keyword field for keyword_comment tasks */}
                {taskType === 'keyword_comment' && (
                  <div className="space-y-2">
                    <Label className="text-white">Required Keyword</Label>
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g., #Fandomly or 'Awesome!'"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-400">
                      Fans must include this exact keyword or hashtag in their comment
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Locked Frequency Display */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-white font-semibold">Reward Frequency</Label>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">
                    Social engagement tasks are one-time only
                  </p>
                </div>
                <Badge variant="outline" className="border-pink-500/30 text-pink-400">
                  One-time
                </Badge>
              </div>
              <Alert className="bg-pink-500/10 border-pink-500/20">
                <Info className="h-4 w-4 text-pink-400" />
                <AlertDescription className="text-pink-400 text-sm">
                  This task can only be completed once per user. Multipliers and verification cadence can be configured at the campaign level.
                </AlertDescription>
              </Alert>
            </div>

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

