import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SwitchUserTypeRequest {
  userId: string;
  userType: "fan" | "creator";
}

export function useUserTypeSwitch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, userType }: SwitchUserTypeRequest) => {
      return await apiRequest("/api/auth/switch-user-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, userType }),
      });
    },
    onSuccess: (data) => {
      // Invalidate user-related queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Account Type Changed",
        description: data.message || `Successfully switched to ${data.userType} account`,
        variant: "default",
      });
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