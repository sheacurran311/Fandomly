import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import useUsernameValidation from "@/hooks/use-username-validation";
import useSlugValidation from "@/hooks/use-slug-validation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Store, 
  Trophy, 
  Palette, 
  Music, 
  Crown, 
  User,
  Rocket,
  Building,
  Zap,
  CheckCircle,
  Upload,
  Image,
  AlertCircle,
  Check,
  Edit2
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

const topSports = [
  "American Football", "Basketball", "Baseball", "Soccer", "Tennis", "Golf", 
  "Swimming", "Track & Field", "Wrestling", "Gymnastics", "Volleyball", 
  "Softball", "Hockey", "Lacrosse", "Cross Country", "Skiing", "Boxing",
  "MMA", "Aerial Sports", "Snowboarding", "Skateboarding", "Surfing",
  "Cycling", "Marathon", "Triathlon", "Weightlifting", "Cheerleading",
  "Dance", "Equestrian", "Other"
];

const educationLevels = [
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "junior_college", label: "Junior College" },
  { value: "college_d1", label: "College - Division I" },
  { value: "college_d2", label: "College - Division II" },
  { value: "college_d3", label: "College - Division III" },
  { value: "naia", label: "NAIA" },
  { value: "not_enrolled", label: "Not Currently Enrolled" },
  { value: "professional", label: "Professional Athlete" }
];

const gradeSubcategories = {
  high_school: [
    { value: "freshman", label: "Freshman (Year 9)" },
    { value: "sophomore", label: "Sophomore (Year 10)" },
    { value: "junior", label: "Junior (Year 11)" },
    { value: "senior", label: "Senior (Year 12)" }
  ],
  college_d1: [
    { value: "freshman", label: "Freshman" },
    { value: "sophomore", label: "Sophomore" },
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
    { value: "graduate", label: "Graduate Student" }
  ],
  college_d2: [
    { value: "freshman", label: "Freshman" },
    { value: "sophomore", label: "Sophomore" },
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
    { value: "graduate", label: "Graduate Student" }
  ],
  college_d3: [
    { value: "freshman", label: "Freshman" },
    { value: "sophomore", label: "Sophomore" },
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
    { value: "graduate", label: "Graduate Student" }
  ],
  naia: [
    { value: "freshman", label: "Freshman" },
    { value: "sophomore", label: "Sophomore" },
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
    { value: "graduate", label: "Graduate Student" }
  ],
  junior_college: [
    { value: "freshman", label: "First Year" },
    { value: "sophomore", label: "Second Year" }
  ]
};

const musicGenres = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Country", "Electronic", "Jazz", "Classical",
  "Alternative", "Indie", "Folk", "Blues", "Reggae", "Latin", "Metal", "Punk",
  "Gospel", "Soul", "Funk", "Disco", "House", "Techno", "Dubstep", "Other"
];

const artistTypes = [
  { value: "independent", label: "Independent Artist" },
  { value: "signed", label: "Signed to Label" },
  { value: "hobby", label: "Hobby/Amateur" }
];

const contentTypes = [
  "Creative Video", "Podcast", "Influencer", "Gaming", "Educational", "Comedy",
  "Lifestyle", "Fashion", "Beauty", "Fitness", "Food", "Travel", "Technology",
  "Sports Commentary", "Music Reviews", "Art & Design", "DIY/Crafts", "Other"
];

const socialPlatforms = [
  "Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook", "Twitch", "Discord",
  "Snapchat", "LinkedIn", "Pinterest", "Reddit", "Clubhouse", "OnlyFans", "Other"
];

const subscriptionTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    icon: Rocket,
    color: 'from-blue-500 to-blue-600',
    features: [
      '1 Loyalty Program',
      'Up to 100 members',
      'Basic campaigns',
      'Email support',
      'Standard analytics'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$29/month',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    popular: true,
    features: [
      '5 Loyalty Programs',
      'Up to 1,000 members',
      'Advanced campaigns',
      'Priority support',
      'Advanced analytics',
      'Custom branding',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99/month',
    icon: Building,
    color: 'from-green-500 to-green-600',
    features: [
      'Unlimited programs',
      'Unlimited members',
      'Premium campaigns',
      'Dedicated support',
      'White-label solution',
      'Custom integrations',
      'Advanced compliance'
    ]
  }
];

