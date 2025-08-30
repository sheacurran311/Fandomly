import { useState } from "react";
import { useLocation } from "wouter";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Zap, 
  Trophy,
  Heart,
  Star,
  Sparkles,
  ArrowRight,
  UserCheck,
  Crown
} from "lucide-react";

export default function UserTypeSelection() {
  const [, setLocation] = useLocation();
  const { user: dynamicUser } = useDynamicContext();
  const { registerUser, isRegistering } = useAuth();
  const [selectedType, setSelectedType] = useState<"fan" | "creator" | null>(null);

  console.log("UserTypeSelection - Dynamic user:", !!dynamicUser, "Is registering:", isRegistering);

  // Redirect if not authenticated
  if (!dynamicUser) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please connect your wallet to continue.</p>
            <Button onClick={() => setLocation("/")} className="bg-brand-primary hover:bg-brand-primary/80">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTypeSelection = async (userType: "fan" | "creator") => {
    console.log("User selected type:", userType);
    setSelectedType(userType);
    
    try {
      console.log("Starting registration process...");
      const result = await registerUser(userType);
      console.log("Registration successful:", result);
      
      // Redirect based on type
      if (userType === "fan") {
        setLocation("/fan-onboarding/profile");
      } else {
        setLocation("/rbac-dashboard");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSelectedType(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark-purple/20 via-brand-dark-bg to-brand-dark-green/20" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 px-4 py-2 rounded-full border border-brand-primary/20 mb-6">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <span className="text-brand-primary font-medium">Welcome to Fandomly</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Choose Your
              <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                {" "}Journey
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join the Web3 loyalty revolution. Whether you're here to support your favorite creators 
              or build your own community, we've got you covered.
            </p>
          </div>

          {/* User Type Cards - Creator Left, Fan Right */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Creator Card - LEFT SIDE */}
            <Card 
              className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-brand-primary/50 hover:transform hover:scale-105 ${
                selectedType === "creator" ? "border-brand-primary bg-brand-primary/10" : ""
              }`}
              onClick={() => !isRegistering && handleTypeSelection("creator")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-brand-primary" />
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  I'm a Creator
                  <Badge className="bg-brand-primary/20 text-brand-primary">
                    Free Trial
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Build lasting relationships with your fans through loyalty programs
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-200">
                    <UserCheck className="h-5 w-5 text-brand-primary" />
                    <span>Create loyalty programs</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Zap className="h-5 w-5 text-brand-primary" />
                    <span>Design custom campaigns</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Trophy className="h-5 w-5 text-brand-primary" />
                    <span>Track fan engagement</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Star className="h-5 w-5 text-brand-primary" />
                    <span>NIL compliance tools</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white"
                  disabled={isRegistering}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Creator button clicked");
                    handleTypeSelection("creator");
                  }}
                >
                  {isRegistering && selectedType === "creator" ? (
                    "Setting up your store..."
                  ) : (
                    <>
                      Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Fan Card - RIGHT SIDE */}
            <Card 
              className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-brand-secondary/50 hover:transform hover:scale-105 ${
                selectedType === "fan" ? "border-brand-secondary bg-brand-secondary/10" : ""
              }`}
              onClick={() => !isRegistering && handleTypeSelection("fan")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-brand-secondary/20 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-brand-secondary" />
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  I'm a Fan
                  <Badge className="bg-brand-secondary/20 text-brand-secondary">
                    Free
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Support your favorite creators and earn exclusive rewards
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-200">
                    <Star className="h-5 w-5 text-brand-secondary" />
                    <span>Join loyalty programs</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Trophy className="h-5 w-5 text-brand-secondary" />
                    <span>Earn points and rewards</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Users className="h-5 w-5 text-brand-secondary" />
                    <span>Connect with communities</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Zap className="h-5 w-5 text-brand-secondary" />
                    <span>Access exclusive content</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-white"
                  disabled={isRegistering}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Fan button clicked");
                    handleTypeSelection("fan");
                  }}
                >
                  {isRegistering && selectedType === "fan" ? (
                    "Creating your account..."
                  ) : (
                    <>
                      Join as Fan <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              You can switch between fan and creator modes anytime in your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
