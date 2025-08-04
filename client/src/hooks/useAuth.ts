import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { apiRequest } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  dynamicUserId: string;
  email: string;
  username: string;
  userType: "creator" | "fan";
  role: "fandomly_admin" | "customer_admin" | "customer_end_user";
  currentTenantId?: string;
  hasCompletedOnboarding?: boolean;
  creator?: any;
  tenant?: any;
}

export function useAuth() {
  const { user: dynamicUser, isAuthenticated } = useDynamicContext();

  // Fetch user profile from our database when Dynamic user is authenticated
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ["/api/auth/profile", dynamicUser?.userId],
    queryFn: async () => {
      if (!dynamicUser?.userId) return null;
      
      try {
        // First check if user exists in our database
        const response = await apiRequest("GET", `/api/auth/user/${dynamicUser.userId}`);
        return response;
      } catch (error: any) {
        if (error.message.includes("404")) {
          // User doesn't exist in our database yet
          return null;
        }
        throw error;
      }
    },
    enabled: !!dynamicUser?.userId && isAuthenticated,
    retry: false,
  });

  // Determine authentication and onboarding status
  const isUserAuthenticated = isAuthenticated && !!dynamicUser;
  const hasUserRecord = !!userProfile;
  const isCreator = (userProfile as any)?.userType === "creator";
  const hasTenant = !!(userProfile as any)?.currentTenantId;
  const hasCompletedOnboarding = hasUserRecord && (isCreator ? hasTenant : true);

  // Determine what step the user should be on
  const getRequiredStep = () => {
    if (!isUserAuthenticated) return "login";
    if (!hasUserRecord) return "register"; // Need to register in our database
    if (isCreator && !hasTenant) return "onboarding"; // Creator needs to complete onboarding
    return "dashboard"; // User is fully set up
  };

  return {
    // Dynamic user data
    dynamicUser,
    isDynamicAuthenticated: isAuthenticated,
    
    // Our database user data
    user: userProfile as AuthUser | null,
    isAuthenticated: isUserAuthenticated,
    isLoading,
    error,
    
    // Status flags
    hasUserRecord,
    isCreator,
    isFan: (userProfile as any)?.userType === "fan",
    hasTenant,
    hasCompletedOnboarding,
    
    // Routing helpers
    requiredStep: getRequiredStep(),
    needsRegistration: isUserAuthenticated && !hasUserRecord,
    needsOnboarding: isUserAuthenticated && hasUserRecord && isCreator && !hasTenant,
    canAccessDashboard: hasCompletedOnboarding,
  };
}