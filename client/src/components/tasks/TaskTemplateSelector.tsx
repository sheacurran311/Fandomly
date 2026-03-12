import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
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
  Search,
  Sparkles,
  Trophy,
  Target,
  Gift,
  Zap,
  CheckCircle,
  Twitter,
  Repeat2,
  ThumbsUp,
  ListMusic,
  Camera,
  Hash,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Code,
  Eye,
  Coins,
  Globe,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import {
  SiTiktok,
  SiSpotify,
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiDiscord,
  SiTwitch,
  SiKick,
  SiApplemusic,
} from 'react-icons/si';
import { FaPatreon } from 'react-icons/fa';
import { TIER_GUIDANCE } from '@shared/taskTemplates';

// Verification tier type
type VerificationTier = 'T1' | 'T2' | 'T3';
type VerificationMethod =
  | 'api'
  | 'code_comment'
  | 'code_repost'
  | 'manual'
  | 'starter_pack'
  | 'platform';
type TemplatePlatform =
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'spotify'
  | 'discord'
  | 'twitch'
  | 'kick'
  | 'patreon'
  | 'apple_music'
  | 'general';
type ViewMode = 'grid' | 'by-platform' | 'by-verification';

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
  | 'discord_join'
  | 'discord_verify'
  | 'twitch_follow'
  | 'twitch_subscribe'
  | 'kick_follow'
  | 'kick_subscribe'
  | 'patreon_support'
  | 'patreon_tier_check'
  | 'apple_music_favorite_artist'
  | 'apple_music_add_track'
  | 'apple_music_add_album'
  | 'apple_music_add_playlist'
  | 'apple_music_listen'
  | 'stream_code_verify'
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
  platform: TemplatePlatform;
  difficulty: 'easy' | 'medium' | 'advanced';
  status: 'ready' | 'coming_soon';
  popularityScore: number;
  estimatedSetupTime: string;
  benefits: string[];
  useCases: string[];
  // Verification tier information
  verificationTier: VerificationTier | null;
  verificationMethod: VerificationMethod | null;
  recommendedPoints: number;
}

// Tier configuration for styling and tooltips
const TIER_CONFIG: Record<
  VerificationTier,
  {
    icon: typeof ShieldCheck;
    label: string;
    shortLabel: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  T1: {
    icon: ShieldCheck,
    label: 'API Verified',
    shortLabel: 'T1',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/30',
  },
  T2: {
    icon: Shield,
    label: 'Code Verified',
    shortLabel: 'T2',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
  T3: {
    icon: ShieldAlert,
    label: 'Honor System',
    shortLabel: 'T3',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
  },
};

// Verification method icons and labels
const METHOD_CONFIG: Record<
  VerificationMethod,
  {
    icon: typeof CheckCircle;
    label: string;
  }
> = {
  api: { icon: CheckCircle, label: 'Automatic' },
  code_comment: { icon: Code, label: 'Code in Comment' },
  code_repost: { icon: Code, label: 'Code in Repost' },
  manual: { icon: Eye, label: 'Manual Review' },
  starter_pack: { icon: Gift, label: 'Starter Pack' },
  platform: { icon: Zap, label: 'Platform Verified' },
};

// Platform configuration for grouping and display
const PLATFORM_CONFIG: Record<
  TemplatePlatform,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    textColor: string;
    borderColor: string;
    sortOrder: number;
  }
> = {
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    textColor: 'text-white',
    borderColor: 'border-white/20',
    sortOrder: 1,
  },
  instagram: {
    name: 'Instagram',
    icon: SiInstagram,
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/20',
    sortOrder: 2,
  },
  youtube: {
    name: 'YouTube',
    icon: SiYoutube,
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20',
    sortOrder: 3,
  },
  tiktok: {
    name: 'TikTok',
    icon: SiTiktok,
    textColor: 'text-white',
    borderColor: 'border-white/20',
    sortOrder: 4,
  },
  facebook: {
    name: 'Facebook',
    icon: SiFacebook,
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    sortOrder: 5,
  },
  spotify: {
    name: 'Spotify',
    icon: SiSpotify,
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20',
    sortOrder: 6,
  },
  discord: {
    name: 'Discord',
    icon: SiDiscord,
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/20',
    sortOrder: 7,
  },
  twitch: {
    name: 'Twitch',
    icon: SiTwitch,
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/20',
    sortOrder: 8,
  },
  kick: {
    name: 'Kick',
    icon: SiKick,
    textColor: 'text-green-400',
    borderColor: 'border-green-500/20',
    sortOrder: 9,
  },
  patreon: {
    name: 'Patreon',
    icon: FaPatreon,
    textColor: 'text-[#FF424D]',
    borderColor: 'border-[#FF424D]/20',
    sortOrder: 10,
  },
  apple_music: {
    name: 'Apple Music',
    icon: SiApplemusic,
    textColor: 'text-pink-400',
    borderColor: 'border-pink-400/20',
    sortOrder: 11,
  },
  general: {
    name: 'General / Multi-Platform',
    icon: Globe,
    textColor: 'text-gray-300',
    borderColor: 'border-white/10',
    sortOrder: 12,
  },
};

