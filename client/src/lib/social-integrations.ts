/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SINGLE SOURCE OF TRUTH — TikTok, YouTube, Spotify, Discord, Twitch OAuth
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * This file is the ONLY place where OAuth config (scopes, redirect URIs, popup
 * flows, COOP fallbacks) for TikTok, YouTube, Spotify, Discord, and Twitch
 * should be defined. All UI layers must import and call secureLogin() from here.
 * NEVER duplicate this logic elsewhere.
 */
// Social Media Integration APIs
import FacebookSDK, { type FacebookPage } from './facebook';
import { KickAPI } from './kick';
import { PatreonAPI } from './patreon';

export interface SocialMediaAccount {
  platform:
    | 'facebook'
    | 'instagram'
    | 'tiktok'
    | 'twitter'
    | 'youtube'
    | 'spotify'
    | 'discord'
    | 'twitch'
    | 'kick'
    | 'patreon'
    | 'apple_music';
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
      const loginResult = await FacebookSDK.login(
        'email,public_profile,pages_show_list,pages_read_engagement'
      );

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
        connectedAt: new Date(),
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
      state: 'instagram_auth',
    });

    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/instagram/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${accessToken}`
    );
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
      connectedAt: new Date(),
    };
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
      throw new Error(
        'TikTok client key not configured. Please set VITE_TIKTOK_CLIENT_KEY environment variable.'
      );
    }

    const csrfState = state || `tiktok_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: 'user.info.basic,user.info.stats',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: csrfState,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    console.log('[TikTok] Generated auth URL:', authUrl);

    return authUrl;
  }

  async secureLogin(mode?: 'auth' | 'connect'): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token; embed _auth_ marker so callbacks distinguish login from connection
        const authMarker = mode === 'auth' ? '_auth_' : '';
        const state = `tiktok_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
          try {
            window.removeEventListener('message', onMsg);
          } catch {
            // expected
          }
          try {
            popup?.close();
          } catch {
            // expected
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'tiktok-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback) -- delay first check to avoid false positives
        const startPolling = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(pollTimer);
                if (!settled) {
                  // Give localStorage a moment to be written by the callback before checking
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `tiktok_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[TikTok] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[TikTok] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open - expected
            }
          }, 1000);
        };
        let pollTimer: ReturnType<typeof setInterval>;
        setTimeout(() => {
          if (!settled) {
            pollTimer = startPolling();
          }
        }, 3000);

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
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate TikTok login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/tiktok/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('/api/social/tiktok/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
      connectedAt: new Date(),
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
    this.redirectUri =
      (import.meta.env.VITE_TWITTER_REDIRECT_URI as string) ||
      `${window.location.origin}/x-callback`;
    this.scopes =
      (import.meta.env.VITE_TWITTER_SCOPES as string) ||
      'tweet.read tweet.write users.read follows.read offline.access';
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: 'twitter_auth',
      code_challenge: 'placeholder',
      code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    // This fallback method uses placeholder; primary flow uses twitter.ts with proper PKCE
    const response = await fetch('/api/social/twitter/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri, code_verifier: 'placeholder' }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('/api/social/twitter/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
      connectedAt: new Date(),
    };
  }
}

