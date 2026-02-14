import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { type Creator } from "@shared/schema";
import CreatorCard from "@/components/creator/creator-card";

type EnrichedCreator = Creator & { 
  hasActiveCampaign?: boolean;
  user?: {
    username: string;
    profileData?: {
      avatar?: string;
      bannerImage?: string;
    };
  };
  tenant?: {
    slug: string;
    branding?: any;
  };
  program?: {
    id?: string;
    name?: string;
    slug?: string;
    status?: string;
    pointsName?: string;
    pageConfig?: {
      logo?: string;
      headerImage?: string;
      brandColors?: any;
      socialLinks?: any;
      location?: string;
      creatorDetails?: any;
    };
  } | null;
};

export default function FanChooseCreators() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { data: creators = [] } = useQuery<EnrichedCreator[]>({ queryKey: ["/api/creators"] });

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const categories = ["musician", "athlete", "creator"];

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      const matchesCategory = !selectedCategory || c.category === selectedCategory;
      const matchesSearch = !search || c.displayName.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [creators, selectedCategory, search]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const joinSelected = async () => {
    if (!user) return;
    for (const c of creators) {
      if (selected[c.id]) {
        // Use one-tap join endpoint: creates tenant membership + enrolls in program
        try {
          await apiRequest("POST", `/api/fan-programs/join-creator/${c.id}`);
        } catch (err: any) {
          // Ignore "already enrolled" or "no program" errors
          if (!err.message?.includes('already') && !err.message?.includes('no program')) {
            console.warn('Enroll error:', err.message);
          }
        }
      }
    }
    // Mark onboarding completed
    await apiRequest("POST", "/api/auth/update-onboarding", {
      userId: user.id,
      onboardingState: {
        currentStep: 2,
        totalSteps: 3,
        completedSteps: ["profile", "choose_creators"],
        isCompleted: true,
        lastOnboardingRoute: "/fan-onboarding/choose-creators"
      }
    });
    // Refresh auth context so router sees isCompleted = true
    await refreshUser();
    // Redirect to fan dashboard
    setLocation("/fan-dashboard");
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <h2 className="text-white font-bold text-xl mb-4">Authentication Required</h2>
            <Button onClick={() => setLocation("/")} className="bg-brand-primary">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.14),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-8 -right-8 w-[420px] opacity-[0.06] pointer-events-none select-none" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-white">Choose creators to enroll with</CardTitle>
                {selectedCount > 0 && (
                  <span className="text-sm text-brand-secondary">
                    {selectedCount} creator{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <Input 
                  placeholder="Search creators" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" 
                />
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant={selectedCategory === "" ? "default" : "outline"} 
                    onClick={() => setSelectedCategory("")}
                    className={selectedCategory === "" ? "bg-brand-primary" : "border-white/20 text-gray-300"}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button 
                      key={cat} 
                      variant={selectedCategory === cat ? "default" : "outline"} 
                      onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? "bg-brand-primary" : "border-white/20 text-gray-300"}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {filteredCreators.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No creators found matching your criteria.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCreators.map((creator) => (
                    <CreatorCard
                      key={creator.id}
                      creator={creator}
                      variant="selection"
                      selected={!!selected[creator.id]}
                      onSelect={handleSelect}
                      showBio={true}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  {selectedCount === 0 
                    ? (filteredCreators.length === 0 
                        ? "No creators available yet - you can skip and find them later"
                        : "Select creators to follow or join their programs")
                    : `Ready to join ${selectedCount} creator${selectedCount !== 1 ? 's' : ''}`
                  }
                </p>
                <Button 
                  variant="neon" 
                  onClick={joinSelected}
                  className="w-full sm:w-auto"
                >
                  {selectedCount > 0 
                    ? `Continue with ${selectedCount} Creator${selectedCount !== 1 ? 's' : ''}`
                    : "Skip for Now"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
