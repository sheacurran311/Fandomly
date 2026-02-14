// Social Media Integration APIs
import FacebookSDK, { type FacebookUser, type FacebookPage } from './facebook';
import { saveSocialConnection } from './auth-redirect';
import { invalidateSocialConnections } from '@/hooks/use-social-connections';

export interface SocialMediaAccount {
  platform: 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'spotify' | 'discord' | 'twitch';
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

// Facebook Graph API
export class FacebookAPI {
  async connectAccount(): Promise<SocialMediaAccount | null> {
    try {
      const loginResult = await FacebookSDK.login('email,public_profile,pages_show_list,pages_read_engagement');
      
      if (!loginResult.success || !loginResult.accessToken) {
        return null;
      }

      const userInfo = await FacebookSDK.getUserInfo(loginResult.accessToken);
      if (!userInfo) {
        return null;
      }

      // Get pages to determine follower count
      const pages = await FacebookSDK.getUserPages(loginResult.accessToken);
      let totalFollowers = 0;
      
      // Sum followers from all connected pages
      for (const page of pages) {
        const followers = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
        totalFollowers += Number(followers || 0);
      }

      return {
        platform: 'facebook',
        username: userInfo.name,
        displayName: userInfo.name,
        profileUrl: `https://facebook.com/${userInfo.id}`,
        followers: totalFollowers,
        verified: false,
        profileImage: userInfo.picture?.data.url || '',
        accessToken: loginResult.accessToken,
        connectedAt: new Date()
      };
    } catch (error) {
      console.error('Facebook connection error:', error);
      return null;
    }
  }

  async getPages(accessToken: string): Promise<FacebookPage[]> {
    return await FacebookSDK.getUserPages(accessToken);
  }

  async refreshFollowerCount(accessToken: string): Promise<number> {
    const pages = await FacebookSDK.getUserPages(accessToken);
    let totalFollowers = 0;
    
    for (const page of pages) {
      const followers = await FacebookSDK.getPageFollowerCount(page.id, page.access_token);
      totalFollowers += Number(followers || 0);
    }
    
    return totalFollowers;
  }
}

// Instagram API -- delegates to InstagramSDKManager for all auth
// Only creator/business auth is supported
export class InstagramAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    // Use the same creator app ID as InstagramSDKManager
    this.clientId = import.meta.env.VITE_INSTAGRAM_CREATOR_APP_ID || '1157911489578561';
    this.redirectUri = `${window.location.origin}/instagram-callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights',
      response_type: 'code',
      state: `instagram_creator_${Date.now()}`
    });
    
    return `https://www.instagram.com/oauth/authorize?${params}`;
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

  async secureLogin(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const authUrl = this.getAuthUrl();
        const popup = window.open(authUrl, 'instagram-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }
        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };
        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'instagram-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          const result = event.data.result;
          if (result?.success && result?.connectionData) {
            try {
              const saveResult = await saveSocialConnection(result.connectionData);
              invalidateSocialConnections();
              resolve(saveResult.success ? { success: true } : { success: false, error: saveResult.error });
            } catch (e) {
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(result?.success ? { success: true } : { success: false, error: result?.error || 'Connection failed' });
          }
        };
        window.addEventListener('message', onMsg);
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            if (!settled) {
              settled = true;
              cleanup();
              resolve({ success: false, error: 'Popup closed without completing' });
            }
          }
        }, 300);
      } catch (e) {
        resolve({ success: false, error: 'Failed to start Instagram connection' });
      }
    });
  }
}

// TikTok Login Kit API
export class TikTokAPI {
  private clientKey: string;
  private redirectUri: string;

