import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { type Creator, type User, type LoyaltyProgram } from "@shared/schema";

type EnrichedCreator = Creator & { hasActiveCampaign?: boolean };

export default function FanChooseCreators() {
  const { user: dynamicUser } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user", dynamicUser?.userId],
    enabled: !!dynamicUser?.userId,
  });
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

  const joinSelected = async () => {
    if (!userData) return;
    for (const c of creators) {
      if (selected[c.id]) {
        // Always follow (tenant membership)
        await apiRequest("POST", `/api/tenants/${c.tenantId}/follow`, { userId: userData.id });

        // If creator has an active campaign, enroll into their first loyalty program (if any)
        if (c.hasActiveCampaign) {
          const res = await fetch(`/api/loyalty-programs/creator/${c.id}`, { credentials: 'include' });
          if (res.ok) {
            const programs: LoyaltyProgram[] = await res.json();
            if (programs.length > 0) {
              const program = programs[0];
              await apiRequest("POST", "/api/fan-programs", {
                tenantId: program.tenantId,
                fanId: userData.id,
                programId: program.id,
              });
            }
          }
        }
      }
    }
    // Mark onboarding completed
    await apiRequest("POST", "/api/auth/update-onboarding", {
      userId: userData.id,
      onboardingState: {
        currentStep: 2,
        totalSteps: 3,
        completedSteps: ["profile", "choose_creators"],
        isCompleted: true,
        lastOnboardingRoute: "/fan-onboarding/choose-creators"
      }
    });
    // Redirect to fan dashboard
    setLocation("/fan-dashboard");
  };

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!dynamicUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Choose creators to follow or join</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <Input placeholder="Search creators" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                <div className="flex gap-2">
                  <Button variant={selectedCategory === "" ? "default" : "outline"} onClick={() => setSelectedCategory("")}>All</Button>
                  {categories.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)}>
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCreators.map((c) => (
                  <Card key={c.id} className={`border ${selected[c.id] ? "border-brand-primary" : "border-white/10"} bg-white/5`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white font-semibold">{c.displayName}</div>
                          <div className="text-xs text-gray-400 capitalize">{c.category}</div>
                        </div>
                        {c.hasActiveCampaign ? (
                          <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                        ) : (
                          <Badge className="bg-white/10 text-gray-300">Follow</Badge>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button className="w-full bg-brand-primary" onClick={() => toggle(c.id)}>
                          {selected[c.id] ? "Selected" : c.hasActiveCampaign ? "Join" : "Follow"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button className="bg-brand-primary" onClick={joinSelected}>
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


