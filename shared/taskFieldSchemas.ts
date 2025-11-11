import { z } from 'zod';

/**
 * UNIFIED TASK SETTINGS SCHEMA
 *
 * Purpose: Standardize task settings across all social platforms
 *
 * Benefits:
 * - Consistent field naming (username, not handle)
 * - Unified verification approach
 * - Easier to add new platforms
 * - Better type safety
 * - Simplified verification logic
 *
 * Migration from old schema:
 * - Twitter: handle → username
 * - All platforms: tweetUrl/postUrl/videoUrl → contentUrl
 * - Added: contentId, userId for API verification
 * - Added: Standard verification fields (requiredHashtags, requiredMentions)
 */

// ============================================================================
// BASE SCHEMA - Used by ALL social platforms
// ============================================================================

export const baseSocialTaskSettings = z.object({
  // ============================================
  // ACCOUNT TARGET (who to interact with)
  // ============================================
  username: z.string().optional(), // @handle on all platforms (e.g., @elonmusk)
  userId: z.string().optional(), // Platform user ID (for API calls)
  displayName: z.string().optional(), // Display name (for UI, e.g., "Elon Musk")

  // ============================================
  // CONTENT TARGET (what to interact with)
  // ============================================
  contentUrl: z.string().url().optional(), // Universal: link to post/video/tweet
  contentId: z.string().optional(), // Platform content ID (for API calls)

  // ============================================
  // VERIFICATION REQUIREMENTS
  // ============================================
  requiredText: z.string().optional(), // Text that must appear in comment/caption
  requiredHashtags: z.array(z.string()).optional(), // Hashtags that must be included (e.g., ["#giveaway", "#contest"])
  requiredMentions: z.array(z.string()).optional(), // @mentions that must be included (e.g., ["@brand", "@creator"])

  // ============================================
  // VERIFICATION METHOD
  // ============================================
  verificationMethod: z.enum(['api', 'smart_detection', 'manual']).default('api'),

  // ============================================
  // ADDITIONAL CONSTRAINTS
  // ============================================
  minCharacters: z.number().min(1).optional(), // For comment tasks (e.g., "min 20 characters")
  maxCharacters: z.number().min(1).optional(), // For comment tasks (e.g., "max 280 characters")
  allowEmojis: z.boolean().default(true),
  requireOriginalContent: z.boolean().default(false), // Must be original, not copy-paste

  // ============================================
  // LEGACY SUPPORT (for backward compatibility)
  // ============================================
  // These will be automatically migrated to the new fields
  handle: z.string().optional(), // DEPRECATED: use username instead
  tweetUrl: z.string().optional(), // DEPRECATED: use contentUrl instead
  postUrl: z.string().optional(), // DEPRECATED: use contentUrl instead
  videoUrl: z.string().optional(), // DEPRECATED: use contentUrl instead
  mediaUrl: z.string().optional(), // DEPRECATED: use contentUrl instead
  mediaId: z.string().optional(), // DEPRECATED: use contentId instead
});

// ============================================================================
// PLATFORM-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Twitter/X Task Settings
 *
 * Supported Task Types:
 * - twitter_follow: Follow an account
 * - twitter_like: Like a tweet
 * - twitter_retweet: Retweet a tweet
 * - twitter_quote_tweet: Quote tweet with comment
 * - twitter_reply: Reply to a tweet
 */
export const twitterTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('twitter'),

  // Twitter-specific fields
  requireQuote: z.boolean().default(false), // For quote tweet tasks
  requireReply: z.boolean().default(false), // For reply tasks
  originalTweetId: z.string().optional(), // Tweet being retweeted/quoted
  requireBookmark: z.boolean().default(false), // Also bookmark the tweet
  requireFollowAndLike: z.boolean().default(false), // Combo action

  // Verification
  verificationMethod: z.enum(['api', 'manual']).default('api'), // Twitter has good API
});

/**
 * Instagram Task Settings
 *
 * Supported Task Types:
 * - instagram_follow: Follow an account
 * - instagram_like_post: Like a post
 * - comment_code: Comment with specific code
 * - mention_story: Mention in story
 * - keyword_comment: Comment with keyword
 */
