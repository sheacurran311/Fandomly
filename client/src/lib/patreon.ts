/**
 * Patreon OAuth Integration
 * 
 * Handles OAuth flow for connecting Patreon accounts.
 * Supports both creator (checking pledge data) and patron (verifying memberships) use cases.
 */

// Patreon OAuth configuration
const PATREON_CONFIG = {
  clientId: import.meta.env.VITE_PATREON_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/patreon-callback`,
  authUrl: 'https://www.patreon.com/oauth2/authorize',
  tokenUrl: 'https://www.patreon.com/api/oauth2/token',
  apiBase: 'https://www.patreon.com/api/oauth2/v2',
  // Scopes for reading user identity, memberships, and campaigns
  scopes: [
    'identity',
    'identity[email]',
    'campaigns',
    'campaigns.members',
  ],
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
 * Generate OAuth state for CSRF protection
 */
function generateState(): string {
  return crypto.randomUUID();
}

/**
 * Start OAuth flow by redirecting to Patreon authorization
 */
export function initiatePatreonOAuth(): void {
  if (!PATREON_CONFIG.clientId) {
    console.error('[Patreon] Client ID not configured');
    return;
  }

  const state = generateState();
  localStorage.setItem('patreon_oauth_state', state);

  const params = new URLSearchParams({
    client_id: PATREON_CONFIG.clientId,
    redirect_uri: PATREON_CONFIG.redirectUri,
    response_type: 'code',
    scope: PATREON_CONFIG.scopes.join(' '),
    state,
  });

  window.location.href = `${PATREON_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Handle OAuth callback
 */
export async function handlePatreonCallback(code: string, state: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Verify state
  const savedState = localStorage.getItem('patreon_oauth_state');
  if (state !== savedState) {
    return { success: false, error: 'Invalid OAuth state' };
  }
  localStorage.removeItem('patreon_oauth_state');

  try {
    // Exchange code for token via our backend
    const response = await fetch('/api/social/patreon/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to connect Patreon account' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Patreon] Callback error:', error);
    return { success: false, error: error.message || 'Failed to connect Patreon account' };
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
      return {
        isConnected: false,
        user: null,
        memberships: [],
        accessToken: null,
        error: null,
      };
    }

    const data = await response.json();
    
    return {
      isConnected: data.isActive,
      user: data.profileData ? {
        id: data.platformUserId,
        fullName: data.profileData.fullName,
        vanityName: data.platformUsername,
        email: data.profileData.email,
        imageUrl: data.profileData.imageUrl,
        url: data.profileData.url,
        isCreator: data.profileData.isCreator,
      } : null,
      memberships: data.profileData?.memberships || [],
      accessToken: null, // Don't expose token to client
      error: null,
    };
  } catch (error: any) {
    console.error('[Patreon] Connection status error:', error);
    return {
      isConnected: false,
      user: null,
      memberships: [],
      accessToken: null,
      error: error.message,
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
  } catch (error: any) {
    console.error('[Patreon] Disconnect error:', error);
    return { success: false, error: error.message };
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
  } catch (error: any) {
    console.error('[Patreon] Campaign members error:', error);
    return { members: [], error: error.message };
  }
}

/**
 * Check if user is a patron of a specific campaign
 */
export async function checkPatronStatus(campaignId: string, minimumCents?: number): Promise<{
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
  } catch (error: any) {
    console.error('[Patreon] Check patron status error:', error);
    return { isPatron: false, error: error.message };
  }
}

/**
 * Check if Patreon OAuth is available
 */
export function isPatreonOAuthAvailable(): boolean {
  return !!PATREON_CONFIG.clientId;
}
