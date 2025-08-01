// Social Media Integration APIs

export interface SocialMediaAccount {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'spotify';
  username: string;
  displayName: string;
  profileUrl: string;
  followers: number;
  verified: boolean;
  profileImage: string;
  accessToken?: string;
  refreshToken?: string;
  connectedAt: Date;
}

export interface SocialMediaMetrics {
  platform: string;
  followers: number;
  following: number;
  posts: number;
  engagement: number;
  averageLikes: number;
  averageComments: number;
  recentGrowth: number;
}

// Instagram Basic Display API
export class InstagramAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}/auth/instagram/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state: 'instagram_auth'
    });
    
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/instagram/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
    });
    
    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username,media_count&access_token=${accessToken}`);
    const data = await response.json();
    
    return {
      platform: 'instagram',
      username: data.username,
      displayName: data.username,
      profileUrl: `https://instagram.com/${data.username}`,
      followers: 0, // Would need Instagram Graph API for follower count
      verified: false,
      profileImage: '',
      accessToken,
      connectedAt: new Date()
    };
  }
}

// TikTok Login Kit API
export class TikTokAPI {
  private clientKey: string;
  private redirectUri: string;

  constructor() {
    this.clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY || '';
    this.redirectUri = `${window.location.origin}/auth/tiktok/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: 'user.info.basic,user.info.stats',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: 'tiktok_auth'
    });
    
    return `https://www.tiktok.com/auth/authorize/?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/tiktok/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('/api/social/tiktok/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    
    return {
      platform: 'tiktok',
      username: data.data.user.username,
      displayName: data.data.user.display_name,
      profileUrl: `https://tiktok.com/@${data.data.user.username}`,
      followers: data.data.user.follower_count,
      verified: data.data.user.is_verified,
      profileImage: data.data.user.avatar_url,
      accessToken,
      connectedAt: new Date()
    };
  }
}

// Twitter API v2
export class TwitterAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_TWITTER_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}/auth/twitter/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read users.read follows.read',
      state: 'twitter_auth',
      code_challenge: 'challenge',
      code_challenge_method: 'plain'
    });
    
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/twitter/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('/api/social/twitter/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    
    return {
      platform: 'twitter',
      username: data.data.username,
      displayName: data.data.name,
      profileUrl: `https://twitter.com/${data.data.username}`,
      followers: data.data.public_metrics.followers_count,
      verified: data.data.verified,
      profileImage: data.data.profile_image_url,
      accessToken,
      connectedAt: new Date()
    };
  }
}

// YouTube Data API v3
export class YouTubeAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}/auth/youtube/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      state: 'youtube_auth'
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/youtube/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&access_token=${accessToken}`);
    const data = await response.json();
    
    const channel = data.items[0];
    
    return {
      platform: 'youtube',
      username: channel.snippet.customUrl || channel.id,
      displayName: channel.snippet.title,
      profileUrl: `https://youtube.com/channel/${channel.id}`,
      followers: parseInt(channel.statistics.subscriberCount),
      verified: false,
      profileImage: channel.snippet.thumbnails.default.url,
      accessToken,
      connectedAt: new Date()
    };
  }
}

// Spotify Web API
export class SpotifyAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}/auth/spotify/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'user-read-private user-read-email user-follow-read',
      redirect_uri: this.redirectUri,
      state: 'spotify_auth'
    });
    
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/spotify/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    
    return {
      platform: 'spotify',
      username: data.id,
      displayName: data.display_name,
      profileUrl: data.external_urls.spotify,
      followers: data.followers.total,
      verified: false,
      profileImage: data.images[0]?.url || '',
      accessToken,
      connectedAt: new Date()
    };
  }
}

// Social Integration Manager
export class SocialIntegrationManager {
  private instagram: InstagramAPI;
  private tiktok: TikTokAPI;
  private twitter: TwitterAPI;
  private youtube: YouTubeAPI;
  private spotify: SpotifyAPI;

  constructor() {
    this.instagram = new InstagramAPI();
    this.tiktok = new TikTokAPI();
    this.twitter = new TwitterAPI();
    this.youtube = new YouTubeAPI();
    this.spotify = new SpotifyAPI();
  }

  getAuthUrl(platform: string): string {
    switch (platform) {
      case 'instagram': return this.instagram.getAuthUrl();
      case 'tiktok': return this.tiktok.getAuthUrl();
      case 'twitter': return this.twitter.getAuthUrl();
      case 'youtube': return this.youtube.getAuthUrl();
      case 'spotify': return this.spotify.getAuthUrl();
      default: throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async connectAccount(platform: string, code: string): Promise<SocialMediaAccount> {
    let accessToken: string;
    
    switch (platform) {
      case 'instagram':
        accessToken = await this.instagram.exchangeCodeForToken(code);
        return this.instagram.getUserProfile(accessToken);
      case 'tiktok':
        accessToken = await this.tiktok.exchangeCodeForToken(code);
        return this.tiktok.getUserProfile(accessToken);
      case 'twitter':
        accessToken = await this.twitter.exchangeCodeForToken(code);
        return this.twitter.getUserProfile(accessToken);
      case 'youtube':
        accessToken = await this.youtube.exchangeCodeForToken(code);
        return this.youtube.getUserProfile(accessToken);
      case 'spotify':
        accessToken = await this.spotify.exchangeCodeForToken(code);
        return this.spotify.getUserProfile(accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async refreshMetrics(accounts: SocialMediaAccount[]): Promise<SocialMediaMetrics[]> {
    const metrics: SocialMediaMetrics[] = [];
    
    for (const account of accounts) {
      if (account.accessToken) {
        try {
          // Refresh user data to get latest metrics
          const updatedAccount = await this.refreshAccountData(account);
          
          metrics.push({
            platform: account.platform,
            followers: updatedAccount.followers,
            following: 0, // Would need specific API calls
            posts: 0, // Would need specific API calls
            engagement: 0, // Would need to calculate from recent posts
            averageLikes: 0,
            averageComments: 0,
            recentGrowth: 0
          });
        } catch (error) {
          console.error(`Failed to refresh metrics for ${account.platform}:`, error);
        }
      }
    }
    
    return metrics;
  }

  private async refreshAccountData(account: SocialMediaAccount): Promise<SocialMediaAccount> {
    if (!account.accessToken) throw new Error('No access token available');
    
    switch (account.platform) {
      case 'instagram': return this.instagram.getUserProfile(account.accessToken);
      case 'tiktok': return this.tiktok.getUserProfile(account.accessToken);
      case 'twitter': return this.twitter.getUserProfile(account.accessToken);
      case 'youtube': return this.youtube.getUserProfile(account.accessToken);
      case 'spotify': return this.spotify.getUserProfile(account.accessToken);
      default: return account;
    }
  }
}

export const socialManager = new SocialIntegrationManager();