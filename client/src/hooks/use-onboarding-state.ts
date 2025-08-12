import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  isCompleted: boolean;
  lastOnboardingRoute?: string;
  skipReason?: string;
}

interface UpdateOnboardingRequest {
  userId: string;
  onboardingState: OnboardingState;
}

export function useOnboardingState() {
  const queryClient = useQueryClient();

  const updateOnboardingState = useMutation({
    mutationFn: async ({ userId, onboardingState }: UpdateOnboardingRequest) => {
      return await apiRequest("/api/auth/update-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, onboardingState }),
      });
    },
    onSuccess: () => {
      // Invalidate user-related queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const getOnboardingRoute = (userType: "fan" | "creator", onboardingState: OnboardingState) => {
    if (onboardingState.isCompleted) {
      return userType === "creator" ? "/creator-dashboard" : "/fan-dashboard";
    }
    
    if (onboardingState.currentStep === 0) {
      // Not started onboarding
      return userType === "creator" ? "/creator-onboarding" : "/fan-onboarding";
    }
    
    // Resume from last step
    return onboardingState.lastOnboardingRoute || 
           (userType === "creator" ? "/creator-onboarding" : "/fan-onboarding");
  };

  const markStepCompleted = (userId: string, currentState: OnboardingState, stepId: string, route?: string) => {
    const newCompletedSteps = [...currentState.completedSteps];
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId);
    }

    const newState: OnboardingState = {
      ...currentState,
      currentStep: currentState.currentStep + 1,
      completedSteps: newCompletedSteps,
      isCompleted: newCompletedSteps.length >= currentState.totalSteps,
      lastOnboardingRoute: route,
    };

    updateOnboardingState.mutate({ userId, onboardingState: newState });
    return newState;
  };

  return {
    updateOnboardingState,
    getOnboardingRoute,
    markStepCompleted,
  };
}