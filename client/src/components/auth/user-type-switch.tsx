import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Users, ArrowRight, RefreshCw } from "lucide-react";

interface UserTypeSwitchProps {
  currentUserType: "fan" | "creator";
  userId: string;
  onSwitchSuccess?: () => void;
}

export default function UserTypeSwitch({ currentUserType, userId, onSwitchSuccess }: UserTypeSwitchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const switchUserTypeMutation = useMutation({
    mutationFn: async (newUserType: "fan" | "creator") => {
      return apiRequest("PATCH", `/api/auth/user/${userId}/switch-type`, {
        newUserType
      });
    },
    onSuccess: (data, newUserType) => {
      toast({
        title: "Account Type Switched!",
        description: `You are now a ${newUserType}. ${newUserType === "creator" ? "You can start building your loyalty programs!" : "You can now join loyalty programs!"}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      setShowConfirmation(false);
      
      if (onSwitchSuccess) {
        onSwitchSuccess();
      }
      
      // Redirect based on new user type
      if (newUserType === "creator") {
        window.location.href = "/creator-onboarding";
      } else {
        window.location.href = "/fan-dashboard";
      }
    },
    onError: (error) => {
      console.error("Failed to switch user type:", error);
      toast({
        title: "Switch Failed",
        description: "There was an error switching your account type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const targetUserType = currentUserType === "fan" ? "creator" : "fan";

  if (showConfirmation) {
    return (
      <Card className="w-full max-w-md mx-auto bg-brand-dark-purple/90 backdrop-blur-lg border-brand-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Confirm Account Switch</CardTitle>
          <CardDescription className="text-gray-300">
            Are you sure you want to switch from {currentUserType} to {targetUserType}?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-brand-dark-bg/50 p-4 rounded-lg border border-yellow-500/20">
            <p className="text-yellow-300 text-sm">
              <strong>Note:</strong> Switching your account type will reset your onboarding progress.
              {targetUserType === "creator" && " You'll need to complete creator setup again."}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-500 text-gray-300 hover:bg-gray-600"
              onClick={() => setShowConfirmation(false)}
              disabled={switchUserTypeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-brand-primary hover:bg-brand-primary/80 text-white"
              onClick={() => switchUserTypeMutation.mutate(targetUserType)}
              disabled={switchUserTypeMutation.isPending}
            >
              {switchUserTypeMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  Confirm Switch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-brand-dark-purple/90 backdrop-blur-lg border-brand-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          {currentUserType === "fan" ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          Current Account Type
        </CardTitle>
        <div className="flex justify-center">
          <Badge 
            variant={currentUserType === "creator" ? "default" : "secondary"}
            className={`${
              currentUserType === "creator" 
                ? "bg-brand-primary text-white" 
                : "bg-brand-secondary text-brand-dark-bg"
            }`}
          >
            {currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-gray-300 text-center">
          {currentUserType === "fan" 
            ? "You're currently set up as a fan. Want to become a creator?" 
            : "You're currently set up as a creator. Want to switch to fan?"}
        </CardDescription>
        
        <Button
          className="w-full bg-gradient-to-r from-brand-secondary to-brand-accent text-brand-dark-bg font-semibold hover:scale-105 transition-transform"
          onClick={() => setShowConfirmation(true)}
        >
          {targetUserType === "creator" ? (
            <>
              <Users className="w-4 h-4 mr-2" />
              Switch to Creator
            </>
          ) : (
            <>
              <User className="w-4 h-4 mr-2" />
              Switch to Fan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}