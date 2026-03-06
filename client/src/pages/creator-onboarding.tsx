/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import useUsernameValidation from '@/hooks/use-username-validation';
import useSlugValidation from '@/hooks/use-slug-validation';
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
  Edit2,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { LocationPicker } from '@/components/ui/location-picker';
import { PersonalLinksInput } from '@/components/ui/personal-links-input';
import { SUBSCRIPTION_TIERS, SELECTABLE_TIERS } from '@shared/subscription-config';

const topSports = [
  'American Football',
  'Basketball',
  'Baseball',
  'Soccer',
  'Tennis',
  'Golf',
  'Swimming',
  'Track & Field',
  'Wrestling',
  'Gymnastics',
  'Volleyball',
  'Softball',
  'Hockey',
  'Lacrosse',
  'Cross Country',
  'Skiing',
  'Boxing',
  'MMA',
  'Aerial Sports',
  'Snowboarding',
  'Skateboarding',
  'Surfing',
  'Cycling',
  'Marathon',
  'Triathlon',
  'Weightlifting',
  'Cheerleading',
  'Dance',
  'Equestrian',
  'Other',
];

const collegeCommitmentOptions = [
  'Committed',
  'Signed',
  'Enrolled',
  'Interested',
  'Contacted',
  'Offered',
];

const educationLevels = [
  { value: 'middle_school', label: 'Middle School' },
  { value: 'high_school', label: 'High School' },
  { value: 'junior_college', label: 'Junior College' },
  { value: 'college_d1', label: 'College - Division I' },
  { value: 'college_d2', label: 'College - Division II' },
  { value: 'college_d3', label: 'College - Division III' },
  { value: 'naia', label: 'NAIA' },
  { value: 'not_enrolled', label: 'Not Currently Enrolled' },
  { value: 'professional', label: 'Professional Athlete' },
];

const gradeSubcategories = {
  high_school: [
    { value: 'freshman', label: 'Freshman (Year 9)' },
    { value: 'sophomore', label: 'Sophomore (Year 10)' },
    { value: 'junior', label: 'Junior (Year 11)' },
    { value: 'senior', label: 'Senior (Year 12)' },
  ],
  college_d1: [
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate Student' },
  ],
  college_d2: [
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate Student' },
  ],
  college_d3: [
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate Student' },
  ],
  naia: [
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate Student' },
  ],
  junior_college: [
    { value: 'freshman', label: 'First Year' },
    { value: 'sophomore', label: 'Second Year' },
  ],
};

const musicGenres = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'R&B',
  'Country',
  'Electronic',
  'Jazz',
  'Classical',
  'Alternative',
  'Indie',
  'Folk',
  'Blues',
  'Reggae',
  'Latin',
  'Metal',
  'Punk',
  'Gospel',
  'Soul',
  'Funk',
  'Disco',
  'House',
  'Techno',
  'Dubstep',
  'Other',
];

const artistTypes = [
  { value: 'independent', label: 'Independent Artist' },
  { value: 'signed', label: 'Signed to Label' },
  { value: 'hobby', label: 'Hobby/Amateur' },
];

const contentTypes = [
  'Creative Video',
  'Podcast',
  'Influencer',
  'Gaming',
  'Educational',
  'Comedy',
  'Lifestyle',
  'Fashion',
  'Beauty',
  'Fitness',
  'Food',
  'Travel',
  'Technology',
  'Sports Commentary',
  'Music Reviews',
  'Art & Design',
  'DIY/Crafts',
  'Other',
];

