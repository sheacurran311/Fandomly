import { z } from "zod";

// Platform-specific task configuration schemas
export const twitterTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("twitter_follow"),
    handle: z.string().min(1, "Twitter handle is required"),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_mention"),
    username: z.string().min(1, "Username to mention is required"),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_retweet"),
    tweetUrl: z.string().url("Valid tweet URL is required"),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_like"),
    tweetUrl: z.string().url("Valid tweet URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_include_name"),
    requiredText: z.string().min(1, "Required text is needed"),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_include_bio"),
    requiredText: z.string().min(1, "Required text is needed"),
    points: z.number().min(1).default(200),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("twitter_hashtag_post"),
    hashtags: z.array(z.string()).min(1, "At least one hashtag required"),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

export const facebookTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("facebook_like_page"),
    pageId: z.string().min(1, "Facebook page ID is required"),
    pageName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_like_photo"),
    postUrl: z.string().url("Valid Facebook photo URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_like_post"),
    postUrl: z.string().url("Valid Facebook post URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_share_post"),
    postUrl: z.string().url("Valid Facebook post URL is required"),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_share_page"),
    pageId: z.string().min(1, "Facebook page ID is required"),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_comment_post"),
    postUrl: z.string().url("Valid Facebook post URL is required"),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("facebook_comment_photo"),
    postUrl: z.string().url("Valid Facebook photo URL is required"),
    requiredText: z.string().optional(),
    points: z.number().min(1).default(150),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

