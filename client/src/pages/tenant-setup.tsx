import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Store,
  Palette,
  Users,
  Crown,
  Zap,
  Star,
  Trophy,
  Instagram,
  Twitter,
  Music,
  Rocket,
} from 'lucide-react';
import { SUBSCRIPTION_TIERS, SELECTABLE_TIERS } from '@shared/subscription-config';

const tierIcons: Record<string, typeof Star> = {
  free: Rocket,
  beginner: Zap,
  rising: Crown,
  allstar: Trophy,
  enterprise: Store,
};

const tierColors: Record<string, string> = {
  free: 'from-blue-500 to-cyan-500',
  beginner: 'from-cyan-500 to-teal-500',
  rising: 'from-purple-500 to-indigo-500',
  allstar: 'from-amber-500 to-orange-500',
  enterprise: 'from-green-500 to-emerald-500',
};

const subscriptionTiers = SELECTABLE_TIERS.map((tierId) => {
  const tier = SUBSCRIPTION_TIERS[tierId];
  return {
    id: tierId,
    name: tier.name,
    price: tier.priceLabel,
    limits: tier.limits,
    features: tier.features,
    color: tierColors[tierId] || 'from-blue-500 to-cyan-500',
    icon: tierIcons[tierId] || Star,
    popular: tier.recommended || false,
  };
});

const businessTypes = [
  { id: 'individual', name: 'Individual Athlete/Creator', icon: Star },
  { id: 'team', name: 'Team/Group', icon: Users },
  { id: 'organization', name: 'Organization/Brand', icon: Store },
];

const sportCategories = [
  'Football',
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
  'Hockey',
  'Softball',
  'Cross Country',
  'Other',
];

const collegeYears = [
  { id: 'freshman', name: 'Freshman' },
  { id: 'sophomore', name: 'Sophomore' },
  { id: 'junior', name: 'Junior' },
  { id: 'senior', name: 'Senior' },
  { id: 'graduate', name: 'Graduate Student' },
];

export default function TenantSetup() {
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState('free');
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    slug: '',
    businessType: '',

    // Athlete Specific
    sport: '',
    position: '',
    school: '',
    division: '',
    year: '',

    // Branding
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    accentColor: '#10B981',

    // Social Links
    instagram: '',
    twitter: '',
    tiktok: '',
    youtube: '',
    spotify: '',

    // Settings
    timezone: 'America/New_York',
    currency: 'USD',
    language: 'en',
    nilCompliance: false,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const selectedTierData = subscriptionTiers.find((tier) => tier.id === selectedTier);

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
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

        {/* Step Content */}
        {step === 1 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <Store className="h-8 w-8 text-brand-primary" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-gray-300">
                  Store Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Aerial Ace Athletics, Luna Music, Thunder Squad"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="text-gray-300">
                  Store URL *
                </Label>
                <div className="flex items-center">
                  <span className="text-gray-400 text-sm mr-2">fandomly.ai/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="your-store-name"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Business Type *</Label>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {businessTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setFormData((prev) => ({ ...prev, businessType: type.id }))}
                        className={`p-4 rounded-xl border transition-all ${
                          formData.businessType === type.id
                            ? 'border-brand-primary bg-brand-primary/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
                        <p className="text-white text-sm font-medium">{type.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.slug || !formData.businessType}
                className="w-full gradient-primary text-[#101636] font-bold"
              >
                Continue to Athlete Details
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <Trophy className="h-8 w-8 text-brand-primary" />
                Athlete Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Sport *</Label>
                  <Select
                    value={formData.sport}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, sport: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select your sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {sportCategories.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position" className="text-gray-300">
                    Position
                  </Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g., Quarterback, Point Guard"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="school" className="text-gray-300">
                    School/University
                  </Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData((prev) => ({ ...prev, school: e.target.value }))}
                    placeholder="e.g., University of Florida"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Year</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, year: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {collegeYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="division" className="text-gray-300">
                  Division
                </Label>
                <Input
                  id="division"
                  value={formData.division}
                  onChange={(e) => setFormData((prev) => ({ ...prev, division: e.target.value }))}
                  placeholder="e.g., NCAA Division I, Division II"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="nilCompliance"
                  checked={formData.nilCompliance}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nilCompliance: e.target.checked }))
                  }
                  className="w-4 h-4 accent-brand-primary"
                />
                <Label htmlFor="nilCompliance" className="text-gray-300">
                  Enable NIL compliance monitoring and reporting
                </Label>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 gradient-primary text-[#101636] font-bold"
                >
                  Continue to Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <Palette className="h-8 w-8 text-brand-primary" />
                Store Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-4 block">Brand Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Primary</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                        }
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                        }
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                        }
                        className="w-12 h-10 rounded-lg border border-white/20"
                      />
                      <Input
                        value={formData.accentColor}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                        }
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Social Media Links</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <Input
                      value={formData.instagram}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, instagram: e.target.value }))
                      }
                      placeholder="Instagram username"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Twitter className="h-5 w-5 text-blue-400" />
                    <Input
                      value={formData.twitter}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, twitter: e.target.value }))
                      }
                      placeholder="Twitter/X handle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-red-500" />
                    <Input
                      value={formData.tiktok}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tiktok: e.target.value }))}
                      placeholder="TikTok handle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 gradient-primary text-[#101636] font-bold"
                >
                  Continue to Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
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

            <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-xl">Store Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    {formData.name
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'YS'}
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">
                      {formData.name || 'Your Store'}
                    </h3>
                    <p className="text-gray-400">fandomly.ai/{formData.slug || 'your-store'}</p>
                    {selectedTierData && (
                      <Badge className="mt-1" style={{ backgroundColor: formData.accentColor }}>
                        {selectedTierData.name} Plan
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {selectedTierData?.limits.maxMembers.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Max Members</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {selectedTierData?.limits.maxCampaigns}
                    </div>
                    <div className="text-gray-400 text-sm">Campaigns</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {selectedTierData?.limits.maxRewards}
                    </div>
                    <div className="text-gray-400 text-sm">Rewards</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 max-w-2xl mx-auto">
              <Button
                onClick={() => setStep(3)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                className="flex-1 gradient-primary text-[#101636] font-bold"
                onClick={() => {
                  // TODO: Submit tenant creation
                  console.log('Creating tenant:', { ...formData, subscriptionTier: selectedTier });
                }}
              >
                Create Store & Start Trial
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
