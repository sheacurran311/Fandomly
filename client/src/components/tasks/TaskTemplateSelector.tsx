import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Users,
  Flame,
  TrendingUp,
  UserPlus,
  Share2,
  MessageCircle,
  Heart,
  Video,
  Music,
  Search,
  Sparkles,
  Trophy,
  Target,
  Gift,
  Zap,
  CheckCircle,
  Twitter,
  Repeat2,
} from "lucide-react";

export type TaskTemplateType = 
  | 'complete_profile'
  | 'referral'
  | 'checkin'
  | 'follower_milestone'
  | 'twitter_follow'
  | 'twitter_like'
  | 'twitter_retweet'
  | 'social_follow'
  | 'social_like'
  | 'social_share'
  | 'social_comment'
  | 'custom_event';

interface TaskTemplate {
  id: TaskTemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'onboarding' | 'social' | 'community' | 'custom';
  difficulty: 'easy' | 'medium' | 'advanced';
  status: 'ready' | 'coming_soon';
  popularityScore: number;
  estimatedSetupTime: string;
  benefits: string[];
  useCases: string[];
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'complete_profile',
    name: 'Complete Profile',
    description: 'Reward fans for completing their profile with required fields',
    icon: CheckCircle,
    category: 'onboarding',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Collect valuable fan data',
      'Improve fan engagement',
      'One-time reward structure',
    ],
    useCases: [
      'Welcome new fans',
      'Build fan database',
      'Increase profile completeness',
    ],
  },
  {
    id: 'referral',
    name: 'Referral System',
    description: 'Incentivize fans to invite friends with points or percentage earnings',
    icon: Users,
    category: 'onboarding',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 98,
    estimatedSetupTime: '5 minutes',
    benefits: [
      'Viral growth potential',
      'Cost-effective acquisition',
      'Network effects',
    ],
    useCases: [
      'Grow fanbase organically',
      'Launch new campaigns',
      'Build community',
    ],
  },
  {
    id: 'checkin',
    name: 'Daily Check-In',
    description: 'Build engagement habits with daily check-ins and streak bonuses',
    icon: Flame,
    category: 'onboarding',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '4 minutes',
    benefits: [
      'Daily engagement',
      'Habit formation',
      'Streak mechanics',
    ],
    useCases: [
      'Keep fans coming back',
      'Build daily rituals',
      'Reward consistency',
    ],
  },
  {
    id: 'follower_milestone',
    name: 'Follower Milestones',
    description: 'Reward fans when you reach social media follower goals',
    icon: TrendingUp,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Crowdsourced growth',
      'Automatic tracking',
      'Tiered rewards',
    ],
    useCases: [
      'Grow social presence',
      'Celebrate milestones',
      'Incentivize promotion',
    ],
  },
  {
    id: 'twitter_follow',
    name: 'Follow on Twitter/X',
    description: 'Reward fans for following your Twitter account with instant API verification',
    icon: Twitter,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Instant verification via Twitter API',
      'Automatic rewards',
      'Grow Twitter following',
    ],
    useCases: [
      'Build Twitter audience',
      'Quick fan engagement',
      'Simple onboarding',
    ],
  },
  {
    id: 'twitter_like',
    name: 'Like Tweet',
    description: 'Reward fans for liking a specific tweet with instant verification',
    icon: Heart,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Instant API verification',
      'Boost tweet engagement',
      'Automatic point rewards',
    ],
    useCases: [
      'Promote important tweets',
      'Increase engagement',
      'Viral content',
    ],
  },
  {
    id: 'twitter_retweet',
    name: 'Retweet Post',
    description: 'Reward fans for retweeting your content with instant verification',
    icon: Repeat2,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 94,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Instant API verification',
      'Viral reach amplification',
      'Automatic rewards',
    ],
    useCases: [
      'Spread important announcements',
      'Go viral',
      'Amplify content reach',
    ],
  },
  {
    id: 'social_follow',
    name: 'Follow Account',
    description: 'Reward fans for following you on social media platforms',
    icon: UserPlus,
    category: 'social',
    difficulty: 'easy',
    status: 'coming_soon',
    popularityScore: 90,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Quick social growth',
      'Simple verification',
      'High conversion',
    ],
    useCases: [
      'Build social following',
      'Cross-platform growth',
      'Simple onboarding',
    ],
  },
  {
    id: 'social_like',
    name: 'Like Post/Video',
    description: 'Reward fans for liking specific posts, tweets, or videos',
    icon: Heart,
    category: 'social',
    difficulty: 'easy',
    status: 'coming_soon',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Boost engagement',
      'Algorithmic visibility',
      'Content promotion',
    ],
    useCases: [
      'Promote new content',
      'Increase engagement',
      'Launch campaigns',
    ],
  },
  {
    id: 'social_share',
    name: 'Share Content',
    description: 'Reward fans for sharing your content with their followers',
    icon: Share2,
    category: 'social',
    difficulty: 'medium',
    status: 'coming_soon',
    popularityScore: 87,
    estimatedSetupTime: '4 minutes',
    benefits: [
      'Viral potential',
      'Extended reach',
      'Authentic promotion',
    ],
    useCases: [
      'Amplify announcements',
      'Product launches',
      'Event promotion',
    ],
  },
  {
    id: 'social_comment',
    name: 'Comment on Post',
    description: 'Reward fans for leaving comments on your social content',
    icon: MessageCircle,
    category: 'social',
    difficulty: 'medium',
    status: 'coming_soon',
    popularityScore: 82,
    estimatedSetupTime: '4 minutes',
    benefits: [
      'Boost engagement',
      'Quality interactions',
      'Community building',
    ],
    useCases: [
      'Start conversations',
      'Gather feedback',
      'Build community',
    ],
  },
  {
    id: 'custom_event',
    name: 'Custom Event',
    description: 'Create custom tasks for unique actions and events',
    icon: Zap,
    category: 'custom',
    difficulty: 'advanced',
    status: 'coming_soon',
    popularityScore: 75,
    estimatedSetupTime: '10 minutes',
    benefits: [
      'Maximum flexibility',
      'Unique mechanics',
      'Custom validation',
    ],
    useCases: [
      'Special events',
      'Custom integrations',
      'Unique campaigns',
    ],
  },
];

