import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Video as TikTokIcon, 
  Youtube,
  Link as LinkIcon,
  CheckCircle 
} from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import { Link } from "wouter";
import { useSocialConnections } from "@/hooks/use-social-connections";

export default function SimplifiedSocialWidgets() {
  const { isPlatformConnected, isLoading } = useSocialConnections();

  const socialAccounts = [
    { 
      platform: "Facebook", 
      platformKey: "facebook",
      icon: Facebook, 
      color: "text-blue-500", 
      bgColor: "bg-blue-500/20",
    },
    { 
      platform: "Twitter", 
      platformKey: "twitter",
      icon: Twitter, 
      color: "text-blue-400", 
      bgColor: "bg-blue-400/20",
    },
    { 
      platform: "TikTok", 
      platformKey: "tiktok",
      icon: TikTokIcon, 
      color: "text-purple-400", 
      bgColor: "bg-purple-400/20",
    },
    { 
      platform: "YouTube", 
      platformKey: "youtube",
      icon: Youtube, 
      color: "text-red-500", 
      bgColor: "bg-red-500/20",
    },
    { 
      platform: "Spotify", 
      platformKey: "spotify",
      iconComponent: FaSpotify, 
      color: "text-green-500", 
      bgColor: "bg-green-500/20",
    },
    { 
      platform: "Discord", 
      platformKey: "discord",
      icon: LinkIcon, 
      color: "text-indigo-400", 
      bgColor: "bg-indigo-400/20",
    },
    { 
      platform: "Twitch", 
      platformKey: "twitch",
      icon: Youtube, 
      color: "text-violet-400", 
      bgColor: "bg-violet-400/20",
    },
    { 
      platform: "Instagram", 
      platformKey: "instagram",
      icon: Instagram, 
      color: "text-pink-400", 
      bgColor: "bg-pink-400/20",
      disabled: true,
    },
  ];

  const connectedCount = socialAccounts
    .filter(a => !a.disabled)
    .filter(a => isPlatformConnected(a.platformKey))
    .length;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <span className="flex items-center">
            <LinkIcon className="h-4 w-4 mr-2" />
            Social Accounts
          </span>
          <Badge variant="outline" className="text-xs border-brand-primary/30 text-brand-primary">
            {connectedCount}/{socialAccounts.length - 1}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {socialAccounts.map((account) => {
            const Icon = account.icon || account.iconComponent;
            const connected = account.disabled ? false : isPlatformConnected(account.platformKey);
            return (
              <div 
                key={account.platform} 
                className={`flex items-center justify-between p-2 rounded-lg bg-white/5 ${account.disabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${account.bgColor}`}>
                    {Icon && <Icon className={`h-3 w-3 ${account.color}`} />}
                  </div>
                  <span className="text-xs text-gray-300">{account.platform}</span>
                </div>
                {connected ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-600" />
                )}
              </div>
            );
          })}
        </div>
        <Link href="/fan-dashboard/social">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full mt-4 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 text-xs"
          >
            Manage Connections
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
