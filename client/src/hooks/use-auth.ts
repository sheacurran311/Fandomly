import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { fetchApi } from "@/lib/queryClient";

interface UserData {
  id: string;
  dynamicUserId: string;
  email?: string;
  username?: string;
  avatar?: string;
  walletAddress?: string;
  userType: "fan" | "creator";
  role: string;
  onboardingState: {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    isCompleted: boolean;
    lastOnboardingRoute?: string;
  };
  hasCompletedOnboarding: boolean;
  creator?: any;
  tenant?: any;
}

export function useAuth() {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();

  // Fetch user data from backend when Dynamic user is available
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user", user?.userId],
    queryFn: async () => {
      if (!user?.userId) throw new Error("No user ID");
      console.log("Fetching user data for Dynamic user ID:", user.userId);
      return await fetchApi(`/api/auth/user/${user.userId}`);
    },
    enabled: !!user?.userId,
    retry: false,
  });

  // Register user in our backend when they first connect via Dynamic
  const registerUser = useMutation({
    mutationFn: async (userType: "fan" | "creator" = "fan") => {
      if (!user) {
        throw new Error("No Dynamic user - please connect your wallet first");
      }
      
      console.log("Registering user with Dynamic user:", user.userId, "Type:", userType);
      
      const response = await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          dynamicUser: {
            userId: user.userId,
            id: user.userId,
            firstName: user.firstName,
            alias: user.alias,
            verifiedCredentials: user.verifiedCredentials,
          },
          userType,
        }),
      });
      
      console.log("Registration API response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Registration successful, invalidating queries...");
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user", user?.userId] });
    },
    onError: (error) => {
      console.error("Registration mutation failed:", error);
    },
  });

  // Manual registration only - no auto-registration
  // Users must explicitly choose their type via the user-type-selection page

  return {
    // Dynamic auth state
    user: userData as UserData | undefined,
    dynamicUser: user,
    isAuthenticated,
    isLoading: isLoading || registerUser.isPending,
    error,
    
    // User properties
    isCreator: userData?.userType === "creator",
    isFan: userData?.userType === "fan",
    hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
    onboardingState: userData?.onboardingState,
    
    // Actions
    registerUser: registerUser.mutate,
    isRegistering: registerUser.isPending,
  };
}