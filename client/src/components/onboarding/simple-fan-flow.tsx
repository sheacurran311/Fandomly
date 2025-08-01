import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Star, 
  Gift, 
  ArrowRight, 
  Check,
  Sparkles,
  Heart
} from "lucide-react";

interface SimpleFanFlowProps {
  onComplete: () => void;
}

export default function SimpleFanFlow({ onComplete }: SimpleFanFlowProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const createFanMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      // Create user record
      const userData = {
        dynamicUserId: user.userId || "",
        email: user.email || "",
        username: username || user.alias || user.firstName || "Fan",
        avatar: "",
        walletAddress: user.verifiedCredentials?.[0]?.address || "",
        walletChain: user.verifiedCredentials?.[0]?.chain || "",
        userType: "fan" as const,
      };

      return await apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: () => {
      toast({
        title: "🎉 Welcome to Fandomly!",
        description: "You're all set to start collecting rewards from your favorite creators.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCompleting(true);
      setTimeout(() => onComplete(), 2000);
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Failed to complete setup",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    createFanMutation.mutate();
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold gradient-text">
            You're all set!
          </h2>
          <p className="text-xl text-gray-300">
            Redirecting to your fan dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-secondary to-brand-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Welcome, Fan!
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            You're just one step away from joining exclusive creator communities and earning amazing rewards
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 mb-8">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-white mb-3">
                  Choose your username (Optional)
                </label>
                <Input
                  placeholder={`${user?.alias || user?.firstName || "fan"}${Math.floor(Math.random() * 1000)}`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-lg py-3"
                />
                <p className="text-sm text-gray-400 mt-2">
                  This is how creators and other fans will see you in the community
                </p>
              </div>

              <div className="bg-brand-primary/10 rounded-lg p-6 border border-brand-primary/20">
                <h3 className="text-lg font-semibold text-brand-primary mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  What you get as a fan:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-brand-secondary" />
                    <span className="text-gray-300">Join multiple creator loyalty programs</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-brand-secondary" />
                    <span className="text-gray-300">Earn points for social media engagement</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-brand-secondary" />
                    <span className="text-gray-300">Claim exclusive NFTs and rewards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-brand-secondary" />
                    <span className="text-gray-300">Access to VIP content and experiences</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-brand-secondary" />
                    <span className="text-gray-300">Connect with other fans in exclusive communities</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleSubmit}
            disabled={createFanMutation.isPending}
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-12 py-4"
            size="lg"
          >
            {createFanMutation.isPending ? (
              "Setting up your account..."
            ) : (
              <>
                Start Collecting Rewards
                <Heart className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-sm text-gray-400 mt-4">
            You can start following creators and earning rewards immediately
          </p>
        </div>
      </div>
    </div>
  );
}