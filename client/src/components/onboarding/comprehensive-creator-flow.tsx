import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Palette, 
  Trophy, 
  Gift, 
  CheckCircle, 
  ArrowRight, 
  Star, 
  Users, 
  Instagram, 
  Twitter,
  Music,
  Gamepad2,
  Camera,
  Hash,
  Globe,
  MessageCircle,
  Facebook,
  TrendingUp,
  Check,
  Sparkles,
  Coins,
  Crown,
  Zap
} from "lucide-react";

interface ComprehensiveCreatorFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 
  | "category" 
  | "profile" 
  | "ideal-users"
  | "branding" 
  | "social" 
  | "loyalty-setup" 
  | "tier-setup" 
  | "complete";

// Comprehensive form schemas
const categorySchema = z.object({
  category: z.enum(["athlete", "musician", "creator"], {
    required_error: "Please select your category",
  }),
});

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name must be under 50 characters"),
  bio: z.string().min(20, "Bio must be at least 20 characters").max(500, "Bio must be under 500 characters"),
  followerCount: z.coerce.number().min(0, "Follower count must be positive").max(100000000, "Please enter a valid number"),
});

const idealUsersSchema = z.object({
  targetAudience: z.array(z.string()).min(1, "Please select at least one target audience"),
  audienceDetails: z.record(z.array(z.string())).optional(),
});

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

const socialSchema = z.object({
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  discord: z.string().optional(),
});

