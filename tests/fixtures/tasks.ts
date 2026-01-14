/**
 * Task Test Fixtures
 * 
 * Sample task data for testing task CRUD operations,
 * task builder flows, and verification logic.
 * Covers all 20+ task types across platforms.
 */

// Base task structure
const baseTask = {
  tenantId: 'test-tenant-1',
  creatorId: 'test-creator-1',
  programId: 'test-program-1',
  campaignId: 'test-campaign-1',
  ownershipLevel: 'creator' as const,
  section: 'social_engagement' as const,
  pointsToReward: 100,
  rewardType: 'points' as const,
  isActive: true,
  isRequired: false,
  hideFromUI: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// Twitter Tasks
export const twitterFollowTask = {
  ...baseTask,
  id: 'test-task-twitter-follow',
  name: 'Follow us on Twitter',
  description: 'Follow our Twitter account to earn points',
  taskType: 'twitter_follow' as const,
  platform: 'twitter' as const,
  customSettings: {
    username: 'testaccount',
    userId: '123456789',
    verificationMethod: 'api',
  },
};

export const twitterLikeTask = {
  ...baseTask,
  id: 'test-task-twitter-like',
  name: 'Like our tweet',
  description: 'Like our latest tweet',
  taskType: 'twitter_like' as const,
  platform: 'twitter' as const,
  customSettings: {
    contentUrl: 'https://twitter.com/testaccount/status/123456789',
    contentId: '123456789',
    verificationMethod: 'api',
  },
};

export const twitterRetweetTask = {
  ...baseTask,
  id: 'test-task-twitter-retweet',
  name: 'Retweet our post',
  description: 'Retweet our latest announcement',
  taskType: 'twitter_retweet' as const,
  platform: 'twitter' as const,
  customSettings: {
    contentUrl: 'https://twitter.com/testaccount/status/123456789',
    contentId: '123456789',
    verificationMethod: 'api',
  },
};

// YouTube Tasks
export const youtubeSubscribeTask = {
  ...baseTask,
  id: 'test-task-youtube-subscribe',
  name: 'Subscribe to our channel',
  description: 'Subscribe to our YouTube channel',
  taskType: 'youtube_subscribe' as const,
  platform: 'youtube' as const,
  customSettings: {
    channelUrl: 'https://youtube.com/channel/UC123456789',
    channelId: 'UC123456789',
    verificationMethod: 'api',
  },
};

export const youtubeLikeTask = {
  ...baseTask,
  id: 'test-task-youtube-like',
  name: 'Like our video',
  description: 'Like our latest video',
  taskType: 'youtube_like' as const,
  platform: 'youtube' as const,
  customSettings: {
    contentUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    verificationMethod: 'api',
  },
};

// Spotify Tasks
export const spotifyFollowTask = {
  ...baseTask,
  id: 'test-task-spotify-follow',
  name: 'Follow us on Spotify',
  description: 'Follow our artist profile',
  taskType: 'spotify_follow' as const,
  platform: 'spotify' as const,
  customSettings: {
    artistUrl: 'https://open.spotify.com/artist/6eUKZXaKkcviH0Ku9w2n3V',
    artistId: '6eUKZXaKkcviH0Ku9w2n3V',
    verificationMethod: 'api',
  },
};

export const spotifyPlaylistTask = {
  ...baseTask,
  id: 'test-task-spotify-playlist',
  name: 'Follow our playlist',
  description: 'Follow our curated playlist',
  taskType: 'spotify_playlist' as const,
  platform: 'spotify' as const,
  customSettings: {
    playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    playlistId: '37i9dQZF1DXcBWIGoYBM5M',
    verificationMethod: 'api',
  },
};

// Instagram Tasks
export const instagramFollowTask = {
  ...baseTask,
  id: 'test-task-instagram-follow',
  name: 'Follow us on Instagram',
  description: 'Follow our Instagram account',
  taskType: 'instagram_follow' as const,
  platform: 'instagram' as const,
  customSettings: {
    username: 'testaccount',
    verificationMethod: 'smart_detection',
  },
};

// TikTok Tasks
export const tiktokFollowTask = {
  ...baseTask,
  id: 'test-task-tiktok-follow',
  name: 'Follow us on TikTok',
  description: 'Follow our TikTok account',
  taskType: 'tiktok_follow' as const,
  platform: 'tiktok' as const,
  customSettings: {
    username: 'testaccount',
    verificationMethod: 'smart_detection',
  },
};

// Facebook Tasks
export const facebookLikePageTask = {
  ...baseTask,
  id: 'test-task-facebook-like-page',
  name: 'Like our Facebook page',
  description: 'Like our Facebook page',
  taskType: 'facebook_like_page' as const,
  platform: 'facebook' as const,
  customSettings: {
    pageUrl: 'https://facebook.com/testpage',
    pageId: '123456789',
    verificationMethod: 'manual',
  },
};

// Discord Tasks
export const discordJoinTask = {
  ...baseTask,
  id: 'test-task-discord-join',
  name: 'Join our Discord',
  description: 'Join our Discord server',
  taskType: 'discord_join' as const,
  platform: 'discord' as const,
  customSettings: {
    serverInviteUrl: 'https://discord.gg/testserver',
    serverId: '123456789',
    verificationMethod: 'api',
  },
};

// Twitch Tasks
export const twitchFollowTask = {
  ...baseTask,
  id: 'test-task-twitch-follow',
  name: 'Follow us on Twitch',
  description: 'Follow our Twitch channel',
  taskType: 'twitch_follow' as const,
  platform: 'twitch' as const,
  customSettings: {
    channelName: 'testchannel',
    channelId: '123456789',
    verificationMethod: 'api',
  },
};

// Interactive Tasks
export const checkInTask = {
  ...baseTask,
  id: 'test-task-check-in',
  name: 'Daily Check-in',
  description: 'Check in daily to earn points',
  taskType: 'check_in' as const,
  platform: 'internal' as const,
  section: 'engagement' as const,
  customSettings: {
    frequency: 'daily',
  },
};

export const websiteVisitTask = {
  ...baseTask,
  id: 'test-task-website-visit',
  name: 'Visit our website',
  description: 'Visit our official website',
  taskType: 'website_visit' as const,
  platform: 'internal' as const,
  customSettings: {
    targetUrl: 'https://example.com',
    minTimeOnPage: 30,
  },
};

export const pollTask = {
  ...baseTask,
  id: 'test-task-poll',
  name: 'Answer our poll',
  description: 'Share your opinion in our poll',
  taskType: 'poll' as const,
  platform: 'internal' as const,
  customSettings: {
    question: 'What is your favorite feature?',
    options: ['Feature A', 'Feature B', 'Feature C'],
  },
};

export const quizTask = {
  ...baseTask,
  id: 'test-task-quiz',
  name: 'Take our quiz',
  description: 'Test your knowledge',
  taskType: 'quiz' as const,
  platform: 'internal' as const,
  customSettings: {
    questions: [
      {
        question: 'What year was the company founded?',
        options: ['2020', '2021', '2022', '2023'],
        correctAnswer: 1,
      },
    ],
    passingScore: 80,
  },
};

export const referralTask = {
  ...baseTask,
  id: 'test-task-referral',
  name: 'Refer a friend',
  description: 'Invite friends and earn rewards',
  taskType: 'referral' as const,
  platform: 'internal' as const,
  section: 'community_building' as const,
  customSettings: {
    pointsPerReferral: 500,
    maxReferrals: 10,
  },
};

// Task create/update payloads
export const taskCreatePayload = {
  name: 'New Test Task',
  description: 'Created via test automation',
  taskType: 'twitter_follow',
  platform: 'twitter',
  pointsToReward: 100,
  customSettings: {
    username: 'newaccount',
    verificationMethod: 'api',
  },
};

export const taskUpdatePayload = {
  name: 'Updated Task Name',
  description: 'Updated description',
  pointsToReward: 150,
};

// All task fixtures grouped by platform
export const twitterTasks = [twitterFollowTask, twitterLikeTask, twitterRetweetTask];
export const youtubeTasks = [youtubeSubscribeTask, youtubeLikeTask];
export const spotifyTasks = [spotifyFollowTask, spotifyPlaylistTask];
export const instagramTasks = [instagramFollowTask];
export const tiktokTasks = [tiktokFollowTask];
export const facebookTasks = [facebookLikePageTask];
export const discordTasks = [discordJoinTask];
export const twitchTasks = [twitchFollowTask];
export const interactiveTasks = [checkInTask, websiteVisitTask, pollTask, quizTask, referralTask];

export const allTaskFixtures = [
  ...twitterTasks,
  ...youtubeTasks,
  ...spotifyTasks,
  ...instagramTasks,
  ...tiktokTasks,
  ...facebookTasks,
  ...discordTasks,
  ...twitchTasks,
  ...interactiveTasks,
];
