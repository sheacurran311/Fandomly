import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@shared/schema";

export default function FanOnboardingProfile() {
  const { user: dynamicUser } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user", dynamicUser?.userId],
    enabled: !!dynamicUser?.userId,
  });

  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [interests, setInterests] = useState<Array<"musicians" | "athletes" | "content_creators">>([]);

  if (!dynamicUser) {
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

  const toggleInterest = (val: "musicians" | "athletes" | "content_creators") => {
    setInterests(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const onContinue = async () => {
    if (!userData) return;
    await apiRequest("POST", "/api/auth/profile", {
      userId: userData.id,
      profileData: {
        name: name || undefined,
        age: age ? Number(age) : undefined,
        interests: interests.length ? interests : undefined,
      },
    });
    // Move to creators selection
    setLocation("/fan-onboarding/choose-creators");
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Create your profile (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <Input placeholder="Age (optional)" type="number" value={age} onChange={(e) => setAge(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <div>
                <div className="text-gray-300 mb-2">Interests (optional)</div>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { k: "musicians", l: "Musicians" },
                    { k: "athletes", l: "Athletes" },
                    { k: "content_creators", l: "Content Creators" },
                  ] as Array<{ k: "musicians" | "athletes" | "content_creators"; l: string }>).map((opt) => (
                    <Badge
                      key={opt.k}
                      className={interests.includes(opt.k) ? "bg-brand-primary" : "bg-white/10 border-white/20 text-gray-300"}
                      onClick={() => toggleInterest(opt.k)}
                    >
                      {opt.l}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-brand-primary" onClick={onContinue}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


