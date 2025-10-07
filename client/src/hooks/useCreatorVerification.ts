import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CreatorVerificationData } from "@shared/creatorVerificationSchema";

interface VerificationStatusResponse {
  creator: {
    id: string;
    displayName: string;
    category: string;
    isVerified: boolean;
  };
  verificationData: CreatorVerificationData;
  missingFieldsDisplay: string[];
}

interface CheckVerificationResponse {
  success: boolean;
  verificationData: CreatorVerificationData;
  isVerified: boolean;
  autoVerified: boolean;
  message: string;
}

/**
 * Hook to fetch and manage creator verification status
 */
export function useCreatorVerification() {
  const queryClient = useQueryClient();

  // Fetch verification status
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<VerificationStatusResponse>({
    queryKey: ['creatorVerification'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/creator-verification/status');
      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check/update verification status (triggers auto-verification)
  const checkVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/creator-verification/check');
      if (!response.ok) {
        throw new Error('Failed to check verification status');
      }
      return response.json() as Promise<CheckVerificationResponse>;
    },
    onSuccess: () => {
      // Invalidate and refetch verification status
      queryClient.invalidateQueries({ queryKey: ['creatorVerification'] });
    },
  });

  return {
    // Data
    creator: data?.creator,
    verificationData: data?.verificationData,
    missingFieldsDisplay: data?.missingFieldsDisplay || [],
    isVerified: data?.creator?.isVerified || false,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    refetch,
    checkVerification: checkVerificationMutation.mutate,
    isChecking: checkVerificationMutation.isPending,
    checkError: checkVerificationMutation.error,
  };
}