export const instagramTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('instagram'),

  // Instagram-specific fields
  mediaType: z.enum(['photo', 'video', 'carousel', 'reel', 'story']).optional(),
  requireStoryMention: z.boolean().default(false),
  storyDurationHours: z.number().min(1).max(24).default(24), // How long story must stay up
  requireSavePost: z.boolean().default(false), // Also save the post
  requireShareToStory: z.boolean().default(false), // Share post to story

  // Verification (Instagram API is limited)
  verificationMethod: z.enum(['smart_detection', 'manual']).default('smart_detection'),
  requireScreenshot: z.boolean().default(false), // Require screenshot proof
});

/**
 * TikTok Task Settings
 *
 * Supported Task Types:
 * - tiktok_follow: Follow an account
 * - tiktok_like: Like a video
 * - tiktok_comment: Comment on video
 * - tiktok_share: Share a video
 * - tiktok_duet: Create a duet
 * - tiktok_stitch: Create a stitch
 */
export const tiktokTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('tiktok'),

  // TikTok-specific fields
  videoType: z.enum(['video', 'live', 'duet', 'stitch']).optional(),
  requireDuet: z.boolean().default(false),
  requireStitch: z.boolean().default(false),
  requireShare: z.boolean().default(false), // Share to external platform
  shareDestination: z.enum(['whatsapp', 'facebook', 'twitter', 'instagram', 'any']).optional(),
  requireSaveVideo: z.boolean().default(false), // Save/favorite the video

  // Verification (TikTok has no public API)
  verificationMethod: z.enum(['smart_detection', 'manual']).default('smart_detection'),
  trustScoreThreshold: z.number().min(0).max(1).default(0.7), // Auto-approve if trust score > this
});

/**
 * YouTube Task Settings
 *
 * Supported Task Types:
 * - youtube_subscribe: Subscribe to channel
 * - youtube_like: Like a video
 * - youtube_comment: Comment on video
 * - youtube_watch: Watch full video
 * - youtube_share: Share video
 */
export const youtubeTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('youtube'),

  // YouTube-specific fields
  videoId: z.string().optional(), // YouTube video ID (e.g., "dQw4w9WgXcQ")
  channelId: z.string().optional(), // YouTube channel ID
  playlistId: z.string().optional(), // For playlist subscribe tasks
  requireSubscribe: z.boolean().default(false), // For subscribe + comment tasks
  requireLike: z.boolean().default(false), // For like + comment tasks
  requireBellNotification: z.boolean().default(false), // Enable notifications
  minWatchTimeSeconds: z.number().min(0).optional(), // Minimum watch time (if verifiable)

  // Verification (YouTube has good API)
  verificationMethod: z.enum(['api', 'manual']).default('api'),
});

/**
 * Facebook Task Settings
 *
 * Supported Task Types:
 * - facebook_like_page: Like a page
 * - facebook_like_post: Like a post
 * - facebook_comment_post: Comment on post
 * - facebook_share: Share a post
 * - facebook_join_group: Join a group
 */
export const facebookTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('facebook'),

  // Facebook-specific fields
  pageId: z.string().optional(), // Facebook page ID
  postId: z.string().optional(), // Facebook post ID
  groupId: z.string().optional(), // For group tasks
  requireJoinGroup: z.boolean().default(false),
  requireReaction: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry', 'any']).default('any'),
  requireShare: z.boolean().default(false),
  shareType: z.enum(['public', 'friends', 'private', 'any']).default('any'),

  // Verification (Facebook API is limited)
  verificationMethod: z.enum(['smart_detection', 'manual']).default('manual'),
});

/**
 * Spotify Task Settings
 *
 * Supported Task Types:
 * - spotify_follow: Follow artist
 * - spotify_playlist: Follow playlist
 * - spotify_save_track: Save track
 * - spotify_save_album: Save album
 */
