import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  Trophy,
  Calendar,
  Star,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Group goal configuration
 */
export interface GroupGoalConfig {
  title: string;
  description: string;
  platform: string;
  metricType: string;
  targetValue: number;
  contentId: string;
  startsAt?: Date;
  endsAt?: Date;
  rewardPoints: number;
  maxParticipants?: number;
}

/**
 * Props for GroupGoalBuilder component
 */
interface GroupGoalBuilderProps {
  initialConfig?: Partial<GroupGoalConfig>;
  onSave?: (config: GroupGoalConfig) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Platform options
 */
const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X (Twitter)', emoji: '𝕏' },
  { value: 'instagram', label: 'Instagram', emoji: '📷' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'youtube', label: 'YouTube', emoji: '▶️' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'twitch', label: 'Twitch', emoji: '🎮' },
  { value: 'kick', label: 'Kick', emoji: '🟢' },
];

/**
 * Metric types by platform
 */
const METRIC_OPTIONS: Record<string, Array<{ value: string; label: string; icon: string }>> = {
  twitter: [
    { value: 'likes', label: 'Total Likes', icon: '❤️' },
    { value: 'retweets', label: 'Total Retweets', icon: '🔁' },
    { value: 'replies', label: 'Total Replies', icon: '💬' },
    { value: 'followers', label: 'Follower Count', icon: '👥' },
  ],
  instagram: [
    { value: 'likes', label: 'Total Likes', icon: '❤️' },
    { value: 'comments', label: 'Total Comments', icon: '💬' },
    { value: 'followers', label: 'Follower Count', icon: '👥' },
  ],
  facebook: [
    { value: 'likes', label: 'Total Likes', icon: '👍' },
    { value: 'reactions', label: 'Total Reactions', icon: '❤️' },
    { value: 'comments', label: 'Total Comments', icon: '💬' },
    { value: 'shares', label: 'Total Shares', icon: '🔄' },
  ],
  youtube: [
    { value: 'likes', label: 'Total Likes', icon: '👍' },
    { value: 'views', label: 'Total Views', icon: '👀' },
    { value: 'comments', label: 'Total Comments', icon: '💬' },
    { value: 'subscribers', label: 'Subscriber Count', icon: '🔔' },
  ],
  tiktok: [
    { value: 'likes', label: 'Total Likes', icon: '❤️' },
    { value: 'views', label: 'Total Views', icon: '👀' },
    { value: 'comments', label: 'Total Comments', icon: '💬' },
    { value: 'shares', label: 'Total Shares', icon: '🔄' },
  ],
  twitch: [
    { value: 'concurrent_viewers', label: 'Concurrent Viewers', icon: '👥' },
    { value: 'followers', label: 'Follower Count', icon: '❤️' },
    { value: 'subscribers', label: 'Subscriber Count', icon: '⭐' },
  ],
  kick: [
    { value: 'concurrent_viewers', label: 'Concurrent Viewers', icon: '👥' },
    { value: 'followers', label: 'Follower Count', icon: '❤️' },
  ],
};

/**
 * Default values
 */
const DEFAULT_CONFIG: GroupGoalConfig = {
  title: '',
  description: '',
  platform: 'twitter',
  metricType: 'likes',
  targetValue: 1000,
  contentId: '',
  rewardPoints: 100,
};

/**
 * GroupGoalBuilder Component
 * 
 * Creator interface for building and configuring group goal tasks.
 * Group goals are community challenges where fans work together
 * to reach aggregate metrics on social platforms.
 */
