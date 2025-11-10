/**
 * TikTok Task Builder Component
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { SocialIntegrationManager } from "@/lib/social-integrations";

interface TikTokTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'tiktok_follow' | 'tiktok_like' | 'tiktok_comment';
  initialData?: any;
  isEditMode?: boolean;
}

export default function TikTokTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode }: TikTokTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [username, setUsername] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [requiredText, setRequiredText] = useState(''); // For comment tasks
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check if TikTok is connected
  useEffect(() => {
    const checkTikTokConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/tiktok', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setTiktokConnected(data.connected);
          
          // Auto-fill username for follow tasks
          if (data.connected && data.connection && taskType === 'tiktok_follow' && !username) {
            const tiktokUsername = data.connection.platformUsername || data.connection.platformDisplayName;
            if (tiktokUsername) {
              setUsername(tiktokUsername);
            }
          }
        } else {
          setTiktokConnected(false);
        }
      } catch (error) {
        console.error('[TikTokTaskBuilder] Error checking TikTok connection:', error);
        setTiktokConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    
    if (user?.id) {
      checkTikTokConnection();
    }
  }, [user?.id, user?.dynamicUserId, taskType]);

  useEffect(() => {
    if (!isEditMode && !taskName) {
      let defaults;
      switch (taskType) {
        case 'tiktok_follow':
          defaults = { name: 'Follow on TikTok', description: 'Follow us on TikTok!', points: 50 };
          break;
        case 'tiktok_like':
          defaults = { name: 'Like Our TikTok Video', description: 'Like our TikTok video!', points: 25 };
          break;
        case 'tiktok_comment':
          defaults = { name: 'Comment on TikTok Video', description: 'Leave a comment on our TikTok video!', points: 50 };
          break;
        default:
          defaults = { name: '', description: '', points: 50 };
      }
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);

  useEffect(() => {
    const errors: string[] = [];
    
    // Check TikTok connection first
    if (!tiktokConnected) {
      errors.push('You must connect your TikTok account before creating TikTok tasks');
    }
    
    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (taskType === 'tiktok_follow' && !username.trim()) errors.push('TikTok username is required');
    if ((taskType === 'tiktok_like' || taskType === 'tiktok_comment') && !videoUrl.trim()) errors.push('TikTok video URL is required');
    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, username, videoUrl, requiredText, taskType, tiktokConnected]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({ title: "Validation Error", description: validationErrors[0], variant: "destructive" });
      return;
    }
    
    let settings: any;
    if (taskType === 'tiktok_follow') {
      settings = { username: username.replace('@', '') };
    } else {
      settings = { videoUrl };
      if (taskType === 'tiktok_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
    }
    
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'tiktok' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    let settings: any;
    if (taskType === 'tiktok_follow') {
      settings = { username: username.replace('@', '') };
    } else {
      settings = { videoUrl };
      if (taskType === 'tiktok_comment' && requiredText.trim()) {
        settings.requiredText = requiredText;
      }
    }
    
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'tiktok' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-pink-600/10 to-blue-400/10 rounded-lg border border-pink-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiTiktok className="h-5 w-5" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-pink-400">Type:</span> {taskType === 'tiktok_follow' ? 'Follow User' : taskType === 'tiktok_comment' ? 'Comment' : 'Like Video'}</p>
        <p><span className="text-pink-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-pink-400">Points:</span> {points} points</p>
        <p><span className="text-pink-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiTiktok className="h-6 w-6" />}
      title="TikTok Task"
      description="Create TikTok-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="TikTok tasks help grow your presence on TikTok."
      exampleUse="Offer 50 points for following you on TikTok or 25 points for liking a video."
    >
      {!tiktokConnected && !checkingConnection && (
        <Alert className="mb-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>TikTok Not Connected</strong>
                <p className="text-sm mt-1">You must connect your TikTok account before creating TikTok tasks.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const socialManager = new SocialIntegrationManager();
                    const result = await socialManager['tiktok'].secureLogin();
                    
                    if (result.success) {
                      toast({ title: "TikTok Connected! 🎵" });
                      // Re-check connection
                      const response = await fetch('/api/social-connections/tiktok', {
                        headers: {
                          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setTiktokConnected(data.connected || false);
                        setCheckingConnection(false);
                      }
                    } else {
                      toast({ 
                        title: "Connection Failed",
                        description: result.error || "Failed to connect TikTok",
                        variant: "destructive" 
                      });
                    }
                  } catch (error) {
                    console.error('TikTok connection error:', error);
                    toast({ title: "Error", description: "Failed to connect TikTok", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 ml-4"
              >
                Connect TikTok
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {tiktokConnected && (
        <Alert className="mb-4 bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>TikTok Connected</strong> - Your TikTok account is linked and ready to use.
          </AlertDescription>
        </Alert>
      )}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {taskType === 'tiktok_follow' ? 'Follow Configuration' : taskType === 'tiktok_comment' ? 'Comment Configuration' : 'Like Video Configuration'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Points Reward</Label>
            <NumberInput value={points} onChange={(val) => setPoints(val || 1)} min={1} max={10000} allowEmpty={false} className="bg-white/5 border-white/10 text-white" />
          </div>
          {taskType === 'tiktok_follow' ? (
            <div className="space-y-2">
              <Label className="text-white">TikTok Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="bg-white/5 border-white/10 text-white" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">TikTok Video URL</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://tiktok.com/@user/video/..." className="bg-white/5 border-white/10 text-white" />
                <p className="text-xs text-gray-400">
                  The full URL of the TikTok video you want fans to {taskType === 'tiktok_comment' ? 'comment on' : 'like'}
                </p>
              </div>
              
              {/* Required Text for Comment Tasks */}
              {taskType === 'tiktok_comment' && (
                <div className="space-y-2">
                  <Label className="text-white">Required Text (Optional)</Label>
                  <Input
                    value={requiredText}
                    onChange={(e) => setRequiredText(e.target.value)}
                    placeholder="e.g., #Fandomly or 'Great content!'"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    If specified, fans must include this text in their comment
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-white font-semibold">Automatic Verification</Label>
              <Switch checked={useApiVerification} onCheckedChange={setUseApiVerification} />
            </div>
            {useApiVerification ? (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400 text-sm"><strong>Instant Rewards</strong></AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400 text-sm"><strong>Manual Verification</strong></AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </TaskBuilderBase>
  );
}

