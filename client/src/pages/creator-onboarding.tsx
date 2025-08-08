import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatorOnboardingPage() {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();

  const handleOnboardingComplete = () => {
    setLocation("/creator-dashboard");
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  // Simple auth check using Dynamic's native system
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please connect your wallet to access creator onboarding.</p>
            <Button onClick={() => setLocation("/")} className="bg-brand-primary hover:bg-brand-primary/80">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <div className="flex items-center">
                <img src="/fandomly-logo-with-text.png" alt="Fandomly" className="h-8 w-auto" />
              </div>
              <div className="w-24"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Simplified Onboarding - Dynamic handles everything */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to Fandomly!
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Your wallet is connected. You're all set to start building your fan community.
            </p>
            <Button 
              onClick={handleOnboardingComplete}
              className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-8 py-3 rounded-xl"
            >
              Go to Creator Dashboard
            </Button>
          </div>
        </div>
      </div>
  );
}