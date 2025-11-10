import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building, Building2, Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

// Topic categories (reused from creator onboarding)
const topicCategories = [
  // Main categories
  { value: "sports", label: "Sports", isMain: true },
  { value: "technology", label: "Technology", isMain: true },
  { value: "entertainment", label: "Entertainment", isMain: true },
  { value: "finance", label: "Finance", isMain: true },
  { value: "fashion", label: "Fashion", isMain: true },
  { value: "food-beverage", label: "Food & Beverage", isMain: true },
  { value: "health-wellness", label: "Health & Wellness", isMain: true },
  { value: "automotive", label: "Automotive", isMain: true },
  { value: "retail", label: "Retail", isMain: true },
  { value: "gaming", label: "Gaming & Esports", isMain: true },
];

const dataIsolationLevels = [
  { value: "strict", label: "Strict", description: "Complete data separation between brands" },
  { value: "aggregated", label: "Aggregated", description: "View combined metrics across brands" },
  { value: "shared", label: "Shared", description: "Full access and insights across all brands" }
];

export default function BrandOnboarding() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const brandType = (params.get("type") || "single") as "single" | "agency";
  
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [username, setUsername] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [location, setLocationValue] = useState("");
  
  // Agency-specific fields
  const [agencyName, setAgencyName] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [dataIsolationLevel, setDataIsolationLevel] = useState("strict");
  
  // Brand identifiers
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopics, setCustomTopics] = useState("");
  
  // Subscription
  const [subscriptionTier, setSubscriptionTier] = useState(brandType === "agency" ? "growth" : "starter");

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/auth/complete-onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to Fandomly! 🎉",
        description: "Your brand profile has been created successfully.",
      });
      setLocation("/creator-dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Onboarding Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1 && !username) {
      toast({
        title: "Username Required",
        description: "Please enter a username to continue.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && (!brandName || !brandWebsite)) {
      toast({
        title: "Brand Information Required",
        description: "Please fill in all required brand fields.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && brandType === "agency" && !agencyName) {
      toast({
        title: "Agency Name Required",
        description: "Please enter your agency name.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const allTopics = [...selectedTopics];
    if (customTopics) {
      allTopics.push(...customTopics.split(',').map(t => t.trim()).filter(Boolean));
    }

    const onboardingData = {
      username,
      creatorType: "brand",
      displayName: brandName,
      bio: brandDescription,
      location,
      brandName,
      brandWebsite,
      brandDescription,
      brandType,
      brandIdentifiers: allTopics,
      subscriptionTier,
      ...(brandType === "agency" ? {
        agencyName,
        agencyWebsite,
        dataIsolationLevel,
      } : {}),
    };

    console.log("Completing brand onboarding:", onboardingData);
    completeOnboardingMutation.mutate(onboardingData);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : prev.length < 5
        ? [...prev, topic]
        : prev
    );
  };

  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(139,92,246,0.15),transparent_60%)]" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20 mb-4">
              {brandType === "agency" ? <Building2 className="h-5 w-5 text-purple-400" /> : <Building className="h-5 w-5 text-purple-400" />}
              <span className="text-purple-400 font-medium">
                {brandType === "agency" ? "Agency Setup" : "Brand Setup"}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Set Up Your {brandType === "agency" ? "Agency" : "Brand"}
            </h1>
            
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx + 1 <= currentStep
                      ? "w-12 bg-purple-500"
                      : "w-8 bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Form Card */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-8">
              {/* Step 1: Account Setup */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">Account Setup</CardTitle>
                    <CardDescription className="text-gray-300">
                      Create your unique username
                    </CardDescription>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Username *</Label>
                      <Input
                        type="text"
                        placeholder="your-brand-name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        This will be your unique identifier on the platform
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Brand Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">
                      {brandType === "agency" ? "Brand & Agency Information" : "Brand Information"}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Tell us about your brand
                    </CardDescription>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Brand/Company Name *</Label>
                      <Input
                        type="text"
                        placeholder="Acme Corporation"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Brand/Company Website *</Label>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={brandWebsite}
                        onChange={(e) => setBrandWebsite(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Brand Description</Label>
                      <Textarea
                        placeholder="Tell your audience about your brand..."
                        value={brandDescription}
                        onChange={(e) => setBrandDescription(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label className="text-white">Location</Label>
                      <Input
                        type="text"
                        placeholder="San Francisco, CA"
                        value={location}
                        onChange={(e) => setLocationValue(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    {brandType === "agency" && (
                      <>
                        <div className="border-t border-white/10 pt-4 mt-6">
                          <h3 className="text-lg font-semibold text-white mb-4">Agency Information</h3>
                        </div>

                        <div>
                          <Label className="text-white">Agency Name *</Label>
                          <Input
                            type="text"
                            placeholder="Your Agency Name"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Agency Website</Label>
                          <Input
                            type="url"
                            placeholder="https://agency.com"
                            value={agencyWebsite}
                            onChange={(e) => setAgencyWebsite(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Data Isolation Level</Label>
                          <Select value={dataIsolationLevel} onValueChange={setDataIsolationLevel}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                              {dataIsolationLevels.map((level) => (
                                <SelectItem key={level.value} value={level.value} className="text-white">
                                  <div>
                                    <div className="font-medium">{level.label}</div>
                                    <div className="text-xs text-gray-400">{level.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Brand Identifiers */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">Brand Categories</CardTitle>
                    <CardDescription className="text-gray-300">
                      Select up to 5 categories or add custom ones
                    </CardDescription>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {topicCategories.map((topic) => (
                        <Badge
                          key={topic.value}
                          variant={selectedTopics.includes(topic.value) ? "default" : "outline"}
                          className={`cursor-pointer ${
                            selectedTopics.includes(topic.value)
                              ? "bg-purple-500 hover:bg-purple-600"
                              : "hover:bg-white/10"
                          }`}
                          onClick={() => toggleTopic(topic.value)}
                        >
                          {selectedTopics.includes(topic.value) && <Check className="h-3 w-3 mr-1" />}
                          {topic.label}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <Label className="text-white">Custom Categories (comma-separated)</Label>
                      <Input
                        type="text"
                        placeholder="Sustainable Fashion, Eco-Friendly, etc."
                        value={customTopics}
                        onChange={(e) => setCustomTopics(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <p className="text-xs text-gray-400">
                      Selected: {selectedTopics.length + (customTopics.split(',').filter(Boolean).length)} categories
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Subscription */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">Choose Your Plan</CardTitle>
                    <CardDescription className="text-gray-300">
                      Select the plan that fits your needs
                    </CardDescription>
                  </div>

                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subscriptionTier === "starter"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                      onClick={() => setSubscriptionTier("starter")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Starter</h3>
                          <p className="text-sm text-gray-300">1 brand, 500 members</p>
                        </div>
                        <p className="text-2xl font-bold text-white">$99<span className="text-sm text-gray-400">/mo</span></p>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subscriptionTier === "growth"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                      onClick={() => setSubscriptionTier("growth")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Growth</h3>
                          <p className="text-sm text-gray-300">3 brands, 2,500 members</p>
                        </div>
                        <p className="text-2xl font-bold text-white">$299<span className="text-sm text-gray-400">/mo</span></p>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subscriptionTier === "enterprise"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                      onClick={() => setSubscriptionTier("enterprise")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                          <p className="text-sm text-gray-300">Unlimited brands & members</p>
                        </div>
                        <p className="text-2xl font-bold text-white">Custom</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={completeOnboardingMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {completeOnboardingMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

