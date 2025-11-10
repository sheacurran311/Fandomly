import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building,
  Building2,
  Sparkles,
  ArrowRight,
  BarChart,
  Users,
  Shield,
  Zap
} from "lucide-react";

export default function BrandTypeSelection() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<"single" | "agency" | null>(null);

  const handleTypeSelection = (brandType: "single" | "agency") => {
    console.log("Brand type selected:", brandType);
    setSelectedType(brandType);
    setLocation(`/brand-onboarding?type=${brandType}`);
  };

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      {/* Background: layered radials and subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(139,92,246,0.15),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.05]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-10 -right-10 w-[520px] opacity-[0.06] pointer-events-none select-none" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20 mb-6">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="text-purple-400 font-medium">Brand Setup</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Choose Your
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {" "}Brand Type
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Whether you're managing a single brand or an agency with multiple clients,
              we have the perfect solution for your needs.
            </p>
          </div>

          {/* Brand Type Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Single Brand Card */}
            <Card 
              className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-purple-500/50 hover:transform hover:scale-105 ${
                selectedType === "single" ? "border-purple-500 bg-purple-500/10" : ""
              }`}
              onClick={() => handleTypeSelection("single")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-purple-400" />
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  Single Brand
                  <Badge className="bg-purple-500/20 text-purple-400">
                    Starter
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Perfect for individual companies and organizations
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-200">
                    <Building className="h-5 w-5 text-purple-400" />
                    <span>One brand identity</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <BarChart className="h-5 w-5 text-purple-400" />
                    <span>Focused analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Zap className="h-5 w-5 text-purple-400" />
                    <span>Direct management</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Users className="h-5 w-5 text-purple-400" />
                    <span>Build your community</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeSelection("single");
                  }}
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Agency/Multiple Brands Card */}
            <Card 
              className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-indigo-500/50 hover:transform hover:scale-105 ${
                selectedType === "agency" ? "border-indigo-500 bg-indigo-500/10" : ""
              }`}
              onClick={() => handleTypeSelection("agency")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  Multiple Brands / Agency
                  <Badge className="bg-indigo-500/20 text-indigo-400">
                    Pro
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  For agencies managing multiple client brands
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-200">
                    <Building2 className="h-5 w-5 text-indigo-400" />
                    <span>Manage multiple brands</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <BarChart className="h-5 w-5 text-indigo-400" />
                    <span>Centralized dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Shield className="h-5 w-5 text-indigo-400" />
                    <span>Data isolation options</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-200">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <span>Agency analytics</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeSelection("agency");
                  }}
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              You can upgrade or change your plan anytime from your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

