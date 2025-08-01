import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProtectedRoute from "@/components/auth/protected-route";
import FamilyAthleteTemplates from "@/components/onboarding/family-athlete-templates";
import AthleteSpecificOnboarding from "@/components/onboarding/athlete-specific-onboarding";
import { 
  Medal, 
  Trophy, 
  School, 
  Users,
  Target,
  DollarSign,
  Shield,
  Star,
  Award,
  ArrowLeft,
  Check
} from "lucide-react";
import { Link, useLocation } from "wouter";

type OnboardingStep = "welcome" | "template-selection" | "athlete-setup" | "complete";

export default function FamilyAthleteOnboarding() {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [athleteType, setAthleteType] = useState<"college" | "olympic" | null>(null);

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setAthleteType(template.category === "olympic-athlete" ? "olympic" : "college");
    setCurrentStep("athlete-setup");
  };

  const handleAthleteSetupComplete = (data: any) => {
    console.log("Athlete setup complete:", { ...selectedTemplate, ...data });
    setCurrentStep("complete");
  };

  const renderWelcome = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex justify-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Medal className="h-8 w-8 text-white" />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <School className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl lg:text-6xl font-bold mb-6">
          <span className="gradient-text">Welcome to Your</span><br />
          <span className="text-white">Athletic Empire</span>
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Transform your athletic achievements into lasting fan relationships and revenue streams. 
          Built specifically for Olympic athletes and college sports stars.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-yellow-400/50 transition-all duration-300">
          <CardContent className="p-8 text-center">
            <Medal className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Olympic Athletes</h3>
            <p className="text-gray-300 mb-4">
              Leverage your Olympic success to build a global fanbase and create sustainable income streams.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-xs border-yellow-400/20 text-yellow-400">
                Global Reach
              </Badge>
              <Badge variant="outline" className="text-xs border-yellow-400/20 text-yellow-400">
                Elite Status
              </Badge>
              <Badge variant="outline" className="text-xs border-yellow-400/20 text-yellow-400">
                Sponsorship Ready
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-orange-500/50 transition-all duration-300">
          <CardContent className="p-8 text-center">
            <Trophy className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">College Football (Junior)</h3>
            <p className="text-gray-300 mb-4">
              Advanced NIL strategies for experienced players preparing for the next level.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-xs border-orange-500/20 text-orange-500">
                Draft Prep
              </Badge>
              <Badge variant="outline" className="text-xs border-orange-500/20 text-orange-500">
                NIL Experienced
              </Badge>
              <Badge variant="outline" className="text-xs border-orange-500/20 text-orange-500">
                Leadership
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-blue-500/50 transition-all duration-300">
          <CardContent className="p-8 text-center">
            <School className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">College Football (Freshman)</h3>
            <p className="text-gray-300 mb-4">
              Start your NIL journey right with compliant fan engagement and brand building.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">
                NIL Beginner
              </Badge>
              <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">
                Brand Building
              </Badge>
              <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">
                Future Star
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Athletes Choose Fandomly</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <Shield className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">NIL Compliant</h4>
            <p className="text-sm text-gray-300">Built-in compliance monitoring for NCAA, state, and institutional rules</p>
          </div>
          <div className="text-center">
            <DollarSign className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Revenue Streams</h4>
            <p className="text-sm text-gray-300">Multiple monetization options from fan subscriptions to exclusive content</p>
          </div>
          <div className="text-center">
            <Users className="h-10 w-10 text-blue-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Fan Engagement</h4>
            <p className="text-sm text-gray-300">Build lasting relationships through rewards and exclusive experiences</p>
          </div>
          <div className="text-center">
            <Target className="h-10 w-10 text-purple-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Growth Tools</h4>
            <p className="text-sm text-gray-300">Analytics and insights to grow your fanbase and optimize earnings</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button
          onClick={() => setCurrentStep("template-selection")}
          size="lg"
          className="gradient-primary text-white px-12 py-6 rounded-2xl font-bold text-xl"
        >
          Start Your Athletic Empire
          <Award className="ml-3 h-6 w-6" />
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mx-auto">
        <Check className="h-10 w-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Athletic Empire Launched! 🚀
        </h2>
        <p className="text-gray-300 text-lg">
          Your personalized athlete platform is ready. Start engaging with fans and building your brand today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-white/5 rounded-xl p-6">
          <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-sm text-gray-300">Revenue Goal</div>
          <div className="text-lg font-bold text-white">
            {athleteType === "olympic" ? "$2K-$10K" : athleteType === "college" ? "$500-$8K" : "$1K-$5K"}/month
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-sm text-gray-300">Target Audience</div>
          <div className="text-lg font-bold text-white">
            {athleteType === "olympic" ? "Global" : "College"} Fans
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/creator-dashboard">
          <Button size="lg" className="bg-brand-primary hover:bg-brand-primary/80">
            Go to Dashboard
          </Button>
        </Link>
        <Link href="/nil-dashboard">
          <Button variant="outline" size="lg" className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white">
            View NIL Tools
          </Button>
        </Link>
      </div>
    </div>
  );

  const getStepNumber = () => {
    switch (currentStep) {
      case "welcome": return 1;
      case "template-selection": return 2;
      case "athlete-setup": return 3;
      case "complete": return 4;
      default: return 1;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-brand-dark-bg">
        {/* Header */}
        <div className="border-b border-white/10 bg-brand-dark-bg/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
              <div className="flex items-center">
                <img src="/fandomly-logo-with-text.png" alt="Fandomly" className="h-8 w-auto" />
              </div>
              <div className="w-24"></div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {currentStep !== "complete" && (
          <div className="bg-brand-dark-purple/50 py-4">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Step {getStepNumber()} of 4</span>
                <span className="text-sm text-gray-300">{Math.round((getStepNumber() / 4) * 100)}% Complete</span>
              </div>
              <Progress value={(getStepNumber() / 4) * 100} className="h-2" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {currentStep === "welcome" && renderWelcome()}
          {currentStep === "template-selection" && (
            <FamilyAthleteTemplates onSelectTemplate={handleTemplateSelect} />
          )}
          {currentStep === "athlete-setup" && athleteType && (
            <AthleteSpecificOnboarding
              athleteType={athleteType}
              onComplete={handleAthleteSetupComplete}
              onBack={() => setCurrentStep("template-selection")}
            />
          )}
          {currentStep === "complete" && renderComplete()}
        </div>
      </div>
    </ProtectedRoute>
  );
}