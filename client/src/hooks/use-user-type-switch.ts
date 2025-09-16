import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface SwitchUserTypeRequest {
  userId: string;
  userType: "fan" | "creator";
}

export function useUserTypeSwitch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user: dynamicUser } = useDynamicContext();

  return useMutation({
    mutationFn: async ({ userId, userType }: SwitchUserTypeRequest) => {
      console.log("Switching user type:", { userId, userType });
      const response = await fetchApi("/api/auth/switch-user-type", {
        method: "POST",
        body: JSON.stringify({ userId, userType }),
      });
      console.log("User type switch response:", response);
      return response;
    },
    onSuccess: async (data) => {
      console.log("User type switch successful:", data);
      
      // Invalidate and refetch user queries with correct key that matches useAuth
      if (dynamicUser?.userId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user", dynamicUser.userId] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user", dynamicUser.userId] });
        
        // Immediately update cache to prevent race conditions
        queryClient.setQueryData(["/api/auth/user", dynamicUser.userId], (prev: any) => ({
          ...prev,
          userType: data.userType,
          onboardingState: data.onboardingState ?? prev?.onboardingState
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/role"] });
      
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