import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAuth as useAuthContext } from "@/contexts/auth-context";
import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy,
  Music,
  User,
  ArrowRight,
  Sparkles,
  Loader2
} from "lucide-react";

const creatorTypes = [
  {
    id: 'athlete',
    title: 'Athlete',
    icon: Trophy,
    description: 'Perfect for college athletes, Olympians, and professional sports figures',
    examples: 'Football players, Basketball stars, Olympic medalists',
    features: [
      'Proprietary NIL Valuation Calculator',
      'Access to Sponsor Directory',
      'Physical & NFT / Digital Collectibles Support',
      'Performance tracking',
      'Fan engagement campaigns'
    ],
    color: 'from-blue-500 to-blue-600',
    popular: true
  },
  {
    id: 'musician',
    title: 'Musician',
    icon: Music,
    description: 'For independent artists, bands, and music creators building their fanbase',
    examples: 'Solo artists, Bands, Music producers',
    features: [
      'Music catalog integrations (Spotify, Apple Music, SoundCloud)',
      'Streaming platform sync across all major platforms',
      'Token-Gated Fan Experiences',
      'Ticket Marketplace Integrations (Ticketmaster Affiliate)',
      'Physical & NFT / Digital Collectibles'
    ],
    color: 'from-purple-500 to-purple-600',
    popular: false
  },
  {
    id: 'content_creator',
    title: 'Content Creator',
    icon: User,
    description: 'For influencers, podcasters, and digital content creators',
    examples: 'YouTubers, TikTokers, Podcasters, Influencers',
    features: [
      'Multi-platform analytics dashboard',
      'Content performance & engagement tracking',
      'Brand partnership management tools',
      'Advanced audience segmentation',
      'Creator monetization & revenue tracking'
    ],
    color: 'from-green-500 to-green-600',
    popular: false
  }
];

export default function CreatorTypeSelection() {
  const [, setLocation] = useLocation();
  const { user, dynamicUser, isLoading } = useAuth();
  const { refreshUser } = useAuthContext();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { toast } = useToast();

  // Mutation to call the new set-creator-type endpoint
  // This atomically creates tenant + creator + draft program
  const setCreatorTypeMutation = useMutation({
    mutationFn: async (creatorType: string) => {
      return fetchApi('/api/auth/set-creator-type', {
        method: 'POST',
        body: JSON.stringify({ creatorType }),
      });
    },
    onSuccess: async () => {
      // Refresh the auth-context user data BEFORE navigating.
      // This is critical: the auth-router checks onboardingState.isCompleted
      // to decide if the creator should be on the dashboard. Without refreshing,
      // the stale state would redirect back to this page in a loop.
      await refreshUser();
      // Navigate to dashboard — onboarding is already complete
      setLocation('/creator-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set up your creator account. Please try again.",
        variant: "destructive",
      });
      setSelectedType(null);
    },
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Loading...</h2>
            <p className="text-gray-300">Please wait while we load your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for authenticated user
  if (!dynamicUser && !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please sign in to continue.</p>
            <Button onClick={() => setLocation("/")} className="bg-brand-primary hover:bg-brand-primary/80">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTypeSelection = (creatorType: string) => {
    if (setCreatorTypeMutation.isPending) return;
    setSelectedType(creatorType);
    // Call the new endpoint that atomically scaffolds everything
    setCreatorTypeMutation.mutate(creatorType);
  };

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      {/* Background: layered radials and subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.18),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.15),transparent_60%),radial-gradient(30%_35%_at_10%_70%,rgba(20,254,238,0.08),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.05]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-10 -right-10 w-[520px] opacity-[0.06] pointer-events-none select-none" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 px-4 py-2 rounded-full border border-brand-primary/20 mb-6">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <span className="text-brand-primary font-medium">Creator Onboarding</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What type of creator are you?
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose your category to unlock personalized features, reward templates, and fan engagement tools
            </p>
          </div>

          {/* Creator Type Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {creatorTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card 
                  key={type.id}
                  className={`bg-white/5 backdrop-blur-lg border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-brand-primary/50 hover:transform hover:scale-105 ${
                    selectedType === type.id ? "border-brand-primary bg-brand-primary/10" : ""
                  } relative`}
                  onClick={() => handleTypeSelection(type.id)}
                >
                  {type.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-brand-primary text-white px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                      {type.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-sm">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-brand-primary text-sm font-medium mb-3">
                        Examples: {type.examples}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-gray-300 text-sm">
                          <div className="w-1.5 h-1.5 bg-brand-primary rounded-full flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant="neon"
                      className="w-full mt-4"
                      disabled={setCreatorTypeMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeSelection(type.id);
                      }}
                    >
                      {setCreatorTypeMutation.isPending && selectedType === type.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          Choose {type.title}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Don't worry - you can always change your creator type later in your settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}