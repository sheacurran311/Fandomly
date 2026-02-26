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
  // Common platform-specific URLs (kept optional to preserve in storage)
  pageUrl: z.string().optional(), // Facebook page URL
  channelUrl: z.string().optional(), // YouTube channel URL
  playlistUrl: z.string().optional(), // Spotify playlist URL
  artistUrl: z.string().optional(), // Spotify artist URL
  profileUrl: z.string().optional(), // Generic profile URL fallback

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
    /(?:twitter|x)\.com\/([^\/\?]+)/,
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

/**
 * Extracts YouTube channel ID from various YouTube URL formats
 * Supports:
 * - https://youtube.com/channel/UC123456789
 * - https://www.youtube.com/channel/UC123456789
 * - https://youtube.com/@username (note: returns @username, needs API lookup)
 * - https://www.youtube.com/@username
 */
function extractYouTubeChannelId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Channel ID format: /channel/UC...
    const channelMatch = urlObj.pathname.match(/\/channel\/([^\/]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    // Custom URL format: /@username
    const customUrlMatch = urlObj.pathname.match(/\/@([^\/]+)/);
    if (customUrlMatch) {
      // Return the custom URL - caller will need to resolve to channel ID via API
      return `@${customUrlMatch[1]}`;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts Spotify artist ID from Spotify artist URL
 * Example: https://open.spotify.com/artist/6eUKZXaKkcviH0Ku9w2n3V → "6eUKZXaKkcviH0Ku9w2n3V"
 */
function extractSpotifyArtistId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/artist\/([^\/\?]+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts Spotify playlist ID from Spotify playlist URL
 * Example: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M → "37i9dQZF1DXcBWIGoYBM5M"
 */
function extractSpotifyPlaylistId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/playlist\/([^\/\?]+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Builds targetData object from task customSettings for verification
 * This is the "missing component" that matches Creator account data with Fan verification
 *
 * @param customSettings - The task's customSettings JSONB field
 * @param platform - The social platform (youtube, spotify, twitter, etc.)
 * @param taskType - The specific task type (youtube_subscribe, spotify_follow, etc.)
 * @returns Formatted targetData object ready for verification API calls
 *
 * Examples:
 * - YouTube Subscribe: { channelId: "UC123..." } from { channelUrl: "https://youtube.com/channel/UC123..." }
 * - YouTube Like: { videoId: "dQw4w9WgXcQ" } from { videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ" }
 * - Spotify Follow Artist: { artistId: "6eUK..." } from { artistUrl: "https://open.spotify.com/artist/6eUK..." }
 * - Twitter Follow: { creatorTwitterId: "12345" } from { userId: "12345" }
 */
export function buildTargetDataFromSettings(
  customSettings: Record<string, any>,
  platform: string,
  taskType: string
): Record<string, any> {
  const targetData: Record<string, any> = {};

  // Handle platform-specific transformations
  switch (platform) {
    case 'youtube':
      if (taskType === 'youtube_subscribe') {
        // Extract channel ID from channelUrl
        if (customSettings.channelUrl) {
          const channelId = extractYouTubeChannelId(customSettings.channelUrl);
          if (channelId) {
            targetData.channelId = channelId;
          }
        }
        // Also check if channelId is directly provided
        if (customSettings.channelId) {
          targetData.channelId = customSettings.channelId;
        }
      } else if (taskType === 'youtube_like' || taskType === 'youtube_comment') {
        // Extract video ID from videoUrl
        if (customSettings.videoUrl) {
          const videoId = extractContentId(customSettings.videoUrl, 'youtube');
          if (videoId) {
            targetData.videoId = videoId;
          }
        }
        // Also check if videoId is directly provided
        if (customSettings.videoId) {
          targetData.videoId = customSettings.videoId;
        }
        // Support legacy contentUrl field
        if (customSettings.contentUrl && !targetData.videoId) {
          const videoId = extractContentId(customSettings.contentUrl, 'youtube');
          if (videoId) {
            targetData.videoId = videoId;
          }
        }
        if (customSettings.contentId && !targetData.videoId) {
          targetData.videoId = customSettings.contentId;
        }
      }
      break;

    case 'spotify':
      if (taskType === 'spotify_follow' || taskType === 'spotify_follow_artist') {
        // Extract artist ID from artistUrl or contentUrl
        if (customSettings.artistUrl) {
          const artistId = extractSpotifyArtistId(customSettings.artistUrl);
          if (artistId) {
            targetData.artistId = artistId;
          }
        }
        if (customSettings.artistId) {
          targetData.artistId = customSettings.artistId;
        }
        if (customSettings.contentUrl && !targetData.artistId) {
          const artistId = extractSpotifyArtistId(customSettings.contentUrl);
          if (artistId) {
            targetData.artistId = artistId;
          }
        }
        if (customSettings.userId) {
          targetData.artistId = customSettings.userId;
        }
      } else if (taskType === 'spotify_playlist' || taskType === 'spotify_follow_playlist') {
        // Extract playlist ID from playlistUrl or contentUrl
        if (customSettings.playlistUrl) {
          const playlistId = extractSpotifyPlaylistId(customSettings.playlistUrl);
          if (playlistId) {
            targetData.playlistId = playlistId;
          }
        }
        if (customSettings.playlistId) {
          targetData.playlistId = customSettings.playlistId;
        }
        if (customSettings.contentUrl && !targetData.playlistId) {
          const playlistId = extractSpotifyPlaylistId(customSettings.contentUrl);
          if (playlistId) {
            targetData.playlistId = playlistId;
          }
        }
        if (customSettings.contentId && !targetData.playlistId) {
          targetData.playlistId = customSettings.contentId;
        }
      }
      break;

    case 'twitter':
      if (taskType === 'twitter_follow') {
        // Twitter follow needs the creator's Twitter user ID
        if (customSettings.userId) {
          targetData.creatorTwitterId = customSettings.userId;
        }
        if (customSettings.creatorTwitterId) {
          targetData.creatorTwitterId = customSettings.creatorTwitterId;
        }
      } else if (taskType === 'twitter_like' || taskType === 'twitter_retweet' || taskType === 'twitter_quote_tweet' || taskType === 'twitter_reply') {
        // Extract tweet ID from tweetUrl or contentUrl
        if (customSettings.tweetUrl) {
          const tweetId = extractContentId(customSettings.tweetUrl, 'twitter');
          if (tweetId) {
            targetData.tweetId = tweetId;
          }
        }
        if (customSettings.contentUrl && !targetData.tweetId) {
          const tweetId = extractContentId(customSettings.contentUrl, 'twitter');
          if (tweetId) {
            targetData.tweetId = tweetId;
          }
        }
        if (customSettings.tweetId) {
          targetData.tweetId = customSettings.tweetId;
        }
        if (customSettings.contentId && !targetData.tweetId) {
          targetData.tweetId = customSettings.contentId;
        }
      }
      break;

    case 'tiktok':
      if (taskType === 'tiktok_follow') {
        // TikTok follow needs the creator's TikTok user ID
        if (customSettings.userId) {
          targetData.creatorTikTokId = customSettings.userId;
        }
        if (customSettings.creatorTikTokId) {
          targetData.creatorTikTokId = customSettings.creatorTikTokId;
        }
      } else if (taskType === 'tiktok_like' || taskType === 'tiktok_comment' || taskType === 'tiktok_share') {
        // Extract video ID from videoUrl or contentUrl
        if (customSettings.videoUrl) {
          const videoId = extractContentId(customSettings.videoUrl, 'tiktok');
          if (videoId) {
            targetData.videoId = videoId;
          }
        }
        if (customSettings.contentUrl && !targetData.videoId) {
          const videoId = extractContentId(customSettings.contentUrl, 'tiktok');
          if (videoId) {
            targetData.videoId = videoId;
          }
        }
        if (customSettings.videoId) {
          targetData.videoId = customSettings.videoId;
        }
        if (customSettings.contentId && !targetData.videoId) {
          targetData.videoId = customSettings.contentId;
        }
      }
      break;

    case 'instagram':
      if (taskType === 'instagram_follow') {
        if (customSettings.userId) {
          targetData.userId = customSettings.userId;
        }
        if (customSettings.username) {
          targetData.username = customSettings.username;
        }
      } else if (taskType === 'instagram_like_post' || taskType === 'comment_code' || taskType === 'keyword_comment') {
        // Extract post ID from postUrl or contentUrl
        if (customSettings.postUrl) {
          const postId = extractContentId(customSettings.postUrl, 'instagram');
          if (postId) {
            targetData.postId = postId;
          }
        }
        if (customSettings.contentUrl && !targetData.postId) {
          const postId = extractContentId(customSettings.contentUrl, 'instagram');
          if (postId) {
            targetData.postId = postId;
          }
        }
        if (customSettings.postId) {
          targetData.postId = customSettings.postId;
        }
        if (customSettings.contentId && !targetData.postId) {
          targetData.postId = customSettings.contentId;
        }
      }
      break;

    case 'facebook':
      if (taskType === 'facebook_like_page') {
        if (customSettings.pageId) {
          targetData.pageId = customSettings.pageId;
        }
        if (customSettings.userId) {
          targetData.pageId = customSettings.userId;
        }
      } else if (taskType === 'facebook_like_post' || taskType === 'facebook_comment_post' || taskType === 'facebook_share') {
        // Extract post ID from postUrl or contentUrl
        if (customSettings.postUrl) {
          const postId = extractContentId(customSettings.postUrl, 'facebook');
          if (postId) {
            targetData.postId = postId;
          }
        }
        if (customSettings.contentUrl && !targetData.postId) {
          const postId = extractContentId(customSettings.contentUrl, 'facebook');
          if (postId) {
            targetData.postId = postId;
          }
        }
        if (customSettings.postId) {
          targetData.postId = customSettings.postId;
        }
        if (customSettings.contentId && !targetData.postId) {
          targetData.postId = customSettings.contentId;
        }
      }
      break;
  }

  return targetData;
}
