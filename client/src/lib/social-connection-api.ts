import { getAuthHeaders } from '@/lib/queryClient';

// CSRF token cache
let csrfToken: string | null = null;

/**
 * Fetch a fresh CSRF token from the server
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    console.log('[CSRF] Fetching CSRF token...');
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    console.log('[CSRF] Response:', { ok: response.ok, status: response.status });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      console.log('[CSRF] Token received:', csrfToken ? 'yes' : 'no');
      return csrfToken;
    } else {
      const errorText = await response.text();
      console.error('[CSRF] Failed to get token:', errorText);
    }
  } catch (error) {
    console.error('[CSRF] Failed to fetch CSRF token:', error);
  }
  return null;
}

/**
 * Get CSRF token (cached or fetch fresh)
 */
async function getCsrfToken(): Promise<string | null> {
  if (!csrfToken) {
    return fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * Get headers with auth and CSRF token for POST/PUT/DELETE requests
 */
async function getProtectedHeaders(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };
  if (token) {
    headers['x-csrf-token'] = token;
  }
  return headers;
}

export interface SocialConnection {
  id: string;
  platform: string;
  platformUserId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  profileData?: {
    followers?: number;
    following?: number;
    verified?: boolean;
    profilePictureUrl?: string;
    bio?: string;
    website?: string;
    [key: string]: any;
  };
  connectedAt?: Date;
  lastSyncedAt?: Date;
  isActive?: boolean;
}

/**
 * Get all social connections for the current user from the database
 */
export async function getSocialConnections(): Promise<SocialConnection[]> {
  try {
    const response = await fetch('/api/social-connections', {
      headers: {
        ...getAuthHeaders()
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch social connections');
    }

    const data = await response.json();
    return data.connections || [];
  } catch (error) {
    console.error('Error fetching social connections:', error);
    return [];
  }
}

/**
 * Get a specific platform connection from the database
 */
export async function getSocialConnection(platform: string): Promise<{ connected: boolean; connection?: SocialConnection }> {
  try {
    const response = await fetch(`/api/social-connections/${platform}`, {
      headers: {
        ...getAuthHeaders()
      },
      credentials: 'include'
    });

    if (!response.ok) {
      return { connected: false };
    }

    const data = await response.json();
    // Map server response structure to expected format
    if (data.connected && data.connection) {
      return {
        connected: true,
        connection: {
          id: data.connection.id,
          platform: data.connection.platform,
          platformUserId: data.connection.platformUserId,
          platformUsername: data.connection.platformUsername,
          platformDisplayName: data.connection.platformDisplayName,
          profileData: data.connection.profileData,
          connectedAt: data.connection.connectedAt,
          lastSyncedAt: data.connection.lastSyncedAt,
          isActive: data.connection.isActive,
        }
      };
    }
    return { connected: false };
  } catch (error) {
    console.error(`Error fetching ${platform} connection:`, error);
    return { connected: false };
  }
}

/**
 * Save a social connection to the database
 */
export async function saveSocialConnection(connectionData: {
  platform: string;
  platformUserId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  profileData?: any;
}): Promise<{ success: boolean; connection?: SocialConnection; error?: string }> {
  try {
    const headers = await getProtectedHeaders();
    const response = await fetch('/api/social-connections', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(connectionData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to save connection' };
    }

    const data = await response.json();
    return { success: true, connection: data.connection };
  } catch (error) {
    console.error('Error saving social connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Disconnect a social platform from the database
 * Uses POST /disconnect (unified endpoint) with JWT authentication
 */
export async function disconnectSocialPlatform(platform: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getProtectedHeaders();
    const response = await fetch('/api/social-connections/disconnect', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ platform: platform.toLowerCase() })
    });

    if (!response.ok) {
      // If CSRF error, refresh token and retry once
      if (response.status === 403) {
        console.log('[Social API] CSRF error, refreshing token and retrying...');
        csrfToken = null;
        const newHeaders = await getProtectedHeaders();
        const retryResponse = await fetch('/api/social-connections/disconnect', {
          method: 'POST',
          headers: newHeaders,
          credentials: 'include',
          body: JSON.stringify({ platform: platform.toLowerCase() })
        });
        
        if (retryResponse.ok) {
          return { success: true };
        }
      }
      
      let errorData: { error?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Failed to disconnect' };
      }
      return { success: false, error: errorData.error || 'Failed to disconnect' };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error disconnecting ${platform}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Migrate localStorage connections to database (one-time migration utility)
 * This should be called once for existing users to migrate their data
 */
export async function migrateLocalStorageToDatabase(): Promise<void> {
  try {
    // Check for TikTok connection in localStorage
    const tiktokData = localStorage.getItem('fandomly_tiktok_connection');
    if (tiktokData) {
      try {
        const tiktok = JSON.parse(tiktokData);
        await saveSocialConnection({
          platform: 'tiktok',
          platformUsername: tiktok.username,
          platformDisplayName: tiktok.displayName,
          profileData: {
            followers: tiktok.followers,
            verified: tiktok.verified,
          }
        });
        // Remove from localStorage after successful migration
        localStorage.removeItem('fandomly_tiktok_connection');
        console.log('✅ Migrated TikTok connection from localStorage to database');
      } catch (e) {
        console.error('Failed to migrate TikTok connection:', e);
      }
    }

    // Legacy Instagram localStorage migration is no longer supported
    // Instagram connections are now saved directly via OAuth callback flow
  } catch (error) {
    console.error('Error during localStorage migration:', error);
  }
}
