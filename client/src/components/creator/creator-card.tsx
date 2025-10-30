import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Creator } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Link } from "wouter";
import { Trophy, Target } from "lucide-react";
import { transformImageUrl } from "@/lib/image-utils";

interface CreatorCardProps {
  creator: Creator & {
    user?: {
      username: string;
    };
    tenant?: {
      slug: string;
      branding?: any;
    };
    isLive?: boolean;
    activeCampaignsCount?: number;
    publishedTasksCount?: number;
  };
  showJoinButton?: boolean;
  onUnauthenticatedClick?: () => void;
}

export default function CreatorCard({ creator, showJoinButton = true, onUnauthenticatedClick }: CreatorCardProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenant/branding data if not provided
  const { data: creatorData } = useQuery({
    queryKey: ["/api/store", creator.user?.username],
    queryFn: async () => {
      const response = await fetch(`/api/store/${creator.user?.username}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!creator.user?.username && !creator.tenant,
  });

  // Get tenantId from creator or fetched data
  const tenantId = creator.tenantId || creatorData?.creator?.tenantId;

  // Follow creator mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be authenticated to follow");
      if (!tenantId) throw new Error("Creator tenant not found");
      
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/follow`, {
        userId: user.userId,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Following!",
        description: `You're now following ${creator.displayName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
    },
    onError: (error) => {
      console.error("Follow error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to follow creator",
        variant: "destructive",
      });
    },
  });

  // Join program mutation
  const joinProgramMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be authenticated to join");
      
      // First, fetch creator's loyalty programs
      const programsResponse = await fetch(`/api/loyalty-programs/creator/${creator.id}`, {
        credentials: 'include',
      });
      
      if (!programsResponse.ok) {
        throw new Error("No loyalty programs available");
      }
      
      const programs = await programsResponse.json();
      
      if (programs.length === 0) {
        throw new Error("This creator hasn't created a loyalty program yet");
      }
      
      // Join the first active program
      const program = programs[0];
      const response = await apiRequest("POST", "/api/fan-programs", {
        tenantId: program.tenantId,
        fanId: user.id,
        programId: program.id,
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `You've joined ${creator.displayName}'s loyalty program!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fan-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
    },
    onError: (error) => {
      console.error("Join program error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join program",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "athlete":
        return "bg-brand-secondary text-brand-dark-bg";
      case "musician":
        return "bg-brand-primary text-white";
      case "creator":
        return "bg-brand-accent text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return "0 fans";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M fans`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K fans`;
    return `${count} fans`;
  };

  // Get branding from creator or fetched data
  const branding = creator.tenant?.branding || creatorData?.creator?.tenant?.branding;
  const bannerUrl = transformImageUrl(branding?.bannerUrl);
  const profilePhotoUrl = transformImageUrl(creator.profileData?.avatar || branding?.logoUrl);
  const creatorUrl = creator.user?.username || creator.tenant?.slug;

  const handleCardClick = () => {
    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else if (creatorUrl) {
      window.location.href = `/${creatorUrl}`;
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else {
      followMutation.mutate();
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else {
      joinProgramMutation.mutate();
    }
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Banner Image */}
      <div 
        className="h-32 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 relative bg-cover bg-center"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}
      >
        <div className="absolute top-3 right-3">
          <Badge className={getCategoryColor(creator.category)}>
            {creator.category}
          </Badge>
        </div>
        {/* Live Badge - Only show if creator has active content */}
        {creator.isLive && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-green-500/90 text-white border-0">
              🔴 Live
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-5">
        {/* Profile Photo and Info */}
        <div className="flex items-start mb-3 -mt-10">
          <div className="relative">
            {profilePhotoUrl ? (
              <img 
                src={profilePhotoUrl} 
                alt={creator.displayName}
                className="w-16 h-16 rounded-full border-4 border-brand-dark-bg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-brand-primary rounded-full border-4 border-brand-dark-bg flex items-center justify-center text-white font-bold text-xl">
                {creator.displayName[0]}
              </div>
            )}
          </div>
          <div className="ml-3 mt-10">
            <h3 className="text-lg font-bold text-white flex items-center">
              {creator.displayName}
              {creator.isVerified && (
                <span className="ml-1 text-brand-secondary">✓</span>
              )}
            </h3>
            <p className="text-gray-400 text-xs">
              {formatFollowerCount(creator.followerCount)}
            </p>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
          {creator.bio || "Creating amazing content and building community."}
        </p>
        
        {/* Activity Stats */}
        {(creator.activeCampaignsCount || creator.publishedTasksCount) ? (
          <div className="flex gap-3 mb-3 text-xs text-gray-400">
            {creator.activeCampaignsCount > 0 && (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-brand-primary" />
                <span>{creator.activeCampaignsCount} campaign{creator.activeCampaignsCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {creator.publishedTasksCount > 0 && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-brand-accent" />
                <span>{creator.publishedTasksCount} task{creator.publishedTasksCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        ) : null}
        
        {/* Action Buttons */}
        {showJoinButton && (
          <div className="flex gap-2">
            <Button 
              onClick={handleFollowClick}
              disabled={followMutation.isPending}
              variant="outline"
              className="flex-1 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
            >
              {followMutation.isPending ? "Following..." : "Follow"}
            </Button>
            <Button 
              onClick={handleJoinClick}
              disabled={joinProgramMutation.isPending}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/80 text-white transition-colors"
            >
              {joinProgramMutation.isPending ? "Joining..." : "Join"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
