import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Creator } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Trophy, Target } from "lucide-react";
import { transformImageUrl } from "@/lib/image-utils";

interface CreatorCardProps {
  creator: Creator & {
    user?: {
      username: string;
      profileData?: {
        avatar?: string;
        bannerImage?: string;
      };
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
  const { user, isAuthenticated } = useAuth();
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

  // Fetch user's fan programs to check join status
  const { data: userPrograms = [] } = useQuery({
    queryKey: ["/api/fan-programs/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/fan-programs/user/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
  });

  // Check if user has joined a program for this creator
  const hasJoinedProgram = userPrograms.some((program: any) => program.creatorId === creator.id || program.tenantId === tenantId);

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
      // No need to send fanId - backend uses authenticated user
      const response = await apiRequest("POST", "/api/fan-programs", {
        tenantId: program.tenantId,
        programId: program.id,
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `You've joined ${creator.displayName}'s loyalty program!`,
      });
      // Invalidate queries to refresh join state immediately
      queryClient.invalidateQueries({ queryKey: ["/api/fan-programs/user", user?.id] });
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
  
  // Get banner image from user profileData or tenant branding
  const userBannerUrl = creator.user?.profileData?.bannerImage || creatorData?.user?.profileData?.bannerImage;
  const bannerUrl = transformImageUrl(userBannerUrl || branding?.bannerUrl);
  
  // Get profile photo from creator imageUrl, user profileData avatar, or tenant branding logo
  const userAvatar = creator.user?.profileData?.avatar || creatorData?.user?.profileData?.avatar;
  const profilePhotoUrl = transformImageUrl(creator.imageUrl || userAvatar || branding?.logoUrl);
  
  const creatorUrl = creator.tenant?.slug || creator.user?.username;

  const handleCardClick = () => {
    if (!user && onUnauthenticatedClick) {
      onUnauthenticatedClick();
    } else if (creatorUrl) {
      // Use /programs/:slug URL structure for consistent routing
      window.location.href = `/programs/${creatorUrl}`;
    }
  };

  const handleVisitProgramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (creatorUrl) {
      window.location.href = `/programs/${creatorUrl}`;
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
              onClick={handleVisitProgramClick}
              variant="outline"
              className="flex-1 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
            >
              Visit Program
            </Button>
            <Button 
              onClick={handleJoinClick}
              disabled={joinProgramMutation.isPending || hasJoinedProgram}
              className={`flex-1 transition-colors ${
                hasJoinedProgram
                  ? "bg-green-500 hover:bg-green-500/80 text-white"
                  : "bg-brand-primary hover:bg-brand-primary/80 text-white"
              }`}
            >
              {joinProgramMutation.isPending ? "Joining..." : hasJoinedProgram ? "Joined" : "Join"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
