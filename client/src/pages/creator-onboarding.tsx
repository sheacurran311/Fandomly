import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import CreatorOnboardingFlow from "@/components/onboarding/creator-onboarding-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatorOnboardingPage() {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();

  // Redirect to auth if not authenticated
  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleOnboardingComplete = () => {
    setLocation("/creator-dashboard");
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Header */}
      <div className="border-b border-white/10 bg-brand-dark-bg/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBackToHome}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
            <div className="text-2xl font-bold gradient-text">
              FanRewards
            </div>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Onboarding Flow */}
      <CreatorOnboardingFlow onComplete={handleOnboardingComplete} />
    </div>
  );
}