const topicCategories = [
  // Main categories and subcategories
  { value: 'sports', label: 'Sports', isMain: true },
  { value: 'football', label: 'Football', parent: 'sports' },
  { value: 'soccer', label: 'Soccer', parent: 'sports' },
  { value: 'basketball', label: 'Basketball', parent: 'sports' },
  { value: 'hockey', label: 'Hockey', parent: 'sports' },
  { value: 'sports-betting', label: 'Sports Betting', parent: 'sports' },

  { value: 'technology', label: 'Technology', isMain: true },
  { value: 'blockchain-crypto', label: 'Blockchain/Crypto', parent: 'technology' },
  { value: 'ai', label: 'AI', parent: 'technology' },
  { value: 'coding', label: 'Coding', parent: 'technology' },

  { value: 'entertainment', label: 'Entertainment', isMain: true },
  { value: 'gaming', label: 'Gaming', parent: 'entertainment' },
  { value: 'music', label: 'Music', parent: 'entertainment' },
  { value: 'movies-tv', label: 'Movies & TV', parent: 'entertainment' },

  { value: 'health-wellness', label: 'Health & Wellness', isMain: true },
  { value: 'diet-fitness', label: 'Diet/Fitness', parent: 'health-wellness' },
  { value: 'mental-health', label: 'Mental Health', parent: 'health-wellness' },
  { value: 'meditation', label: 'Meditation', parent: 'health-wellness' },

  { value: 'finance', label: 'Finance', isMain: true },
  { value: 'stock-market', label: 'Stock Market', parent: 'finance' },
  { value: 'investing', label: 'Investing', parent: 'finance' },
  { value: 'personal-finance', label: 'Personal Finance', parent: 'finance' },

  { value: 'science', label: 'Science', isMain: true },
  { value: 'physics', label: 'Physics', parent: 'science' },
  { value: 'biology', label: 'Biology', parent: 'science' },
  { value: 'astronomy', label: 'Astronomy', parent: 'science' },

  { value: 'writing', label: 'Writing', isMain: true },
  { value: 'blogs', label: 'Blogs', parent: 'writing' },
  { value: 'journalism', label: 'Journalism', parent: 'writing' },
  { value: 'creative-writing', label: 'Creative Writing', parent: 'writing' },

  { value: 'fashion', label: 'Fashion', isMain: true },
  { value: 'modeling', label: 'Modeling', parent: 'fashion' },
  { value: 'streetwear', label: 'Streetwear', parent: 'fashion' },
  { value: 'luxury', label: 'Luxury', parent: 'fashion' },

  { value: 'academics', label: 'Academics', isMain: true },
  { value: 'tutoring', label: 'Tutoring', parent: 'academics' },
  { value: 'study-tips', label: 'Study Tips', parent: 'academics' },

  { value: 'guides-how-tos', label: 'Guides/How-Tos', isMain: true },
  { value: 'recipes', label: 'Recipes', parent: 'guides-how-tos' },
  { value: 'diy', label: 'DIY', parent: 'guides-how-tos' },
  { value: 'tutorials', label: 'Tutorials', parent: 'guides-how-tos' },

  { value: 'travel', label: 'Travel', isMain: true },
  { value: 'adventure', label: 'Adventure', parent: 'travel' },
  { value: 'budget-travel', label: 'Budget Travel', parent: 'travel' },
  { value: 'luxury-travel', label: 'Luxury Travel', parent: 'travel' },

  { value: 'politics', label: 'Politics', isMain: true },
  { value: 'news', label: 'News', parent: 'politics' },
  { value: 'predictions', label: 'Predictions', parent: 'politics' },
  { value: 'policy', label: 'Policy', parent: 'politics' },
];

// Platform IDs match program builder / useSocialConnections (lowercase)
const mainContentPlatformOptions = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'discord', label: 'Discord' },
  { id: 'spotify', label: 'Spotify' },
];

const tierIcons: Record<string, typeof Rocket> = {
  free: Rocket,
  beginner: Zap,
  rising: Crown,
  allstar: Trophy,
  enterprise: Building,
};

const tierColors: Record<string, string> = {
  free: 'from-blue-500 to-blue-600',
  beginner: 'from-cyan-500 to-cyan-600',
  rising: 'from-purple-500 to-purple-600',
  allstar: 'from-amber-500 to-amber-600',
  enterprise: 'from-green-500 to-green-600',
};

const subscriptionTiers = SELECTABLE_TIERS.map((tierId) => {
  const tier = SUBSCRIPTION_TIERS[tierId];
  return {
    id: tierId,
    name: tier.name,
    price: tier.priceLabel,
    icon: tierIcons[tierId] || Rocket,
    color: tierColors[tierId] || 'from-blue-500 to-blue-600',
    popular: tier.recommended || false,
    features: tier.features,
  };
});

