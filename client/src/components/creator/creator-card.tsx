import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Creator } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface CreatorCardProps {
  creator: Creator;
  showJoinButton?: boolean;
}

export default function CreatorCard({ creator, showJoinButton = true }: CreatorCardProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const joinProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      if (!user) throw new Error("Must be authenticated to join program");
      
      return apiRequest("POST", "/api/fan-programs", {
        fanId: user.userId,
        programId: programId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `You've joined ${creator.displayName}'s loyalty program!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fan-programs"] });
    },
    onError: (error) => {
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
    if (!count) return "0 followers";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M followers`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K followers`;
    return `${count} followers`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
      <div className="h-48 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 relative">
        <div className="absolute top-4 right-4">
          <Badge className={getCategoryColor(creator.category)}>
            {creator.category}
          </Badge>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center mr-3 text-white font-bold">
            {creator.displayName[0]}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center">
              {creator.displayName}
              {creator.isVerified && (
                <span className="ml-2 text-brand-secondary">✓</span>
              )}
            </h3>
            <p className="text-gray-400 text-sm">
              {formatFollowerCount(creator.followerCount)}
            </p>
          </div>
        </div>
        <p className="text-gray-300 mb-4 line-clamp-2">
          {creator.bio || "Creating amazing content and building community."}
        </p>
        <div className="flex justify-between items-center">
          <div className="text-brand-secondary font-semibold">
            Active Program
          </div>
          {showJoinButton && (
            <Button 
              onClick={() => {
                // For now, we'll use a placeholder program ID
                // In a real app, this would come from the creator's active program
                joinProgramMutation.mutate("placeholder-program-id");
              }}
              disabled={joinProgramMutation.isPending || !user}
              className="bg-brand-primary hover:bg-brand-primary/80 text-white transition-colors"
            >
              {joinProgramMutation.isPending ? "Joining..." : "Join Program"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