  constructor() {
    this.clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY || '';
    // Smart detection like X: use domain to derive callback
    const origin = window.location.origin;
    this.redirectUri = `${origin}/tiktok-callback`;
    
    // Validate configuration on initialization
    if (!this.clientKey) {
      console.warn('TikTok: VITE_TIKTOK_CLIENT_KEY not configured');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.clientKey) {
      throw new Error('TikTok client key not configured. Please set VITE_TIKTOK_CLIENT_KEY environment variable.');
    }

    const csrfState = state || `tiktok_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: 'user.info.basic,user.info.stats',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: csrfState
    });
    
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    console.log('[TikTok] Generated auth URL:', authUrl);
    
    return authUrl;
  }

  async secureLogin(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token
        const state = `tiktok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('tiktok_oauth_state', state);

        const authUrl = this.getAuthUrl(state);
        
        const popup = window.open(
          authUrl,
          'tiktok-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };

        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'tiktok-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          
          // If the popup sent connection data, save it from parent window (which has session cookies)
          if (event.data.result?.success && event.data.result?.connectionData) {
            try {
              console.log('[TikTok secureLogin] Saving connection from parent window...');
              const saveResult = await saveSocialConnection(event.data.result.connectionData);
              if (!saveResult.success) {
                console.error('[TikTok secureLogin] Failed to save connection:', saveResult.error);
                resolve({ success: false, error: saveResult.error || 'Failed to save connection' });
                return;
              }
              console.log('[TikTok secureLogin] Connection saved successfully');
              invalidateSocialConnections();
              resolve({ success: true, displayName: event.data.result.displayName });
            } catch (error) {
              console.error('[TikTok secureLogin] Error saving connection:', error);
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback)
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              if (!settled) {
                settled = true;
                cleanup();
                resolve({ success: false, error: 'Authorization cancelled' });
              }
            }
          } catch (error) {
            // Cross-origin error means popup is still open
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!settled) {
            clearInterval(pollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[TikTok] Login error:', error);
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to initiate TikTok login' });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/tiktok/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
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
  private scopes: string;

  constructor() {
    this.clientId = import.meta.env.VITE_TWITTER_CLIENT_ID || '';
    this.redirectUri = (import.meta.env.VITE_TWITTER_REDIRECT_URI as string) || `${window.location.origin}/x-callback`;
    this.scopes = (import.meta.env.VITE_TWITTER_SCOPES as string) || 'users.read tweet.read tweet.write follows.read like.read offline.access';
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: 'twitter_auth',
      code_challenge: 'placeholder',
      code_challenge_method: 'S256'
    });
    
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    // This fallback method uses placeholder; primary flow uses twitter.ts with proper PKCE
    const response = await fetch('/api/social/twitter/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri, code_verifier: 'placeholder' })
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
    // Use dedicated YouTube OAuth client ID (not basic Google auth client)
    this.clientId = import.meta.env.VITE_GOOGLE_YOUTUBE_CLIENT_ID || '';
    const origin = window.location.origin;
    this.redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || `${origin}/youtube-callback`;
    
    if (!this.clientId) {
      console.warn('YouTube: VITE_GOOGLE_YOUTUBE_CLIENT_ID not configured');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('YouTube client ID not configured');
    }

    const csrfState = state || `youtube_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      // Scopes: youtube.readonly for API access + identity scopes
      // Removed unused youtube.channel-memberships.creator scope
      scope: 'https://www.googleapis.com/auth/youtube.readonly openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: csrfState
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async secureLogin(): Promise<{ success: boolean; error?: string; channelName?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token
        const state = `youtube_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('youtube_oauth_state', state);

        const authUrl = this.getAuthUrl(state);
        
        const popup = window.open(
          authUrl,
          'youtube-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };

        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'youtube-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          
          // If the popup sent connection data, save it from parent window (which has session cookies)
          if (event.data.result?.success && event.data.result?.connectionData) {
            try {
              console.log('[YouTube secureLogin] Saving connection from parent window...');
              const saveResult = await saveSocialConnection(event.data.result.connectionData);
              if (!saveResult.success) {
                console.error('[YouTube secureLogin] Failed to save connection:', saveResult.error);
                resolve({ success: false, error: saveResult.error || 'Failed to save connection' });
                return;
              }
              console.log('[YouTube secureLogin] Connection saved successfully');
              invalidateSocialConnections();
              resolve({ success: true, channelName: event.data.result.channelName });
            } catch (error) {
              console.error('[YouTube secureLogin] Error saving connection:', error);
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback - also handles COOP blocking popup.closed)
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              if (!settled) {
                settled = true;
                cleanup();
                // Check for fallback data set by callback page (handles COOP race condition)
                const fallback = (window as any).youtubeCallbackData;
                if (fallback) {
                  delete (window as any).youtubeCallbackData;
                  resolve(fallback);
                } else {
                  resolve({ success: false, error: 'Authorization cancelled' });
                }
              }
            }
          } catch (error) {
            // Cross-origin error means popup is still open on provider page
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!settled) {
            clearInterval(pollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[YouTube] Login error:', error);
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to initiate YouTube login' });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/youtube/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
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
    const origin = window.location.origin;
    this.redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${origin}/spotify-callback`;
    
    if (!this.clientId) {
      console.warn('Spotify: VITE_SPOTIFY_CLIENT_ID not configured');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('Spotify client ID not configured');
    }

    const csrfState = state || `spotify_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'user-follow-modify user-follow-read user-library-modify user-library-read user-read-private user-read-email',
      redirect_uri: this.redirectUri,
      state: csrfState,
      show_dialog: 'true'
    });
    
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async secureLogin(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token
        const state = `spotify_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('spotify_oauth_state', state);

        const authUrl = this.getAuthUrl(state);
        
        const popup = window.open(
          authUrl,
          'spotify-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };

        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'spotify-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          
          // If the popup sent connection data, save it from parent window (which has session cookies)
          if (event.data.result?.success && event.data.result?.connectionData) {
            try {
              console.log('[Spotify secureLogin] Saving connection from parent window...');
              const saveResult = await saveSocialConnection(event.data.result.connectionData);
              if (!saveResult.success) {
                console.error('[Spotify secureLogin] Failed to save connection:', saveResult.error);
                resolve({ success: false, error: saveResult.error || 'Failed to save connection' });
                return;
              }
              console.log('[Spotify secureLogin] Connection saved successfully');
              invalidateSocialConnections();
              resolve({ success: true, displayName: event.data.result.displayName });
            } catch (error) {
              console.error('[Spotify secureLogin] Error saving connection:', error);
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback - also handles COOP blocking popup.closed)
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              if (!settled) {
                settled = true;
                cleanup();
                // Check for fallback data set by callback page (handles COOP race condition)
                const fallback = (window as any).spotifyCallbackData;
                if (fallback) {
                  delete (window as any).spotifyCallbackData;
                  resolve(fallback);
                } else {
                  resolve({ success: false, error: 'Authorization cancelled' });
                }
              }
            }
          } catch (error) {
            // Cross-origin error means popup is still open on provider page
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!settled) {
            clearInterval(pollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Spotify] Login error:', error);
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to initiate Spotify login' });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/spotify/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
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

// Discord API
export class DiscordAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
    const origin = window.location.origin;
    this.redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI || `${origin}/discord-callback`;

    if (!this.clientId) {
      console.warn('Discord: VITE_DISCORD_CLIENT_ID not configured');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('Discord client ID not configured');
    }

    const csrfState = state || `discord_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'identify guilds guilds.members.read',
      redirect_uri: this.redirectUri,
      state: csrfState,
      prompt: 'consent'
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async secureLogin(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        const state = `discord_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('discord_oauth_state', state);

        const authUrl = this.getAuthUrl(state);

        const popup = window.open(
          authUrl,
          'discord-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };

        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'discord-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          
          // If the popup sent connection data, save it from parent window (which has session cookies)
          if (event.data.result?.success && event.data.result?.connectionData) {
            try {
              console.log('[Discord secureLogin] Saving connection from parent window...');
              const saveResult = await saveSocialConnection(event.data.result.connectionData);
              if (!saveResult.success) {
                console.error('[Discord secureLogin] Failed to save connection:', saveResult.error);
                resolve({ success: false, error: saveResult.error || 'Failed to save connection' });
                return;
              }
              
              console.log('[Discord secureLogin] Connection saved successfully');
              resolve({ success: true, displayName: event.data.result.displayName });
            } catch (error) {
              console.error('[Discord secureLogin] Error saving connection:', error);
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(event.data.result);
          }
        };

        window.addEventListener('message', onMsg);

        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              if (!settled) {
                settled = true;
                cleanup();
                resolve({ success: false, error: 'Authorization cancelled' });
              }
            }
          } catch (error) {
            // Cross-origin error means popup is still open
          }
        }, 1000);

        setTimeout(() => {
          if (!settled) {
            clearInterval(pollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Discord] Login error:', error);
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to initiate Discord login' });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();

    return {
      platform: 'discord',
      username: data.username,
      displayName: data.global_name || data.username,
      profileUrl: `https://discord.com/users/${data.id}`,
      followers: 0, // Discord doesn't have a follower count
      verified: data.verified || false,
      profileImage: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : '',
      accessToken,
      connectedAt: new Date()
    };
  }
}

// Twitch API
export class TwitchAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
    const origin = window.location.origin;
    this.redirectUri = import.meta.env.VITE_TWITCH_REDIRECT_URI || `${origin}/twitch-callback`;

    if (!this.clientId) {
      console.warn('Twitch: VITE_TWITCH_CLIENT_ID not configured');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('Twitch client ID not configured');
    }

    const csrfState = state || `twitch_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'user:read:email channel:read:subscriptions',
      redirect_uri: this.redirectUri,
      state: csrfState,
      force_verify: 'true'
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  async secureLogin(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        const state = `twitch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('twitch_oauth_state', state);

        const authUrl = this.getAuthUrl(state);

        const popup = window.open(
          authUrl,
          'twitch-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { popup?.close(); } catch {}
        };

        const onMsg = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'twitch-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          
          // If the popup sent connection data, save it from parent window (which has session cookies)
          if (event.data.result?.success && event.data.result?.connectionData) {
            try {
              console.log('[Twitch secureLogin] Saving connection from parent window...');
              const saveResult = await saveSocialConnection(event.data.result.connectionData);
              if (!saveResult.success) {
                console.error('[Twitch secureLogin] Failed to save connection:', saveResult.error);
                resolve({ success: false, error: saveResult.error || 'Failed to save connection' });
                return;
              }
              
              console.log('[Twitch secureLogin] Connection saved successfully');
              resolve({ success: true, displayName: event.data.result.displayName });
            } catch (error) {
              console.error('[Twitch secureLogin] Error saving connection:', error);
              resolve({ success: false, error: 'Failed to save connection' });
            }
          } else {
            resolve(event.data.result);
          }
        };

        window.addEventListener('message', onMsg);

        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              if (!settled) {
                settled = true;
                cleanup();
                resolve({ success: false, error: 'Authorization cancelled' });
              }
            }
          } catch (error) {
            // Cross-origin error means popup is still open
          }
        }, 1000);

        setTimeout(() => {
          if (!settled) {
            clearInterval(pollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Twitch] Login error:', error);
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to initiate Twitch login' });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/twitch/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri })
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId
      }
    });

    const data = await response.json();
    const user = data.data && data.data.length > 0 ? data.data[0] : null;

    if (!user) {
      throw new Error('Failed to fetch Twitch user data');
    }

    return {
      platform: 'twitch',
      username: user.login,
      displayName: user.display_name,
      profileUrl: `https://twitch.tv/${user.login}`,
      followers: 0, // Would need additional API call to get follower count
      verified: user.broadcaster_type === 'partner',
      profileImage: user.profile_image_url || '',
      accessToken,
      connectedAt: new Date()
    };
  }
}