// YouTube Data API v3
export class YouTubeAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    // Use the dedicated YouTube client ID, NOT the basic Google auth client ID.
    // GOOGLE_YOUTUBE_CLIENT_ID has YouTube-specific scopes and must match the
    // server-side GOOGLE_YOUTUBE_CLIENT_ID used for token exchange.
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
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: csrfState,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async secureLogin(
    mode?: 'auth' | 'connect'
  ): Promise<{ success: boolean; error?: string; channelName?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token; embed _auth_ marker so callbacks distinguish login from connection
        const authMarker = mode === 'auth' ? '_auth_' : '';
        const state = `youtube_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
          try {
            window.removeEventListener('message', onMsg);
          } catch {
            // expected
          }
          try {
            popup?.close();
          } catch {
            // expected
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'youtube-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback) -- delay first check to avoid false positives
        const startPolling = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(ytPollTimer);
                if (!settled) {
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `youtube_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[YouTube] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[YouTube] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open - expected
            }
          }, 1000);
        };
        let ytPollTimer: ReturnType<typeof setInterval>;
        setTimeout(() => {
          if (!settled) {
            ytPollTimer = startPolling();
          }
        }, 3000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!settled) {
            clearInterval(ytPollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[YouTube] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate YouTube login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/youtube/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    // Route through server proxy to avoid CORS — direct YouTube API calls from browser are blocked
    const response = await fetch('/api/social/youtube/me', {
      headers: { 'X-Social-Token': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube profile: ${response.status}`);
    }

    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found');

    return {
      platform: 'youtube',
      username: channel.snippet.customUrl || channel.id,
      displayName: channel.snippet.title,
      profileUrl: `https://youtube.com/channel/${channel.id}`,
      followers: parseInt(channel.statistics?.subscriberCount || '0'),
      verified: false,
      profileImage: channel.snippet.thumbnails?.default?.url,
      accessToken,
      connectedAt: new Date(),
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
      scope:
        'user-follow-read user-library-read playlist-read-private user-read-private user-read-email',
      redirect_uri: this.redirectUri,
      state: csrfState,
      show_dialog: 'true',
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async secureLogin(
    mode?: 'auth' | 'connect'
  ): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        // Generate CSRF state token; embed _auth_ marker so callbacks distinguish login from connection
        const authMarker = mode === 'auth' ? '_auth_' : '';
        const state = `spotify_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
          try {
            window.removeEventListener('message', onMsg);
          } catch {
            // expected
          }
          try {
            popup?.close();
          } catch {
            // expected
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'spotify-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback) -- delay first check to avoid false positives
        const startSpotifyPoll = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(spotifyPollTimer);
                if (!settled) {
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `spotify_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[Spotify] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[Spotify] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open - expected
            }
          }, 1000);
        };
        let spotifyPollTimer: ReturnType<typeof setInterval>;
        setTimeout(() => {
          if (!settled) {
            spotifyPollTimer = startSpotifyPoll();
          }
        }, 3000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!settled) {
            clearInterval(spotifyPollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Spotify] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Spotify login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/spotify/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
      connectedAt: new Date(),
    };
  }
}

// Apple Music API (via MusicKit JS)
export class AppleMusicAPI {
  private developerToken: string | null = null;
  private musicKitLoaded = false;

