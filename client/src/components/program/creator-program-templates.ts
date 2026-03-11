/**
 * Creator Program Templates - Default configurations per creator type
 *
 * These templates provide smart defaults for:
 * - Recommended themes
 * - Platform priority ordering
 * - Points name suggestions
 * - Profile data visibility defaults
 * - Section ordering priority
 */

export type CreatorType = 'athlete' | 'musician' | 'content_creator';

export interface CreatorProgramTemplate {
  creatorType: CreatorType;
  /** Recommended theme template IDs (first is default) */
  recommendedThemes: string[];
  /** Primary recommended theme template ID */
  defaultTheme: string;
  /** Ordered list of platforms to show first */
  platformPriority: string[];
  /** Suggested name for points currency */
  pointsNameSuggestion: string;
  /** Alternative points name options */
  pointsNameOptions: string[];
  /** Default profile data visibility settings */
  profileDataDefaults: Record<string, boolean>;
  /** Priority ordering for page sections */
  sectionOrderPriority: string[];
  /** Welcome message for the builder */
  welcomeMessage: string;
}

export const CREATOR_TEMPLATES: Record<CreatorType, CreatorProgramTemplate> = {
  athlete: {
    creatorType: 'athlete',
    recommendedThemes: [
      'dark-pro',
      'minimalist-white',
      'ocean-blue',
      'high-contrast',
      'monochrome',
    ],
    defaultTheme: 'dark-pro',
    platformPriority: [
      'instagram',
      'tiktok',
      'youtube',
      'twitter',
      'facebook',
      'twitch',
      'kick',
      'discord',
      'spotify',
    ],
    pointsNameSuggestion: 'Fan Points',
    pointsNameOptions: ['Fan Points', 'Loyalty Points', 'MVP Points', 'Team Points', 'Custom'],
    profileDataDefaults: {
      showBio: true,
      showSocialLinks: true,
      showTiers: true,
      showVerificationBadge: true,
      showLocation: true,
      showWebsite: true,
      showJoinDate: true,
      showFollowerCount: true,
      showRankings: true,
      showStats: true,
    },
    sectionOrderPriority: ['leaderboard', 'campaigns', 'rewards', 'tasks', 'activityFeed'],
    welcomeMessage: 'Build your fan engagement program and connect with your supporters!',
  },
  musician: {
    creatorType: 'musician',
    recommendedThemes: [
      'royal-purple',
      'neon-cyberpunk',
      'pastel-dream',
      'dark-pro',
      'sunset-orange',
    ],
    defaultTheme: 'royal-purple',
    platformPriority: [
      'spotify',
      'apple_music',
      'youtube',
      'instagram',
      'tiktok',
      'facebook',
      'twitter',
      'discord',
      'twitch',
    ],
    pointsNameSuggestion: 'Fan Credits',
    pointsNameOptions: [
      'Fan Credits',
      'Superfan Points',
      'Music Points',
      'Backstage Points',
      'Custom',
    ],
    profileDataDefaults: {
      showBio: true,
      showSocialLinks: true,
      showTiers: true,
      showVerificationBadge: true,
      showLocation: false,
      showWebsite: true,
      showJoinDate: false,
      showFollowerCount: true,
      showStreamingStats: true,
      showTourDates: true,
    },
    sectionOrderPriority: ['rewards', 'campaigns', 'tasks', 'leaderboard', 'activityFeed'],
    welcomeMessage: 'Create an amazing experience for your fans and reward their loyalty!',
  },
  content_creator: {
    creatorType: 'content_creator',
    recommendedThemes: ['gaming-rgb', 'dark-pro', 'sunset-orange', 'neon-cyberpunk', 'ocean-blue'],
    defaultTheme: 'gaming-rgb',
    platformPriority: [
      'youtube',
      'tiktok',
      'twitch',
      'kick',
      'twitter',
      'instagram',
      'discord',
      'facebook',
      'spotify',
    ],
    pointsNameSuggestion: 'Community Points',
    pointsNameOptions: [
      'Community Points',
      'Creator Points',
      'VIP Points',
      'Subscriber Points',
      'Custom',
    ],
    profileDataDefaults: {
      showBio: true,
      showSocialLinks: true,
      showTiers: true,
      showVerificationBadge: true,
      showLocation: false,
      showWebsite: true,
      showJoinDate: true,
      showFollowerCount: true,
      showTotalReach: true,
      showEngagementRate: true,
    },
    sectionOrderPriority: ['campaigns', 'leaderboard', 'tasks', 'rewards', 'activityFeed'],
    welcomeMessage: 'Engage your community and reward your most dedicated fans!',
  },
};

/**
 * Get creator template by type, with fallback to content_creator
 */
export function getCreatorTemplate(creatorType: string): CreatorProgramTemplate {
  return CREATOR_TEMPLATES[creatorType as CreatorType] || CREATOR_TEMPLATES.content_creator;
}

/**
 * Get platform display info for prioritization
 */
export const PLATFORM_INFO: Record<string, { name: string; color: string }> = {
  twitter: { name: 'Twitter / X', color: 'bg-black' },
  instagram: { name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  discord: { name: 'Discord', color: 'bg-indigo-500' },
  facebook: { name: 'Facebook', color: 'bg-blue-600' },
  tiktok: { name: 'TikTok', color: 'bg-black' },
  youtube: { name: 'YouTube', color: 'bg-red-600' },
  spotify: { name: 'Spotify', color: 'bg-green-500' },
  apple_music: { name: 'Apple Music', color: 'bg-pink-500' },
  twitch: { name: 'Twitch', color: 'bg-purple-600' },
};

export default CREATOR_TEMPLATES;