interface TaskTemplateSelectorProps {
  onSelectTemplate: (template: TaskTemplateType) => void;
  onBack?: () => void;
}

export default function TaskTemplateSelector({ onSelectTemplate, onBack }: TaskTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTemplates = TASK_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const readyTemplates = filteredTemplates.filter(t => t.status === 'ready');
  const comingSoonTemplates = filteredTemplates.filter(t => t.status === 'coming_soon');

  const getCategoryColor = (category: string) => {
    const colors = {
      onboarding: 'bg-blue-500/20 text-blue-400 border-blue-400',
      social: 'bg-purple-500/20 text-purple-400 border-purple-400',
      community: 'bg-green-500/20 text-green-400 border-green-400',
      custom: 'bg-orange-500/20 text-orange-400 border-orange-400',
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      advanced: 'text-red-400',
    };
    return colors[difficulty as keyof typeof colors] || colors.easy;
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Header */}
      <div className="border-b border-white/10 bg-brand-dark-purple/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create New Task</h1>
              <p className="text-gray-400">Choose a template to get started</p>
            </div>
            {onBack && (
              <Button variant="outline" onClick={onBack} className="border-white/20 text-white">
                Cancel
              </Button>
            )}
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
              <TabsList className="bg-white/5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ready Templates */}
        {readyTemplates.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <h2 className="text-2xl font-bold text-white">Ready to Use</h2>
              <Badge variant="outline" className="text-brand-primary border-brand-primary">
                {readyTemplates.length}
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer group"
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg ${getCategoryColor(template.category)} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={getCategoryColor(template.category)} size="sm">
                            {template.category}
                          </Badge>
                          {template.popularityScore >= 90 && (
                            <Badge variant="outline" className="text-xs text-brand-secondary border-brand-secondary">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-white">{template.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Target className="h-4 w-4" />
                          <span className={getDifficultyColor(template.difficulty)}>
                            {template.difficulty}
                          </span>
                        </div>
                        <div className="text-gray-400">
                          ~{template.estimatedSetupTime}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-300">Key Benefits:</div>
                        <ul className="space-y-1">
                          {template.benefits.slice(0, 2).map((benefit, index) => (
                            <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button className="w-full bg-brand-primary hover:bg-brand-primary/90 group-hover:scale-105 transition-transform">
                        <Gift className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Coming Soon Templates */}
        {comingSoonTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-gray-400" />
              <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
              <Badge variant="outline" className="text-gray-400 border-gray-400">
                {comingSoonTemplates.length}
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="bg-white/5 backdrop-blur-lg border-white/10 opacity-60"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg bg-gray-500/20 border border-gray-500/30 flex items-center justify-center`}>
                          <Icon className="h-6 w-6 text-gray-400" />
                        </div>
                        <Badge variant="outline" className="text-xs text-gray-400 border-gray-400">
                          Coming Soon
                        </Badge>
                      </div>

                      <CardTitle className="text-white">{template.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="text-sm text-gray-500 italic">
                        This template is under development and will be available soon.
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">No templates found</h3>
            <p className="text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

