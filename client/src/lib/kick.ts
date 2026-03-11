/**
 * Kick OAuth Integration
 *
 * OAuth 2.1 with PKCE support for Kick streaming platform.
 * Uses popup-based flow consistent with other platform integrations.
 * OAuth server: id.kick.com
 */

// Kick OAuth configuration
const KICK_CONFIG = {
  clientId: import.meta.env.VITE_KICK_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/kick-callback`,
  authUrl: 'https://id.kick.com/oauth/authorize',
  scopes: ['user:read', 'channel:read', 'chat:read'],
};

export interface KickUser {
  id: string;
  username: string;
  bio?: string;
  profilePicture?: string;
  followerCount?: number;
  isVerified?: boolean;
}

export interface KickAuthState {
  isConnected: boolean;
  user: KickUser | null;
  accessToken: string | null;
  error: string | null;
}

/**
 * PKCE helpers for OAuth 2.1
 */
function base64URLEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Kick OAuth API class with popup-based secureLogin flow
 */
export class KickAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = KICK_CONFIG.clientId;
    this.redirectUri = KICK_CONFIG.redirectUri;
  }

  async getAuthUrl(state: string): Promise<{ url: string; codeVerifier: string }> {
    if (!this.clientId) {
      throw new Error(
        'Kick client ID not configured. Please set VITE_KICK_CLIENT_ID environment variable.'
      );
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: KICK_CONFIG.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${KICK_CONFIG.authUrl}?${params.toString()}`,
      codeVerifier,
    };
  }

  async secureLogin(mode?: 'auth' | 'connect'): Promise<{ success: boolean; error?: string }> {
    // Generate CSRF state token; embed _auth_ marker so kick-callback.tsx can distinguish flows
    const authMarker = mode === 'auth' ? '_auth_' : '';
    const state = `kick_${authMarker}${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('kick_oauth_state', state);

    const { url: authUrl, codeVerifier } = await this.getAuthUrl(state);
    sessionStorage.setItem('kick_code_verifier', codeVerifier);

    return new Promise((resolve) => {
      try {
        const popup = window.open(
          authUrl,
          'kick-oauth',
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
            /* expected */
          }
          try {
            popup?.close();
          } catch {
            /* expected */
          }
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'kick-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result);
        };

        window.addEventListener('message', onMsg);

        // Poll for popup closure (fallback)
        const startPolling = () => {
          return setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(pollTimer);
                if (!settled) {
                  setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();

                    // Check localStorage as COOP fallback
                    try {
                      const lsKey = `kick_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[Kick] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[Kick] Error reading localStorage fallback:', e);
                    }

                    resolve({ success: false, error: 'Authorization cancelled' });
                  }, 500);
                }
              }
            } catch {
              // Cross-origin error means popup is still open
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
        console.error('[Kick] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Kick login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const codeVerifier = sessionStorage.getItem('kick_code_verifier') || undefined;
    const response = await fetch('/api/social/kick/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Token exchange failed');
    }
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<KickUser> {
    const response = await fetch('/api/social/kick/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }
    return data;
  }
}

/**
 * Get current Kick connection status
 */
export async function getKickConnectionStatus(): Promise<KickAuthState> {
  try {
    const response = await fetch('/api/social/connections/kick', {
      credentials: 'include',
    });

    if (!response.ok) {
      return { isConnected: false, user: null, accessToken: null, error: null };
    }

    const data = await response.json();

    return {
      isConnected: data.isActive,
      user: data.profileData
        ? {
            id: data.platformUserId,
            username: data.platformUsername,
            bio: data.profileData.bio,
            profilePicture: data.profileData.profilePicture,
            followerCount: data.profileData.followerCount,
            isVerified: data.profileData.isVerified,
          }
        : null,
      accessToken: null,
      error: null,
    };
  } catch (error) {
    console.error('[Kick] Connection status error:', error);
    return {
      isConnected: false,
      user: null,
      accessToken: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Disconnect Kick account
 */
export async function disconnectKick(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/social/connections/kick', {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to disconnect' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Kick] Disconnect error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if Kick OAuth is available
 */
export function isKickOAuthAvailable(): boolean {
  return !!KICK_CONFIG.clientId;
}