// Social Integration Manager
export class SocialIntegrationManager {
  private facebook: FacebookAPI;
  private instagram: InstagramAPI;
  private tiktok: TikTokAPI;
  private twitter: TwitterAPI;
  private youtube: YouTubeAPI;
  private spotify: SpotifyAPI;
  private discord: DiscordAPI;
  private twitch: TwitchAPI;

  constructor() {
    this.facebook = new FacebookAPI();
    this.instagram = new InstagramAPI();
    this.tiktok = new TikTokAPI();
    this.twitter = new TwitterAPI();
    this.youtube = new YouTubeAPI();
    this.spotify = new SpotifyAPI();
    this.discord = new DiscordAPI();
    this.twitch = new TwitchAPI();
  }

  getAPI(platform: string): TikTokAPI | YouTubeAPI | SpotifyAPI | DiscordAPI | TwitchAPI {
    switch (platform) {
      case 'tiktok': return this.tiktok;
      case 'youtube': return this.youtube;
      case 'spotify': return this.spotify;
      case 'discord': return this.discord;
      case 'twitch': return this.twitch;
      default: throw new Error(`Unsupported platform for getAPI: ${platform}`);
    }
  }

  getAuthUrl(platform: string): string {
    switch (platform) {
      case 'facebook': return '#'; // Facebook uses SDK login, not URL redirect
      case 'instagram': return this.instagram.getAuthUrl();
      case 'tiktok': return this.tiktok.getAuthUrl();
      case 'twitter': return this.twitter.getAuthUrl();
      case 'youtube': return this.youtube.getAuthUrl();
      case 'spotify': return this.spotify.getAuthUrl();
      case 'discord': return this.discord.getAuthUrl();
      case 'twitch': return this.twitch.getAuthUrl();
      default: throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async connectAccount(platform: string, code?: string): Promise<SocialMediaAccount | null> {
    let accessToken: string;
    
    switch (platform) {
      case 'facebook':
        return await this.facebook.connectAccount(); // Facebook uses SDK, no code needed
      case 'instagram':
        if (!code) throw new Error('Code required for Instagram');
        accessToken = await this.instagram.exchangeCodeForToken(code);
        return this.instagram.getUserProfile(accessToken);
      case 'tiktok':
        if (!code) throw new Error('Code required for TikTok');
        accessToken = await this.tiktok.exchangeCodeForToken(code);
        return this.tiktok.getUserProfile(accessToken);
      case 'twitter':
        // Twitter uses dedicated popup flow via TwitterSDKManager - this path should not be called
        throw new Error('Twitter integration uses popup flow via TwitterSDKManager, not redirect flow');
      case 'youtube':
        if (!code) throw new Error('Code required for YouTube');
        accessToken = await this.youtube.exchangeCodeForToken(code);
        return this.youtube.getUserProfile(accessToken);
      case 'spotify':
        if (!code) throw new Error('Code required for Spotify');
        accessToken = await this.spotify.exchangeCodeForToken(code);
        return this.spotify.getUserProfile(accessToken);
      case 'discord':
        if (!code) throw new Error('Code required for Discord');
        accessToken = await this.discord.exchangeCodeForToken(code);
        return this.discord.getUserProfile(accessToken);
      case 'twitch':
        if (!code) throw new Error('Code required for Twitch');
        accessToken = await this.twitch.exchangeCodeForToken(code);
        return this.twitch.getUserProfile(accessToken);
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
      case 'facebook': 
        // Refresh Facebook follower count
        const updatedFollowers = await this.facebook.refreshFollowerCount(account.accessToken);
        return { ...account, followers: updatedFollowers };
      case 'instagram': return this.instagram.getUserProfile(account.accessToken);
      case 'tiktok': return this.tiktok.getUserProfile(account.accessToken);
      case 'twitter': return this.twitter.getUserProfile(account.accessToken);
      case 'youtube': return this.youtube.getUserProfile(account.accessToken);
      case 'spotify': return this.spotify.getUserProfile(account.accessToken);
      case 'discord': return this.discord.getUserProfile(account.accessToken);
      case 'twitch': return this.twitch.getUserProfile(account.accessToken);
      default: return account;
    }
  }
}

export const socialManager = new SocialIntegrationManager();