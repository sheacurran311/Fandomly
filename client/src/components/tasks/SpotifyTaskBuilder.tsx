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
import { CheckCircle2, AlertCircle } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import TaskBuilderBase from "./TaskBuilderBase";
import { SocialIntegrationManager } from "@/lib/social-integrations";

interface SpotifyTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType: 'spotify_follow' | 'spotify_playlist';
  initialData?: any;
  isEditMode?: boolean;
}

export default function SpotifyTaskBuilder({ onSave, onPublish, onBack, taskType, initialData, isEditMode }: SpotifyTaskBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [artistUrl, setArtistUrl] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [useApiVerification, setUseApiVerification] = useState(true); // Automatic verification by default
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check if Spotify is connected
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      try {
        const response = await fetch('/api/social-connections/spotify', {
          headers: {
            'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setSpotifyConnected(data.connected);
        } else {
          setSpotifyConnected(false);
        }
      } catch (error) {
        console.error('[SpotifyTaskBuilder] Error checking Spotify connection:', error);
        setSpotifyConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    
    if (user?.id) {
      checkSpotifyConnection();
    }
  }, [user?.id, user?.dynamicUserId]);

  useEffect(() => {
    if (!isEditMode && !taskName) {
      const defaults = taskType === 'spotify_follow' 
        ? { name: 'Follow on Spotify', description: 'Follow us on Spotify!', points: 50 }
        : { name: 'Follow Our Spotify Playlist', description: 'Follow our Spotify playlist!', points: 75 };
      setTaskName(defaults.name);
      setDescription(defaults.description);
      setPoints(defaults.points);
    }
  }, [taskType, isEditMode]);

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
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Spotify tasks help grow your music presence."
      exampleUse="Offer 50 points for following you on Spotify or 75 points for following a playlist."
    >
      {!spotifyConnected && !checkingConnection && (
        <Alert className="mb-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <strong>Spotify Not Connected</strong>
                <p className="text-sm mt-1">You must connect your Spotify account before creating Spotify tasks.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const socialManager = new SocialIntegrationManager();
                    const result = await socialManager['spotify'].secureLogin();
                    
                    if (result.success) {
                      toast({ title: "Spotify Connected! 🎧" });
                      // Re-check connection
                      const response = await fetch('/api/social-connections/spotify', {
                        headers: {
                          'x-dynamic-user-id': user?.dynamicUserId || user?.id || '',
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setSpotifyConnected(data.connected || false);
                        setCheckingConnection(false);
                      }
                    } else {
                      toast({ 
                        title: "Connection Failed",
                        description: result.error || "Failed to connect Spotify",
                        variant: "destructive" 
                      });
                    }
                  } catch (error) {
                    console.error('Spotify connection error:', error);
                    toast({ title: "Error", description: "Failed to connect Spotify", variant: "destructive" });
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-4"
              >
                Connect Spotify
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {spotifyConnected && (
        <Alert className="mb-4 bg-green-500/10 border-green-500/20">
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
          <div className="space-y-2">
            <Label className="text-white">Points Reward</Label>
            <NumberInput value={points} onChange={(val) => setPoints(val || 1)} min={1} max={10000} allowEmpty={false} className="bg-white/5 border-white/10 text-white" />
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

