/**
 * Shared Platform Connection Card
 *
 * Reusable component for social platform connection UI.
 * Shows connected state with profile info and stats, or disconnected state with connect CTA.
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface PlatformStat {
  icon: ReactNode;
  label: string;
  value: string | number;
}

interface PlatformConnectionCardProps {
  platform: string;
  icon: ReactNode;
  color: string; // Brand color for the platform (e.g., '#1DA1F2' for Twitter)
  isConnected: boolean;
  isConnecting?: boolean;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  stats?: PlatformStat[];
  pointsReward?: number;
  profileUrl?: string;
  profileButtonLabel?: string;
  description?: string;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  children?: ReactNode; // Additional content in connected state
}

export function PlatformConnectionCard({
  platform,
  icon,
  color,
  isConnected,
  isConnecting = false,
  username,
  displayName,
  avatarUrl,
  stats = [],
  pointsReward = 500,
  profileUrl,
  profileButtonLabel = 'Profile',
  description,
  error,
  onConnect,
  onDisconnect,
  children,
}: PlatformConnectionCardProps) {
  if (isConnected) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            {icon}
            {platform}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile info */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm"
              style={{ backgroundColor: `${color}33`, color }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username || ''}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                (username || displayName || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm truncate">{displayName || username}</p>
                <Badge className="bg-green-500/20 text-green-400 text-xs border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs border-0">
                  Rewarded
                </Badge>
              </div>
              {username && displayName && username !== displayName && (
                <p className="text-xs text-gray-400 truncate">{displayName}</p>
              )}
              {!displayName && username && (
                <p className="text-xs text-gray-400 truncate">@{username}</p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          {stats.length > 0 && (
            <div className={`grid grid-cols-${Math.min(stats.length, 3)} gap-3`}>
              {stats.map((stat, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <div>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                      <p className="text-sm font-medium text-white">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Additional content */}
          {children}

          {/* Action buttons */}
          <div className="flex gap-2">
            {profileUrl && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                onClick={() => window.open(profileUrl, '_blank')}
              >
                {profileButtonLabel}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Disconnected state
  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          {icon}
          {platform}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: `${color}33`, color }}
          >
            {icon}
          </div>
          <p className="text-sm text-gray-300 mb-2">Connect your {platform} account</p>
          {description && <p className="text-xs text-gray-400 mb-2">{description}</p>}
          {pointsReward > 0 && (
            <Badge className="bg-brand-secondary/20 text-brand-secondary text-xs border-0">
              +{pointsReward} Points
            </Badge>
          )}
        </div>
        <Button
          className="w-full text-white hover:opacity-80"
          style={{ backgroundColor: color }}
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              {icon}
              <span className="ml-2">Connect {platform}</span>
            </>
          )}
        </Button>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
