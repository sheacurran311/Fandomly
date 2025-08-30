import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
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
      console.log("Switching user type:", { userId, userType });
      const response = await fetchApi("/api/auth/switch-user-type", {
        method: "POST",
        body: JSON.stringify({ userId, userType }),
      });
      console.log("User type switch response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("User type switch successful:", data);
      
      // Invalidate all user-related queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/role"] });
      
      toast({
        title: "Account Type Changed",
        description: data.message || `Successfully switched to ${data.userType} account`,
        variant: "default",
      });
      
      // Reload the page to ensure user sees the updated dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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