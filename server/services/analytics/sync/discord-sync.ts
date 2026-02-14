/**
 * Discord Sync Service
 * 
 * Syncs guild/server info. Discord has no official analytics API,
 * so metrics are derived from available guild endpoints.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export class DiscordSyncService implements PlatformSyncService {
  platform = 'discord';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get user's guilds
      const guildsRes = await fetch(
        `${DISCORD_API_BASE}/users/@me/guilds`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!guildsRes.ok) {
        return { success: false, error: `HTTP ${guildsRes.status}` };
      }

      const guilds = await guildsRes.json();
      
      // Count guilds where user is owner (creator's servers)
      const ownedGuilds = guilds.filter((g: any) => g.owner);

      return {
        success: true,
        data: {
          platformSpecific: {
            totalGuilds: guilds.length,
            ownedGuilds: ownedGuilds.length,
            guilds: guilds.slice(0, 10).map((g: any) => ({
              id: g.id,
              name: g.name,
              icon: g.icon,
              owner: g.owner,
              memberCount: g.approximate_member_count,
            })),
          },
        },
      };
    } catch (error: any) {
      console.error('[DiscordSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(_userId: string, _connection: SocialConnection): Promise<ContentListResult> {
    // Discord doesn't have "content" in the traditional sense
    return { success: true, items: [] };
  }

  async syncContentMetrics(_userId: string, _connection: SocialConnection, _contentIds: string[]): Promise<ContentMetricsResult> {
    return { success: true, metrics: [] };
  }
}

export const discordSync = new DiscordSyncService();
