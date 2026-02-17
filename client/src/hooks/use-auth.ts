/**
 * Compatibility layer for the old useAuth hook
 * Re-exports from the new auth context for backward compatibility
 */
import { useAuth as useNewAuth, User } from "@/contexts/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";

interface UserData extends User {
  hasCompletedOnboarding: boolean;
  createdAt?: Date | string | null;
  creator?: any;
  tenant?: any;
  agencyId?: string | null;
  brandType?: string | null;
}

export function useAuth() {
  const auth = useNewAuth();
  const queryClient = useQueryClient();

  // Legacy registerUser mutation for backward compatibility
  const registerUser = useMutation({
    mutationFn: async (userType: "fan" | "creator" = "fan") => {
      if (!auth.isAuthenticated || !auth.user) {
        throw new Error("Not authenticated - please sign in first");
      }
      
      console.log("Registering user type:", userType);
      
      const response = await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          userId: auth.user.id,
          userType,
        }),
      });
      
      console.log("Registration API response:", response);
      return response;
    },
    onSuccess: () => {
      console.log("Registration successful, invalidating queries...");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Registration mutation failed:", error);
    },
  });

  // Map new auth to old interface for backward compatibility
  const userData: UserData | undefined = auth.user ? {
    ...auth.user,
    hasCompletedOnboarding: auth.user.onboardingState?.isCompleted || false,
  } : undefined;

  return {
    // Auth state - compatible interface
    user: userData,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || registerUser.isPending,
    error: auth.error,
    
    // User properties
    isCreator: auth.user?.userType === "creator",
    isFan: auth.user?.userType === "fan",
    hasCompletedOnboarding: auth.user?.onboardingState?.isCompleted || false,
    onboardingState: auth.user?.onboardingState,
    
    // Actions
    registerUser: registerUser.mutate,
    isRegistering: registerUser.isPending,
    
    // New auth methods (forwarded)
    login: auth.login,
    logout: auth.logout,
    refreshToken: auth.refreshToken,
    refreshUser: auth.refreshUser,
  };
}
