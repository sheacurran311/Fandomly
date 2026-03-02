/**
 * Patreon OAuth Integration
 *
 * OAuth 2.0 with popup-based flow consistent with other platform integrations.
 * Supports both creator and patron use cases.
 */

// Patreon OAuth configuration
const PATREON_CONFIG = {
  clientId: import.meta.env.VITE_PATREON_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/patreon-callback`,
  authUrl: 'https://www.patreon.com/oauth2/authorize',
  tokenUrl: 'https://www.patreon.com/api/oauth2/token',
  apiBase: 'https://www.patreon.com/api/oauth2/v2',
  scopes: ['identity', 'identity[email]', 'campaigns', 'campaigns.members'],
};

export interface PatreonUser {
  id: string;
  fullName: string;
  vanityName?: string;
  email?: string;
  imageUrl?: string;
  url: string;
  isCreator: boolean;
}

export interface PatreonMembership {
  campaignId: string;
  campaignName: string;
  patronStatus: 'active_patron' | 'declined_patron' | 'former_patron' | null;
  isFollower: boolean;
  currentlyEntitledAmountCents: number;
  lifetimeSupportCents: number;
  pledgeRelationshipStart?: string;
  tierId?: string;
  tierTitle?: string;
}

export interface PatreonAuthState {
  isConnected: boolean;
  user: PatreonUser | null;
  memberships: PatreonMembership[];
  accessToken: string | null;
  error: string | null;
}

/**
 * PKCE Helper Functions
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
 * Patreon OAuth API class with popup-based secureLogin flow
 */
export class PatreonAPI {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = PATREON_CONFIG.clientId;
    this.redirectUri = PATREON_CONFIG.redirectUri;
  }

  async getAuthUrl(state?: string): Promise<{ url: string; codeVerifier: string }> {
    if (!this.clientId) {
      throw new Error(
        'Patreon client ID not configured. Please set VITE_PATREON_CLIENT_ID environment variable.'
      );
    }

    const csrfState = state || `patreon_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: PATREON_CONFIG.scopes.join(' '),
      state: csrfState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${PATREON_CONFIG.authUrl}?${params.toString()}`,
      codeVerifier,
    };
  }

  async secureLogin(): Promise<{ success: boolean; error?: string }> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        // Generate CSRF state token
        const state = `patreon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem('patreon_oauth_state', state);

        const { url: authUrl, codeVerifier } = await this.getAuthUrl(state);

        // Store code verifier for PKCE
        sessionStorage.setItem('patreon_code_verifier', codeVerifier);

        const popup = window.open(
          authUrl,
          'patreon-oauth',
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
          if (event.data?.type !== 'patreon-oauth-result') return;
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
                      const lsKey = `patreon_oauth_result_${state}`;
                      const lsResult = localStorage.getItem(lsKey);
                      if (lsResult) {
                        localStorage.removeItem(lsKey);
                        const parsed = JSON.parse(lsResult);
                        console.log(
                          '[Patreon] Found result in localStorage (COOP fallback):',
                          parsed.success
                        );
                        resolve(parsed);
                        return;
                      }
                    } catch (e) {
                      console.error('[Patreon] Error reading localStorage fallback:', e);
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
        console.error('[Patreon] Login error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Patreon login',
        });
      }
    });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const codeVerifier = sessionStorage.getItem('patreon_code_verifier') || undefined;

    const response = await fetch('/api/social/patreon/token', {
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

  async getUserProfile(accessToken: string): Promise<PatreonUser> {
    const response = await fetch('/api/social/patreon/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }

    return {
      id: data.id,
      fullName: data.full_name,
      vanityName: data.vanity,
      email: data.email,
      imageUrl: data.image_url,
      url: data.url,
      isCreator: data.is_creator || false,
    };
  }
}

/**
 * Get current Patreon connection status
 */
export async function getPatreonConnectionStatus(): Promise<PatreonAuthState> {
  try {
    const response = await fetch('/api/social/connections/patreon', {
      credentials: 'include',
    });

    if (!response.ok) {
      return { isConnected: false, user: null, memberships: [], accessToken: null, error: null };
    }

    const data = await response.json();

    return {
      isConnected: data.isActive,
      user: data.profileData
        ? {
            id: data.platformUserId,
            fullName: data.profileData.fullName,
            vanityName: data.platformUsername,
            email: data.profileData.email,
            imageUrl: data.profileData.imageUrl,
            url: data.profileData.url,
            isCreator: data.profileData.isCreator,
          }
        : null,
      memberships: data.profileData?.memberships || [],
      accessToken: null,
      error: null,
    };
  } catch (error) {
    console.error('[Patreon] Connection status error:', error);
    return {
      isConnected: false,
      user: null,
      memberships: [],
      accessToken: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Disconnect Patreon account
 */
export async function disconnectPatreon(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/social/connections/patreon', {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to disconnect' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Patreon] Disconnect error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch memberships for a specific campaign (creator side)
 */
export async function getPatreonCampaignMembers(campaignId: string): Promise<{
  members: Array<{
    patronId: string;
    fullName: string;
    email?: string;
    currentlyEntitledAmountCents: number;
    lifetimeSupportCents: number;
    patronStatus: string;
  }>;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/social/patreon/campaigns/${campaignId}/members`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { members: [], error: error.message };
    }

    const data = await response.json();
    return { members: data.members };
  } catch (error) {
    console.error('[Patreon] Campaign members error:', error);
    return { members: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if user is a patron of a specific campaign
 */
export async function checkPatronStatus(
  campaignId: string,
  minimumCents?: number
): Promise<{
  isPatron: boolean;
  tier?: string;
  amountCents?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ campaignId });
    if (minimumCents !== undefined) {
      params.append('minimumCents', minimumCents.toString());
    }

    const response = await fetch(`/api/social/patreon/check-patron?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { isPatron: false, error: error.message };
    }

    const data = await response.json();
    return {
      isPatron: data.isPatron,
      tier: data.tier,
      amountCents: data.amountCents,
    };
  } catch (error) {
    console.error('[Patreon] Check patron status error:', error);
    return { isPatron: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if Patreon OAuth is available
 */
export function isPatreonOAuthAvailable(): boolean {
  return !!PATREON_CONFIG.clientId;
}
