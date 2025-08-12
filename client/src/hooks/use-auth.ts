import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { apiRequest } from "@/lib/queryClient";

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
  const { user, isAuthenticated } = useDynamicContext();
  const queryClient = useQueryClient();

  // Fetch user data from backend when Dynamic user is available
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user", user?.userId],
    queryFn: async () => {
      if (!user?.userId) throw new Error("No user ID");
      return await apiRequest(`/api/auth/user/${user.userId}`);
    },
    enabled: !!user?.userId,
    retry: false,
  });

  // Register user in our backend when they first connect via Dynamic
  const registerUser = useMutation({
    mutationFn: async (userType: "fan" | "creator" = "fan") => {
      if (!user) throw new Error("No Dynamic user");
      
      return await apiRequest("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dynamicUser: {
            userId: user.userId,
            id: user.userId,
            email: user.email,
            firstName: user.firstName,
            alias: user.alias,
            avatar: user.avatar,
            verifiedCredentials: user.verifiedCredentials,
          },
          userType,
        }),
      });
    },
    onSuccess: () => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user", user?.userId] });
    },
  });

  // Auto-register user if they're authenticated via Dynamic but not in our system
  if (isAuthenticated && user && !userData && !isLoading && !registerUser.isPending) {
    registerUser.mutate();
  }

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