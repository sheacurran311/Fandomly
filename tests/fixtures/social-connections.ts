/**
 * Social Connection Test Fixtures
 * 
 * Sample social connection data for testing OAuth flows
 * and social verification logic.
 */

const baseConnection = {
  userId: 'test-fan-user-1',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const twitterConnection = {
  ...baseConnection,
  id: 'test-connection-twitter',
  platform: 'twitter' as const,
  platformUserId: 'twitter-123456789',
  platformUsername: 'testfan',
  displayName: 'Test Fan',
  accessToken: 'mock-twitter-access-token',
  refreshToken: 'mock-twitter-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  profileUrl: 'https://twitter.com/testfan',
  profileImageUrl: 'https://pbs.twimg.com/profile_images/mock.jpg',
  metadata: {
    followersCount: 1500,
    followingCount: 500,
  },
};

export const youtubeConnection = {
  ...baseConnection,
  id: 'test-connection-youtube',
  platform: 'youtube' as const,
  platformUserId: 'youtube-UC123456789',
  platformUsername: 'Test Fan Channel',
  displayName: 'Test Fan',
  accessToken: 'mock-youtube-access-token',
  refreshToken: 'mock-youtube-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
  profileUrl: 'https://youtube.com/channel/UC123456789',
  profileImageUrl: 'https://yt3.ggpht.com/mock.jpg',
  metadata: {
    subscriberCount: 10000,
  },
};

export const spotifyConnection = {
  ...baseConnection,
  id: 'test-connection-spotify',
  platform: 'spotify' as const,
  platformUserId: 'spotify-user123',
  platformUsername: 'testfan',
  displayName: 'Test Fan',
  accessToken: 'mock-spotify-access-token',
  refreshToken: 'mock-spotify-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
  profileUrl: 'https://open.spotify.com/user/testfan',
  profileImageUrl: null,
  metadata: {
    product: 'premium',
  },
};

export const instagramConnection = {
  ...baseConnection,
  id: 'test-connection-instagram',
  platform: 'instagram' as const,
  platformUserId: 'instagram-123456789',
  platformUsername: 'testfan',
  displayName: 'Test Fan',
  accessToken: 'mock-instagram-access-token',
  refreshToken: null, // Instagram doesn't always provide refresh tokens
  tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
  profileUrl: 'https://instagram.com/testfan',
  profileImageUrl: 'https://instagram.com/mock.jpg',
  metadata: {
    followersCount: 2500,
    mediaCount: 150,
  },
};

export const tiktokConnection = {
  ...baseConnection,
  id: 'test-connection-tiktok',
  platform: 'tiktok' as const,
  platformUserId: 'tiktok-123456789',
  platformUsername: 'testfan',
  displayName: 'Test Fan',
  accessToken: 'mock-tiktok-access-token',
  refreshToken: 'mock-tiktok-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  profileUrl: 'https://tiktok.com/@testfan',
  profileImageUrl: 'https://tiktok.com/mock.jpg',
  metadata: {
    followersCount: 5000,
    likesCount: 50000,
  },
};

export const discordConnection = {
  ...baseConnection,
  id: 'test-connection-discord',
  platform: 'discord' as const,
  platformUserId: 'discord-123456789',
  platformUsername: 'testfan#1234',
  displayName: 'Test Fan',
  accessToken: 'mock-discord-access-token',
  refreshToken: 'mock-discord-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  profileUrl: null,
  profileImageUrl: 'https://cdn.discordapp.com/avatars/mock.png',
  metadata: {
    guilds: ['guild-1', 'guild-2'],
  },
};

export const twitchConnection = {
  ...baseConnection,
  id: 'test-connection-twitch',
  platform: 'twitch' as const,
  platformUserId: 'twitch-123456789',
  platformUsername: 'testfan',
  displayName: 'Test Fan',
  accessToken: 'mock-twitch-access-token',
  refreshToken: 'mock-twitch-refresh-token',
  tokenExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
  profileUrl: 'https://twitch.tv/testfan',
  profileImageUrl: 'https://static-cdn.jtvnw.net/mock.png',
  metadata: {
    broadcasterType: 'affiliate',
  },
};

export const expiredTwitterConnection = {
  ...twitterConnection,
  id: 'test-connection-twitter-expired',
  tokenExpiresAt: new Date(Date.now() - 1000), // Already expired
};

export const inactiveConnection = {
  ...twitterConnection,
  id: 'test-connection-inactive',
  isActive: false,
};

// Creator's social connections (for verification targets)
export const creatorTwitterConnection = {
  ...twitterConnection,
  id: 'test-creator-connection-twitter',
  userId: 'test-creator-user-1',
  platformUserId: 'twitter-creator-123',
  platformUsername: 'testcreator',
};

export const allSocialConnectionFixtures = [
  twitterConnection,
  youtubeConnection,
  spotifyConnection,
  instagramConnection,
  tiktokConnection,
  discordConnection,
  twitchConnection,
  expiredTwitterConnection,
  inactiveConnection,
  creatorTwitterConnection,
];

// Verification test scenarios
export const verificationScenarios = {
  // Twitter follow: Fan follows creator
  twitterFollow: {
    fanConnection: twitterConnection,
    creatorConnection: creatorTwitterConnection,
    taskSettings: {
      username: 'testcreator',
      userId: 'twitter-creator-123',
    },
    expectedResult: {
      verified: true,
      message: 'Twitter follow verified',
    },
  },
  
  // Twitter like: Fan liked a specific tweet
  twitterLike: {
    fanConnection: twitterConnection,
    tweetId: '123456789',
    taskSettings: {
      contentUrl: 'https://twitter.com/testcreator/status/123456789',
      contentId: '123456789',
    },
    expectedResult: {
      verified: true,
      message: 'Twitter like verified',
    },
  },
  
  // Expired token scenario
  expiredToken: {
    fanConnection: expiredTwitterConnection,
    expectedResult: {
      verified: false,
      error: 'TOKEN_EXPIRED',
      message: 'Twitter token expired. Please reconnect.',
    },
  },
  
  // No connection scenario
  noConnection: {
    fanConnection: null,
    expectedResult: {
      verified: false,
      error: 'NO_CONNECTION',
      message: 'Twitter account not connected',
    },
  },
};