export default function CreatorOnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState('free');
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
    location: '',

    // Store Info
    name: '',
    slug: '',

    // Athlete specific
    sport: '',
    education: '',
    grade: '', // New field for education subcategory
    position: '',
    school: '',
    graduatingClass: '',
    currentSponsors: '',
    personalLinks: [] as string[],
    rivalsScore: '',
    espnScoutGrade: '',
    rating247: '',
    collegeCommitmentStatus: '',

    // Musician specific
    bandArtistName: '',
    musicCatalogUrl: '',
    artistType: '',
    musicGenre: '',

    // Content Creator specific
    contentType: '',
    topicsOfFocus: [] as string[], // Changed to array for multi-select
    customTopics: [] as string[], // For user-input topics
    aboutMe: '',
    mainContentPlatforms: [] as string[],

    // Branding
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',

    // Banner image instead of social links
    bannerImage: '',
    followerCount: '',

    // Settings
    subscriptionTier: 'free',
  });

  // Username validation
  const {
    isChecking,
    isAvailable,
    error: usernameError,
    suggestions,
    hasChecked,
  } = useUsernameValidation(formData.username);

  // Slug validation
  const {
    isChecking: slugChecking,
    isAvailable: slugAvailable,
    error: slugError,
    suggestions: slugSuggestions,
    hasChecked: slugHasChecked,
  } = useSlugValidation(formData.slug);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/auth/complete-onboarding', data);
    },
    onSuccess: () => {
      toast({
        title: 'Onboarding Complete!',
        description: 'Your creator profile and store have been set up successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/creator-dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive',
      });
    },
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
    setFormData((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug if not manually edited
      slug: isEditingSlug ? prev.slug : generateSlug(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setFormData((prev) => ({
      ...prev,
      slug: slug.toLowerCase(),
    }));
  };

  const handleComplete = () => {
    // Get user ID for authentication
    const userId = user?.id;
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'Please ensure you are signed in',
        variant: 'destructive',
      });
      return;
    }

    const onboardingData = {
      ...formData,
      subscriptionTier: selectedTier,
      creatorType: creatorType,
      userId: userId,
    };
    completeOnboardingMutation.mutate(onboardingData);
  };

  const selectedTierData = subscriptionTiers.find((tier) => tier.id === selectedTier);

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please sign in to access creator onboarding.</p>
            <Button
              onClick={() => setLocation('/')}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
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
      <img
        src="/fandomly-logo-with-text.png"
        alt=""
        className="absolute -bottom-8 -right-8 w-[480px] opacity-[0.05] pointer-events-none select-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">Create Your Fandomly Store</h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Set up your personalized loyalty platform to engage fans and build your community. Each
            store is completely isolated with your own branding, campaigns, and member base.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= stepNum ? 'bg-brand-primary text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step > stepNum ? 'bg-brand-primary' : 'bg-gray-700'
                    }`}
                  />
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
                <Label htmlFor="username" className="text-gray-300">
                  Username *
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      }))
                    }
                    placeholder="your_unique_username"
                    className={`bg-white/10 border-white/20 text-white pr-10 ${
                      hasChecked && !isAvailable
                        ? 'border-red-500'
                        : hasChecked && isAvailable
                          ? 'border-green-500'
                          : ''
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
                {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
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
                          onClick={() => setFormData((prev) => ({ ...prev, username: suggestion }))}
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
                <Label htmlFor="displayName" className="text-gray-300">
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  placeholder="Your name as fans will see it"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Bio only for Athletes and Musicians */}
              {creatorType !== 'content_creator' && (
                <div>
                  <Label htmlFor="bio" className="text-gray-300">
                    Bio
                  </Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell your fans about yourself, your achievements, and what they can expect from your community..."
                    className="w-full p-3 bg-white/10 border border-white/20 text-white rounded-lg resize-none h-24"
                  />
                </div>
              )}

              {/* Location Picker */}
              <LocationPicker
                value={formData.location}
                onChange={(location) => setFormData((prev) => ({ ...prev, location }))}
              />

              <div className="hidden">
                <Label htmlFor="followerCount" className="text-gray-300">
                  Total Follower Count *
                </Label>
                <Input
                  id="followerCount"
                  type="number"
                  value={formData.followerCount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, followerCount: e.target.value }))
                  }
                  placeholder="Total followers across all platforms"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.username || !formData.displayName || !isAvailable || isChecking}
                className="w-full gradient-primary text-[#101636] font-bold"
              >
                Continue to{' '}
                {creatorType === 'athlete'
                  ? 'Athletic'
                  : creatorType === 'musician'
                    ? 'Music'
                    : 'Content'}{' '}
                Details
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
                {creatorType === 'content_creator' && (
                  <User className="h-8 w-8 text-brand-primary" />
                )}
                {creatorType === 'athlete'
                  ? 'Athletic Information'
                  : creatorType === 'musician'
                    ? 'Music Information'
                    : 'Content Creator Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Athlete Fields */}
              {creatorType === 'athlete' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Sport *</Label>
                      <Select
                        value={formData.sport}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, sport: value }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select your sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {topSports.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {sport}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Current Education *</Label>
                      <Select
                        value={formData.education}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, education: value, grade: '' }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Grade Subcategory - Show if education level has subcategories */}
                    {formData.education &&
                      gradeSubcategories[formData.education as keyof typeof gradeSubcategories] && (
                        <div>
                          <Label className="text-gray-300">Grade/Year *</Label>
                          <Select
                            value={formData.grade}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, grade: value }))
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select your current grade/year" />
                            </SelectTrigger>
                            <SelectContent>
                              {gradeSubcategories[
                                formData.education as keyof typeof gradeSubcategories
                              ].map((grade) => (
                                <SelectItem key={grade.value} value={grade.value}>
                                  {grade.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    <div>
                      <Label htmlFor="position" className="text-gray-300">
                        Position (if applicable)
                      </Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, position: e.target.value }))
                        }
                        placeholder="e.g., Quarterback, Point Guard, N/A"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="school" className="text-gray-300">
                        Current School/College/Institution
                      </Label>
                      <Input
                        id="school"
                        value={formData.school}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, school: e.target.value }))
                        }
                        placeholder="University of Oklahoma, St. John Bosco..."
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="graduatingClass" className="text-gray-300">
                        Graduating Class
                      </Label>
                      <Input
                        id="graduatingClass"
                        type="number"
                        value={formData.graduatingClass}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, graduatingClass: e.target.value }))
                        }
                        placeholder="2025"
                        min={new Date().getFullYear()}
                        max={new Date().getFullYear() + 10}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">College Commitment Status</Label>
                    <Select
                      value={formData.collegeCommitmentStatus}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, collegeCommitmentStatus: value }))
                      }
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select status (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {collegeCommitmentOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currentSponsors" className="text-gray-300">
                      Current Sponsors (if applicable)
                    </Label>
                    <Input
                      id="currentSponsors"
                      value={formData.currentSponsors}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currentSponsors: e.target.value }))
                      }
                      placeholder="List any current sponsorships or endorsements"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  {/* Recruiting Metrics */}
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                    <h4 className="text-white font-semibold">Recruiting Metrics (Optional)</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="rivalsScore" className="text-gray-300">
                          Rivals Score
                        </Label>
                        <Input
                          id="rivalsScore"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.rivalsScore}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, rivalsScore: e.target.value }))
                          }
                          placeholder="0-100"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="espnScoutGrade" className="text-gray-300">
                          ESPN Scout Grade
                        </Label>
                        <Input
                          id="espnScoutGrade"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.espnScoutGrade}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, espnScoutGrade: e.target.value }))
                          }
                          placeholder="0-100"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="rating247" className="text-gray-300">
                          247 Rating
                        </Label>
                        <Input
                          id="rating247"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.rating247}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, rating247: e.target.value }))
                          }
                          placeholder="0-100"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Links */}
                  <PersonalLinksInput
                    value={formData.personalLinks}
                    onChange={(links) => setFormData((prev) => ({ ...prev, personalLinks: links }))}
                  />
                </>
              )}

              {/* Musician Fields */}
              {creatorType === 'musician' && (
                <>
                  <div>
                    <Label htmlFor="bandArtistName" className="text-gray-300">
                      Band/Artist Name *
                    </Label>
                    <Input
                      id="bandArtistName"
                      value={formData.bandArtistName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, bandArtistName: e.target.value }))
                      }
                      placeholder="Your stage name or band name"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="musicCatalogUrl" className="text-gray-300">
                      Music Catalog URL
                    </Label>
                    <Input
                      id="musicCatalogUrl"
                      value={formData.musicCatalogUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, musicCatalogUrl: e.target.value }))
                      }
                      placeholder="Spotify, Apple Music, or other streaming link"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Type of Artist *</Label>
                      <Select
                        value={formData.artistType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, artistType: value }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select artist type" />
                        </SelectTrigger>
                        <SelectContent>
                          {artistTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Genre of Music *</Label>
                      <Select
                        value={formData.musicGenre}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, musicGenre: value }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                        <SelectContent>
                          {musicGenres.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
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
                  {/* Topics of Focus - Multi-select with limit of 5 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300">Topics of Focus * (Select up to 5)</Label>
                      <span className="text-sm text-gray-400">
                        {formData.topicsOfFocus.length + formData.customTopics.length}/5 selected
                      </span>
                    </div>

                    {/* Selected Topics Display */}
                    {(formData.topicsOfFocus.length > 0 || formData.customTopics.length > 0) && (
                      <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        {formData.topicsOfFocus.map((topic) => (
                          <Badge
                            key={topic}
                            className="bg-brand-primary text-white flex items-center gap-1 py-1 px-3"
                          >
                            {topicCategories.find((t) => t.value === topic)?.label}
                            <button
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  topicsOfFocus: prev.topicsOfFocus.filter((t) => t !== topic),
                                }))
                              }
                              className="ml-1 hover:text-red-300"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                        {formData.customTopics.map((topic) => (
                          <Badge
                            key={topic}
                            className="bg-purple-500 text-white flex items-center gap-1 py-1 px-3"
                          >
                            {topic}
                            <button
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  customTopics: prev.customTopics.filter((t) => t !== topic),
                                }))
                              }
                              className="ml-1 hover:text-red-300"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Topic Selection Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar p-2 bg-white/5 rounded-lg">
                      {topicCategories.map((topic) => {
                        const isSelected = formData.topicsOfFocus.includes(topic.value);
                        const totalSelected =
                          formData.topicsOfFocus.length + formData.customTopics.length;
                        const isDisabled = !isSelected && totalSelected >= 5;

                        return (
                          <button
                            key={topic.value}
                            onClick={() => {
                              if (isSelected) {
                                setFormData((prev) => ({
                                  ...prev,
                                  topicsOfFocus: prev.topicsOfFocus.filter(
                                    (t) => t !== topic.value
                                  ),
                                }));
                              } else if (totalSelected < 5) {
                                setFormData((prev) => ({
                                  ...prev,
                                  topicsOfFocus: [...prev.topicsOfFocus, topic.value],
                                }));
                              }
                            }}
                            disabled={isDisabled}
                            className={`p-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-brand-primary text-white border-2 border-brand-primary'
                                : isDisabled
                                  ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed opacity-50'
                                  : topic.isMain
                                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/15'
                            } ${topic.isMain ? 'font-bold' : 'pl-4'}`}
                          >
                            {topic.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Topic Input */}
                    <div className="mt-3">
                      <Label className="text-gray-400 text-sm">Add Your Own Topic</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="customTopic"
                          placeholder="Enter a custom topic..."
                          className="bg-white/10 border-white/20 text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const value = input.value.trim();
                              if (
                                value &&
                                !formData.customTopics.includes(value) &&
                                formData.topicsOfFocus.length + formData.customTopics.length < 5
                              ) {
                                setFormData((prev) => ({
                                  ...prev,
                                  customTopics: [...prev.customTopics, value],
                                }));
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = document.getElementById(
                              'customTopic'
                            ) as HTMLInputElement;
                            const value = input?.value.trim();
                            if (
                              value &&
                              !formData.customTopics.includes(value) &&
                              formData.topicsOfFocus.length + formData.customTopics.length < 5
                            ) {
                              setFormData((prev) => ({
                                ...prev,
                                customTopics: [...prev.customTopics, value],
                              }));
                              input.value = '';
                            }
                          }}
                          disabled={
                            formData.topicsOfFocus.length + formData.customTopics.length >= 5
                          }
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="aboutMe" className="text-gray-300">
                      Bio / Description / About Me
                    </Label>
                    <Textarea
                      id="aboutMe"
                      value={formData.aboutMe}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, aboutMe: e.target.value }))
                      }
                      placeholder="Tell your fans about yourself..."
                      rows={4}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Main Content Platforms *</Label>
                    <p className="text-sm text-gray-400 mb-2">
                      Select the platforms where you regularly post content
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {mainContentPlatformOptions.map(({ id, label }) => (
                        <label key={id} className="flex items-center space-x-2 text-gray-300">
                          <Checkbox
                            checked={formData.mainContentPlatforms.includes(id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  mainContentPlatforms: [...prev.mainContentPlatforms, id],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  mainContentPlatforms: prev.mainContentPlatforms.filter(
                                    (p) => p !== id
                                  ),
                                }));
                              }
                            }}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {/* Content Creators can skip this step */}
                {creatorType === 'content_creator' && (
                  <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                    Skip Step
                  </Button>
                )}
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 gradient-primary text-[#101636] font-bold"
                >
                  Continue to Subscription
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Subscription Plan */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Choose Your Plan</h2>
              <p className="text-gray-300">
                Start with a 14-day free trial. Upgrade or downgrade anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {subscriptionTiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <Card
                    key={tier.id}
                    className={`cursor-pointer transition-all duration-300 ${
                      selectedTier === tier.id
                        ? 'bg-white/20 border-brand-primary shadow-xl scale-105'
                        : 'bg-white/10 border-white/20 hover:border-brand-primary/50'
                    }`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <CardHeader className="text-center">
                      {tier.popular && (
                        <div className="mb-2">
                          <Badge className="bg-brand-primary text-white">Most Popular</Badge>
                        </div>
                      )}
                      <div
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mx-auto mb-4`}
                      >
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

            <div className="flex gap-4 max-w-2xl mx-auto">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completeOnboardingMutation.isPending}
                className="flex-1 gradient-primary text-[#101636] font-bold"
              >
                {completeOnboardingMutation.isPending ? 'Setting up...' : 'Complete Setup'}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
