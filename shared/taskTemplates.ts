import { z } from 'zod';

// Platform-specific task configuration schemas
export const twitterTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('twitter_follow'),
    handle: z.string().min(1, 'Twitter handle is required'),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_mention'),
    username: z.string().min(1, 'Username to mention is required'),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_retweet'),
    tweetUrl: z.string().url('Valid tweet URL is required'),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_like'),
    tweetUrl: z.string().url('Valid tweet URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_include_name'),
    requiredText: z.string().min(1, 'Required text is needed'),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_include_bio'),
    requiredText: z.string().min(1, 'Required text is needed'),
    points: z.number().min(1).default(200),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_hashtag_post'),
    hashtags: z.array(z.string()).min(1, 'At least one hashtag required'),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('twitter_quote_tweet'),
    tweetUrl: z.string().url('Valid tweet URL is required'),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const facebookTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('facebook_like_page'),
    pageId: z.string().min(1, 'Facebook page ID is required'),
    pageName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_like_photo'),
    postUrl: z.string().url('Valid Facebook photo URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_like_post'),
    postUrl: z.string().url('Valid Facebook post URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_share_post'),
    postUrl: z.string().url('Valid Facebook post URL is required'),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_share_page'),
    pageId: z.string().min(1, 'Facebook page ID is required'),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_comment_post'),
    postUrl: z.string().url('Valid Facebook post URL is required'),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('facebook_comment_photo'),
    postUrl: z.string().url('Valid Facebook photo URL is required'),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const instagramTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('instagram_follow'),
    username: z.string().min(1, 'Instagram username is required'),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('instagram_like_post'),
    postUrl: z.string().url('Valid Instagram post URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('comment_code'),
    mediaId: z.string().min(1, 'Instagram media ID is required'),
    mediaUrl: z.string().url('Valid Instagram post URL is required'),
    points: z.number().min(1).default(30),
    verificationMethod: z.literal('automatic'),
  }),
  z.object({
    taskType: z.literal('mention_story'),
    requireHashtag: z.string().optional(),
    points: z.number().min(1).default(75),
    verificationMethod: z.literal('automatic'),
  }),
  z.object({
    taskType: z.literal('keyword_comment'),
    mediaId: z.string().min(1, 'Instagram media ID is required'),
    mediaUrl: z.string().url('Valid Instagram post URL is required'),
    keyword: z.string().min(1, 'Keyword is required'),
    points: z.number().min(1).default(30),
    verificationMethod: z.literal('automatic'),
  }),
]);

export const youtubeTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('youtube_like'),
    videoUrl: z.string().url('Valid YouTube video URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('youtube_subscribe'),
    channelUrl: z.string().url('Valid YouTube channel URL is required'),
    channelName: z.string().optional(),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('youtube_share'),
    videoUrl: z.string().url('Valid YouTube video URL is required'),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('youtube_comment'),
    videoUrl: z.string().url('Valid YouTube video URL is required'),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const tiktokTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('tiktok_follow'),
    username: z.string().min(1, 'TikTok username is required'),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('tiktok_like'),
    videoUrl: z.string().url('Valid TikTok video URL is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('tiktok_share'),
    videoUrl: z.string().url('Valid TikTok video URL is required'),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('tiktok_comment'),
    videoUrl: z.string().url('Valid TikTok video URL is required'),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const spotifyTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('spotify_follow'),
    artistId: z.string().min(1, 'Spotify artist ID is required'),
    artistName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('spotify_playlist'),
    playlistUrl: z.string().url('Valid Spotify playlist URL is required'),
    playlistName: z.string().optional(),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
  z.object({
    taskType: z.literal('spotify_album'),
    albumUrl: z.string().url('Valid Spotify album URL is required'),
    albumName: z.string().optional(),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const appleMusicTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('apple_music_favorite_artist'),
    artistId: z.string().min(1, 'Apple Music artist ID is required'),
    artistName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('apple_music_add_track'),
    trackId: z.string().min(1, 'Apple Music track ID is required'),
    trackName: z.string().optional(),
    points: z.number().min(1).default(30),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('apple_music_add_album'),
    albumId: z.string().min(1, 'Apple Music album ID is required'),
    albumName: z.string().optional(),
    points: z.number().min(1).default(40),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('apple_music_add_playlist'),
    playlistId: z.string().min(1, 'Apple Music playlist ID is required'),
    playlistName: z.string().optional(),
    points: z.number().min(1).default(40),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('apple_music_listen'),
    trackId: z.string().min(1, 'Apple Music track ID is required'),
    trackName: z.string().optional(),
    points: z.number().min(1).default(20),
    verificationMethod: z.enum(['manual', 'automatic']).default('manual'),
  }),
]);

export const discordTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('discord_join'),
    serverId: z.string().min(1, 'Discord server ID is required'),
    serverInvite: z.string().url('Valid Discord invite URL is required').optional(),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('discord_role'),
    serverId: z.string().min(1, 'Discord server ID is required'),
    roleId: z.string().min(1, 'Discord role ID is required'),
    roleName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('discord_react'),
    serverId: z.string().min(1, 'Discord server ID is required'),
    channelId: z.string().min(1, 'Discord channel ID is required'),
    messageId: z.string().min(1, 'Discord message ID is required'),
    emoji: z.string().min(1, 'Emoji is required'),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('discord_message_code'),
    serverId: z.string().min(1, 'Discord server ID is required'),
    channelId: z.string().min(1, 'Discord channel ID is required'),
    points: z.number().min(1).default(40),
    verificationMethod: z.literal('automatic'),
  }),
]);

export const twitchTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('twitch_follow'),
    channelName: z.string().min(1, 'Twitch channel name is required'),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('twitch_subscribe'),
    channelName: z.string().min(1, 'Twitch channel name is required'),
    points: z.number().min(1).default(200),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('twitch_chat_code'),
    channelName: z.string().min(1, 'Twitch channel name is required'),
    points: z.number().min(1).default(40),
    verificationMethod: z.literal('automatic'),
  }),
]);