export const instagramTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("instagram_follow"),
    username: z.string().min(1, "Instagram username is required"),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("instagram_like_post"),
    postUrl: z.string().url("Valid Instagram post URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

export const youtubeTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("youtube_like"),
    videoUrl: z.string().url("Valid YouTube video URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("youtube_subscribe"),
    channelUrl: z.string().url("Valid YouTube channel URL is required"),
    channelName: z.string().optional(),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("youtube_share"),
    videoUrl: z.string().url("Valid YouTube video URL is required"),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

export const tiktokTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("tiktok_follow"),
    username: z.string().min(1, "TikTok username is required"),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("tiktok_like"),
    videoUrl: z.string().url("Valid TikTok video URL is required"),
    points: z.number().min(1).default(25),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("tiktok_share"),
    videoUrl: z.string().url("Valid TikTok video URL is required"),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

export const spotifyTaskSchema = z.discriminatedUnion("taskType", [
  z.object({
    taskType: z.literal("spotify_follow"),
    artistId: z.string().min(1, "Spotify artist ID is required"),
    artistName: z.string().optional(),
    points: z.number().min(1).default(50),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("spotify_playlist"),
    playlistUrl: z.string().url("Valid Spotify playlist URL is required"),
    playlistName: z.string().optional(),
    points: z.number().min(1).default(75),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
  z.object({
    taskType: z.literal("spotify_album"),
    albumUrl: z.string().url("Valid Spotify album URL is required"),
    albumName: z.string().optional(),
    points: z.number().min(1).default(100),
    verificationMethod: z.enum(["manual", "automatic"]).default("manual"),
  }),
]);

// Core task template catalog - Global templates available to all creators
export const CORE_TASK_TEMPLATES = [
  // Twitter/X Templates
  {
    id: "twitter-follow",
    name: "Follow on X (Twitter)",
    description: "Fans follow your X/Twitter account",
    platform: "twitter" as const,
    taskType: "twitter_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "twitter-retweet",
    name: "Retweet Post",
    description: "Fans retweet a specific post",
    platform: "twitter" as const,
    taskType: "twitter_retweet" as const,
    category: "social",
    defaultConfig: {
      points: 100,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "twitter-mention",
    name: "Mention in Post",
    description: "Fans mention you in their posts",
    platform: "twitter" as const,
    taskType: "twitter_mention" as const,
    category: "social",
    defaultConfig: {
      points: 75,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },

  // Facebook Templates
  {
    id: "facebook-like-page",
    name: "Like Facebook Page",
    description: "Fans like your Facebook page",
    platform: "facebook" as const,
    taskType: "facebook_like_page" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "facebook-like-post",
    name: "Like Facebook Post",
    description: "Fans like a specific Facebook post",
    platform: "facebook" as const,
    taskType: "facebook_like_post" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "facebook-share-post",
    name: "Share Facebook Post",
    description: "Fans share a specific Facebook post",
    platform: "facebook" as const,
    taskType: "facebook_share_post" as const,
    category: "social",
    defaultConfig: {
      points: 100,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },

  // Instagram Templates
  {
    id: "instagram-follow",
    name: "Follow on Instagram",
    description: "Fans follow your Instagram account",
    platform: "instagram" as const,
    taskType: "instagram_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "instagram-like-post",
    name: "Like Instagram Post",
    description: "Fans like a specific Instagram post",
    platform: "instagram" as const,
    taskType: "instagram_like_post" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // YouTube Templates
  {
    id: "youtube-subscribe",
    name: "Subscribe on YouTube",
    description: "Fans subscribe to your YouTube channel",
    platform: "youtube" as const,
    taskType: "youtube_subscribe" as const,
    category: "social",
    defaultConfig: {
      points: 100,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "youtube-like",
    name: "Like YouTube Video",
    description: "Fans like a specific YouTube video",
    platform: "youtube" as const,
    taskType: "youtube_like" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // TikTok Templates
  {
    id: "tiktok-follow",
    name: "Follow on TikTok",
    description: "Fans follow your TikTok account",
    platform: "tiktok" as const,
    taskType: "tiktok_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },

  // Spotify Templates  
  {
    id: "spotify-follow",
    name: "Follow on Spotify",
    description: "Fans follow your Spotify artist profile",
    platform: "spotify" as const,
    taskType: "spotify_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "spotify-playlist",
    name: "Follow Spotify Playlist",
    description: "Fans follow a specific Spotify playlist",
    platform: "spotify" as const,
    taskType: "spotify_playlist" as const,
    category: "social",
    defaultConfig: {
      points: 75,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 75,
    isGlobal: true,
    isActive: true,
  },

  // Additional Facebook Templates
  {
    id: "facebook-follow",
    name: "Follow on Facebook",
    description: "Fans like your Facebook page",
    platform: "facebook" as const,
    taskType: "facebook_like_page" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "facebook-like",
    name: "Like Facebook Post",
    description: "Fans like a specific Facebook post",
    platform: "facebook" as const,
    taskType: "facebook_like_post" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // Additional Instagram Templates
  {
    id: "instagram-follow",
    name: "Follow on Instagram",
    description: "Fans follow your Instagram account",
    platform: "instagram" as const,
    taskType: "instagram_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "instagram-like",
    name: "Like Instagram Post",
    description: "Fans like a specific Instagram post",
    platform: "instagram" as const,
    taskType: "instagram_like_post" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // Additional YouTube Templates
  {
    id: "youtube-subscribe",
    name: "Subscribe on YouTube",
    description: "Fans subscribe to your YouTube channel",
    platform: "youtube" as const,
    taskType: "youtube_subscribe" as const,
    category: "social",
    defaultConfig: {
      points: 100,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 100,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "youtube-like",
    name: "Like YouTube Video",
    description: "Fans like a specific YouTube video",
    platform: "youtube" as const,
    taskType: "youtube_like" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },

  // TikTok Templates
  {
    id: "tiktok-follow",
    name: "Follow on TikTok",
    description: "Fans follow your TikTok account",
    platform: "tiktok" as const,
    taskType: "tiktok_follow" as const,
    category: "social",
    defaultConfig: {
      points: 50,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 50,
    isGlobal: true,
    isActive: true,
  },
  {
    id: "tiktok-like",
    name: "Like TikTok Video",
    description: "Fans like a specific TikTok video",
    platform: "tiktok" as const,
    taskType: "tiktok_like" as const,
    category: "social",
    defaultConfig: {
      points: 25,
      verificationMethod: "manual" as const,
    },
    defaultPoints: 25,
    isGlobal: true,
    isActive: true,
  },
] as const;

// Platform-to-task-types mapping for UI
export const PLATFORM_TASK_TYPES = {
  twitter: [
    { value: "follow", label: "Follow Account", icon: "UserPlus" },
    { value: "mention", label: "Mention in Post", icon: "AtSign" },
    { value: "retweet", label: "Retweet", icon: "Repeat" },
    { value: "like", label: "Like Tweet", icon: "Heart" },
    { value: "include_in_name", label: "Include in Name", icon: "User" },
    { value: "include_in_bio", label: "Include in Bio", icon: "FileText" },
    { value: "hashtag_post", label: "Post with Hashtag", icon: "Hash" },
  ],
  facebook: [
    { value: "like_page", label: "Like Page", icon: "ThumbsUp" },
    { value: "like_photo", label: "Like Photo", icon: "Image" },
    { value: "like_post", label: "Like Post", icon: "ThumbsUp" },
    { value: "share_post", label: "Share Post", icon: "Share" },
    { value: "share_page", label: "Share Page", icon: "Share2" },
    { value: "comment_post", label: "Comment on Post", icon: "MessageCircle" },
    { value: "comment_photo", label: "Comment on Photo", icon: "MessageSquare" },
  ],
  instagram: [
    { value: "instagram_follow", label: "Follow Account", icon: "UserPlus" },
    { value: "instagram_like_post", label: "Like Post", icon: "Heart" },
  ],
  youtube: [
    { value: "youtube_like", label: "Like Video", icon: "ThumbsUp" },
    { value: "youtube_subscribe", label: "Subscribe", icon: "Bell" },
    { value: "youtube_share", label: "Share Video", icon: "Share" },
  ],
  tiktok: [
    { value: "tiktok_follow", label: "Follow Account", icon: "UserPlus" },
    { value: "tiktok_like", label: "Like Video", icon: "Heart" },
    { value: "tiktok_share", label: "Share Video", icon: "Share" },
  ],
  spotify: [
    { value: "spotify_follow", label: "Follow Artist", icon: "UserPlus" },
    { value: "playlist", label: "Follow Playlist", icon: "Music" },
    { value: "album", label: "Save Album", icon: "Disc" },
  ],
} as const;

// Export types for platform-specific schemas
export type TwitterTaskConfig = z.infer<typeof twitterTaskSchema>;
export type FacebookTaskConfig = z.infer<typeof facebookTaskSchema>;
export type InstagramTaskConfig = z.infer<typeof instagramTaskSchema>;
export type YouTubeTaskConfig = z.infer<typeof youtubeTaskSchema>;
export type TikTokTaskConfig = z.infer<typeof tiktokTaskSchema>;
export type SpotifyTaskConfig = z.infer<typeof spotifyTaskSchema>;

// Union type for all platform configs
export type PlatformTaskConfig = 
  | TwitterTaskConfig 
  | FacebookTaskConfig 
  | InstagramTaskConfig 
  | YouTubeTaskConfig 
  | TikTokTaskConfig 
  | SpotifyTaskConfig;