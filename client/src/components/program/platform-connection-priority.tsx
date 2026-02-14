/**
 * PlatformConnectionPriority - Creator-type prioritized platform connections
 * 
 * Features:
 * - Shows top 4 platforms based on creator type
 * - "Show more" collapsible for remaining platforms
 * - Connected status badges
 * - Points reward indicators
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  Check, 
  Loader2, 
  Gift,
  Twitter,
  Instagram,
  Facebook,
  Youtube
} from "lucide-react";
import { FaDiscord, FaTwitch, FaSpotify, FaTiktok } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { getCreatorTemplate, type CreatorType } from "./creator-program-templates";

// Platform configuration
interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  buttonBorderClass: string;
  buttonTextClass: string;
  buttonHoverClass: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: <Twitter className="h-5 w-5" />,
    iconBgClass: 'bg-blue-500/20',
    iconColorClass: 'text-blue-400',
    buttonBorderClass: 'border-blue-500/30',
    buttonTextClass: 'text-blue-400',
    buttonHoverClass: 'hover:bg-blue-500/10',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="h-5 w-5" />,
    iconBgClass: 'bg-pink-500/20',
    iconColorClass: 'text-pink-400',
    buttonBorderClass: 'border-pink-500/30',
    buttonTextClass: 'text-pink-400',
    buttonHoverClass: 'hover:bg-pink-500/10',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: <FaDiscord className="h-5 w-5" />,
    iconBgClass: 'bg-purple-500/20',
    iconColorClass: 'text-purple-400',
    buttonBorderClass: 'border-purple-500/30',
    buttonTextClass: 'text-purple-400',
    buttonHoverClass: 'hover:bg-purple-500/10',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="h-5 w-5" />,
    iconBgClass: 'bg-blue-600/20',
    iconColorClass: 'text-blue-500',
    buttonBorderClass: 'border-blue-600/30',
    buttonTextClass: 'text-blue-500',
    buttonHoverClass: 'hover:bg-blue-600/10',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: <FaTiktok className="h-5 w-5" />,
    iconBgClass: 'bg-gray-800/50',
    iconColorClass: 'text-white',
    buttonBorderClass: 'border-gray-600/30',
    buttonTextClass: 'text-gray-300',
    buttonHoverClass: 'hover:bg-gray-600/10',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: <Youtube className="h-5 w-5" />,
    iconBgClass: 'bg-red-500/20',
    iconColorClass: 'text-red-500',
    buttonBorderClass: 'border-red-500/30',
    buttonTextClass: 'text-red-500',
    buttonHoverClass: 'hover:bg-red-500/10',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    icon: <FaSpotify className="h-5 w-5" />,
    iconBgClass: 'bg-green-500/20',
    iconColorClass: 'text-green-400',
    buttonBorderClass: 'border-green-500/30',
    buttonTextClass: 'text-green-400',
    buttonHoverClass: 'hover:bg-green-500/10',
  },
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    icon: <FaTwitch className="h-5 w-5" />,
    iconBgClass: 'bg-purple-600/20',
    iconColorClass: 'text-purple-500',
    buttonBorderClass: 'border-purple-600/30',
    buttonTextClass: 'text-purple-500',
    buttonHoverClass: 'hover:bg-purple-600/10',
  },
};

export interface SocialConnection {
  platform: string;
  platformUsername?: string;
  platformDisplayName?: string;
}

export interface PlatformConnectionPriorityProps {
  creatorType: CreatorType;
  /** Set of connected platform IDs */
  connectedPlatforms: Set<string>;
  /** Social connections data for usernames */
  socialConnections?: SocialConnection[];
  /** Set of recently connected platforms (for points animation) */
  recentlyConnected?: Set<string>;
  /** Currently connecting platform ID */
  connectingPlatform: string | null;
  /** Connection handlers by platform ID */
  onConnect: (platformId: string) => void;
  /** Optional: Show as standalone card (default) or just the content */
  asCard?: boolean;
  /** Show only priority platforms without expansion */
  compactMode?: boolean;
  className?: string;
}

export function PlatformConnectionPriority({
  creatorType,
  connectedPlatforms,
  socialConnections = [],
  recentlyConnected = new Set(),
  connectingPlatform,
  onConnect,
  asCard = true,
  compactMode = false,
  className,
}: PlatformConnectionPriorityProps) {
  const [showMore, setShowMore] = useState(false);
  
  const template = getCreatorTemplate(creatorType);
  const priorityPlatforms = template.platformPriority;
  
  // Get first 4 as priority, rest as secondary
  const primaryPlatforms = priorityPlatforms.slice(0, 4);
  const secondaryPlatforms = priorityPlatforms.slice(4);
  
  const connectedCount = connectedPlatforms.size;
  const totalPlatforms = priorityPlatforms.length;

  const getConnectionUsername = (platformId: string) => {
    const connection = socialConnections.find(c => c.platform === platformId);
    return connection?.platformUsername || connection?.platformDisplayName || 'Connected';
  };

  const renderPlatformItem = (platformId: string) => {
    const config = PLATFORM_CONFIGS[platformId];
    if (!config) return null;

    const isConnected = connectedPlatforms.has(platformId);
    const isConnecting = connectingPlatform === platformId;
    const wasRecentlyConnected = recentlyConnected.has(platformId);

    return (
      <div 
        key={platformId}
        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.iconBgClass)}>
            <span className={config.iconColorClass}>{config.icon}</span>
          </div>
          <div>
            <p className="font-medium text-white">{config.name}</p>
            <p className="text-xs text-gray-400">
              {isConnected ? getConnectionUsername(platformId) : 'Not connected'}
            </p>
          </div>
        </div>
        
        {isConnected ? (
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            {wasRecentlyConnected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+500 Points</Badge>
            ) : (
              <span className="text-green-400 text-sm font-medium">Connected</span>
            )}
          </div>
        ) : (
          <Button
            onClick={() => onConnect(platformId)}
            disabled={isConnecting}
            variant="outline"
            className={cn(config.buttonBorderClass, config.buttonTextClass, config.buttonHoverClass)}
          >
            {isConnecting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
            ) : (
              <>Connect <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">+500 pts</Badge></>
            )}
          </Button>
        )}
      </div>
    );
  };

  const content = (
    <div className="space-y-3">
      {/* Primary platforms (always visible) */}
      {primaryPlatforms.map(renderPlatformItem)}
      
      {/* Secondary platforms (collapsible) */}
      {!compactMode && secondaryPlatforms.length > 0 && (
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full text-gray-400 hover:text-white hover:bg-white/5 mt-2"
            >
              <span>
                {showMore ? 'Show less' : `Show ${secondaryPlatforms.length} more platforms`}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 ml-2 transition-transform",
                showMore && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-3">
            {secondaryPlatforms.map(renderPlatformItem)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  if (!asCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn("bg-white/5 backdrop-blur-lg border-white/10", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Gift className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Connect Social Accounts</CardTitle>
              <p className="text-sm text-gray-400">Connect your social accounts to build network-specific tasks</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "border-white/20",
              connectedCount > 0 ? "text-green-400 border-green-500/30" : "text-gray-400"
            )}
          >
            {connectedCount}/{totalPlatforms} connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export default PlatformConnectionPriority;
