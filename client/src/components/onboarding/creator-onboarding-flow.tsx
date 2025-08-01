import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Music, 
  Trophy, 
  Palette, 
  Instagram, 
  Facebook, 
  Twitter, 
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Check,
  Camera,
  Gamepad2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MockSocialConnect from "@/components/social/mock-social-connect";

type OnboardingStep = "theme" | "profile" | "social" | "complete";
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
  const [socialConnections, setSocialConnections] = useState({
    instagram: "",
    tiktok: "",
    twitter: "",
    facebook: "",
    discord: "",
  });

  const createCreatorMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedTheme) throw new Error("Missing required data");
      
      // First ensure we have a user record in our database
      const userData = {
        dynamicUserId: user.userId || "",
        email: user.email || "",
        username: user.alias || user.firstName || profileData.displayName || "Creator",
        avatar: "",
        walletAddress: user.verifiedCredentials?.[0]?.address || "",
        walletChain: user.verifiedCredentials?.[0]?.chain || "",
        userType: "creator" as const,
      };

      // Create or get user
      const userRecord: any = await apiRequest("POST", "/api/auth/register", userData);
      
      return apiRequest("POST", "/api/creators", {
        userId: userRecord.id,
        displayName: profileData.displayName,
        bio: profileData.bio,
        category: selectedTheme,
        brandColors: {
          primary: "#dd20be",
          secondary: "#a4fc07", 
          accent: "#03a0fd",
        },
        socialLinks: {
          instagram: socialConnections.instagram,
          tiktok: socialConnections.tiktok,
          twitter: socialConnections.twitter,
          facebook: socialConnections.facebook,
          discord: socialConnections.discord,
        },
        followerCount: 0,
        isVerified: false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Fandomly!",
        description: "Your creator profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setCurrentStep("complete");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const getProgressPercentage = () => {
    switch (currentStep) {
      case "theme": return 25;
      case "profile": return 50;
      case "social": return 75;
      case "complete": return 100;
      default: return 0;
    }
  };

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
                  <div className="mt-4">
                    <Check className="h-6 w-6 text-brand-secondary mx-auto" />
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
          Build Your Profile
        </h2>
        <p className="text-gray-300 text-lg">
          Tell your fans who you are and what you're about
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
                placeholder="Your name or brand"
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
          onClick={() => setCurrentStep("social")}
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

  const renderSocialConnections = () => (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Connect Your Social Platforms
        </h2>
        <p className="text-gray-300 text-lg">
          Link your social accounts to enable powerful fan engagement features
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Instagram className="h-6 w-6 text-pink-500" />
                <label className="text-sm font-medium text-gray-300">Instagram</label>
              </div>
              <Input
                placeholder="@username or profile URL"
                value={socialConnections.instagram}
                onChange={(e) => setSocialConnections(prev => ({ ...prev, instagram: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">T</div>
                <label className="text-sm font-medium text-gray-300">TikTok</label>
              </div>
              <Input
                placeholder="@username or profile URL"
                value={socialConnections.tiktok}
                onChange={(e) => setSocialConnections(prev => ({ ...prev, tiktok: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Twitter className="h-6 w-6 text-blue-400" />
                <label className="text-sm font-medium text-gray-300">X (Twitter)</label>
              </div>
              <Input
                placeholder="@username or profile URL"
                value={socialConnections.twitter}
                onChange={(e) => setSocialConnections(prev => ({ ...prev, twitter: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Facebook className="h-6 w-6 text-blue-600" />
                <label className="text-sm font-medium text-gray-300">Facebook</label>
              </div>
              <Input
                placeholder="Page or profile URL"
                value={socialConnections.facebook}
                onChange={(e) => setSocialConnections(prev => ({ ...prev, facebook: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-indigo-500" />
                <label className="text-sm font-medium text-gray-300">Discord</label>
              </div>
              <Input
                placeholder="Server invite link or username"
                value={socialConnections.discord}
                onChange={(e) => setSocialConnections(prev => ({ ...prev, discord: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="mt-8 p-4 bg-brand-accent/10 rounded-lg border border-brand-accent/20">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-brand-accent mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-accent mb-1">Pro Tip</h4>
                <p className="text-sm text-gray-300">
                  Connect your social accounts to automatically track fan engagement and reward interactions across platforms.
                </p>
              </div>
            </div>
          </div>
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
          disabled={createCreatorMutation.isPending}
          className="bg-brand-primary hover:bg-brand-primary/80"
          size="lg"
        >
          {createCreatorMutation.isPending ? "Creating Profile..." : "Complete Setup"}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-4xl font-bold gradient-text mb-4">
        Welcome to Fandomly!
      </h2>
      <p className="text-xl text-gray-300 mb-8">
        Your {selectedTheme} profile is ready. Start building your loyalty program and engaging with your fans.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Palette className="h-8 w-8 text-brand-secondary mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">Customize Your Program</h3>
            <p className="text-sm text-gray-400">Set up rewards, tiers, and branding</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-brand-accent mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">Track Analytics</h3>
            <p className="text-sm text-gray-400">Monitor fan engagement and growth</p>
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
    <div className="min-h-screen bg-brand-dark-bg py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Step {currentStep === "theme" ? 1 : currentStep === "profile" ? 2 : currentStep === "social" ? 3 : 4} of 4</span>
            <span className="text-sm text-gray-400">{getProgressPercentage()}% Complete</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="max-w-6xl mx-auto">
          {currentStep === "theme" && renderThemeSelection()}
          {currentStep === "profile" && renderProfileSetup()}
          {currentStep === "social" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">
                  Connect Your Social Media
                </h2>
                <p className="text-gray-300 text-lg">
                  Link your accounts to track engagement and grow your fanbase
                </p>
              </div>

              <MockSocialConnect 
                onAccountsChange={(accounts) => {
                  const connections = accounts.reduce((acc, account) => ({
                    ...acc,
                    [account.platform]: `@${account.username}`
                  }), {} as typeof socialConnections);
                  setSocialConnections(prev => ({ ...prev, ...connections }));
                }}
                requiredPlatforms={['instagram', 'tiktok', 'twitter']}
                showMetrics={true}
              />

              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep("profile")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("complete")}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
          {currentStep === "complete" && renderComplete()}
        </div>
      </div>
    </div>
  );
}