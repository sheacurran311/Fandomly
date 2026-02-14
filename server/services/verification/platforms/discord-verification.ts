import { db } from '../../../db';
import { socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Discord Verification Service
 * 
 * Provides T1 (fully API-verified) verification for Discord tasks.
 * 
 * Supported verifications:
 * - Guild membership (is user in the server?)
 * - Role check (does user have a specific role?)
 * - Reaction check (did user react to a message with specific emoji?)
 * - Message check (did user send a message with code in a channel?)
 * 
 * Requires: Discord Bot with appropriate permissions in creator's server
 */

export interface DiscordVerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

// Discord API base URL
const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Discord Verification Service
 */
export class DiscordVerificationService {
  private botToken: string;
  
  constructor() {
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
    
    if (!this.botToken) {
      console.warn('[Discord Verification] DISCORD_BOT_TOKEN not configured');
    }
  }
  
  /**
   * Make authenticated request to Discord API
   */
  private async discordRequest(endpoint: string, method = 'GET'): Promise<any> {
    if (!this.botToken) {
      throw new Error('Discord bot token not configured');
    }
    
    const response = await fetch(`${DISCORD_API}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bot ${this.botToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Discord API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Verify if a user is a member of a Discord guild (server)
   * 
   * Endpoint: GET /guilds/{guild.id}/members/{user.id}
   */
  async verifyGuildMembership(params: {
    fanDiscordId: string;
    guildId: string;
  }): Promise<DiscordVerificationResult> {
    const { fanDiscordId, guildId } = params;
    
    try {
      const member = await this.discordRequest(`/guilds/${guildId}/members/${fanDiscordId}`);
      
      return {
        verified: true,
        confidence: 'high',
        reason: 'User is a member of the Discord server',
        metadata: {
          joinedAt: member.joined_at,
          nickname: member.nick,
          roles: member.roles,
        },
      };
    } catch (error: any) {
      // 404 means user is not in the guild
      if (error.message?.includes('404') || error.message?.includes('Unknown Member')) {
        return {
          verified: false,
          confidence: 'high',
          reason: 'User is not a member of the Discord server',
        };
      }
      
      console.error('[Discord Verification] Guild membership check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify membership: ${error.message}`,
      };
    }
  }
  
  /**
   * Verify if a user has a specific role in a guild
   * 
   * Endpoint: GET /guilds/{guild.id}/members/{user.id}
   * Check: roles array contains roleId
   */
  async verifyRole(params: {
    fanDiscordId: string;
    guildId: string;
    roleId: string;
  }): Promise<DiscordVerificationResult> {
    const { fanDiscordId, guildId, roleId } = params;
    
    try {
      const member = await this.discordRequest(`/guilds/${guildId}/members/${fanDiscordId}`);
      
      const hasRole = member.roles?.includes(roleId);
      
      return {
        verified: hasRole,
        confidence: 'high',
        reason: hasRole 
          ? 'User has the required role' 
          : 'User does not have the required role',
        metadata: {
          userRoles: member.roles,
          requiredRole: roleId,
        },
      };
    } catch (error: any) {
      console.error('[Discord Verification] Role check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify role: ${error.message}`,
      };
    }
  }
  
  /**
   * Verify if a user reacted to a message with a specific emoji
   * 
   * Endpoint: GET /channels/{channel.id}/messages/{message.id}/reactions/{emoji}
   * Returns list of users who reacted
   */
  async verifyReaction(params: {
    fanDiscordId: string;
    channelId: string;
    messageId: string;
    emoji: string; // e.g., "👍" or "custom_emoji:123456789"
  }): Promise<DiscordVerificationResult> {
    const { fanDiscordId, channelId, messageId, emoji } = params;
    
    try {
      // URL encode the emoji
      const encodedEmoji = encodeURIComponent(emoji);
      
      // Fetch users who reacted (paginated, limit 100)
      const users = await this.discordRequest(
        `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}?limit=100`
      );
      
      // Check if fan is in the list
      const hasReacted = users.some((user: any) => user.id === fanDiscordId);
      
      return {
        verified: hasReacted,
        confidence: 'high',
        reason: hasReacted 
          ? 'User has reacted with the required emoji' 
          : 'User has not reacted with the required emoji',
        metadata: {
          emoji,
          totalReactions: users.length,
        },
      };
    } catch (error: any) {
      console.error('[Discord Verification] Reaction check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify reaction: ${error.message}`,
      };
    }
  }
  
  /**
   * Verify if a user sent a message containing a code in a channel
   * 
   * Note: This requires searching through channel history which may be
   * rate-limited. For high-volume use, consider using Gateway events.
   */
  async verifyMessageWithCode(params: {
    fanDiscordId: string;
    channelId: string;
    code: string;
    afterTimestamp?: Date;
  }): Promise<DiscordVerificationResult> {
    const { fanDiscordId, channelId, code, afterTimestamp } = params;
    
    try {
      // Fetch recent messages (up to 100)
      let url = `/channels/${channelId}/messages?limit=100`;
      
      if (afterTimestamp) {
        // Discord snowflake timestamp calculation
        const snowflake = BigInt(afterTimestamp.getTime() - 1420070400000) << BigInt(22);
        url += `&after=${snowflake}`;
      }
      
      const messages = await this.discordRequest(url);
      
      // Search for message from fan containing the code
      for (const message of messages) {
        if (message.author.id === fanDiscordId) {
          // Check if message contains the code
          if (message.content.toUpperCase().includes(code.toUpperCase())) {
            return {
              verified: true,
              confidence: 'high',
              reason: 'Found message with verification code from user',
              metadata: {
                messageId: message.id,
                content: message.content,
                timestamp: message.timestamp,
              },
            };
          }
        }
      }
      
      return {
        verified: false,
        confidence: 'high',
        reason: 'No message with verification code found from user',
      };
    } catch (error: any) {
      console.error('[Discord Verification] Message check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify message: ${error.message}`,
      };
    }
  }
  
  /**
   * Get user's Discord ID from their social connection
   */
  async getFanDiscordId(fanUserId: string): Promise<string | null> {
    const connection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, fanUserId),
        eq(socialConnections.platform, 'discord'),
        eq(socialConnections.isActive, true),
      ),
    });
    
    return connection?.platformUserId || null;
  }
  
  /**
   * Main verification entry point for Discord tasks
   */
  async verifyTask(params: {
    fanUserId: string;
    taskType: string;
    taskSettings: {
      guildId?: string;
      roleId?: string;
      channelId?: string;
      messageId?: string;
      emoji?: string;
      code?: string;
    };
  }): Promise<DiscordVerificationResult> {
    const { fanUserId, taskType, taskSettings } = params;
    
    // Get fan's Discord ID
    const fanDiscordId = await this.getFanDiscordId(fanUserId);
    
    if (!fanDiscordId) {
      return {
        verified: false,
        confidence: 'high',
        reason: 'Discord account not connected. Please connect your Discord account first.',
      };
    }
    
    // Route to appropriate verification
    switch (taskType.toLowerCase()) {
      case 'discord_join':
      case 'discord_membership':
        if (!taskSettings.guildId) {
          return { verified: false, confidence: 'low', reason: 'Guild ID not configured' };
        }
        return this.verifyGuildMembership({
          fanDiscordId,
          guildId: taskSettings.guildId,
        });
      
      case 'discord_role':
      case 'discord_has_role':
        if (!taskSettings.guildId || !taskSettings.roleId) {
          return { verified: false, confidence: 'low', reason: 'Guild ID or Role ID not configured' };
        }
        return this.verifyRole({
          fanDiscordId,
          guildId: taskSettings.guildId,
          roleId: taskSettings.roleId,
        });
      
      case 'discord_react':
      case 'discord_reaction':
        if (!taskSettings.channelId || !taskSettings.messageId || !taskSettings.emoji) {
          return { verified: false, confidence: 'low', reason: 'Channel ID, Message ID, or Emoji not configured' };
        }
        return this.verifyReaction({
          fanDiscordId,
          channelId: taskSettings.channelId,
          messageId: taskSettings.messageId,
          emoji: taskSettings.emoji,
        });
      
      case 'discord_message':
      case 'discord_chat':
        if (!taskSettings.channelId || !taskSettings.code) {
          return { verified: false, confidence: 'low', reason: 'Channel ID or Code not configured' };
        }
        return this.verifyMessageWithCode({
          fanDiscordId,
          channelId: taskSettings.channelId,
          code: taskSettings.code,
        });
      
      default:
        return {
          verified: false,
          confidence: 'low',
          reason: `Unknown Discord task type: ${taskType}`,
        };
    }
  }
}

// Export singleton instance
export const discordVerification = new DiscordVerificationService();