  /**
   * Load MusicKit JS script into the page if not already loaded.
   */
  private async loadMusicKitJS(): Promise<void> {
    if (this.musicKitLoaded) return;
    if (typeof window !== 'undefined' && (window as any).MusicKit) {
      this.musicKitLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        this.musicKitLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load MusicKit JS'));
      document.head.appendChild(script);
    });
  }

  /**
   * Fetch the developer token from our server.
   */
  async getDeveloperToken(): Promise<string> {
    if (this.developerToken) return this.developerToken;

    const res = await fetch('/api/social/apple-music/developer-token');
    if (!res.ok) {
      throw new Error('Failed to fetch Apple Music developer token');
    }
    const data = await res.json();
    this.developerToken = data.token;
    return data.token;
  }

  /**
   * Initialize MusicKit and authorize the user.
   * Returns the Music-User-Token on success.
   */
  async authorize(): Promise<{ success: boolean; musicUserToken?: string; error?: string }> {
    try {
      await this.loadMusicKitJS();
      const devToken = await this.getDeveloperToken();

      const MusicKit = (window as any).MusicKit;
      if (!MusicKit) {
        return { success: false, error: 'MusicKit JS failed to load' };
      }

      // Configure MusicKit instance
      await MusicKit.configure({
        developerToken: devToken,
        app: {
          name: 'Fandomly',
          build: '1.0.0',
        },
      });

      const music = MusicKit.getInstance();
      const musicUserToken = await music.authorize();

      if (!musicUserToken) {
        return { success: false, error: 'Apple Music authorization was cancelled' };
      }

      return { success: true, musicUserToken };
    } catch (error: any) {
      console.error('[AppleMusic] Authorization error:', error);

      // Provide actionable guidance for common MusicKit errors
      const msg = error?.message || String(error);
      let userMessage = 'Apple Music authorization failed';
      if (msg.includes('Unauthorized') || msg.includes('AUTHORIZATION_ERROR')) {
        userMessage =
          'Apple Music rejected the developer token. ' +
          'Please verify: (1) the MusicKit key is active in Apple Developer portal, ' +
          '(2) APPLE_MUSIC_KEY_ID matches the key, ' +
          '(3) APPLE_MUSIC_TEAM_ID matches your team. ' +
          'New keys can take up to 30 minutes to propagate.';
      }

      return { success: false, error: userMessage };
    }
  }

  /**
   * Full login flow: authorize via MusicKit JS, then save token to server.
   */
  async secureLogin(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    try {
      const authResult = await this.authorize();
      if (!authResult.success || !authResult.musicUserToken) {
        return { success: false, error: authResult.error };
      }

      // Save the token to our server
      const saveRes = await fetch('/api/social/apple-music/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicUserToken: authResult.musicUserToken,
        }),
        credentials: 'include',
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to save Apple Music connection' };
      }

      const data = await saveRes.json();
      return {
        success: true,
        displayName: data.connection?.platformDisplayName || 'Apple Music User',
      };
    } catch (error) {
      console.error('[AppleMusic] Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Apple Music login failed',
      };
    }
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    // Apple Music doesn't have a traditional user profile endpoint.
    // Use the storefront as a proxy.
    return {
      platform: 'apple_music',
      username: 'apple_music_user',
      displayName: 'Apple Music User',
      profileUrl: '',
      followers: 0,
      verified: false,
      profileImage: '',
      accessToken,
      connectedAt: new Date(),
    };
  }
}

