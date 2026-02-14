import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import useUsernameValidation from "@/hooks/use-username-validation";
import { Check, AlertCircle } from "lucide-react";

export default function FanOnboardingProfile() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");

  // Onboarding steps: 1=Follow Fandomly (placeholder), 2=Profile
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  // Username validation
  const { isChecking, isAvailable, error: usernameError, suggestions, hasChecked } = useUsernameValidation(username);

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

  const onContinueProfile = async () => {
    if (!user) return;
    // Username is now optional - fans can set it later when needed (leaderboard, comments)
    if (username && !isAvailable) return;
    
    try {
      // Only update profile if username was provided
      if (username) {
        const response = await apiRequest("POST", "/api/auth/profile", {
          userId: user.id,
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
      } else {
        // Skip username - just update name/age if provided
        if (name || age) {
          await apiRequest("POST", "/api/auth/profile", {
            userId: user.id,
            profileData: {
              name: name || undefined,
              age: age ? Number(age) : undefined,
            },
          });
        }
      }

      // Update onboarding progress in the database
      await apiRequest("POST", "/api/auth/update-onboarding", {
        userId: user.id,
        onboardingState: {
          currentStep: 1,
          totalSteps: 2,
          completedSteps: ["profile"],
          isCompleted: false,
          lastOnboardingRoute: "/fan-onboarding/choose-creators"
        }
      });

      // Refresh auth context so router has updated state
      await refreshUser();

      // Successfully saved, move to creators selection
      setLocation("/fan-onboarding/choose-creators");
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An error occurred while saving your profile. Please try again.');
    }
  };

  const StepIndicator = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center space-x-3">
        {[1, 2].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= num ? "bg-brand-primary text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              {num}
            </div>
            {num < 2 && <div className={`w-10 h-1 mx-2 ${step > num ? "bg-brand-primary" : "bg-gray-700"}`} />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.14),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-8 -right-8 w-[420px] opacity-[0.06] pointer-events-none select-none" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Complete Onboarding</span>
              <Badge variant="outline" className="border-white/20 text-gray-300">{step}/{totalSteps}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StepIndicator />

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-white text-lg font-semibold">Follow Fandomly (Placeholder)</h3>
                <p className="text-gray-400 text-sm">
                  We'll add auto platform tasks here (Follow on X, Like on Facebook, Follow on Instagram). For now, this step can be skipped.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {["Follow on X (Twitter)", "Like on Facebook", "Follow on Instagram"].map((item) => (
                    <div key={item} className="p-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-sm">
                      <div className="font-semibold">{item}</div>
                      <div className="text-xs text-gray-400 mt-1">Placeholder - tasks coming soon</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    className="text-gray-300 border-white/20 hover:bg-white/10"
                    onClick={() => setStep(2)}
                  >
                    Skip for now
                  </Button>
                  <Button
                    className="bg-brand-primary text-[#101636] hover:bg-brand-primary/80"
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-white text-lg font-semibold">Create your profile</h3>
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
                    <p className="text-green-400 text-sm mt-1">Username is available!</p>
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
                    onClick={onContinueProfile}
                    disabled={!username || !isAvailable || isChecking}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
