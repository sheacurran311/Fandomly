import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Instagram, 
  Twitter, 
  Music2, 
  Youtube, 
  Linkedin, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Users,
  Heart
} from "lucide-react";

interface SimpleOnboardingProps {
  onComplete: () => void;
}

const socialConnectSchema = z.object({
  instagram: z.string().optional(),
  twitter: z.string().optional(), 
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  linkedin: z.string().optional(),
});

type SocialConnectData = z.infer<typeof socialConnectSchema>;

const socialPlatforms = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "from-pink-500 to-purple-500",
    placeholder: "@username",
  },
  {
    id: "twitter", 
    name: "Twitter/X",
    icon: Twitter,
    color: "from-blue-400 to-blue-600",
    placeholder: "@username",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music2,
    color: "from-black to-gray-700",
    placeholder: "@username",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    color: "from-red-500 to-red-600",
    placeholder: "Channel Name",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "from-blue-600 to-blue-700",
    placeholder: "Profile Name",
  },
];

export default function SimpleOnboarding({ onComplete }: SimpleOnboardingProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const form = useForm<SocialConnectData>({
    resolver: zodResolver(socialConnectSchema),
    defaultValues: {
      instagram: "",
      twitter: "",
      tiktok: "",
      youtube: "",
      linkedin: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (socialData: SocialConnectData) => {
      if (!user) {
        throw new Error("No user connected");
      }
      
      // Create basic user record
      const userData = {
        dynamicUserId: user.userId || "",
        email: user.email || "",
        username: user.alias || user.firstName || "Fan",
        avatar: "",
        walletAddress: user.verifiedCredentials?.[0]?.address || "",
        walletChain: user.verifiedCredentials?.[0]?.chain || "",
        userType: "fan" as const,
      };

      const userRecord: any = await apiRequest("POST", "/api/auth/user", userData);
      
      // Add social profiles for the platforms they selected
      const socialProfiles = [];
      for (const platform of selectedPlatforms) {
        const username = socialData[platform as keyof SocialConnectData];
        if (username && username.trim()) {
          const profileData = {
            userId: userRecord.id,
            platform,
            username: username.replace('@', ''),
            profileUrl: generateProfileUrl(platform, username),
            isVisible: true,
          };
          socialProfiles.push(
            apiRequest("POST", "/api/social-profiles", profileData)
          );
        }
      }
      
      await Promise.all(socialProfiles);
      return userRecord;
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Fandomly! 🎉",
        description: `Connected ${selectedPlatforms.length} social platform${selectedPlatforms.length !== 1 ? 's' : ''}. Start exploring fan quests!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Failed to complete setup",
        variant: "destructive",
      });
    },
  });

  const generateProfileUrl = (platform: string, username: string) => {
    const cleanUsername = username.replace('@', '');
    switch (platform) {
      case 'instagram': return `https://instagram.com/${cleanUsername}`;
      case 'twitter': return `https://twitter.com/${cleanUsername}`;
      case 'tiktok': return `https://tiktok.com/@${cleanUsername}`;
      case 'youtube': return `https://youtube.com/@${cleanUsername}`;
      case 'linkedin': return `https://linkedin.com/in/${cleanUsername}`;
      default: return '';
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const onSubmit = (data: SocialConnectData) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Connect Your Socials
            </h1>
            <p className="text-gray-300 text-lg">
              Link your social media to unlock fan quests and start earning rewards from your favorite creators!
            </p>
          </div>
        </div>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center">Choose Your Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Platform Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  {socialPlatforms.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);
                    
                    return (
                      <div key={platform.id} className="space-y-3">
                        <div
                          onClick={() => togglePlatform(platform.id)}
                          className={`
                            relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${isSelected 
                              ? 'border-brand-primary bg-brand-primary/10' 
                              : 'border-white/20 hover:border-white/40'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{platform.name}</h3>
                              <p className="text-sm text-gray-400">Connect your {platform.name} profile</p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-brand-primary" />
                          )}
                        </div>

                        {/* Username input for selected platforms */}
                        {isSelected && (
                          <FormField
                            control={form.control}
                            name={platform.id as keyof SocialConnectData}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {platform.name} Username
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={platform.placeholder}
                                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Benefits preview */}
                <div className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-lg p-6 border border-brand-primary/20">
                  <h3 className="font-semibold text-white mb-4 flex items-center">
                    <Heart className="h-5 w-5 text-brand-primary mr-2" />
                    What You'll Unlock
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-brand-secondary" />
                      <span className="text-gray-300">Join fan communities</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-brand-primary" />
                      <span className="text-gray-300">Complete fan quests</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-gray-300">Earn exclusive rewards</span>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={selectedPlatforms.length === 0 || createUserMutation.isPending}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium py-3 transition-all duration-200"
                >
                  {createUserMutation.isPending ? (
                    "Setting up your profile..."
                  ) : selectedPlatforms.length === 0 ? (
                    "Select at least one platform"
                  ) : (
                    <>
                      Get Started with {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  You can add more platforms later or modify your connections anytime in settings.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}