/**
 * Kick OAuth Integration
 * 
 * Handles OAuth flow for connecting Kick accounts.
 * Kick is a newer streaming platform, OAuth may have limited availability.
 * 
 * Note: Kick's OAuth API may not be publicly available yet.
 * This implementation is prepared for when it becomes available.
 */

// Kick OAuth configuration
const KICK_CONFIG = {
  clientId: import.meta.env.VITE_KICK_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/kick-callback`,
  authUrl: 'https://kick.com/oauth/authorize', // Placeholder - update when available
  tokenUrl: 'https://kick.com/oauth/token', // Placeholder - update when available
  apiBase: 'https://kick.com/api/v1', // Placeholder - update when available
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
 * Generate OAuth state for CSRF protection
 */
function generateState(): string {
  return crypto.randomUUID();
}

/**
 * Start OAuth flow by redirecting to Kick authorization
 */
export function initiateKickOAuth(): void {
  if (!KICK_CONFIG.clientId) {
    console.error('[Kick] Client ID not configured');
    return;
  }

  const state = generateState();
  localStorage.setItem('kick_oauth_state', state);

  const params = new URLSearchParams({
    client_id: KICK_CONFIG.clientId,
    redirect_uri: KICK_CONFIG.redirectUri,
    response_type: 'code',
    scope: KICK_CONFIG.scopes.join(' '),
    state,
  });

  window.location.href = `${KICK_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Handle OAuth callback
 */
export async function handleKickCallback(code: string, state: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Verify state
  const savedState = localStorage.getItem('kick_oauth_state');
  if (state !== savedState) {
    return { success: false, error: 'Invalid OAuth state' };
  }
  localStorage.removeItem('kick_oauth_state');

  try {
    // Exchange code for token via our backend
    const response = await fetch('/api/social/kick/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to connect Kick account' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Kick] Callback error:', error);
    return { success: false, error: error.message || 'Failed to connect Kick account' };
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
      return {
        isConnected: false,
        user: null,
        accessToken: null,
        error: null,
      };
    }

    const data = await response.json();
    
    return {
      isConnected: data.isActive,
      user: data.profileData ? {
        id: data.platformUserId,
        username: data.platformUsername,
        bio: data.profileData.bio,
        profilePicture: data.profileData.profilePicture,
        followerCount: data.profileData.followerCount,
        isVerified: data.profileData.isVerified,
      } : null,
      accessToken: null, // Don't expose token to client
      error: null,
    };
  } catch (error: any) {
    console.error('[Kick] Connection status error:', error);
    return {
      isConnected: false,
      user: null,
      accessToken: null,
      error: error.message,
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
  } catch (error: any) {
    console.error('[Kick] Disconnect error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if Kick OAuth is available
 * (May not be publicly available yet)
 */
export function isKickOAuthAvailable(): boolean {
  return !!KICK_CONFIG.clientId;
}
