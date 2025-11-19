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
  MessageSquare,
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
  Play,
  Bell,
  ThumbsUp,
  Disc,
  ListMusic,
  Camera,
  Hash,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { SiTiktok, SiSpotify, SiFacebook, SiInstagram, SiYoutube } from "react-icons/si";

export type TaskTemplateType =
  | 'complete_profile'
  | 'referral'
  | 'checkin'
  | 'follower_milestone'
  | 'twitter_follow'
  | 'twitter_like'
  | 'twitter_retweet'
  | 'twitter_quote_tweet'
  | 'facebook_like_page'
  | 'facebook_like_post'
  | 'facebook_comment_post'
  | 'facebook_comment_photo'
  | 'instagram_follow'
  | 'instagram_like_post'
  | 'comment_code'
  | 'mention_story'
  | 'keyword_comment'
  | 'youtube_subscribe'
  | 'youtube_like'
  | 'youtube_comment'
  | 'tiktok_follow'
  | 'tiktok_like'
  | 'tiktok_comment'
  | 'tiktok_post'
  | 'spotify_follow'
  | 'spotify_playlist'
  | 'social_follow'
  | 'social_like'
  | 'social_share'
  | 'social_comment'
  | 'poll'
  | 'quiz'
  | 'website_visit'
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
  // Note: Complete Profile task is now a platform-only task managed by admins
  // It has been moved to the admin platform tasks for better control and consistency
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
    id: 'twitter_quote_tweet',
    name: 'Quote Tweet',
    description: 'Reward fans for quote tweeting your post with their thoughts',
    icon: MessageCircle,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 90,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Amplify reach with commentary',
      'Build conversations',
      'Viral potential',
    ],
    useCases: [
      'Start discussions',
      'Thought leadership',
      'Community engagement',
    ],
  },

  // Facebook Templates
  {
    id: 'facebook_like_page',
    name: 'Like Facebook Page',
    description: 'Reward fans for liking your Facebook page',
    icon: SiFacebook,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 90,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Grow Facebook following',
      'Increase page engagement',
      'Build fan community',
    ],
    useCases: [
      'Build Facebook presence',
      'Cross-platform growth',
      'Fan engagement',
    ],
  },
  {
    id: 'facebook_like_post',
    name: 'Like Facebook Post',
    description: 'Reward fans for liking a specific Facebook post',
    icon: ThumbsUp,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Boost post engagement',
      'Increase visibility',
      'Algorithm benefits',
    ],
    useCases: [
      'Promote important posts',
      'Increase engagement',
      'Launch announcements',
    ],
  },
  {
    id: 'facebook_comment_post',
    name: 'Comment on Facebook Post',
    description: 'Reward fans for commenting on a specific Facebook post',
    icon: MessageCircle,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Drive meaningful engagement',
      'Build community discussion',
      'Increase post reach',
    ],
    useCases: [
      'Start conversations',
      'Gather feedback',
      'Community building',
    ],
  },
  {
    id: 'facebook_comment_photo',
    name: 'Comment on Facebook Photo',
    description: 'Reward fans for commenting on a specific Facebook photo',
    icon: MessageSquare,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 83,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Drive photo engagement',
      'Build community',
      'Increase visibility',
    ],
    useCases: [
      'Promote photo content',
      'Community interaction',
      'Visual storytelling',
    ],
  },

  // Instagram Templates
  {
    id: 'instagram_follow',
    name: 'Follow on Instagram',
    description: 'Reward fans for following your Instagram account',
    icon: SiInstagram,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Grow Instagram audience',
      'Increase profile visibility',
      'Build visual community',
    ],
    useCases: [
      'Build Instagram presence',
      'Visual storytelling',
      'Fan engagement',
    ],
  },
  {
    id: 'instagram_like_post',
    name: 'Like Instagram Post',
    description: 'Reward fans for liking a specific Instagram post',
    icon: Heart,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Boost post engagement',
      'Increase discoverability',
      'Algorithm optimization',
    ],
    useCases: [
      'Promote key content',
      'Feature highlights',
      'Campaign launches',
    ],
  },
  {
    id: 'comment_code',
    name: 'Comment with Code (Instagram)',
    description: 'Fans comment a unique code on your Instagram post - automatic verification',
    icon: MessageSquare,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Automatic verification via webhook',
      'No manual checking required',
      'Instant point rewards',
    ],
    useCases: [
      'Boost post engagement',
      'Contest entries',
      'Community interaction',
    ],
  },
  {
    id: 'mention_story',
    name: 'Mention in Instagram Story',
    description: 'Fans mention you in their Instagram Story - automatic verification',
    icon: Camera,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Automatic webhook verification',
      'Viral potential',
      'User-generated content',
    ],
    useCases: [
      'Brand awareness',
      'UGC campaigns',
      'Viral marketing',
    ],
  },
  {
    id: 'keyword_comment',
    name: 'Comment with Keyword (Instagram)',
    description: 'Fans comment a specific keyword on your Instagram post - automatic verification',
    icon: Hash,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 86,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Automatic webhook verification',
      'Custom keywords/hashtags',
      'Instant rewards',
    ],
    useCases: [
      'Campaign hashtags',
      'Contest entries',
      'Community challenges',
    ],
  },

  // YouTube Templates
  {
    id: 'youtube_subscribe',
    name: 'Subscribe on YouTube',
    description: 'Reward fans for subscribing to your YouTube channel',
    icon: SiYoutube,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 93,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Grow subscriber base',
      'Increase video reach',
      'Build loyal audience',
    ],
    useCases: [
      'Channel growth',
      'Video marketing',
      'Content creator expansion',
    ],
  },
  {
    id: 'youtube_like',
    name: 'Like YouTube Video',
    description: 'Reward fans for liking a specific YouTube video',
    icon: ThumbsUp,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 89,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Boost video engagement',
      'YouTube algorithm boost',
      'Increase visibility',
    ],
    useCases: [
      'Promote new videos',
      'Launch campaigns',
      'Viral content',
    ],
  },
  {
    id: 'youtube_comment',
    name: 'Comment on YouTube Video',
    description: 'Reward fans for commenting on a specific YouTube video',
    icon: MessageCircle,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 87,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Drive video discussion',
      'Boost engagement metrics',
      'Build community',
    ],
    useCases: [
      'Start conversations',
      'Gather feedback',
      'Community engagement',
    ],
  },

  // TikTok Templates
  {
    id: 'tiktok_follow',
    name: 'Follow on TikTok',
    description: 'Reward fans for following your TikTok account',
    icon: SiTiktok,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Grow TikTok presence',
      'Increase video reach',
      'Build Gen-Z audience',
    ],
    useCases: [
      'TikTok growth',
      'Viral content creation',
      'Youth engagement',
    ],
  },
  {
    id: 'tiktok_like',
    name: 'Like TikTok Video',
    description: 'Reward fans for liking a specific TikTok video',
    icon: Heart,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Boost video engagement',
      'FYP algorithm boost',
      'Viral potential',
    ],
    useCases: [
      'Promote videos',
      'Trending content',
      'Campaign launches',
    ],
  },
  {
    id: 'tiktok_comment',
    name: 'Comment on TikTok Video',
    description: 'Reward fans for commenting on a specific TikTok video',
    icon: MessageCircle,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Drive engagement',
      'Build community',
      'Boost visibility',
    ],
    useCases: [
      'Start conversations',
      'Community building',
      'Viral content',
    ],
  },
  {
    id: 'tiktok_post',
    name: 'Create TikTok Post',
    description: 'Reward fans for creating their own TikTok post with specific hashtags',
    icon: Camera,
    category: 'social',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'User-generated content',
      'Viral campaign potential',
      'Authentic brand advocacy',
    ],
    useCases: [
      'Hashtag challenges',
      'UGC campaigns',
      'Brand awareness',
    ],
  },

  // Interactive Templates
  {
    id: 'poll',
    name: 'Fan Poll',
    description: 'Create interactive polls to gather fan opinions and feedback',
    icon: HelpCircle,
    category: 'community',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 89,
    estimatedSetupTime: '5 minutes',
    benefits: [
      'Gather fan feedback',
      'Drive engagement',
      'Make fans feel heard',
    ],
    useCases: [
      'Content planning',
      'Merchandise ideas',
      'Fan preferences',
    ],
  },
  {
    id: 'quiz',
    name: 'Trivia Quiz',
    description: 'Create quizzes to test fan knowledge and reward correct answers',
    icon: Trophy,
    category: 'community',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 86,
    estimatedSetupTime: '10 minutes',
    benefits: [
      'Fun engagement',
      'Test fan knowledge',
      'Gamification',
    ],
    useCases: [
      'Trivia contests',
      'Educational content',
      'Fan challenges',
    ],
  },
  {
    id: 'website_visit',
    name: 'Website Visit',
    description: 'Reward fans for visiting your website or clicking specific links',
    icon: ExternalLink,
    category: 'custom',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 94,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Drive traffic',
      'Auto-verified',
      'Instant rewards',
    ],
    useCases: [
      'Product launches',
      'Merch stores',
      'External content',
    ],
  },

  // Spotify Templates
  {
    id: 'spotify_follow',
    name: 'Follow on Spotify',
    description: 'Reward fans for following your Spotify artist profile',
    icon: SiSpotify,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 87,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Grow Spotify following',
      'Increase music discovery',
      'Build music fanbase',
    ],
    useCases: [
      'Music promotion',
      'Artist growth',
      'Release campaigns',
    ],
  },
  {
    id: 'spotify_playlist',
    name: 'Follow Spotify Playlist',
    description: 'Reward fans for following a specific Spotify playlist',
    icon: ListMusic,
    category: 'social',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Playlist growth',
      'Music curation',
      'Fan engagement',
    ],
    useCases: [
      'Promote playlists',
      'Music discovery',
      'Curated collections',
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

  const getPlatformIconBg = (templateId: TaskTemplateType) => {
    const bgColors: Record<string, string> = {
      // Twitter
      twitter_follow: 'bg-black',
      twitter_like: 'bg-black',
      twitter_retweet: 'bg-black',
      // Facebook
      facebook_like_page: 'bg-blue-600',
      facebook_like_post: 'bg-blue-600',
      // Instagram
      instagram_follow: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
      instagram_like_post: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
      // YouTube
      youtube_subscribe: 'bg-red-600',
      youtube_like: 'bg-red-600',
      // TikTok
      tiktok_follow: 'bg-black',
      tiktok_like: 'bg-black',
      // Spotify
      spotify_follow: 'bg-green-500',
      spotify_playlist: 'bg-green-500',
    };
    return bgColors[templateId] || '';
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
                const platformBg = getPlatformIconBg(template.id);
                const iconBgClass = platformBg || getCategoryColor(template.category);
                return (
                  <Card
                    key={template.id}
                    className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer group"
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg ${iconBgClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6 text-white" />
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

