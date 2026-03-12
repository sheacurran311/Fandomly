/**
 * ConnectedPlatformsCard — dashboard widget showing social connection status.
 *
 * Extracted from pages/creator-dashboard.tsx ConnectedPlatformsRow inline component.
 * Uses the shared SOCIAL_PLATFORMS_ARRAY config.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Link2 } from 'lucide-react';
import { useSocialConnections } from '@/hooks/use-social-connections';
import { SOCIAL_PLATFORMS_ARRAY } from '@/config/social-platforms';

export default function ConnectedPlatformsCard() {
  const { isPlatformConnected, isLoading } = useSocialConnections();

  const connectedCount = SOCIAL_PLATFORMS_ARRAY.filter((p) => isPlatformConnected(p.id)).length;
  const totalCount = SOCIAL_PLATFORMS_ARRAY.length;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-brand-secondary" />
            <span>Connected Platforms</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs text-brand-primary hover:text-white hover:bg-brand-primary/20"
            onClick={() => (window.location.href = '/creator-dashboard/social')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Manage All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Platform icons row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {SOCIAL_PLATFORMS_ARRAY.map((platform) => {
                const Icon = platform.icon;
                const isConnected = isPlatformConnected(platform.id);
                return (
                  <div
                    key={platform.id}
                    className="flex flex-col items-center gap-1.5 min-w-[60px]"
                    title={`${platform.name}: ${isConnected ? 'Connected' : 'Not connected'}`}
                  >
                    <div
                      className={`relative p-2.5 rounded-lg transition-colors ${
                        isConnected ? 'bg-white/10' : 'bg-white/5 opacity-50'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isConnected ? platform.color : 'text-gray-500'}`}
                      />
                      {/* Status indicator dot */}
                      <div
                        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-brand-dark-bg ${
                          isConnected ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] ${isConnected ? 'text-gray-300' : 'text-gray-500'}`}
                    >
                      {platform.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Connection summary */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm text-gray-400">
                {connectedCount} of {totalCount} platforms connected
              </span>
              {connectedCount < totalCount && (
                <span className="text-xs text-brand-secondary">
                  +{(totalCount - connectedCount) * 500} potential points
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