// Discord API
export class DiscordAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId =
      import.meta.env.VITE_DISCORD_CLIENT_ID || import.meta.env.VITE_DISCORD_APP_ID || '';
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
      prompt: 'consent',
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async secureLogin(
    mode?: 'auth' | 'connect'
  ): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        const authMarker = mode === 'auth' ? '_auth_' : '';
        const state = `discord_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
          try {
            window.removeEventListener('message', onMsg);
          } catch {
            // expected
          }
          try {
            popup?.close();
          } catch {
            // expected
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'discord-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback) -- delay first check to avoid false positives
        const startDiscordPoll = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(discordPollTimer);
                if (!settled) {
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `discord_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[Discord] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[Discord] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open - expected
            }
          }, 1000);
        };
        let discordPollTimer: ReturnType<typeof setInterval>;
        setTimeout(() => {
          if (!settled) {
            discordPollTimer = startDiscordPoll();
          }
        }, 3000);

        setTimeout(() => {
          if (!settled) {
            clearInterval(discordPollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Discord] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Discord login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    return {
      platform: 'discord',
      username: data.username,
      displayName: data.global_name || data.username,
      profileUrl: `https://discord.com/users/${data.id}`,
      followers: 0, // Discord doesn't have a follower count
      verified: data.verified || false,
      profileImage: data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : '',
      accessToken,
      connectedAt: new Date(),
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
      force_verify: 'true',
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  async secureLogin(
    mode?: 'auth' | 'connect'
  ): Promise<{ success: boolean; error?: string; displayName?: string }> {
    return new Promise((resolve) => {
      try {
        const authMarker = mode === 'auth' ? '_auth_' : '';
        const state = `twitch_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
          try {
            window.removeEventListener('message', onMsg);
          } catch {
            // expected
          }
          try {
            popup?.close();
          } catch {
            // expected
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'twitch-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback) -- delay first check to avoid false positives
        const startTwitchPoll = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(twitchPollTimer);
                if (!settled) {
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `twitch_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[Twitch] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[Twitch] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open - expected
            }
          }, 1000);
        };
        let twitchPollTimer: ReturnType<typeof setInterval>;
        setTimeout(() => {
          if (!settled) {
            twitchPollTimer = startTwitchPoll();
          }
        }, 3000);

        setTimeout(() => {
          if (!settled) {
            clearInterval(twitchPollTimer);
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Authorization timeout' });
          }
        }, 300000);
      } catch (error) {
        console.error('[Twitch] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Twitch login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('/api/social/twitch/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.redirectUri }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<SocialMediaAccount> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
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
      connectedAt: new Date(),
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
  private kick: KickAPI;
  private patreon: PatreonAPI;
  private appleMusic: AppleMusicAPI;

  constructor() {
    this.facebook = new FacebookAPI();
    this.instagram = new InstagramAPI();
    this.tiktok = new TikTokAPI();
    this.twitter = new TwitterAPI();
    this.youtube = new YouTubeAPI();
    this.spotify = new SpotifyAPI();
    this.discord = new DiscordAPI();
    this.twitch = new TwitchAPI();
    this.kick = new KickAPI();
    this.patreon = new PatreonAPI();
    this.appleMusic = new AppleMusicAPI();
  }

  getAuthUrl(platform: string): string {
    switch (platform) {
      case 'facebook':
        return '#'; // Facebook uses SDK login, not URL redirect
      case 'instagram':
        return this.instagram.getAuthUrl();
      case 'tiktok':
        return this.tiktok.getAuthUrl();
      case 'twitter':
        return this.twitter.getAuthUrl();
      case 'youtube':
        return this.youtube.getAuthUrl();
      case 'spotify':
        return this.spotify.getAuthUrl();
      case 'discord':
        return this.discord.getAuthUrl();
      case 'twitch':
        return this.twitch.getAuthUrl();
      case 'kick':
        return '#'; // Kick uses popup flow via secureLogin()
      case 'patreon':
        return '#'; // Patreon uses popup flow via secureLogin()
      case 'apple_music':
        return '#'; // Apple Music uses MusicKit JS flow via secureLogin()
      default:
        throw new Error(`Unsupported platform: ${platform}`);
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
        throw new Error(
          'Twitter integration uses popup flow via TwitterSDKManager, not redirect flow'
        );
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
      case 'kick':
        // Kick uses popup flow via secureLogin() - this path should not be called
        throw new Error('Kick integration uses popup flow via KickAPI.secureLogin()');
      case 'patreon':
        // Patreon uses popup flow via secureLogin() - this path should not be called
        throw new Error('Patreon integration uses popup flow via PatreonAPI.secureLogin()');
      case 'apple_music':
        // Apple Music uses MusicKit JS flow via AppleMusicAPI.secureLogin()
        throw new Error(
          'Apple Music integration uses MusicKit JS flow via AppleMusicAPI.secureLogin()'
        );
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
            recentGrowth: 0,
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
      case 'instagram':
        return this.instagram.getUserProfile(account.accessToken);
      case 'tiktok':
        return this.tiktok.getUserProfile(account.accessToken);
      case 'twitter':
        return this.twitter.getUserProfile(account.accessToken);
      case 'youtube':
        return this.youtube.getUserProfile(account.accessToken);
      case 'spotify':
        return this.spotify.getUserProfile(account.accessToken);
      case 'discord':
        return this.discord.getUserProfile(account.accessToken);
      case 'twitch':
        return this.twitch.getUserProfile(account.accessToken);
      case 'apple_music':
        return this.appleMusic.getUserProfile(account.accessToken);
      default:
        return account;
    }
  }
}

export const socialManager = new SocialIntegrationManager();
