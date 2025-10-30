import { apiRequest, getDynamicUserId } from '@/lib/queryClient';

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
    const dynamicUserId = getDynamicUserId();
    if (!dynamicUserId) {
      console.warn('No user logged in');
      return [];
    }

    const response = await fetch('/api/social-connections', {
      headers: {
        'x-dynamic-user-id': dynamicUserId
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
    const dynamicUserId = getDynamicUserId();
    if (!dynamicUserId) {
      return { connected: false };
    }

    const response = await fetch(`/api/social-connections/${platform}`, {
      headers: {
        'x-dynamic-user-id': dynamicUserId
      },
      credentials: 'include'
    });

    if (!response.ok) {
      return { connected: false };
    }

    const data = await response.json();
    // Map server response structure to expected format
    if (data.connected && data.connectionData) {
      return {
        connected: true,
        connection: {
          id: data.connectionData.accountId,
          platform: data.connectionData.platform,
          platformUserId: data.connectionData.accountId,
          platformUsername: data.connectionData.username,
          platformDisplayName: data.connectionData.displayName,
          profileData: data.connectionData.profile,
          connectedAt: data.connectionData.connectedAt
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
    const dynamicUserId = getDynamicUserId();
    if (!dynamicUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    const response = await fetch('/api/social-connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dynamic-user-id': dynamicUserId
      },
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
 */
export async function disconnectSocialPlatform(platform: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dynamicUserId = getDynamicUserId();
    if (!dynamicUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    const response = await fetch(`/api/social-connections/${platform}`, {
      method: 'DELETE',
      headers: {
        'x-dynamic-user-id': dynamicUserId
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
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

    // Check for Instagram connection in localStorage (user-specific)
    const dynamicUserId = getDynamicUserId();
    if (dynamicUserId) {
      const instagramData = localStorage.getItem(`instagram_connection_${dynamicUserId}`);
      if (instagramData) {
        try {
          const instagram = JSON.parse(instagramData);
          await saveSocialConnection({
            platform: 'instagram',
            platformUserId: instagram.userInfo?.id,
            platformUsername: instagram.userInfo?.username,
            platformDisplayName: instagram.userInfo?.name,
            accessToken: instagram.accessToken,
            profileData: {
              profilePictureUrl: instagram.userInfo?.profile_picture_url,
              followers: instagram.userInfo?.followers_count,
              following: instagram.userInfo?.follows_count,
            }
          });
          localStorage.removeItem(`instagram_connection_${dynamicUserId}`);
          console.log('✅ Migrated Instagram connection from localStorage to database');
        } catch (e) {
          console.error('Failed to migrate Instagram connection:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error during localStorage migration:', error);
  }
}
