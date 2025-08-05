import { useState, useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { User, Users } from "lucide-react";

export default function Auth() {
  const { user, isAuthenticated } = useDynamicContext();
  const [, setLocation] = useLocation();
  const [showUserTypeSelection, setShowUserTypeSelection] = useState(false);

  // Create user in our database with selected type
  const createUserMutation = useMutation({
    mutationFn: async (userType: "fan" | "creator") => {
      if (!user) throw new Error("No user data available");
      
      return apiRequest("POST", "/api/auth/user", {
        dynamicUserId: user.userId,
        email: user.email,
        username: user.alias || user.username || `user_${user.userId.slice(-8)}`,
        userType: userType,
        role: userType === "creator" ? "customer_admin" : "customer_end_user",
      });
    },
    onSuccess: (data, userType) => {
      console.log("User created successfully:", data);
      if (userType === "creator") {
        setLocation("/creator-onboarding");
      } else {
        setLocation("/fan-dashboard");
      }
    },
    onError: (error) => {
      console.error("Failed to create user:", error);
    },
  });

  // Check if user needs to be registered in our database
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user exists in our database
      const checkUser = async () => {
        try {
          await apiRequest("GET", `/api/auth/user/${user.userId}`);
          // User exists, redirect to appropriate dashboard
          setLocation("/");
        } catch (error: any) {
          if (error.message.includes("404")) {
            // User doesn't exist, show user type selection
            setShowUserTypeSelection(true);
          }
        }
      };
      checkUser();
    }
  }, [isAuthenticated, user, setLocation]);

  const handleUserTypeSelection = (userType: "fan" | "creator") => {
    createUserMutation.mutate(userType);
  };

  if (createUserMutation.isPending) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // User is authenticated but needs to select user type
  if (isAuthenticated && user && showUserTypeSelection) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-brand-dark-purple/90 backdrop-blur-lg border-brand-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-text mb-2">
              Welcome to Fandomly!
            </CardTitle>
            <p className="text-gray-300">
              Choose your account type to get started
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Fan Option */}
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30 hover:border-brand-primary/60"
                onClick={() => handleUserTypeSelection("fan")}
              >
                <CardContent className="p-6 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-brand-primary" />
                  <h3 className="text-xl font-bold text-white mb-2">I'm a Fan</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Follow your favorite creators, earn points, and unlock exclusive rewards
                  </p>
                  <ul className="text-left text-sm text-gray-400 space-y-1">
                    <li>• Join loyalty programs</li>
                    <li>• Earn points for engagement</li>
                    <li>• Redeem exclusive rewards</li>
                    <li>• Support your favorite creators</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Creator Option */}
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-gradient-to-br from-brand-secondary/20 to-brand-accent/20 border-brand-secondary/30 hover:border-brand-secondary/60"
                onClick={() => handleUserTypeSelection("creator")}
              >
                <CardContent className="p-6 text-center">
                  <User className="w-16 h-16 mx-auto mb-4 text-brand-secondary" />
                  <h3 className="text-xl font-bold text-white mb-2">I'm a Creator</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Build your community, create loyalty programs, and monetize your fanbase
                  </p>
                  <ul className="text-left text-sm text-gray-400 space-y-1">
                    <li>• Create your own store</li>
                    <li>• Build loyalty programs</li>
                    <li>• Engage with fans</li>
                    <li>• NIL compliance for athletes</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="text-center text-sm text-gray-400">
              <p>You can always change your account type later</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-gray-300">Loading...</p>
      </div>
    </div>
  );
}