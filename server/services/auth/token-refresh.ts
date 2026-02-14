/**
 * Token Refresh Service
 * 
 * Handles refreshing OAuth tokens for various social platforms.
 * Should be called before making API calls to ensure valid tokens.
 */

import { db } from '@db';
import { socialConnections, type SocialConnection } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Platform-specific refresh configurations
 */
const PLATFORM_CONFIGS: Record<string, {
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  useBasicAuth?: boolean;
}> = {
  spotify: {
    tokenUrl: 'https://accounts.spotify.com/api/token',
    clientIdEnv: 'SPOTIFY_CLIENT_ID',
    clientSecretEnv: 'SPOTIFY_CLIENT_SECRET',
    useBasicAuth: true,
  },
  youtube: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    useBasicAuth: false,
  },
  twitch: {
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    clientSecretEnv: 'TWITCH_CLIENT_SECRET',
    useBasicAuth: false,
  },
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
    useBasicAuth: false,
  },
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    useBasicAuth: true,
  },
  kick: {
    tokenUrl: 'https://kick.com/oauth/token', // Placeholder - update when Kick OAuth is available
    clientIdEnv: 'KICK_CLIENT_ID',
    clientSecretEnv: 'KICK_CLIENT_SECRET',
    useBasicAuth: false,
  },
  patreon: {
    tokenUrl: 'https://www.patreon.com/api/oauth2/token',
    clientIdEnv: 'PATREON_CLIENT_ID',
    clientSecretEnv: 'PATREON_CLIENT_SECRET',
    useBasicAuth: false,
  },
};

class TokenRefreshService {
  /**
   * Check if a token is expired or about to expire
   */
  isTokenExpired(expiresAt: Date | null, bufferMinutes: number = 5): boolean {
    if (!expiresAt) return true;
    const bufferMs = bufferMinutes * 60 * 1000;
    return new Date(expiresAt).getTime() < Date.now() + bufferMs;
  }

  /**
   * Refresh token for a social connection if needed
   */
  async refreshIfNeeded(connection: SocialConnection): Promise<TokenRefreshResult> {
    if (!this.isTokenExpired(connection.tokenExpiresAt)) {
      return {
        success: true,
        accessToken: connection.accessToken || undefined,
        expiresAt: connection.tokenExpiresAt || undefined,
      };
    }

    return this.refreshToken(connection);
  }

  /**
   * Refresh OAuth token for a connection
   */
  async refreshToken(connection: SocialConnection): Promise<TokenRefreshResult> {
    const platform = connection.platform;
    const config = PLATFORM_CONFIGS[platform];

    if (!config) {
      return {
        success: false,
        error: `No refresh configuration for platform: ${platform}`,
      };
    }

    if (!connection.refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: `Missing OAuth credentials for ${platform}`,
      };
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      let body: URLSearchParams;

      if (config.useBasicAuth) {
        headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
        body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
        });
      } else {
        body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        });
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TokenRefresh] ${platform} refresh failed:`, errorText);
        return {
          success: false,
          error: `Token refresh failed: ${response.status}`,
        };
      }

      const data = await response.json();

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

      // Update the connection in the database
      await db
        .update(socialConnections)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, connection.id));

      console.log(`[TokenRefresh] Successfully refreshed ${platform} token for connection ${connection.id}`);

      return {
        success: true,
        accessToken: data.access_token,
        expiresAt,
      };
    } catch (error: any) {
      console.error(`[TokenRefresh] ${platform} refresh error:`, error);
      return {
        success: false,
        error: error.message || 'Token refresh failed',
      };
    }
  }

  /**
   * Refresh token by connection ID
   */
  async refreshByConnectionId(connectionId: string): Promise<TokenRefreshResult> {
    const connection = await db.query.socialConnections.findFirst({
      where: eq(socialConnections.id, connectionId),
    });

    if (!connection) {
      return {
        success: false,
        error: 'Connection not found',
      };
    }

    return this.refreshToken(connection);
  }

  /**
   * Get a valid access token for a connection
   * Refreshes if needed
   */
  async getValidToken(connection: SocialConnection): Promise<string | null> {
    const result = await this.refreshIfNeeded(connection);
    
    if (result.success && result.accessToken) {
      return result.accessToken;
    }

    return connection.accessToken;
  }

  /**
   * Bulk refresh all expiring tokens for a platform
   * Useful for scheduled maintenance
   */
  async refreshExpiringTokens(platform: string, bufferHours: number = 1): Promise<{
    total: number;
    refreshed: number;
    failed: number;
  }> {
    const bufferMs = bufferHours * 60 * 60 * 1000;
    const expirationThreshold = new Date(Date.now() + bufferMs);

    // Get all connections that will expire soon
    const connections = await db.query.socialConnections.findMany({
      where: (sc, { and, eq, lt, isNotNull }) => and(
        eq(sc.platform, platform),
        eq(sc.isActive, true),
        isNotNull(sc.refreshToken),
        lt(sc.tokenExpiresAt, expirationThreshold)
      ),
    });

    let refreshed = 0;
    let failed = 0;

    for (const connection of connections) {
      const result = await this.refreshToken(connection);
      if (result.success) {
        refreshed++;
      } else {
        failed++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      total: connections.length,
      refreshed,
      failed,
    };
  }
}

// Export singleton
export const tokenRefreshService = new TokenRefreshService();
