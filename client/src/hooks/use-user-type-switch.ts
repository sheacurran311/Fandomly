import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { FacebookSDKManager } from "@/lib/facebook";

interface SwitchUserTypeRequest {
  userId: string;
  userType: "fan" | "creator";
}

export function useUserTypeSwitch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, userType }: SwitchUserTypeRequest) => {
      console.log("Switching user type:", { userId, userType });
      
      // CRITICAL: Disconnect from Facebook first to prevent App ID conflicts
      console.log("Disconnecting from Facebook before user type switch...");
      await FacebookSDKManager.logoutFromFacebook();
      
      const response = await fetchApi("/api/auth/switch-user-type", {
        method: "POST",
        body: JSON.stringify({ userId, userType }),
      });
      console.log("User type switch response:", response);
      return response;
    },
    onSuccess: async (data) => {
      console.log("User type switch successful:", data);
      
      // CRITICAL: Refresh the auth context to pick up the new userType
      // This updates the React state that the auth router uses for routing
      await refreshUser();
      
      // Also invalidate React Query caches
      await queryClient.invalidateQueries();
      
      toast({
        title: "Account Type Changed",
        description: data.message || `Successfully switched to ${data.userType} account`,
        variant: "default",
      });
      
      // Navigate based on new user type and onboarding status
      const newType = data.userType;
      if (newType === "creator") {
        // Check if creator needs onboarding
        if (!data.onboardingState?.isCompleted) {
          setLocation('/creator-type-selection');
        } else {
          setLocation('/creator-dashboard');
        }
      } else if (newType === "fan") {
        // Check if fan needs onboarding
        if (!data.onboardingState?.isCompleted) {
          setLocation('/fan-onboarding/profile');
        } else {
          setLocation('/fan-dashboard');
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error Switching Account Type",
        description: error.message || "Failed to switch account type",
        variant: "destructive",
      });
    },
  });
}