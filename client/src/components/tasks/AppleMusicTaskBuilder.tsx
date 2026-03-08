/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Apple Music Task Builder Component
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Lock, Info, ShieldCheck, Search, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppleMusicConnection } from '@/hooks/use-social-connection';
import TaskBuilderBase from './TaskBuilderBase';
import { TIER_GUIDANCE, type VerificationTier } from '@shared/taskTemplates';

const APPLE_MUSIC_TASK_TIERS: Record<string, VerificationTier> = {
  apple_music_favorite_artist: 'T1',
  apple_music_add_track: 'T1',
  apple_music_add_album: 'T1',
  apple_music_add_playlist: 'T1',
  apple_music_listen: 'T2',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  apple_music_favorite_artist: 'Add Artist to Library',
  apple_music_add_track: 'Add Track to Library',
  apple_music_add_album: 'Add Album to Library',
  apple_music_add_playlist: 'Add Playlist to Library',
  apple_music_listen: 'Listen to Track',
};

interface SearchResult {
  id: string;
  name: string;
  artistName?: string;
  albumName?: string;
  artwork?: string;
  url?: string;
}

interface AppleMusicTaskBuilderProps {
  onSave: (config: any) => void;
  onPublish: (config: any) => void;
  onBack: () => void;
  taskType:
    | 'apple_music_favorite_artist'
    | 'apple_music_add_track'
    | 'apple_music_add_album'
    | 'apple_music_add_playlist'
    | 'apple_music_listen';
  initialData?: any;
  isEditMode?: boolean;
  programSelector?: React.ReactNode;
}