// TierBadge component with tooltip
function TierBadge({
  tier,
  showTooltip = true,
}: {
  tier: VerificationTier | null;
  showTooltip?: boolean;
}) {
  if (!tier) return null;

  const config = TIER_CONFIG[tier];
  const guidance = TIER_GUIDANCE[tier];
  const IconComponent = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={`text-xs ${config.bgColor} ${config.textColor} ${config.borderColor} cursor-help`}
    >
      <IconComponent className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{guidance.label}</span>
              <Badge variant="outline" className="text-xs">
                {guidance.trustLevel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{guidance.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-3 w-3 text-primary" />
              <span className="font-medium">{guidance.pointsRange}</span>
            </div>
            {guidance.tip && <p className="text-xs text-green-400 italic">{guidance.tip}</p>}
            {guidance.warning && (
              <div className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{guidance.warning}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Verification method badge
function MethodBadge({ method }: { method: VerificationMethod | null }) {
  if (!method) return null;

  const config = METHOD_CONFIG[method];
  const IconComponent = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-xs bg-white/5 text-gray-300 border-white/20 cursor-help"
          >
            <IconComponent className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">Verification Method: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
    platform: 'general',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 98,
    estimatedSetupTime: '5 minutes',
    benefits: ['Viral growth potential', 'Cost-effective acquisition', 'Network effects'],
    useCases: ['Grow fanbase organically', 'Launch new campaigns', 'Build community'],
    verificationTier: 'T1',
    verificationMethod: 'platform',
    recommendedPoints: 100,
  },
  {
    id: 'checkin',
    name: 'Daily Check-In',
    description: 'Build engagement habits with daily check-ins and streak bonuses',
    icon: Flame,
    category: 'onboarding',
    platform: 'general',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '4 minutes',
    benefits: ['Daily engagement', 'Habit formation', 'Streak mechanics'],
    useCases: ['Keep fans coming back', 'Build daily rituals', 'Reward consistency'],
    verificationTier: 'T1',
    verificationMethod: 'platform',
    recommendedPoints: 10,
  },
  {
    id: 'follower_milestone',
    name: 'Follower Milestones',
    description: 'Reward fans when you reach social media follower goals',
    icon: TrendingUp,
    category: 'social',
    platform: 'general',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '3 minutes',
    benefits: ['Crowdsourced growth', 'Automatic tracking', 'Tiered rewards'],
    useCases: ['Grow social presence', 'Celebrate milestones', 'Incentivize promotion'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'twitter_follow',
    name: 'Follow on Twitter/X',
    description: 'Reward fans for following your Twitter account with instant API verification',
    icon: Twitter,
    category: 'social',
    platform: 'twitter',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '2 minutes',
    benefits: [
      'Instant verification via Twitter API',
      'Automatic rewards',
      'Grow Twitter following',
    ],
    useCases: ['Build Twitter audience', 'Quick fan engagement', 'Simple onboarding'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'twitter_like',
    name: 'Like Tweet',
    description: 'Reward fans for liking a specific tweet with instant verification',
    icon: Heart,
    category: 'social',
    platform: 'twitter',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Boost tweet engagement', 'Automatic point rewards'],
    useCases: ['Promote important tweets', 'Increase engagement', 'Viral content'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 25,
  },
  {
    id: 'twitter_retweet',
    name: 'Retweet Post',
    description: 'Reward fans for retweeting your content with instant verification',
    icon: Repeat2,
    category: 'social',
    platform: 'twitter',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 94,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Viral reach amplification', 'Automatic rewards'],
    useCases: ['Spread important announcements', 'Go viral', 'Amplify content reach'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 75,
  },
  {
    id: 'twitter_quote_tweet',
    name: 'Quote Tweet',
    description: 'Reward fans for quote tweeting your post with their thoughts',
    icon: MessageCircle,
    category: 'social',
    platform: 'twitter',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 90,
    estimatedSetupTime: '3 minutes',
    benefits: ['Amplify reach with commentary', 'Build conversations', 'Viral potential'],
    useCases: ['Start discussions', 'Thought leadership', 'Community engagement'],
    verificationTier: 'T2',
    verificationMethod: 'code_repost',
    recommendedPoints: 85,
  },

  // Facebook Templates
  {
    id: 'facebook_like_page',
    name: 'Like Facebook Page',
    description: 'Reward fans for liking your Facebook page',
    icon: SiFacebook,
    category: 'social',
    platform: 'facebook',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 90,
    estimatedSetupTime: '2 minutes',
    benefits: ['Grow Facebook following', 'Increase page engagement', 'Build fan community'],
    useCases: ['Build Facebook presence', 'Cross-platform growth', 'Fan engagement'],
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    recommendedPoints: 20,
  },
  {
    id: 'facebook_like_post',
    name: 'Like Facebook Post',
    description: 'Reward fans for liking a specific Facebook post',
    icon: ThumbsUp,
    category: 'social',
    platform: 'facebook',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '2 minutes',
    benefits: ['Boost post engagement', 'Increase visibility', 'Algorithm benefits'],
    useCases: ['Promote important posts', 'Increase engagement', 'Launch announcements'],
    verificationTier: 'T3',
    verificationMethod: 'manual',
    recommendedPoints: 15,
  },
  {
    id: 'facebook_comment_post',
    name: 'Comment on Facebook Post',
    description: 'Reward fans for commenting on a specific Facebook post with a code',
    icon: MessageCircle,
    category: 'social',
    platform: 'facebook',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: ['Code-verified engagement', 'Build community discussion', 'Increase post reach'],
    useCases: ['Start conversations', 'Gather feedback', 'Community building'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },
  {
    id: 'facebook_comment_photo',
    name: 'Comment on Facebook Photo',
    description: 'Reward fans for commenting on a specific Facebook photo with a code',
    icon: MessageSquare,
    category: 'social',
    platform: 'facebook',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 83,
    estimatedSetupTime: '3 minutes',
    benefits: ['Code-verified engagement', 'Build community', 'Increase visibility'],
    useCases: ['Promote photo content', 'Community interaction', 'Visual storytelling'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },

  // Instagram Templates
  {
    id: 'instagram_follow',
    name: 'Follow on Instagram',
    description: 'Reward fans for following your Instagram account (honor system)',
    icon: SiInstagram,
    category: 'social',
    platform: 'instagram',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '2 minutes',
    benefits: ['Grow Instagram audience', 'Increase profile visibility', 'Build visual community'],
    useCases: ['Build Instagram presence', 'Visual storytelling', 'Fan engagement'],
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    recommendedPoints: 20,
  },
  {
    id: 'instagram_like_post',
    name: 'Like Instagram Post',
    description: 'Reward fans for liking a specific Instagram post (honor system)',
    icon: Heart,
    category: 'social',
    platform: 'instagram',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '2 minutes',
    benefits: ['Boost post engagement', 'Increase discoverability', 'Algorithm optimization'],
    useCases: ['Promote key content', 'Feature highlights', 'Campaign launches'],
    verificationTier: 'T3',
    verificationMethod: 'manual',
    recommendedPoints: 15,
  },
  {
    id: 'comment_code',
    name: 'Comment with Code (Instagram)',
    description: 'Fans comment a unique code on your Instagram post - automatic verification',
    icon: MessageSquare,
    category: 'social',
    platform: 'instagram',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '3 minutes',
    benefits: [
      'Automatic verification via webhook',
      'No manual checking required',
      'Instant point rewards',
    ],
    useCases: ['Boost post engagement', 'Contest entries', 'Community interaction'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },
  {
    id: 'mention_story',
    name: 'Mention in Instagram Story',
    description: 'Fans mention you in their Instagram Story - code verified',
    icon: Camera,
    category: 'social',
    platform: 'instagram',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '2 minutes',
    benefits: ['Code verification via webhook', 'Viral potential', 'User-generated content'],
    useCases: ['Brand awareness', 'UGC campaigns', 'Viral marketing'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 60,
  },
  {
    id: 'keyword_comment',
    name: 'Comment with Keyword (Instagram)',
    description: 'Fans comment a specific keyword on your Instagram post - automatic verification',
    icon: Hash,
    category: 'social',
    platform: 'instagram',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 86,
    estimatedSetupTime: '3 minutes',
    benefits: ['Automatic webhook verification', 'Custom keywords/hashtags', 'Instant rewards'],
    useCases: ['Campaign hashtags', 'Contest entries', 'Community challenges'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },

  // YouTube Templates
  {
    id: 'youtube_subscribe',
    name: 'Subscribe on YouTube',
    description: 'Reward fans for subscribing to your YouTube channel - API verified',
    icon: SiYoutube,
    category: 'social',
    platform: 'youtube',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 93,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Grow subscriber base', 'Build loyal audience'],
    useCases: ['Channel growth', 'Video marketing', 'Content creator expansion'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 100,
  },
  {
    id: 'youtube_like',
    name: 'Like YouTube Video',
    description: 'Reward fans for liking a specific YouTube video (honor system)',
    icon: ThumbsUp,
    category: 'social',
    platform: 'youtube',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 89,
    estimatedSetupTime: '2 minutes',
    benefits: ['Boost video engagement', 'YouTube algorithm boost', 'Increase visibility'],
    useCases: ['Promote new videos', 'Launch campaigns', 'Viral content'],
    verificationTier: 'T3',
    verificationMethod: 'manual',
    recommendedPoints: 15,
  },
  {
    id: 'youtube_comment',
    name: 'Comment on YouTube Video',
    description: 'Reward fans for commenting with a code on your YouTube video',
    icon: MessageCircle,
    category: 'social',
    platform: 'youtube',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 87,
    estimatedSetupTime: '3 minutes',
    benefits: ['Code-verified engagement', 'Boost engagement metrics', 'Build community'],
    useCases: ['Start conversations', 'Gather feedback', 'Community engagement'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },

  // TikTok Templates
  {
    id: 'tiktok_follow',
    name: 'Follow on TikTok',
    description: 'Reward fans for following your TikTok account (honor system)',
    icon: SiTiktok,
    category: 'social',
    platform: 'tiktok',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '2 minutes',
    benefits: ['Grow TikTok presence', 'Increase video reach', 'Build Gen-Z audience'],
    useCases: ['TikTok growth', 'Viral content creation', 'Youth engagement'],
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    recommendedPoints: 20,
  },
  {
    id: 'tiktok_like',
    name: 'Like TikTok Video',
    description: 'Reward fans for liking a specific TikTok video (honor system)',
    icon: Heart,
    category: 'social',
    platform: 'tiktok',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '2 minutes',
    benefits: ['Boost video engagement', 'FYP algorithm boost', 'Viral potential'],
    useCases: ['Promote videos', 'Trending content', 'Campaign launches'],
    verificationTier: 'T3',
    verificationMethod: 'manual',
    recommendedPoints: 15,
  },
  {
    id: 'tiktok_comment',
    name: 'Comment on TikTok Video',
    description: 'Reward fans for commenting with a code on your TikTok video',
    icon: MessageCircle,
    category: 'social',
    platform: 'tiktok',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: ['Code-verified engagement', 'Build community', 'Boost visibility'],
    useCases: ['Start conversations', 'Community building', 'Viral content'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 40,
  },
  {
    id: 'tiktok_post',
    name: 'Create TikTok Post',
    description: 'Reward fans for creating their own TikTok post with specific hashtags',
    icon: Camera,
    category: 'social',
    platform: 'tiktok',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 92,
    estimatedSetupTime: '3 minutes',
    benefits: ['User-generated content', 'Viral campaign potential', 'Authentic brand advocacy'],
    useCases: ['Hashtag challenges', 'UGC campaigns', 'Brand awareness'],
    verificationTier: 'T2',
    verificationMethod: 'code_repost',
    recommendedPoints: 40,
  },

  // Interactive Templates
  {
    id: 'poll',
    name: 'Fan Poll',
    description: 'Create interactive polls to gather fan opinions and feedback',
    icon: HelpCircle,
    category: 'community',
    platform: 'general',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 89,
    estimatedSetupTime: '5 minutes',
    benefits: ['Platform-verified engagement', 'Gather fan feedback', 'Make fans feel heard'],
    useCases: ['Content planning', 'Merchandise ideas', 'Fan preferences'],
    verificationTier: 'T1',
    verificationMethod: 'platform',
    recommendedPoints: 25,
  },
  {
    id: 'quiz',
    name: 'Trivia Quiz',
    description: 'Create quizzes to test fan knowledge and reward correct answers',
    icon: Trophy,
    category: 'community',
    platform: 'general',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 86,
    estimatedSetupTime: '10 minutes',
    benefits: ['Platform-verified answers', 'Test fan knowledge', 'Gamification'],
    useCases: ['Trivia contests', 'Educational content', 'Fan challenges'],
    verificationTier: 'T1',
    verificationMethod: 'platform',
    recommendedPoints: 50,
  },
  {
    id: 'website_visit',
    name: 'Website Visit',
    description: 'Reward fans for visiting your website or clicking specific links',
    icon: ExternalLink,
    category: 'custom',
    platform: 'general',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 94,
    estimatedSetupTime: '2 minutes',
    benefits: ['Auto-verified via tracking', 'Drive traffic', 'Instant rewards'],
    useCases: ['Product launches', 'Merch stores', 'External content'],
    verificationTier: 'T1',
    verificationMethod: 'platform',
    recommendedPoints: 25,
  },

  // Spotify Templates
  {
    id: 'spotify_follow',
    name: 'Follow on Spotify',
    description: 'Reward fans for following your Spotify artist profile - API verified',
    icon: SiSpotify,
    category: 'social',
    platform: 'spotify',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 87,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Grow Spotify following', 'Build music fanbase'],
    useCases: ['Music promotion', 'Artist growth', 'Release campaigns'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'spotify_playlist',
    name: 'Follow Spotify Playlist',
    description: 'Reward fans for following a specific Spotify playlist - API verified',
    icon: ListMusic,
    category: 'social',
    platform: 'spotify',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 85,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Playlist growth', 'Fan engagement'],
    useCases: ['Promote playlists', 'Music discovery', 'Curated collections'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },

  // Apple Music Templates
  {
    id: 'apple_music_favorite_artist',
    name: 'Add Artist to Library',
    description:
      'Reward fans for adding your artist profile to their Apple Music library - API verified',
    icon: SiApplemusic,
    category: 'social',
    platform: 'apple_music',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 86,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Grow Apple Music following', 'Build music fanbase'],
    useCases: ['Music promotion', 'Artist growth', 'Release campaigns'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'apple_music_add_track',
    name: 'Add Track to Library',
    description:
      'Reward fans for adding a specific track to their Apple Music library - API verified',
    icon: SiApplemusic,
    category: 'social',
    platform: 'apple_music',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 84,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Boost streams', 'Song discovery'],
    useCases: ['Single releases', 'Track promotion', 'Music campaigns'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 30,
  },
  {
    id: 'apple_music_add_album',
    name: 'Add Album to Library',
    description: 'Reward fans for adding a full album to their Apple Music library - API verified',
    icon: SiApplemusic,
    category: 'social',
    platform: 'apple_music',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 83,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Album promotion', 'Full catalog engagement'],
    useCases: ['Album releases', 'Catalog growth', 'Fan engagement'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 40,
  },
  {
    id: 'apple_music_add_playlist',
    name: 'Add Playlist to Library',
    description: 'Reward fans for adding a playlist to their Apple Music library - API verified',
    icon: ListMusic,
    category: 'social',
    platform: 'apple_music',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 82,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Playlist growth', 'Curated engagement'],
    useCases: ['Promote playlists', 'Music discovery', 'Curated collections'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 40,
  },
  {
    id: 'apple_music_listen',
    name: 'Listen to Track',
    description: 'Reward fans for listening to a specific track on Apple Music - manual review',
    icon: SiApplemusic,
    category: 'social',
    platform: 'apple_music',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 80,
    estimatedSetupTime: '2 minutes',
    benefits: ['Stream count growth', 'Fan discovery', 'Engagement rewards'],
    useCases: ['Boost streams', 'New release push', 'Music engagement'],
    verificationTier: 'T2',
    verificationMethod: 'manual',
    recommendedPoints: 20,
  },

  // Discord Templates
  {
    id: 'discord_join',
    name: 'Join Discord Server',
    description: 'Reward fans for joining your Discord community server - API verified',
    icon: SiDiscord,
    category: 'community',
    platform: 'discord',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 93,
    estimatedSetupTime: '3 minutes',
    benefits: ['Instant API verification', 'Build Discord community', 'Centralized fan hub'],
    useCases: ['Community building', 'Fan engagement', 'Gaming communities'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'discord_verify',
    name: 'Get Discord Member Role',
    description: 'Reward fans for obtaining a specific member role - API verified',
    icon: SiDiscord,
    category: 'community',
    platform: 'discord',
    difficulty: 'medium',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '4 minutes',
    benefits: ['Instant API verification', 'Role-based rewards', 'Community tiers'],
    useCases: ['Verify engagement', 'Tiered memberships', 'Active community rewards'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 75,
  },

  // Twitch Templates
  {
    id: 'twitch_follow',
    name: 'Follow on Twitch',
    description: 'Reward fans for following your Twitch channel - API verified',
    icon: SiTwitch,
    category: 'social',
    platform: 'twitch',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Grow Twitch following', 'Build streaming audience'],
    useCases: ['Stream promotion', 'Channel growth', 'Viewer acquisition'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'twitch_subscribe',
    name: 'Subscribe on Twitch',
    description: 'Reward fans for subscribing to your Twitch channel - API verified',
    icon: SiTwitch,
    category: 'social',
    platform: 'twitch',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 89,
    estimatedSetupTime: '3 minutes',
    benefits: ['Instant API verification', 'Monetization incentive', 'Loyal fan recognition'],
    useCases: ['Subscriber rewards', 'Monetization boost', 'Premium fan perks'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 150,
  },

  // Kick Templates
  {
    id: 'kick_follow',
    name: 'Follow on Kick',
    description: 'Reward fans for following your Kick channel with instant API verification',
    icon: SiKick,
    category: 'social',
    platform: 'kick',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 90,
    estimatedSetupTime: '2 minutes',
    benefits: ['Instant API verification', 'Grow Kick following', 'Automatic rewards'],
    useCases: ['Build streaming audience', 'Quick fan engagement', 'Cross-platform growth'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 50,
  },
  {
    id: 'kick_subscribe',
    name: 'Subscribe on Kick',
    description: 'Reward fans for subscribing to your Kick channel - API verified',
    icon: SiKick,
    category: 'social',
    platform: 'kick',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 88,
    estimatedSetupTime: '3 minutes',
    benefits: ['Instant API verification', 'Monetization incentive', 'Loyal fan recognition'],
    useCases: ['Subscriber rewards', 'Monetization boost', 'Premium fan perks'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 200,
  },

  // Patreon Templates
  {
    id: 'patreon_support',
    name: 'Become a Patron',
    description: 'Reward fans for becoming a patron on Patreon with instant API verification',
    icon: FaPatreon,
    category: 'social',
    platform: 'patreon',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 91,
    estimatedSetupTime: '3 minutes',
    benefits: ['Instant API verification', 'Monetization growth', 'Premium fan engagement'],
    useCases: [
      'Grow Patreon supporters',
      'Cross-platform monetization',
      'Premium content incentive',
    ],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 200,
  },
  {
    id: 'patreon_tier_check',
    name: 'Join Patreon Tier',
    description: 'Reward fans for joining a specific Patreon tier - API verified',
    icon: FaPatreon,
    category: 'social',
    platform: 'patreon',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 87,
    estimatedSetupTime: '3 minutes',
    benefits: ['Instant API verification', 'Tier-based incentives', 'Premium supporter rewards'],
    useCases: ['Upgrade patron tiers', 'VIP rewards', 'Premium engagement'],
    verificationTier: 'T1',
    verificationMethod: 'api',
    recommendedPoints: 150,
  },

  // Stream Code Verifier
  {
    id: 'stream_code_verify',
    name: 'Join Stream or Spaces',
    description: 'Reward fans who attend your live streams/spaces by entering a secret code',
    icon: Video,
    category: 'community',
    platform: 'general',
    difficulty: 'easy',
    status: 'ready',
    popularityScore: 95,
    estimatedSetupTime: '2 minutes',
    benefits: ['Code-verified attendance', 'Works on any platform', 'Reward live viewers'],
    useCases: ['Live stream rewards', 'Twitter/X Spaces', 'Virtual event attendance'],
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    recommendedPoints: 50,
  },

  {
    id: 'social_follow',
    name: 'Follow Account',
    description: 'Reward fans for following you on social media platforms',
    icon: UserPlus,
    category: 'social',
    platform: 'general',
    difficulty: 'easy',
    status: 'coming_soon',
    popularityScore: 90,
    estimatedSetupTime: '2 minutes',
    benefits: ['Quick social growth', 'Simple verification', 'High conversion'],
    useCases: ['Build social following', 'Cross-platform growth', 'Simple onboarding'],
    verificationTier: null,
    verificationMethod: null,
    recommendedPoints: 50,
  },
  {
    id: 'social_like',
    name: 'Like Post/Video',
    description: 'Reward fans for liking specific posts, tweets, or videos',
    icon: Heart,
    category: 'social',
    platform: 'general',
    difficulty: 'easy',
    status: 'coming_soon',
    popularityScore: 85,
    estimatedSetupTime: '3 minutes',
    benefits: ['Boost engagement', 'Algorithmic visibility', 'Content promotion'],
    useCases: ['Promote new content', 'Increase engagement', 'Launch campaigns'],
    verificationTier: null,
    verificationMethod: null,
    recommendedPoints: 25,
  },
  {
    id: 'social_share',
    name: 'Share Content',
    description: 'Reward fans for sharing your content with their followers',
    icon: Share2,
    category: 'social',
    platform: 'general',
    difficulty: 'medium',
    status: 'coming_soon',
    popularityScore: 87,
    estimatedSetupTime: '4 minutes',
    benefits: ['Viral potential', 'Extended reach', 'Authentic promotion'],
    useCases: ['Amplify announcements', 'Product launches', 'Event promotion'],
    verificationTier: null,
    verificationMethod: null,
    recommendedPoints: 75,
  },
  {
    id: 'social_comment',
    name: 'Comment on Post',
    description: 'Reward fans for leaving comments on your social content',
    icon: MessageCircle,
    category: 'social',
    platform: 'general',
    difficulty: 'medium',
    status: 'coming_soon',
    popularityScore: 82,
    estimatedSetupTime: '4 minutes',
    benefits: ['Boost engagement', 'Quality interactions', 'Community building'],
    useCases: ['Start conversations', 'Gather feedback', 'Build community'],
    verificationTier: null,
    verificationMethod: null,
    recommendedPoints: 40,
  },
  {
    id: 'custom_event',
    name: 'Custom Event',
    description: 'Create custom tasks for unique actions and events',
    icon: Zap,
    category: 'custom',
    platform: 'general',
    difficulty: 'advanced',
    status: 'coming_soon',
    popularityScore: 75,
    estimatedSetupTime: '10 minutes',
    benefits: ['Maximum flexibility', 'Unique mechanics', 'Custom validation'],
    useCases: ['Special events', 'Custom integrations', 'Unique campaigns'],
    verificationTier: null,
    verificationMethod: null,
    recommendedPoints: 50,
  },
];

interface TaskTemplateSelectorProps {
  onSelectTemplate: (template: TaskTemplateType) => void;
  onBack?: () => void;
}

export default function TaskTemplateSelector({
  onSelectTemplate,
  onBack,
}: TaskTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('by-platform');

  const filteredTemplates = TASK_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesTier = selectedTier === 'all' || template.verificationTier === selectedTier;
    return matchesSearch && matchesCategory && matchesTier;
  });

  const readyTemplates = filteredTemplates.filter((t) => t.status === 'ready');
  const comingSoonTemplates = filteredTemplates.filter((t) => t.status === 'coming_soon');

  // Group templates by platform (sorted by platform sort order, then by popularity within each platform)
  const templatesByPlatform = readyTemplates.reduce(
    (acc, template) => {
      const platform = template.platform;
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(template);
      return acc;
    },
    {} as Record<TemplatePlatform, TaskTemplate[]>
  );

  // Sort platforms by their configured sort order
  const sortedPlatforms = (Object.keys(templatesByPlatform) as TemplatePlatform[]).sort(
    (a, b) => PLATFORM_CONFIG[a].sortOrder - PLATFORM_CONFIG[b].sortOrder
  );

  // Sort templates within each platform by popularity
  sortedPlatforms.forEach((platform) => {
    templatesByPlatform[platform].sort((a, b) => b.popularityScore - a.popularityScore);
  });

  // Group templates by verification tier
  const templatesByTier = {
    T1: readyTemplates
      .filter((t) => t.verificationTier === 'T1')
      .sort((a, b) => b.popularityScore - a.popularityScore),
    T2: readyTemplates
      .filter((t) => t.verificationTier === 'T2')
      .sort((a, b) => b.popularityScore - a.popularityScore),
    T3: readyTemplates
      .filter((t) => t.verificationTier === 'T3')
      .sort((a, b) => b.popularityScore - a.popularityScore),
  };

  // Count templates by tier for filter badges
  const tierCounts = {
    T1: TASK_TEMPLATES.filter((t) => t.verificationTier === 'T1' && t.status === 'ready').length,
    T2: TASK_TEMPLATES.filter((t) => t.verificationTier === 'T2' && t.status === 'ready').length,
    T3: TASK_TEMPLATES.filter((t) => t.verificationTier === 'T3' && t.status === 'ready').length,
  };

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
      // Apple Music
      apple_music_favorite_artist: 'bg-pink-500',
      apple_music_add_track: 'bg-pink-500',
      apple_music_add_album: 'bg-pink-500',
      apple_music_add_playlist: 'bg-pink-500',
      apple_music_listen: 'bg-pink-500',
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
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-white/10 bg-brand-dark-purple/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create New Task</h1>
              <p className="text-gray-400">Choose a template to get started</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                <Button
                  onClick={() => setViewMode('grid')}
                  variant="ghost"
                  size="sm"
                  className={`px-3 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('by-platform')}
                  variant="ghost"
                  size="sm"
                  className={`px-3 ${viewMode === 'by-platform' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Group by Platform"
                >
                  <Globe className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('by-verification')}
                  variant="ghost"
                  size="sm"
                  className={`px-3 ${viewMode === 'by-verification' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Group by Verification Tier"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
              {onBack && (
                <Button variant="outline" onClick={onBack} className="border-white/20 text-white">
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Verification Tier Filter */}
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <Shield className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="T1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>T1 - API Verified</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {tierCounts.T1}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="T2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>T2 - Code Verified</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {tierCounts.T2}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="T3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span>T3 - Honor System</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {tierCounts.T3}
                    </Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

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

      {/* Tier Legend */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <span className="text-gray-400 font-medium">Verification Tiers:</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">T1 - API Verified</span>
              <span className="text-gray-500">(50-200 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium">T2 - Code Verified</span>
              <span className="text-gray-500">(30-85 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium">T3 - Honor System</span>
              <span className="text-gray-500">(15-25 pts)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 py-6">
        {/* Ready Templates */}
        {readyTemplates.length > 0 && (
          <div className="mb-12">
            {viewMode === 'grid' ? (
              // Grid View - Flat layout
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-brand-primary" />
                  <h2 className="text-2xl font-bold text-white">Ready to Use</h2>
                  <Badge variant="outline" className="text-brand-primary border-brand-primary">
                    {readyTemplates.length}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {readyTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelectTemplate={onSelectTemplate}
                      getPlatformIconBg={getPlatformIconBg}
                      getCategoryColor={getCategoryColor}
                      getDifficultyColor={getDifficultyColor}
                    />
                  ))}
                </div>
              </>
            ) : viewMode === 'by-platform' ? (
              // Group by Platform
              <div className="space-y-10">
                {sortedPlatforms.map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  const templates = templatesByPlatform[platform];
                  const PlatformIcon = config.icon;

                  return (
                    <div key={platform}>
                      <div
                        className={`flex items-center gap-3 mb-4 pb-2 border-b ${config.borderColor}`}
                      >
                        <PlatformIcon className={`h-5 w-5 ${config.textColor}`} />
                        <h3 className={`text-lg font-semibold ${config.textColor}`}>
                          {config.name}
                        </h3>
                        <span className="text-sm text-gray-400">
                          {templates.length} template{templates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {templates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onSelectTemplate={onSelectTemplate}
                            getPlatformIconBg={getPlatformIconBg}
                            getCategoryColor={getCategoryColor}
                            getDifficultyColor={getDifficultyColor}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Group by Verification Tier
              <div className="space-y-10">
                {/* T1 Group */}
                {templatesByTier.T1.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-green-500/20">
                      <ShieldCheck className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-green-400">
                        T1 - API Verified ({TIER_GUIDANCE.T1.trustLevel} Trust)
                      </h3>
                      <span className="text-sm text-gray-400">
                        {templatesByTier.T1.length} template
                        {templatesByTier.T1.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-green-400/70 ml-auto">
                        Recommended: {TIER_GUIDANCE.T1.pointsRange}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templatesByTier.T1.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelectTemplate={onSelectTemplate}
                          getPlatformIconBg={getPlatformIconBg}
                          getCategoryColor={getCategoryColor}
                          getDifficultyColor={getDifficultyColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* T2 Group */}
                {templatesByTier.T2.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-blue-500/20">
                      <Shield className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-blue-400">
                        T2 - Code Verified ({TIER_GUIDANCE.T2.trustLevel} Trust)
                      </h3>
                      <span className="text-sm text-gray-400">
                        {templatesByTier.T2.length} template
                        {templatesByTier.T2.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-blue-400/70 ml-auto">
                        Recommended: {TIER_GUIDANCE.T2.pointsRange}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templatesByTier.T2.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelectTemplate={onSelectTemplate}
                          getPlatformIconBg={getPlatformIconBg}
                          getCategoryColor={getCategoryColor}
                          getDifficultyColor={getDifficultyColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* T3 Group */}
                {templatesByTier.T3.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-amber-500/20">
                      <ShieldAlert className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg font-semibold text-amber-400">
                        T3 - Honor System ({TIER_GUIDANCE.T3.trustLevel} Trust)
                      </h3>
                      <span className="text-sm text-gray-400">
                        {templatesByTier.T3.length} template
                        {templatesByTier.T3.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-amber-400/70 ml-auto">
                        Recommended: {TIER_GUIDANCE.T3.pointsRange}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templatesByTier.T3.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelectTemplate={onSelectTemplate}
                          getPlatformIconBg={getPlatformIconBg}
                          getCategoryColor={getCategoryColor}
                          getDifficultyColor={getDifficultyColor}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {comingSoonTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="bg-white/5 backdrop-blur-lg border-white/10 opacity-60"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-12 h-12 rounded-lg bg-gray-500/20 border border-gray-500/30 flex items-center justify-center`}
                        >
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
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Card Component - extracted for reuse
function TemplateCard({
  template,
  onSelectTemplate,
  getPlatformIconBg,
  getCategoryColor,
  getDifficultyColor,
}: {
  template: TaskTemplate;
  onSelectTemplate: (template: TaskTemplateType) => void;
  getPlatformIconBg: (templateId: TaskTemplateType) => string;
  getCategoryColor: (category: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}) {
  const Icon = template.icon;
  const platformBg = getPlatformIconBg(template.id);
  const iconBgClass = platformBg || getCategoryColor(template.category);

  return (
    <Card
      className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer group"
      onClick={() => onSelectTemplate(template.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-12 h-12 rounded-lg ${iconBgClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-xs ${getCategoryColor(template.category)}`}>
              {template.category}
            </Badge>
            {template.popularityScore >= 90 && (
              <Badge
                variant="outline"
                className="text-xs text-brand-secondary border-brand-secondary"
              >
                Popular
              </Badge>
            )}
          </div>
        </div>

        <CardTitle className="text-white">{template.name}</CardTitle>
        <CardDescription className="text-gray-400">{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verification Tier & Method Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={template.verificationTier} />
          <MethodBadge method={template.verificationMethod} />
        </div>

        {/* Recommended Points */}
        <div className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-gray-300">Recommended:</span>
          <span className="font-semibold text-white">{template.recommendedPoints} pts</span>
          {template.verificationTier && (
            <span className="text-xs text-gray-500 ml-auto">
              (
              {TIER_GUIDANCE[template.verificationTier].pointsRange.replace(
                ' points recommended',
                ''
              )}
              )
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Target className="h-4 w-4" />
            <span className={getDifficultyColor(template.difficulty)}>{template.difficulty}</span>
          </div>
          <div className="text-gray-400">~{template.estimatedSetupTime}</div>
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
}
