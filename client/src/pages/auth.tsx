import { useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Auth() {
  const { user, setShowAuthFlow, isAuthenticated } = useDynamicContext();
  const [, setLocation] = useLocation();

  // Create or update user in our database
  const syncUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user data available");
      
      return apiRequest("POST", "/api/auth/user", {
        dynamicUserId: user.id,
        email: user.email,
        username: user.alias || user.username,
        avatar: user.avatar,
        walletAddress: user.verifiedCredentials?.[0]?.address,
        walletChain: user.verifiedCredentials?.[0]?.chain,
        userType: "fan", // Default to fan, can be changed later
      });
    },
    onSuccess: () => {
      // Redirect to appropriate dashboard based on user type
      setLocation("/fan-dashboard");
    },
    onError: (error) => {
      console.error("Failed to sync user:", error);
    },
  });

  useEffect(() => {
    if (isAuthenticated && user && !syncUserMutation.data) {
      syncUserMutation.mutate();
    }
  }, [isAuthenticated, user]);

  const handleConnect = () => {
    setShowAuthFlow(true);
  };

  if (syncUserMutation.isPending) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-4">Successfully Connected!</h2>
            <p className="text-gray-300 mb-6">
              Welcome to Fandomly, {user.alias || user.email}!
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/fan-dashboard")}
                className="w-full bg-brand-primary hover:bg-brand-primary/80"
              >
                Go to Fan Dashboard
              </Button>
              <Button 
                onClick={() => setLocation("/creator-dashboard")}
                variant="outline"
                className="w-full border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg"
              >
                Become a Creator
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <Card className="max-w-md w-full mx-4 bg-brand-dark-purple/90 backdrop-blur-lg border-brand-primary/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center gradient-text">
            Connect Your Wallet
          </CardTitle>
          <p className="text-gray-300 text-center">
            Get started with Fandomly by connecting your Web3 wallet
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Button
              onClick={handleConnect}
              size="lg"
              className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-semibold"
            >
              Connect Wallet
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-400">
            <p>Supports MetaMask, Phantom, WalletConnect and more</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