export default function AppleMusicTaskBuilder({
  onSave,
  onPublish,
  onBack,
  taskType,
  initialData,
  isEditMode,
  programSelector,
}: AppleMusicTaskBuilderProps) {
  const { toast } = useToast();

  const tier = APPLE_MUSIC_TASK_TIERS[taskType] || 'T1';
  const tierGuidance = TIER_GUIDANCE[tier];

  const {
    isConnected: appleMusicConnected,
    isLoading: checkingConnection,
    connect: connectAppleMusic,
  } = useAppleMusicConnection();

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(tierGuidance.recommendedPoints);
  const [useApiVerification, setUseApiVerification] = useState(tier === 'T1');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);

  // For playlist tasks where search isn't available
  const [playlistId, setPlaylistId] = useState('');

  // Set defaults for new tasks
  useEffect(() => {
    if (!isEditMode && !taskName) {
      const label = TASK_TYPE_LABELS[taskType] || 'Apple Music Task';
      setTaskName(label);
      setDescription(`${label} on Apple Music!`);
    }
  }, [taskType, isEditMode, taskName]);

  // Load initial data for edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setTaskName(initialData.name || '');
      setDescription(initialData.description || '');
      setPoints(initialData.pointsToReward || initialData.points || 50);

      const settings = initialData.settings || initialData.customSettings || {};
      if (settings.artistId || settings.trackId || settings.albumId) {
        setSelectedItem({
          id: settings.artistId || settings.trackId || settings.albumId,
          name: settings.artistName || settings.trackName || settings.albumName || '',
        });
      }
      if (settings.playlistId) {
        setPlaylistId(settings.playlistId);
      }
      setUseApiVerification(initialData.verificationMethod === 'api');
    }
  }, [isEditMode, initialData]);

  // Search Apple Music catalog
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const searchType =
        taskType === 'apple_music_favorite_artist'
          ? 'artists'
          : taskType === 'apple_music_add_track' || taskType === 'apple_music_listen'
            ? 'songs'
            : taskType === 'apple_music_add_album'
              ? 'albums'
              : 'artists';

      const res = await fetch(
        `/api/social/apple-music/search/${searchType}?query=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        toast({
          title: 'Search Failed',
          description: 'Could not search Apple Music catalog.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[AppleMusic Search] Error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, taskType, toast]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (!appleMusicConnected) {
      errors.push('You must connect your Apple Music account before creating Apple Music tasks');
    }

    if (!taskName.trim()) errors.push('Task name is required');
    if (!description.trim()) errors.push('Description is required');
    if (points < 1 || points > 10000) errors.push('Points must be between 1 and 10,000');

    if (taskType === 'apple_music_add_playlist') {
      if (!playlistId.trim()) errors.push('Playlist ID is required');
    } else if (!selectedItem) {
      errors.push(
        `Please search and select a ${taskType.includes('artist') ? 'artist' : taskType.includes('track') || taskType.includes('listen') ? 'track' : 'album'}`
      );
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [taskName, description, points, taskType, appleMusicConnected, selectedItem, playlistId]);

  const getTaskSettings = () => {
    switch (taskType) {
      case 'apple_music_favorite_artist':
        return { artistId: selectedItem?.id, artistName: selectedItem?.name };
      case 'apple_music_add_track':
      case 'apple_music_listen':
        return { trackId: selectedItem?.id, trackName: selectedItem?.name };
      case 'apple_music_add_album':
        return { albumId: selectedItem?.id, albumName: selectedItem?.name };
      case 'apple_music_add_playlist':
        return { playlistId };
      default:
        return {};
    }
  };

  const handlePublishClick = () => {
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }
    onPublish({
      name: taskName,
      description,
      taskType,
      platform: 'apple_music' as const,
      points,
      isDraft: false,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: getTaskSettings(),
      rewardFrequency: 'one_time' as const,
    });
  };

  const handleSaveClick = () => {
    onSave({
      name: taskName,
      description,
      taskType,
      platform: 'apple_music' as const,
      points,
      isDraft: true,
      verificationMethod: useApiVerification ? 'api' : 'manual',
      settings: getTaskSettings(),
      rewardFrequency: 'one_time' as const,
    });
  };

  const previewComponent = (
    <div className="p-4 bg-gradient-to-r from-pink-600/10 to-pink-400/10 rounded-lg border border-pink-500/20">
      <div className="flex items-center gap-3 mb-3">
        <Music className="h-5 w-5 text-pink-500" />
        <h4 className="font-semibold text-white">Task Preview</h4>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-pink-400">Type:</span> {TASK_TYPE_LABELS[taskType]}
        </p>
        <p>
          <span className="text-pink-400">Name:</span> {taskName || 'Untitled Task'}
        </p>
        <p>
          <span className="text-pink-400">Points:</span> {points} points
        </p>
        <p>
          <span className="text-pink-400">Verification:</span>{' '}
          {useApiVerification ? 'API (T1)' : 'Manual (T2)'}
        </p>
        {selectedItem && (
          <p>
            <span className="text-pink-400">Selected:</span> {selectedItem.name}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <TaskBuilderBase
      icon={<Music className="h-6 w-6 text-pink-500" />}
      title="Apple Music Task"
      description="Create Apple Music-based tasks for your fans"
      category="Social Engagement"
      previewComponent={previewComponent}
      programSelector={programSelector}
      onBack={onBack}
      onSaveDraft={handleSaveClick}
      onPublish={handlePublishClick}
      isValid={isValid}
      validationErrors={validationErrors}
      helpText="Apple Music tasks help fans discover and save your music."
      exampleUse="Offer 50 points for adding your artist profile to their Apple Music library."
    >
      {/* Connection status */}
      {!appleMusicConnected && !checkingConnection && (
        <Alert className="border-yellow-500/30 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            Connect your Apple Music account to enable API verification.
            <Button
              variant="link"
              className="text-pink-400 p-0 ml-2 h-auto"
              onClick={connectAppleMusic}
            >
              Connect Apple Music
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {appleMusicConnected && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-200">
            Apple Music connected. API verification is available for this task.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification tier badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-pink-500/30 text-pink-400">
          <ShieldCheck className="h-3 w-3 mr-1" />
          {tier === 'T1' ? 'API Verified (T1)' : 'Manual Review (T2)'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {tier === 'T1'
            ? 'Automatically verified via Apple Music API'
            : 'Requires manual review by creator'}
        </span>
      </div>

      {/* Task name, description, and points */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">{TASK_TYPE_LABELS[taskType]} Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Task Name</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Points</Label>
            <NumberInput
              value={points}
              onChange={(v) => setPoints(v ?? 1)}
              min={1}
              max={10000}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Search and selection - for non-playlist tasks */}
      {taskType !== 'apple_music_add_playlist' ? (
        <div className="space-y-3">
          <Label className="text-white">
            Search{' '}
            {taskType.includes('artist')
              ? 'Artist'
              : taskType.includes('track') || taskType.includes('listen')
                ? 'Track'
                : 'Album'}
          </Label>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search Apple Music ${taskType.includes('artist') ? 'artists' : taskType.includes('track') || taskType.includes('listen') ? 'songs' : 'albums'}...`}
              className="bg-white/5 border-white/20 text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="border-white/20"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-pink-500/20 border border-pink-500/40'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  {item.artwork && (
                    <img src={item.artwork} alt={item.name} className="w-10 h-10 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    {item.artistName && (
                      <p className="text-muted-foreground text-xs truncate">{item.artistName}</p>
                    )}
                  </div>
                  {selectedItem?.id === item.id && (
                    <CheckCircle2 className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedItem && (
            <div className="flex items-center gap-2 p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <CheckCircle2 className="h-4 w-4 text-pink-500" />
              <span className="text-sm text-white">Selected: {selectedItem.name}</span>
              <span className="text-xs text-muted-foreground">ID: {selectedItem.id}</span>
            </div>
          )}
        </div>
      ) : (
        /* Playlist ID input */
        <div className="space-y-2">
          <Label className="text-white">Playlist ID</Label>
          <Input
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            placeholder="Enter Apple Music playlist ID"
            className="bg-white/5 border-white/20 text-white"
          />
          <p className="text-xs text-muted-foreground">
            The playlist ID can be found in the Apple Music share URL.
          </p>
        </div>
      )}

      {/* API verification toggle - only for T1 tasks */}
      {tier === 'T1' && (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-pink-400" />
            <span className="text-white text-sm">API Verification</span>
          </div>
          <Switch checked={useApiVerification} onCheckedChange={setUseApiVerification} />
        </div>
      )}

      {tier === 'T2' && (
        <Alert className="border-yellow-500/30 bg-yellow-500/10">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            This task type requires manual review. Apple Music does not expose play history via
            their public API.
          </AlertDescription>
        </Alert>
      )}
    </TaskBuilderBase>
  );
}
