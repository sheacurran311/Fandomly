import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Music, 
  Trophy, 
  Palette, 
  Store,
  ArrowRight,
  Check,
  Camera,
  Building2,
  Users2,
  GraduationCap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = "theme" | "profile" | "tenant" | "complete";
type CreatorTheme = "athlete" | "musician" | "creator";

interface CreatorOnboardingFlowProps {
  onComplete: () => void;
}

export default function CreatorOnboardingFlow({ onComplete }: CreatorOnboardingFlowProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("theme");
  const [selectedTheme, setSelectedTheme] = useState<CreatorTheme | null>(null);
  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    website: "",
  });
  const [tenantData, setTenantData] = useState({
    tenantName: "",
    tenantSlug: "",
    businessType: "individual" as "individual" | "team" | "organization",
    sport: "",
    position: "",
    school: "",
    division: "",
    year: "" as "" | "freshman" | "sophomore" | "junior" | "senior" | "graduate",
    industryType: "",
    primaryColor: "#7C3AED",
    secondaryColor: "#10B981",
    accentColor: "#3B82F6",
  });

  const createCreatorMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedTheme) {
        console.error("Missing required data:", { user: !!user, selectedTheme });
        throw new Error("Missing required data");
      }
      
      console.log("Starting creator creation flow...");
      console.log("User data:", user);
      console.log("Profile data:", profileData);
      console.log("Tenant data:", tenantData);
      
      // Create user through Dynamic auth with proper role assignment
      const registrationData = {
        dynamicUser: user,
        userType: "creator"  // This will assign customer_admin role
      };
      
      console.log("Prepared registration data:", registrationData);

      // Create or get user with proper Dynamic integration
      const userRecord = await apiRequest("POST", "/api/auth/register", registrationData) as any;
      console.log("User record:", userRecord);
      
      if (!userRecord?.id) {
        throw new Error("Failed to create user record");
      }
      
      // Create tenant for the creator
      const tenantResponse = await apiRequest("POST", "/api/tenants", {
        name: tenantData.tenantName,
        slug: tenantData.tenantSlug,
        ownerId: userRecord.id,
        businessInfo: {
          businessType: tenantData.businessType,
          sport: tenantData.sport || undefined,
          position: tenantData.position || undefined,
          school: tenantData.school || undefined,
          division: tenantData.division || undefined,
          year: tenantData.year || undefined,
          industryType: tenantData.industryType || undefined,
          website: profileData.website || undefined,
        },
        branding: {
          primaryColor: tenantData.primaryColor,
          secondaryColor: tenantData.secondaryColor,
          accentColor: tenantData.accentColor,
        },
        settings: {
          timezone: 'UTC',
          currency: 'USD',
          language: 'en',
          nilCompliance: selectedTheme === 'athlete',
          publicProfile: true,
          allowRegistration: true,
          requireEmailVerification: false,
          enableSocialLogin: true,
        }
      }) as any;

      return apiRequest("POST", "/api/creators", {
        userId: userRecord.id,
        tenantId: tenantResponse.id,
        displayName: profileData.displayName,
        bio: profileData.bio,
        category: selectedTheme,
        website: profileData.website,
        followerCount: 0,
        isVerified: false,
      });
    },
    onSuccess: (data) => {
      console.log("Creator creation successful:", data);
      toast({
        title: "Welcome to Fandomly!",
        description: "Your store has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setCurrentStep("complete");
    },
    onError: (error) => {
      console.error("Creator creation failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  // Auto-generate slug from tenant name
  const handleTenantNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    setTenantData(prev => ({ 
      ...prev, 
      tenantName: name,
      tenantSlug: slug 
    }));
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case "theme": return 25;
      case "profile": return 50;
      case "tenant": return 75;
      case "complete": return 100;
      default: return 0;
    }
  };

  const steps = [
    { id: "theme", label: "Choose Theme", completed: selectedTheme !== null },
    { id: "profile", label: "Your Profile", completed: currentStep === "tenant" || currentStep === "complete" },
    { id: "tenant", label: "Your Store", completed: currentStep === "complete" },
    { id: "complete", label: "All Set!", completed: false }
  ];

  const themes = [
    {
      id: "athlete" as const,
      title: "Athlete",
      description: "Olympic, college, and professional athletes - NIL compliant",
      icon: Trophy,
      gradient: "from-orange-400 to-red-500",
      examples: ["Olympic Sports", "College Football", "Basketball", "Track & Field"]
    },
    {
      id: "creator" as const,
      title: "Content Creator",
      description: "Digital creators, streamers, and online influencers",
      icon: Camera,
      gradient: "from-blue-400 to-purple-500",
      examples: ["YouTuber", "TikTok Creator", "Streamer", "Influencer"]
    },
    {
      id: "musician" as const,
      title: "Musician/Artist",
      description: "Musicians, artists, and performers building their fanbase",
      icon: Music,
      gradient: "from-green-400 to-blue-500",
      examples: ["Singer", "Band", "Producer", "DJ"]
    }
  ];

  const renderThemeSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          What best describes you?
        </h2>
        <p className="text-gray-300 text-lg">
          Choose your category to get personalized features, NIL compliance tools, and recommendations
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = selectedTheme === theme.id;
          
          return (
            <Card 
              key={theme.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                isSelected 
                  ? "bg-white/20 border-brand-primary shadow-xl" 
                  : "bg-white/5 border-white/10 hover:border-brand-primary/50"
              }`}
              onClick={() => setSelectedTheme(theme.id)}
            >
              <CardContent className="p-8 text-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center mx-auto mb-6`}>
                  <Icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{theme.title}</h3>
                <p className="text-gray-300 mb-4">{theme.description}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {theme.examples.map((example) => (
                    <Badge key={example} variant="outline" className="text-xs border-white/20 text-gray-400">
                      {example}
                    </Badge>
                  ))}
                </div>
                {isSelected && (
                  <div className="mt-4 p-2 rounded-full bg-brand-primary/20">
                    <Check className="h-6 w-6 text-brand-primary mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setCurrentStep("profile")}
          disabled={!selectedTheme}
          className="bg-brand-primary hover:bg-brand-primary/80"
          size="lg"
        >
          Continue
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderProfileSetup = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Tell us about yourself
        </h2>
        <p className="text-gray-300 text-lg">
          Create your public profile that fans will see
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name *
              </label>
              <Input
                placeholder="How you want to be known to your fans"
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <Textarea
                placeholder="Tell your fans about yourself and what they can expect..."
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-white/10 border-white/20 text-white min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website (Optional)
              </label>
              <Input
                placeholder="https://yourwebsite.com"
                value={profileData.website}
                onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentStep("theme")}
          variant="outline"
          className="border-white/20 text-gray-300"
        >
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep("tenant")}
          disabled={!profileData.displayName.trim()}
          className="bg-brand-primary hover:bg-brand-primary/80"
          size="lg"
        >
          Continue
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderTenantSetup = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Set up your store
        </h2>
        <p className="text-gray-300 text-lg">
          Create your dedicated space where fans can join your loyalty program
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Store Name *
              </label>
              <Input
                placeholder="Your brand or team name"
                value={tenantData.tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                This will be your store's main identifier
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Store URL
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">fandomly.com/</span>
                <Input
                  value={tenantData.tenantSlug}
                  onChange={(e) => setTenantData(prev => ({ ...prev, tenantSlug: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Your fans will visit your store at this URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Type
              </label>
              <Select value={tenantData.businessType} onValueChange={(value: "individual" | "team" | "organization") => 
                setTenantData(prev => ({ ...prev, businessType: value }))
              }>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Creator</SelectItem>
                  <SelectItem value="team">Team/Group</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Athlete-specific fields */}
            {selectedTheme === "athlete" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sport
                    </label>
                    <Input
                      placeholder="e.g., Football, Basketball"
                      value={tenantData.sport}
                      onChange={(e) => setTenantData(prev => ({ ...prev, sport: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Position
                    </label>
                    <Input
                      placeholder="e.g., Quarterback, Forward"
                      value={tenantData.position}
                      onChange={(e) => setTenantData(prev => ({ ...prev, position: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      School (if applicable)
                    </label>
                    <Input
                      placeholder="University name"
                      value={tenantData.school}
                      onChange={(e) => setTenantData(prev => ({ ...prev, school: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Year
                    </label>
                    <Select value={tenantData.year} onValueChange={(value: "" | "freshman" | "sophomore" | "junior" | "senior" | "graduate") => 
                      setTenantData(prev => ({ ...prev, year: value }))
                    }>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freshman">Freshman</SelectItem>
                        <SelectItem value="sophomore">Sophomore</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Creator/Musician-specific fields */}
            {(selectedTheme === "creator" || selectedTheme === "musician") && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry/Genre
                </label>
                <Input
                  placeholder={selectedTheme === "musician" ? "e.g., Pop, Hip-Hop, Electronic" : "e.g., Gaming, Lifestyle, Tech"}
                  value={tenantData.industryType}
                  onChange={(e) => setTenantData(prev => ({ ...prev, industryType: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            )}

            {/* Brand Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Brand Colors
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Primary</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={tenantData.primaryColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-8 rounded border-white/20"
                    />
                    <Input
                      value={tenantData.primaryColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Secondary</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={tenantData.secondaryColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-8 rounded border-white/20"
                    />
                    <Input
                      value={tenantData.secondaryColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Accent</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={tenantData.accentColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-12 h-8 rounded border-white/20"
                    />
                    <Input
                      value={tenantData.accentColor}
                      onChange={(e) => setTenantData(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentStep("profile")}
          variant="outline"
          className="border-white/20 text-gray-300"
        >
          Back
        </Button>
        <Button
          onClick={() => createCreatorMutation.mutate()}
          disabled={!tenantData.tenantName.trim() || !tenantData.tenantSlug.trim() || createCreatorMutation.isPending}
          className="bg-brand-primary hover:bg-brand-primary/80"
          size="lg"
        >
          {createCreatorMutation.isPending ? "Creating..." : "Create Store"}
          <Store className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6 text-center max-w-2xl mx-auto">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mx-auto mb-8">
        <Check className="h-12 w-12 text-white" />
      </div>
      
      <h2 className="text-4xl font-bold gradient-text mb-4">
        You're all set!
      </h2>
      
      <p className="text-gray-300 text-lg mb-8">
        Your {selectedTheme} store is ready. Start building your loyalty program and connecting with fans!
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Users2 className="h-8 w-8 text-brand-primary mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Invite Fans</h4>
            <p className="text-sm text-gray-400">Share your store URL and start growing your community</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 text-brand-secondary mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Create Rewards</h4>
            <p className="text-sm text-gray-400">Set up exclusive rewards and perks for your loyal fans</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Palette className="h-8 w-8 text-brand-accent mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Customize</h4>
            <p className="text-sm text-gray-400">Personalize your store's branding and campaigns</p>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={onComplete}
        className="bg-brand-primary hover:bg-brand-primary/80"
        size="lg"
      >
        Go to Dashboard
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Creator Onboarding</h1>
            <span className="text-sm text-gray-400">{Math.round(getProgressPercentage())}% Complete</span>
          </div>
          
          <Progress value={getProgressPercentage()} className="mb-6" />
          
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center space-x-2 ${
                  step.completed ? "text-brand-primary" : 
                  currentStep === step.id ? "text-white" : "text-gray-500"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.completed ? "bg-brand-primary text-white" :
                    currentStep === step.id ? "bg-white/20 text-white" : "bg-gray-600 text-gray-400"
                  }`}>
                    {step.completed ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className="text-sm font-medium hidden md:block">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-600 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="pb-8">
          {currentStep === "theme" && renderThemeSelection()}
          {currentStep === "profile" && renderProfileSetup()}
          {currentStep === "tenant" && renderTenantSetup()}
          {currentStep === "complete" && renderComplete()}
        </div>
      </div>
    </div>
  );
}