export const spotifyTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('spotify'),

  // Spotify-specific fields
  artistId: z.string().optional(), // Spotify artist ID
  trackId: z.string().optional(), // Spotify track ID
  playlistId: z.string().optional(), // Spotify playlist ID
  albumId: z.string().optional(), // Spotify album ID
  requireSave: z.boolean().default(false), // Save to library
  requireFollow: z.boolean().default(false), // Follow artist
  requireAddToPlaylist: z.boolean().default(false), // Add to user's playlist
  playlistName: z.string().optional(), // Name of playlist to add to

  // Verification (Spotify has good API)
  verificationMethod: z.enum(['api', 'manual']).default('api'),
});

/**
 * Twitch Task Settings
 *
 * Supported Task Types:
 * - twitch_follow: Follow channel
 * - twitch_subscribe: Subscribe to channel
 * - twitch_watch: Watch stream
 * - twitch_raid: Participate in raid
 */
export const twitchTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('twitch'),

  // Twitch-specific fields
  channelName: z.string().optional(), // Twitch channel name
  channelId: z.string().optional(), // Twitch channel ID
  requireSubscription: z.boolean().default(false), // Paid subscription
  subscriptionTier: z.enum(['tier1', 'tier2', 'tier3', 'any']).default('any'),
  minWatchTimeMinutes: z.number().min(0).optional(), // Minimum watch time
  requireChatMessage: z.boolean().default(false), // Must chat in stream

  // Verification (Twitch has good API)
  verificationMethod: z.enum(['api', 'manual']).default('api'),
});

/**
 * Discord Task Settings
 *
 * Supported Task Types:
 * - discord_join: Join server
 * - discord_verify: Verify in server
 * - discord_react: React to message
 * - discord_message: Send message in channel
 */
export const discordTaskSettings = baseSocialTaskSettings.extend({
  platform: z.literal('discord'),

  // Discord-specific fields
  serverId: z.string().optional(), // Discord server ID
  serverInviteUrl: z.string().url().optional(), // Invite link
  channelId: z.string().optional(), // Specific channel ID
  roleId: z.string().optional(), // Role to assign
  requireVerification: z.boolean().default(false), // Must verify in server
  requireRole: z.boolean().default(false), // Must obtain specific role
  messageContent: z.string().optional(), // Required message content

  // Verification (Discord has good API via bot)
  verificationMethod: z.enum(['api', 'manual']).default('api'),
});

// ============================================================================
// UNION OF ALL PLATFORM SETTINGS
// ============================================================================

