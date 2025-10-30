import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@shared/schema";
import useUsernameValidation from "@/hooks/use-username-validation";
import { Check, AlertCircle } from "lucide-react";

export default function FanOnboardingProfile() {
  const { user: dynamicUser } = useDynamicContext();
  const [, setLocation] = useLocation();
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user", dynamicUser?.userId],
    enabled: !!dynamicUser?.userId,
  });

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  
  // Username validation
  const { isChecking, isAvailable, error: usernameError, suggestions, hasChecked } = useUsernameValidation(username);

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

  const onContinue = async () => {
    if (!userData || !username || !isAvailable) return;
    
    try {
      const response = await apiRequest("POST", "/api/auth/profile", {
        userId: userData.id,
        username: username,
        profileData: {
          name: name || undefined,
          age: age ? Number(age) : undefined,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', errorData);
        alert(errorData.error || 'Failed to save profile. Please try again.');
        return;
      }

      // Successfully saved, move to creators selection
      setLocation("/fan-onboarding/choose-creators");
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An error occurred while saving your profile. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.14),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-8 -right-8 w-[420px] opacity-[0.06] pointer-events-none select-none" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Create your profile (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username Field - Required */}
              <div>
                <Label htmlFor="username" className="text-gray-300">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="your_unique_username"
                    className={`bg-white/10 border-white/20 text-white pr-10 ${
                      hasChecked && !isAvailable ? 'border-red-500' : 
                      hasChecked && isAvailable ? 'border-green-500' : ''
                    }`}
                  />
                  {isChecking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {hasChecked && !isChecking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isAvailable ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {usernameError && (
                  <p className="text-red-400 text-sm mt-1">{usernameError}</p>
                )}
                {hasChecked && isAvailable && (
                  <p className="text-green-400 text-sm mt-1">✓ Username is available!</p>
                )}
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-sm mb-1">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setUsername(suggestion)}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <Input placeholder="Age (optional)" type="number" value={age} onChange={(e) => setAge(e.target.value)} className="bg-white/10 border-white/20 text-white" />

              <div className="flex justify-end">
                <Button 
                  variant="neon" 
                  onClick={onContinue}
                  disabled={!username || !isAvailable || isChecking}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