export function GroupGoalBuilder({
  initialConfig,
  onSave,
  onCancel,
  isLoading = false,
  className,
}: GroupGoalBuilderProps) {
  const [config, setConfig] = useState<GroupGoalConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [hasTimeLimit, setHasTimeLimit] = useState(!!initialConfig?.endsAt);
  const [hasMaxParticipants, setHasMaxParticipants] = useState(!!initialConfig?.maxParticipants);

  const updateConfig = <K extends keyof GroupGoalConfig>(key: K, value: GroupGoalConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handlePlatformChange = (platform: string) => {
    updateConfig('platform', platform);
    // Reset metric type to first available for new platform
    const metrics = METRIC_OPTIONS[platform];
    if (metrics && metrics.length > 0) {
      updateConfig('metricType', metrics[0].value);
    }
  };

  const handleSubmit = () => {
    if (onSave) {
      const finalConfig = { ...config };
      if (!hasTimeLimit) {
        delete finalConfig.endsAt;
        delete finalConfig.startsAt;
      }
      if (!hasMaxParticipants) {
        delete finalConfig.maxParticipants;
      }
      onSave(finalConfig);
    }
  };

  const selectedPlatform = PLATFORM_OPTIONS.find(p => p.value === config.platform);
  const availableMetrics = METRIC_OPTIONS[config.platform] || [];
  const selectedMetric = availableMetrics.find(m => m.value === config.metricType);

  const isValid = config.title && config.targetValue > 0 && config.contentId && config.rewardPoints > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Create Group Goal</h2>
          <p className="text-sm text-muted-foreground">
            Rally your community to reach a shared milestone
          </p>
        </div>
      </div>

      {/* Goal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal Information</CardTitle>
          <CardDescription>Name and describe your community goal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Help us reach 10,000 likes!"
              value={config.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the goal and why it matters to your community..."
              value={config.description}
              onChange={(e) => updateConfig('description', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Platform & Metric */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Metric
          </CardTitle>
          <CardDescription>What should your community achieve?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Platform *</Label>
              <Select value={config.platform} onValueChange={handlePlatformChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <span className="flex items-center gap-2">
                        <span>{platform.emoji}</span>
                        <span>{platform.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Metric Type *</Label>
              <Select 
                value={config.metricType} 
                onValueChange={(value) => updateConfig('metricType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      <span className="flex items-center gap-2">
                        <span>{metric.icon}</span>
                        <span>{metric.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="contentId">Content ID *</Label>
            <Input
              id="contentId"
              placeholder={
                config.platform === 'youtube' ? 'Video or Channel ID' :
                config.platform === 'twitch' || config.platform === 'kick' ? 'Channel ID' :
                'Post/Tweet ID'
              }
              value={config.contentId}
              onChange={(e) => updateConfig('contentId', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The ID of the post, video, or channel to track metrics for
            </p>
          </div>

          <div>
            <Label htmlFor="targetValue">Target Value *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="targetValue"
                type="number"
                min="1"
                value={config.targetValue}
                onChange={(e) => updateConfig('targetValue', parseInt(e.target.value) || 0)}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedMetric?.label || 'units'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Rewards
          </CardTitle>
          <CardDescription>What do participants earn when the goal is reached?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rewardPoints">Points per Participant *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-5 w-5 text-yellow-500" />
              <Input
                id="rewardPoints"
                type="number"
                min="1"
                value={config.rewardPoints}
                onChange={(e) => updateConfig('rewardPoints', parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">points</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Each participant who joins before the goal is reached will earn these points
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Optional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Optional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Time Limit</Label>
                <p className="text-xs text-muted-foreground">Goal expires at a specific time</p>
              </div>
              <Switch checked={hasTimeLimit} onCheckedChange={setHasTimeLimit} />
            </div>
            
            {hasTimeLimit && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div>
                  <Label htmlFor="startsAt">Starts At</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={config.startsAt?.toISOString().slice(0, 16) || ''}
                    onChange={(e) => updateConfig('startsAt', e.target.value ? new Date(e.target.value) : undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endsAt">Ends At *</Label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={config.endsAt?.toISOString().slice(0, 16) || ''}
                    onChange={(e) => updateConfig('endsAt', e.target.value ? new Date(e.target.value) : undefined)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Max Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Participant Limit</Label>
                <p className="text-xs text-muted-foreground">Limit how many fans can join</p>
              </div>
              <Switch checked={hasMaxParticipants} onCheckedChange={setHasMaxParticipants} />
            </div>
            
            {hasMaxParticipants && (
              <div className="pl-4 border-l-2 border-muted">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={config.maxParticipants || ''}
                  onChange={(e) => updateConfig('maxParticipants', parseInt(e.target.value) || undefined)}
                  className="mt-1 w-32"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
              {selectedPlatform?.emoji || '🎯'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{config.title || 'Group Goal Title'}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description || 'Goal description will appear here...'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="secondary">
                  <Target className="h-3 w-3 mr-1" />
                  {config.targetValue.toLocaleString()} {selectedMetric?.label || 'units'}
                </Badge>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  {config.rewardPoints} points each
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
          {isLoading ? 'Creating...' : 'Create Goal'}
        </Button>
      </div>
    </div>
  );
}

export default GroupGoalBuilder;