export const socialTaskSettings = z.discriminatedUnion('platform', [
  twitterTaskSettings,
  instagramTaskSettings,
  tiktokTaskSettings,
  youtubeTaskSettings,
  facebookTaskSettings,
  spotifyTaskSettings,
  twitchTaskSettings,
  discordTaskSettings,
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BaseSocialTaskSettings = z.infer<typeof baseSocialTaskSettings>;
export type TwitterTaskSettings = z.infer<typeof twitterTaskSettings>;
export type InstagramTaskSettings = z.infer<typeof instagramTaskSettings>;
export type TikTokTaskSettings = z.infer<typeof tiktokTaskSettings>;
export type YouTubeTaskSettings = z.infer<typeof youtubeTaskSettings>;
export type FacebookTaskSettings = z.infer<typeof facebookTaskSettings>;
export type SpotifyTaskSettings = z.infer<typeof spotifyTaskSettings>;
export type TwitchTaskSettings = z.infer<typeof twitchTaskSettings>;
export type DiscordTaskSettings = z.infer<typeof discordTaskSettings>;
export type SocialTaskSettings = z.infer<typeof socialTaskSettings>;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrates old task settings to new unified schema
 *
 * Handles:
 * - handle → username
 * - tweetUrl/postUrl/videoUrl → contentUrl
 * - mediaId → contentId
 */
export function migrateLegacyTaskSettings(
  oldSettings: any,
  platform: string
): Partial<BaseSocialTaskSettings> {
  const migrated: Partial<BaseSocialTaskSettings> = { ...oldSettings };

  // Migrate username field
  if (oldSettings.handle && !oldSettings.username) {
    migrated.username = oldSettings.handle;
    delete migrated.handle;
  }

  // Migrate content URL field
  if (oldSettings.tweetUrl && !oldSettings.contentUrl) {
    migrated.contentUrl = oldSettings.tweetUrl;
    delete migrated.tweetUrl;
  } else if (oldSettings.postUrl && !oldSettings.contentUrl) {
    migrated.contentUrl = oldSettings.postUrl;
    delete migrated.postUrl;
  } else if (oldSettings.videoUrl && !oldSettings.contentUrl) {
    migrated.contentUrl = oldSettings.videoUrl;
    delete migrated.videoUrl;
  } else if (oldSettings.mediaUrl && !oldSettings.contentUrl) {
    migrated.contentUrl = oldSettings.mediaUrl;
    delete migrated.mediaUrl;
  }

  // Migrate content ID field
  if (oldSettings.mediaId && !oldSettings.contentId) {
    migrated.contentId = oldSettings.mediaId;
    delete migrated.mediaId;
  }

  // Set default verification method based on platform
  if (!migrated.verificationMethod) {
    switch (platform) {
      case 'twitter':
      case 'youtube':
      case 'spotify':
      case 'twitch':
      case 'discord':
        migrated.verificationMethod = 'api';
        break;
      case 'tiktok':
      case 'instagram':
        migrated.verificationMethod = 'smart_detection';
        break;
      default:
        migrated.verificationMethod = 'manual';
    }
  }

  return migrated;
}

/**
 * Validates and normalizes task settings for a specific platform
 *
 * Usage:
 * ```typescript
 * const settings = validateTaskSettings('twitter', rawSettings);
 * ```
 */
export function validateTaskSettings(
  platform: string,
  settings: any
): SocialTaskSettings {
  // First migrate any legacy fields
  const migrated = migrateLegacyTaskSettings(settings, platform);

  // Add platform to settings
  const withPlatform = { ...migrated, platform };

  // Validate using the discriminated union
  return socialTaskSettings.parse(withPlatform);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts the username from various formats
 *
 * Handles:
 * - "@username" → "username"
 * - "username" → "username"
 * - "https://twitter.com/username" → "username"
 */
export function normalizeUsername(input: string): string {
  // Remove @ prefix
  let username = input.trim().replace(/^@/, '');

  // Extract from URL if present
  const urlPatterns = [
    /twitter\.com\/([^\/\?]+)/,
    /instagram\.com\/([^\/\?]+)/,
    /tiktok\.com\/@([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /facebook\.com\/([^\/\?]+)/,
    /twitch\.tv\/([^\/\?]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = username.match(pattern);
    if (match) {
      username = match[1];
      break;
    }
  }

  return username.toLowerCase();
}

/**
 * Extracts the content ID from a URL
 *
 * Handles platform-specific URL patterns:
 * - Twitter: https://twitter.com/user/status/123456789 → "123456789"
 * - Instagram: https://instagram.com/p/ABC123/ → "ABC123"
 * - TikTok: https://tiktok.com/@user/video/123456789 → "123456789"
 * - YouTube: https://youtube.com/watch?v=ABC123 → "ABC123"
 */
export function extractContentId(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);

    switch (platform) {
      case 'twitter': {
        const match = urlObj.pathname.match(/\/status\/(\d+)/);
        return match ? match[1] : null;
      }

      case 'instagram': {
        const match = urlObj.pathname.match(/\/p\/([^\/]+)/);
        return match ? match[1] : null;
      }

      case 'tiktok': {
        const match = urlObj.pathname.match(/\/video\/(\d+)/);
        return match ? match[1] : null;
      }

      case 'youtube': {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return videoId;
        const shortMatch = urlObj.pathname.match(/\/shorts\/([^\/]+)/);
        return shortMatch ? shortMatch[1] : null;
      }

      case 'facebook': {
        const match = urlObj.pathname.match(/\/posts\/([^\/]+)/);
        return match ? match[1] : null;
      }

      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Checks if settings have required fields for verification
 */
export function hasRequiredFieldsForVerification(
  settings: Partial<BaseSocialTaskSettings>,
  taskType: string
): boolean {
  // Check based on task type
  if (taskType.includes('follow')) {
    return !!(settings.username || settings.userId);
  }

  if (taskType.includes('like') || taskType.includes('comment')) {
    return !!(settings.contentUrl || settings.contentId);
  }

  return true; // Other task types don't have strict requirements
}
