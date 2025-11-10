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
  Crown,
  Building
} from "lucide-react";

export default function UserTypeSelection() {
  const [, setLocation] = useLocation();
  const { user: dynamicUser } = useDynamicContext();
  const { registerUser, isRegistering } = useAuth();
  const [selectedType, setSelectedType] = useState<"fan" | "creator" | "brand" | null>(null);

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

  const handleTypeSelection = async (userType: "fan" | "creator" | "brand") => {
    console.log("User selected type:", userType);
    setSelectedType(userType);
    
    try {
      console.log("Starting registration process...");
      // For brand users, register as creator type
      const result = await registerUser(userType === "brand" ? "creator" : userType);
      console.log("Registration successful:", result);
      
      // Redirect based on type
      if (userType === "fan") {
        setLocation("/fan-onboarding/profile");
      } else if (userType === "brand") {
        setLocation("/brand-type-selection");
      } else {
        setLocation("/creator-type-selection");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSelectedType(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      {/* Background: layered radials and subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.18),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.15),transparent_60%),radial-gradient(30%_35%_at_10%_70%,rgba(20,254,238,0.08),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.05]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-10 -right-10 w-[520px] opacity-[0.06] pointer-events-none select-none" />

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
              Join the Web3 loyalty revolution. Whether you're here to support your favorite creators,
              build your own community, or manage multiple brands, we've got you covered.
            </p>
          </div>

          {/* User Type Cards - 3 Column Layout */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                  variant="neon"
                  className="w-full"
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
                  variant="neon-accent"
                  className="w-full font-bold"
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

            {/* Brand Card - RIGHT SIDE */}
            <Card 
              className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-purple-500/50 hover:transform hover:scale-105 ${
                selectedType === "brand" ? "border-purple-500 bg-purple-500/10" : ""
              }`}
              onClick={() => !isRegistering && handleTypeSelection("brand")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-purple-400" />
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  I'm a Brand
                  <Badge className="bg-purple-500/20 text-purple-400">
                    Pro
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage one or multiple brands with agency-level tools
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-200">
                    <Building className="h-5 w-5 text-purple-400" />
                    <span>Multi-brand management</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Users className="h-5 w-5 text-purple-400" />
                    <span>Agency dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Trophy className="h-5 w-5 text-purple-400" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Star className="h-5 w-5 text-purple-400" />
                    <span>White-label options</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  disabled={isRegistering}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Brand button clicked");
                    handleTypeSelection("brand");
                  }}
                >
                  {isRegistering && selectedType === "brand" ? (
                    "Setting up your brand..."
                  ) : (
                    <>
                      Start Managing <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              You can manage multiple user types and switch between them anytime in your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
