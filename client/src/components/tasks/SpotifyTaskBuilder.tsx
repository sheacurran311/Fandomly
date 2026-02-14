/**
 * Spotify Task Builder Component
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSpotifyConnection } from "@/hooks/use-social-connection";
import TaskBuilderBase from "./TaskBuilderBase";
import { TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

// Spotify has excellent API support - all tasks are T1 (fully automated)
const SPOTIFY_TASK_TIERS: Record<string, VerificationTier> = {
  spotify_follow: 'T1',
  spotify_playlist: 'T1',
};

interface SpotifyTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'spotify_follow' | 'spotify_playlist';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function SpotifyTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode, programSelector }: SpotifyTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get verification tier for this task type (all Spotify tasks are T1)
  const tier = SPOTIFY_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];
  
  // Use unified Spotify connection hook
  const {
    isConnected: spotifyConnected,
    isLoading: checkingConnection,
    connect: connectSpotify,
    userInfo: spotifyUserInfo,
  } = useSpotifyConnection();
  
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [artistUrl, setArtistUrl] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!isEditMode && !taskName) {
      // All Spotify tasks are T1 with API verification
      const defaults = taskType === 'spotify_follow' 
        ? { name: 'Follow on Spotify', description: 'Follow us on Spotify!', points: tierGuidance.recommendedPoints }
        : { name: 'Follow Our Spotify Playlist', description: 'Follow our Spotify playlist!', points: 75 }; // Higher for playlist
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);

  // Load initial data for edit mode - check both settings and customSettings (backend stores in customSettings)
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 50);
      
      // Check both settings and customSettings (backend stores in customSettings)
      const settings = initialData.settings || initialData.customSettings || {};
      
      setArtistUrl(settings.artistUrl || settings.contentUrl || '');
      setPlaylistUrl(settings.playlistUrl || settings.contentUrl || '');
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData]);

  // Auto-populate from connected Spotify profile when creating new tasks
  useEffect(() => {
    if (!isEditMode && spotifyConnected && spotifyUserInfo) {
      const profileUrl =
        (spotifyUserInfo as any)?.profileData?.external_urls?.spotify ||
        (spotifyUserInfo.id ? `https://open.spotify.com/user/${spotifyUserInfo.id}` : undefined);

      if (taskType === 'spotify_follow' && !artistUrl && profileUrl) {
        setArtistUrl(profileUrl);
      }
      if (taskType === 'spotify_playlist' && !playlistUrl && profileUrl) {
        setPlaylistUrl(profileUrl);
      }
    }
  }, [isEditMode, spotifyConnected, spotifyUserInfo, taskType, artistUrl, playlistUrl]);

  useEffect(() => {
    const errors: string[] = [];
    
    // Check Spotify connection first
    if (!spotifyConnected) {
      errors.push('You must connect your Spotify account before creating Spotify tasks');
    }
    
    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');
    if (taskType === 'spotify_follow' && !artistUrl.trim()) errors.push('Spotify artist URL is required');
    if (taskType === 'spotify_playlist' && !playlistUrl.trim()) errors.push('Spotify playlist URL is required');
    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, artistUrl, playlistUrl, taskType, spotifyConnected]);

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({ title: "Validation Error", description: validationErrors[0], variant: "destructive" });
      return;
    }
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'spotify' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: taskType === 'spotify_follow' ? { artistUrl } : { playlistUrl },
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onPublish(config);
  };

  const handleSaveClick = () => {
    const config = {
      name: taskName,
      description,
      taskType,
      platform: 'spotify' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: taskType === 'spotify_follow' ? { artistUrl } : { playlistUrl },
      // Social engagement tasks are always one-time (cadence/multipliers handled in campaigns)
      rewardFrequency: 'one_time' as const,
    };
    onSave(config);
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-green-600/10 to-green-400/10 rounded-lg border border-green-500/20">
      <div className="flex items-center gap-3 mb-3">
        <SiSpotify className="h-5 w-5 text-green-500" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-green-400">Type:</span> {taskType === 'spotify_follow' ? 'Follow Artist' : 'Follow Playlist'}</p>
        <p><span className="text-green-400">Name:</span> {taskName || 'Untitled Task'}</p>
        <p><span className="text-green-400">Points:</span> {points} points</p>
        <p><span className="text-green-400">Verification:</span> {useApiVerification ? 'API' : 'Manual'}</p>
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<SiSpotify className="h-6 w-6 text-green-500" />}
      title="Spotify Task"
      description="Create Spotify-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Spotify tasks help grow your music presence."
      exampleUse="Offer 50 points for following you on Spotify or 75 points for following a playlist."
    >
      <div className="space-y-6">
      {!spotifyConnected && !checkingConnection && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Spotify Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Spotify account before creating Spotify tasks.</p>
              </div>
              <button
                onClick={connectSpotify}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-4"
              >
                Connect Spotify
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {spotifyConnected && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Spotify Connected</strong> - Your Spotify account is linked and ready to use.
          </AlertDescription>
        </Alert>
      )}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {taskType === 'spotify_follow' ? 'Follow Artist Configuration' : 'Follow Playlist Configuration'}
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
          {/* Verification Tier Guidance */}
          <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="font-medium text-green-400">{tierGuidance.label}</span>
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                {tierGuidance.trustLevel}
              </Badge>
            </div>
            <p className="text-sm text-gray-300 mb-2">{tierGuidance.description}</p>
            <p className="text-sm font-medium text-green-400">{tierGuidance.pointsRange}</p>
            {tierGuidance.tip && (
              <p className="text-xs text-gray-400 mt-2 italic">{tierGuidance.tip}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white">Points Reward</Label>
              <span className="text-xs text-gray-400">
                Recommended: {tierGuidance.recommendedPoints} pts
              </span>
            </div>
            <NumberInput value={points} onChange={(val) => setPoints(val || tierGuidance.recommendedPoints)} min={1} max={10000} allowEmpty={false} className="bg-white/5 border-white/10 text-white" />
          </div>
          {taskType === 'spotify_follow' ? (
            <div className="space-y-2">
              <Label className="text-white">Spotify Artist URL</Label>
              <Input value={artistUrl} onChange={(e) => setArtistUrl(e.target.value)} placeholder="https://open.spotify.com/artist/..." className="bg-white/5 border-white/10 text-white" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-white">Spotify Playlist URL</Label>
              <Input value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." className="bg-white/5 border-white/10 text-white" />
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
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                One-time
              </Badge>
            </div>
            <Alert className="bg-green-500/10 border-green-500/20">
              <Info className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400 text-sm">
                This task can only be completed once per user. Multipliers and verification cadence can be configured at the campaign level.
              </AlertDescription>
            </Alert>
          </div>

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
      </div>
    </TaskBuilderBase>
  );
}