export const kickTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('kick_follow'),
    channelSlug: z.string().min(1, 'Kick channel slug is required'),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('kick_subscribe'),
    channelSlug: z.string().min(1, 'Kick channel slug is required'),
    points: z.number().min(1).default(200),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('kick_chat_code'),
    channelSlug: z.string().min(1, 'Kick channel slug is required'),
    points: z.number().min(1).default(40),
    verificationMethod: z.literal('automatic'),
  }),
  z.object({
    taskType: z.literal('kick_redeem_reward'),
    channelSlug: z.string().min(1, 'Kick channel slug is required'),
    rewardId: z.string().min(1, 'Kick reward ID is required'),
    rewardName: z.string().optional(),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
]);

export const patreonTaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType: z.literal('patreon_support'),
    creatorUrl: z.string().url('Valid Patreon creator URL is required').optional(),
    points: z.number().min(1).default(200),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
  z.object({
    taskType: z.literal('patreon_tier_check'),
    tierId: z.string().min(1, 'Patreon tier ID is required').optional(),
    tierName: z.string().optional(),
    minAmountCents: z.number().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(['manual', 'automatic']).default('automatic'),
  }),
]);

// Core task template catalog - Global templates available to all creators
// Each template now includes verification tier (T1/T2/T3) and method
export const CORE_TASK_TEMPLATES = [
  // ============================================================================
  // T1 - API VERIFIED TASKS (100% points)
  // Platforms with full API verification: Spotify, YouTube, Discord, Twitch, Twitter Basic
  // ============================================================================

  // Twitter/X Templates (T1 with Basic tier API)
  {
    id: 'twitter-follow',
    name: 'Follow on X (Twitter)',
    description: 'Fans follow your X/Twitter account',
    platform: 'twitter' as const,
    taskType: 'twitter_follow' as const,
    category: 'social',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-retweet',
    name: 'Retweet Post',
    description: 'Fans retweet a specific post',
    platform: 'twitter' as const,
    taskType: 'twitter_retweet' as const,
    category: 'social',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 100,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-like',
    name: 'Like Tweet',
    description: 'Fans like a specific tweet',
    platform: 'twitter' as const,
    taskType: 'twitter_like' as const,
    category: 'social',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 25,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-mention',
    name: 'Mention in Post',
    description: 'Fans mention you in their posts',
    platform: 'twitter' as const,
    taskType: 'twitter_mention' as const,
    category: 'social',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 75,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },

  // Spotify Templates (T1 - Full API access)
  {
    id: 'spotify-follow',
    name: 'Follow on Spotify',
    description: 'Fans follow your Spotify artist profile',
    platform: 'spotify' as const,
    taskType: 'spotify_follow' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'spotify-playlist',
    name: 'Follow Spotify Playlist',
    description: 'Fans follow a specific Spotify playlist',
    platform: 'spotify' as const,
    taskType: 'spotify_playlist' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'spotify-save-track',
    name: 'Save Track on Spotify',
    description: 'Fans save a track to their Spotify library',
    platform: 'spotify' as const,
    taskType: 'spotify_save_track' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 30,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 30,
    isGlobal: true,
    isActive: true,
  },

  // Apple Music Templates (T1 - Full API access)
  {
    id: 'apple-music-favorite-artist',
    name: 'Add Artist on Apple Music',
    description: 'Fans add your artist profile to their Apple Music library',
    platform: 'apple_music' as const,
    taskType: 'apple_music_favorite_artist' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'apple-music-add-track',
    name: 'Add Track on Apple Music',
    description: 'Fans add a track to their Apple Music library',
    platform: 'apple_music' as const,
    taskType: 'apple_music_add_track' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 30,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 30,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'apple-music-add-album',
    name: 'Add Album on Apple Music',
    description: 'Fans add an album to their Apple Music library',
    platform: 'apple_music' as const,
    taskType: 'apple_music_add_album' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'apple-music-add-playlist',
    name: 'Add Playlist on Apple Music',
    description: 'Fans add a playlist to their Apple Music library',
    platform: 'apple_music' as const,
    taskType: 'apple_music_add_playlist' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'apple-music-listen',
    name: 'Listen on Apple Music',
    description: 'Fans listen to a track on Apple Music',
    platform: 'apple_music' as const,
    taskType: 'apple_music_listen' as const,
    category: 'social',
    verificationTier: 'T2' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 20,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 20,
    isGlobal: true,
    isActive: true,
  },

  // YouTube Templates (T1 - Full API access)
  {
    id: 'youtube-subscribe',
    name: 'Subscribe on YouTube',
    description: 'Fans subscribe to your YouTube channel',
    platform: 'youtube' as const,
    taskType: 'youtube_subscribe' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 100,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  // NOTE: youtube_like is T3 because YouTube API doesn't expose per-user like data
  // Only aggregate like counts are available, not individual user likes
  {
    id: 'youtube-like',
    name: 'Like YouTube Video',
    description: 'Fans like a specific YouTube video (manual verification)',
    platform: 'youtube' as const,
    taskType: 'youtube_like' as const,
    category: 'social',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 15, // Reduced for T3 (50% of typical)
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 15,
    isGlobal: true,
    isActive: true,
  },

  // Discord Templates (T1 - Full API access via bot)
  {
    id: 'discord-join',
    name: 'Join Discord Server',
    description: 'Fans join your Discord community',
    platform: 'discord' as const,
    taskType: 'discord_join' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 75,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'discord-role',
    name: 'Get Discord Role',
    description: 'Fans earn a specific role in your Discord server',
    platform: 'discord' as const,
    taskType: 'discord_role' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'discord-react',
    name: 'React to Discord Message',
    description: 'Fans react to a specific message with an emoji',
    platform: 'discord' as const,
    taskType: 'discord_react' as const,
    category: 'social',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 25,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // Twitch Templates (T1 - Full API access)
  {
    id: 'twitch-follow',
    name: 'Follow on Twitch',
    description: 'Fans follow your Twitch channel',
    platform: 'twitch' as const,
    taskType: 'twitch_follow' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitch-subscribe',
    name: 'Subscribe on Twitch',
    description: 'Fans subscribe to your Twitch channel (paid)',
    platform: 'twitch' as const,
    taskType: 'twitch_subscribe' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 200,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },

  // Twitter Hashtag Post (T2 — can verify via API search for hashtag + code)
  {
    id: 'twitter-hashtag-post',
    name: 'Post with Hashtag',
    description: 'Fans post a tweet with a specific hashtag',
    platform: 'twitter' as const,
    taskType: 'twitter_hashtag_post' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_repost' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 85,
      verificationMethod: 'code_repost' as const,
    },
    defaultPoints: 85,
    isGlobal: true,
    isActive: true,
  },

  // ============================================================================
  // T2 - CODE VERIFIED TASKS (85% points)
  // Tasks verified via unique code in comment or quote tweet
  // ============================================================================

  // Twitter Quote Tweet with Code (T2)
  {
    id: 'twitter-quote-tweet',
    name: 'Quote Tweet with Code',
    description: 'Fans quote tweet with their unique verification code',
    platform: 'twitter' as const,
    taskType: 'twitter_quote_tweet' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_repost' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 85, // 85% of 100
      verificationMethod: 'code_repost' as const,
    },
    defaultPoints: 85,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-reply-code',
    name: 'Reply with Code',
    description: 'Fans reply to a tweet with their unique verification code',
    platform: 'twitter' as const,
    taskType: 'twitter_reply_code' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // Instagram Code Verification (T2)
  {
    id: 'instagram-comment-code',
    name: 'Comment with Code on Instagram',
    description: 'Fans comment with their unique verification code',
    platform: 'instagram' as const,
    taskType: 'comment_code' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'instagram-keyword-comment',
    name: 'Comment with Keyword on Instagram',
    description: 'Fans comment with specific keyword (code verification)',
    platform: 'instagram' as const,
    taskType: 'keyword_comment' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // YouTube Comment with Code (T2)
  {
    id: 'youtube-comment',
    name: 'Comment with Code on YouTube',
    description: 'Fans comment on a video with their unique verification code',
    platform: 'youtube' as const,
    taskType: 'youtube_comment' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // Facebook Comment with Code (T2)
  {
    id: 'facebook-comment-post',
    name: 'Comment with Code on Facebook Post',
    description: 'Fans comment with their unique verification code',
    platform: 'facebook' as const,
    taskType: 'facebook_comment_post' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-comment-photo',
    name: 'Comment with Code on Facebook Photo',
    description: 'Fans comment with their unique verification code',
    platform: 'facebook' as const,
    taskType: 'facebook_comment_photo' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // TikTok Comment with Code (T2)
  {
    id: 'tiktok-comment',
    name: 'Comment with Code on TikTok',
    description: 'Fans comment on a video with their unique verification code',
    platform: 'tiktok' as const,
    taskType: 'tiktok_comment' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // Discord Message with Code (T2)
  {
    id: 'discord-message-code',
    name: 'Discord Message with Code',
    description: 'Fans send a message with their verification code in a channel',
    platform: 'discord' as const,
    taskType: 'discord_message_code' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // Instagram Story Mention (T2 - via webhook)
  {
    id: 'instagram-mention-story',
    name: 'Mention in Instagram Story',
    description: 'Fans mention you in their Instagram Story',
    platform: 'instagram' as const,
    taskType: 'mention_story' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 65, // 85% of ~75
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 65,
    isGlobal: true,
    isActive: true,
  },

  // ============================================================================
  // T3 - STARTER PACK TASKS (50% points)
  // Honor system tasks with embedded profile - one-time per platform per tenant
  // ============================================================================

  // Instagram Starter Pack (T3)
  {
    id: 'instagram-follow',
    name: 'Follow on Instagram (Starter Pack)',
    description: "Follow the creator's Instagram account - one-time starter task",
    platform: 'instagram' as const,
    taskType: 'instagram_follow' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'starter_pack' as const,
    isStarterPack: true,
    defaultConfig: {
      points: 25, // 50% of 50
      verificationMethod: 'starter_pack' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'instagram-like-post',
    name: 'Like Instagram Post',
    description: 'Fans like a specific Instagram post',
    platform: 'instagram' as const,
    taskType: 'instagram_like_post' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 15, // 50% of ~25
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 15,
    isGlobal: true,
    isActive: true,
  },

  // TikTok Starter Pack (T3)
  {
    id: 'tiktok-follow',
    name: 'Follow on TikTok (Starter Pack)',
    description: "Follow the creator's TikTok account - one-time starter task",
    platform: 'tiktok' as const,
    taskType: 'tiktok_follow' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'starter_pack' as const,
    isStarterPack: true,
    defaultConfig: {
      points: 25, // 50% of 50
      verificationMethod: 'starter_pack' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'tiktok-like',
    name: 'Like TikTok Video',
    description: 'Fans like a specific TikTok video',
    platform: 'tiktok' as const,
    taskType: 'tiktok_like' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 15, // 50% of ~25
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 15,
    isGlobal: true,
    isActive: true,
  },

  // Twitter Profile Tasks (T3 — manual verification, profile changes)
  {
    id: 'twitter-include-name',
    name: 'Include Text in Name',
    description: 'Fans include specific text in their X/Twitter display name',
    platform: 'twitter' as const,
    taskType: 'twitter_include_name' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 25,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-include-bio',
    name: 'Include Text in Bio',
    description: 'Fans include specific text in their X/Twitter bio',
    platform: 'twitter' as const,
    taskType: 'twitter_include_bio' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 25,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // Facebook Starter Pack (T3)
  {
    id: 'facebook-like-page',
    name: 'Like Facebook Page (Starter Pack)',
    description: "Like the creator's Facebook page - one-time starter task",
    platform: 'facebook' as const,
    taskType: 'facebook_like_page' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'starter_pack' as const,
    isStarterPack: true,
    defaultConfig: {
      points: 25, // 50% of 50
      verificationMethod: 'starter_pack' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-like-post',
    name: 'Like Facebook Post',
    description: 'Fans like a specific Facebook post',
    platform: 'facebook' as const,
    taskType: 'facebook_like_post' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 15,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 15,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-like-photo',
    name: 'Like Facebook Photo',
    description: 'Fans like a specific Facebook photo',
    platform: 'facebook' as const,
    taskType: 'facebook_like_photo' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 15,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 15,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-share-post',
    name: 'Share Facebook Post',
    description: 'Fans share a specific Facebook post',
    platform: 'facebook' as const,
    taskType: 'facebook_share_post' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-share-page',
    name: 'Share Facebook Page',
    description: "Fans share the creator's Facebook page",
    platform: 'facebook' as const,
    taskType: 'facebook_share_page' as const,
    category: 'starter_pack',
    verificationTier: 'T3' as const,
    verificationMethod: 'manual' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 25,
      verificationMethod: 'manual' as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // ============================================================================
  // KICK TEMPLATES (New Platform)
  // ============================================================================

  // Kick T1 - API Verified
  {
    id: 'kick-follow',
    name: 'Follow on Kick',
    description: 'Fans follow your Kick channel',
    platform: 'kick' as const,
    taskType: 'kick_follow' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 50,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'kick-subscribe',
    name: 'Subscribe on Kick',
    description: 'Fans subscribe to your Kick channel (paid)',
    platform: 'kick' as const,
    taskType: 'kick_subscribe' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 200,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'kick-redeem-reward',
    name: 'Redeem Kick Channel Reward',
    description: 'Fans redeem a specific channel reward on Kick',
    platform: 'kick' as const,
    taskType: 'kick_redeem_reward' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 75,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },

  // Kick T2 - Code Verified
  {
    id: 'kick-chat-code',
    name: 'Chat with Code on Kick',
    description: 'Fans send a chat message with their unique verification code',
    platform: 'kick' as const,
    taskType: 'kick_chat_code' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },

  // ============================================================================
  // PATREON TEMPLATES (New Platform)
  // ============================================================================

  {
    id: 'patreon-support',
    name: 'Support on Patreon',
    description: 'Fans become a patron and support you on Patreon',
    platform: 'patreon' as const,
    taskType: 'patreon_support' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 200,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'patreon-tier-check',
    name: 'Patreon Tier Membership',
    description: 'Fans maintain a specific tier level on Patreon',
    platform: 'patreon' as const,
    taskType: 'patreon_tier_check' as const,
    category: 'trust_anchor',
    verificationTier: 'T1' as const,
    verificationMethod: 'api' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 150,
      verificationMethod: 'api' as const,
    },
    defaultPoints: 150,
    isGlobal: true,
    isActive: true,
  },

  // ============================================================================
  // TWITCH CHAT CODE (T2 - New Task Type)
  // ============================================================================

  {
    id: 'twitch-chat-code',
    name: 'Chat with Code on Twitch',
    description: 'Fans send a chat message with their unique verification code during stream',
    platform: 'twitch' as const,
    taskType: 'twitch_chat_code' as const,
    category: 'code_verification',
    verificationTier: 'T2' as const,
    verificationMethod: 'code_comment' as const,
    isStarterPack: false,
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment' as const,
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
] as const;

// Platform-to-task-types mapping for UI
// All values use canonical names (platform_action) for consistency with
// TASK_TYPE_VERIFICATION and CORE_TASK_TEMPLATES.
export const PLATFORM_TASK_TYPES = {
  twitter: [
    { value: 'twitter_follow', label: 'Follow Account', icon: 'UserPlus' },
    { value: 'twitter_mention', label: 'Mention in Post', icon: 'AtSign' },
    { value: 'twitter_retweet', label: 'Retweet', icon: 'Repeat' },
    { value: 'twitter_like', label: 'Like Tweet', icon: 'Heart' },
    { value: 'twitter_quote_tweet', label: 'Quote Tweet', icon: 'Quote' },
    { value: 'twitter_include_name', label: 'Include in Name', icon: 'User' },
    { value: 'twitter_include_bio', label: 'Include in Bio', icon: 'FileText' },
    { value: 'twitter_hashtag_post', label: 'Post with Hashtag', icon: 'Hash' },
  ],
  facebook: [
    { value: 'facebook_like_page', label: 'Like Page', icon: 'ThumbsUp' },
    { value: 'facebook_like_photo', label: 'Like Photo', icon: 'Image' },
    { value: 'facebook_like_post', label: 'Like Post', icon: 'ThumbsUp' },
    { value: 'facebook_share_post', label: 'Share Post', icon: 'Share' },
    { value: 'facebook_share_page', label: 'Share Page', icon: 'Share2' },
    { value: 'facebook_comment_post', label: 'Comment on Post', icon: 'MessageCircle' },
    { value: 'facebook_comment_photo', label: 'Comment on Photo', icon: 'MessageSquare' },
  ],
  instagram: [
    { value: 'instagram_follow', label: 'Follow Account', icon: 'UserPlus' },
    { value: 'instagram_like_post', label: 'Like Post', icon: 'Heart' },
    { value: 'comment_code', label: 'Comment with Code', icon: 'MessageSquare' },
    { value: 'mention_story', label: 'Mention in Story', icon: 'Camera' },
    { value: 'keyword_comment', label: 'Comment with Keyword', icon: 'Hash' },
  ],
  youtube: [
    { value: 'youtube_like', label: 'Like Video', icon: 'ThumbsUp' },
    { value: 'youtube_subscribe', label: 'Subscribe', icon: 'Bell' },
    { value: 'youtube_share', label: 'Share Video', icon: 'Share' },
    { value: 'youtube_comment', label: 'Comment on Video', icon: 'MessageCircle' },
  ],
  tiktok: [
    { value: 'tiktok_follow', label: 'Follow Account', icon: 'UserPlus' },
    { value: 'tiktok_like', label: 'Like Video', icon: 'Heart' },
    { value: 'tiktok_share', label: 'Share Video', icon: 'Share' },
    { value: 'tiktok_comment', label: 'Comment on Video', icon: 'MessageCircle' },
    { value: 'tiktok_post', label: 'Create Post with Hashtag', icon: 'Camera' },
  ],
  spotify: [
    { value: 'spotify_follow', label: 'Follow Artist', icon: 'UserPlus' },
    { value: 'spotify_playlist', label: 'Follow Playlist', icon: 'Music' },
    { value: 'spotify_save_track', label: 'Save Track', icon: 'Music' },
    { value: 'spotify_album', label: 'Save Album', icon: 'Disc' },
  ],
  apple_music: [
    { value: 'apple_music_favorite_artist', label: 'Add Artist to Library', icon: 'UserPlus' },
    { value: 'apple_music_add_track', label: 'Add Track to Library', icon: 'Music' },
    { value: 'apple_music_add_album', label: 'Add Album to Library', icon: 'Disc' },
    { value: 'apple_music_add_playlist', label: 'Add Playlist to Library', icon: 'ListMusic' },
    { value: 'apple_music_listen', label: 'Listen to Track', icon: 'Headphones' },
  ],
  kick: [
    { value: 'kick_follow', label: 'Follow Channel', icon: 'UserPlus' },
    { value: 'kick_subscribe', label: 'Subscribe', icon: 'Star' },
    { value: 'kick_chat_code', label: 'Chat with Code', icon: 'MessageCircle' },
    { value: 'kick_redeem_reward', label: 'Redeem Reward', icon: 'Gift' },
  ],
  patreon: [
    { value: 'patreon_support', label: 'Become a Patron', icon: 'Heart' },
    { value: 'patreon_tier_check', label: 'Tier Membership', icon: 'Award' },
  ],
  twitch: [
    { value: 'twitch_follow', label: 'Follow Channel', icon: 'UserPlus' },
    { value: 'twitch_subscribe', label: 'Subscribe', icon: 'Star' },
    { value: 'twitch_chat_code', label: 'Chat with Code', icon: 'MessageCircle' },
  ],
  discord: [
    { value: 'discord_join', label: 'Join Server', icon: 'Users' },
    { value: 'discord_react', label: 'React to Message', icon: 'ThumbsUp' },
    { value: 'discord_message_code', label: 'Message with Code', icon: 'MessageSquare' },
  ],
} as const;

// Export types for platform-specific schemas
export type TwitterTaskConfig = z.infer<typeof twitterTaskSchema>;
export type FacebookTaskConfig = z.infer<typeof facebookTaskSchema>;
export type InstagramTaskConfig = z.infer<typeof instagramTaskSchema>;
export type YouTubeTaskConfig = z.infer<typeof youtubeTaskSchema>;
export type TikTokTaskConfig = z.infer<typeof tiktokTaskSchema>;
export type SpotifyTaskConfig = z.infer<typeof spotifyTaskSchema>;
export type DiscordTaskConfig = z.infer<typeof discordTaskSchema>;
export type TwitchTaskConfig = z.infer<typeof twitchTaskSchema>;
export type KickTaskConfig = z.infer<typeof kickTaskSchema>;
export type PatreonTaskConfig = z.infer<typeof patreonTaskSchema>;

// Union type for all platform configs
export type PlatformTaskConfig =
  | TwitterTaskConfig
  | FacebookTaskConfig
  | InstagramTaskConfig
  | YouTubeTaskConfig
  | TikTokTaskConfig
  | SpotifyTaskConfig
  | DiscordTaskConfig
  | TwitchTaskConfig
  | KickTaskConfig
  | PatreonTaskConfig;

// ============================================================================
// VERIFICATION TIER SYSTEM
// ============================================================================

/**
 * VERIFICATION TIER SYSTEM - TRANSPARENT GUIDANCE
 *
 * Tiers indicate verification reliability and guide recommended point values.
 * NO HIDDEN MULTIPLIERS - what you set is what fans receive.
 *
 * - T1 (High Trust): Fully API verified - Recommended 50-200 points
 *   Platforms: Spotify, YouTube, Discord, Twitch, Twitter (Basic tier)
 *   These tasks can be 100% verified through platform APIs.
 *
 * - T2 (Medium Trust): Code-verified - Recommended 30-85 points
 *   Methods: Code-in-comment, code-in-quote-tweet
 *   Fans include a unique code that we can verify in their post.
 *
 * - T3 (Lower Trust): Honor system - Recommended 15-25 points
 *   Methods: Starter pack tasks, manual verification
 *   Cannot be automatically verified - relies on fan honesty.
 *   Use lower points to discourage abuse.
 */
export type VerificationTier = 'T1' | 'T2' | 'T3';

/**
 * Verification Methods:
 * - api: Direct API check (T1)
 * - code_comment: Unique code in comment (T2)
 * - code_repost: Unique code in quote/repost (T2)
 * - hashtag: Campaign hashtag tracking (Group goals)
 * - starter_pack: Embedded profile with honor system (T3)
 * - manual: Manual creator review (T3)
 */
export type VerificationMethod =
  | 'api'
  | 'code_comment'
  | 'code_repost'
  | 'hashtag'
  | 'starter_pack'
  | 'manual';

/**
 * Creator-facing guidance for each verification tier
 * Display this in the task creation UI to help creators set appropriate points
 */
export const TIER_GUIDANCE: Record<
  VerificationTier,
  {
    label: string;
    trustLevel: string;
    description: string;
    pointsRange: string;
    recommendedPoints: number;
    warning?: string;
    tip?: string;
  }
> = {
  T1: {
    label: 'API Verified',
    trustLevel: 'High Trust',
    description:
      "This task is automatically verified through the platform's API. Fans must complete the action to earn points.",
    pointsRange: '50-200 points recommended',
    recommendedPoints: 50,
    tip: 'These are your most reliable tasks. Award higher points to encourage verified engagement.',
  },
  T2: {
    label: 'Code Verified',
    trustLevel: 'Medium Trust',
    description:
      'Fans receive a unique code to include in their comment or post. We verify the code was posted.',
    pointsRange: '30-85 points recommended',
    recommendedPoints: 40,
    tip: "Great for platforms where direct API verification isn't available. The code system prevents most abuse.",
  },
  T3: {
    label: 'Honor System',
    trustLevel: 'Lower Trust',
    description:
      'This task cannot be automatically verified. Fans confirm completion on the honor system.',
    pointsRange: '15-25 points recommended',
    recommendedPoints: 25,
    warning:
      "Use lower points for these tasks since they can't be verified. This helps prevent abuse.",
    tip: 'Starter pack tasks are great for onboarding, but use code-verified tasks for higher rewards.',
  },
};

/**
 * Get guidance for a specific tier
 */
export function getTierGuidance(tier: VerificationTier) {
  return TIER_GUIDANCE[tier];
}

/**
 * Task Template with verification tier information
 */
export interface TaskTemplateWithVerification {
  id: string;
  name: string;
  description: string;
  platform: string;
  taskType: string;
  category: string;
  verificationTier: VerificationTier;
  verificationMethod: VerificationMethod;
  isStarterPack?: boolean;
  isGroupGoal?: boolean;
  defaultConfig: {
    points: number;
    verificationMethod: string;
  };
  defaultPoints: number;
  isGlobal: boolean;
  isActive: boolean;
}

/**
 * Task Type Verification Mapping
 * Maps task types to their verification tier and method
 */
export const TASK_TYPE_VERIFICATION: Record<
  string,
  {
    tier: VerificationTier;
    method: VerificationMethod;
    isStarterPack?: boolean;
  }
> = {
  // ============================================================================
  // T1 - API Verified (Full Points - 100%)
  // Platforms: Spotify, YouTube (subscribe only), Discord, Twitch, Twitter, Kick, Patreon
  // ============================================================================

  // Spotify (full API access)
  spotify_follow: { tier: 'T1', method: 'api' },
  spotify_playlist: { tier: 'T1', method: 'api' },
  spotify_album: { tier: 'T1', method: 'api' },
  spotify_save_track: { tier: 'T1', method: 'api' },

  // Apple Music (full API access)
  apple_music_favorite_artist: { tier: 'T1', method: 'api' },
  apple_music_add_track: { tier: 'T1', method: 'api' },
  apple_music_add_album: { tier: 'T1', method: 'api' },
  apple_music_add_playlist: { tier: 'T1', method: 'api' },
  apple_music_listen: { tier: 'T2', method: 'manual' },

  // YouTube (only subscribe is T1 - likes/shares are T3)
  youtube_subscribe: { tier: 'T1', method: 'api' },

  // Discord (bot API access)
  discord_join: { tier: 'T1', method: 'api' },
  discord_role: { tier: 'T1', method: 'api' },
  discord_react: { tier: 'T1', method: 'api' },

  // Twitch (Helix API access)
  twitch_follow: { tier: 'T1', method: 'api' },
  twitch_subscribe: { tier: 'T1', method: 'api' },

  // Twitter/X (PAYG API access)
  twitter_follow: { tier: 'T1', method: 'api' },
  twitter_like: { tier: 'T1', method: 'api' },
  twitter_retweet: { tier: 'T1', method: 'api' },
  twitter_mention: { tier: 'T1', method: 'api' },
  twitter_include_name: { tier: 'T3', method: 'manual' },
  twitter_include_bio: { tier: 'T3', method: 'manual' },
  twitter_hashtag_post: { tier: 'T2', method: 'code_repost' },

  // Kick (new platform - T1 API access)
  kick_follow: { tier: 'T1', method: 'api' },
  kick_subscribe: { tier: 'T1', method: 'api' },
  kick_redeem_reward: { tier: 'T1', method: 'api' },

  // Patreon (new platform - T1 API access)
  patreon_support: { tier: 'T1', method: 'api' },
  patreon_tier_check: { tier: 'T1', method: 'api' },

  // ============================================================================
  // T2 - Code Verified (85% Points)
  // Tasks verified via unique code in comment or quote tweet
  // ============================================================================

  // Instagram comment/code tasks
  comment_code: { tier: 'T2', method: 'code_comment' },
  keyword_comment: { tier: 'T2', method: 'code_comment' },
  instagram_comment_code: { tier: 'T2', method: 'code_comment' },
  mention_story: { tier: 'T2', method: 'code_comment' },

  // YouTube comment with code
  youtube_comment: { tier: 'T2', method: 'code_comment' },
  youtube_comment_code: { tier: 'T2', method: 'code_comment' },

  // Facebook comment with code
  facebook_comment_post: { tier: 'T2', method: 'code_comment' },
  facebook_comment_photo: { tier: 'T2', method: 'code_comment' },
  facebook_comment_code: { tier: 'T2', method: 'code_comment' },

  // TikTok comment with code + post with hashtag
  tiktok_comment: { tier: 'T2', method: 'code_comment' },
  tiktok_comment_code: { tier: 'T2', method: 'code_comment' },
  tiktok_post: { tier: 'T2', method: 'code_repost' },

  // Twitter quote/reply with code
  twitter_quote_tweet: { tier: 'T2', method: 'code_repost' },
  twitter_reply_code: { tier: 'T2', method: 'code_comment' },

  // Discord message with code
  discord_message_code: { tier: 'T2', method: 'code_comment' },

  // Twitch chat with code (new)
  twitch_chat_code: { tier: 'T2', method: 'code_comment' },

  // Kick chat with code (new platform)
  kick_chat_code: { tier: 'T2', method: 'code_comment' },

  // ============================================================================
  // T3 - Starter Pack / Manual (50% Points)
  // Honor system tasks - one-time per platform per tenant
  // ============================================================================

  // Instagram Starter Pack
  instagram_follow: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  starter_instagram_follow: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  instagram_like_post: { tier: 'T3', method: 'manual' },

  // TikTok Starter Pack
  tiktok_follow: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  starter_tiktok_follow: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  tiktok_like: { tier: 'T3', method: 'manual' },
  tiktok_share: { tier: 'T3', method: 'manual' },
  tiktok_duet: { tier: 'T3', method: 'manual' },
  tiktok_stitch: { tier: 'T3', method: 'manual' },

  // Facebook Starter Pack
  facebook_like_page: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  starter_facebook_like: { tier: 'T3', method: 'starter_pack', isStarterPack: true },
  facebook_like_post: { tier: 'T3', method: 'manual' },
  facebook_like_photo: { tier: 'T3', method: 'manual' },
  facebook_share_post: { tier: 'T3', method: 'manual' },
  facebook_share_page: { tier: 'T3', method: 'manual' },

  // YouTube (likes/shares are T3 - no per-user API)
  youtube_like: { tier: 'T3', method: 'manual' },
  youtube_share: { tier: 'T3', method: 'manual' },

  // ============================================================================
  // Group Goals (T1 Aggregate - verified via platform metrics API)
  // ============================================================================
  group_likes: { tier: 'T1', method: 'hashtag' },
  group_views: { tier: 'T1', method: 'hashtag' },
  group_comments: { tier: 'T1', method: 'hashtag' },
  group_reactions: { tier: 'T1', method: 'hashtag' },
  group_retweets: { tier: 'T1', method: 'hashtag' },
  group_viewers: { tier: 'T1', method: 'hashtag' },
};

/**
 * Get verification info for a task type
 */
export function getTaskVerificationInfo(taskType: string): {
  tier: VerificationTier;
  method: VerificationMethod;
  isStarterPack: boolean;
} {
  const info = TASK_TYPE_VERIFICATION[taskType];
  if (info) {
    return {
      tier: info.tier,
      method: info.method,
      isStarterPack: info.isStarterPack || false,
    };
  }

  // Default to T3/manual for unknown task types
  return {
    tier: 'T3',
    method: 'manual',
    isStarterPack: false,
  };
}

// ============================================================================
// DISCORD & TWITCH PLATFORM TASK TYPES
// ============================================================================

// Add Discord and Twitch to PLATFORM_TASK_TYPES
// EXTENDED_PLATFORM_TASK_TYPES now matches PLATFORM_TASK_TYPES (which already
// includes discord and twitch with canonical names). Kept for backward compat.
export const EXTENDED_PLATFORM_TASK_TYPES = {
  ...PLATFORM_TASK_TYPES,
  discord: [
    { value: 'discord_join', label: 'Join Server', icon: 'Users', tier: 'T1' },
    { value: 'discord_role', label: 'Get Role', icon: 'Shield', tier: 'T1' },
    { value: 'discord_react', label: 'React to Message', icon: 'ThumbsUp', tier: 'T1' },
    {
      value: 'discord_message_code',
      label: 'Message with Code',
      icon: 'MessageSquare',
      tier: 'T2',
    },
  ],
  twitch: [
    { value: 'twitch_follow', label: 'Follow Channel', icon: 'UserPlus', tier: 'T1' },
    { value: 'twitch_subscribe', label: 'Subscribe', icon: 'Star', tier: 'T1' },
    { value: 'twitch_chat_code', label: 'Chat with Code', icon: 'MessageCircle', tier: 'T2' },
  ],
} as const;

// ============================================================================
// STARTER PACK TEMPLATES
// ============================================================================

/**
 * Starter Pack Templates
 * Low-friction onboarding tasks with embedded profiles.
 * One-time per platform per tenant (with campaign exception).
 */
export const STARTER_PACK_TEMPLATES: TaskTemplateWithVerification[] = [
  {
    id: 'starter-instagram-follow',
    name: 'Follow on Instagram',
    description: 'Follow the creator on Instagram to stay updated with their content',
    platform: 'instagram',
    taskType: 'starter_instagram_follow',
    category: 'starter_pack',
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    isStarterPack: true,
    defaultConfig: {
      points: 25, // 50% of typical follow task
      verificationMethod: 'starter_pack',
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'starter-tiktok-follow',
    name: 'Follow on TikTok',
    description: 'Follow the creator on TikTok to see their latest videos',
    platform: 'tiktok',
    taskType: 'starter_tiktok_follow',
    category: 'starter_pack',
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    isStarterPack: true,
    defaultConfig: {
      points: 25,
      verificationMethod: 'starter_pack',
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'starter-facebook-like',
    name: 'Like Facebook Page',
    description: "Like the creator's Facebook page for updates",
    platform: 'facebook',
    taskType: 'starter_facebook_like',
    category: 'starter_pack',
    verificationTier: 'T3',
    verificationMethod: 'starter_pack',
    isStarterPack: true,
    defaultConfig: {
      points: 25,
      verificationMethod: 'starter_pack',
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
];

// ============================================================================
// CODE VERIFICATION TEMPLATES
// ============================================================================

/**
 * Code Verification Templates
 * Tasks that require fans to include a unique code in their engagement.
 */
export const CODE_VERIFICATION_TEMPLATES: TaskTemplateWithVerification[] = [
  {
    id: 'instagram-comment-code',
    name: 'Comment with Code on Instagram',
    description: 'Leave a comment with your unique verification code',
    platform: 'instagram',
    taskType: 'instagram_comment_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    defaultConfig: {
      points: 40, // 85% of typical comment task
      verificationMethod: 'code_comment',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'tiktok-comment-code',
    name: 'Comment with Code on TikTok',
    description: 'Leave a comment with your unique verification code',
    platform: 'tiktok',
    taskType: 'tiktok_comment_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'youtube-comment-code',
    name: 'Comment with Code on YouTube',
    description: 'Leave a comment with your unique verification code',
    platform: 'youtube',
    taskType: 'youtube_comment_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'facebook-comment-code',
    name: 'Comment with Code on Facebook',
    description: 'Leave a comment with your unique verification code',
    platform: 'facebook',
    taskType: 'facebook_comment_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-quote-code',
    name: 'Quote Tweet with Code',
    description: 'Quote tweet with your unique verification code',
    platform: 'twitter',
    taskType: 'twitter_quote_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_repost',
    defaultConfig: {
      points: 85, // 85% of typical quote tweet task
      verificationMethod: 'code_repost',
    },
    defaultPoints: 85,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-reply-code',
    name: 'Reply with Code',
    description: 'Reply to a tweet with your unique verification code',
    platform: 'twitter',
    taskType: 'twitter_reply_code',
    category: 'code_verification',
    verificationTier: 'T2',
    verificationMethod: 'code_comment',
    defaultConfig: {
      points: 40,
      verificationMethod: 'code_comment',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
];

// ============================================================================
// T1 API-VERIFIED TEMPLATES
// ============================================================================

/**
 * T1 API-Verified Templates
 * Tasks with full API verification (Spotify, YouTube, Discord, Twitch, Twitter Basic)
 */
export const T1_VERIFIED_TEMPLATES: TaskTemplateWithVerification[] = [
  // Spotify
  {
    id: 'spotify-follow-artist',
    name: 'Follow Artist on Spotify',
    description: 'Follow the creator on Spotify',
    platform: 'spotify',
    taskType: 'spotify_follow',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 50,
      verificationMethod: 'api',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'spotify-follow-playlist',
    name: 'Follow Playlist on Spotify',
    description: 'Follow a specific Spotify playlist',
    platform: 'spotify',
    taskType: 'spotify_playlist',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 40,
      verificationMethod: 'api',
    },
    defaultPoints: 40,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'spotify-save-track',
    name: 'Save Track on Spotify',
    description: 'Save a specific track to your Spotify library',
    platform: 'spotify',
    taskType: 'spotify_save_track',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 30,
      verificationMethod: 'api',
    },
    defaultPoints: 30,
    isGlobal: true,
    isActive: true,
  },
  // YouTube
  {
    id: 'youtube-subscribe-t1',
    name: 'Subscribe on YouTube',
    description: "Subscribe to the creator's YouTube channel",
    platform: 'youtube',
    taskType: 'youtube_subscribe',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 100,
      verificationMethod: 'api',
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  // Discord
  {
    id: 'discord-join-server',
    name: 'Join Discord Server',
    description: "Join the creator's Discord community",
    platform: 'discord',
    taskType: 'discord_join',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 75,
      verificationMethod: 'api',
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'discord-get-role',
    name: 'Get Discord Role',
    description: 'Earn a specific role in the Discord server',
    platform: 'discord',
    taskType: 'discord_role',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 50,
      verificationMethod: 'api',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'discord-react-message',
    name: 'React to Discord Message',
    description: 'React to a specific message with an emoji',
    platform: 'discord',
    taskType: 'discord_react',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 25,
      verificationMethod: 'api',
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  // Twitch
  {
    id: 'twitch-follow-channel',
    name: 'Follow on Twitch',
    description: "Follow the creator's Twitch channel",
    platform: 'twitch',
    taskType: 'twitch_follow',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 50,
      verificationMethod: 'api',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitch-subscribe',
    name: 'Subscribe on Twitch',
    description: "Subscribe to the creator's Twitch channel (paid)",
    platform: 'twitch',
    taskType: 'twitch_subscribe',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 200,
      verificationMethod: 'api',
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },
  // Twitter (Basic tier)
  {
    id: 'twitter-follow-t1',
    name: 'Follow on X (Twitter)',
    description: 'Follow the creator on X (Twitter)',
    platform: 'twitter',
    taskType: 'twitter_follow',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 50,
      verificationMethod: 'api',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-like-t1',
    name: 'Like Tweet',
    description: 'Like a specific tweet',
    platform: 'twitter',
    taskType: 'twitter_like',
    category: 'social',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 25,
      verificationMethod: 'api',
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'twitter-retweet-t1',
    name: 'Retweet',
    description: 'Retweet a specific tweet',
    platform: 'twitter',
    taskType: 'twitter_retweet',
    category: 'social',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 75,
      verificationMethod: 'api',
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },
  // Kick
  {
    id: 'kick-follow-channel',
    name: 'Follow on Kick',
    description: "Follow the creator's Kick channel",
    platform: 'kick',
    taskType: 'kick_follow',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 50,
      verificationMethod: 'api',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'kick-subscribe',
    name: 'Subscribe on Kick',
    description: "Subscribe to the creator's Kick channel",
    platform: 'kick',
    taskType: 'kick_subscribe',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 200,
      verificationMethod: 'api',
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },
  // Patreon
  {
    id: 'patreon-become-patron',
    name: 'Become a Patron',
    description: 'Become a patron of the creator on Patreon',
    platform: 'patreon',
    taskType: 'patreon_support',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 200,
      verificationMethod: 'api',
    },
    defaultPoints: 200,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'patreon-tier-check',
    name: 'Join Patreon Tier',
    description: "Join a specific tier on the creator's Patreon",
    platform: 'patreon',
    taskType: 'patreon_tier_check',
    category: 'trust_anchor',
    verificationTier: 'T1',
    verificationMethod: 'api',
    defaultConfig: {
      points: 150,
      verificationMethod: 'api',
    },
    defaultPoints: 150,
    isGlobal: true,
    isActive: true,
  },
];

// ============================================================================
// GROUP GOAL TEMPLATES
// ============================================================================

/**
 * Group Goal Templates
 * Community goals where everyone enrolled is rewarded when the goal is met.
 */
export const GROUP_GOAL_TEMPLATES: TaskTemplateWithVerification[] = [
  {
    id: 'group-instagram-likes',
    name: 'Help Post Reach X Likes',
    description: 'Everyone enrolled gets rewarded when the post reaches the like goal',
    platform: 'instagram',
    taskType: 'group_likes',
    category: 'group_goal',
    verificationTier: 'T2',
    verificationMethod: 'hashtag',
    isGroupGoal: true,
    defaultConfig: {
      points: 50,
      verificationMethod: 'hashtag',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'group-youtube-views',
    name: 'Help Video Reach X Views',
    description: 'Everyone enrolled gets rewarded when the video reaches the view goal',
    platform: 'youtube',
    taskType: 'group_views',
    category: 'group_goal',
    verificationTier: 'T2',
    verificationMethod: 'hashtag',
    isGroupGoal: true,
    defaultConfig: {
      points: 50,
      verificationMethod: 'hashtag',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'group-tiktok-views',
    name: 'Help TikTok Reach X Views',
    description: 'Everyone enrolled gets rewarded when the video reaches the view goal',
    platform: 'tiktok',
    taskType: 'group_views',
    category: 'group_goal',
    verificationTier: 'T2',
    verificationMethod: 'hashtag',
    isGroupGoal: true,
    defaultConfig: {
      points: 50,
      verificationMethod: 'hashtag',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: 'group-twitter-retweets',
    name: 'Help Tweet Reach X Retweets',
    description: 'Everyone enrolled gets rewarded when the tweet reaches the retweet goal',
    platform: 'twitter',
    taskType: 'group_retweets',
    category: 'group_goal',
    verificationTier: 'T2',
    verificationMethod: 'hashtag',
    isGroupGoal: true,
    defaultConfig: {
      points: 50,
      verificationMethod: 'hashtag',
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
];

// ============================================================================
// COMBINED TEMPLATES WITH VERIFICATION
// ============================================================================

/**
 * All templates combined with verification information
 */
export const ALL_VERIFIED_TEMPLATES: TaskTemplateWithVerification[] = [
  ...T1_VERIFIED_TEMPLATES,
  ...CODE_VERIFICATION_TEMPLATES,
  ...STARTER_PACK_TEMPLATES,
  ...GROUP_GOAL_TEMPLATES,
];