export default function CreatorOnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { user: dynamicUser } = useDynamicContext();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  
  // Get creator type from URL params
  const params = new URLSearchParams(window.location.search);
  const creatorType = params.get('type') || 'athlete';
  
  const [formData, setFormData] = useState({
    // Common fields - username now required
    username: '',
    creatorType,
    displayName: '',
    bio: '',
    followerCount: '',
    
    // Store Info
    name: '',
    slug: '',
    
    // Athlete specific
    sport: '',
    ageRange: '',
    education: '',
    grade: '', // New field for education subcategory
    position: '',
    school: '',
    graduationYear: '',
    currentSponsors: '',
    nilCompliant: false,
    
    // Musician specific
    bandArtistName: '',
    musicCatalogUrl: '',
    totalFollowerCount: '',
    artistType: '',
    musicGenre: '',
    
    // Content Creator specific
    contentType: '',
    topicsOfFocus: '',
    sponsorships: '',
    totalViews: '',
    platforms: [] as string[],
    
    // Branding
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    
    // Banner image instead of social links
    bannerImage: '',
    
    // Settings
    subscriptionTier: 'professional'
  });

  // Username validation
  const { isChecking, isAvailable, error: usernameError, suggestions, hasChecked } = useUsernameValidation(formData.username);
  
  // Slug validation
  const { 
    isChecking: slugChecking, 
    isAvailable: slugAvailable, 
    error: slugError, 
    suggestions: slugSuggestions,
    hasChecked: slugHasChecked 
  } = useSlugValidation(formData.slug);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/auth/complete-onboarding', data);
    },
    onSuccess: () => {
      toast({
        title: "Onboarding Complete!",
        description: "Your creator profile and store have been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/creator-dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      // Only auto-generate slug if not manually edited
      slug: isEditingSlug ? prev.slug : generateSlug(name)
    }));
  };

  const handleSlugChange = (slug: string) => {
    setFormData(prev => ({
      ...prev,
      slug: slug.toLowerCase()
    }));
  };

  const handleComplete = () => {
    // Get Dynamic user ID for authentication
    const dynamicUserId = dynamicUser?.userId;
    if (!dynamicUserId) {
      toast({
        title: "Authentication Error",
        description: "Please ensure your wallet is connected",
        variant: "destructive",
      });
      return;
    }

    const onboardingData = {
      ...formData,
      subscriptionTier: selectedTier,
      creatorType: creatorType,
      dynamicUserId: dynamicUserId
    };
    completeOnboardingMutation.mutate(onboardingData);
  };

  const selectedTierData = subscriptionTiers.find(tier => tier.id === selectedTier);

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please connect your wallet to access creator onboarding.</p>
            <Button onClick={() => setLocation("/")} className="bg-brand-primary hover:bg-brand-primary/80">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-dark-bg p-6 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.14),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
      <img src="/fandomly-logo-with-text.png" alt="" className="absolute -bottom-8 -right-8 w-[480px] opacity-[0.05] pointer-events-none select-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Create Your Fandomly Store
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Set up your personalized loyalty platform to engage fans and build your community. 
            Each store is completely isolated with your own branding, campaigns, and member base.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= stepNum 
                    ? "bg-brand-primary text-white" 
                    : "bg-gray-700 text-gray-400"
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNum ? "bg-brand-primary" : "bg-gray-700"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Creator Profile Setup */}
        {step === 1 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <User className="h-8 w-8 text-brand-primary" />
                Build Your Creator Profile
              </CardTitle>
              <p className="text-gray-300">Tell your fans who you are and what makes you unique</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Username Field - Required */}
              <div>
                <Label htmlFor="username" className="text-gray-300">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') }))}
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
                          onClick={() => setFormData(prev => ({ ...prev, username: suggestion }))}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="displayName" className="text-gray-300">Display Name *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your name as fans will see it"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell your fans about yourself, your achievements, and what they can expect from your community..."
                  className="w-full p-3 bg-white/10 border border-white/20 text-white rounded-lg resize-none h-24"
                />
              </div>

              <div>
                <Label htmlFor="followerCount" className="text-gray-300">Total Follower Count *</Label>
                <Input
                  id="followerCount"
                  type="number"
                  value={formData.followerCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, followerCount: e.target.value }))}
                  placeholder="Total followers across all platforms"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.username || !formData.displayName || !formData.followerCount || !isAvailable || isChecking}
                className="w-full gradient-primary text-[#101636] font-bold"
              >
                Continue to {creatorType === 'athlete' ? 'Athletic' : creatorType === 'musician' ? 'Music' : 'Content'} Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Creator Type Specific Information */}
        {step === 2 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                {creatorType === 'athlete' && <Trophy className="h-8 w-8 text-brand-primary" />}
                {creatorType === 'musician' && <Music className="h-8 w-8 text-brand-primary" />}
                {creatorType === 'content_creator' && <User className="h-8 w-8 text-brand-primary" />}
                {creatorType === 'athlete' ? 'Athletic Information' : 
                 creatorType === 'musician' ? 'Music Information' : 'Content Creator Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Athlete Fields */}
              {creatorType === 'athlete' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Sport *</Label>
                      <Select value={formData.sport} onValueChange={(value) => setFormData(prev => ({ ...prev, sport: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select your sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {topSports.map((sport) => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Age Range *</Label>
                      <Select value={formData.ageRange} onValueChange={(value) => setFormData(prev => ({ ...prev, ageRange: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13-15">13-15</SelectItem>
                          <SelectItem value="16-18">16-18</SelectItem>
                          <SelectItem value="19-22">19-22</SelectItem>
                          <SelectItem value="23-26">23-26</SelectItem>
                          <SelectItem value="27-30">27-30</SelectItem>
                          <SelectItem value="31+">31+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Current Education *</Label>
                      <Select value={formData.education} onValueChange={(value) => setFormData(prev => ({ ...prev, education: value, grade: '' }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Grade Subcategory - Show if education level has subcategories */}
                    {formData.education && gradeSubcategories[formData.education as keyof typeof gradeSubcategories] && (
                      <div>
                        <Label className="text-gray-300">Grade/Year *</Label>
                        <Select value={formData.grade} onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select your current grade/year" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeSubcategories[formData.education as keyof typeof gradeSubcategories].map((grade) => (
                              <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="position" className="text-gray-300">Position (if applicable)</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="e.g., Quarterback, Point Guard, N/A"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="school" className="text-gray-300">School/University</Label>
                    <Input
                      id="school"
                      value={formData.school}
                      onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                      placeholder="e.g., University of Florida"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="currentSponsors" className="text-gray-300">Current Sponsors (if applicable)</Label>
                    <Input
                      id="currentSponsors"
                      value={formData.currentSponsors}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentSponsors: e.target.value }))}
                      placeholder="List any current sponsorships or endorsements"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="nilCompliant"
                      checked={formData.nilCompliant}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, nilCompliant: checked as boolean }))}
                    />
                    <Label htmlFor="nilCompliant" className="text-gray-300 text-sm">
                      I understand NIL compliance requirements and agree to follow applicable regulations
                    </Label>
                  </div>
                </>
              )}

              {/* Musician Fields */}
              {creatorType === 'musician' && (
                <>
                  <div>
                    <Label htmlFor="bandArtistName" className="text-gray-300">Band/Artist Name *</Label>
                    <Input
                      id="bandArtistName"
                      value={formData.bandArtistName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bandArtistName: e.target.value }))}
                      placeholder="Your stage name or band name"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="musicCatalogUrl" className="text-gray-300">Music Catalog URL</Label>
                    <Input
                      id="musicCatalogUrl"
                      value={formData.musicCatalogUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicCatalogUrl: e.target.value }))}
                      placeholder="Spotify, Apple Music, or other streaming link"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Type of Artist *</Label>
                      <Select value={formData.artistType} onValueChange={(value) => setFormData(prev => ({ ...prev, artistType: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select artist type" />
                        </SelectTrigger>
                        <SelectContent>
                          {artistTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Genre of Music *</Label>
                      <Select value={formData.musicGenre} onValueChange={(value) => setFormData(prev => ({ ...prev, musicGenre: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                        <SelectContent>
                          {musicGenres.map((genre) => (
                            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Content Creator Fields */}
              {creatorType === 'content_creator' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Type of Content *</Label>
                      <Select value={formData.contentType} onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          {contentTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="totalViews" className="text-gray-300">Total Views Across Platforms</Label>
                      <Input
                        id="totalViews"
                        value={formData.totalViews}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalViews: e.target.value }))}
                        placeholder="e.g., 1.5M total views"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topicsOfFocus" className="text-gray-300">Topics of Focus</Label>
                    <Input
                      id="topicsOfFocus"
                      value={formData.topicsOfFocus}
                      onChange={(e) => setFormData(prev => ({ ...prev, topicsOfFocus: e.target.value }))}
                      placeholder="What topics do you create content about?"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sponsorships" className="text-gray-300">Current Sponsors</Label>
                    <Input
                      id="sponsorships"
                      value={formData.sponsorships}
                      onChange={(e) => setFormData(prev => ({ ...prev, sponsorships: e.target.value }))}
                      placeholder="List any current brand partnerships"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Platforms You Regularly Post On *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {socialPlatforms.map((platform) => (
                        <label key={platform} className="flex items-center space-x-2 text-gray-300">
                          <Checkbox
                            checked={formData.platforms.includes(platform)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({ ...prev, platforms: [...prev.platforms, platform] }));
                              } else {
                                setFormData(prev => ({ ...prev, platforms: prev.platforms.filter(p => p !== platform) }));
                              }
                            }}
                          />
                          <span className="text-sm">{platform}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  className="flex-1 gradient-primary text-[#101636] font-bold"
                >
                  Continue to Store Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Store Setup */}
        {step === 3 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <Store className="h-8 w-8 text-brand-primary" />
                Store Setup
              </CardTitle>
              <p className="text-gray-300">Set up your fan loyalty store and branding</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="storeName" className="text-gray-300">Store Name *</Label>
                <Input
                  id="storeName"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Aerial Ace Athletics, Luna Music, Thunder Squad"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="storeSlug" className="text-gray-300">Store URL *</Label>
                <p className="text-sm text-gray-400 mb-2">Your unique creator page URL</p>
                
                {!isEditingSlug ? (
                  <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-gray-400 text-sm">fandomly.com/@</span>
                    <span className="text-white font-mono flex-1">{formData.slug || 'your-slug'}</span>
                    <Button
                      type="button"
                      onClick={() => setIsEditingSlug(true)}
                      variant="ghost"
                      size="sm"
                      className="text-brand-primary hover:text-brand-primary/80 hover:bg-brand-primary/10"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">fandomly.com/@</span>
                      <div className="relative flex-1">
                        <Input
                          id="storeSlug"
                          value={formData.slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="your-store-name"
                          className={`bg-white/10 border-white/20 text-white pr-10 font-mono ${
                            slugHasChecked && !slugAvailable ? 'border-red-500' : 
                            slugHasChecked && slugAvailable ? 'border-green-500' : ''
                          }`}
                        />
                        {slugChecking && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                        {slugHasChecked && !slugChecking && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {slugAvailable ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsEditingSlug(false)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        Done
                      </Button>
                    </div>
                    {slugError && (
                      <p className="text-red-400 text-sm mt-1">{slugError}</p>
                    )}
                    {slugHasChecked && slugAvailable && (
                      <p className="text-green-400 text-sm mt-1">✓ Slug is available!</p>
                    )}
                    {slugSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-400 text-sm mb-1">Suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                          {slugSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, slug: suggestion }));
                              }}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 font-mono"
                            >
                              @{suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  ⓘ Use lowercase letters, numbers, and hyphens only. This will be your permanent URL.
                </p>
              </div>

              <div>
                <Label className="text-gray-300 mb-4 block">Brand Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Primary</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Secondary</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Accent</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.accentColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Image Upload */}
              <div>
                <Label className="text-gray-300 mb-4 block">Profile Banner</Label>
                <ImageUpload
                  type="banner"
                  currentImageUrl={formData.bannerImage}
                  onUploadSuccess={(url) => setFormData(prev => ({ ...prev, bannerImage: url }))}
                  onRemove={() => setFormData(prev => ({ ...prev, bannerImage: '' }))}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)}
                  disabled={!formData.name || !formData.slug || !slugAvailable || slugChecking}
                  className="flex-1 gradient-primary text-[#101636] font-bold"
                >
                  Continue to Subscription
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Subscription Plan */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Choose Your Plan</h2>
              <p className="text-gray-300">Start with a 14-day free trial. Upgrade or downgrade anytime.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {subscriptionTiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <Card 
                    key={tier.id}
                    className={`cursor-pointer transition-all duration-300 ${
                      selectedTier === tier.id 
                        ? "bg-white/20 border-brand-primary shadow-xl scale-105" 
                        : "bg-white/10 border-white/20 hover:border-brand-primary/50"
                    }`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <CardHeader className="text-center">
                      {tier.popular && (
                        <div className="mb-2">
                          <Badge className="bg-brand-primary text-white">Most Popular</Badge>
                        </div>
                      )}
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-white text-2xl">{tier.name}</CardTitle>
                      <div className="text-3xl font-bold text-brand-primary">{tier.price}</div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300 text-sm">
                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full mt-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-xl">Store Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <Store className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{formData.name || "Your Store"}</h3>
                    <p className="text-gray-400">fandomly.com/{formData.slug || "your-store"}</p>
                  </div>
                </div>
                <div className="text-gray-300 text-sm">
                  {formData.bio || "Your store description will appear here..."}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 max-w-2xl mx-auto">
              <Button 
                onClick={() => setStep(3)}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={completeOnboardingMutation.isPending}
                className="flex-1 gradient-primary text-[#101636] font-bold"
              >
                {completeOnboardingMutation.isPending ? "Setting up..." : "Complete Setup"}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}