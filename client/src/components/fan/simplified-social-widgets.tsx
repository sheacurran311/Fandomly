import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function SimplifiedSocialWidgets() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({
    facebook: false,
    twitter: false,
    tiktok: false,
    youtube: false,
    spotify: false,
    instagram: false,
    discord: false,
    twitch: false,
  });

  useEffect(() => {
    if (user?.dynamicUserId) {
      checkAllConnections();
    }
  }, [user?.dynamicUserId]);

  const checkAllConnections = async () => {
    const statuses: Record<string, boolean> = {};

    // Check Facebook
    try {
      const { FacebookSDKManager } = await import("@/lib/facebook");
      await FacebookSDKManager.ensureFBReady('fan');
      const fbStatus = await FacebookSDKManager.getLoginStatus();
      statuses.facebook = fbStatus.isLoggedIn;
    } catch (error) {
      statuses.facebook = false;
    }

    // Check Twitter
    try {
      const response = await fetch('/api/social-connections/twitter', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.twitter = data.connected;
      }
    } catch (error) {
      statuses.twitter = false;
    }

    // Check TikTok
    try {
      const response = await fetch('/api/social-connections/tiktok', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.tiktok = data.connected;
      }
    } catch (error) {
      statuses.tiktok = false;
    }

    // Check YouTube
    try {
      const response = await fetch('/api/social-connections/youtube', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.youtube = data.connected;
      }
    } catch (error) {
      statuses.youtube = false;
    }

    // Check Spotify
    try {
      const response = await fetch('/api/social-connections/spotify', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.spotify = data.connected;
      }
    } catch (error) {
      statuses.spotify = false;
    }

    // Check Discord
    try {
      const response = await fetch('/api/social-connections/discord', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.discord = data.connected;
      }
    } catch (error) {
      statuses.discord = false;
    }

    // Check Twitch
    try {
      const response = await fetch('/api/social-connections/twitch', {
        headers: {
          'x-dynamic-user-id': user?.dynamicUserId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        statuses.twitch = data.connected;
      }
    } catch (error) {
      statuses.twitch = false;
    }

    setConnectionStatus(statuses);
  };

  const socialAccounts = [
    { 
      platform: "Facebook", 
      icon: Facebook, 
      color: "text-blue-500", 
      bgColor: "bg-blue-500/20",
      connected: connectionStatus.facebook,
    },
    { 
      platform: "Twitter", 
      icon: Twitter, 
      color: "text-blue-400", 
      bgColor: "bg-blue-400/20",
      connected: connectionStatus.twitter,
    },
    { 
      platform: "TikTok", 
      icon: TikTokIcon, 
      color: "text-purple-400", 
      bgColor: "bg-purple-400/20",
      connected: connectionStatus.tiktok,
    },
    { 
      platform: "YouTube", 
      icon: Youtube, 
      color: "text-red-500", 
      bgColor: "bg-red-500/20",
      connected: connectionStatus.youtube,
    },
    { 
      platform: "Spotify", 
      iconComponent: FaSpotify, 
      color: "text-green-500", 
      bgColor: "bg-green-500/20",
      connected: connectionStatus.spotify,
    },
    { 
      platform: "Discord", 
      icon: LinkIcon, 
      color: "text-indigo-400", 
      bgColor: "bg-indigo-400/20",
      connected: connectionStatus.discord,
    },
    { 
      platform: "Twitch", 
      icon: Youtube, 
      color: "text-violet-400", 
      bgColor: "bg-violet-400/20",
      connected: connectionStatus.twitch,
    },
    { 
      platform: "Instagram", 
      icon: Instagram, 
      color: "text-pink-400", 
      bgColor: "bg-pink-400/20",
      connected: false,
      disabled: true,
    },
  ];

  const connectedCount = Object.values(connectionStatus).filter(Boolean).length;

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
                {account.connected ? (
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