const loyaltySetupSchema = z.object({
  programName: z.string().min(3, "Program name must be at least 3 characters").max(50, "Program name must be under 50 characters"),
  pointsName: z.string().min(2, "Points name must be at least 2 characters").max(20, "Points name must be under 20 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(300, "Description must be under 300 characters"),
});

type CategoryData = z.infer<typeof categorySchema>;
type ProfileData = z.infer<typeof profileSchema>;
type IdealUsersData = z.infer<typeof idealUsersSchema>;
type BrandingData = z.infer<typeof brandingSchema>;
type SocialData = z.infer<typeof socialSchema>;
type LoyaltySetupData = z.infer<typeof loyaltySetupSchema>;

interface TierData {
  name: string;
  minPoints: number;
  benefits: string[];
  color: string;
}

export default function ComprehensiveCreatorFlow({ onComplete }: ComprehensiveCreatorFlowProps) {
  const { user } = useDynamicContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("category");
  
  // Form data state
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [idealUsersData, setIdealUsersData] = useState<IdealUsersData | null>(null);
  const [brandingData, setBrandingData] = useState<BrandingData>({
    primaryColor: "#dd20be",
    secondaryColor: "#a4fc07",
    accentColor: "#03a0fd"
  });
  const [socialData, setSocialData] = useState<SocialData>({});
  const [loyaltyData, setLoyaltyData] = useState<LoyaltySetupData | null>(null);
  const [tiersData, setTiersData] = useState<TierData[]>([
    { name: "Bronze Fan", minPoints: 0, benefits: ["Access to exclusive content"], color: "#CD7F32" },
    { name: "Silver Supporter", minPoints: 1000, benefits: ["Early access to content", "Exclusive community"], color: "#C0C0C0" },
    { name: "Gold VIP", minPoints: 5000, benefits: ["VIP events", "Personal interactions", "Limited NFTs"], color: "#FFD700" }
  ]);

  // Ideal Users selection state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string[]>>({});

  // Forms for each step
  const categoryForm = useForm<CategoryData>({
    resolver: zodResolver(categorySchema),
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  });

  const idealUsersForm = useForm<IdealUsersData>({
    resolver: zodResolver(idealUsersSchema),
    defaultValues: {
      targetAudience: [],
      audienceDetails: {}
    },
  });

  const brandingForm = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: "#dd20be",
      secondaryColor: "#a4fc07", 
      accentColor: "#03a0fd"
    },
  });

  const socialForm = useForm<SocialData>({
    resolver: zodResolver(socialSchema),
  });

  const loyaltyForm = useForm<LoyaltySetupData>({
    resolver: zodResolver(loyaltySetupSchema),
  });

  const createCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !categoryData || !profileData || !loyaltyData) {
        throw new Error("Missing required data");
      }
      
      // Create user record first
      const userData = {
        dynamicUserId: user.userId || "",
        email: user.email || "",
        username: user.alias || user.firstName || profileData.displayName || "Creator",
        avatar: "",
        walletAddress: user.verifiedCredentials?.[0]?.address || "",
        walletChain: user.verifiedCredentials?.[0]?.chain || "",
        userType: "creator" as const,
      };

      const userRecord: any = await apiRequest("POST", "/api/auth/user", userData);
      
      // Create creator profile
      const creatorData = {
        userId: userRecord.id,
        displayName: profileData.displayName,
        bio: profileData.bio,
        category: categoryData.category,
        followerCount: profileData.followerCount,
        brandColors: brandingData,
        socialLinks: socialData,
        isVerified: false,
      };

      const creator: any = await apiRequest("POST", "/api/creators", creatorData);
      
      // Create loyalty program
      const programData = {
        creatorId: creator.id,
        name: loyaltyData.programName,
        description: loyaltyData.description,
        pointsName: loyaltyData.pointsName,
        isActive: true,
        tiers: tiersData.map((tier, index) => ({
          id: `tier_${index}`,
          name: tier.name,
          minPoints: tier.minPoints,
          benefits: tier.benefits,
          color: tier.color,
        })),
      };

      await apiRequest("POST", "/api/loyalty-programs", programData);

      return { user: userRecord, creator };
    },
    onSuccess: () => {
      toast({
        title: "🎉 Welcome to Fandomly!",
        description: "Your creator profile and loyalty program are ready to launch.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setCurrentStep("complete");
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Failed to complete setup",
        variant: "destructive",
      });
    },
  });

  const getProgressPercentage = () => {
    switch (currentStep) {
      case "category": return 12;
      case "profile": return 25;
      case "ideal-users": return 37;
      case "branding": return 50;
      case "social": return 62;
      case "loyalty-setup": return 75;
      case "tier-setup": return 87;
      case "complete": return 100;
      default: return 0;
    }
  };

  const categories = [
    {
      id: "athlete" as const,
      title: "Athlete",
      description: "Sports, fitness, competitions, and athletic achievements",
      icon: Trophy,
      gradient: "from-amber-400 to-orange-500",
      examples: ["Basketball player", "UFC fighter", "Marathon runner", "Swimmer"],
      benefits: ["Sports-focused rewards", "Training content", "Competition updates"]
    },
    {
      id: "musician" as const,
      title: "Musician",
      description: "Music creation, performances, tours, and fan engagement",
      icon: Music,
      gradient: "from-purple-400 to-pink-500",
      examples: ["DJ", "Singer", "Producer", "Band member"],
      benefits: ["Exclusive tracks", "Concert access", "Behind-the-scenes content"]
    },
    {
      id: "creator" as const,
      title: "Content Creator",
      description: "Digital content, streaming, gaming, and online influence",
      icon: Camera,
      gradient: "from-blue-400 to-cyan-500",
      examples: ["YouTuber", "Streamer", "Influencer", "Artist"],
      benefits: ["Early content access", "Live stream perks", "Community features"]
    }
  ];

  const renderCategorySelection = () => (
    <Form {...categoryForm}>
      <form onSubmit={categoryForm.handleSubmit((data) => {
        setCategoryData(data);
        setCurrentStep("profile");
      })} className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            What type of creator are you?
          </h2>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto">
            Choose your category to unlock personalized features, reward templates, and fan engagement tools
          </p>
        </div>

        <FormField
          control={categoryForm.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="grid md:grid-cols-3 gap-8">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = field.value === category.id;
                    
                    return (
                      <Card 
                        key={category.id}
                        className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                          isSelected 
                            ? "bg-white/20 border-brand-primary shadow-2xl ring-2 ring-brand-primary" 
                            : "bg-white/5 border-white/10 hover:border-brand-primary/50 hover:shadow-xl"
                        }`}
                        onClick={() => field.onChange(category.id)}
                      >
                        <CardContent className="p-8 text-center">
                          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                            <Icon className="h-12 w-12 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-3">{category.title}</h3>
                          <p className="text-gray-300 mb-6">{category.description}</p>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold text-brand-secondary mb-2">Examples:</h4>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {category.examples.map((example) => (
                                  <Badge key={example} variant="outline" className="text-xs border-white/20 text-gray-400">
                                    {example}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-semibold text-brand-accent mb-2">You'll get:</h4>
                              <ul className="text-xs text-gray-400 space-y-1">
                                {category.benefits.map((benefit) => (
                                  <li key={benefit} className="flex items-center justify-center">
                                    <CheckCircle className="h-3 w-3 text-brand-secondary mr-1" />
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-6">
                              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center mx-auto">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!categoryForm.watch("category")}
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8 py-3"
            size="lg"
          >
            Continue to Profile
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderProfileSetup = () => (
    <Form {...profileForm}>
      <form onSubmit={profileForm.handleSubmit((data) => {
        setProfileData(data);
        setCurrentStep("ideal-users");
      })} className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            Build Your Creator Profile
          </h2>
          <p className="text-gray-300 text-xl">
            Tell your fans who you are and what makes you unique
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 space-y-6">
            <FormField
              control={profileForm.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Display Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name or brand (e.g., 'DJ Alex' or 'FitnessPro Sarah')"
                      {...field}
                      className="bg-white/10 border-white/20 text-white text-lg py-3"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Bio *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell your fans about yourself, your journey, and what they can expect from your content. Be authentic and engaging!"
                      {...field}
                      className="bg-white/10 border-white/20 text-white min-h-[120px] text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="followerCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Current Follower Count (All Platforms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      className="bg-white/10 border-white/20 text-white text-lg py-3"
                    />
                  </FormControl>
                  <p className="text-sm text-gray-400">This helps us customize your experience and suggest appropriate features</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => setCurrentStep("category")}
            variant="outline"
            className="border-white/20 text-gray-300 px-6"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
            size="lg"
          >
            Continue to Branding
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderBrandingSetup = () => (
    <Form {...brandingForm}>
      <form onSubmit={brandingForm.handleSubmit((data) => {
        setBrandingData(data);
        setCurrentStep("social");
      })} className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            Design Your Brand Identity
          </h2>
          <p className="text-gray-300 text-xl">
            Choose colors that represent your brand and create a cohesive visual experience for your fans
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <FormField
                control={brandingForm.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-white">Primary Color</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="color"
                          value={field.value || "#dd20be"}
                          onChange={field.onChange}
                          className="h-16 w-full border-2 border-white/20 rounded-lg cursor-pointer"
                        />
                        <Input
                          type="text"
                          placeholder="#dd20be"
                          value={field.value || ""}
                          onChange={field.onChange}
                          className="bg-white/10 border-white/20 text-white text-center font-mono"
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-gray-400">Main brand color for buttons and highlights</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={brandingForm.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-white">Secondary Color</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="color"
                          value={field.value || "#a4fc07"}
                          onChange={field.onChange}
                          className="h-16 w-full border-2 border-white/20 rounded-lg cursor-pointer"
                        />
                        <Input
                          type="text"
                          placeholder="#a4fc07"
                          value={field.value || ""}
                          onChange={field.onChange}
                          className="bg-white/10 border-white/20 text-white text-center font-mono"
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-gray-400">Supporting color for accents and CTAs</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={brandingForm.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-white">Accent Color</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="color"
                          value={field.value || "#03a0fd"}
                          onChange={field.onChange}
                          className="h-16 w-full border-2 border-white/20 rounded-lg cursor-pointer"
                        />
                        <Input
                          type="text"
                          placeholder="#03a0fd"
                          value={field.value || ""}
                          onChange={field.onChange}
                          className="bg-white/10 border-white/20 text-white text-center font-mono"
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-gray-400">Accent color for special elements</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Brand Preview</h3>
              <div className="flex space-x-4">
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: brandingForm.watch("primaryColor") || "#dd20be" }}>
                  <div className="text-white font-semibold">Primary Color</div>
                  <div className="text-white/80 text-sm">Buttons & Main Elements</div>
                </div>
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: brandingForm.watch("secondaryColor") || "#a4fc07" }}>
                  <div className="text-black font-semibold">Secondary Color</div>
                  <div className="text-black/80 text-sm">Highlights & CTAs</div>
                </div>
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: brandingForm.watch("accentColor") || "#03a0fd" }}>
                  <div className="text-white font-semibold">Accent Color</div>
                  <div className="text-white/80 text-sm">Special Elements</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => setCurrentStep("ideal-users")}
            variant="outline"
            className="border-white/20 text-gray-300 px-6"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
            size="lg"
          >
            Continue to Social
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderSocialSetup = () => (
    <Form {...socialForm}>
      <form onSubmit={socialForm.handleSubmit((data) => {
        setSocialData(data);
        setCurrentStep("loyalty-setup");
      })} className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            Connect Your Social Platforms
          </h2>
          <p className="text-gray-300 text-xl">
            Link your social accounts to enable automatic fan engagement tracking and rewards
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={socialForm.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-3 text-lg font-semibold">
                      <Instagram className="h-6 w-6 text-pink-500" />
                      <span className="text-white">Instagram</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@username or full URL"
                        {...field}
                        className="bg-white/10 border-white/20 text-white text-lg py-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={socialForm.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-3 text-lg font-semibold">
                      <Twitter className="h-6 w-6 text-blue-400" />
                      <span className="text-white">X (Twitter)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@username or full URL"
                        {...field}
                        className="bg-white/10 border-white/20 text-white text-lg py-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={socialForm.control}
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-3 text-lg font-semibold">
                      <div className="h-6 w-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">T</div>
                      <span className="text-white">TikTok</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@username or full URL"
                        {...field}
                        className="bg-white/10 border-white/20 text-white text-lg py-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={socialForm.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-3 text-lg font-semibold">
                      <Facebook className="h-6 w-6 text-blue-600" />
                      <span className="text-white">Facebook</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Page or profile URL"
                        {...field}
                        className="bg-white/10 border-white/20 text-white text-lg py-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={socialForm.control}
                name="discord"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center space-x-3 text-lg font-semibold">
                      <MessageCircle className="h-6 w-6 text-indigo-500" />
                      <span className="text-white">Discord</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Server invite link or username"
                        {...field}
                        className="bg-white/10 border-white/20 text-white text-lg py-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-8 p-6 bg-brand-accent/10 rounded-lg border border-brand-accent/20">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-6 w-6 text-brand-accent mt-0.5" />
                <div>
                  <h4 className="font-semibold text-brand-accent mb-2">Pro Tip</h4>
                  <p className="text-gray-300">
                    Connect your social accounts to automatically track fan engagement and reward interactions across platforms. 
                    This enables features like "Follow on Instagram for 100 points" or "Share this post for rewards."
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => setCurrentStep("branding")}
            variant="outline"
            className="border-white/20 text-gray-300 px-6"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
            size="lg"
          >
            Continue to Loyalty Program
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderLoyaltySetup = () => (
    <Form {...loyaltyForm}>
      <form onSubmit={loyaltyForm.handleSubmit((data) => {
        setLoyaltyData(data);
        setCurrentStep("tier-setup");
      })} className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            Create Your Loyalty Program
          </h2>
          <p className="text-gray-300 text-xl">
            Design a program that rewards your most engaged fans and builds lasting relationships
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 space-y-8">
            <FormField
              control={loyaltyForm.control}
              name="programName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Program Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 'Thunder Squad' or 'Luna's Legion'"
                      {...field}
                      className="bg-white/10 border-white/20 text-white text-lg py-3"
                    />
                  </FormControl>
                  <p className="text-sm text-gray-400">Give your loyalty program a catchy, memorable name that reflects your brand</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loyaltyForm.control}
              name="pointsName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Points Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 'Thunder Points' or 'Luna Coins'"
                      {...field}
                      className="bg-white/10 border-white/20 text-white text-lg py-3"
                    />
                  </FormControl>
                  <p className="text-sm text-gray-400">What will fans call the points they earn in your program?</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loyaltyForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-white">Program Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what fans can expect from your loyalty program, what they'll earn points for, and what rewards await them..."
                      {...field}
                      className="bg-white/10 border-white/20 text-white min-h-[120px] text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
                <Coins className="h-12 w-12 text-brand-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">Earn Points</h3>
                <p className="text-sm text-gray-400">Social follows, content engagement, purchases</p>
              </div>
              <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
                <Crown className="h-12 w-12 text-brand-accent mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">Unlock Tiers</h3>
                <p className="text-sm text-gray-400">Bronze, Silver, Gold with increasing benefits</p>
              </div>
              <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
                <Gift className="h-12 w-12 text-brand-primary mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">Claim Rewards</h3>
                <p className="text-sm text-gray-400">NFTs, merchandise, exclusive experiences</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => setCurrentStep("social")}
            variant="outline"
            className="border-white/20 text-gray-300 px-6"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
            size="lg"
          >
            Continue to Tier Setup
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderTierSetup = () => (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold gradient-text mb-4">
          Configure Loyalty Tiers
        </h2>
        <p className="text-gray-300 text-xl">
          Set up reward tiers that motivate fans to engage more and climb the loyalty ladder
        </p>
      </div>

      <div className="space-y-6">
        {tiersData.map((tier, index) => (
          <Card key={index} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-6 items-center">
                <div>
                  <Label className="text-sm font-medium text-gray-300">Tier Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => {
                      const newTiers = [...tiersData];
                      newTiers[index].name = e.target.value;
                      setTiersData(newTiers);
                    }}
                    className="bg-white/10 border-white/20 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300">Minimum Points</Label>
                  <Input
                    type="number"
                    value={tier.minPoints}
                    onChange={(e) => {
                      const newTiers = [...tiersData];
                      newTiers[index].minPoints = parseInt(e.target.value) || 0;
                      setTiersData(newTiers);
                    }}
                    className="bg-white/10 border-white/20 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300">Tier Color</Label>
                  <Input
                    type="color"
                    value={tier.color}
                    onChange={(e) => {
                      const newTiers = [...tiersData];
                      newTiers[index].color = e.target.value;
                      setTiersData(newTiers);
                    }}
                    className="h-10 w-full mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Benefits</Label>
                  {tier.benefits.map((benefit, benefitIndex) => (
                    <Input
                      key={benefitIndex}
                      value={benefit}
                      onChange={(e) => {
                        const newTiers = [...tiersData];
                        newTiers[index].benefits[benefitIndex] = e.target.value;
                        setTiersData(newTiers);
                      }}
                      className="bg-white/10 border-white/20 text-white text-sm"
                      placeholder="Enter benefit"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentStep("loyalty-setup")}
          variant="outline"
          className="border-white/20 text-gray-300 px-6"
        >
          Back
        </Button>
        <Button
          onClick={() => createCompleteMutation.mutate()}
          disabled={createCompleteMutation.isPending}
          className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
          size="lg"
        >
          {createCompleteMutation.isPending ? "Creating Your Program..." : "Complete Setup"}
          <Sparkles className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-8 max-w-3xl mx-auto">
      <div className="text-8xl mb-8">🎉</div>
      <h2 className="text-5xl font-bold gradient-text mb-6">
        Welcome to Fandomly!
      </h2>
      <p className="text-2xl text-gray-300 mb-8">
        Your {categoryData?.category} profile and loyalty program are live. 
        Ready to start building your fan community?
      </p>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Invite Fans</h3>
            <p className="text-gray-400 mb-4">Share your program and start building your community</p>
            <Button className="bg-brand-secondary hover:bg-brand-secondary/80 text-black">
              Get Started
            </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-brand-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Track Progress</h3>
            <p className="text-gray-400 mb-4">Monitor engagement and program performance</p>
            <Button className="bg-brand-accent hover:bg-brand-accent/80">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={onComplete}
        className="bg-brand-primary hover:bg-brand-primary/80 text-xl px-12 py-4"
        size="lg"
      >
        Go to Creator Dashboard
        <ArrowRight className="h-6 w-6 ml-3" />
      </Button>
    </div>
  );

  const renderIdealUsersSetup = () => {
    // Get the creator category to determine which subcategories to show
    const currentCategory = categoryData?.category;
    
    const creatorSubcategories = {
      athlete: [
        { id: "professional", name: "Professional", description: "Pro leagues, Olympic, and elite competitive athletes" },
        { id: "college", name: "College", description: "University and collegiate sports programs" },
        { id: "highschool", name: "High School", description: "Local and regional high school competitions" },
        { id: "nil", name: "NIL", description: "Name, Image, Likeness monetization opportunities" }
      ],
      creator: [
        { id: "influencers", name: "Influencers", description: "Social media personalities and brand ambassadors" },
        { id: "vloggers", name: "Vloggers", description: "Video content creators and storytellers" },
        { id: "photographers", name: "Photographers", description: "Visual content specialists and artists" },
        { id: "videographers", name: "Videographers", description: "Professional video production and cinematography" }
      ],
      musician: [
        { id: "grammy-winners", name: "Grammy Winners", description: "Award-winning and recognized professional artists" },
        { id: "indie", name: "Indie", description: "Independent music artists and bands" },
        { id: "backyard", name: "Backyard", description: "Local performers and amateur musicians" },
        { id: "karaoke", name: "Karaoke", description: "Entertainment performers and cover artists" }
      ]
    };

    const categoryIcons = {
      athlete: Trophy,
      creator: Camera,
      musician: Music
    };

    const categoryColors = {
      athlete: "from-amber-400 to-orange-500",
      creator: "from-blue-400 to-cyan-500", 
      musician: "from-purple-400 to-pink-500"
    };

    const categoryTitles = {
      athlete: "Athlete",
      creator: "Content Creator",
      musician: "Musician"
    };

    const subcategories = creatorSubcategories[currentCategory as keyof typeof creatorSubcategories] || [];
    const IconComponent = categoryIcons[currentCategory as keyof typeof categoryIcons] || Users;
    const colorClass = categoryColors[currentCategory as keyof typeof categoryColors] || "from-gray-400 to-gray-500";
    const categoryTitle = categoryTitles[currentCategory as keyof typeof categoryTitles] || "Creator";

    const handleSubcategoryToggle = (subcategoryId: string) => {
      setSelectedCategories(prev => 
        prev.includes(subcategoryId) 
          ? prev.filter(id => id !== subcategoryId)
          : [...prev, subcategoryId]
      );
    };

    const handleSubmit = () => {
      setIdealUsersData({
        targetAudience: selectedCategories,
        audienceDetails: { [currentCategory || 'creator']: selectedCategories }
      });
      setCurrentStep("branding");
    };

    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-full bg-gradient-to-r ${colorClass} mb-6`}>
            <IconComponent className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold gradient-text mb-4">
            What Type of {categoryTitle} Are You?
          </h2>
          <p className="text-gray-300 text-xl">
            Help us customize your experience by selecting your specific category
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {subcategories.map((subcategory) => {
            const isSelected = selectedCategories.includes(subcategory.id);
            
            return (
              <Card 
                key={subcategory.id}
                className={`bg-white/5 border-white/10 cursor-pointer transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-brand-primary bg-brand-primary/10' : 'hover:border-white/20'
                }`}
                onClick={() => handleSubcategoryToggle(subcategory.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{subcategory.name}</h3>
                      <p className="text-gray-400 text-sm">{subcategory.description}</p>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-brand-primary ml-4" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-6 w-6 text-brand-accent mt-0.5" />
            <div>
              <h4 className="font-semibold text-brand-accent mb-2">Why This Matters</h4>
              <p className="text-gray-300 text-sm">
                Your category helps us recommend the best loyalty program features, reward types, 
                and engagement strategies that work best for your specific audience and goals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => setCurrentStep("profile")}
            variant="outline"
            className="border-white/20 text-gray-300 px-6"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCategories.length === 0}
            className="bg-brand-primary hover:bg-brand-primary/80 text-lg px-8"
            size="lg"
          >
            Continue to Branding
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "category":
        return renderCategorySelection();
      case "profile":
        return renderProfileSetup();
      case "ideal-users":
        return renderIdealUsersSetup();
      case "branding":
        return renderBrandingSetup();
      case "social":
        return renderSocialSetup();
      case "loyalty-setup":
        return renderLoyaltySetup();
      case "tier-setup":
        return renderTierSetup();
      case "complete":
        return renderComplete();
      default:
        return renderCategorySelection();
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Progress Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">
              Step {Object.keys({category: 1, profile: 2, "ideal-users": 3, branding: 4, social: 5, "loyalty-setup": 6, "tier-setup": 7, complete: 8}).findIndex(key => key === currentStep) + 1} of 8
            </div>
            <div className="text-sm font-medium text-gray-400">
              {Math.round(getProgressPercentage())}% Complete
            </div>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Current Step Content */}
        {renderCurrentStep()}
      </div>
    </div>
  );
}